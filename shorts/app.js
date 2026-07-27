"use strict";
const $=id=>document.getElementById(id);
const W=1080,H=1920,FPS=30,AUTOSAVE="edushorts-maker-v1";
const defaults={projectTitle:"Python in 30 Seconds",subject:"Python",teacherName:"Champak Roy",channelName:"Learn With Champak",website:"learnwithchampak.live",brandColor:"#075985",accentColor:"#f59e0b",logo:"",slides:[],current:0};
let state=structuredClone(defaults),playing=false,playToken=0,musicData="",musicName="";
const typeNames={hook:"Hook",explanation:"Explanation",code:"Code",question:"Question",answer:"Answer",image:"Image",cta:"Call to action"};
const palettes={hook:["#7c2d12","#f59e0b"],explanation:["#075985","#0ea5e9"],code:["#111827","#1e293b"],question:["#4c1d95","#7c3aed"],answer:["#065f46","#10b981"],image:["#0f172a","#334155"],cta:["#9a3412","#ea580c"]};
const templates={
 concept:[["hook","Did you know?","Start with a surprising question."],["explanation","The idea","Explain one concept in one clear sentence."],["explanation","Simple example","Show how the concept works."],["answer","Remember","State the key takeaway."],["cta","Keep learning","Follow Learn With Champak for more."]],
 coding:[["hook","Can you solve this?","A quick coding challenge."],["code","Try this code","print('Hello, learner!')"],["answer","Output","Hello, learner!"],["explanation","Why it works","Explain the important line."],["question","Your challenge","How would you change the output?"],["cta","Practise now","Write and run the program yourself."]],
 mcq:[["question","Quick question","Which answer is correct?\nA. First option\nB. Second option\nC. Third option"],["explanation","Think…","You have three seconds."],["answer","Correct answer","B. Second option\nAdd a one-line explanation."],["cta","How did you do?","Comment your answer and follow for more."]],
 dsa:[["hook","DSA challenge","Can you solve this efficiently?"],["question","Problem","Describe the input and required output."],["explanation","Step 1","Show the first logical step."],["explanation","Step 2","Show the next logical step."],["code","Solution","def solve(data):\n    return data"],["answer","Complexity","Time: O(n)\nSpace: O(1)"],["cta","Your turn","Try another input yourself."]]
};
function makeSlide(type,heading="",content=""){
 const [bg]=palettes[type]||palettes.explanation;
 return{id:crypto.randomUUID(),type,heading:heading||typeNames[type],content:content||suggestion(type),duration:type==="hook"?3:Number($("defaultDuration").value||4),transition:"fade",background:bg,textColor:"#ffffff",language:"python",image:"",imageFit:"contain"};
}
function suggestion(t){return{hook:"Can you answer this in 30 seconds?",explanation:"Explain one idea clearly.",code:"print('Hello, World!')",question:"What do you think the answer is?",answer:"Here is the correct answer.",image:"Add an image and explain it.",cta:"Follow Learn With Champak for more lessons."}[t]}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function current(){return state.slides[state.current]}
function syncSetup(){
 ["projectTitle","subject","teacherName","channelName","website","brandColor","accentColor"].forEach(k=>$(k).value=state[k]||"");
}
function readSetup(){
 ["projectTitle","subject","teacherName","channelName","website","brandColor","accentColor"].forEach(k=>state[k]=$(k).value.trim());
}
function saveLocal(){readSetup();try{localStorage.setItem(AUTOSAVE,JSON.stringify({...state,musicData:""}))}catch(e){}}
function renderAll(){renderList();loadEditor();drawPreview(1);updateDuration();saveLocal()}
function renderList(){
 $("slideList").innerHTML=state.slides.map((s,i)=>`<button class="slide-chip ${i===state.current?"active":""}" data-i="${i}"><b>${i+1}. ${typeNames[s.type]}</b><small>${escapeHtml(s.heading)}</small></button>`).join("");
 $("slideList").querySelectorAll("button").forEach(b=>b.onclick=()=>{state.current=Number(b.dataset.i);renderAll()});
}
function loadEditor(){
 const s=current(),has=!!s;$("emptyEditor").hidden=has;$("editorForm").hidden=!has;
 if(!s)return;
 $("editingType").textContent=typeNames[s.type];$("heading").value=s.heading;$("content").value=s.content;
 $("duration").value=s.duration;$("transition").value=s.transition;$("background").value=s.background;$("textColor").value=s.textColor;
 $("language").value=s.language||"python";$("imageFit").value=s.imageFit||"contain";
 $("codeFields").hidden=s.type!=="code";$("imageFields").hidden=s.type!=="image";
}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function wrap(ctx,text,maxWidth){
 const paras=String(text||"").split("\n"),lines=[];
 for(const p of paras){if(!p){lines.push("");continue}let line="";for(const word of p.split(/\s+/)){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}lines.push(line)}
 return lines;
}
async function imageFrom(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src})}
async function paint(ctx,s,progress=1){
 const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,s.background);grad.addColorStop(1,state.brandColor||"#075985");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 ctx.save();if(s.transition==="fade")ctx.globalAlpha=Math.max(.02,progress);if(s.transition==="zoom"){const z=.88+.12*progress;ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-W/2,-H/2)}if(s.transition==="slide")ctx.translate((1-progress)*W,0);
 if(s.type==="image"&&s.image){try{const im=await imageFrom(s.image),ir=im.width/im.height,cr=W/(H-360);let dw,dh;if((s.imageFit==="cover"&&ir>cr)||(s.imageFit!=="cover"&&ir<cr)){dh=H-360;dw=dh*ir}else{dw=W;dh=dw/ir}ctx.drawImage(im,(W-dw)/2,170+(H-360-dh)/2,dw,dh)}catch(e){}}
 ctx.fillStyle="#ffffff22";ctx.beginPath();ctx.arc(900,190,220,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(80,1720,270,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=state.accentColor||"#f59e0b";ctx.fillRect(70,105,150,14);
 ctx.fillStyle=s.textColor;ctx.font="800 46px system-ui";ctx.fillText((state.subject||"LESSON").toUpperCase(),70,185);
 let y=s.type==="image"?1320:500;ctx.font="900 90px system-ui";ctx.textAlign="center";const heads=wrap(ctx,s.heading,900);heads.forEach((line,i)=>ctx.fillText(line,W/2,y+i*105));y+=heads.length*105+55;
 if(s.type==="code"){ctx.fillStyle="#07111fdd";rounded(ctx,65,y-55,950,Math.min(760,H-y-300),34);ctx.textAlign="left";ctx.font="500 48px ui-monospace,monospace";ctx.fillStyle="#e2e8f0";const code=String(s.content).split("\n").slice(0,12);code.forEach((line,i)=>{ctx.fillStyle=i%2?"#bae6fd":"#fef3c7";ctx.fillText(line||" ",110,y+30+i*65)})}
 else{ctx.textAlign="center";ctx.font=`${s.type==="question"||s.type==="answer"?"700":"550"} 55px system-ui`;const lines=wrap(ctx,s.content,880).slice(0,11);const lh=78;lines.forEach((line,i)=>ctx.fillText(line,W/2,y+i*lh))}
 ctx.restore();
 ctx.fillStyle="#061a2bdd";ctx.fillRect(0,H-190,W,190);ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="800 40px system-ui";ctx.fillText(state.teacherName||"Your Teacher",60,H-108);ctx.font="500 31px system-ui";ctx.fillStyle="#bae6fd";ctx.fillText(state.channelName||"",60,H-58);ctx.textAlign="right";ctx.fillStyle=state.accentColor;ctx.font="700 30px system-ui";ctx.fillText(state.website||"",W-60,H-70);
 if(state.logo){try{const logo=await imageFrom(state.logo);ctx.drawImage(logo,W-195,H-170,115,80)}catch(e){}}
}
let previewSeq=0;
async function drawPreview(progress=1){const seq=++previewSeq,ctx=$("preview").getContext("2d"),s=current();ctx.clearRect(0,0,W,H);if(!s){ctx.fillStyle="#075985";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="800 80px system-ui";ctx.fillText("Create your first slide",W/2,H/2);return}await paint(ctx,s,progress);if(seq!==previewSeq)return;$("slidePosition").textContent=`Slide ${state.current+1} of ${state.slides.length}`}
function updateDuration(){const t=state.slides.reduce((a,s)=>a+Number(s.duration||0),0);$("durationStatus").textContent=`${t} seconds`;$("durationWarning").hidden=t<=60}
function bindEditor(){
 ["heading","content","duration","transition","background","textColor","language","imageFit"].forEach(id=>$(id).addEventListener("input",()=>{const s=current();if(!s)return;s[id==="duration"?"duration":id]=id==="duration"?Math.max(1,Number($(id).value)):$(id).value;renderList();drawPreview();updateDuration();saveLocal()}));
}
async function fileData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function slug(v){return(v||"edushort").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,55)}
async function play(){
 if(!state.slides.length)return status("Add a slide first.");playing=!playing;const token=++playToken;$("playBtn").textContent=playing?"■ Stop":"▶ Preview";if(!playing)return;
 const audio=musicData?new Audio(musicData):null;if(audio){audio.loop=true;audio.volume=Number($("musicVolume").value);audio.play().catch(()=>{})}
 while(playing&&token===playToken){const s=current(),start=performance.now(),ms=s.duration*1000;while(playing&&performance.now()-start<ms){const p=Math.min(1,(performance.now()-start)/650);$("progress").value=Math.min(100,(performance.now()-start)/ms*100);await drawPreview(p);await new Promise(r=>setTimeout(r,33))}if(!playing)break;state.current=(state.current+1)%state.slides.length;renderList();loadEditor()}
 if(audio)audio.pause();playing=false;$("playBtn").textContent="▶ Preview";$("progress").value=0;drawPreview()
}
function status(t){$("status").textContent=t}
async function exportVideo(){
 if(!state.slides.length)return status("Add slides before exporting.");if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)return status("Video export is not supported in this browser.");
 const mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(MediaRecorder.isTypeSupported.bind(MediaRecorder));if(!mime)return status("No supported WebM recorder was found.");
 const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;const ctx=canvas.getContext("2d"),stream=canvas.captureStream(FPS);let audioCtx,source;
 if(musicData){audioCtx=new AudioContext();const dest=audioCtx.createMediaStreamDestination(),audio=new Audio(musicData);audio.loop=true;audio.volume=Number($("musicVolume").value);source=audioCtx.createMediaElementSource(audio);source.connect(dest);source.connect(audioCtx.destination);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));audio.play()}
 const rec=new MediaRecorder(stream,{mimeType:mime}),chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);rec.start(500);status("Rendering video… keep this tab active.");
 for(let i=0;i<state.slides.length;i++){const s=state.slides[i],frames=Math.round(s.duration*FPS);for(let f=0;f<frames;f++){await paint(ctx,s,Math.min(1,(f/FPS)/.65));status(`Rendering slide ${i+1}/${state.slides.length} — ${Math.round((i+f/frames)/state.slides.length*100)}%`);await new Promise(r=>setTimeout(r,1000/FPS))}}
 rec.stop();if(source)source.mediaElement.pause();if(audioCtx)audioCtx.close();await new Promise(r=>rec.onstop=r);download(new Blob(chunks,{type:mime}),`${slug(state.projectTitle)}.webm`);status("Video ready.")
}
document.querySelectorAll("#slideButtons button").forEach(b=>b.onclick=()=>{state.slides.push(makeSlide(b.dataset.type));state.current=state.slides.length-1;renderAll()});
$("useTemplateBtn").onclick=()=>{const key=$("templateSelect").value;if(!key)return status("Choose a lesson template.");if(state.slides.length&&!confirm("Replace the current slides with this template?"))return;state.slides=templates[key].map(x=>makeSlide(...x));state.current=0;renderAll();status("Template created.")};
$("prevBtn").onclick=()=>{if(state.slides.length){state.current=(state.current-1+state.slides.length)%state.slides.length;renderAll()}};
$("nextBtn").onclick=()=>{if(state.slides.length){state.current=(state.current+1)%state.slides.length;renderAll()}};
$("playBtn").onclick=play;$("upBtn").onclick=()=>{if(state.current>0){[state.slides[state.current-1],state.slides[state.current]]=[state.slides[state.current],state.slides[state.current-1]];state.current--;renderAll()}};
$("downBtn").onclick=()=>{if(state.current<state.slides.length-1){[state.slides[state.current+1],state.slides[state.current]]=[state.slides[state.current],state.slides[state.current+1]];state.current++;renderAll()}};
$("duplicateBtn").onclick=()=>{const s=current();if(s){state.slides.splice(state.current+1,0,{...structuredClone(s),id:crypto.randomUUID()});state.current++;renderAll()}};
$("deleteBtn").onclick=()=>{if(current()&&confirm("Delete this slide?")){state.slides.splice(state.current,1);state.current=Math.max(0,Math.min(state.current,state.slides.length-1));renderAll()}};
$("imageInput").onchange=async e=>{if(e.target.files[0]&&current()){current().image=await fileData(e.target.files[0]);drawPreview();saveLocal()}};
$("logoInput").onchange=async e=>{if(e.target.files[0]){state.logo=await fileData(e.target.files[0]);drawPreview();saveLocal()}};
$("musicInput").onchange=async e=>{if(e.target.files[0]){musicData=await fileData(e.target.files[0]);musicName=e.target.files[0].name;status(`Music selected: ${musicName}`)}};
$("musicVolume").oninput=()=>{$("musicVolumeOut").value=Math.round($("musicVolume").value*100)+"%"};
["projectTitle","subject","teacherName","channelName","website","brandColor","accentColor"].forEach(id=>$(id).oninput=()=>{readSetup();drawPreview();saveLocal()});
$("saveBtn").onclick=()=>{readSetup();download(new Blob([JSON.stringify({...state,musicData,musicName},null,2)],{type:"application/json"}),`${slug(state.projectTitle)}-project.json`);status("Portable project saved.")};
$("openInput").onchange=async e=>{try{const p=JSON.parse(await e.target.files[0].text());if(!Array.isArray(p.slides))throw Error();state={...structuredClone(defaults),...p};musicData=p.musicData||"";musicName=p.musicName||"";syncSetup();renderAll();status("Project opened.")}catch(err){status("This project file is invalid.")}e.target.value=""};
$("newBtn").onclick=()=>{if(confirm("Start a new project?")){state=structuredClone(defaults);musicData="";syncSetup();renderAll()}};
$("coverBtn").onclick=async()=>{if(!current())return status("Select a cover slide.");const c=document.createElement("canvas");c.width=W;c.height=H;await paint(c.getContext("2d"),current(),1);c.toBlob(b=>download(b,`${slug(state.projectTitle)}-cover.png`),"image/png")};
$("videoBtn").onclick=exportVideo;$("progress").oninput=()=>drawPreview(Number($("progress").value)/100);
bindEditor();
try{const saved=JSON.parse(localStorage.getItem(AUTOSAVE));if(saved&&Array.isArray(saved.slides))state={...structuredClone(defaults),...saved}}catch(e){}
syncSetup();renderAll();
