"use strict";
// Natural Voice Studio: offline rule-based direction, no external services.
window.VoiceDirector=(()=>{
 const defaults={style:"natural",smart:true,pitch:100,volume:92,speed:100,expression:40,variation:30,pauses:55,
 dictionary:"NumPy = num pie\nPyTorch = pie torch\nSQL = sequel\nJSON = jay son\nAPI = A P I"};
 const styles={natural:[1,1,1,1],warm:[.94,1.025,.97,1.15],energetic:[1.07,1.04,1.04,.8],calm:[.9,.98,.94,1.3]};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const config=()=>({...defaults,...(state.voiceStudio||{})});
 const clean=text=>String(text||"").replace(/<br\s*\/?>/gi," ").replace(/\s+/g," ").trim();
 function clauses(text){
   const source=clean(text),out=[],re=/[^.!?;:\n]+(?:[.!?;:\n]+|$)/g;let m;
   while((m=re.exec(source))){const value=m[0].trim();if(value)out.push({text:value,start:m.index+m[0].indexOf(value)});}
   return out.length?out:(source?[{text:source,start:0}]:[]);
 }
 function dictionary(text,entries){
   const mappings=String(entries||"").split(/\r?\n/).slice(0,100).map(line=>{
     const i=line.indexOf("=");return i>0?[line.slice(0,i).trim(),line.slice(i+1).trim()]:null;
   }).filter(x=>x&&x[0]&&x[1]&&x[0].length<=60&&x[1].length<=120).sort((a,b)=>b[0].length-a[0].length);
   let result=text;
   for(const [from,to] of mappings){
     const escaped=from.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&");
     const left=/^\w/.test(from)?"\\b":"",right=/\w$/.test(from)?"\\b":"";
     result=result.replace(new RegExp(left+escaped+right,"gi"),()=>to);
   }
   return result;
 }
 function detect(text){
   if(/\?$/.test(text))return "question";
   if(/!$/.test(text)||/\b(congratulations|amazing|excellent|wow)\b/i.test(text))return "excited";
   if(/\b(warning|careful|avoid|never|don't|error|danger)\b/i.test(text))return "caution";
   if(/\b(remember|important|key|notice|note that|must)\b/i.test(text))return "emphasis";
   if(/\b(try|practice|your turn|can you)\b/i.test(text))return "invitation";
   return "explain";
 }
 function plan(text,slide,options={}){
   const cfg=config(),style=styles[cfg.style]||styles.natural;
   const override=slide?.voiceDirections||{};
   const baseRate=clamp(Number(options.rate||slide?.speechRate||document.getElementById("ttsNarrationRate")?.value||1),.6,1.5);
   return clauses(text).map((piece,i)=>{
     const manual=override[i]||{};
     const mode=manual.mode&&manual.mode!=="auto"?manual.mode:(cfg.smart?detect(piece.text):"explain");
     const intent={explain:[0,0,0],question:[.065,.025,.04],excited:[.075,.06,.05],
      caution:[-.04,-.075,-.05],emphasis:[.055,-.045,.045],invitation:[.035,.015,.015]}[mode]||[0,0,0];
     const energy=clamp(Number(cfg.expression),0,100)/100;
     const variation=clamp(Number(cfg.variation),0,100)/100;
     const contour=Math.sin(i*1.618)*.045*variation;
     const pitch=clamp(Number(cfg.pitch)/100*style[1]+intent[0]*energy+contour,.65,1.4);
     const rate=clamp(baseRate*Number(cfg.speed)/100*style[0]*(1+intent[1]*energy-contour*.2),.6,1.5);
     const volume=clamp(Number(cfg.volume)/100*style[2]+intent[2]*energy+contour*.4,.35,1);
     const pause=clamp(Math.round((75+Number(cfg.pauses)*2.5)*style[3]+(/[.!?]$/.test(piece.text)?110:0)+Number(manual.pause||0)),0,1500);
     return {...piece,index:i,mode,spoken:dictionary(piece.text,cfg.dictionary),pitch,rate,volume,pause};
   });
 }
 function render(){
   const box=document.getElementById("voiceDirectionRows");if(!box)return;
   const slide=current(),entries=slide?plan(slide.narrationText||slide.content||"",slide):[];
   box.replaceChildren();
   if(!entries.length){box.textContent="Enter narration to edit sentence direction.";return;}
   for(const entry of entries){
     const label=document.createElement("label");label.className="voice-direction-item";
     const summary=document.createElement("span");summary.textContent=(entry.index+1)+". "+entry.text;summary.style.display="block";
     const controls=document.createElement("div");controls.className="two";
     const sel=document.createElement("select");
     for(const [value,name] of [["auto","Auto-detect"],["explain","Explanation"],["question","Question"],["excited","Excited"],["caution","Caution"],["emphasis","Emphasize"],["invitation","Invitation"]]){
       const opt=document.createElement("option");opt.value=value;opt.textContent=name;sel.append(opt);
     }
     sel.value=slide?.voiceDirections?.[entry.index]?.mode||"auto";
     sel.setAttribute("aria-label","Sentence "+(entry.index+1)+" delivery");
     sel.onchange=()=>{const target=current();if(!target)return;target.voiceDirections||={};
       target.voiceDirections[entry.index]={...(target.voiceDirections[entry.index]||{}),mode:sel.value};saveLocal();};
     const pause=document.createElement("input");pause.type="number";pause.min="0";pause.max="1500";pause.step="50";
     pause.value=slide?.voiceDirections?.[entry.index]?.pause||0;
     pause.title="Additional pause after sentence (milliseconds)";
     pause.setAttribute("aria-label","Extra pause after sentence in milliseconds");
     pause.onchange=()=>{const target=current();if(!target)return;target.voiceDirections||={};
       target.voiceDirections[entry.index]={...(target.voiceDirections[entry.index]||{}),pause:clamp(Number(pause.value)||0,0,1500)};saveLocal();};
     controls.append(sel,pause);label.append(summary,controls);box.append(label);
   }
 }
 function syncControls(){
   const cfg=config();
   for(const key of ["style","pitch","volume","speed","expression","variation","pauses","dictionary","smart"]){
     const el=document.getElementById(key==="style"?"speechStyle":"voice-"+key);if(!el)continue;
     if(el.type==="checkbox")el.checked=!!cfg[key];else el.value=cfg[key];
     const out=document.getElementById("voice-"+key+"-out");
     if(out)out.textContent=el.value+(["pitch","volume","speed"].includes(key)?"%":"");
   }
 }
 function initialize(){
   const cfg=config();
   for(const key of ["style","pitch","volume","speed","expression","variation","pauses","dictionary","smart"]){
     const el=document.getElementById(key==="style"?"speechStyle":"voice-"+key);if(!el)continue;
     if(el.type==="checkbox")el.checked=!!cfg[key];else el.value=cfg[key];
     const output=document.getElementById("voice-"+key+"-out");
     const show=()=>{if(output)output.textContent=el.value+(["pitch","volume","speed"].includes(key)?"%":"");};
     show();
     el.addEventListener("input",()=>{
       state.voiceStudio||={...defaults};
       state.voiceStudio[key]=el.type==="checkbox"?el.checked:el.type==="range"?Number(el.value):el.value;
       saveLocal();show();if(key==="smart")render();
     });
   }
   const original=loadEditor;
   loadEditor=function(){original();syncControls();render();};
   document.getElementById("narrationText")?.addEventListener("input",render);
   document.getElementById("voiceDirectionReset")?.addEventListener("click",()=>{
     const slide=current();if(!slide)return;slide.voiceDirections={};saveLocal();render();
   });
   render();
 }
 return {defaults,config,clauses,plan,render,initialize};
})();
VoiceDirector.initialize();
