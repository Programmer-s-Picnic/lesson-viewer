/* Programmer’s Picnic — Problem Test Builder
   - Create problems + tests
   - Auto-generate expected outputs by running Teacher Solution in Pyodide
   - Export JSON and load into main editor via ?problems=URL
*/

const $ = (id) => document.getElementById(id);
const K_PROBLEMS_LOCAL = "pp_problems_custom_v1";

const ui = {
  id: $("pbId"),
  title: $("pbTitle"),
  level: $("pbLevel"),
  tags: $("pbTags"),
  statement: $("pbStatement"),
  starter: $("pbStarter"),
  hints: $("pbHints"),
  solution: $("pbSolution"),

  testIn: $("pbTestIn"),
  testOut: $("pbTestOut"),
  hidden: $("pbHidden"),
  testCount: $("pbTestCount"),

  list: $("pbList"),
  preview: $("pbPreview"),
  status: $("pbStatus"),

  importFile: $("pbImportFile"),
  mainUrl: $("pbMainUrl"),

  pyStatus: $("pbPyStatus"),
};

const btn = {
  newOne: $("pbNew"),
  addTest: $("pbAddTest"),
  clearTests: $("pbClearTests"),
  saveUpdate: $("pbUpdate"),
  deleteOne: $("pbDelete"),
  loadOne: $("pbLoad"),

  saveLocal: $("pbSaveLocal"),
  download: $("pbDownload"),
  exportText: $("pbExportText"),
  validate: $("pbValidate"),

  importBtn: $("pbImportBtn"),
  copyEditorLink: $("pbCopyEditorLink"),

  initPy: $("pbInitPy"),
  genOne: $("pbGenOutOne"),
  genAll: $("pbGenOutAll"),
};

function toast(msg){
  const t = $("ppToast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove("show"), 1600);
}

function log(msg){
  ui.status.textContent += msg + "\n";
  ui.status.scrollTop = ui.status.scrollHeight;
}

function pbNormalizeId(s){
  return String(s||"").trim().toLowerCase()
    .replace(/[^a-z0-9_]+/g,"_").replace(/^_+|_+$/g,"");
}

let pbTests = [];

// ---------------- local storage ----------------
function loadAll(){
  try{
    const raw = localStorage.getItem(K_PROBLEMS_LOCAL);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
function saveAll(arr){
  try{ localStorage.setItem(K_PROBLEMS_LOCAL, JSON.stringify(arr)); }catch{}
}

// ---------------- pyodide runner ----------------
let py = null;
let pyReady = false;

async function ensurePyodide(){
  if(pyReady && py) return py;
  ui.pyStatus.textContent = "loading…";
  py = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });

  // Define a safe-ish runner with stdout capture and stdin simulation.
  await py.runPythonAsync(`
import sys, builtins, io, traceback

def _pp_run_capture(user_code: str, stdin_text: str):
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
`);
  pyReady = true;
  ui.pyStatus.textContent = "ready";
  toast("Pyodide ready");
  log("Pyodide loaded.");
  return py;
}

function normalizeOut(s){
  s = String(s ?? "").replace(/\r\n/g,"\n");
  s = s.split("\n").map(line => line.replace(/[ \t]+$/g,"")).join("\n");
  s = s.replace(/\s+$/g,"");
  return s + "\n";
}

async function runSolution(code, stdin){
  await ensurePyodide();
  py.globals.set("U_CODE", code || "");
  py.globals.set("U_STDIN", stdin || "");
  await py.runPythonAsync(`
RES = _pp_run_capture(U_CODE, U_STDIN)
`);
  const res = py.globals.get("RES");
  const obj = res.toJs({ dict_converter: Object.fromEntries });
  try{ res.destroy?.(); }catch{}
  return obj;
}

// ---------------- problem building ----------------
function currentProblemObj(){
  const id = pbNormalizeId(ui.id.value);
  const title = (ui.title.value||"").trim();
  const level = (ui.level.value||"Easy").trim() || "Easy";
  const tags = (ui.tags.value||"").split(",").map(s=>s.trim()).filter(Boolean);

  const statement = (ui.statement.value||"").trim();
  const starter = ui.starter.value || "";
  const hints = (ui.hints.value||"").split("\n").map(s=>s.trim()).filter(Boolean);

  const examples = pbTests.filter(t => !t.hidden).slice(0,2).map(t=>({input:t.input, output:t.output}));

  return {
    id, title, level,
    statement, starter,
    examples,
    tests: pbTests.slice(),
    hints,
    tags
  };
}

function updatePreview(){
  const all = loadAll();
  ui.preview.textContent = JSON.stringify(all, null, 2);
}

function refreshList(){
  const all = loadAll();
  ui.list.innerHTML = all.length
    ? all.map(p => `<option value="${p.id}">${p.title} • ${p.id}</option>`).join("")
    : `<option value="">(no saved problems)</option>`;
  updatePreview();
}

function updateCount(){
  ui.testCount.textContent = String(pbTests.length);
}

function clearForm(){
  ui.id.value = "";
  ui.title.value = "";
  ui.level.value = "Easy";
  ui.tags.value = "";
  ui.statement.value = "";
  ui.starter.value = "";
  ui.hints.value = "";
  ui.solution.value = "";
  ui.testIn.value = "";
  ui.testOut.value = "";
  ui.hidden.checked = false;
  pbTests = [];
  updateCount();
  toast("New problem");
}

function addTest(){
  const input = ui.testIn.value || "";
  const output = ui.testOut.value || "";
  if(!input.trim() && !output.trim()) return toast("Add input/output");
  pbTests.push({ input, output, hidden: !!ui.hidden.checked });
  ui.testIn.value = "";
  ui.testOut.value = "";
  ui.hidden.checked = false;
  updateCount();
  toast("Test added");
  log("Added test (" + (pbTests[pbTests.length-1].hidden ? "hidden" : "visible") + ")");
}

function clearTests(){
  pbTests = [];
  updateCount();
  toast("Tests cleared");
}

function validateProblem(p){
  if(!p.id) return "Problem id required";
  if(!p.title) return "Title required";
  if(!p.statement) return "Statement required";
  if(!Array.isArray(p.tests) || p.tests.length < 1) return "Add at least 1 test";
  for(const t of p.tests){
    if(typeof t.input !== "string" || typeof t.output !== "string") return "Each test must have input/output strings";
    if(typeof t.hidden !== "boolean") t.hidden = !!t.hidden;
  }
  return "";
}

function saveUpdate(){
  const p = currentProblemObj();
  const err = validateProblem(p);
  if(err) return toast(err);

  const all = loadAll();
  const idx = all.findIndex(x => x.id === p.id);
  if(idx >= 0) all[idx] = p;
  else all.push(p);

  saveAll(all);
  refreshList();
  toast(idx >= 0 ? "Updated" : "Saved");
  log((idx >= 0 ? "Updated: " : "Saved: ") + p.id);
}

function loadSelected(){
  const id = ui.list.value;
  if(!id) return toast("No problem selected");
  const all = loadAll();
  const p = all.find(x => x.id === id);
  if(!p) return toast("Not found");

  ui.id.value = p.id || "";
  ui.title.value = p.title || "";
  ui.level.value = p.level || "Easy";
  ui.tags.value = Array.isArray(p.tags) ? p.tags.join(", ") : "";
  ui.statement.value = p.statement || "";
  ui.starter.value = p.starter || "";
  ui.hints.value = Array.isArray(p.hints) ? p.hints.join("\n") : "";
  pbTests = Array.isArray(p.tests) ? p.tests.slice() : [];
  updateCount();
  toast("Loaded");
  log("Loaded: " + p.id);
}

function deleteSelected(){
  const id = pbNormalizeId(ui.id.value);
  if(!id) return toast("Enter id to delete");
  const all = loadAll();
  const nxt = all.filter(p => p.id !== id);
  if(nxt.length === all.length) return toast("Not found");
  if(!confirm("Delete problem " + id + " ?")) return;
  saveAll(nxt);
  refreshList();
  clearForm();
  toast("Deleted");
  log("Deleted: " + id);
}

function downloadJSON(){
  const all = loadAll();
  const blob = new Blob([JSON.stringify(all, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pp_problems.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast("Downloaded JSON");
}

function copyJSON(){
  const all = loadAll();
  const txt = JSON.stringify(all, null, 2);
  navigator.clipboard?.writeText(txt).then(()=>toast("JSON copied")).catch(()=>prompt("Copy JSON:", txt));
}

function validateAll(){
  const all = loadAll();
  for(const p of all){
    const err = validateProblem(p);
    if(err){
      toast("Invalid: " + p.id);
      log("INVALID " + p.id + ": " + err);
      return;
    }
  }
  toast("All problems valid ✅");
  log("All problems valid ✅");
}

function importFile(file){
  const r = new FileReader();
  r.onload = () => {
    try{
      const arr = JSON.parse(String(r.result||"[]"));
      if(!Array.isArray(arr)) throw new Error("JSON must be an array");
      const cleaned = arr.filter(p => p && p.id && p.title && Array.isArray(p.tests));
      saveAll(cleaned);
      refreshList();
      toast("Imported");
      log("Imported " + cleaned.length + " problems");
    }catch(e){
      toast("Import failed");
      log("Import error: " + (e?.message || e));
    }
  };
  r.readAsText(file);
}

function copyEditorLink(){
  const url = (ui.mainUrl.value||"").trim();
  if(!url) return toast("Paste your problems.json URL first");
  const link = location.origin + location.pathname.replace(/builder\.html$/i, "index.html") + "?problems=" + encodeURIComponent(url);
  navigator.clipboard?.writeText(link).then(()=>toast("Editor link copied")).catch(()=>prompt("Copy link:", link));
}

// ---------------- auto-generate outputs ----------------
async function generateOutputForCurrent(){
  const code = ui.solution.value || "";
  if(!code.trim()) return toast("Paste Teacher Solution first");
  const stdin = ui.testIn.value || "";
  if(!stdin.trim()) return toast("Enter test input first");

  try{
    toast("Generating…");
    const res = await runSolution(code, stdin);
    if(!res.ok){
      ui.testOut.value = "";
      log("GEN FAIL: " + (res.error || "Runtime error"));
      toast("Generation failed (see status)");
      return;
    }
    ui.testOut.value = normalizeOut(res.stdout || "");
    if(res.stderr) log("GEN stderr: " + res.stderr);
    toast("Output generated");
  }catch(e){
    log("GEN ERROR: " + (e?.message || e));
    toast("Generation error");
  }
}

async function generateOutputsForMissing(){
  const code = ui.solution.value || "";
  if(!code.trim()) return toast("Paste Teacher Solution first");
  if(pbTests.length < 1) return toast("No tests in list");

  try{
    toast("Generating outputs…");
    await ensurePyodide();
    let changed = 0;

    for(let i=0;i<pbTests.length;i++){
      const t = pbTests[i];
      if(String(t.output||"").trim()) continue; // already has output
      const res = await runSolution(code, t.input || "");
      if(res.ok){
        t.output = normalizeOut(res.stdout || "");
        changed++;
      }else{
        log("GEN FAIL test#" + (i+1) + ": " + (res.error || "Runtime error"));
      }
    }
    toast("Generated: " + changed);
    log("Generated outputs for " + changed + " tests.");
    updateCount();
  }catch(e){
    log("GEN ERROR: " + (e?.message || e));
    toast("Generation error");
  }
}

// ---------------- bindings ----------------
btn.newOne.onclick = clearForm;
btn.addTest.onclick = addTest;
btn.clearTests.onclick = clearTests;
btn.saveUpdate.onclick = saveUpdate;
btn.loadOne.onclick = loadSelected;
btn.deleteOne.onclick = deleteSelected;

btn.saveLocal.onclick = ()=>{ toast("Saved (auto in browser)"); log("LocalStorage updated"); };
btn.download.onclick = downloadJSON;
btn.exportText.onclick = copyJSON;
btn.validate.onclick = validateAll;

btn.importBtn.onclick = ()=> ui.importFile.click();
ui.importFile.onchange = (e)=>{ const f=e.target.files?.[0]; if(f) importFile(f); e.target.value=""; };

btn.copyEditorLink.onclick = copyEditorLink;

btn.initPy.onclick = ()=> ensurePyodide();
btn.genOne.onclick = generateOutputForCurrent;
btn.genAll.onclick = generateOutputsForMissing;

refreshList();
updateCount();
log("Ready. Create problems → Add tests → (Optional) auto-generate outputs → Save → Download JSON → Host → Load in editor via ?problems=URL");
