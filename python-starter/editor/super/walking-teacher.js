/* Walking cartoon teacher overlay. Receives trusted speech events via speaker-integration.js.
 * Original layered SVG, never edits or runs Python code.
 */
(()=>{
"use strict";
const safe=(value,min,max)=>Math.max(min,Math.min(max,value));
const root=document.getElementById("appShell")||document.body;
const overlay=document.createElement("div");
overlay.id="lwcRoamingActor";
overlay.className="lwc-roaming-actor";
overlay.hidden=true;
overlay.setAttribute("aria-hidden","true");
overlay.innerHTML="<svg id=\"lwcRoamingRig\" class=\"lwc-roaming-rig\" viewBox=\"120 0 360 590\" role=\"img\" aria-label=\"A smiling original cartoon teacher in a blue blazer, glasses and yellow tie, standing and gesturing\">\n            <defs>\n              <linearGradient id=\"jacket\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#377fc4\"/><stop offset=\"1\" stop-color=\"#125b9e\"/></linearGradient>\n              <linearGradient id=\"trousers\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#294a70\"/><stop offset=\"1\" stop-color=\"#203957\"/></linearGradient>\n              <filter id=\"shadow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"7\"/></filter>\n            </defs>\n            <ellipse cx=\"300\" cy=\"562\" rx=\"136\" ry=\"13\" fill=\"#3970a4\" opacity=\".15\" filter=\"url(#shadow)\"/>\n            <!-- Separate legs and feet make a complete, extensible body rig. -->\n            <g id=\"body-rig\">\n              <g id=\"left-leg\" class=\"limb\" style=\"transform-origin:274px 386px\">\n                <path d=\"M265 373 Q255 436 261 526\" stroke=\"url(#trousers)\" stroke-width=\"39\" stroke-linecap=\"round\" fill=\"none\"/>\n                <path d=\"M247 528 Q240 547 231 554 Q231 561 244 563 L287 563 Q296 558 289 548 L277 526Z\" fill=\"#25324a\"/>\n                <path d=\"M236 555 L289 555\" stroke=\"#405979\" stroke-width=\"3\"/>\n              </g>\n              <g id=\"right-leg\" class=\"limb\" style=\"transform-origin:326px 386px\">\n                <path d=\"M333 373 Q342 432 338 526\" stroke=\"url(#trousers)\" stroke-width=\"39\" stroke-linecap=\"round\" fill=\"none\"/>\n                <path d=\"M325 527 Q316 548 314 554 Q314 563 329 563 L372 563 Q381 556 371 546 L353 527Z\" fill=\"#25324a\"/>\n                <path d=\"M316 556 L374 556\" stroke=\"#405979\" stroke-width=\"3\"/>\n              </g>\n              <!-- Arms rotate around shoulders; forearms around elbows. -->\n              <g id=\"left-arm\" class=\"limb\" style=\"transform-origin:230px 257px\">\n                <path d=\"M230 255 Q207 263 198 324\" stroke=\"#1d67aa\" stroke-width=\"38\" fill=\"none\" stroke-linecap=\"round\"/>\n                <g id=\"left-forearm\" class=\"limb\" style=\"transform-origin:198px 324px\">\n                  <path d=\"M198 323 Q183 347 167 405\" stroke=\"#226eae\" stroke-width=\"32\" fill=\"none\" stroke-linecap=\"round\"/>\n                  <path d=\"M173 390 L160 414\" stroke=\"#e8f3ff\" stroke-width=\"13\" stroke-linecap=\"round\"/>\n                  <ellipse cx=\"158\" cy=\"425\" rx=\"18\" ry=\"22\" transform=\"rotate(20 158 425)\" fill=\"#d99570\"/>\n                  <path d=\"M149 414 Q139 400 132 404 Q128 411 146 429\" stroke=\"#d99570\" stroke-width=\"11\" stroke-linecap=\"round\" fill=\"none\"/>\n                </g>\n              </g>\n              <g id=\"right-arm\" class=\"limb\" style=\"transform-origin:370px 257px\">\n                <path d=\"M370 255 Q394 263 404 324\" stroke=\"#155e9e\" stroke-width=\"38\" fill=\"none\" stroke-linecap=\"round\"/>\n                <g id=\"right-forearm\" class=\"limb\" style=\"transform-origin:404px 324px\">\n                  <path d=\"M404 323 Q420 348 434 404\" stroke=\"#2369a8\" stroke-width=\"32\" fill=\"none\" stroke-linecap=\"round\"/>\n                  <path d=\"M430 390 L438 414\" stroke=\"#eaf4ff\" stroke-width=\"13\" stroke-linecap=\"round\"/>\n                  <ellipse cx=\"442\" cy=\"426\" rx=\"18\" ry=\"22\" transform=\"rotate(-20 442 426)\" fill=\"#e5a37c\"/>\n                  <path d=\"M448 415 Q461 398 468 406 Q471 414 453 431\" stroke=\"#e5a37c\" stroke-width=\"11\" stroke-linecap=\"round\" fill=\"none\"/>\n                </g>\n              </g>\n              <g id=\"torso-rig\">\n                <path d=\"M255 232 Q242 226 229 251 L229 370 Q240 404 300 408 Q360 404 371 370 L371 251 Q359 229 345 232Z\" fill=\"url(#jacket)\" stroke=\"#155b99\" stroke-width=\"3\"/>\n                <path d=\"M267 237 L300 292 L334 237 L321 379 L280 379Z\" fill=\"#f5f9fe\"/>\n                <path d=\"M283 253 L301 269 L319 252 L306 294 L294 294Z\" fill=\"#fefefe\"/>\n                <path d=\"M294 277 L306 277 L310 298 L302 356 L291 298Z\" fill=\"#eeb54f\"/>\n                <path d=\"M287 239 L300 289 L267 326 L246 241Z\" fill=\"#2d78b9\"/>\n                <path d=\"M313 239 L300 289 L333 326 L354 241Z\" fill=\"#246fb1\"/>\n                <path d=\"M256 343 Q274 349 291 344\" stroke=\"#72b1e4\" stroke-width=\"3\" fill=\"none\" opacity=\".6\"/>\n                <path d=\"M341 343 Q325 349 309 344\" stroke=\"#72b1e4\" stroke-width=\"3\" fill=\"none\" opacity=\".6\"/>\n                <circle cx=\"315\" cy=\"342\" r=\"3\" fill=\"#bad3e7\"/><circle cx=\"315\" cy=\"364\" r=\"3\" fill=\"#bad3e7\"/>\n                <path d=\"M340 341 L360 341 L357 349 L340 349Z\" fill=\"#f6d484\"/>\n                <path d=\"M282 218 L282 241 Q300 257 318 241 L318 218\" fill=\"#dc9a75\"/>\n              </g>\n              <g id=\"head-rig\" class=\"limb\" style=\"transform-origin:300px 231px\">\n                <ellipse cx=\"300\" cy=\"143\" rx=\"82\" ry=\"96\" fill=\"#e6a982\"/>\n                <ellipse cx=\"220\" cy=\"158\" rx=\"12\" ry=\"19\" fill=\"#d99a75\"/><ellipse cx=\"380\" cy=\"158\" rx=\"12\" ry=\"19\" fill=\"#d99a75\"/>\n                <path d=\"M218 131 Q207 67 251 51 Q269 16 315 34 Q354 28 375 68 Q392 90 380 130 L365 100 Q331 113 305 93 Q264 112 235 102Z\" fill=\"#2f354a\"/>\n                <path d=\"M236 91 Q268 63 299 87 Q330 56 354 81\" stroke=\"#45506b\" stroke-width=\"8\" opacity=\".45\" fill=\"none\" stroke-linecap=\"round\"/>\n                <g id=\"left-brow\" class=\"limb\" style=\"transform-origin:269px 122px\"><path d=\"M248 121 Q270 109 284 119\" stroke=\"#353643\" stroke-width=\"6\" fill=\"none\" stroke-linecap=\"round\"/></g>\n                <g id=\"right-brow\" class=\"limb\" style=\"transform-origin:330px 122px\"><path d=\"M315 119 Q334 108 353 121\" stroke=\"#353643\" stroke-width=\"6\" fill=\"none\" stroke-linecap=\"round\"/></g>\n                <g id=\"left-eye\" class=\"eye\" style=\"transform-origin:269px 145px\"><ellipse cx=\"269\" cy=\"146\" rx=\"16\" ry=\"17\" fill=\"#fff\"/><ellipse id=\"left-pupil\" cx=\"271\" cy=\"147\" rx=\"8\" ry=\"11\" fill=\"#34465c\"/><circle cx=\"274\" cy=\"143\" r=\"3\" fill=\"#fff\"/></g>\n                <g id=\"right-eye\" class=\"eye\" style=\"transform-origin:333px 145px\"><ellipse cx=\"333\" cy=\"146\" rx=\"16\" ry=\"17\" fill=\"#fff\"/><ellipse id=\"right-pupil\" cx=\"331\" cy=\"147\" rx=\"8\" ry=\"11\" fill=\"#34465c\"/><circle cx=\"334\" cy=\"143\" r=\"3\" fill=\"#fff\"/></g>\n                <path d=\"M300 144 Q294 167 300 170 Q304 174 311 168\" stroke=\"#be795d\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/>\n                <ellipse id=\"cheek-left\" cx=\"247\" cy=\"176\" rx=\"15\" ry=\"7\" fill=\"#d66f70\" opacity=\".1\"/><ellipse id=\"cheek-right\" cx=\"354\" cy=\"176\" rx=\"15\" ry=\"7\" fill=\"#d66f70\" opacity=\".1\"/>\n                <g id=\"mouth-group\">\n                  <path id=\"mouth-line\" d=\"M278 189 Q302 211 325 189\" stroke=\"#874e4a\" stroke-width=\"5\" stroke-linecap=\"round\" fill=\"none\"/>\n                  <ellipse id=\"mouth-open\" cx=\"301\" cy=\"197\" rx=\"13\" ry=\"11\" fill=\"#713d47\" opacity=\"0\"/>\n                  <ellipse id=\"mouth-tongue\" cx=\"301\" cy=\"204\" rx=\"8\" ry=\"4\" fill=\"#de8290\" opacity=\"0\"/>\n                </g>\n                <!-- Glasses sit above the eyes and move with the head. -->\n                <rect x=\"242\" y=\"130\" width=\"52\" height=\"39\" rx=\"14\" fill=\"none\" stroke=\"#354960\" stroke-width=\"4\"/>\n                <rect x=\"309\" y=\"130\" width=\"52\" height=\"39\" rx=\"14\" fill=\"none\" stroke=\"#354960\" stroke-width=\"4\"/>\n                <path d=\"M294 141 Q301 137 309 141 M241 140 L224 137 M361 140 L379 136\" fill=\"none\" stroke=\"#354960\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n              </g>\n            </g>\n          </svg>"+'<div class="lwc-roaming-bubble" id="lwcRoamingCaption"></div>';
root.appendChild(overlay);
const rig=overlay.querySelector("#lwcRoamingRig");
const nodes={};
for(const name of ["left-arm","right-arm","left-forearm","right-forearm","left-leg","right-leg","head-rig","left-eye","right-eye","left-brow","right-brow","mouth-line","mouth-open","mouth-tongue","left-pupil","right-pupil"]){nodes[name]=rig.querySelector("#"+name);}

const targets={
 code:document.querySelector(".codeCard"),
 output:document.getElementById("ppOut")?.closest(".ioToggleCard"),
 error:document.getElementById("ppErr")?.closest(".ioToggleCard")
};
const editor=document.getElementById("ppCode");
const caption=overlay.querySelector("#lwcRoamingCaption");
const wrapper=document.querySelector(".editorWrap");
const focusLine=document.createElement("div");
focusLine.className="lwc-roaming-code-focus";focusLine.hidden=true;
wrapper?.appendChild(focusLine);
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
let enabled=true,visible=false,speaking=false,paused=false,finished=false;
let currentZone="code",stageZone="left",line=0,gesture="welcome",emotion="happy";
let px=0,py=0,init=false,last=performance.now(),blinkUntil=0,nextBlink=0;
let lastTarget=null,lookAt="audience",walking=false;
let volumeEnergy=.7,snapNext=false;
function viewBounds(){
 const v=window.visualViewport;
 const left=v?.offsetLeft||0,top=v?.offsetTop||0;
 const width=v?.width||innerWidth,height=v?.height||innerHeight;
 return {left,top,right:left+width,bottom:top+height,width,height};
}
function resolveExpanded(zone){
 const el=targets[zone], expandedCode=document.querySelector(".codeCard.codeExpanded");
 const expandedIO=document.querySelector(".ioToggleCard.ioExpanded");
 if(expandedCode&&expandedCode!==el)document.getElementById("ppCodeFullscreen")?.click();
 if(expandedIO&&expandedIO!==el)expandedIO.querySelector(".jsToggleBox")?.click();
}
function scrollToTarget(el){
 if(!el)return;
 const vp=viewBounds(),r=el.getBoundingClientRect(),m=35;
 if(r.bottom<vp.top+m||r.top>vp.bottom-m||(r.height<vp.height*.7&&(r.top<vp.top+m||r.bottom>vp.bottom-m))){
   el.scrollIntoView({behavior:reducedMotion.matches?"auto":"smooth",block:r.height>vp.height*.75?"start":"center",inline:"nearest"});
 }
}
function seekLine(){
 if(!editor||!line||currentZone!=="code")return;
 const st=getComputedStyle(editor),h=parseFloat(st.lineHeight)||parseFloat(st.fontSize||"16")*1.5;
 const pad=parseFloat(st.paddingTop)||14,y=pad+(line-1)*h;
 if(y<editor.scrollTop+pad||y+h>editor.scrollTop+editor.clientHeight-pad)
   editor.scrollTop=Math.max(0,y-editor.clientHeight*.35);
}
function geometry(){
 const vp=viewBounds(),el=targets[currentZone]||targets.code;
 overlay.classList.toggle("lwc-compact",vp.height<460||vp.width<350);
 const w=overlay.offsetWidth||138,h=overlay.offsetHeight||260;
 const m=vp.width<720?6:12;
 // The speech bubble may be wider than the character: reserve its overhang.
 const bubbleWidth=overlay.classList.contains("lwc-compact")?115:vp.width<=720?132:190;
 const overhang=Math.max(0,(bubbleWidth-w)/2);
 const minX=vp.left+m+overhang,maxX=Math.max(minX,vp.right-w-m-overhang);
 const minY=vp.top+m,maxY=Math.max(minY,vp.bottom-h-m);
 if(!el)return {x:minX,y:minY,onScreen:false};
 const r=el.getBoundingClientRect();
 const t=Math.max(r.top,vp.top+m),b=Math.min(r.bottom,vp.bottom-m);
 const onScreen=vp.height>=h+2*m&&b>t+24&&r.right>vp.left+24&&r.left<vp.right-24;
 const expanded=el.classList.contains("codeExpanded")||el.classList.contains("ioExpanded");
 const x=stageZone==="center" ? vp.left+(vp.width-w)/2 :
   vp.width<=720||expanded||r.width>vp.width*.82?
   r.right-w-(vp.width<=720?5:24):
   currentZone==="code"?r.right-w*.76:r.left-w*.22;
 let anchor=t+Math.max(22,(b-t)*.42);
 if(currentZone==="code"&&line&&editor){
   const st=getComputedStyle(editor),lh=parseFloat(st.lineHeight)||parseFloat(st.fontSize||"16")*1.5;
   const y=editor.getBoundingClientRect().top+(parseFloat(st.paddingTop)||14)+(line-.5)*lh-editor.scrollTop;
   if(y>=t&&y<=b)anchor=y;
 }
 let candidateX=safe(x,minX,maxX),candidateY=safe(anchor-h*.46,minY,maxY);
 let canShow=onScreen;
 // Keep the walking teacher clear of the always-visible command menu.
 const menu=document.getElementById("ppSpeakerPanel");
 if(menu && menu.getClientRects().length){
   const d=menu.getBoundingClientRect();
   const intersects=(xx,yy)=>xx+w>d.left-8&&xx<d.right+8&&yy+h>d.top-8&&yy<d.bottom+8;
   if(intersects(candidateX,candidateY)){
     const options=[
       {x:candidateX,y:d.top-h-12},
       {x:d.left-w-12,y:candidateY},
       {x:d.right+12,y:candidateY},
       {x:candidateX,y:d.bottom+12}
     ].filter(pos=>pos.x>=minX&&pos.x<=maxX&&pos.y>=minY&&pos.y<=maxY&&!intersects(pos.x,pos.y));
     options.sort((a,b)=>Math.hypot(a.x-candidateX,a.y-candidateY)-Math.hypot(b.x-candidateX,b.y-candidateY));
     if(options.length){candidateX=options[0].x;candidateY=options[0].y;}
     else canShow=false; // Tiny screens: preserve unobstructed controls.
   }
 }
 return {x:candidateX,y:candidateY,onScreen:canShow};
}
function highlightLine(){
 if(!wrapper||!editor||!line||currentZone!=="code"||!visible||!enabled){focusLine.hidden=true;return;}
 const st=getComputedStyle(editor),lh=parseFloat(st.lineHeight)||parseFloat(st.fontSize||"16")*1.5;
 const pt=parseFloat(st.paddingTop)||14,pb=parseFloat(st.paddingBottom)||14;
 const y=editor.offsetTop+pt+(line-1)*lh-editor.scrollTop;
 if(y<editor.offsetTop+pt-1||y+lh>editor.offsetTop+editor.clientHeight-pb+1){focusLine.hidden=true;return;}
 focusLine.hidden=false;
 focusLine.style.left=editor.offsetLeft+"px";
 focusLine.style.top=y+"px";
 focusLine.style.width=editor.clientWidth+"px";
 focusLine.style.height=lh+"px";
}

function note(text){caption.textContent=String(text||"").slice(0,155);}

function updateLocation(data={}){
 const zone=data.mode==="output"?"output":data.mode==="error"?"error":"code";
 const target=targets[zone]||targets.code;currentZone=zone;
 stageZone=["left","center","right"].includes(data.zone)?data.zone:(zone==="code"?"left":"right");
 lookAt=data.lookAt||zone;
 line=Number.isInteger(data.sourceLine)&&data.sourceLine>0?data.sourceLine:0;
 gesture=data.gesture||"explain";emotion=data.emotion||"explaining";
 if(!visible){visible=true;overlay.hidden=false;overlay.classList.add("lwc-visible");}
 resolveExpanded(zone);
 if(lastTarget!==target){lastTarget=target;requestAnimationFrame(()=>scrollToTarget(target));}
 seekLine();note(data.caption||"");highlightLine();
}

function setMood(){
 const excited=emotion==="excited"||emotion==="encouraging";
 const concerned=emotion==="concerned";
 const eyebrow=excited?-9:concerned?9:emotion==="thinking"?6:-2;
 nodes["left-brow"].style.transform="rotate("+eyebrow+"deg)";
 nodes["right-brow"].style.transform="rotate("+(-eyebrow)+"deg)";
}
function stop(){
 speaking=false;paused=false;finished=true;
 focusLine.hidden=true;
 overlay.classList.remove("lwc-speaking");
 note("Lesson complete ✓");
}
function receiveScene(data){
 if(!enabled)return;
 if(data.kind==="line"){
   speaking=true;paused=false;finished=false;
   updateLocation(data);setMood();overlay.classList.add("lwc-speaking");
 }else if(data.kind==="state"){
   if(data.state==="paused"){paused=true;overlay.classList.remove("lwc-speaking");}
   if(data.state==="speaking"){speaking=true;paused=false;overlay.classList.add("lwc-speaking");}
   if(["stopped","error"].includes(data.state)){stop();note(data.state==="error"?"Speech needs attention":"Speech stopped");}
 }else if(data.kind==="finish"){stop();}
 else if(data.kind==="error"){stop();note(data.message||"Speech problem");}
}
function loop(now){
 const dt=Math.min(.055,Math.max(.001,(now-last)/1000));last=now;
 if(!visible||!enabled){requestAnimationFrame(loop);return;}
 const loc=geometry();
 overlay.classList.toggle("lwc-target-offscreen",!loc.onScreen);
 if(!init||snapNext){px=loc.x;py=loc.y;init=true;snapNext=false;}
 const dx=loc.x-px,dy=loc.y-py;
 const moving=!paused&&!reducedMotion.matches&&loc.onScreen&&(Math.hypot(dx,dy)>4);
 const speed=300;
 if(moving){const distance=Math.hypot(dx,dy)||1;const step=Math.min(speed*dt,distance);px+=dx/distance*step;py+=dy/distance*step;}
 else {px+=(loc.x-px)*Math.min(1,dt*10);py+=(loc.y-py)*Math.min(1,dt*10);}
 const phase=now*.011;
 const stride=moving?Math.sin(phase)*(14+volumeEnergy*7):0;
 nodes["left-leg"].style.transform="rotate("+stride+"deg)";
 nodes["right-leg"].style.transform="rotate("+(-stride)+"deg)";
 const gestureRight=gesture==="point-right"||gesture==="point-code"||gesture==="emphasize";
 const gestureLeft=gesture==="point-left"||gesture==="point-output";
 const rt=gestureRight?-85:gesture==="welcome"?-55:gesture==="count"?-68:gesture==="think"?-22:-35;
 const lt=gestureLeft?90:gesture==="welcome"?70:gesture==="celebrate"?120:35;
 nodes["right-arm"].style.transform="rotate("+(rt+(moving?Math.sin(phase)*9:Math.sin(phase*.45)*2))+"deg)";
 nodes["left-arm"].style.transform="rotate("+(lt-(moving?Math.sin(phase)*9:Math.sin(phase*.5)*2))+"deg)";
 nodes["right-forearm"].style.transform="rotate("+(gesture==="think"?60:10)+"deg)";
 nodes["left-forearm"].style.transform="rotate("+(gesture==="welcome"?-18:0)+"deg)";
 const gaze=lookAt==="code"?4:lookAt==="output"||lookAt==="error"?-4:0;
 nodes["left-pupil"].style.transform="translateX("+gaze+"px)";
 nodes["right-pupil"].style.transform="translateX("+gaze+"px)";
 nodes["head-rig"].style.transform="rotate("+(gaze===0?0:-gaze*1.5+Math.sin(now*.002)*1.5)+"deg)";
 if(now>nextBlink){blinkUntil=now+125;nextBlink=now+1900+(Math.sin(now*.001)+1)*900;}
 const blink=now<blinkUntil?.12:1;
 nodes["left-eye"].style.transform="scaleY("+blink+")";
 nodes["right-eye"].style.transform="scaleY("+blink+")";
 const talking=speaking&&!paused;
 const cadence=Math.floor(now/115)%6;
 const mouth=talking?[1,2,3,1,0,2][cadence]:0;
 nodes["mouth-line"].style.opacity=mouth?"0":"1";
 nodes["mouth-open"].style.opacity=mouth?"1":"0";
 nodes["mouth-open"].setAttribute("rx",String(mouth?mouth===3?17:10:8));
 nodes["mouth-open"].setAttribute("ry",String(mouth?mouth===2?16:9:10));
 nodes["mouth-tongue"].style.opacity=mouth===2?".55":"0";
 overlay.classList.toggle("lwc-walking",moving);
 overlay.style.transform="translate3d("+px.toFixed(1)+"px,"+py.toFixed(1)+"px,0)";
 requestAnimationFrame(loop);
}

function realign(snap=false,scroll=false){
 if(snap)snapNext=true;
 highlightLine();
 if(scroll&&visible&&enabled)requestAnimationFrame(()=>scrollToTarget(targets[currentZone]||targets.code));
}
window.addEventListener("resize",()=>realign(true,true),{passive:true});
window.addEventListener("orientationchange",()=>realign(true,true),{passive:true});
document.addEventListener("fullscreenchange",()=>realign(true,true));
document.addEventListener("scroll",()=>realign(),{capture:true,passive:true});
editor?.addEventListener("scroll",highlightLine,{passive:true});
editor?.addEventListener("input",()=>realign());
window.visualViewport?.addEventListener("resize",()=>realign(true,false),{passive:true});
window.visualViewport?.addEventListener("scroll",()=>realign(true),{passive:true});
if(typeof ResizeObserver!=="undefined"){
 const ro=new ResizeObserver(()=>realign());
 [root,targets.code,targets.output,targets.error,wrapper].filter(Boolean).forEach(el=>ro.observe(el));
}
if(typeof MutationObserver!=="undefined"){
 const observer=new MutationObserver(()=>realign(false,true));
 [root,document.body,targets.code,targets.output,targets.error].filter(Boolean)
   .forEach(el=>observer.observe(el,{attributes:true,attributeFilter:["class"]}));
}

requestAnimationFrame(loop);
window.LWCWalkingTeacher={
  enable(value){
    enabled=Boolean(value);
    overlay.hidden=!enabled||!visible;
    if(enabled&&visible)realign(true,true);
    if(!enabled){focusLine.hidden=true;overlay.classList.remove("lwc-visible");}
    else if(visible){overlay.classList.add("lwc-visible");highlightLine();}
  },
  scene:receiveScene,
  reset(){stop();visible=false;overlay.hidden=true;init=false;overlay.classList.remove("lwc-visible");},
  debug(){return {enabled,visible,speaking,paused,currentZone,stageZone,line,gesture,x:px,y:py,viewport:viewBounds(),target:geometry(),fullscreen:!!document.fullscreenElement||root.classList.contains("fullscreen"),expanded:!!document.querySelector(".codeExpanded,.ioExpanded")};}
};
})();