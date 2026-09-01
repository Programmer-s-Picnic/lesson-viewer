"use strict";

const $ = id => document.getElementById(id);
let W = 1080, H = 1920;
const FPS = 30;
const AUTOSAVE = "edushorts-maker-v4";
const PROJECT_FORMAT = "edushorts-maker-project";
const PROJECT_VERSION = 4;
const RECOMMENDED_PHOTOS = 10;
const MAX_PHOTOS = 100;

const defaults = {
  projectTitle: "Python in 30 Seconds",
  subject: "Python",
  teacherName: "Champak Roy",
  channelName: "Learn With Champak",
  website: "learnwithchampak.live",
  brandColor: "#075985",
  accentColor: "#f59e0b",
  logo: "",
  slides: [],
  current: 0
};

let state = structuredClone(defaults);
let musicData = "";
let musicName = "";
let playing = false;
let exporting = false;
let playToken = 0;
let narrationPlayer = null;
let recording = null;
let webcamStream = null;
let overlayUrl = "";
let overlayName = "";
let previewAnimationId = 0;
let previewBusy = false;
const imageCache = new Map();

const typeNames = {
  hook:"Hook", explanation:"Explanation", spoken:"Spoken Text", code:"Code",
  question:"Question", answer:"Answer", image:"Image", cta:"Call to action"
};

const palettes = {
  hook:["#7c2d12"], explanation:["#075985"], spoken:["#0f4c5c"], code:["#111827"],
  question:["#4c1d95"], answer:["#065f46"], image:["#0f172a"], cta:["#9a3412"]
};

const templates = {
  concept:[
    ["hook","Did you know?","Start with a surprising question."],
    ["explanation","The idea","Explain one concept in one clear sentence."],
    ["explanation","Simple example","Show how the concept works."],
    ["answer","Remember","State the key takeaway."],
    ["cta","Keep learning","Follow Learn With Champak for more."]
  ],
  coding:[
    ["hook","Can you solve this?","A quick coding challenge."],
    ["code","Try this code","print('Hello, learner!')"],
    ["answer","Output","Hello, learner!"],
    ["explanation","Why it works","Explain the important line."],
    ["question","Your challenge","How would you change the output?"],
    ["cta","Practise now","Write and run the program yourself."]
  ],
  mcq:[
    ["question","Quick question","Which answer is correct?<br/>A. First option<br/>B. Second option<br/>C. Third option"],
    ["explanation","Think…","You have three seconds."],
    ["answer","Correct answer","B. Second option<br/>Add a one-line explanation."],
    ["cta","How did you do?","Comment your answer and follow for more."]
  ],
  dsa:[
    ["hook","DSA challenge","Can you solve this efficiently?"],
    ["question","Problem","Describe the input and required output."],
    ["explanation","Step 1","Show the first logical step."],
    ["explanation","Step 2","Show the next logical step."],
    ["code","Solution","def solve(data):\n    return data"],
    ["answer","Complexity","Time: O(n)<br/>Space: O(1)"],
    ["cta","Your turn","Try another input yourself."]
  ]
};

const entranceValues = [
  "fade","slide","slide-left","slide-top","slide-bottom","zoom","zoom-out",
  "rise","drop","rotate","rotate-reverse","diagonal-tl","diagonal-br",
  "flip-x","flip-y","wipe-right","wipe-down","pop","none"
];
const exitValues = [
  "fade","slide-left","slide-right","slide-top","slide-bottom","zoom","zoom-in",
  "rotate","rotate-reverse","diagonal-tl","diagonal-br","shrink","none"
];
const motionValues = ["none","ken-in","ken-out","pan-left","pan-right","pan-up","pan-down","drift","float"];

const presets = {
  cinematic:{
    entrances:["fade","zoom","zoom-out","rise","diagonal-br"],
    exits:["fade","slide-left","slide-right","zoom","shrink"],
    motions:["ken-in","ken-out","pan-left","pan-right","drift"]
  },
  slides:{
    entrances:["slide","slide-left","slide-top","slide-bottom","diagonal-tl","diagonal-br"],
    exits:["slide-left","slide-right","slide-top","slide-bottom","diagonal-tl","diagonal-br"],
    motions:["pan-left","pan-right","pan-up","pan-down"]
  },
  gentle:{
    entrances:["fade","zoom","rise","wipe-right"],
    exits:["fade","slide-left","shrink"],
    motions:["ken-in","ken-out","drift","float"]
  },
  dynamic:{
    entrances:entranceValues.filter(x=>x!=="none"),
    exits:exitValues.filter(x=>x!=="none"),
    motions:motionValues.filter(x=>x!=="none")
  }
};

function suggestion(t){
  return {
    hook:"Can you answer this in 30 seconds?",
    explanation:"Explain one idea clearly.",
    spoken:"Python is a simple and powerful programming language.",
    code:"print('Hello, World!')",
    question:"What do you think the answer is?",
    answer:"Here is the correct answer.",
    image:"Add an image and explain it.",
    cta:"Thanks for watching. Share, subscribe and comment. Full code link is in the YouTube description."
  }[t] || "";
}

function makeSlide(type, heading="", content=""){
  const slideContent = content || suggestion(type);
  return {
    id:crypto.randomUUID(),
    type,
    heading:heading || typeNames[type],
    content:slideContent,
    duration:type==="hook" ? 3 : Number($("defaultDuration")?.value || 4),
    transition:"fade",
    exitTransition:type==="image" ? "fade" : "none",
    imageMotion:"none",
    background:(palettes[type]||palettes.explanation)[0],
    textColor:"#ffffff",
    language:"python",
    image:"",
    imageFit:"contain",
    speechVoice:"",
    speechRate:1,
    narrationText:slideContent.replaceAll("<br/>","\n"),
    narrationAudio:"",
    narrationName:"",
    narrationDuration:0,
    photoReel:false
  };
}

function current(){ return state.slides[state.current]; }
function clamp01(v){ return Math.max(0,Math.min(1,v)); }
function randomFrom(list){ return list[Math.floor(Math.random()*list.length)]; }
function status(text){ $("status").textContent = text; }
function escapeHtml(v){ return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function download(blob,name){ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500); }
function slug(v){ return String(v||"reel").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "reel"; }
function formatTime(seconds){ const s=Math.round(seconds); return s>=60?`${Math.floor(s/60)}m ${s%60}s`:`${s}s`; }

function syncSetup(){
  ["projectTitle","subject","teacherName","channelName","website","brandColor","accentColor"].forEach(k=>{
    if($(k)) $(k).value = state[k] ?? "";
  });
}
function readSetup(){
  ["projectTitle","subject","teacherName","channelName","website","brandColor","accentColor"].forEach(k=>{
    if($(k)) state[k] = $(k).value.trim();
  });
}
function saveLocal(){
  readSetup();
  try{
    localStorage.setItem(AUTOSAVE,JSON.stringify({...state,musicData:""}));
  }catch(e){}
}
function renderAll(){
  renderList();
  loadEditor();
  updateDuration();
  saveLocal();
  drawPreview(Number($("progress").value)/100);
}
function renderList(){
  $("slideList").innerHTML = state.slides.map((s,i)=>
    `<button class="slide-chip ${i===state.current?"active":""}" data-i="${i}" type="button">
      <b>${i+1}. ${typeNames[s.type]}</b><small>${escapeHtml(s.heading)}</small>
    </button>`).join("");
  $("slideList").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    state.current=Number(b.dataset.i); renderAll();
  });
}

function loadEditor(){
  const s=current(), has=!!s;
  $("emptyEditor").hidden=has;
  $("editorForm").hidden=!has;
  if(!s) return;
  $("editingType").textContent=typeNames[s.type];
  $("heading").value=s.heading;
  $("content").value=s.content;
  $("duration").value=s.duration;
  $("transition").value=s.transition||"fade";
  $("exitTransition").value=s.exitTransition||"none";
  $("background").value=s.background||"#075985";
  $("textColor").value=s.textColor||"#ffffff";
  $("language").value=s.language||"python";
  $("imageFit").value=s.imageFit||"contain";
  $("imageMotion").value=s.imageMotion||"none";
  $("speechVoice").value=s.speechVoice||"";
  $("speechRate").value=s.speechRate||1;
  $("speechRateOut").value=`${Number(s.speechRate||1).toFixed(1).replace(".0","")}×`;
  $("narrationText").value=s.narrationText ?? s.content ?? "";
  $("narrationStatus").textContent=s.narrationAudio
    ? `Audio ready: ${s.narrationName||"slide narration"}${s.narrationDuration?` (${s.narrationDuration.toFixed(1)}s)`:""}`
    : "No narration recorded.";
  $("codeFields").hidden=s.type!=="code";
  $("imageFields").hidden=s.type!=="image";
  $("speechFields").hidden=s.type!=="spoken";
}

function updateDuration(){
  const total=state.slides.reduce((sum,s)=>sum+Number(s.duration||0),0);
  $("durationStatus").textContent=formatTime(total);
  $("durationWarning").hidden=total<=60;
  $("slidePosition").textContent=state.slides.length?`Slide ${state.current+1} of ${state.slides.length}`:"No slides";
}

async function imageFrom(src){
  if(!src) throw new Error("Missing image");
  if(!imageCache.has(src)){
    imageCache.set(src,new Promise((resolve,reject)=>{
      const im=new Image();
      im.onload=()=>resolve(im);
      im.onerror=()=>{ imageCache.delete(src); reject(new Error("Image could not be loaded")); };
      im.src=src;
    }));
  }
  return imageCache.get(src);
}
async function preloadProjectImages(){
  const sources=[state.logo,...state.slides.map(s=>s.image)].filter(Boolean);
  await Promise.allSettled([...new Set(sources)].map(imageFrom));
}
function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file);
  });
}
function audioDuration(data){
  return new Promise((resolve,reject)=>{
    const a=new Audio(data);
    a.onloadedmetadata=()=>resolve(Number.isFinite(a.duration)?a.duration:0);
    a.onerror=reject;
  });
}
async function attachNarration(data,name){
  const s=current(); if(!s) return;
  s.narrationAudio=data;
  s.narrationName=name||"narration";
  try{s.narrationDuration=await audioDuration(data);}catch(e){s.narrationDuration=0;}
  if(s.narrationDuration) s.duration=Math.max(Number(s.duration||1),Math.ceil(s.narrationDuration+.35));
  renderAll();
  status("Narration attached to this slide.");
}

function wrap(ctx,text,maxWidth){
  const normalized=String(text||"").replaceAll("<br/>","\n");
  const paras=normalized.split("\n"), lines=[];
  for(const p of paras){
    if(!p){lines.push("");continue}
    let line="";
    for(const word of p.split(/\s+/)){
      const test=line?line+" "+word:word;
      if(ctx.measureText(test).width>maxWidth && line){lines.push(line);line=word}else line=test;
    }
    lines.push(line);
  }
  return lines;
}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}

function overlaySettings(){
  return {
    position:$("webcamPosition").value,
    size:$("webcamSize").value,
    round:$("webcamRound").checked,
    mirror:$("webcamMirror").checked
  };
}
function activeOverlayVideo(){
  const mode=$("overlaySourceMode").value;
  if(mode==="video"){
    const v=$("loopingOverlayVideo");
    return overlayUrl && v.readyState>=2 ? v : null;
  }
  if(mode==="camera"){
    const v=$("webcamVideo");
    return webcamStream && v.readyState>=2 ? v : null;
  }
  return null;
}
function drawOverlay(ctx){
  const video=activeOverlayVideo();
  if(!video || !video.videoWidth || !video.videoHeight) return;
  const settings=overlaySettings();
  const landscape=W>H;
  const sizes=landscape?{small:180,medium:245,large:320}:{small:220,medium:300,large:390};
  const width=sizes[settings.size]||300;
  const height=settings.round?width:Math.round(width*9/16);
  const margin=45;
  const x=settings.position.endsWith("right")?W-margin-width:margin;
  const y=settings.position.startsWith("top")?(landscape?155:245):H-(landscape?150:220)-height;

  ctx.save();
  ctx.beginPath();
  if(settings.round) ctx.arc(x+width/2,y+height/2,width/2,0,Math.PI*2);
  else ctx.roundRect(x,y,width,height,28);
  ctx.clip();

  const vr=video.videoWidth/video.videoHeight, br=width/height;
  let sw,sh,sx,sy;
  if(vr>br){sh=video.videoHeight;sw=sh*br;sx=(video.videoWidth-sw)/2;sy=0;}
  else{sw=video.videoWidth;sh=sw/br;sx=0;sy=(video.videoHeight-sh)/2;}
  if(settings.mirror){
    ctx.translate(x+width,y); ctx.scale(-1,1);
    ctx.drawImage(video,sx,sy,sw,sh,0,0,width,height);
  }else{
    ctx.drawImage(video,sx,sy,sw,sh,x,y,width,height);
  }
  ctx.restore();

  ctx.save();
  ctx.lineWidth=12;
  ctx.strokeStyle=state.accentColor||"#f59e0b";
  ctx.beginPath();
  if(settings.round) ctx.arc(x+width/2,y+height/2,width/2-6,0,Math.PI*2);
  else ctx.roundRect(x+6,y+6,width-12,height-12,23);
  ctx.stroke();
  ctx.restore();
}

function easeOut(t){t=clamp01(t);return 1-Math.pow(1-t,3);}
function easeInOut(t){t=clamp01(t);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
function centreTransform(ctx,sx,sy,rot=0,tx=0,ty=0){
  ctx.translate(tx,ty);ctx.translate(W/2,H/2);
  if(rot)ctx.rotate(rot);ctx.scale(sx,sy);ctx.translate(-W/2,-H/2);
}
function applyMotion(ctx,motion,p){
  p=clamp01(p);
  if(motion==="ken-in")centreTransform(ctx,1+p*.07,1+p*.07);
  else if(motion==="ken-out")centreTransform(ctx,1.07-p*.07,1.07-p*.07);
  else if(motion==="pan-left")centreTransform(ctx,1.035,1.035,0,55-p*110,0);
  else if(motion==="pan-right")centreTransform(ctx,1.035,1.035,0,-55+p*110,0);
  else if(motion==="pan-up")centreTransform(ctx,1.035,1.035,0,0,55-p*110);
  else if(motion==="pan-down")centreTransform(ctx,1.035,1.035,0,0,-55+p*110);
  else if(motion==="drift")centreTransform(ctx,1.025+p*.025,1.025+p*.025,0,22*Math.sin(p*Math.PI*1.5),-18*Math.cos(p*Math.PI));
  else if(motion==="float")centreTransform(ctx,1.02,1.02,0,14*Math.sin(p*Math.PI*2),18*Math.sin(p*Math.PI));
}
function applyEntrance(ctx,t,progress){
  const e=easeOut(progress/.18);
  if(t==="fade")ctx.globalAlpha*=Math.max(.01,e);
  else if(t==="slide")ctx.translate((1-e)*W,0);
  else if(t==="slide-left")ctx.translate(-(1-e)*W,0);
  else if(t==="slide-top")ctx.translate(0,-(1-e)*H);
  else if(t==="slide-bottom")ctx.translate(0,(1-e)*H);
  else if(t==="zoom")centreTransform(ctx,.76+.24*e,.76+.24*e);
  else if(t==="zoom-out")centreTransform(ctx,1.28-.28*e,1.28-.28*e);
  else if(t==="rise")centreTransform(ctx,1,1,0,0,(1-e)*H*.28);
  else if(t==="drop")centreTransform(ctx,1,1,0,0,-(1-e)*H*.28);
  else if(t==="rotate")centreTransform(ctx,.86+.14*e,.86+.14*e,(1-e)*-.16);
  else if(t==="rotate-reverse")centreTransform(ctx,.86+.14*e,.86+.14*e,(1-e)*.16);
  else if(t==="diagonal-tl")ctx.translate(-(1-e)*W*.75,-(1-e)*H*.45);
  else if(t==="diagonal-br")ctx.translate((1-e)*W*.75,(1-e)*H*.45);
  else if(t==="flip-x")centreTransform(ctx,Math.max(.04,e),1);
  else if(t==="flip-y")centreTransform(ctx,1,Math.max(.04,e));
  else if(t==="wipe-right"){ctx.beginPath();ctx.rect(0,0,W*e,H);ctx.clip();}
  else if(t==="wipe-down"){ctx.beginPath();ctx.rect(0,0,W,H*e);ctx.clip();}
  else if(t==="pop"){const z=e<.8?.72+e*.42:1.056-(e-.8)*.28;centreTransform(ctx,z,z);ctx.globalAlpha*=Math.max(.05,e);}
}
function applyExit(ctx,t,progress){
  const amount=clamp01((progress-.8)/.2);
  if(!amount || !t || t==="none")return;
  const e=easeInOut(amount);
  if(t==="fade")ctx.globalAlpha*=Math.max(.01,1-e);
  else if(t==="slide-left")ctx.translate(-e*W,0);
  else if(t==="slide-right")ctx.translate(e*W,0);
  else if(t==="slide-top")ctx.translate(0,-e*H);
  else if(t==="slide-bottom")ctx.translate(0,e*H);
  else if(t==="zoom"){centreTransform(ctx,1-e*.72,1-e*.72);ctx.globalAlpha*=1-e*.7;}
  else if(t==="zoom-in"){centreTransform(ctx,1+e*.55,1+e*.55);ctx.globalAlpha*=1-e;}
  else if(t==="rotate"){centreTransform(ctx,1-e*.45,1-e*.45,e*.38);ctx.globalAlpha*=1-e*.75;}
  else if(t==="rotate-reverse"){centreTransform(ctx,1-e*.45,1-e*.45,-e*.38);ctx.globalAlpha*=1-e*.75;}
  else if(t==="diagonal-tl")ctx.translate(-e*W*.8,-e*H*.55);
  else if(t==="diagonal-br")ctx.translate(e*W*.8,e*H*.55);
  else if(t==="shrink"){centreTransform(ctx,1-e*.82,1-e*.82);ctx.globalAlpha*=1-e;}
}
function drawImageInBox(ctx,im,x,y,w,h,fit){
  const ir=im.naturalWidth/im.naturalHeight, br=w/h;
  let dw,dh;
  if(fit==="cover"){
    if(ir>br){dh=h;dw=dh*ir}else{dw=w;dh=dw/ir}
  }else{
    if(ir>br){dw=w;dh=dw/ir}else{dh=h;dw=dh*ir}
  }
  ctx.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}

async function paint(ctx,s,progress=1){
  if(!s){
    ctx.fillStyle="#0f172a";ctx.fillRect(0,0,W,H);return;
  }
  const grad=ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,s.background||"#075985");
  grad.addColorStop(1,state.brandColor||"#075985");
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);

  ctx.save();
  if(s.type==="image")applyMotion(ctx,s.imageMotion||"none",progress);
  applyEntrance(ctx,s.transition||"fade",progress);
  if(s.type==="image")applyExit(ctx,s.exitTransition||"none",progress);

  const landscape=W>H;
  const headingY=landscape?105:245;
  ctx.textAlign="center";
  ctx.fillStyle=s.textColor||"#fff";
  ctx.font=`900 ${landscape?58:68}px system-ui`;
  const head=wrap(ctx,s.heading,landscape?1200:900).slice(0,2);
  head.forEach((line,i)=>ctx.fillText(line,W/2,headingY+i*(landscape?68:82)));

  if(s.type==="image" && s.image){
    try{
      const im=await imageFrom(s.image);
      const x=landscape?110:95, y=landscape?205:420;
      const bw=landscape?860:890, bh=landscape?690:1040;
      ctx.save();ctx.beginPath();ctx.roundRect(x,y,bw,bh,34);ctx.clip();
      drawImageInBox(ctx,im,x,y,bw,bh,s.imageFit||"contain");
      ctx.restore();
    }catch(e){}
  }else if(s.type==="code"){
    ctx.textAlign="left";
    ctx.font="500 48px ui-monospace, SFMono-Regular, Consolas, monospace";
    ctx.fillStyle="#fff";
    const maxWidth=landscape?1400:900;
    const x=landscape?230:90, y=landscape?255:470, lh=66;
    const lines=String(s.content||"").replace(/\t/g,"    ").split("\n");
    const wrapped=[];
    for(const raw of lines){
      if(!raw){wrapped.push("");continue}
      let rest=raw;
      while(rest){
        let take=rest.length;
        while(take>1 && ctx.measureText(rest.slice(0,take)).width>maxWidth)take--;
        wrapped.push(rest.slice(0,take));rest=rest.slice(take);
      }
    }
    const maxLines=landscape?10:16;
    const overflow=Math.max(0,wrapped.length-maxLines);
    const scroll=overflow*lh*clamp01(progress);
    wrapped.forEach((line,i)=>{
      const yy=y+i*lh-scroll;
      if(yy>y-lh && yy<(landscape?930:1540))ctx.fillText(line,x,yy);
    });
  }else{
    ctx.textAlign="center";
    ctx.font=`${s.type==="question"||s.type==="answer"?"700":"550"} ${landscape?44:55}px system-ui`;
    const lines=wrap(ctx,s.content,landscape?1300:880).slice(0,landscape?8:11);
    const start=landscape?320:580, lh=landscape?61:78;
    lines.forEach((line,i)=>ctx.fillText(line,W/2,start+i*lh));
  }
  ctx.restore();

  const footerH=landscape?125:190;
  ctx.fillStyle="#061a2bdd";ctx.fillRect(0,H-footerH,W,footerH);
  ctx.textAlign="left";ctx.fillStyle="#fff";
  ctx.font=`800 ${landscape?31:40}px system-ui`;
  ctx.fillText(state.teacherName||"Your Teacher",landscape?65:60,H-(landscape?67:108));
  ctx.font=`500 ${landscape?24:31}px system-ui`;ctx.fillStyle="#bae6fd";
  ctx.fillText(state.channelName||"",landscape?65:60,H-(landscape?28:58));
  ctx.textAlign="right";ctx.fillStyle=state.accentColor||"#f59e0b";
  ctx.font=`700 ${landscape?25:30}px system-ui`;
  ctx.fillText(state.website||"",W-(landscape?65:60),H-(landscape?45:70));

  if(state.logo){
    try{
      const logo=await imageFrom(state.logo);
      const lw=landscape?170:175, lh=landscape?105:125, lx=W-(landscape?235:245), ly=landscape?35:70;
      ctx.save();ctx.fillStyle="#ffffffee";rounded(ctx,lx,ly,lw,lh,18);
      drawImageInBox(ctx,logo,lx+15,ly+10,lw-30,lh-20,"contain");ctx.restore();
    }catch(e){}
  }
  drawOverlay(ctx);
}

let previewSeq=0;
const previewBuffer=document.createElement("canvas");
const previewCtxBuffer=previewBuffer.getContext("2d");

function setCanvasFormat(value=$("exportFormat").value){
  const landscape=value==="landscape";
  W=landscape?1920:1080;H=landscape?1080:1920;
  previewBuffer.width=W;previewBuffer.height=H;
  $("preview").width=W;$("preview").height=H;
  $("videoBtn").textContent=landscape?"Export Full-screen — 1920×1080":"Export Vertical Reel — 1080×1920";
}
async function drawPreview(progress=1){
  const seq=++previewSeq;
  const s=current();
  previewCtxBuffer.clearRect(0,0,W,H);
  await paint(previewCtxBuffer,s,progress);
  if(seq!==previewSeq)return;
  const ctx=$("preview").getContext("2d");
  ctx.clearRect(0,0,W,H);ctx.drawImage(previewBuffer,0,0);
  if(s)$("slidePosition").textContent=`Slide ${state.current+1} of ${state.slides.length}`;
}
function startOverlayPreviewLoop(){
  cancelAnimationFrame(previewAnimationId);
  const tick=async()=>{
    if(!activeOverlayVideo()){previewAnimationId=0;return;}
    if(!playing&&!exporting&&!previewBusy){
      previewBusy=true;
      try{await drawPreview(Number($("progress").value)/100);}finally{previewBusy=false;}
    }
    previewAnimationId=requestAnimationFrame(tick);
  };
  previewAnimationId=requestAnimationFrame(tick);
}

async function startWebcam(){
  if(webcamStream)return;
  if(!navigator.mediaDevices?.getUserMedia)return status("Camera requires HTTPS or localhost.");
  try{
    webcamStream=await navigator.mediaDevices.getUserMedia({
      video:{width:{ideal:1280},height:{ideal:720},facingMode:"user"},audio:false
    });
    const v=$("webcamVideo");v.srcObject=webcamStream;
    await v.play();
    $("startWebcamBtn").disabled=true;$("stopWebcamBtn").disabled=false;
    $("webcamStatus").textContent="Camera is live.";
    startOverlayPreviewLoop();drawPreview(1);status("Web camera is live.");
  }catch(e){
    webcamStream=null;$("webcamStatus").textContent="Could not start camera.";
    status("Could not start the web camera.");
  }
}
function stopWebcam(){
  cancelAnimationFrame(previewAnimationId);previewAnimationId=0;
  if(webcamStream)webcamStream.getTracks().forEach(t=>t.stop());
  webcamStream=null;
  const v=$("webcamVideo");v.pause();v.srcObject=null;
  $("startWebcamBtn").disabled=false;$("stopWebcamBtn").disabled=true;
  $("webcamStatus").textContent="Camera is off.";
  drawPreview(1);
}
function updateOverlayMode(){
  const mode=$("overlaySourceMode").value;
  $("cameraControls").hidden=mode!=="camera";
  $("videoOverlayControls").hidden=mode!=="video";
  if(mode==="camera"){
    $("loopingOverlayVideo").pause();
    if(webcamStream)startOverlayPreviewLoop();
  }else if(mode==="video"){
    if(webcamStream)stopWebcam();
    const v=$("loopingOverlayVideo");
    if(overlayUrl){v.play().catch(()=>{});startOverlayPreviewLoop();}
  }else{
    if(webcamStream)stopWebcam();
    $("loopingOverlayVideo").pause();
    cancelAnimationFrame(previewAnimationId);previewAnimationId=0;drawPreview(1);
  }
}
async function loadOverlayVideo(file){
  if(!file)return;
  if(overlayUrl)URL.revokeObjectURL(overlayUrl);
  overlayUrl=URL.createObjectURL(file);overlayName=file.name;
  const v=$("loopingOverlayVideo");
  v.src=overlayUrl;v.muted=true;v.loop=true;v.playsInline=true;
  await new Promise((resolve,reject)=>{
    v.onloadeddata=resolve;v.onerror=reject;
  });
  v.currentTime=0;await v.play();
  $("videoOverlayStatus").textContent=`${overlayName} is looping continuously.`;
  startOverlayPreviewLoop();drawPreview(1);status("Looping video overlay is active.");
}
function removeOverlayVideo(){
  const v=$("loopingOverlayVideo");v.pause();v.removeAttribute("src");v.load();
  if(overlayUrl)URL.revokeObjectURL(overlayUrl);
  overlayUrl="";overlayName="";
  $("videoOverlayStatus").textContent="Choose a video. It will loop continuously.";
  cancelAnimationFrame(previewAnimationId);previewAnimationId=0;drawPreview(1);
}

async function photoData(file,largeSet=false){
  if("createImageBitmap" in window){
    try{
      const bitmap=await createImageBitmap(file);
      const maxDimension=largeSet?1440:1920;
      const ratio=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(bitmap.width*ratio));
      canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
      canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);
      bitmap.close?.();
      return canvas.toDataURL("image/jpeg",largeSet?.82:.9);
    }catch(e){}
  }
  return fileToDataUrl(file);
}
function cleanCaption(name){
  return String(name||"Photo").replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim().replace(/\b\w/g,c=>c.toUpperCase()).slice(0,70);
}
function applyPreset(slide,name,index){
  const p=presets[name]||presets.cinematic;
  slide.transition=randomFrom(p.entrances);
  slide.exitTransition=randomFrom(p.exits);
  slide.imageMotion=randomFrom(p.motions);
  if(index%2 && slide.imageMotion==="pan-left")slide.imageMotion="pan-right";
}
async function createPhotoReel(filesList){
  const selected=[...filesList].filter(f=>f.type.startsWith("image/"));
  if(!selected.length)return;
  const files=selected.slice(0,MAX_PHOTOS);
  const seconds=Math.max(1,Math.min(15,Number($("photoReelSeconds").value||5)));
  if(selected.length>MAX_PHOTOS)alert(`Only the first ${MAX_PHOTOS} pictures will be used.`);
  if(files.length>RECOMMENDED_PHOTOS){
    const ok=confirm(`${files.length} pictures selected.\n\nRecommended: ${RECOMMENDED_PHOTOS}\nMaximum: ${MAX_PHOTOS}\nEstimated duration: ${formatTime(files.length*seconds)}\n\nContinue?`);
    if(!ok)return;
  }
  if(state.slides.length && !confirm(`Replace the current ${state.slides.length} slides with ${files.length} photo slides?`))return;
  $("photoReelStatus").textContent=`Preparing ${files.length} pictures…`;
  const large=files.length>20, fit=$("photoReelFit").value, preset=$("photoReelPreset").value, captions=$("photoFilenameCaption").checked;
  const slides=[];
  for(let i=0;i<files.length;i++){
    $("photoReelStatus").textContent=`Preparing picture ${i+1} of ${files.length}…`;
    const s=makeSlide("image","Photo","");
    s.heading=captions?cleanCaption(files[i].name):"";
    s.content="";
    s.narrationText=s.heading;
    s.duration=seconds;s.imageFit=fit;s.image=await photoData(files[i],large);s.photoReel=true;
    applyPreset(s,preset,i);slides.push(s);
  }
  state.slides=slides;state.current=0;
  if($("projectTitle").value.trim()==="Python in 30 Seconds"){$("projectTitle").value="Photo Reel";state.projectTitle="Photo Reel";}
  renderAll();
  $("photoReelStatus").textContent=`${slides.length} photo slides created.`;
  status(`Photo Reel ready: ${slides.length} pictures × ${seconds}s = ${formatTime(slides.length*seconds)}.`);
}

function stopNarration(){
  if(narrationPlayer){narrationPlayer.pause();narrationPlayer=null;}
}
function playNarration(){
  const s=current();if(!s?.narrationAudio)return status("No narration attached.");
  stopNarration();narrationPlayer=new Audio(s.narrationAudio);narrationPlayer.play();
}
async function startMicRecording(){
  if(recording)return;
  const stream=await navigator.mediaDevices.getUserMedia({
    audio:{
      echoCancellation:$("noiseRemoval").checked,
      noiseSuppression:$("noiseRemoval").checked,
      autoGainControl:true
    }
  });
  const mime=["audio/webm;codecs=opus","audio/webm"].find(x=>MediaRecorder.isTypeSupported(x))||"";
  const rec=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
  const chunks=[];
  rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  rec.onstop=async()=>{
    stream.getTracks().forEach(t=>t.stop());
    const blob=new Blob(chunks,{type:rec.mimeType||"audio/webm"});
    await attachNarration(await fileToDataUrl(blob),"microphone narration");
    recording=null;$("recordNarrationBtn").textContent="● Start recording";
  };
  recording={rec,stream};rec.start();
  $("recordNarrationBtn").textContent="■ Stop recording";status("Recording narration…");
}
function stopMicRecording(){if(recording?.rec.state!=="inactive")recording.rec.stop();}

function loadSpeechVoices(){
  const voices=speechSynthesis?.getVoices?.()||[];
  for(const id of ["speechVoice","ttsNarrationVoice"]){
    const select=$(id);if(!select)continue;
    const chosen=select.value;
    select.innerHTML='<option value="">Browser default</option>';
    voices.forEach(v=>{const o=document.createElement("option");o.value=v.name;o.textContent=`${v.name} (${v.lang})`;select.appendChild(o);});
    if([...select.options].some(o=>o.value===chosen))select.value=chosen;
  }
}
function speakText(text,voiceName,rate=1){
  if(!("speechSynthesis" in window))return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  const v=speechSynthesis.getVoices().find(x=>x.name===voiceName);
  if(v){u.voice=v;u.lang=v.lang;}u.rate=Number(rate||1);speechSynthesis.speak(u);
}
async function recordSynthesizedSpeech(){
  const text=$("narrationText").value.trim()||current()?.content||"";
  if(!text)return status("Enter narration text first.");
  if(!navigator.mediaDevices?.getDisplayMedia||!window.MediaRecorder)return status("System-audio capture is unavailable.");
  let stream;
  try{
    status("Choose Entire Screen and enable Share system audio.");
    stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true,systemAudio:"include"});
    const audioTracks=stream.getAudioTracks();
    if(!audioTracks.length)throw new Error("No system audio was shared");
    const audioStream=new MediaStream(audioTracks);
    const mime=["audio/webm;codecs=opus","audio/webm","video/webm"].find(x=>MediaRecorder.isTypeSupported(x))||"";
    const rec=mime?new MediaRecorder(audioStream,{mimeType:mime}):new MediaRecorder(audioStream);
    const chunks=[];
    rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
    const voiceName=$("ttsNarrationVoice").value;
    const rate=$("ttsNarrationRate").value;
    const u=new SpeechSynthesisUtterance(text);
    const voice=speechSynthesis.getVoices().find(v=>v.name===voiceName);
    if(voice){u.voice=voice;u.lang=voice.lang;}u.rate=Number(rate||1);
    const stopped=new Promise(resolve=>{rec.onstop=resolve;});
    rec.start(100);
    await new Promise(r=>setTimeout(r,600));
    u.onend=()=>setTimeout(()=>rec.state!=="inactive"&&rec.stop(),400);
    u.onerror=()=>setTimeout(()=>rec.state!=="inactive"&&rec.stop(),150);
    speechSynthesis.cancel();speechSynthesis.speak(u);
    await stopped;
    const blob=new Blob(chunks,{type:rec.mimeType||"audio/webm"});
    if(!blob.size)throw new Error("The captured system audio was empty");
    await attachNarration(await fileToDataUrl(blob),`speech synthesis — ${voice?.name||"default voice"}`);
  }catch(e){
    status(`Synthesized narration capture failed: ${e.message||"capture failed"}.`);
  }finally{
    stream?.getTracks().forEach(t=>t.stop());
  }
}

async function playProject(){
  if(playing){playing=false;playToken++;$("playBtn").textContent="▶ Preview";return;}
  if(!state.slides.length)return;
  playing=true;$("playBtn").textContent="■ Stop";
  const token=++playToken;
  const overlay=activeOverlayVideo();if(overlay&&overlay.paused)overlay.play().catch(()=>{});
  try{
    for(let i=0;i<state.slides.length&&playing&&token===playToken;i++){
      state.current=i;renderList();loadEditor();
      const s=current(),start=performance.now(),duration=Number(s.duration||1)*1000;
      if(s.narrationAudio){stopNarration();narrationPlayer=new Audio(s.narrationAudio);narrationPlayer.play().catch(()=>{});}
      else if(s.type==="spoken")speakText(s.narrationText||s.content,s.speechVoice,s.speechRate);
      while(playing&&token===playToken){
        const p=Math.min(1,(performance.now()-start)/duration);
        $("progress").value=p*100;await drawPreview(p);
        if(p>=1)break;
        await new Promise(r=>requestAnimationFrame(r));
      }
      stopNarration();
    }
  }finally{
    playing=false;$("playBtn").textContent="▶ Preview";$("progress").value=100;
    renderAll();if(activeOverlayVideo())startOverlayPreviewLoop();
  }
}

async function decodeAudio(ctx,data){
  const res=await fetch(data);const arr=await res.arrayBuffer();return ctx.decodeAudioData(arr.slice(0));
}
async function buildAudioTimeline(){
  const hasAudio=!!musicData||state.slides.some(s=>!!s.narrationAudio);
  if(!hasAudio)return null;
  const AC=window.AudioContext||window.webkitAudioContext, OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!AC||!OAC)return null;
  const decodeCtx=new AC();await decodeCtx.resume();
  const duration=state.slides.reduce((a,s)=>a+Number(s.duration||0),0);
  const sampleRate=48000, offline=new OAC(2,Math.max(1,Math.ceil(duration*sampleRate)),sampleRate);
  const master=offline.createGain();master.connect(offline.destination);
  if(musicData){
    const mb=await decodeAudio(decodeCtx,musicData), src=offline.createBufferSource(),gain=offline.createGain();
    src.buffer=mb;src.loop=true;gain.gain.value=Number($("musicVolume").value||.2);src.connect(gain);gain.connect(master);src.start(0);src.stop(duration);
  }
  let offset=0;
  for(const s of state.slides){
    if(s.narrationAudio){
      const b=await decodeAudio(decodeCtx,s.narrationAudio),src=offline.createBufferSource();src.buffer=b;src.connect(master);src.start(offset);
    }
    offset+=Number(s.duration||0);
  }
  const rendered=await offline.startRendering();await decodeCtx.close();return rendered;
}
async function exportVideo(){
  if(exporting)return status("A video export is already running.");
  if(!state.slides.length)return status("Add slides before exporting.");
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)return status("Video export is unsupported.");
  exporting=true;$("videoBtn").disabled=true;$("videoBtn").textContent="Exporting…";
  cancelAnimationFrame(previewAnimationId);previewAnimationId=0;
  const selected=state.current;
  let audioCtx=null,timelineSource=null,recorder=null;
  try{
    await preloadProjectImages();
    const audioBuffer=await buildAudioTimeline();
    const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;const ctx=canvas.getContext("2d");
    const frame=document.createElement("canvas");frame.width=W;frame.height=H;const fctx=frame.getContext("2d");
    const videoStream=canvas.captureStream(FPS);
    const tracks=[videoStream.getVideoTracks()[0]];
    if(audioBuffer){
      const AC=window.AudioContext||window.webkitAudioContext;audioCtx=new AC({sampleRate:audioBuffer.sampleRate});await audioCtx.resume();
      const dest=audioCtx.createMediaStreamDestination();tracks.push(dest.stream.getAudioTracks()[0]);
      timelineSource=audioCtx.createBufferSource();timelineSource.buffer=audioBuffer;timelineSource.connect(dest);
      const monitor=audioCtx.createGain();monitor.gain.value=0;timelineSource.connect(monitor);monitor.connect(audioCtx.destination);
    }
    const stream=new MediaStream(tracks);
    const mime=["video/webm;codecs=vp8,opus","video/webm;codecs=vp9,opus","video/webm"].find(x=>MediaRecorder.isTypeSupported(x))||"";
    recorder=mime?new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:W>H?8000000:6500000,audioBitsPerSecond:192000}):new MediaRecorder(stream);
    const chunks=[];recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);
    recorder.start(250);
    const overlay=activeOverlayVideo();if(overlay){overlay.currentTime=0;await overlay.play().catch(()=>{});}
    if(timelineSource)timelineSource.start(audioCtx.currentTime+.1);
    await new Promise(r=>setTimeout(r,100));

    let elapsed=0;
    for(let i=0;i<state.slides.length;i++){
      state.current=i;renderList();loadEditor();
      const s=state.slides[i],seconds=Number(s.duration||1),frames=Math.max(1,Math.round(seconds*FPS));
      for(let j=0;j<frames;j++){
        const p=frames>1?j/(frames-1):1;
        fctx.clearRect(0,0,W,H);await paint(fctx,s,p);
        ctx.clearRect(0,0,W,H);ctx.drawImage(frame,0,0);
        const pc=$("preview").getContext("2d");pc.clearRect(0,0,W,H);pc.drawImage(frame,0,0);
        $("progress").value=p*100;
        status(`Rendering slide ${i+1}/${state.slides.length} — ${Math.round((i+j/frames)/state.slides.length*100)}%`);
        await new Promise(r=>setTimeout(r,1000/FPS));
      }
      elapsed+=seconds;
    }
    await new Promise(r=>setTimeout(r,200));
    const stopped=new Promise(r=>recorder.addEventListener("stop",r,{once:true}));recorder.stop();await stopped;
    try{timelineSource?.stop();}catch(e){}
    await audioCtx?.close();
    const suffix=audioBuffer?"with-audio":"silent";
    download(new Blob(chunks,{type:recorder.mimeType||mime||"video/webm"}),`${slug(state.projectTitle)}-${W}x${H}-${suffix}.webm`);
    status("Video export complete.");
  }catch(e){
    if(recorder?.state==="recording")recorder.stop();
    try{timelineSource?.stop();}catch(x){}
    await audioCtx?.close().catch(()=>{});
    status(`Video export stopped: ${e.message||"unexpected error"}`);
  }finally{
    exporting=false;$("videoBtn").disabled=false;setCanvasFormat();
    state.current=Math.max(0,Math.min(selected,state.slides.length-1));$("progress").value=100;renderAll();
    if(activeOverlayVideo())startOverlayPreviewLoop();
  }
}

function bindEditor(){
  const bindings=[
    ["heading","heading"],["content","content"],["duration","duration"],["transition","transition"],
    ["exitTransition","exitTransition"],["background","background"],["textColor","textColor"],
    ["language","language"],["imageFit","imageFit"],["imageMotion","imageMotion"],
    ["speechVoice","speechVoice"],["speechRate","speechRate"],["narrationText","narrationText"]
  ];
  bindings.forEach(([id,key])=>{
    $(id).addEventListener("input",()=>{
      const s=current();if(!s)return;
      s[key]=id==="duration"||id==="speechRate"?Number($(id).value):$(id).value;
      if(id==="speechRate")$("speechRateOut").value=`${Number($(id).value).toFixed(1).replace(".0","")}×`;
      saveLocal();drawPreview(Number($("progress").value)/100);renderList();updateDuration();
    });
  });
}

function projectPayload(){
  readSetup();
  return {
    format:PROJECT_FORMAT,version:PROJECT_VERSION,savedAt:new Date().toISOString(),
    state:structuredClone(state),assets:{musicData,musicName},
    settings:{musicVolume:Number($("musicVolume").value),exportFormat:$("exportFormat").value}
  };
}

document.querySelectorAll("#slideButtons button").forEach(b=>b.onclick=()=>{
  state.slides.push(makeSlide(b.dataset.type));state.current=state.slides.length-1;renderAll();
});
$("useTemplateBtn").onclick=()=>{
  const key=$("templateSelect").value;if(!key)return status("Choose a lesson template.");
  if(state.slides.length&&!confirm("Replace the current slides with this template?"))return;
  state.slides=templates[key].map(x=>makeSlide(...x));state.current=0;renderAll();status("Template created.");
};
$("photoReelInput").onchange=e=>createPhotoReel(e.target.files).finally(()=>e.target.value="");
$("randomizePhotoAnimationsBtn").onclick=()=>{
  const slides=state.slides.filter(s=>s.type==="image");if(!slides.length)return status("No image slides.");
  const p=$("photoReelPreset").value;slides.forEach((s,i)=>applyPreset(s,p,i));renderAll();status("Photo animations randomized.");
};
$("prevBtn").onclick=()=>{if(state.slides.length){state.current=(state.current-1+state.slides.length)%state.slides.length;renderAll();}};
$("nextBtn").onclick=()=>{if(state.slides.length){state.current=(state.current+1)%state.slides.length;renderAll();}};
$("playBtn").onclick=playProject;
$("progress").oninput=()=>drawPreview(Number($("progress").value)/100);

$("upBtn").onclick=()=>{
  if(state.current<=0)return;[state.slides[state.current-1],state.slides[state.current]]=[state.slides[state.current],state.slides[state.current-1]];state.current--;renderAll();
};
$("downBtn").onclick=()=>{
  if(state.current>=state.slides.length-1)return;[state.slides[state.current+1],state.slides[state.current]]=[state.slides[state.current],state.slides[state.current+1]];state.current++;renderAll();
};
$("duplicateBtn").onclick=()=>{
  const s=current();if(!s)return;const copy=structuredClone(s);copy.id=crypto.randomUUID();state.slides.splice(state.current+1,0,copy);state.current++;renderAll();
};
$("deleteBtn").onclick=()=>{
  if(!current()||!confirm("Delete this slide?"))return;state.slides.splice(state.current,1);state.current=Math.max(0,Math.min(state.current,state.slides.length-1));renderAll();
};

$("imageInput").onchange=async e=>{
  if(!current()||!e.target.files[0])return;current().image=await fileToDataUrl(e.target.files[0]);imageCache.delete(current().image);renderAll();e.target.value="";
};
$("logoInput").onchange=async e=>{
  if(!e.target.files[0])return;state.logo=await fileToDataUrl(e.target.files[0]);renderAll();e.target.value="";
};
$("musicInput").onchange=async e=>{
  if(!e.target.files[0])return;musicData=await fileToDataUrl(e.target.files[0]);musicName=e.target.files[0].name;status(`Music loaded: ${musicName}`);e.target.value="";
};
$("musicVolume").oninput=()=>{$("musicVolumeOut").value=`${Math.round(Number($("musicVolume").value)*100)}%`;};

$("startWebcamBtn").onclick=startWebcam;$("stopWebcamBtn").onclick=stopWebcam;
$("overlaySourceMode").onchange=updateOverlayMode;
$("videoOverlayInput").onchange=e=>loadOverlayVideo(e.target.files?.[0]).catch(err=>status(`Video overlay error: ${err.message}`)).finally(()=>e.target.value="");
$("restartVideoOverlayBtn").onclick=()=>{const v=$("loopingOverlayVideo");if(overlayUrl){v.currentTime=0;v.play();startOverlayPreviewLoop();}};
$("removeVideoOverlayBtn").onclick=removeOverlayVideo;
["webcamPosition","webcamSize","webcamRound","webcamMirror"].forEach(id=>$(id).addEventListener("input",()=>drawPreview(1)));

$("recordNarrationBtn").onclick=()=>recording?stopMicRecording():startMicRecording().catch(e=>status(`Microphone error: ${e.message}`));
$("narrationInput").onchange=async e=>{if(e.target.files[0])await attachNarration(await fileToDataUrl(e.target.files[0]),e.target.files[0].name);e.target.value="";};
$("playNarrationBtn").onclick=playNarration;
$("removeNarrationBtn").onclick=()=>{const s=current();if(!s)return;s.narrationAudio="";s.narrationName="";s.narrationDuration=0;renderAll();};
$("testSpeechBtn").onclick=()=>{const s=current();if(s)speakText(s.narrationText||s.content,s.speechVoice,s.speechRate);};
$("previewTtsNarrationBtn").onclick=()=>speakText($("narrationText").value,$("ttsNarrationVoice").value,$("ttsNarrationRate").value);
$("recordTtsNarrationBtn").onclick=recordSynthesizedSpeech;
$("ttsNarrationRate").oninput=()=>{$("ttsNarrationRateOut").value=`${Number($("ttsNarrationRate").value).toFixed(1).replace(".0","")}×`;};

$("exportFormat").onchange=()=>{setCanvasFormat();drawPreview(1);};
$("coverBtn").onclick=async()=>{
  await drawPreview(1);$("preview").toBlob(blob=>download(blob,`${slug(state.projectTitle)}-cover.png`),"image/png");
};
$("videoBtn").onclick=exportVideo;

$("saveBtn").onclick=()=>download(new Blob([JSON.stringify(projectPayload(),null,2)],{type:"application/json"}),`${slug(state.projectTitle)}.json`);
$("openInput").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const project=JSON.parse(await file.text());
    if(project.state)state={...structuredClone(defaults),...project.state};
    else state={...structuredClone(defaults),...project};
    musicData=project.assets?.musicData||"";musicName=project.assets?.musicName||"";
    syncSetup();$("musicVolume").value=project.settings?.musicVolume??.2;$("musicVolumeOut").value=`${Math.round(Number($("musicVolume").value)*100)}%`;
    $("exportFormat").value=project.settings?.exportFormat||"vertical";setCanvasFormat();renderAll();status("Project opened.");
  }catch(err){status("Could not open project JSON.");}
  e.target.value="";
};
$("newBtn").onclick=()=>{
  if(state.slides.length&&!confirm("Start a new project?"))return;
  state=structuredClone(defaults);musicData="";musicName="";syncSetup();renderAll();status("New project.");
};

$("guideBtn").onclick=()=>$("guideDialog").showModal();
$("closeGuideBtn").onclick=$("doneGuideBtn").onclick=()=>$("guideDialog").close();

bindEditor();
loadSpeechVoices();
if("speechSynthesis" in window)speechSynthesis.onvoiceschanged=loadSpeechVoices;

try{
  const saved=JSON.parse(localStorage.getItem(AUTOSAVE)||"null");
  if(saved)state={...structuredClone(defaults),...saved};
}catch(e){}
syncSetup();setCanvasFormat();renderAll();updateOverlayMode();

window.addEventListener("beforeunload",()=>{
  if(overlayUrl)URL.revokeObjectURL(overlayUrl);
  stopNarration();
  speechSynthesis?.cancel?.();
});
