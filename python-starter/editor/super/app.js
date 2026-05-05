const $ = (id) => document.getElementById(id);
const ui = {
  app: $("appShell"), code: $("ppCode"), gutter: $("ppGutter"), stdin: $("ppStdin"), out: $("ppOut"), err: $("ppErr"),
  run: $("ppRun"), stop: $("ppStop"), clear: $("ppClear"), font: $("ppFontSize"), fullscreen: $("ppFullscreen"), share: $("ppShare"), theme: $("ppTheme"),
  pkgs: $("ppPkgs"), install: $("ppInstall"), list: $("ppList"), status: $("ppStatus"), toast: $("ppToast"), copyOut: $("ppCopyOut"), plots: $("ppPlots")
};
const K_CODE = "pp_beginner_code_v1";
const K_STDIN = "pp_beginner_stdin_v1";
const K_FONT = "pp_beginner_font_v1";
const K_THEME = "pp_beginner_theme_v1";
let worker = null;
let running = false;
let ready = false;
let runTimer = null;

function toast(msg){ ui.toast.textContent = msg; ui.toast.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(()=>ui.toast.classList.remove("show"), 1600); }
function setStatus(msg, kind=""){ ui.status.textContent = msg; ui.status.className = "status " + kind; }
function save(){ localStorage.setItem(K_CODE, ui.code.value); localStorage.setItem(K_STDIN, ui.stdin.value); }
function escapeHtml(s){ return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function updateGutter(){ const n = ui.code.value.split("\n").length; ui.gutter.textContent = Array.from({length:n},(_,i)=>i+1).join("\n"); }
function applyFont(size){ ui.code.style.fontSize = size + "px"; ui.gutter.style.fontSize = size + "px"; ui.out.style.fontSize = Math.max(14, Number(size)-1) + "px"; ui.err.style.fontSize = Math.max(14, Number(size)-1) + "px"; localStorage.setItem(K_FONT, size); }
function showPlots(plots){ ui.plots.innerHTML = ""; (plots || []).forEach((src, i)=>{ const box = document.createElement("article"); box.className = "plot"; box.innerHTML = `<b>Plot ${i+1}</b><img alt="Python plot ${i+1}" src="${src}">`; ui.plots.appendChild(box); }); }

function applyTheme(theme){
  const t = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = t;
  localStorage.setItem(K_THEME, t);
  if(ui.theme) ui.theme.textContent = t === "dark" ? "☀️ Light" : "🌙 Dark";
}
function getLineBounds(value, start, end){
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const next = value.indexOf("\n", end);
  const lineEnd = next === -1 ? value.length : next;
  return [lineStart, lineEnd];
}
function toggleComment(){
  const el = ui.code;
  const value = el.value;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const [lineStart, lineEnd] = getLineBounds(value, start, end);
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const useful = lines.filter(line => line.trim().length);
  const shouldUncomment = useful.length && useful.every(line => /^\s*# ?/.test(line));
  const updated = lines.map(line => {
    if(!line.trim()) return line;
    return shouldUncomment ? line.replace(/^(\s*)# ?/, "$1") : line.replace(/^(\s*)/, "$1# ");
  }).join("\n");
  el.value = value.slice(0, lineStart) + updated + value.slice(lineEnd);
  el.selectionStart = lineStart;
  el.selectionEnd = lineStart + updated.length;
  updateGutter(); save();
  toast(shouldUncomment ? "Uncommented" : "Commented");
}
function indentSelection(outdent=false){
  const el = ui.code;
  const value = el.value;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if(start === end && !outdent){
    el.setRangeText("    ", start, end, "end");
    updateGutter(); save();
    return;
  }
  const [lineStart, lineEnd] = getLineBounds(value, start, end);
  const block = value.slice(lineStart, lineEnd);
  const updated = block.split("\n").map(line => {
    if(!outdent) return "    " + line;
    if(line.startsWith("    ")) return line.slice(4);
    if(line.startsWith("\t")) return line.slice(1);
    return line.replace(/^ {1,3}/, "");
  }).join("\n");
  el.value = value.slice(0, lineStart) + updated + value.slice(lineEnd);
  el.selectionStart = lineStart;
  el.selectionEnd = lineStart + updated.length;
  updateGutter(); save();
}
function smartEnter(e){
  const el = ui.code;
  const value = el.value;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const beforeLine = value.slice(lineStart, start);
  const afterCursor = value.slice(start, value.indexOf("\n", start) === -1 ? value.length : value.indexOf("\n", start));
  const baseIndent = (beforeLine.match(/^\s*/) || [""])[0];
  let nextIndent = baseIndent;
  if(beforeLine.trimEnd().endsWith(":")) nextIndent += "    ";
  e.preventDefault();
  if(/^[\s]*[\]\)\}]/.test(afterCursor) && nextIndent.length >= 4){
    el.setRangeText("\n" + nextIndent + "\n" + baseIndent, start, end, "end");
    el.selectionStart = el.selectionEnd = start + 1 + nextIndent.length;
  }else{
    el.setRangeText("\n" + nextIndent, start, end, "end");
  }
  updateGutter(); save();
}
function wrapPair(open, close){
  const el = ui.code;
  const start = el.selectionStart, end = el.selectionEnd;
  const selected = el.value.slice(start, end);
  el.setRangeText(open + selected + close, start, end, selected ? "select" : "end");
  if(!selected) el.selectionStart = el.selectionEnd = start + open.length;
  updateGutter(); save();
}
function handleTypingAid(e){
  if((e.ctrlKey || e.metaKey) && e.key === "Enter"){ e.preventDefault(); runCode(); return; }
  if((e.ctrlKey || e.metaKey) && e.key === "/"){ e.preventDefault(); toggleComment(); return; }
  if(e.key === "Tab"){ e.preventDefault(); indentSelection(e.shiftKey); return; }
  if(e.key === "Enter"){ smartEnter(e); return; }
  const pairs = {"(":")", "[":"]", "{":"}", '"':'"', "'":"'"};
  if(!e.ctrlKey && !e.metaKey && !e.altKey && pairs[e.key]){ e.preventDefault(); wrapPair(e.key, pairs[e.key]); return; }
  if([")", "]", "}", '"', "'"].includes(e.key)){
    const el = ui.code;
    if(el.selectionStart === el.selectionEnd && el.value[el.selectionStart] === e.key){
      e.preventDefault(); el.selectionStart = el.selectionEnd = el.selectionStart + 1;
    }
  }
}


function makeWorker(){
  if(worker) worker.terminate();
  ready = false;
  worker = new Worker("judge-worker.js");
  setStatus("Loading Python…");
  worker.onmessage = (ev) => {
    const msg = ev.data || {};
    if(msg.type === "READY"){ ready = true; setStatus("Ready", "ok"); return; }
    if(msg.type === "RUN_RESULT"){
      running = false; clearTimeout(runTimer);
      const r = msg.result || {};
      ui.out.textContent = r.stdout || "(no stdout)";
      ui.err.textContent = (r.stderr || "") + (r.error || "");
      showPlots(r.plots || []);
      setStatus(r.ok ? "Run complete" : "Error found", r.ok ? "ok" : "bad");
      return;
    }
    if(msg.type === "INSTALLED"){
      ui.install.disabled = false;
      const installed = Array.isArray(msg.pkgs) ? msg.pkgs : [];
      ui.out.textContent = installed.length ? "Installed:\n" + installed.join("\n") : "Already available / nothing new installed.";
      ui.err.textContent = "";
      setStatus("Module install complete", "ok");
      toast("Install complete");
      return;
    }
    if(msg.type === "PKG_LIST"){
      ui.out.textContent = msg.text || "No packages found.";
      ui.err.textContent = "";
      setStatus("Module list ready", "ok");
      return;
    }
    if(msg.type === "ERR"){
      running = false; ui.install.disabled = false; clearTimeout(runTimer);
      ui.err.textContent = msg.message || "Unknown worker error";
      setStatus("Error", "bad");
    }
  };
  worker.onerror = (e) => { running = false; ui.err.textContent = e.message || String(e); setStatus("Worker error", "bad"); };
  worker.postMessage({type:"INIT", policy:{allow_micropip:true}});
}

function runCode(){
  save();
  if(!worker) makeWorker();
  if(!ready) return toast("Python is still loading");
  if(running) return toast("Already running");
  running = true;
  ui.out.textContent = "Running…";
  ui.err.textContent = "";
  showPlots([]);
  setStatus("Running…");
  worker.postMessage({type:"RUN_ONE", code:ui.code.value, stdin:ui.stdin.value, policy:{allow_micropip:true}});
  runTimer = setTimeout(()=>{ if(running){ stopRun(); ui.err.textContent = "Stopped: program took too long."; setStatus("Stopped", "bad"); } }, 12000);
}
function stopRun(){ running = false; clearTimeout(runTimer); makeWorker(); toast("Stopped"); }
function installModules(){
  const pkgs = ui.pkgs.value.trim().split(/[ ,\n]+/).filter(Boolean);
  if(!pkgs.length) return toast("Type a module name first");
  if(!ready) return toast("Python is still loading");
  ui.install.disabled = true;
  ui.out.textContent = "Installing modules…\n" + pkgs.join("\n");
  ui.err.textContent = "";
  setStatus("Installing…");
  worker.postMessage({type:"INSTALL", pkgs, policy:{allow_micropip:true}});
}
async function shareProject(){
  save();
  const payload = JSON.stringify({code:ui.code.value, stdin:ui.stdin.value});
  const b64 = btoa(unescape(encodeURIComponent(payload))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
  const url = location.origin + location.pathname + "#" + b64;
  try{
    if(navigator.share){ await navigator.share({title:document.title, url}); toast("Shared"); }
    else{ await navigator.clipboard.writeText(url); toast("Share link copied"); }
  }catch{ toast("Share cancelled"); }
}
function loadHash(){
  if(!location.hash) return false;
  try{
    let b64 = location.hash.slice(1).replaceAll("-","+").replaceAll("_","/"); while(b64.length % 4) b64 += "=";
    const p = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if(typeof p.code === "string") ui.code.value = p.code;
    if(typeof p.stdin === "string") ui.stdin.value = p.stdin;
    return true;
  }catch{return false;}
}

ui.code.addEventListener("input", ()=>{ updateGutter(); save(); });
ui.stdin.addEventListener("input", save);
ui.code.addEventListener("keydown", handleTypingAid);
ui.run.addEventListener("click", runCode);
ui.stop.addEventListener("click", stopRun);
ui.clear.addEventListener("click", ()=>{ ui.out.textContent="Output will appear here."; ui.err.textContent="Errors will appear here."; showPlots([]); });
ui.font.addEventListener("change", ()=>applyFont(ui.font.value));
ui.fullscreen.addEventListener("click", ()=>{ document.body.classList.toggle("fullscreen"); ui.app.classList.toggle("fullscreen"); ui.fullscreen.textContent = ui.app.classList.contains("fullscreen") ? "⛶ Exit full screen" : "⛶ Full screen"; });
ui.share.addEventListener("click", shareProject);
ui.theme.addEventListener("click", ()=>applyTheme((document.body.dataset.theme || "light") === "light" ? "dark" : "light"));
ui.install.addEventListener("click", installModules);
ui.list.addEventListener("click", ()=>{ if(!ready) return toast("Python is still loading"); ui.out.textContent="Loading module list…"; worker.postMessage({type:"LIST_PKGS"}); });
ui.copyOut.addEventListener("click", async()=>{ try{ await navigator.clipboard.writeText(ui.out.textContent); toast("stdout copied"); }catch{ toast("Copy blocked"); } });

loadHash();
if(!ui.code.value.trim()) ui.code.value = localStorage.getItem(K_CODE) || ui.code.value;
else if(!location.hash && localStorage.getItem(K_CODE)) ui.code.value = localStorage.getItem(K_CODE);
ui.stdin.value = ui.stdin.value || localStorage.getItem(K_STDIN) || "Champak";
applyTheme(localStorage.getItem(K_THEME) || "light");
const font = localStorage.getItem(K_FONT) || "16"; ui.font.value = font; applyFont(font); updateGutter(); makeWorker();
