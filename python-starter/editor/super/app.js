const $ = (id) => document.getElementById(id);
const ui = {
  app: $("appShell"), codeCard: document.querySelector(".codeCard"), codeFullscreen: $("ppCodeFullscreen"), code: $("ppCode"), highlight: $("ppHighlight"), gutter: $("ppGutter"), stdin: $("ppStdin"), out: $("ppOut"), err: $("ppErr"), sharedTitle: $("ppSharedTitle"), sharedTitleText: $("ppSharedTitleText"),
  run: $("ppRun"), stop: $("ppStop"), clear: $("ppClear"), font: $("ppFontSize"), fullscreen: $("ppFullscreen"), fullscreenTool: $("ppFullscreenTool"), fullscreenButtons: Array.from(document.querySelectorAll(".jsFullscreen")), share: $("ppShare"), shareDialog: $("ppShareDialog"), shareForm: $("ppShareForm"), shareTitle: $("ppShareTitle"), shareSuggest: $("ppShareSuggest"), shareClose: $("ppShareClose"), shareCancel: $("ppShareCancel"), theme: $("ppTheme"),
  pkgs: $("ppPkgs"), install: $("ppInstall"), list: $("ppList"), readOutput: $("ppReadOutput"), status: $("ppStatus"), toast: $("ppToast"), copyOut: $("ppCopyOut"), plots: $("ppPlots"),
  plotMode: $("ppPlotMode"), openPlots: $("ppOpenPlots"), plotModal: $("ppPlotModal"), plotModalTitle: $("ppPlotModalTitle"), plotModalImg: $("ppPlotModalImg"), plotModalClose: $("ppPlotModalClose"), plotPrev: $("ppPlotPrev"), plotNext: $("ppPlotNext"), plotDownload: $("ppPlotDownload"),
  fileInput: $("ppFileInput"), uploadFiles: $("ppUploadFiles"), refreshFiles: $("ppRefreshFiles"), downloadAllFiles: $("ppDownloadAllFiles"), fileList: $("ppFileList"),
  startReel: $("ppStartReel"), pauseReel: $("ppPauseReel"), stopReel: $("ppStopReel"), muteReel: $("ppMuteReel"), reelMic: $("ppReelMic"), reelAspect: $("ppReelAspect"), recordTime: $("ppRecordTime"), recordSize: $("ppRecordSize"), micMeter: $("ppMicMeter"), micLevel: $("ppMicLevel"), reelOverlay: $("ppReelOverlay"), reelOverlayBrand: $("ppReelOverlayBrand"), reelOverlayMain: $("ppReelOverlayMain"), reelOverlaySub: $("ppReelOverlaySub"), pointerHalo: $("ppPointerHalo"), reelActionLabel: $("ppReelActionLabel")
};
const K_CODE = "pp_beginner_code_v1";
const K_STDIN = "pp_beginner_stdin_v1";
const K_FONT = "pp_beginner_font_v1";
const K_THEME = "pp_beginner_theme_v1";
const K_PLOT_MODE = "pp_beginner_plot_mode_v1";
const K_READ_OUTPUT = "pp_beginner_read_output_v1";
let worker = null;
let running = false;
let ready = false;
let runTimer = null;
let currentPlots = [];
let currentPlotIndex = 0;
let projectFiles = [];
let reelRecorder = null;
let reelChunks = [];
let reelStreams = [];
let reelAudioContext = null;
let reelTimer = null;
let reelStartedAt = 0;
let reelTitle = "Python coding session";
let reelMicStream = null;
let reelMicAnalyser = null;
let reelAnimationFrame = 0;
let reelCanvasFrame = 0;
let reelPausedAt = 0;
let reelPausedTotal = 0;
let reelBytes = 0;
let reelWarningShown = false;
let reelClosing = false;
let typingZoomTimer = null;
let lastShareSuggestion = -1;

const shareSuggestions = [
  "Try this Python program I created with Learn With Champak.",
  "I wrote and tested this Python project in the Programmer's Picnic editor.",
  "Explore this Python code and run it directly in your browser.",
  "Here is a Python program I would like to share with you.",
  "Learn Python by opening, running and improving this program."
];

function toast(msg){ ui.toast.textContent = msg; ui.toast.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(()=>ui.toast.classList.remove("show"), 1600); }
function setStatus(msg, kind=""){ ui.status.textContent = msg; ui.status.className = "status " + kind; }
function formatFileSize(bytes){
  const n = Number(bytes) || 0;
  if(n < 1024) return `${n} B`;
  if(n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function escapeAttr(s){ return escapeHtml(s).replaceAll('"', "&quot;"); }
function renderFiles(files){
  projectFiles = Array.isArray(files) ? files : [];
  if(ui.downloadAllFiles) ui.downloadAllFiles.disabled = projectFiles.length === 0;
  if(!ui.fileList) return;
  if(!projectFiles.length){
    ui.fileList.innerHTML = '<p class="emptyFiles">No project files yet. Upload a file such as marks.csv.</p>';
    return;
  }
  ui.fileList.innerHTML = projectFiles.map(file => `
    <div class="fileRow">
      <span class="fileName" title="${escapeAttr(file.name)}">${escapeHtml(file.name)}</span>
      <span class="fileSize">${formatFileSize(file.size)}</span>
      <span class="fileButtons">
        <button class="miniBtn" data-file-download="${escapeAttr(file.name)}" type="button">Download</button>
        <button class="miniBtn" data-file-delete="${escapeAttr(file.name)}" type="button">Delete</button>
      </span>
    </div>`).join("");
}
function downloadBytes(name, data, type="application/octet-stream"){
  const blob = new Blob([data], {type});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function reelFileName(title){
  const safe = String(title || "python-project").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50);
  return `${safe || "python-project"}-reel.webm`;
}
function formatRecordingTime(ms){
  const total=Math.max(0,Math.floor(ms/1000)),minutes=Math.floor(total/60),seconds=total%60;
  return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function showReelOverlay(main,sub="",brand="Learn With Champak"){
  ui.reelOverlayBrand.textContent=brand;ui.reelOverlayMain.textContent=main;ui.reelOverlaySub.textContent=sub;ui.reelOverlay.hidden=false;
}
function hideReelOverlay(){ui.reelOverlay.hidden=true;}
function resetReelControls(){
  clearInterval(reelTimer);reelTimer=null;
  cancelAnimationFrame(reelAnimationFrame);cancelAnimationFrame(reelCanvasFrame);
  ui.startReel.disabled=false;ui.pauseReel.disabled=true;ui.stopReel.disabled=true;ui.muteReel.disabled=true;ui.reelMic.disabled=false;ui.reelAspect.disabled=false;
  ui.pauseReel.textContent="⏸ Pause";ui.muteReel.textContent="🎙 Mute";
  ui.recordTime.hidden=true;ui.recordTime.textContent="REC 00:00";ui.recordSize.hidden=true;ui.recordSize.textContent="0 MB";ui.micMeter.hidden=true;ui.micLevel.style.width="0%";
  hideReelOverlay();document.body.classList.remove("reelMode","reelVertical","reelWide","reelPaused");
  clearTimeout(typingZoomTimer);ui.codeCard.classList.remove("typingZoom");ui.pointerHalo.hidden=true;ui.pointerHalo.classList.remove("clicking");ui.reelActionLabel.hidden=true;
  reelPausedAt=0;reelPausedTotal=0;reelBytes=0;reelWarningShown=false;reelClosing=false;reelMicStream=null;reelMicAnalyser=null;
}
function stopReelTracks(){
  reelStreams.forEach(stream=>stream.getTracks().forEach(track=>track.stop()));reelStreams=[];
  if(reelAudioContext){reelAudioContext.close().catch(()=>{});reelAudioContext=null;}
}
function drawCapturedVideo(video,canvas,ctx){
  if(video.readyState>=2){
    const scale=Math.max(canvas.width/video.videoWidth,canvas.height/video.videoHeight);
    const width=video.videoWidth*scale,height=video.videoHeight*scale;
    ctx.fillStyle="#07111f";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(video,(canvas.width-width)/2,(canvas.height-height)/2,width,height);
  }
  reelCanvasFrame=requestAnimationFrame(()=>drawCapturedVideo(video,canvas,ctx));
}
function updateMicMeter(){
  if(!reelMicAnalyser)return;
  const values=new Uint8Array(reelMicAnalyser.frequencyBinCount);reelMicAnalyser.getByteFrequencyData(values);
  const average=values.reduce((sum,value)=>sum+value,0)/Math.max(1,values.length);
  ui.micLevel.style.width=`${Math.min(100,average*1.8)}%`;
  reelAnimationFrame=requestAnimationFrame(updateMicMeter);
}
async function runRecordingOpening(){
  for(let number=3;number>=1;number--){showReelOverlay(String(number),"Recording starts shortly");await wait(850);}
  showReelOverlay(reelTitle,"Python coding session • Programmer's Picnic");await wait(2200);hideReelOverlay();
}
async function startReelRecording(){
  if(!navigator.mediaDevices?.getDisplayMedia||!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream) return toast("Live recording is not supported in this browser");
  const suggested=(ui.sharedTitleText?.textContent||"Python coding session").trim();
  const entered=window.prompt("Recording title",suggested);if(entered===null)return;
  reelTitle=entered.trim()||suggested;
  const aspect=ui.reelAspect.value==="wide"?"wide":"vertical";
  document.body.classList.add("reelMode",aspect==="vertical"?"reelVertical":"reelWide");
  ui.startReel.disabled=true;ui.reelAspect.disabled=true;
  try{
    const display=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:true,preferCurrentTab:true,selfBrowserSurface:"include"});
    reelStreams=[display];
    let mic=null;
    if(ui.reelMic.checked){
      try{mic=await navigator.mediaDevices.getUserMedia({audio:true});reelStreams.push(mic);}catch{toast("Microphone unavailable; recording without microphone");}
    }
    reelMicStream=mic;
    const video=document.createElement("video");video.srcObject=display;video.muted=true;video.playsInline=true;await video.play();
    const canvas=document.createElement("canvas");
    if(aspect==="vertical"){canvas.width=720;canvas.height=1280;}else{canvas.width=1280;canvas.height=720;}
    drawCapturedVideo(video,canvas,canvas.getContext("2d"));
    const canvasStream=canvas.captureStream(30);const combined=new MediaStream(canvasStream.getVideoTracks());reelStreams.push(canvasStream);
    const audioTracks=[...display.getAudioTracks(),...(mic?mic.getAudioTracks():[])];
    if(audioTracks.length){
      reelAudioContext=new AudioContext();const destination=reelAudioContext.createMediaStreamDestination();
      for(const track of audioTracks){
        const source=reelAudioContext.createMediaStreamSource(new MediaStream([track]));source.connect(destination);
        if(mic&&mic.getAudioTracks().includes(track)){reelMicAnalyser=reelAudioContext.createAnalyser();reelMicAnalyser.fftSize=256;source.connect(reelMicAnalyser);}
      }
      destination.stream.getAudioTracks().forEach(track=>combined.addTrack(track));
    }
    const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(type=>MediaRecorder.isTypeSupported(type))||"";
    reelChunks=[];reelBytes=0;reelRecorder=new MediaRecorder(combined,mime?{mimeType:mime,videoBitsPerSecond:4500000}:undefined);
    reelRecorder.ondataavailable=event=>{if(event.data.size){reelChunks.push(event.data);reelBytes+=event.data.size;ui.recordSize.textContent=`${(reelBytes/1048576).toFixed(1)} MB`;}};
    reelRecorder.onstop=()=>{
      const type=reelRecorder.mimeType||mime||"video/webm";
      downloadBytes(reelFileName(reelTitle),new Blob(reelChunks,{type}),type);
      reelChunks=[];reelRecorder=null;stopReelTracks();resetReelControls();setStatus("Recording downloaded","ok");toast("Reel recording downloaded");
    };
    display.getVideoTracks()[0].addEventListener("ended",()=>finishReelRecording(false),{once:true});
    reelRecorder.start(1000);reelStartedAt=Date.now();
    ui.pauseReel.disabled=false;ui.stopReel.disabled=false;ui.muteReel.disabled=!mic;ui.reelMic.disabled=true;ui.recordTime.hidden=false;ui.recordSize.hidden=false;ui.micMeter.hidden=!reelMicAnalyser;
    if(reelMicAnalyser)updateMicMeter();
    reelTimer=setInterval(()=>{
      const pausedNow=reelPausedAt?Date.now()-reelPausedAt:0,elapsed=Date.now()-reelStartedAt-reelPausedTotal-pausedNow;
      ui.recordTime.textContent=`REC ${formatRecordingTime(elapsed)}`;
      if(elapsed>=20*60*1000&&!reelWarningShown){reelWarningShown=true;toast("Recording is over 20 minutes—consider saving soon");}
    },500);
    setStatus("Recording live session…","bad");await runRecordingOpening();toast("Work normally; recording follows code, input and output");
  }catch(error){stopReelTracks();resetReelControls();if(error?.name!=="NotAllowedError")toast(error?.message||"Could not start recording");}
}
function toggleReelPause(){
  if(!reelRecorder)return;
  if(reelRecorder.state==="recording"){
    reelRecorder.pause();reelPausedAt=Date.now();ui.pauseReel.textContent="▶ Resume";document.body.classList.add("reelPaused");setStatus("Recording paused");
  }else if(reelRecorder.state==="paused"){
    reelPausedTotal+=Date.now()-reelPausedAt;reelPausedAt=0;reelRecorder.resume();ui.pauseReel.textContent="⏸ Pause";document.body.classList.remove("reelPaused");setStatus("Recording live session…","bad");
  }
}
function toggleReelMute(){
  if(!reelMicStream)return;
  const track=reelMicStream.getAudioTracks()[0];track.enabled=!track.enabled;ui.muteReel.textContent=track.enabled?"🎙 Mute":"🎙 Unmute";toast(track.enabled?"Microphone on":"Microphone muted");
}
async function finishReelRecording(withClosing=true){
  if(!reelRecorder||reelRecorder.state==="inactive"||reelClosing)return;
  reelClosing=true;
  if(reelRecorder.state==="paused"){reelPausedTotal+=Date.now()-reelPausedAt;reelPausedAt=0;reelRecorder.resume();}
  ui.pauseReel.disabled=true;ui.stopReel.disabled=true;setStatus("Finishing recording…");
  if(withClosing){showReelOverlay("Thank You","Share, subscribe and comment • Full code link in the description");await wait(2600);}
  if(reelRecorder&&reelRecorder.state!=="inactive")reelRecorder.stop();
}
function stopReelRecording(){
  finishReelRecording(true);
}
function stopReading(){
  if("speechSynthesis" in window) window.speechSynthesis.cancel();
}
function focusOutput(stdout, stderr){
  const hasError = Boolean(String(stderr || "").trim());
  const hasOutput = Boolean(String(stdout || "").trim());
  const target = hasError ? ui.err : hasOutput ? ui.out : null;
  if(!target) return;
  const card = target.closest(".ioToggleCard");
  if(reelRecorder&&reelRecorder.state==="recording"){
    document.querySelectorAll(".reelActive").forEach(item=>item.classList.remove("reelActive"));
    (card||target).classList.add("reelActive");
  }
  requestAnimationFrame(()=>{
    (card || target).scrollIntoView({behavior:"smooth", block:"center"});
    target.focus({preventScroll:true});
  });
}
function focusReelArea(element){
  if(!reelRecorder||reelRecorder.state!=="recording"||!element)return;
  const card=element.closest(".card")||element;
  document.querySelectorAll(".reelActive").forEach(item=>item.classList.remove("reelActive"));card.classList.add("reelActive");
  clearTimeout(focusReelArea.t);focusReelArea.t=setTimeout(()=>card.scrollIntoView({behavior:"smooth",block:"center"}),180);
}
function activateTypingZoom(){
  if(!reelRecorder||reelRecorder.state!=="recording")return;
  ui.codeCard.classList.add("typingZoom");
  clearTimeout(typingZoomTimer);
  requestAnimationFrame(()=>{
    const line=ui.code.value.slice(0,ui.code.selectionStart).split("\n").length-1;
    const lineHeight=39;
    ui.code.scrollTop=Math.max(0,line*lineHeight-ui.code.clientHeight/2+lineHeight/2);
    syncHighlightScroll();
  });
  typingZoomTimer=setTimeout(()=>{ui.codeCard.classList.remove("typingZoom");scheduleEditorSync();},1500);
}
function showReelPointer(x,y){
  if(!document.body.classList.contains("reelMode"))return;
  ui.pointerHalo.hidden=false;ui.pointerHalo.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
}
function pulseReelPointer(){
  if(ui.pointerHalo.hidden)return;
  ui.pointerHalo.classList.remove("clicking");void ui.pointerHalo.offsetWidth;ui.pointerHalo.classList.add("clicking");
}
function showReelAction(target){
  if(!reelRecorder||reelRecorder.state!=="recording")return;
  const control=target.closest("button,label,select,a");if(!control)return;
  const label=(control.getAttribute("aria-label")||control.textContent||control.title||"").replace(/\s+/g," ").trim().slice(0,55);
  if(!label)return;
  ui.reelActionLabel.textContent=label;ui.reelActionLabel.hidden=false;clearTimeout(showReelAction.t);showReelAction.t=setTimeout(()=>ui.reelActionLabel.hidden=true,1100);
}
function readRunOutput(stdout, stderr){
  if(!ui.readOutput?.checked || !("speechSynthesis" in window)) return;
  const outText = String(stdout || "").trim();
  const errText = String(stderr || "").trim();
  const parts = [];
  if(outText) parts.push({text:`Standard output. ${outText}`, target:ui.out});
  if(errText) parts.push({text:`Standard error. ${errText}`, target:ui.err});
  if(!parts.length) parts.push({text:"The program finished with no standard output or standard error.", target:ui.out});
  stopReading();
  parts.forEach(part => {
    const utterance = new SpeechSynthesisUtterance(part.text);
    utterance.lang = document.documentElement.lang || "en";
    utterance.addEventListener("start", ()=>{
      const panel = part.target?.closest(".ioToggleCard") || part.target;
      panel?.scrollIntoView({behavior:"smooth", block:"center"});
    });
    window.speechSynthesis.speak(utterance);
  });
}
function save(){ localStorage.setItem(K_CODE, ui.code.value); localStorage.setItem(K_STDIN, ui.stdin.value); }
function escapeHtml(s){ return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function highlightPythonLine(line){
  const keywords = new Set([
    "False","None","True","and","as","assert","async","await","break","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","in","is","lambda","nonlocal","not","or","pass","raise","return","try","while","with","yield","match","case"
  ]);
  const builtins = new Set([
    "abs","all","any","bin","bool","breakpoint","bytearray","bytes","callable","chr","classmethod","compile","complex","dict","dir","divmod","enumerate","eval","exec","filter","float","format","frozenset","getattr","globals","hasattr","hash","help","hex","id","input","int","isinstance","issubclass","iter","len","list","locals","map","max","memoryview","min","next","object","oct","open","ord","pow","print","property","range","repr","reversed","round","set","setattr","slice","sorted","staticmethod","str","sum","super","tuple","type","vars","zip"
  ]);
  const token = /(""".*?"""|'''.*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*|@[A-Za-z_][\w.]*|\b(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\b|\b[A-Za-z_]\w*\b|[+\-*\/\/%=<>!&|^~:.,;()\[\]{}])/g;
  let out = "";
  let last = 0;
  let match;
  while((match = token.exec(line))){
    const raw = match[0];
    out += escapeHtml(line.slice(last, match.index));
    let cls = "";
    if(raw.startsWith("#")) cls = "tok-comment";
    else if(raw.startsWith('"') || raw.startsWith("'")) cls = "tok-string";
    else if(raw.startsWith("@")) cls = "tok-decorator";
    else if(/^\d|^\.\d/.test(raw)) cls = "tok-number";
    else if(keywords.has(raw)) cls = "tok-keyword";
    else if(builtins.has(raw)) cls = "tok-builtin";
    else if(/^[+\-*\/\/%=<>!&|^~:.,;()\[\]{}]$/.test(raw)) cls = "tok-operator";
    out += cls ? `<span class="${cls}">${escapeHtml(raw)}</span>` : escapeHtml(raw);
    last = token.lastIndex;
  }
  out += escapeHtml(line.slice(last));
  return out || "&nbsp;";
}
function highlightPython(code){
  const lines = String(code ?? "").split("\n");
  return lines.map(line => `<div class="codeLine">${highlightPythonLine(line)}</div>`).join("");
}
function syncHighlightScroll(){
  if(!ui.highlight || !ui.code) return;
  const x = ui.code.scrollLeft || 0;
  const y = ui.code.scrollTop || 0;
  const inner = ui.highlight.querySelector(".codeHighlightInner");
  if(inner){
    inner.style.transform = `translate(${-x}px, ${-y}px)`;
  }else{
    ui.highlight.scrollTop = y;
    ui.highlight.scrollLeft = x;
  }
  if(ui.gutter) ui.gutter.scrollTop = y;
}
let highlightSyncFrame = 0;
function scheduleEditorSync(){
  cancelAnimationFrame(highlightSyncFrame);
  highlightSyncFrame = requestAnimationFrame(()=>{
    updateHighlight();
    syncHighlightScroll();
  });
}
function installEditorLayoutWatchers(){
  if(!ui.code) return;
  const targets = [ui.code, ui.highlight, ui.gutter, document.querySelector(".editorWrap"), ui.codeCard].filter(Boolean);
  if("ResizeObserver" in window){
    const ro = new ResizeObserver(scheduleEditorSync);
    targets.forEach(el => ro.observe(el));
  }
  window.addEventListener("resize", scheduleEditorSync);
  window.addEventListener("orientationchange", scheduleEditorSync);
  window.addEventListener("load", scheduleEditorSync);
  window.addEventListener("pageshow", scheduleEditorSync);
  if(window.visualViewport){
    window.visualViewport.addEventListener("resize", scheduleEditorSync);
    window.visualViewport.addEventListener("scroll", scheduleEditorSync);
  }
  if("MutationObserver" in window){
    const mo = new MutationObserver(scheduleEditorSync);
    mo.observe(document.body, {attributes:true, attributeFilter:["class"]});
  }
  setTimeout(scheduleEditorSync, 250);
  setTimeout(scheduleEditorSync, 1000);
  setTimeout(scheduleEditorSync, 2500);
}
function updateHighlight(){
  if(!ui.highlight || !ui.code) return;
  const code = ui.code.value;
  ui.highlight.innerHTML = `<div class="codeHighlightInner">${highlightPython(code)}</div>`;
  syncHighlightScroll();
}
function resyncEditorAfterLayoutShift(){
  updateHighlight();
  syncHighlightScroll();
}
function resyncEditorManyTimes(){
  resyncEditorAfterLayoutShift();
  requestAnimationFrame(resyncEditorAfterLayoutShift);
  setTimeout(resyncEditorAfterLayoutShift, 60);
  setTimeout(resyncEditorAfterLayoutShift, 180);
  setTimeout(resyncEditorAfterLayoutShift, 400);
  setTimeout(resyncEditorAfterLayoutShift, 900);
}
function updateGutter(){ const n = ui.code.value.split("\n").length; ui.gutter.textContent = Array.from({length:n},(_,i)=>i+1).join("\n"); updateHighlight(); }
function applyFont(size){
  const lineHeight = Math.round(Number(size) * 1.5) + "px";
  document.documentElement.style.setProperty("--editor-line-height", lineHeight);
  ui.code.style.fontSize = size + "px";
  ui.code.style.lineHeight = lineHeight;
  ui.gutter.style.fontSize = size + "px";
  ui.gutter.style.lineHeight = lineHeight;
  if(ui.highlight){
    ui.highlight.style.fontSize = size + "px";
    ui.highlight.style.lineHeight = lineHeight;
  }
  ui.out.style.fontSize = Math.max(14, Number(size)-1) + "px";
  ui.err.style.fontSize = Math.max(14, Number(size)-1) + "px";
  localStorage.setItem(K_FONT, size);
  scheduleEditorSync();
}
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
    if(msg.type === "READY"){ ready = true; setStatus("Ready", "ok"); worker.postMessage({type:"FILE_LIST"}); return; }
    if(msg.type === "RUN_RESULT"){
      running = false; clearTimeout(runTimer);
      const r = msg.result || {};
      ui.out.textContent = r.stdout || "(no stdout)";
      ui.err.textContent = (r.stderr || "") + (r.error || "");
      focusOutput(r.stdout, (r.stderr || "") + (r.error || ""));
      readRunOutput(r.stdout, (r.stderr || "") + (r.error || ""));
      showPlots(r.plots || []);
      resyncEditorManyTimes();
      setStatus(r.ok ? "Run complete" : "Error found", r.ok ? "ok" : "bad");
      renderFiles(msg.files || []);
      return;
    }
    if(msg.type === "FILE_LIST"){
      renderFiles(msg.files || []);
      if(msg.notice) toast(msg.notice);
      return;
    }
    if(msg.type === "FILE_DATA"){
      downloadBytes(msg.name || "download", msg.data);
      toast(`${msg.name || "File"} downloaded`);
      return;
    }
    if(msg.type === "FILE_ZIP_DATA"){
      downloadBytes(msg.name || "python-project-files.zip", msg.data, "application/zip");
      toast("ZIP downloaded");
      return;
    }
    if(msg.type === "INSTALLED"){
      ui.install.disabled = false;
      const installed = Array.isArray(msg.pkgs) ? msg.pkgs : [];
      ui.out.textContent = installed.length ? "Installed:\n" + installed.join("\n") : "Already available / nothing new installed.";
      ui.err.textContent = "";
      focusOutput(ui.out.textContent, "");
      setStatus("Module install complete", "ok");
      resyncEditorManyTimes();
      toast("Install complete");
      return;
    }
    if(msg.type === "PKG_LIST"){
      ui.out.textContent = msg.text || "No packages found.";
      ui.err.textContent = "";
      focusOutput(ui.out.textContent, "");
      setStatus("Module list ready", "ok");
      return;
    }
    if(msg.type === "ERR"){
      running = false; ui.install.disabled = false; clearTimeout(runTimer);
      ui.err.textContent = msg.message || "Unknown worker error";
      focusOutput("", ui.err.textContent);
      readRunOutput("", ui.err.textContent);
      setStatus("Error", "bad");
    }
  };
  worker.onerror = (e) => { running = false; ui.err.textContent = e.message || String(e); focusOutput("", ui.err.textContent); readRunOutput("", ui.err.textContent); setStatus("Worker error", "bad"); };
  worker.postMessage({type:"INIT", policy:{allow_micropip:true}});
}

function runCode(){
  save();
  stopReading();
  if(!worker) makeWorker();
  if(!ready) return toast("Python is still loading");
  if(running) return toast("Already running");
  running = true;
  ui.out.textContent = "Running…";
  ui.err.textContent = "";
  showPlots([]);
  resyncEditorManyTimes();
  setStatus("Running…");
  worker.postMessage({type:"RUN_ONE", code:ui.code.value, stdin:ui.stdin.value, policy:{allow_micropip:true}});
  runTimer = setTimeout(()=>{ if(running){ stopRun(); ui.err.textContent = "Stopped: program took too long."; focusOutput("", ui.err.textContent); readRunOutput("", ui.err.textContent); setStatus("Stopped", "bad"); } }, 12000);
}
function stopRun(){ running = false; clearTimeout(runTimer); stopReading(); makeWorker(); toast("Stopped"); }
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
function chooseShareSuggestion(){
  let index = Math.floor(Math.random() * shareSuggestions.length);
  if(shareSuggestions.length > 1 && index === lastShareSuggestion){
    index = (index + 1) % shareSuggestions.length;
  }
  lastShareSuggestion = index;
  ui.shareTitle.value = shareSuggestions[index];
  ui.shareTitle.focus();
  ui.shareTitle.select();
}
function openShareDialog(){
  if(!ui.shareDialog) return shareProject(document.title);
  chooseShareSuggestion();
  if(typeof ui.shareDialog.showModal === "function") ui.shareDialog.showModal();
  else ui.shareDialog.setAttribute("open", "");
}
function closeShareDialog(){
  if(!ui.shareDialog) return;
  if(typeof ui.shareDialog.close === "function") ui.shareDialog.close();
  else ui.shareDialog.removeAttribute("open");
}
async function shareProject(shareTitle){
  save();
  const title = String(shareTitle || "").trim() || "My Python Project";
  const payload = JSON.stringify({code:ui.code.value, stdin:ui.stdin.value, title});
  const b64 = btoa(unescape(encodeURIComponent(payload))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
  const url = location.origin + location.pathname + "#" + b64;
  try{
    if(navigator.share){ await navigator.share({title, text:title, url}); toast("Shared"); }
    else{ await navigator.clipboard.writeText(`${title}\n${url}`); toast("Title and share link copied"); }
  }catch{ toast("Share cancelled"); }
}
function loadHash(){
  if(!location.hash) return false;
  try{
    let b64 = location.hash.slice(1).replaceAll("-","+").replaceAll("_","/"); while(b64.length % 4) b64 += "=";
    const p = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if(typeof p.code === "string") ui.code.value = p.code;
    if(typeof p.stdin === "string") ui.stdin.value = p.stdin;
    if(typeof p.title === "string" && p.title.trim() && ui.sharedTitle && ui.sharedTitleText){
      ui.sharedTitleText.textContent = p.title.trim();
      ui.sharedTitle.hidden = false;
    }
    return true;
  }catch{return false;}
}

ui.code.addEventListener("input", ()=>{ if(!autoOutdentControlLine()){ updateGutter(); save(); } focusReelArea(ui.code); activateTypingZoom(); });
ui.code.addEventListener("scroll", syncHighlightScroll);
window.addEventListener("scroll", scheduleEditorSync, true);
ui.stdin.addEventListener("input", ()=>{save();focusReelArea(ui.stdin);});
ui.code.addEventListener("keydown", handleTypingAid);
ui.run.addEventListener("click", runCode);
ui.stop.addEventListener("click", stopRun);
ui.clear.addEventListener("click", ()=>{ stopReading(); ui.out.textContent="Output will appear here."; ui.err.textContent="Errors will appear here."; showPlots([]); resyncEditorManyTimes(); });
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
ui.share.addEventListener("click", openShareDialog);
if(ui.shareSuggest) ui.shareSuggest.addEventListener("click", chooseShareSuggestion);
if(ui.shareClose) ui.shareClose.addEventListener("click", closeShareDialog);
if(ui.shareCancel) ui.shareCancel.addEventListener("click", closeShareDialog);
if(ui.shareForm) ui.shareForm.addEventListener("submit", e=>{
  e.preventDefault();
  const title = ui.shareTitle.value.trim();
  if(!title){ ui.shareTitle.focus(); return; }
  closeShareDialog();
  shareProject(title);
});
if(ui.shareDialog) ui.shareDialog.addEventListener("click", e=>{
  if(e.target === ui.shareDialog) closeShareDialog();
});
ui.theme.addEventListener("click", ()=>applyTheme((document.body.dataset.theme || "light") === "light" ? "dark" : "light"));
ui.install.addEventListener("click", installModules);
ui.list.addEventListener("click", ()=>{ if(!ready) return toast("Python is still loading"); ui.out.textContent="Loading module list…"; worker.postMessage({type:"LIST_PKGS"}); });
if(ui.readOutput){
  ui.readOutput.checked = localStorage.getItem(K_READ_OUTPUT) === "true";
  ui.readOutput.addEventListener("change", ()=>{
    localStorage.setItem(K_READ_OUTPUT, String(ui.readOutput.checked));
    if(!ui.readOutput.checked) stopReading();
  });
}
ui.copyOut.addEventListener("click", async()=>{ try{ await navigator.clipboard.writeText(ui.out.textContent); toast("stdout copied"); }catch{ toast("Copy blocked"); } });
if(ui.uploadFiles && ui.fileInput){
  ui.uploadFiles.addEventListener("click", ()=>{
    if(!ready) return toast("Python is still loading");
    ui.fileInput.click();
  });
  ui.fileInput.addEventListener("change", async()=>{
    const selected = Array.from(ui.fileInput.files || []);
    if(!selected.length) return;
    const maxFileSize = 20 * 1024 * 1024;
    if(selected.some(file => file.size > maxFileSize)){
      ui.fileInput.value = "";
      return toast("Each file must be 20 MB or smaller");
    }
    const files = await Promise.all(selected.map(async file => ({name:file.name, data:await file.arrayBuffer()})));
    const transfers = files.map(file => file.data);
    worker.postMessage({type:"FILE_UPLOAD", files}, transfers);
    ui.fileInput.value = "";
  });
}
if(ui.refreshFiles) ui.refreshFiles.addEventListener("click", ()=>{ if(ready) worker.postMessage({type:"FILE_LIST"}); });
if(ui.downloadAllFiles) ui.downloadAllFiles.addEventListener("click", ()=>{ if(ready && projectFiles.length) worker.postMessage({type:"FILE_ZIP"}); });
if(ui.fileList) ui.fileList.addEventListener("click", e=>{
  const download = e.target.closest("[data-file-download]");
  const remove = e.target.closest("[data-file-delete]");
  if(download) worker.postMessage({type:"FILE_GET", name:download.dataset.fileDownload});
  if(remove && confirm(`Delete ${remove.dataset.fileDelete}?`)) worker.postMessage({type:"FILE_DELETE", name:remove.dataset.fileDelete});
});
if(ui.startReel) ui.startReel.addEventListener("click",startReelRecording);
if(ui.pauseReel) ui.pauseReel.addEventListener("click",toggleReelPause);
if(ui.stopReel) ui.stopReel.addEventListener("click",stopReelRecording);
if(ui.muteReel) ui.muteReel.addEventListener("click",toggleReelMute);
document.addEventListener("pointermove",event=>showReelPointer(event.clientX,event.clientY),{passive:true});
document.addEventListener("pointerdown",event=>{showReelPointer(event.clientX,event.clientY);pulseReelPointer();showReelAction(event.target);},{passive:true});
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
const font = localStorage.getItem(K_FONT) || "16"; ui.font.value = font; applyFont(font); updateGutter(); installEditorLayoutWatchers(); makeWorker();
window.addEventListener("beforeunload",event=>{
  if(reelRecorder&&reelRecorder.state!=="inactive"){event.preventDefault();event.returnValue="Recording is still active.";}
});
