const $ = (id) => document.getElementById(id);
const ui = {
  app: $("appShell"), codeCard: document.querySelector(".codeCard"), codeFullscreen: $("ppCodeFullscreen"), code: $("ppCode"), gutter: $("ppGutter"), stdin: $("ppStdin"), out: $("ppOut"), err: $("ppErr"),
  run: $("ppRun"), stop: $("ppStop"), clear: $("ppClear"), font: $("ppFontSize"), fullscreen: $("ppFullscreen"), fullscreenTool: $("ppFullscreenTool"), fullscreenButtons: Array.from(document.querySelectorAll(".jsFullscreen")), share: $("ppShare"), theme: $("ppTheme"),
  pkgs: $("ppPkgs"), install: $("ppInstall"), list: $("ppList"), status: $("ppStatus"), toast: $("ppToast"), copyOut: $("ppCopyOut"), plots: $("ppPlots"),
  plotMode: $("ppPlotMode"), openPlots: $("ppOpenPlots"), plotModal: $("ppPlotModal"), plotModalTitle: $("ppPlotModalTitle"), plotModalImg: $("ppPlotModalImg"), plotModalClose: $("ppPlotModalClose"), plotPrev: $("ppPlotPrev"), plotNext: $("ppPlotNext"), plotDownload: $("ppPlotDownload")
};
const K_CODE = "pp_beginner_code_v1";
const K_STDIN = "pp_beginner_stdin_v1";
const K_FONT = "pp_beginner_font_v1";
const K_THEME = "pp_beginner_theme_v1";
const K_PLOT_MODE = "pp_beginner_plot_mode_v1";
let worker = null;
let running = false;
let ready = false;
let runTimer = null;
let currentPlots = [];
let currentPlotIndex = 0;

function toast(msg){ ui.toast.textContent = msg; ui.toast.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(()=>ui.toast.classList.remove("show"), 1600); }
function setStatus(msg, kind=""){ ui.status.textContent = msg; ui.status.className = "status " + kind; }
function save(){ localStorage.setItem(K_CODE, ui.code.value); localStorage.setItem(K_STDIN, ui.stdin.value); }
function escapeHtml(s){ return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function updateGutter(){ const n = ui.code.value.split("\n").length; ui.gutter.textContent = Array.from({length:n},(_,i)=>i+1).join("\n"); }
function applyFont(size){ ui.code.style.fontSize = size + "px"; ui.gutter.style.fontSize = size + "px"; ui.out.style.fontSize = Math.max(14, Number(size)-1) + "px"; ui.err.style.fontSize = Math.max(14, Number(size)-1) + "px"; localStorage.setItem(K_FONT, size); }
function applyPlotMode(mode){
  const allowed = new Set(["modal", "gallery", "both", "hidden"]);
  const value = allowed.has(mode) ? mode : "both";
  if(ui.plotMode) ui.plotMode.value = value;
  localStorage.setItem(K_PLOT_MODE, value);
  document.body.dataset.plotMode = value;
  if(ui.openPlots) ui.openPlots.disabled = currentPlots.length === 0;
}
function getPlotMode(){ return (ui.plotMode && ui.plotMode.value) || localStorage.getItem(K_PLOT_MODE) || "both"; }
function showPlots(plots){
  currentPlots = Array.isArray(plots) ? plots.filter(Boolean) : [];
  currentPlotIndex = 0;
  ui.plots.innerHTML = "";
  const mode = getPlotMode();
  if(ui.openPlots) ui.openPlots.disabled = currentPlots.length === 0;
  if(!currentPlots.length){ closePlotModal(); return; }

  if(mode === "gallery" || mode === "both"){
    currentPlots.forEach((src, i)=>{
      const box = document.createElement("article");
      box.className = "plot";
      box.innerHTML = `
        <div class="plotHead">
          <b>Plot ${i+1}</b>
          <div class="plotActions">
            <button class="miniBtn" type="button" data-open-plot="${i}">Open</button>
            <a class="miniBtn plotDownloadLink" href="${src}" download="python-plot-${i+1}.png">PNG</a>
          </div>
        </div>
        <button class="plotPreview" type="button" data-open-plot="${i}" aria-label="Open plot ${i+1} in modal">
          <img alt="Python plot ${i+1}" src="${src}">
        </button>`;
      ui.plots.appendChild(box);
    });
  }

  if(mode === "modal" || mode === "both") openPlotModal(0);
}
function openPlotModal(index=0){
  if(!currentPlots.length || !ui.plotModal) return toast("No plots to show");
  currentPlotIndex = Math.max(0, Math.min(index, currentPlots.length - 1));
  ui.plotModalImg.src = currentPlots[currentPlotIndex];
  ui.plotModalImg.alt = `Python plot ${currentPlotIndex + 1}`;
  ui.plotModalTitle.textContent = `Matplotlib Plot ${currentPlotIndex + 1} of ${currentPlots.length}`;
  ui.plotDownload.href = currentPlots[currentPlotIndex];
  ui.plotDownload.download = `python-plot-${currentPlotIndex + 1}.png`;
  ui.plotPrev.disabled = currentPlots.length <= 1;
  ui.plotNext.disabled = currentPlots.length <= 1;
  ui.plotModal.classList.add("show");
  ui.plotModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modalOpen");
}
function closePlotModal(){
  if(!ui.plotModal) return;
  ui.plotModal.classList.remove("show");
  ui.plotModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modalOpen");
  if(ui.plotModalImg) ui.plotModalImg.removeAttribute("src");
}
function stepPlot(delta){
  if(!currentPlots.length) return;
  const next = (currentPlotIndex + delta + currentPlots.length) % currentPlots.length;
  openPlotModal(next);
}

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
function autoOutdentControlLine(){
  const el = ui.code;
  const value = el.value;
  const pos = el.selectionStart;
  if(pos !== el.selectionEnd) return false;
  const lineStart = value.lastIndexOf("\n", Math.max(0, pos - 1)) + 1;
  const lineEndAt = value.indexOf("\n", pos);
  const lineEnd = lineEndAt === -1 ? value.length : lineEndAt;
  const line = value.slice(lineStart, lineEnd);
  if(!/^ {4,}(else:|elif\b.*:\s*)$/.test(line)) return false;
  const updated = line.slice(4);
  el.value = value.slice(0, lineStart) + updated + value.slice(lineEnd);
  el.selectionStart = el.selectionEnd = Math.max(lineStart, pos - 4);
  updateGutter(); save();
  return true;
}

function closeIoExpandedCards(){
  document.querySelectorAll(".ioToggleCard.ioExpanded").forEach(openCard => {
    openCard.classList.remove("ioExpanded");
    const openBtn = openCard.querySelector(".jsToggleBox");
    if(openBtn){
      openBtn.textContent = "Expand";
      openBtn.setAttribute("aria-expanded", "false");
    }
  });
  document.body.classList.remove("ioExpandedMode");
}

function toggleCodeFullscreen(){
  if(!ui.codeCard || !ui.codeFullscreen) return;
  const willExpand = !ui.codeCard.classList.contains("codeExpanded");
  if(willExpand){
    closeIoExpandedCards();
    ui.codeCard.classList.add("codeExpanded");
    document.body.classList.add("codeEditorFullscreenMode");
    ui.codeFullscreen.textContent = "Original size";
    ui.codeFullscreen.setAttribute("aria-expanded", "true");
  }else{
    ui.codeCard.classList.remove("codeExpanded");
    document.body.classList.remove("codeEditorFullscreenMode");
    ui.codeFullscreen.textContent = "Full screen";
    ui.codeFullscreen.setAttribute("aria-expanded", "false");
  }
  setTimeout(()=>ui.code.focus(), 0);
}

function toggleIoBox(btn){
  const card = btn.closest(".ioToggleCard");
  if(!card) return;
  const willExpand = !card.classList.contains("ioExpanded");

  closeIoExpandedCards();

  if(willExpand){
    if(ui.codeCard) ui.codeCard.classList.remove("codeExpanded");
    if(ui.codeFullscreen){
      ui.codeFullscreen.textContent = "Full screen";
      ui.codeFullscreen.setAttribute("aria-expanded", "false");
    }
    document.body.classList.remove("codeEditorFullscreenMode");
    card.classList.add("ioExpanded");
    btn.textContent = "Original size";
    btn.setAttribute("aria-expanded", "true");
    document.body.classList.add("ioExpandedMode");
  }
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

ui.code.addEventListener("input", ()=>{ if(!autoOutdentControlLine()){ updateGutter(); save(); } });
ui.stdin.addEventListener("input", save);
ui.code.addEventListener("keydown", handleTypingAid);
ui.run.addEventListener("click", runCode);
ui.stop.addEventListener("click", stopRun);
ui.clear.addEventListener("click", ()=>{ ui.out.textContent="Output will appear here."; ui.err.textContent="Errors will appear here."; showPlots([]); });
ui.font.addEventListener("change", ()=>applyFont(ui.font.value));
function syncFullscreenButtons(){
  const active = ui.app.classList.contains("fullscreen") || document.fullscreenElement === ui.app;
  ui.fullscreenButtons.forEach(btn => btn.textContent = active ? "⛶ Exit full screen" : "⛶ Full screen");
}
async function toggleFullscreen(){
  const active = ui.app.classList.contains("fullscreen") || document.fullscreenElement === ui.app;
  if(active){
    ui.app.classList.remove("fullscreen");
    document.body.classList.remove("fullscreen");
    if(document.fullscreenElement){
      try{ await document.exitFullscreen(); }catch{}
    }
  }else{
    ui.app.classList.add("fullscreen");
    document.body.classList.add("fullscreen");
    try{
      if(ui.app.requestFullscreen) await ui.app.requestFullscreen();
    }catch{
      // CSS fullscreen fallback still remains active.
    }
  }
  syncFullscreenButtons();
}
ui.fullscreenButtons.forEach(btn => btn.addEventListener("click", toggleFullscreen));
document.addEventListener("fullscreenchange", ()=>{
  if(!document.fullscreenElement){
    ui.app.classList.remove("fullscreen");
    document.body.classList.remove("fullscreen");
  }
  syncFullscreenButtons();
});
ui.share.addEventListener("click", shareProject);
ui.theme.addEventListener("click", ()=>applyTheme((document.body.dataset.theme || "light") === "light" ? "dark" : "light"));
ui.install.addEventListener("click", installModules);
ui.list.addEventListener("click", ()=>{ if(!ready) return toast("Python is still loading"); ui.out.textContent="Loading module list…"; worker.postMessage({type:"LIST_PKGS"}); });
ui.copyOut.addEventListener("click", async()=>{ try{ await navigator.clipboard.writeText(ui.out.textContent); toast("stdout copied"); }catch{ toast("Copy blocked"); } });
if(ui.codeFullscreen) ui.codeFullscreen.addEventListener("click", toggleCodeFullscreen);
document.querySelectorAll(".jsToggleBox").forEach(btn => btn.addEventListener("click", ()=>toggleIoBox(btn)));


if(ui.plotMode) ui.plotMode.addEventListener("change", ()=>{ applyPlotMode(ui.plotMode.value); showPlots(currentPlots); });
if(ui.openPlots) ui.openPlots.addEventListener("click", ()=>openPlotModal(currentPlotIndex));
if(ui.plots) ui.plots.addEventListener("click", (e)=>{
  const btn = e.target.closest("[data-open-plot]");
  if(btn) openPlotModal(Number(btn.dataset.openPlot || 0));
});
if(ui.plotModalClose) ui.plotModalClose.addEventListener("click", closePlotModal);
if(ui.plotModal) ui.plotModal.addEventListener("click", (e)=>{ if(e.target === ui.plotModal) closePlotModal(); });
if(ui.plotPrev) ui.plotPrev.addEventListener("click", ()=>stepPlot(-1));
if(ui.plotNext) ui.plotNext.addEventListener("click", ()=>stepPlot(1));
document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape" && ui.codeCard && ui.codeCard.classList.contains("codeExpanded")){
    toggleCodeFullscreen();
    return;
  }
  if(e.key === "Escape" && document.querySelector(".ioToggleCard.ioExpanded")){
    closeIoExpandedCards();
    return;
  }
  if(!ui.plotModal || !ui.plotModal.classList.contains("show")) return;
  if(e.key === "Escape") closePlotModal();
  if(e.key === "ArrowLeft") stepPlot(-1);
  if(e.key === "ArrowRight") stepPlot(1);
});

loadHash();
if(!ui.code.value.trim()) ui.code.value = localStorage.getItem(K_CODE) || ui.code.value;
else if(!location.hash && localStorage.getItem(K_CODE)) ui.code.value = localStorage.getItem(K_CODE);
ui.stdin.value = ui.stdin.value || localStorage.getItem(K_STDIN) || "Champak";
applyTheme(localStorage.getItem(K_THEME) || "light");
applyPlotMode(localStorage.getItem(K_PLOT_MODE) || "both");
const font = localStorage.getItem(K_FONT) || "16"; ui.font.value = font; applyFont(font); updateGutter(); makeWorker();
