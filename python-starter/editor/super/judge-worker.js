/* Judge Worker (Pyodide in Web Worker)
   - Hard timeout handled by main thread using worker.terminate()
   - Policy passed as JSON string -> parsed to Python dict (fixes AttributeError: get)
*/
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js");

let py = null;
let ready = false;

const MAX_OUT_CHARS = 50000;

function clampOut(s) {
  s = (s ?? "").toString();
  if (s.length > MAX_OUT_CHARS)
    return s.slice(0, MAX_OUT_CHARS) + "\n…(truncated)…\n";
  return s;
}

async function ensurePyodide() {
  if (ready && py) return py;
  py = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
  });

  // Persistent filesystem for packages across refresh (IndexedDB via IDBFS)
  // Robust across Pyodide/Emscripten variants
  try {
    const FS = py.FS;
    const IDBFS =
      py._module && py._module.IDBFS
        ? py._module.IDBFS
        : FS.filesystems && FS.filesystems.IDBFS
          ? FS.filesystems.IDBFS
          : null;
    if (IDBFS) {
      if (!FS.analyzePath("/pp_persist").exists) FS.mkdir("/pp_persist");
      FS.mount(IDBFS, {}, "/pp_persist");
      await new Promise((res, rej) =>
        FS.syncfs(true, (e) => (e ? rej(e) : res())),
      );
    }
  } catch (e) {
    // best effort; persistence may be unavailable in some contexts
  }

  await py.runPythonAsync(`
import sys, builtins, io, traceback, json, os

# Add persistent paths for third-party packages
_PP_PERSIST = '/pp_persist'
if _PP_PERSIST not in sys.path:
    sys.path.append(_PP_PERSIST)

# Add any nested site-packages under /pp_persist (micropip target layouts vary)
try:
    for root, dirs, files in os.walk(_PP_PERSIST):
        if root.endswith('site-packages') and root not in sys.path:
            sys.path.append(root)
except Exception:
    pass

def _pp_run_capture(user_code: str, stdin_text: str, policy_json: str):
    try:
        policy = json.loads(policy_json or "{}")
    except Exception:
        policy = {}

    out = io.StringIO()
    err = io.StringIO()

    # Refresh sys.path for /pp_persist (new installs)
    try:
        if _PP_PERSIST not in sys.path:
            sys.path.append(_PP_PERSIST)
        for root, dirs, files in os.walk(_PP_PERSIST):
            if root.endswith('site-packages') and root not in sys.path:
                sys.path.append(root)
    except Exception:
        pass

    data = (stdin_text or "").splitlines()
    idx = 0

    def _input(prompt=""):
        nonlocal idx
        if prompt:
            out.write(str(prompt))
        if idx >= len(data):
            return ""
        v = data[idx]
        idx += 1
        return v

    # POLICY hardening (best-effort)
    if policy.get("disable_open", False):
        def _no_open(*a, **k):
            raise PermissionError("open() disabled in Classroom Mode")
        builtins.open = _no_open

    if policy.get("disable_eval_exec", False):
        def _no_eval(*a, **k):
            raise PermissionError("eval() disabled in Classroom Mode")
        def _no_exec(*a, **k):
            raise PermissionError("exec() disabled in Classroom Mode")
        builtins.eval = _no_eval
        builtins.exec = _no_exec

    allow = set(policy.get("allow_imports", []))
    block_all = bool(policy.get("block_imports", False))

    old_import = builtins.__import__
    def _guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        root = (name or "").split(".")[0]
        if block_all and root not in allow:
            raise ImportError(f"Imports disabled: {root}")
        return old_import(name, globals, locals, fromlist, level)
    builtins.__import__ = _guarded_import

    g = {"__name__": "__main__"}

    old_stdout, old_stderr = sys.stdout, sys.stderr
    old_input = builtins.input
    sys.stdout, sys.stderr = out, err
    builtins.input = _input

    try:
        exec(user_code, g, g)
        return {"ok": True, "stdout": out.getvalue(), "stderr": err.getvalue(), "error": ""}
    except SystemExit:
        return {"ok": True, "stdout": out.getvalue(), "stderr": err.getvalue(), "error": ""}
    except Exception:
        tb = traceback.format_exc()
        return {"ok": False, "stdout": out.getvalue(), "stderr": err.getvalue(), "error": tb}
    finally:
        sys.stdout, sys.stderr = old_stdout, old_stderr
        builtins.input = old_input
        builtins.__import__ = old_import
`);
  ready = true;
  return py;
}

self.onmessage = async (ev) => {
  const msg = ev.data || {};
  try {
    if (msg.type === "INIT") {
      await ensurePyodide();
      if (msg.policy?.allow_micropip) {
        await py.loadPackage("micropip");
      }
      postMessage({ type: "READY" });
      return;
    }

    if (msg.type === "RUN_ONE") {
      const code = msg.code || "";
      const stdin = msg.stdin || "";
      const policy = msg.policy || {};
      const policy_json = JSON.stringify(policy);

      await ensurePyodide();
      py.globals.set("U_CODE", code);
      py.globals.set("U_STDIN", stdin);
      py.globals.set("U_POLICY_JSON", policy_json);

      await py.runPythonAsync(`
from __main__ import _pp_run_capture
RES = _pp_run_capture(U_CODE, U_STDIN, U_POLICY_JSON)
`);
      const res = py.globals.get("RES");
      const obj = res.toJs({ dict_converter: Object.fromEntries });
      try {
        res.destroy?.();
      } catch {}

      obj.stdout = clampOut(obj.stdout);
      obj.stderr = clampOut(obj.stderr);
      obj.error = clampOut(obj.error);

      postMessage({ type: "RUN_RESULT", result: obj });
      return;
    }

    if (msg.type === "INSTALL") {
      await ensurePyodide();
      if (!msg.policy?.allow_micropip)
        throw new Error("micropip disabled by policy");
      await py.loadPackage("micropip");
      py.globals.set("PKGS", msg.pkgs || []);
      await py.runPythonAsync(`
import micropip
try:
    await micropip.install(PKGS, target='/pp_persist')
except TypeError:
    # Older micropip may not support target; fall back
    await micropip.install(PKGS)
`);
      try {
        const FS = py.FS;
        await new Promise((res, rej) =>
          FS.syncfs(false, (e) => (e ? rej(e) : res())),
        );
      } catch (e) {}
      postMessage({ type: "INSTALLED", pkgs: msg.pkgs || [] });
      return;
    }

    if (msg.type === "LIST_PKGS") {
      await ensurePyodide();
      await py.runPythonAsync(`
import pkgutil
names = sorted({m.name for m in pkgutil.iter_modules()})
OUT = "\\n".join(names[:4000])
`);
      const out = py.globals.get("OUT");
      postMessage({ type: "PKG_LIST", text: String(out || "") });
      return;
    }
  } catch (err) {
    postMessage({
      type: "ERR",
      message: err?.message ? err.message : String(err),
    });
  }
};
