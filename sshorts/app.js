"use strict";
const $=id=>document.getElementById(id);
const W=1080,H=1920,FPS=30,AUTOSAVE="edushorts-maker-v1";
const defaults={projectTitle:"Python in 30 Seconds",subject:"Python",teacherName:"Champak Roy",channelName:"Learn With Champak",website:"learnwithchampak.live",brandColor:"#075985",accentColor:"#f59e0b",logo:"",slides:[],current:0};
let state=structuredClone(defaults),playing=false,playToken=0,musicData="",musicName="",speechWord=-1,spokenUtterance=null,recording=null,narrationPlayer=null;
const typeNames={hook:"Hook",explanation:"Explanation",spoken:"Spoken Text",code:"Code",question:"Question",answer:"Answer",image:"Image",cta:"Call to action"};
const palettes={hook:["#7c2d12","#f59e0b"],explanation:["#075985","#0ea5e9"],spoken:["#0f4c5c","#0e7490"],code:["#111827","#1e293b"],question:["#4c1d95","#7c3aed"],answer:["#065f46","#10b981"],image:["#0f172a","#334155"],cta:["#9a3412","#ea580c"]};
const templates={
 concept:[["hook","Did you know?","Start with a surprising question."],["explanation","The idea","Explain one concept in one clear sentence."],["explanation","Simple example","Show how the concept works."],["answer","Remember","State the key takeaway."],["cta","Keep learning","Follow Learn With Champak for more."]],
 coding:[["hook","Can you solve this?","A quick coding challenge."],["code","Try this code","print('Hello, learner!')"],["answer","Output","Hello, learner!"],["explanation","Why it works","Explain the important line."],["question","Your challenge","How would you change the output?"],["cta","Practise now","Write and run the program yourself."]],
 mcq:[["question","Quick question","Which answer is correct?\nA. First option\nB. Second option\nC. Third option"],["explanation","Think…","You have three seconds."],["answer","Correct answer","B. Second option\nAdd a one-line explanation."],["cta","How did you do?","Comment your answer and follow for more."]],
 dsa:[["hook","DSA challenge","Can you solve this efficiently?"],["question","Problem","Describe the input and required output."],["explanation","Step 1","Show the first logical step."],["explanation","Step 2","Show the next logical step."],["code","Solution","def solve(data):\n    return data"],["answer","Complexity","Time: O(n)\nSpace: O(1)"],["cta","Your turn","Try another input yourself."]]
};
function makeSlide(type,heading="",content=""){
 const [bg]=palettes[type]||palettes.explanation;
 const slideContent=content||suggestion(type);
 return{id:crypto.randomUUID(),type,heading:heading||typeNames[type],content:slideContent,duration:type==="hook"?3:Number($("defaultDuration").value||4),transition:"fade",background:bg,textColor:"#ffffff",language:"python",image:"",imageFit:"contain",speechVoice:"",speechRate:1,narrationText:slideContent,narrationAudio:"",narrationName:"",narrationDuration:0};
}
function suggestion(t){return{hook:"Can you answer this in 30 seconds?",explanation:"Explain one idea clearly.",spoken:"Python is a simple and powerful programming language.",code:"print('Hello, World!')",question:"What do you think the answer is?",answer:"Here is the correct answer.",image:"Add an image and explain it.",cta:"Follow Learn With Champak for more lessons."}[t]}
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
 $("speechVoice").value=s.speechVoice||"";$("speechRate").value=s.speechRate||1;$("speechRateOut").value=`${Number(s.speechRate||1).toFixed(1).replace(".0","")}×`;
 $("narrationText").value=s.narrationText??s.content??"";
 $("narrationStatus").textContent=s.narrationAudio?`Audio ready: ${s.narrationName||"slide narration"}${s.narrationDuration?` (${s.narrationDuration.toFixed(1)}s)`:""}`:"No narration recorded. Recording works best from localhost or HTTPS.";
 $("codeFields").hidden=s.type!=="code";$("imageFields").hidden=s.type!=="image";$("speechFields").hidden=s.type!=="spoken";
}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function wrap(ctx,text,maxWidth){
 const paras=String(text||"").split("\n"),lines=[];
 for(const p of paras){if(!p){lines.push("");continue}let line="";for(const word of p.split(/\s+/)){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}lines.push(line)}
 return lines;
}
async function imageFrom(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src})}
function drawContainedImage(ctx,image,x,y,boxWidth,boxHeight){
 const ratio=Math.min(boxWidth/image.naturalWidth,boxHeight/image.naturalHeight);
 const width=image.naturalWidth*ratio,height=image.naturalHeight*ratio;
 ctx.drawImage(image,x+(boxWidth-width)/2,y+(boxHeight-height)/2,width,height);
}
function fitCode(ctx,content,maxWidth,maxHeight){
 const raw=String(content||"").replace(/\t/g,"    ").split("\n");
 const fontSize=48,lineHeight=66.24;
 ctx.font="500 48px ui-monospace, SFMono-Regular, Consolas, monospace";
 const fitted=[];
 raw.forEach(line=>{
  if(!line){fitted.push("");return}
  let rest=line;
  while(rest){
   let take=rest.length;
   while(take>1&&ctx.measureText(rest.slice(0,take)).width>maxWidth)take--;
   fitted.push(rest.slice(0,take));
   rest=rest.slice(take);
  }
 });
 return{lines:fitted,fontSize,lineHeight};
}
function speechWords(text){return String(text||"").trim().split(/\s+/).filter(Boolean)}
function speechWordFromChar(text,charIndex){const before=String(text||"").slice(0,charIndex).trim();return before?before.split(/\s+/).length:0}
function drawSpokenText(ctx,text,y,activeWord){
 const words=speechWords(text),maxWidth=850,lineHeight=82;
 ctx.font="650 55px system-ui";ctx.textAlign="left";ctx.textBaseline="alphabetic";
 const lines=[];let line=[];
 words.forEach((word,index)=>{const candidate=[...line,{word,index}];if(line.length&&ctx.measureText(candidate.map(x=>x.word).join(" ")).width>maxWidth){lines.push(line);line=[{word,index}]}else line=candidate});
 if(line.length)lines.push(line);
 const space=ctx.measureText(" ").width;
 lines.slice(0,11).forEach((items,row)=>{
  const lineWidth=items.reduce((sum,item)=>sum+ctx.measureText(item.word).width,0)+space*Math.max(0,items.length-1);let x=(W-lineWidth)/2;
  items.forEach(item=>{const width=ctx.measureText(item.word).width;if(item.index===activeWord){ctx.fillStyle=state.accentColor||"#f59e0b";ctx.beginPath();ctx.roundRect(x-10,y+row*lineHeight-58,width+20,72,12);ctx.fill();ctx.fillStyle="#082f49"}else ctx.fillStyle="#ffffff";ctx.fillText(item.word,x,y+row*lineHeight);x+=width+space});
 });
}
function drawNarrationCaption(ctx,text,activeWord){
 const words=speechWords(text);if(!words.length)return;
 ctx.save();ctx.font="700 38px system-ui";ctx.textAlign="left";ctx.textBaseline="alphabetic";
 const start=Math.max(0,activeWord-5),shown=words.slice(start,start+11),space=ctx.measureText(" ").width;
 const widths=shown.map(w=>ctx.measureText(w).width),total=widths.reduce((a,b)=>a+b,0)+space*Math.max(0,shown.length-1);
 const x0=Math.max(55,(W-total)/2),y=H-245;ctx.fillStyle="#031827e8";ctx.beginPath();ctx.roundRect(35,y-60,W-70,86,20);ctx.fill();
 let x=x0;shown.forEach((word,i)=>{const index=start+i,w=widths[i];if(index===activeWord){ctx.fillStyle=state.accentColor||"#f59e0b";ctx.beginPath();ctx.roundRect(x-6,y-43,w+12,54,9);ctx.fill();ctx.fillStyle="#082f49"}else ctx.fillStyle="#fff";ctx.fillText(word,x,y);x+=w+space});ctx.restore();
}
async function paint(ctx,s,progress=1){
 const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,s.background);grad.addColorStop(1,state.brandColor||"#075985");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 const entrance=Math.min(1,progress/.18);
 ctx.save();if(s.transition==="fade")ctx.globalAlpha=Math.max(.02,entrance);if(s.transition==="zoom"){const z=.88+.12*entrance;ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-W/2,-H/2)}if(s.transition==="slide")ctx.translate((1-entrance)*W,0);
 if(s.type==="image"&&s.image){try{const im=await imageFrom(s.image),ir=im.width/im.height,cr=W/(H-360);let dw,dh;if((s.imageFit==="cover"&&ir>cr)||(s.imageFit!=="cover"&&ir<cr)){dh=H-360;dw=dh*ir}else{dw=W;dh=dw/ir}ctx.drawImage(im,(W-dw)/2,170+(H-360-dh)/2,dw,dh)}catch(e){}}
 ctx.fillStyle="#ffffff22";ctx.beginPath();ctx.arc(900,190,220,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(80,1720,270,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=state.accentColor||"#f59e0b";ctx.fillRect(70,105,150,14);
 ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillStyle=s.textColor;ctx.font="800 46px system-ui";ctx.fillText((state.subject||"LESSON").toUpperCase(),70,185);
 let y=s.type==="image"?1320:500;ctx.font="900 90px system-ui";ctx.textAlign="center";const heads=wrap(ctx,s.heading,900);heads.forEach((line,i)=>ctx.fillText(line,W/2,y+i*105));y+=heads.length*105+55;
 if(s.type==="code"){const boxHeight=Math.max(220,Math.min(900,H-y-250));ctx.fillStyle="#07111fdd";rounded(ctx,65,y-55,950,boxHeight,34);ctx.textAlign="left";const viewHeight=boxHeight-90,code=fitCode(ctx,s.content,860,viewHeight);ctx.font=`500 ${code.fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;const totalHeight=code.lines.length*code.lineHeight,overflow=Math.max(0,totalHeight-viewHeight),scrollProgress=Math.max(0,Math.min(1,(progress-.12)/.78)),smooth=scrollProgress*scrollProgress*(3-2*scrollProgress),slideUp=(1-entrance)*90,offset=overflow*smooth;ctx.save();ctx.beginPath();ctx.rect(95,y-25,890,boxHeight-40);ctx.clip();code.lines.forEach((line,i)=>{ctx.fillStyle=i%2?"#bae6fd":"#fef3c7";ctx.fillText(line||" ",110,y+30+slideUp-offset+i*code.lineHeight)});ctx.restore()}
 else if(s.type==="spoken"){const words=speechWords(s.content),timed=Math.min(words.length-1,Math.floor(Math.max(0,progress)*words.length));drawSpokenText(ctx,s.content,y,speechWord>=0?speechWord:timed)}
 else{ctx.textAlign="center";ctx.font=`${s.type==="question"||s.type==="answer"?"700":"550"} 55px system-ui`;const lines=wrap(ctx,s.content,880).slice(0,11);const lh=78;lines.forEach((line,i)=>ctx.fillText(line,W/2,y+i*lh))}
 ctx.restore();
 if(s.narrationAudio&&s.type!=="spoken"){const words=speechWords(s.narrationText||s.content),active=Math.min(words.length-1,Math.floor(Math.max(0,progress)*words.length));drawNarrationCaption(ctx,s.narrationText||s.content,active)}
 ctx.fillStyle="#061a2bdd";ctx.fillRect(0,H-190,W,190);ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="800 40px system-ui";ctx.fillText(state.teacherName||"Your Teacher",60,H-108);ctx.font="500 31px system-ui";ctx.fillStyle="#bae6fd";ctx.fillText(state.channelName||"",60,H-58);ctx.textAlign="right";ctx.fillStyle=state.accentColor;ctx.font="700 30px system-ui";ctx.fillText(state.website||"",W-60,H-70);
 if(state.logo){try{const logo=await imageFrom(state.logo);ctx.save();ctx.fillStyle="#ffffffee";rounded(ctx,W-245,70,175,125,20);drawContainedImage(ctx,logo,W-230,82,145,100);ctx.restore()}catch(e){}}
}
let previewSeq=0;
async function drawPreview(progress=1){const seq=++previewSeq,ctx=$("preview").getContext("2d"),s=current();ctx.clearRect(0,0,W,H);if(!s){ctx.fillStyle="#075985";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="800 80px system-ui";ctx.fillText("Create your first slide",W/2,H/2);return}await paint(ctx,s,progress);if(seq!==previewSeq)return;$("slidePosition").textContent=`Slide ${state.current+1} of ${state.slides.length}`}
function updateDuration(){const t=state.slides.reduce((a,s)=>a+Number(s.duration||0),0);$("durationStatus").textContent=`${t} seconds`;$("durationWarning").hidden=t<=60}
function bindEditor(){
 ["heading","content","duration","transition","background","textColor","language","imageFit","speechVoice","speechRate","narrationText"].forEach(id=>$(id).addEventListener("input",()=>{const s=current();if(!s)return;s[id==="duration"?"duration":id]=id==="duration"?Math.max(1,Number($(id).value)):id==="speechRate"?Number($(id).value):$(id).value;if(id==="speechRate")$("speechRateOut").value=`${Number($(id).value).toFixed(1).replace(".0","")}×`;renderList();drawPreview();updateDuration();saveLocal()}));
}
async function fileData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function slug(v){return(v||"edushort").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,55)}
async function play(){
 if(!state.slides.length)return status("Add a slide first.");playing=!playing;const token=++playToken;$("playBtn").textContent=playing?"■ Stop":"▶ Preview";if(!playing){stopSpeech();stopNarration();return}
 const audio=musicData?new Audio(musicData):null;if(audio){audio.loop=true;audio.volume=Number($("musicVolume").value);audio.play().catch(()=>{})}
 while(playing&&token===playToken){const s=current();if(s.narrationAudio)playRecordedNarration(s);else if(s.type==="spoken")speakSlide(s);const start=performance.now(),ms=s.duration*1000;while(playing&&performance.now()-start<ms){const p=Math.min(1,(performance.now()-start)/ms);$("progress").value=p*100;await drawPreview(p);await new Promise(r=>setTimeout(r,33))}stopSpeech();stopNarration();if(!playing)break;state.current=(state.current+1)%state.slides.length;renderList();loadEditor()}
 if(audio)audio.pause();stopSpeech();stopNarration();playing=false;$("playBtn").textContent="▶ Preview";$("progress").value=0;drawPreview()
}
function stopNarration(){if(narrationPlayer){narrationPlayer.pause();narrationPlayer=null}}
function playRecordedNarration(s=current()){stopNarration();if(!s?.narrationAudio)return;narrationPlayer=new Audio(s.narrationAudio);narrationPlayer.play().catch(()=>status("Narration playback was blocked. Press Preview again."))}
async function audioDuration(data){return new Promise((resolve,reject)=>{const a=new Audio(data);a.onloadedmetadata=()=>resolve(Number.isFinite(a.duration)?a.duration:0);a.onerror=reject})}
async function attachNarration(data,name){
 const s=current();if(!s)return;try{s.narrationAudio=data;s.narrationName=name||"recorded narration";s.narrationDuration=await audioDuration(data);s.duration=Math.max(Number(s.duration||1),Math.ceil(s.narrationDuration+.35));loadEditor();updateDuration();saveLocal();drawPreview();status(`Narration attached to slide ${state.current+1} and will be included in export.`)}catch(e){status("This audio file could not be read by the browser.")}
}
function stopSpeech(){if("speechSynthesis" in window)window.speechSynthesis.cancel();spokenUtterance=null;speechWord=-1}
function speakSlide(s=current()){
 if(!s||s.type!=="spoken"||!("speechSynthesis" in window))return status("Speech synthesis is not available in this browser.");
 stopSpeech();const utterance=new SpeechSynthesisUtterance(s.content||"");spokenUtterance=utterance;utterance.rate=Number(s.speechRate||1);
 const voice=speechSynthesis.getVoices().find(v=>v.name===s.speechVoice);if(voice)utterance.voice=voice;
 utterance.onboundary=e=>{if(e.name==="word"){speechWord=speechWordFromChar(s.content,e.charIndex);drawPreview(Number($("progress").value)/100)}};
 utterance.onend=()=>{speechWord=-1;spokenUtterance=null};speechSynthesis.speak(utterance);
}
function loadVoices(){
 const selected=current()?.speechVoice||$("speechVoice").value,voices=speechSynthesis.getVoices();
 $("speechVoice").innerHTML='<option value="">Browser default</option>'+voices.map(v=>`<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)} (${escapeHtml(v.lang)})</option>`).join("");
 $("speechVoice").value=selected;
}
function status(t){$("status").textContent=t}
async function exportVideo(){
 stopSpeech();if(!state.slides.length)return status("Add slides before exporting.");if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)return status("Video export is not supported in this browser.");
 const mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(MediaRecorder.isTypeSupported.bind(MediaRecorder));if(!mime)return status("No supported WebM recorder was found.");
 const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;const ctx=canvas.getContext("2d"),stream=canvas.captureStream(FPS);let audioCtx,dest,musicAudio;
 const hasAudio=!!musicData||state.slides.some(s=>s.narrationAudio);
 if(hasAudio){audioCtx=new AudioContext();await audioCtx.resume();dest=audioCtx.createMediaStreamDestination();dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));if(musicData){musicAudio=new Audio(musicData);musicAudio.loop=true;musicAudio.volume=Number($("musicVolume").value);const musicSource=audioCtx.createMediaElementSource(musicAudio);musicSource.connect(dest);musicSource.connect(audioCtx.destination);await musicAudio.play()}}
 const rec=new MediaRecorder(stream,{mimeType:mime}),chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);rec.start(500);status("Rendering video… keep this tab active.");
 for(let i=0;i<state.slides.length;i++){const s=state.slides[i],frames=Math.round(s.duration*FPS);let slideAudio;if(s.narrationAudio&&audioCtx){slideAudio=new Audio(s.narrationAudio);const slideSource=audioCtx.createMediaElementSource(slideAudio);slideSource.connect(dest);slideSource.connect(audioCtx.destination);await slideAudio.play()}for(let f=0;f<frames;f++){await paint(ctx,s,frames>1?f/(frames-1):1);status(`Rendering slide ${i+1}/${state.slides.length} — ${Math.round((i+f/frames)/state.slides.length*100)}%`);await new Promise(r=>setTimeout(r,1000/FPS))}if(slideAudio)slideAudio.pause()}
 rec.stop();if(musicAudio)musicAudio.pause();await new Promise(r=>rec.onstop=r);if(audioCtx)await audioCtx.close();download(new Blob(chunks,{type:mime}),`${slug(state.projectTitle)}.webm`);status("Video ready with recorded narration.")
}
document.querySelectorAll("#slideButtons button").forEach(b=>b.onclick=()=>{state.slides.push(makeSlide(b.dataset.type));state.current=state.slides.length-1;renderAll()});
$("useTemplateBtn").onclick=()=>{const key=$("templateSelect").value;if(!key)return status("Choose a lesson template.");if(state.slides.length&&!confirm("Replace the current slides with this template?"))return;state.slides=templates[key].map(x=>makeSlide(...x));state.current=0;renderAll();status("Template created.")};
$("prevBtn").onclick=()=>{stopSpeech();if(state.slides.length){state.current=(state.current-1+state.slides.length)%state.slides.length;renderAll()}};
$("nextBtn").onclick=()=>{stopSpeech();if(state.slides.length){state.current=(state.current+1)%state.slides.length;renderAll()}};
$("playBtn").onclick=play;$("upBtn").onclick=()=>{if(state.current>0){[state.slides[state.current-1],state.slides[state.current]]=[state.slides[state.current],state.slides[state.current-1]];state.current--;renderAll()}};
$("downBtn").onclick=()=>{if(state.current<state.slides.length-1){[state.slides[state.current+1],state.slides[state.current]]=[state.slides[state.current],state.slides[state.current+1]];state.current++;renderAll()}};
$("duplicateBtn").onclick=()=>{const s=current();if(s){state.slides.splice(state.current+1,0,{...structuredClone(s),id:crypto.randomUUID()});state.current++;renderAll()}};
$("deleteBtn").onclick=()=>{if(current()&&confirm("Delete this slide?")){state.slides.splice(state.current,1);state.current=Math.max(0,Math.min(state.current,state.slides.length-1));renderAll()}};
$("imageInput").onchange=async e=>{if(e.target.files[0]&&current()){current().image=await fileData(e.target.files[0]);drawPreview();saveLocal()}};
$("logoInput").onchange=async e=>{if(e.target.files[0]){try{state.logo=await fileData(e.target.files[0]);await imageFrom(state.logo);await drawPreview();saveLocal();status(`Logo added: ${e.target.files[0].name}`)}catch(err){state.logo="";status("That logo image could not be read. Please choose PNG, JPG, WebP or GIF.")}}};
$("musicInput").onchange=async e=>{if(e.target.files[0]){musicData=await fileData(e.target.files[0]);musicName=e.target.files[0].name;status(`Music selected: ${musicName}`)}};
$("musicVolume").oninput=()=>{$("musicVolumeOut").value=Math.round($("musicVolume").value*100)+"%"};
$("narrationInput").onchange=async e=>{if(e.target.files[0])await attachNarration(await fileData(e.target.files[0]),e.target.files[0].name);e.target.value=""};
$("playNarrationBtn").onclick=()=>{const s=current();if(!s?.narrationAudio)return status("Record or upload narration first.");playRecordedNarration(s)};
$("removeNarrationBtn").onclick=()=>{const s=current();if(!s)return;stopNarration();s.narrationAudio="";s.narrationName="";s.narrationDuration=0;loadEditor();saveLocal();drawPreview();status("Narration removed from this slide.")};
$("recordNarrationBtn").onclick=async()=>{
 const button=$("recordNarrationBtn");
 if(recording){recording.recorder.stop();return}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return status("Microphone recording is unavailable. Open the app through localhost/HTTPS or upload an audio file.");
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true}),mime=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus"].find(x=>MediaRecorder.isTypeSupported(x))||"",recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined),chunks=[];
  recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  recorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"}),data=await fileData(new File([blob],"recorded-narration.webm",{type:blob.type}));recording=null;button.classList.remove("recording");button.textContent="● Start recording";await attachNarration(data,"recorded narration")};
  recording={recorder,stream};button.classList.add("recording");button.textContent="■ Stop recording";recorder.start();status("Recording… speak the narration text, then press Stop recording.");
 }catch(e){status("Microphone permission was not granted. You can upload a recorded audio file instead.")}
};
$("testSpeechBtn").onclick=()=>speakSlide();if("speechSynthesis" in window){loadVoices();speechSynthesis.onvoiceschanged=loadVoices}
["projectTitle","subject","teacherName","channelName","website","brandColor","accentColor"].forEach(id=>$(id).oninput=()=>{readSetup();drawPreview();saveLocal()});
$("saveBtn").onclick=()=>{readSetup();download(new Blob([JSON.stringify({...state,musicData,musicName},null,2)],{type:"application/json"}),`${slug(state.projectTitle)}-project.json`);status("Portable project saved.")};
$("openInput").onchange=async e=>{try{const p=JSON.parse(await e.target.files[0].text());if(!Array.isArray(p.slides))throw Error();state={...structuredClone(defaults),...p};musicData=p.musicData||"";musicName=p.musicName||"";syncSetup();renderAll();status("Project opened.")}catch(err){status("This project file is invalid.")}e.target.value=""};
$("newBtn").onclick=()=>{if(confirm("Start a new project?")){stopSpeech();state=structuredClone(defaults);musicData="";syncSetup();renderAll()}};
$("coverBtn").onclick=async()=>{if(!current())return status("Select a cover slide.");const c=document.createElement("canvas");c.width=W;c.height=H;await paint(c.getContext("2d"),current(),1);c.toBlob(b=>download(b,`${slug(state.projectTitle)}-cover.png`),"image/png")};
$("videoBtn").onclick=exportVideo;$("progress").oninput=()=>drawPreview(Number($("progress").value)/100);
bindEditor();
try{const saved=JSON.parse(localStorage.getItem(AUTOSAVE));if(saved&&Array.isArray(saved.slides))state={...structuredClone(defaults),...saved}}catch(e){}
syncSetup();renderAll();
