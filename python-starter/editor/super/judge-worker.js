/* Judge Worker: runs Pyodide + tests off the UI thread.
   - Supports hard timeouts via terminate() from main thread.
   - Best-effort policy restrictions (Classroom Mode).
*/
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js");

let py = null;
let ready = false;

const MAX_OUT_CHARS = 50000;

function clampOut(s) {
  s = (s ?? "").toString();
  if (s.length > MAX_OUT_CHARS) return s.slice(0, MAX_OUT_CHARS) + "\n…(truncated)…\n";
  return s;
}

async function ensurePyodide() {
  if (ready && py) return py;
  py = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });

  await py.runPythonAsync(`
import sys, builtins, io, traceback, json

def _pp_run_capture(user_code: str, stdin_text: str, policy_json: str):
    try:
        policy = json.loads(policy_json) if policy_json else {}
    except Exception:
        policy = {}
    out = io.StringIO()
    err = io.StringIO()

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
    block_all = policy.get("block_imports", False)

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
    if (msg.type === "PING") {
      postMessage({ type: "PONG" });
      return;
    }

    if (msg.type === "INIT") {
      await ensurePyodide();
      if (msg.policy?.allow_micropip) {
        await py.loadPackage("micropip");
      }
      postMessage({ type: "READY" });
      return;
    }

    if (msg.type === "RUN_ONE") {
      const { code, stdin, policy } = msg;
      await ensurePyodide();

      py.globals.set("U_CODE", code || "");
      py.globals.set("U_STDIN", stdin || "");
      py.globals.set("U_POLICY_JSON", JSON.stringify(policy || {}));

      await py.runPythonAsync(`
from __main__ import _pp_run_capture
RES = _pp_run_capture(U_CODE, U_STDIN, U_POLICY_JSON)
`);
      const res = py.globals.get("RES");
      const obj = res.toJs({ dict_converter: Object.fromEntries });
      try { res.destroy?.(); } catch (e) {}

      obj.stdout = clampOut(obj.stdout);
      obj.stderr = clampOut(obj.stderr);
      obj.error  = clampOut(obj.error);

      postMessage({ type: "RUN_RESULT", result: obj });
      return;
    }

    if (msg.type === "INSTALL") {
      await ensurePyodide();
      if (!msg.policy?.allow_micropip) throw new Error("micropip disabled by policy");
      await py.loadPackage("micropip");
      py.globals.set("PKGS", msg.pkgs || []);
      await py.runPythonAsync(`
import micropip
pkgs = PKGS
await micropip.install(pkgs)
`);
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
    postMessage({ type: "ERR", message: err?.message ? err.message : String(err) });
  }
};
