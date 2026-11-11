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
const PROJECT_DIR = "/pp_files";

function safeFileName(name) {
  const clean = String(name || "").replaceAll("\\", "/").split("/").pop();
  if (!clean || clean === "." || clean === ".." || clean.includes("\0")) {
    throw new Error("Invalid file name");
  }
  return clean;
}

function listProjectFiles() {
  const FS = py.FS;
  return FS.readdir(PROJECT_DIR)
    .filter(name => name !== "." && name !== ".." && !name.startsWith("."))
    .map(name => {
      const path = `${PROJECT_DIR}/${name}`;
      const stat = FS.stat(path);
      return { name, size: stat.size, isFile: FS.isFile(stat.mode) };
    })
    .filter(item => item.isFile)
    .map(({name, size}) => ({name, size}))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function syncFileSystem(populate=false) {
  try{
    await new Promise((resolve, reject)=>py.FS.syncfs(populate, error => error ? reject(error) : resolve()));
  }catch(e){
    // File support still works for this session when IndexedDB is unavailable.
  }
}

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
      if(!FS.analyzePath(PROJECT_DIR).exists) FS.mkdir(PROJECT_DIR);
      FS.mount(IDBFS, {}, PROJECT_DIR);
      await new Promise((res, rej)=>FS.syncfs(true, (e)=> e ? rej(e) : res()));
    }
  }catch(e){
    // best effort
  }
  if(!py.FS.analyzePath(PROJECT_DIR).exists) py.FS.mkdir(PROJECT_DIR);
  py.FS.chdir(PROJECT_DIR);

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

def _pp_collect_dataframes(scope):
    """Bounded, read-only Pandas inspection for the visual teaching mode."""
    result = []
    pd = sys.modules.get("pandas")
    if pd is None:
        return result

    def as_number(value):
        try:
            val = float(value)
            return round(val, 5) if math.isfinite(val) else None
        except Exception:
            return None

    def as_text(value):
        try:
            if pd.isna(value):
                return "—"
        except Exception:
            pass
        try:
            return str(value)[:90]
        except Exception:
            return "[value]"

    try:
        import math
        for name, value in list(scope.items()):
            if len(result) >= 6:
                break
            if not isinstance(value, pd.DataFrame) or name.startswith("_"):
                continue
            try:
                df = value
                rows, ncols = df.shape
                if ncols == 0:
                    result.append({"name": str(name)[:48], "rows": int(rows), "cols": 0,
                                   "columns": [], "preview": [], "charts": []})
                    continue
                # Unique presentation names for duplicate column labels.
                cols = [str(label)[:48] for label in list(df.columns[:12])]
                sample = df.iloc[:min(int(rows), 1000), :12]
                preview = [[as_text(cell) for cell in record]
                           for record in df.iloc[:12, :12].itertuples(index=False, name=None)]
                columns = []
                numeric = []
                categoricals = []
                for index, col in enumerate(cols):
                    series = sample.iloc[:, index]
                    try:
                        missing = int(df.iloc[:, index].isna().sum())
                    except Exception:
                        missing = 0
                    try:
                        dtype = str(df.dtypes.iloc[index])[:35]
                    except Exception:
                        dtype = "unknown"
                    kind = bool(pd.api.types.is_numeric_dtype(series.dtype)
                                and not pd.api.types.is_bool_dtype(series.dtype))
                    desc = {"name": col, "dtype": dtype, "missing": missing, "numeric": kind}
                    if kind:
                        values = [as_number(item) for item in series.iloc[:1000].tolist()]
                        numbers = [number for number in values if number is not None]
                        if numbers:
                            desc["min"] = min(numbers)
                            desc["max"] = max(numbers)
                            desc["mean"] = round(sum(numbers)/len(numbers), 4)
                            numeric.append((col, numbers, index))
                    else:
                        categoricals.append((col, series, index))
                    columns.append(desc)

                charts = []
                # Count chart for the first useful category.
                for col, series, index in categoricals[:4]:
                    try:
                        counts = series.fillna("(missing)").astype(str).value_counts().head(8)
                        if len(counts) > 1:
                            charts.append({"kind": "bar", "title": col + " · category counts",
                                "x": [str(key)[:42] for key in counts.index],
                                "y": [int(v) for v in counts.tolist()]})
                            break
                    except Exception:
                        continue
                # Histogram and ordered-value chart from first numeric column.
                if numeric:
                    col, nums, index = numeric[0]
                    low, high = min(nums), max(nums)
                    if high > low:
                        count_bins = 8
                        bins = [0]*count_bins
                        for val in nums:
                            pos = min(count_bins-1, int((val-low)/(high-low)*count_bins))
                            bins[pos] += 1
                        ranges = []
                        for j in range(count_bins):
                            left = low+(high-low)*j/count_bins
                            right = low+(high-low)*(j+1)/count_bins
                            ranges.append(format(left, ".3g")+"–"+format(right, ".3g"))
                        charts.append({"kind": "histogram",
                            "title": col + " · distribution", "x": ranges, "y": bins})
                    ordered = [as_number(v) for v in sample.iloc[:30,index].tolist()]
                    clean = [(j+1,v) for j,v in enumerate(ordered) if v is not None]
                    if len(clean) > 1:
                        charts.append({"kind": "line", "title": col + " · row trend",
                            "x": [str(k) for k,v in clean],
                            "y": [v for k,v in clean]})
                if len(numeric) > 1:
                    xa = [as_number(v) for v in sample.iloc[:120,numeric[0][2]].tolist()]
                    ya = [as_number(v) for v in sample.iloc[:120,numeric[1][2]].tolist()]
                    points = [(x,y) for x,y in zip(xa,ya) if x is not None and y is not None]
                    if len(points) > 2:
                        charts.append({"kind": "scatter",
                            "title": numeric[0][0] + " vs " + numeric[1][0],
                            "x": [x for x,y in points],
                            "y": [y for x,y in points]})

                result.append({"name": str(name)[:48], "rows": int(rows), "cols": int(ncols),
                    "columns": columns, "preview": preview,
                    "previewLimit": 12, "sampleSize": min(int(rows), 1000),
                    "charts": charts[:4]})
            except Exception:
                # A malformed frame must never interrupt the student's program.
                continue
    except Exception:
        pass
    return result

# Only basic values are inspected. Avoid calling user-defined repr/str methods.
def _pp_program_snapshot(scope):
    import math, types
    def safe_value(value,depth=0):
        t=type(value)
        if t in (str,int,float,bool,type(None)):
            label=str(value)[:110]
            if t is float and not math.isfinite(value):label="non-finite number"
            num=value if t in (int,float) and math.isfinite(value) and abs(value)<1e12 else None
            return {"type":t.__name__,"text":label,"number":num}
        if depth<1 and t in (list,tuple,set,dict):
            values=list(value.items())[:10] if t is dict else list(value)[:10]
            items=[]
            for v in values:
                if t is dict:items.append([safe_value(v[0],1)["text"],safe_value(v[1],1)["text"]])
                else:items.append(safe_value(v,1)["text"])
            return {"type":t.__name__,"text":t.__name__+" ("+str(len(value))+" items)",
                    "length":len(value),"items":items}
        if t is range:
            return {"type":"range","text":"range ("+str(len(value))+" items)",
                    "length":len(value),"items":[str(x) for x in value[:10]]}
        if isinstance(value,types.FunctionType):
            return {"type":"function","text":value.__name__[:70]}
        if isinstance(value,type):
            return {"type":"class","text":value.__name__[:70]}
        if isinstance(value,types.ModuleType):return None
        return {"type":t.__name__[:40],"text":"("+t.__name__[:40]+" object)"}
    result=[]
    for name,value in list(scope.items()):
        if len(result)>=30:break
        if type(name) is not str or name.startswith("_"):continue
        try:
            entry=safe_value(value)
            if entry is not None:result.append({"name":name[:50],**entry})
        except Exception:pass
    return result

def _pp_program_analysis(code):
    import ast
    kinds={"assignment":0,"loop":0,"condition":0,"function":0,
           "class":0,"import":0,"output":0,"exception":0}
    sources=[]
    try:root=ast.parse(code)
    except (SyntaxError,ValueError):return {"categories":kinds,"highlights":[]}
    mapping={"Assign":"assignment","AnnAssign":"assignment","AugAssign":"assignment",
             "For":"loop","AsyncFor":"loop","While":"loop",
             "If":"condition","IfExp":"condition",
             "FunctionDef":"function","AsyncFunctionDef":"function",
             "ClassDef":"class","Import":"import","ImportFrom":"import",
             "Try":"exception","Raise":"exception"}
    for node in ast.walk(root):
        kind=mapping.get(type(node).__name__)
        if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id=="print":
            kind="output"
        if kind is not None:
            kinds[kind]+=1
            if len(sources)<70:sources.append({"line":getattr(node,"lineno",0),"kind":kind})
    sources.sort(key=lambda row:row["line"])
    return {"categories":kinds,"highlights":sources}

def _pp_program_report(scope,code,events):
    import math
    variables=_pp_program_snapshot(scope)
    charts=[]
    for entry in variables:
        if len(charts)>=4:break
        try:
            name=entry["name"]
            value=scope[name]
            if type(value) in (list,tuple,range):
                sample=list(value[:24])
                if len(sample)<2:continue
                if any(type(x) not in (int,float) or not math.isfinite(x) or abs(x)>1e12 for x in sample):
                    continue
                values=[round(float(x),5) for x in sample]
                charts.append({"kind":"bar","title":name+" · values",
                               "x":[str(i+1) for i in range(len(values))],"y":values})
                if len(charts)<4:
                    charts.append({"kind":"line","title":name+" · sequence trend",
                                   "x":[str(i+1) for i in range(len(values))],"y":values})
            elif type(value) is dict:
                pairs=list(value.items())[:12]
                if len(pairs)>1 and all(type(k) in (str,int) and type(v) in (int,float)
                    and math.isfinite(v) and abs(v)<1e12 for k,v in pairs):
                    charts.append({"kind":"bar","title":name+" · dictionary values",
                                   "x":[str(k)[:30] for k,v in pairs],
                                   "y":[round(float(v),5) for k,v in pairs]})
        except Exception:continue
    return {"variables":variables,"trace":events[:100],
            "analysis":_pp_program_analysis(code),"charts":charts[:4],
            "traceLimited":len(events)>=100}

def _pp_run_capture(user_code: str, stdin_text: str, policy_json: str, visualize=False):
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

    plots=[]
    traced=[]
    old_trace=sys.gettrace()
    def _pp_trace(frame,event,arg):
        if frame.f_code.co_filename!="<string>":return None
        if event=="line" and len(traced)<100:
            try:
                traced.append({"line":int(frame.f_lineno),
                               "variables":_pp_program_snapshot(frame.f_locals)[:12]})
            except Exception:pass
        if len(traced)>=100:
            sys.settrace(None)
            return None
        return _pp_trace
    def make_result(ok,error=""):
        sys.settrace(old_trace)
        try:plots.extend(_pp_collect_matplotlib_plots())
        except Exception:pass
        program=_pp_program_report(g,user_code,traced) if visualize else None
        return {"ok":ok,"stdout":out.getvalue(),"stderr":err.getvalue(),
                "error":error,"plots":plots,"visuals":_pp_collect_dataframes(g),
                "program":program}
    try:
        if visualize:sys.settrace(_pp_trace)
        exec(user_code,g,g)
        return make_result(True)
    except SystemExit:
        return make_result(True)
    except Exception:
        tb=traceback.format_exc()
        return make_result(False,tb)
    finally:
        sys.settrace(old_trace)
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
      // Auto-load common plotting/science wheels when the user's code needs them.
      // This makes: import matplotlib.pyplot as plt work without manually installing first.
      if (/\b(sklearn|scikit-learn|DecisionTreeClassifier)\b/.test(code)) {
        try { await py.loadPackage(["pandas", "scikit-learn"]); } catch(e) {}
      } else if (/\b(import\s+pandas|from\s+pandas|pd\.)\b/.test(code)) {
        try { await py.loadPackage("pandas"); } catch(e) {}
      } else if (/\b(matplotlib|pyplot|plt\.)\b/.test(code)) {
        try { await py.loadPackage(["matplotlib", "numpy"]); } catch(e) {}
      } else if (/\b(import\s+numpy|from\s+numpy)\b/.test(code)) {
        try { await py.loadPackage("numpy"); } catch(e) {}
      }
      py.globals.set("U_CODE", code);
      py.globals.set("U_STDIN", stdin);
      py.globals.set("U_POLICY_JSON", policy_json);
      py.globals.set("U_VISUALIZE", msg.visualize===true);

      await py.runPythonAsync(`
from __main__ import _pp_run_capture
RES = _pp_run_capture(U_CODE, U_STDIN, U_POLICY_JSON, U_VISUALIZE)
`);
      const res = py.globals.get("RES");
      const obj = res.toJs({ dict_converter: Object.fromEntries });
      try { res.destroy?.(); } catch {}

      // best-effort cleanup
      try {
        await py.runPythonAsync(`del RES, U_CODE, U_STDIN, U_POLICY_JSON, U_VISUALIZE`);
      } catch {}

      obj.stdout = clampOut(obj.stdout);
      obj.stderr = clampOut(obj.stderr);
      obj.error  = clampOut(obj.error);

      // plots are big; keep as-is (browser may manage memory)
      if (!Array.isArray(obj.plots)) obj.plots = [];
      if (!Array.isArray(obj.visuals)) obj.visuals = [];
      obj.visuals = obj.visuals.slice(0, 6);
      if (!obj.program || typeof obj.program !== "object") obj.program=null;

      await syncFileSystem(false);
      postMessage({ type: "RUN_RESULT", result: obj, files: listProjectFiles() });
      return;
    }

    if (msg.type === "PREPARE_OFFLINE") {
      await ensurePyodide();
      await py.loadPackage(["micropip", "numpy", "pandas", "matplotlib", "scikit-learn"]);
      postMessage({ type: "OFFLINE_READY" });
      return;
    }

    if (msg.type === "FILE_LIST") {
      await ensurePyodide();
      postMessage({ type: "FILE_LIST", files: listProjectFiles() });
      return;
    }

    if (msg.type === "FILE_UPLOAD") {
      await ensurePyodide();
      const files = Array.isArray(msg.files) ? msg.files : [];
      for (const file of files) {
        const name = safeFileName(file.name);
        py.FS.writeFile(`${PROJECT_DIR}/${name}`, new Uint8Array(file.data));
      }
      await syncFileSystem(false);
      postMessage({ type: "FILE_LIST", files: listProjectFiles(), notice: `${files.length} file${files.length === 1 ? "" : "s"} uploaded` });
      return;
    }

    if (msg.type === "FILE_GET") {
      await ensurePyodide();
      const name = safeFileName(msg.name);
      const bytes = py.FS.readFile(`${PROJECT_DIR}/${name}`, {encoding:"binary"});
      const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      postMessage({ type: "FILE_DATA", name, data }, [data]);
      return;
    }

    if (msg.type === "FILE_DELETE") {
      await ensurePyodide();
      const name = safeFileName(msg.name);
      py.FS.unlink(`${PROJECT_DIR}/${name}`);
      await syncFileSystem(false);
      postMessage({ type: "FILE_LIST", files: listProjectFiles(), notice: `${name} deleted` });
      return;
    }

    if (msg.type === "FILE_ZIP") {
      await ensurePyodide();
      await py.runPythonAsync(`
import os, zipfile
_pp_zip_path = "/tmp/python-project-files.zip"
with zipfile.ZipFile(_pp_zip_path, "w", zipfile.ZIP_DEFLATED) as _pp_zip:
    for _pp_name in os.listdir("."):
        if os.path.isfile(_pp_name) and not _pp_name.startswith("."):
            _pp_zip.write(_pp_name, arcname=_pp_name)
`);
      const bytes = py.FS.readFile("/tmp/python-project-files.zip", {encoding:"binary"});
      const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      postMessage({ type: "FILE_ZIP_DATA", name: "python-project-files.zip", data }, [data]);
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
