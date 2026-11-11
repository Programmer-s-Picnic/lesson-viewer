/* A Programmer's Picnic: page-wide code/output/error teaching theater.
   Display-only. Never executes Python; the existing editor owns execution. */
(()=>{
"use strict";
const codeEditor=document.getElementById("ppCode");
if(!codeEditor)return;
const overlay=document.createElement("section");
overlay.id="lwcTeachingPresentation";
overlay.className="lwc-presentation";
overlay.hidden=true;
overlay.setAttribute("role","dialog");
overlay.setAttribute("aria-labelledby","lwcPresentationTitle");
overlay.setAttribute("aria-modal","false"); // Floating teacher controls remain operable.
overlay.innerHTML=
  '<div class="lwc-presentation-card" id="lwcPresentationCard">'+
    '<header class="lwc-presentation-head">'+
      '<div class="lwc-presentation-brand"><span class="lwc-presentation-icon" aria-hidden="true">🎓</span>'+
        '<div><div class="lwc-presentation-eyebrow">A PROGRAMMER’S PICNIC · TEACHING VIEW</div>'+
        '<h2 id="lwcPresentationTitle">Python Program</h2></div></div>'+
      '<div class="lwc-presentation-tools">'+
        '<span class="lwc-presentation-status" id="lwcPresentationStatus" role="status" aria-live="polite">Ready</span>'+
        '<button type="button" id="lwcPresentationClose" class="lwc-presentation-close" aria-label="Close presentation">✕ Close</button>'+
      '</div>'+
    '</header>'+
    '<div class="lwc-presentation-progress" role="progressbar" aria-label="Teaching presentation progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="lwcPresentationProgress"><div id="lwcPresentationFill"></div></div>'+
    '<div class="lwc-presentation-viewport" id="lwcPresentationViewport" tabindex="0" aria-label="Scroll the full program, output or error text">'+
      '<div class="lwc-presentation-rows" id="lwcPresentationRows"></div>'+
    '</div>'+
    '<footer class="lwc-presentation-foot"><span id="lwcPresentationFoot">The complete content is shown here. Scroll or use the teacher controls.</span>'+
       '<span id="lwcPresentationCount"></span></footer>'+
  '</div>';
// Keep the presentation in the same stacking context as the floating teacher
// and toolbar, including the editor's own fixed-position fullscreen mode.
(document.getElementById("appShell")||document.body).appendChild(overlay);
const title=overlay.querySelector("#lwcPresentationTitle");
const status=overlay.querySelector("#lwcPresentationStatus");
const viewport=overlay.querySelector("#lwcPresentationViewport");
const rows=overlay.querySelector("#lwcPresentationRows");
const fill=overlay.querySelector("#lwcPresentationFill");
const progress=overlay.querySelector("#lwcPresentationProgress");
const foot=overlay.querySelector("#lwcPresentationFoot");
const count=overlay.querySelector("#lwcPresentationCount");
const closeButton=overlay.querySelector("#lwcPresentationClose");
const card=overlay.querySelector("#lwcPresentationCard");
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
const raf=cb=>requestAnimationFrame(cb);
const source={code:"",output:"",error:""};
const cache={code:null,output:null,error:null};
let active=false,mode="code",scanToken=0,rollToken=0;
let onClose=null,lastFocus=null,spoken=false;
function setProgress(v){
 const pct=Math.max(0,Math.min(100,Number(v)||0));
 fill.style.width=pct.toFixed(1)+"%";
 progress.setAttribute("aria-valuenow",String(Math.round(pct)));
}
function panelTitle(stage){
 return stage==="code"?"Python Program":stage==="output"?"Program Output":
        stage==="error"?"Errors & Traceback":"Running Python";
}
function makeRows(stage){
 const content=source[stage]||"";
 const lines=content.split(/\r?\n/);
 const fragment=document.createDocumentFragment();
 const start=document.createElement("div");
 start.className="lwc-presentation-spacer";
 start.setAttribute("aria-hidden","true");
 fragment.appendChild(start);
 const list=[];
 lines.forEach((text,i)=>{
   const row=document.createElement("div");
   row.className="lwc-presentation-row";
   row.dataset.line=String(i+1);
   const number=document.createElement("span");
   number.className="lwc-presentation-number";
   number.textContent=String(i+1);
   const contents=document.createElement("code");
   contents.className="lwc-presentation-text";
   contents.textContent=text;
   row.append(number,contents);
   fragment.appendChild(row);
   list.push(row);
 });
 const end=document.createElement("div");
 end.className="lwc-presentation-spacer";
 end.setAttribute("aria-hidden","true");
 fragment.appendChild(end);
 return {fragment,list};
}
function showStage(stage,{reset=true}={}){
 if(!active)return false;
 if(!["code","output","error","running"].includes(stage))return false;
 if(mode!==stage||reset){
   mode=stage;
   overlay.dataset.stage=stage;
   title.textContent=panelTitle(stage);
   setProgress(0);
   rows.replaceChildren();
   cache[stage]=makeRows(stage);
   rows.appendChild(cache[stage].fragment);
   count.textContent=(cache[stage].list.length)+" lines";
   if(reset)viewport.scrollTop=0;
 }
 return true;
}
function open(code=codeEditor.value,closeHandler=null){
 if(!active){
   lastFocus=document.activeElement;
   active=true;
   overlay.hidden=false;
   document.body.classList.add("lwc-presentation-active");
 }
 source.code=String(code);
 onClose=typeof closeHandler==="function"?closeHandler:null;
 spoken=false;
 showStage("code",{reset:true});
 setStatus("Ready");
 foot.textContent="The full Python program is presented above the editor.";
 closeButton.focus({preventScroll:true});
 return true;
}
function close(){
 if(!active)return;
 scanToken++;rollToken++;
 active=false;
 overlay.hidden=true;
 document.body.classList.remove("lwc-presentation-active");
 rows.replaceChildren();
 onClose?.();
 onClose=null;
 if(lastFocus&&typeof lastFocus.focus==="function")lastFocus.focus({preventScroll:true});
}
function setStatus(value){
 status.textContent=String(value).slice(0,100);
}
function scanCode(msPerLine=2000,onProgress){
 if(!active)return Promise.resolve(false);
 source.code=codeEditor.value;
 showStage("code",{reset:true});
 const token=++scanToken;
 ++rollToken;
 // Include spoken comments and instructions; skip empty spacer lines while
 // keeping original source line numbers intact for selection and scrolling.
 const codeLines=source.code.split(/\r?\n/)
   .map((value,index)=>({value,number:index+1}))
   .filter(item=>item.value.trim().length>0);
 if(!codeLines.length)codeLines.push({value:"",number:1});
 const secondsPerLine=Math.max(1,Number(msPerLine)||2000);
 const duration=codeLines.length*secondsPerLine;
 const started=performance.now();
 let currentIndex=0;
 setStatus("Line-by-line walkthrough");
 foot.textContent="Each Python code line is highlighted for two seconds before the next line.";
 // Highlight the first line immediately: every line, including the first,
 // receives the full two-second hold before execution advances.
 showLine("code",codeLines[0].number);
 setStatus("Code line "+codeLines[0].number+" · 1/"+codeLines.length);
 foot.textContent="Source line "+codeLines[0].number+" — highlighted for "+(secondsPerLine/1000)+" seconds.";
 if(typeof onProgress==="function")onProgress(1,codeLines.length,codeLines[0].number);
 return new Promise(resolve=>{
   function tick(now){
     if(!active||token!==scanToken){resolve(false);return;}
     const elapsed=Math.max(0,now-started);
     const index=Math.min(codeLines.length-1,Math.floor(elapsed/secondsPerLine));
     if(index!==currentIndex){
       currentIndex=index;
       const item=codeLines[index];
       showLine("code",item.number);
       setStatus("Code line "+item.number+" · "+(index+1)+"/"+codeLines.length);
       foot.textContent="Source line "+item.number+" — highlighted for "+(secondsPerLine/1000)+" seconds.";
       if(typeof onProgress==="function")
         onProgress(index+1,codeLines.length,item.number);
     }
     // Progress reflects elapsed hold time, including the last two-second hold.
     setProgress(Math.min(100,elapsed/duration*100));
     if(elapsed>=duration){
       setProgress(100);
       setStatus("Code walkthrough complete");
       resolve(true);
     }else raf(tick);
   }
   raf(tick);
 });
}
function running(){
 if(!active)return;
 ++rollToken;
 source.running="Python is executing. The output and errors will appear here when it finishes.";
 showStage("running",{reset:true});
 setStatus("Running");
 foot.textContent="Python is running in the existing editor. No duplicate execution.";
}
function fullResults(stdout,stderr){
 if(!active)return;
 source.output=String(stdout||"")||"(no printed output)";
 source.error=String(stderr||"")||"No errors reported.";
 spoken=false;
 showStage("output",{reset:true});
 setStatus("Output");
 foot.textContent="Complete stdout is shown. The teacher selects each line while reading.";
 // When the voice does not start, still sweep both complete panels automatically.
 fallbackScrollResults();
}
function autoScroll(stage,duration=6000){
 if(!active)return Promise.resolve(false);
 if(mode!==stage)showStage(stage,{reset:true});
 const token=++rollToken;
 const started=performance.now();
 const bottom=Math.max(0,viewport.scrollHeight-viewport.clientHeight);
 return new Promise(resolve=>{
   function frame(now){
     if(!active||token!==rollToken||spoken){resolve(false);return;}
     const p=Math.min(1,Math.max(0,(now-started)/duration));
     viewport.scrollTop=reduced.matches?(p===1?bottom:0):bottom*(p*p*(3-2*p));
     setProgress(p*100);
     if(p>=1){resolve(true);return;}
     raf(frame);
   }
   raf(frame);
 });
}
async function fallbackScrollResults(){
 const outputRows=source.output.split(/\r?\n/).length;
 const outputDuration=Math.min(12000,Math.max(4200,outputRows*220));
 if(!await autoScroll("output",outputDuration)||!active||spoken)return;
 showStage("error",{reset:true});
 setStatus("Errors");
 foot.textContent="Complete stderr and traceback are shown.";
 const errorRows=source.error.split(/\r?\n/).length;
 await autoScroll("error",Math.min(12000,Math.max(4200,errorRows*220)));
 if(!spoken&&active)setStatus("Results ready");
}
function showLine(stage,lineNumber){
 if(!active||!["code","output","error"].includes(stage))return false;
 if(mode!==stage)showStage(stage,{reset:true});
 rows.querySelectorAll(".lwc-presentation-row.active").forEach(el=>el.classList.remove("active"));
 const target=cache[stage]?.list?.[lineNumber-1];
 if(!target)return false;
 target.classList.add("active");
 setProgress(lineNumber/cache[stage].list.length*100);
 const paneRect=viewport.getBoundingClientRect(),rowRect=target.getBoundingClientRect();
 const desired=paneRect.top+viewport.clientHeight*.43;
 const next=viewport.scrollTop+(rowRect.top+rowRect.height*.5-desired);
 viewport.scrollTo({top:Math.max(0,next),behavior:reduced.matches?"auto":"smooth"});
 count.textContent="Line "+lineNumber+" / "+cache[stage].list.length;
 return true;
}
function scene(data){
 if(!active||!data)return;
 if(data.kind==="line"&&["code","output","error"].includes(data.mode)){
   spoken=true;
   ++rollToken;
   if(mode!==data.mode)showStage(data.mode,{reset:true});
   setStatus(data.mode==="code"?"Explaining code":data.mode==="output"?"Reading output":"Explaining errors");
   foot.textContent=String(data.caption||"").slice(0,240);
   const number=data.mode==="code"?data.sourceLine:data.resultLine;
   if(Number.isInteger(number)&&number>0)showLine(data.mode,number);
 }else if(data.kind==="finish"){
   setStatus("Reviewing complete results");
   foot.textContent="Narration finished. Now scrolling all remaining output and error text.";
   // The teacher may narrate a shortened sample of very long results.
   // A final full sweep guarantees every stdout/stderr line crosses the stage.
   spoken=false;
   if(source.output||source.error)fallbackScrollResults();
 }else if(data.kind==="error"||data.kind==="state"&&data.state==="error"){
   setStatus("Voice not available");
   foot.textContent="Read the visible output and errors, or open Voice controls to speak manually.";
 }
}
function isActive(){return active;}
function currentTarget(){
 return active?card:null;
}
closeButton.addEventListener("click",close);
overlay.addEventListener("keydown",event=>{
 if(event.key==="Escape"){event.preventDefault();close();}
});
window.addEventListener("keydown",event=>{
 if(active&&event.key==="Escape"){event.preventDefault();close();}
});
window.LWCTeachingPresentation={open,close,scanCode,running,fullResults,showStage,showLine,scene,
 setStatus,isActive,currentTarget,debug:()=>({active,mode,lines:cache[mode]?.list?.length||0,scroll:viewport.scrollTop,progress:progress.getAttribute("aria-valuenow")})};
})();