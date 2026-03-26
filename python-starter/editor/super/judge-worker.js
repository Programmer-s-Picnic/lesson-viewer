/* Judge Worker (Pyodide in Web Worker)
   - Hard timeout handled by main thread using worker.terminate()
   - Policy passed as JSON string -> parsed to Python dict
   - Matplotlib support:
       After exec, if matplotlib figures exist, render them to PNG (base64)
       and return as result.plots = ["data:image/png;base64,...", ...]
*/
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js");

let py = null;
let ready = false;
let installPromise = null; // mutex for INSTALL

const MAX_OUT_CHARS = 50000;

function clampOut(s) {
  s = (s ?? "").toString();
  if (s.length > MAX_OUT_CHARS) return s.slice(0, MAX_OUT_CHARS) + "\n…(truncated)…\n";
  return s;
}

async function ensurePyodide() {
  if (ready && py) return py;

  py = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });

  // Persistent filesystem for packages across refresh (IndexedDB via IDBFS)
  try{
    const FS = py.FS;
    const IDBFS = (py._module && py._module.IDBFS) ? py._module.IDBFS
                 : (FS.filesystems && FS.filesystems.IDBFS) ? FS.filesystems.IDBFS
                 : null;
    if(IDBFS){
      if(!FS.analyzePath('/pp_persist').exists) FS.mkdir('/pp_persist');
      FS.mount(IDBFS, {}, '/pp_persist');
      await new Promise((res, rej)=>FS.syncfs(true, (e)=> e ? rej(e) : res()));
    }
  }catch(e){
    // best effort
  }

  await py.runPythonAsync(`
import sys, builtins, io, traceback, json, os, base64

_PP_PERSIST = '/pp_persist'

def _pp_refresh_persist_paths():
    try:
        if _PP_PERSIST not in sys.path:
            sys.path.append(_PP_PERSIST)
        for root, dirs, files in os.walk(_PP_PERSIST):
            if root.endswith('site-packages') and root not in sys.path:
                sys.path.append(root)
    except Exception:
        pass

_pp_refresh_persist_paths()

def _pp_collect_matplotlib_plots():
    \"\"\"Return list of data URLs for any open matplotlib figures.\"\"\"
    plots = []
    try:
        import matplotlib
        # Agg backend works in worker/headless
        try:
            matplotlib.use("Agg", force=True)
        except Exception:
            pass
        import matplotlib.pyplot as plt
        from io import BytesIO

        fignums = list(plt.get_fignums())
        for num in fignums:
            fig = plt.figure(num)
            bio = BytesIO()
            try:
                fig.savefig(bio, format="png", bbox_inches="tight", dpi=130)
                b64 = base64.b64encode(bio.getvalue()).decode("ascii")
                plots.append("data:image/png;base64," + b64)
            finally:
                bio.close()
        # close figures so they don't accumulate across runs
        try:
            plt.close("all")
        except Exception:
            pass
    except Exception:
        pass
    return plots

def _pp_run_capture(user_code: str, stdin_text: str, policy_json: str):
    try:
        policy = json.loads(policy_json or "{}")
    except Exception:
        policy = {}

    out = io.StringIO()
    err = io.StringIO()

    _pp_refresh_persist_paths()

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

    # Save originals so policy never "sticks" across runs
    _orig_open = getattr(builtins, "open", None)
    _orig_eval = getattr(builtins, "eval", None)
    _orig_exec = getattr(builtins, "exec", None)
    _orig_import = getattr(builtins, "__import__", None)
    _orig_input = getattr(builtins, "input", None)

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

    def _guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        root = (name or "").split(".")[0]
        if block_all and root not in allow:
            raise ImportError(f"Imports disabled: {root}")
        return _orig_import(name, globals, locals, fromlist, level)

    builtins.__import__ = _guarded_import

    g = {"__name__": "__main__"}

    old_stdout, old_stderr = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = out, err
    builtins.input = _input

    plots = []
    try:
        exec(user_code, g, g)
        plots = _pp_collect_matplotlib_plots()
        return {"ok": True, "stdout": out.getvalue(), "stderr": err.getvalue(), "error": "", "plots": plots}
    except SystemExit:
        plots = _pp_collect_matplotlib_plots()
        return {"ok": True, "stdout": out.getvalue(), "stderr": err.getvalue(), "error": "", "plots": plots}
    except Exception:
        tb = traceback.format_exc()
        plots = _pp_collect_matplotlib_plots()
        return {"ok": False, "stdout": out.getvalue(), "stderr": err.getvalue(), "error": tb, "plots": plots}
    finally:
        sys.stdout, sys.stderr = old_stdout, old_stderr
        if _orig_input is not None: builtins.input = _orig_input
        if _orig_import is not None: builtins.__import__ = _orig_import
        if _orig_open is not None: builtins.open = _orig_open
        if _orig_eval is not None: builtins.eval = _orig_eval
        if _orig_exec is not None: builtins.exec = _orig_exec
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
      try { res.destroy?.(); } catch {}

      // best-effort cleanup
      try {
        await py.runPythonAsync(`del RES, U_CODE, U_STDIN, U_POLICY_JSON`);
      } catch {}

      obj.stdout = clampOut(obj.stdout);
      obj.stderr = clampOut(obj.stderr);
      obj.error  = clampOut(obj.error);

      // plots are big; keep as-is (browser may manage memory)
      if (!Array.isArray(obj.plots)) obj.plots = [];

      postMessage({ type: "RUN_RESULT", result: obj });
      return;
    }

    if (msg.type === "INSTALL") {
      await ensurePyodide();
      if (!msg.policy?.allow_micropip) throw new Error("micropip disabled by policy");

      // Mutex: prevent concurrent installs
      if (installPromise) {
        await installPromise;
      }

      const pkgs = Array.isArray(msg.pkgs) ? msg.pkgs : [];

      installPromise = (async () => {
        await py.loadPackage("micropip");

        // Deduplicate and skip already-installed modules
        py.globals.set("PKGS", pkgs);
        await py.runPythonAsync(`
import importlib.util

try:
    from __main__ import _pp_refresh_persist_paths
    _pp_refresh_persist_paths()
except Exception:
    pass

def _pp_filter(pkgs):
    out=[]
    for p in pkgs:
        name=str(p).strip()
        if not name:
            continue
        root=name.split("==")[0].split(">=")[0].split("<=")[0].split(">")[0].split("<")[0].split("[")[0]
        if importlib.util.find_spec(root) is not None:
            continue
        out.append(name)
    seen=set(); uniq=[]
    for x in out:
        if x not in seen:
            seen.add(x); uniq.append(x)
    return uniq

PKGS2 = _pp_filter(PKGS)
`);
        const pkgs2 = py.globals.get("PKGS2");
        const toInstall = pkgs2.toJs ? pkgs2.toJs() : [];
        try { pkgs2.destroy?.(); } catch {}

        if (!toInstall.length) {
          try {
            const FS = py.FS;
            await new Promise((res, rej)=>FS.syncfs(false, (e)=> e ? rej(e) : res()));
          } catch(e){}
          postMessage({ type: "INSTALLED", pkgs: [] });
          return;
        }

        py.globals.set("PKGS3", toInstall);
        await py.runPythonAsync(`
import micropip
try:
    await micropip.install(PKGS3, target='/pp_persist')
except TypeError:
    await micropip.install(PKGS3)
`);

        try{
          const FS = py.FS;
          await new Promise((res, rej)=>FS.syncfs(false, (e)=> e ? rej(e) : res()));
        }catch(e){}

        // refresh path after install
        try { await py.runPythonAsync(`from __main__ import _pp_refresh_persist_paths; _pp_refresh_persist_paths()`); } catch {}

        postMessage({ type: "INSTALLED", pkgs: toInstall });
      })();

      try{
        await installPromise;
      } finally {
        installPromise = null;
      }
      return;
    }

    if (msg.type === "LIST_PKGS") {
      await ensurePyodide();
      await py.runPythonAsync(`
import pkgutil
try:
    from __main__ import _pp_refresh_persist_paths
    _pp_refresh_persist_paths()
except Exception:
    pass

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