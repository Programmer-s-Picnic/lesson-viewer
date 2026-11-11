/* Automatic Pandas Visualization: present bounded results from the Pyodide worker.
   No Python is executed here; all chart labels and cell values use textContent. */
(()=>{
"use strict";
const app=document.getElementById("appShell")||document.body;
const host=document.createElement("section");
host.className="lwc-viz-modal";
host.id="lwcPandasVisual";
host.hidden=true;
host.setAttribute("role","dialog");
host.setAttribute("aria-labelledby","lwcVizTitle");
host.setAttribute("aria-modal","false");
host.innerHTML=
 '<div class="lwc-viz-shell">'+
 '<div class="lwc-viz-header"><div class="lwc-viz-brand"><span aria-hidden="true">📊</span><div>'+
 '<span class="lwc-viz-eyebrow">A PROGRAMMER’S PICNIC · RUNTIME VISUALIZATION</span>'+
 '<h2 id="lwcVizTitle">Python Visual Explorer</h2></div></div>'+
 '<div class="lwc-viz-header-controls"><button type="button" id="lwcVizTour" title="Walk through charts with spoken explanations">▶ Tour &amp; Talk</button>'+
 '<button type="button" id="lwcVizStop" title="Stop spoken tour">■ Stop</button>'+
 '<button type="button" id="lwcVizClose" aria-label="Close visualization">✕ Close</button></div></div>'+
 '<aside class="lwc-viz-presenter" id="lwcVizPresenter" aria-label="Champuter teaching guide">'+
   '<div class="lwc-viz-portrait" id="lwcVizPortrait" aria-hidden="true"></div>'+
   '<div class="lwc-viz-voice"><strong>Champuter</strong><p id="lwcVizGuide" aria-live="polite">Welcome! Let’s visualize your Python data.</p></div>'+
 '</aside>'+
 '<div class="lwc-viz-tabs" id="lwcVizTabs" role="tablist" aria-label="DataFrames"></div>'+
 '<div class="lwc-viz-scroll" id="lwcVizScroll"></div>'+
 '<footer class="lwc-viz-footer">From this Python run: real values, sampled execution and visual summaries. Large collections and traces are bounded. No data is uploaded.</footer></div>';
app.appendChild(host);
const $=id=>host.querySelector("#"+id);
const tabs=$("lwcVizTabs"),content=$("lwcVizScroll"),closer=$("lwcVizClose");
const portrait=$("lwcVizPortrait"),guide=$("lwcVizGuide"),presenter=$("lwcVizPresenter");
const tourButton=$("lwcVizTour"),stopButton=$("lwcVizStop");
function guideText(value){if(guide)guide.textContent=String(value||"").slice(0,230)}
function mountChamputer(){
 if(!portrait||portrait.firstChild)return;
 const original=document.getElementById("lwcRoamingRig");
 if(!original){
   // The Dashboard remains usable if the walking teacher script is unavailable.
   portrait.textContent="🎓";
   return;
 }
 const clone=original.cloneNode(true);
 clone.id="lwcVizChamputerRig";
 clone.classList.add("lwc-viz-svg");
 // Keep component-local SVG references unique while retaining identical artwork.
 const prefix="lwcViz-";
 clone.querySelectorAll("[id]").forEach(node=>{node.id=prefix+node.id});
 clone.querySelectorAll("*").forEach(node=>{
   for(const attr of Array.from(node.attributes||[])){
     if(attr.value.includes("url(#"))
       node.setAttribute(attr.name,attr.value.replace(/url\(#([\w-]+)\)/g,(_m,id)=>"url(#"+prefix+id+")"));
   }
 });
 portrait.appendChild(clone);
}

const palette=["#3183c7","#2cab97","#e6a74f","#8966ca","#d46584","#7eb5dd","#537b97","#b08c59"];
let frames=[],selected=0,sourceCode="",previousFocus=null;
let programData=null,runOutput="",runError="",runFigures=[];
let tourToken=0,tourActive=false,currentUtterance=null,currentTarget=null,moveTimer=null;
let focusedElement=null,activeVoice=null;
let mouthTimer=null;
const compact=(n)=>Number(n).toLocaleString("en-IN");
const text=(element,value)=>{element.textContent=value==null?"":String(value);return element};
const make=(tag,cls,value)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(value!==undefined)text(el,value);
 return el;
};
const finite=n=>{const x=Number(n);return Number.isFinite(x)?x:null};
function smallStat(label,value){
 const el=make("div","lwc-viz-stat");
 el.append(make("span","lwc-viz-stat-label",label),make("strong","lwc-viz-stat-value",value));
 return el;
}
function chartSvg(chart){
 const ns="http://www.w3.org/2000/svg";
 const svg=(tag,attrs={},label)=>{
   const node=document.createElementNS(ns,tag);
   for(const [key,val] of Object.entries(attrs))node.setAttribute(key,String(val));
   if(label!==undefined)node.textContent=String(label);
   return node;
 };
 const root=svg("svg",{viewBox:"0 0 640 295",role:"img","aria-label":chart.title||"Automatic chart"});
 const x=Array.isArray(chart.x)?chart.x:[],y=Array.isArray(chart.y)?chart.y:[];
 const pairs=x.slice(0,60).map((v,i)=>({x:v,y:finite(y[i])})).filter(o=>o.y!==null);
 const axisColor="#aac5db",ink="#32607f",top=20,left=61,right=618,bottom=244;
 const width=right-left,height=bottom-top;
 if(!pairs.length){root.append(svg("text",{x:320,y:142,fill:ink,"text-anchor":"middle","font-size":15},"No numeric points"));return root;}
 let yMin=Math.min(...pairs.map(p=>p.y)),yMax=Math.max(...pairs.map(p=>p.y));
 if(chart.kind==="bar"||chart.kind==="histogram")yMin=Math.min(0,yMin);
 if(yMax<=yMin)yMax=yMin+1;
 const py=v=>bottom-((v-yMin)/(yMax-yMin))*height;
 root.append(svg("line",{x1:left,x2:right,y1:bottom,y2:bottom,stroke:axisColor,"stroke-width":1.5}));
 root.append(svg("line",{x1:left,x2:left,y1:top,y2:bottom,stroke:axisColor,"stroke-width":1.5}));
 for(let k=0;k<=4;k++){
   const value=yMin+(yMax-yMin)*k/4,yy=py(value);
   root.append(svg("line",{x1:left,x2:right,y1:yy,y2:yy,stroke:axisColor,"stroke-opacity":.32}));
   root.append(svg("text",{x:left-9,y:yy+4,fill:ink,"font-size":12,"text-anchor":"end"},Number(value.toFixed(2)).toLocaleString()));
 }
 const kind=chart.kind||"bar";
 if(kind==="bar"||kind==="histogram"){
   const step=width/pairs.length,w=Math.max(3,Math.min(65,step*.70));
   pairs.forEach((p,i)=>{
     const xPos=left+step*(i+.5),cy=py(p.y),base=py(0);
     root.append(svg("rect",{x:xPos-w/2,y:Math.min(cy,base),width:w,height:Math.max(1,Math.abs(base-cy)),
       rx:3,fill:palette[i%palette.length]}));
     const label=String(p.x).length>12?String(p.x).slice(0,11)+"…":String(p.x);
     if(pairs.length<=18||i%Math.ceil(pairs.length/14)===0)
       root.append(svg("text",{x:xPos,y:bottom+18,fill:ink,"text-anchor":"middle","font-size":10},label));
   });
 }else{
   const xNums=pairs.map(p=>finite(p.x));
   const isNumeric=xNums.every(v=>v!==null);
   const xMin=isNumeric?Math.min(...xNums):0,xMax=isNumeric?Math.max(...xNums):Math.max(1,pairs.length-1);
   const px=(i)=>left+(isNumeric?(xNums[i]-xMin)/(xMax-xMin||1):i/Math.max(1,pairs.length-1))*width;
   if(kind==="line"){
     root.append(svg("polyline",{points:pairs.map((p,i)=>px(i)+","+py(p.y)).join(" "),fill:"none",
       stroke:palette[0],"stroke-width":3,"stroke-linecap":"round","stroke-linejoin":"round"}));
   }
   pairs.forEach((p,i)=>root.append(svg("circle",{cx:px(i),cy:py(p.y),r:kind==="scatter"?3.8:3.1,
      fill:palette[kind==="scatter"?1:0],"fill-opacity":kind==="scatter"?.70:.95})));
   root.append(svg("text",{x:left,y:bottom+21,fill:ink,"font-size":11},String(pairs[0].x)));
   root.append(svg("text",{x:right,y:bottom+21,fill:ink,"font-size":11,"text-anchor":"end"},String(pairs.at(-1).x)));
 }
 return root;
}
function drawChart(chart){
 const el=make("section","lwc-viz-chart");
 el.append(make("h4","",chart.title||"Automatic chart"),chartSvg(chart));
 const note=chart.kind==="histogram"?"Binned numeric values":chart.kind==="scatter"?
   "Sampled numeric pairs":chart.kind==="line"?"Values across sample row positions":"Category frequencies";
 el.append(make("p","lwc-viz-chart-note",note));
 return el;
}
function tableFor(frame){
 const wrap=make("div","lwc-viz-table-scroll");
 const table=make("table","lwc-viz-table");
 const head=make("thead"),headRow=make("tr");
 headRow.append(make("th","","#"));
 const cols=(frame.columns||[]).slice(0,12);
 cols.forEach(col=>headRow.append(make("th","",col.name)));
 head.append(headRow);table.append(head);
 const body=make("tbody");
 (frame.preview||[]).slice(0,12).forEach((record,i)=>{
   const row=make("tr");
   row.append(make("th","",i+1));
   cols.forEach((col,k)=>row.append(make("td","",record[k]??"")));
   body.append(row);
 });
 table.append(body);wrap.append(table);
 return wrap;
}

function describeChart(chart,frame){
 const title=String(chart.title||"this chart");
 const type=String(chart.kind||"chart");
 const hindi=document.getElementById("ppSpeakerLanguage")?.value==="hi-IN";
 if(hindi){
   if(type==="bar")return "यह "+title+" है। प्रत्येक बार यह दिखाता है कि नमूने में कोई श्रेणी कितनी बार आती है।";
   if(type==="histogram")return "यह "+title+" है। यह चार्ट संख्यात्मक मानों का वितरण दिखाता है।";
   if(type==="line")return "यह "+title+" है। यह रेखा पंक्तियों के मानों में परिवर्तन दिखाती है।";
   if(type==="scatter")return "यह "+title+" है। प्रत्येक बिंदु दो संख्यात्मक मानों की तुलना करता है।";
   return "आइए इस चार्ट को समझें।";
 }
 if(type==="bar")return "Here is "+title+". Each bar shows how often a category appears in the sampled data.";
 if(type==="histogram")return "Let's inspect "+title+". These bars show the distribution of sampled numeric values.";
 if(type==="line")return "Here is "+title+". The line connects values across the sampled row positions.";
 if(type==="scatter")return "Look at "+title+". Each point compares two numeric values from the same sampled row.";
 return "Let's examine "+title+". This visualization is based on sampled values from "+(frame.name||"the DataFrame")+".";
}

function programSection(title,focus){
 const el=make("section","lwc-viz-section lwc-viz-program-section");
 el.dataset.vizFocus=focus;el.append(make("h3","",title));return el;
}
function programCharts(){
 const charts=Array.isArray(programData?.charts)?programData.charts.slice(0,4):[];
 const events=Array.isArray(programData?.trace)?programData.trace:[];
 if(charts.length<4&&events.length>=2){
   const count=new Map();
   events.forEach(item=>{
     const line=Number(item.line);
     if(Number.isInteger(line)&&line>0)count.set(line,(count.get(line)||0)+1);
   });
   if(count.size>1){
     const entries=[...count.entries()].sort((a,b)=>a[0]-b[0]).slice(0,24);
     charts.push({kind:"bar",title:"Executed source lines (sampled)",
       x:entries.map(([line])=>"L"+line),y:entries.map(([,n])=>n)});
   }
 }
 return charts.slice(0,4);
}
function pythonProgramTour(){
 if(!programData)return [];
 const hi=document.getElementById("ppSpeakerLanguage")?.value==="hi-IN";
 const steps=[{frameIndex:-1,target:"program-summary",text:hi?
   "चैंप्यूटर आपके पायथन प्रोग्राम के वास्तविक परिणाम समझाएगा।":
   "Let's visualize your Python program, including the source, execution, values and results."}];
 steps.push({frameIndex:-1,target:"program-flow",text:hi?
   "ये प्रोग्राम के नियंत्रण प्रवाह और संरचना के भाग हैं।":
   "This diagram summarizes assignments, conditions, loops and functions detected in the source."});
 const trace=programData.trace||[],source=sourceCode.split(/\r?\n/);
 const example=trace.length<=15?trace.map((event,i)=>({event,i})):
   [...trace.slice(0,12).map((event,i)=>({event,i})),
    ...trace.slice(-3).map((event,i)=>({event,i:trace.length-3+i}))];
 example.forEach(({event,i})=>steps.push({
   frameIndex:-1,target:"trace-"+i,text:hi?
     "कार्यक्रम लाइन "+event.line+" पर पहुँचा। "+(source[event.line-1]||"").trim().slice(0,70):
     "Python reached line "+event.line+": "+(source[event.line-1]||"").trim().slice(0,95)+
     ". The shown values were recorded before that line."}));
 steps.push({frameIndex:-1,target:"program-variables",text:hi?
   "ये प्रोग्राम की वेरिएबल्स और अंतिम मान हैं।":
   "These are the variable values available when the program finished."});
 programCharts().forEach((chart,i)=>steps.push({
   frameIndex:-1,target:"program-chart-"+i,text:describeChart(chart,{name:"Python values"})}));
 if(runFigures.length)steps.push({frameIndex:-1,target:"program-figures",
   text:hi?"ये प्रोग्राम के बनाए हुए ग्राफ हैं।":"These charts were generated by your Python program."});
 steps.push({frameIndex:-1,target:"program-output",text:hi?
   "यह प्रोग्राम का वास्तविक आउटपुट है।":"Here is the actual output printed by this Python program."});
 if(runError.trim())steps.push({frameIndex:-1,target:"program-errors",text:hi?
   "यह प्रोग्राम की त्रुटि है।":"Here is the error or traceback produced by Python."});
 return steps;
}
function renderProgram(){
 const p=programData||{},trace=Array.isArray(p.trace)?p.trace:[],
       variables=Array.isArray(p.variables)?p.variables:[],
       categories=Object.entries(p.analysis?.categories||{}).filter(([,n])=>n>0);
 guideText("Here is the Python source, execution trace, values and output. Press Tour & Talk.");
 const summary=programSection("Python program","program-summary");
 summary.append(make("p","lwc-viz-program-note",
   "These views show actual run results. The execution trace is bounded to 100 line events and does not cover code inside libraries."));
 const metrics=make("div","lwc-viz-metrics");
 metrics.append(smallStat("Code lines",sourceCode.split(/\r?\n/).length),
   smallStat("Line events",trace.length),smallStat("Variables",variables.length),
   smallStat("Errors",runError.trim()?"Yes":"None"));
 summary.append(metrics);
 const codeBox=make("div","lwc-viz-code-box");
 sourceCode.split(/\r?\n/).slice(0,180).forEach((line,i)=>{
   const row=make("div","lwc-viz-code-line");
   row.append(make("span","",String(i+1)),make("code","",line||" "));
   codeBox.append(row);
 });
 summary.append(codeBox);content.append(summary);
 const flow=programSection("Program structure","program-flow");
 const flowGrid=make("div","lwc-viz-flow");
 if(categories.length)categories.forEach(([type,count])=>{
   const box=make("div","lwc-viz-flow-node");
   box.append(make("strong","",type),make("span","",String(count)));
   flowGrid.append(box);
 });
 else flowGrid.append(make("span","lwc-viz-help","A simple program without detected control-flow constructs."));
 flow.append(flowGrid);
 const constructs=(p.analysis?.highlights||[]).slice(0,22);
 if(constructs.length){
   const sequence=make("div","lwc-viz-flow-timeline");
   const source=sourceCode.split(/\r?\n/);
   constructs.forEach((item,i)=>{
     const line=Math.max(1,Number(item.line)||1);
     const node=make("div","lwc-viz-flow-step");
     node.append(make("strong","",String(item.kind)+" · line "+line),
       make("code","",(source[line-1]||"").trim().slice(0,130)));
     sequence.append(node);
     if(i<constructs.length-1)sequence.append(make("span","lwc-viz-flow-arrow","↓"));
   });
   flow.append(sequence);
 }
 content.append(flow);
 const timeline=programSection("Execution timeline","program-timeline");
 if(trace.length){
   const traceList=make("div","lwc-viz-trace-list"),lines=sourceCode.split(/\r?\n/);
   trace.forEach((event,i)=>{
     const row=make("article","lwc-viz-trace-row");row.dataset.vizFocus="trace-"+i;row.tabIndex=0;
     const n=Math.max(1,Number(event.line)||1);
     row.append(make("strong","","Step "+(i+1)+" · line "+n),
       make("code","",lines[n-1]?.trim()||"(source line)"));
     const values=(event.variables||[]).slice(0,6).map(v=>v.name+" = "+v.text).join(" | ");
     if(values)row.append(make("small","",values));
     row.addEventListener("focus",()=>{if(!tourActive)focusStep({
       frameIndex:-1,target:"trace-"+i,text:"Execution at line "+n},false)});
     traceList.append(row);
   });
   timeline.append(traceList);
   if(p.traceLimited)timeline.append(make("p","lwc-viz-program-note",
     "Showing the first 100 line events. Long loops are sampled, not fully traced."));
 }else timeline.append(make("p","lwc-viz-help",
   "No Python line events were available, for example when syntax prevents execution."));
 content.append(timeline);
 const vars=programSection("Variables and collections","program-variables");
 const vgrid=make("div","lwc-viz-variables");
 if(variables.length)variables.forEach(v=>{
   const item=make("article","lwc-viz-variable");
   item.append(make("strong","",v.name),make("small","",v.type),make("code","",v.text||""));
   if(Array.isArray(v.items)){
     const list=make("div","lwc-viz-value-list");
     v.items.slice(0,10).forEach((val,i)=>list.append(make("span","",
       Array.isArray(val)?val[0]+" → "+val[1]:String(i)+": "+String(val))));
     item.append(list);
   }
   vgrid.append(item);
 });else vgrid.append(make("p","lwc-viz-help","No inspectable user variables were recorded."));
 vars.append(vgrid);content.append(vars);
 const generatedCharts=programCharts();
 if(generatedCharts.length){
   const area=programSection("Charts from real runtime values and events","program-charts"),grid=make("div","lwc-viz-charts");
   generatedCharts.forEach((chart,i)=>{
     const card=drawChart(chart);card.dataset.vizFocus="program-chart-"+i;card.tabIndex=0;
     card.addEventListener("focus",()=>{if(!tourActive)focusStep({
       frameIndex:-1,target:"program-chart-"+i,text:describeChart(chart,{name:"Python values"})},false)});
     grid.append(card);
   });
   area.append(grid);content.append(area);
 }
 if(runFigures.length){
   const figures=programSection("Matplotlib figures","program-figures"),grid=make("div","lwc-viz-charts");
   runFigures.slice(0,4).forEach((data,i)=>{
     if(typeof data!=="string"||!data.startsWith("data:image/png;base64,"))return;
     const image=document.createElement("img");image.loading="lazy";
     image.alt="Matplotlib figure "+(i+1);image.className="lwc-viz-figure";image.src=data;grid.append(image);
   });
   figures.append(grid);content.append(figures);
 }
 const output=programSection("Printed output","program-output");
 output.append(make("pre","lwc-viz-console",runOutput.trim()||"(No printed output)"));
 content.append(output);
 if(runError.trim()){
   const errors=programSection("Errors and traceback","program-errors");
   errors.append(make("pre","lwc-viz-console lwc-viz-console-error",runError));content.append(errors);
 }
}

function buildTour(){
 const steps=pythonProgramTour();
 const hindi=document.getElementById("ppSpeakerLanguage")?.value==="hi-IN";
 frames.slice(0,4).forEach((frame,index)=>{
   const name=String(frame.name||"DataFrame "+(index+1));
   const cols=Array.isArray(frame.columns)?frame.columns:[];
   const missing=cols.reduce((total,col)=>total+(Number(col.missing)||0),0);
   steps.push({frameIndex:index,target:"intro",kind:"overview",text:hindi?
     "अब "+name+" डेटा फ्रेम देखते हैं। इसमें "+(frame.rows||0)+" पंक्तियाँ और "+(frame.cols||0)+" कॉलम हैं।":
     "Now let's look at "+name+". It contains "+(frame.rows||0)+" rows and "+(frame.cols||0)+" columns."});
   steps.push({frameIndex:index,target:"preview",kind:"table",text:hindi?
     "यह डेटा फ्रेम का प्रारंभिक दृश्य है। यहाँ कुछ पंक्तियाँ और कॉलम दिख रहे हैं।":
     "Here is the DataFrame preview. We can examine a sample of its rows and columns."});
   steps.push({frameIndex:index,target:"statistics",kind:"statistics",text:hindi?
     "ये कॉलम के प्रकार और सांख्यिकीय सारांश हैं। दिखाई गई श्रेणियों में कुल "+missing+" मान अनुपस्थित हैं।":
     "Here are the column types and numeric summaries. The displayed columns have "+missing+
     " missing values in total."});
   (frame.charts||[]).slice(0,4).forEach((chart,chartIndex)=>{
     steps.push({frameIndex:index,target:"chart-"+chartIndex,kind:"chart",
       text:describeChart(chart,frame)});
   });
 });
 if(!steps.length)steps.push({frameIndex:0,target:"intro",kind:"empty",
   text:hindi?"अभी कोई पांडास डेटा फ्रेम उपलब्ध नहीं है। पहले डेटा फ्रेम बनाकर विज़ुअलाइज़ चलाइए।":
     "There are no Pandas DataFrames available yet. Create a DataFrame and run Visualize again."});
 return steps;
}
function closeButtonState(){
 tourButton.disabled=tourActive;
 stopButton.disabled=!tourActive;
}
// Change the ellipse radii while preserving its original SVG center (301, 197).
// This avoids transform-origin differences between browsers that made the mouth jump.
function stopMouth(){
 if(mouthTimer!==null){clearInterval(mouthTimer);mouthTimer=null;}
 const ellipse=portrait?.querySelector("#lwcViz-mouth-open");
 if(ellipse){ellipse.setAttribute("rx","13");ellipse.setAttribute("ry","11");}
}
function startMouth(){
 stopMouth();
 const ellipse=portrait?.querySelector("#lwcViz-mouth-open");
 if(!ellipse)return;
 const shapes=[[10,7],[13,12],[12,9],[15,13],[11,8]];
 let index=0;
 const update=()=>{
   if(!tourActive||!presenter?.classList.contains("is-speaking"))return;
   const [rx,ry]=shapes[index++%shapes.length];
   ellipse.setAttribute("rx",String(rx));
   ellipse.setAttribute("ry",String(ry));
 };
 update();
 mouthTimer=setInterval(update,135);
}
function stopTour(silent=false){
 ++tourToken;
 const wasTour=tourActive;
 tourActive=false;
 stopMouth();
 if(moveTimer!==null){clearTimeout(moveTimer);moveTimer=null;}
 if(currentUtterance && window.speechSynthesis){
   try{window.speechSynthesis.cancel()}catch(_e){}
 }
 currentUtterance=null;
 presenter?.classList.remove("is-walking","is-speaking","is-pointing");
 focusedElement?.classList.remove("lwc-viz-highlight");
 focusedElement=null;
 closeButtonState();
 if(!silent&&wasTour)guideText("Tour stopped. Press Tour & Talk to start again.");
}
function movePresenterTo(target){
 if(!target||!presenter||host.hidden)return;
 const shell=host.querySelector(".lwc-viz-shell");
 if(!shell)return;
 const shellRect=shell.getBoundingClientRect();
 const paneRect=content.getBoundingClientRect();
 const rect=target.getBoundingClientRect();
 const sizeW=presenter.offsetWidth||156,sizeH=presenter.offsetHeight||210;
 const minX=Math.max(3,paneRect.left-shellRect.left+3);
 const maxX=Math.max(minX,paneRect.right-shellRect.left-sizeW-6);
 const minY=Math.max(3,paneRect.top-shellRect.top+4);
 const maxY=Math.max(minY,paneRect.bottom-shellRect.top-sizeH-5);
 const mobile=paneRect.width<680;
 let posX=mobile?rect.right-shellRect.left-sizeW*.87:rect.right-shellRect.left+10;
 // Vary the travel lane with the selected chart to show purposeful sideways movement.
 if(!mobile && target.dataset.vizFocus?.startsWith("chart-") &&
    Number(target.dataset.vizFocus.slice(6))%2===1)posX=rect.left-shellRect.left-sizeW*.20;
 posX=Math.max(minX,Math.min(maxX,posX));
 const posY=Math.max(minY,Math.min(maxY,
   rect.top-shellRect.top+Math.min(rect.height*.50,70)-sizeH*.40));
 presenter.classList.add("is-walking","is-pointing");
 presenter.style.transform="translate3d("+posX.toFixed(1)+"px,"+posY.toFixed(1)+"px,0)";
 if(moveTimer!==null)clearTimeout(moveTimer);
 moveTimer=setTimeout(()=>{presenter.classList.remove("is-walking");moveTimer=null;},1100);
}
function focusStep(step,scroll=true){
 if(host.hidden||!step)return false;
 const rawIndex=Number(step.frameIndex);
 const frameIndex=rawIndex===-1&&programData?-1:Math.max(0,Math.min(frames.length-1,rawIndex||0));
 if(selected!==frameIndex){selected=frameIndex;render();}
 const name=String(step.target||"");
 const targetName=/^(program-summary|program-flow|program-variables|program-output|program-errors|program-figures|program-chart-[0-3]|trace-[0-9]{1,3}|intro|preview|statistics|chart-[0-3])$/.test(name)?
   name:(frameIndex===-1?"program-summary":"intro");
 const target=Array.from(content.querySelectorAll("[data-viz-focus]"))
   .find(el=>el.dataset.vizFocus===targetName);
 if(!target){
   guideText(step.text||"Let's explore the data.");
   return false;
 }
 currentTarget={frame:frameIndex,target:targetName};
 if(focusedElement!==target)focusedElement?.classList.remove("lwc-viz-highlight");
 focusedElement=target;
 target.classList.add("lwc-viz-highlight");
 guideText(step.text||"Let's look at this visualization.");
 if(scroll){
   const pane=content.getBoundingClientRect(),r=target.getBoundingClientRect();
   const shift=r.top+(r.height*.5)-(pane.top+pane.height*.44);
   if(Math.abs(shift)>Math.min(60,pane.height*.15))
     content.scrollTo({top:Math.max(0,content.scrollTop+shift),
       behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
 }
 movePresenterTo(target);
 return true;
}
function startTour({startWith,autoplay=false}={}){
 if(host.hidden)return false;
 stopTour(true);
 const steps=startWith?[startWith]:buildTour();
 const supported=typeof window.SpeechSynthesisUtterance==="function"&&!!window.speechSynthesis;
 if(!supported){
   focusStep(steps[0]);
   guideText("Browser speech is unavailable. Champuter can still point to the highlighted data.");
   return false;
 }
 tourActive=true;closeButtonState();
 const token=++tourToken;
 const synth=window.speechSynthesis;
 try{synth.cancel()}catch(_e){}
 function next(index){
   if(token!==tourToken||host.hidden)return;
   if(index>=steps.length){
     tourActive=false;currentUtterance=null;
     stopMouth();
     presenter.classList.remove("is-speaking","is-pointing");
     closeButtonState();
     guideText("That completes our visual tour. Select a chart or replay Tour & Talk.");
     return;
   }
   const step=steps[index];
   focusStep(step,true);
   const utterance=new window.SpeechSynthesisUtterance(step.text);
   const lang=document.getElementById("ppSpeakerLanguage")?.value||"en-IN";
   utterance.lang=lang;utterance.rate=.95;utterance.pitch=1.02;utterance.volume=1;
   const voice=synth.getVoices().find(v=>
     v.lang.toLowerCase()===lang.toLowerCase())||
     synth.getVoices().find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase()));
   if(voice)utterance.voice=voice;
   currentUtterance=utterance;
   let done=false,hasStarted=false;
   let watchdog=null;
   function advance(){
     if(done)return;
     done=true;
     clearTimeout(watchdog);
     presenter.classList.remove("is-speaking");
     stopMouth();
     if(token===tourToken)setTimeout(()=>next(index+1),320);
   }
   utterance.onstart=()=>{
     hasStarted=true;
     if(token===tourToken){presenter.classList.add("is-speaking");startMouth();}
   };
   utterance.onend=advance;
   utterance.onerror=()=>{
     if(token!==tourToken)return;
     stopTour(true);
     guideText("Audio was blocked or unavailable. Tap Tour & Talk to try speaking again.");
   };
   // Avoid a permanently locked tour when the speech engine never starts.
   watchdog=setTimeout(()=>{
     if(token!==tourToken||done)return;
     if(!hasStarted){
       stopTour(true);
       guideText("Speech did not start automatically. Tap Tour & Talk to retry.");
     }else advance();
   },Math.max(8000,step.text.length*160));
   try{synth.speak(utterance)}catch(_e){
     stopTour(true);
     guideText("Speech is unavailable. Use Tour & Talk with a supported browser.");
   }
 }
 next(0);
 return true;
}

function render(){
 mountChamputer();
 tabs.replaceChildren();content.replaceChildren();
 if(programData){
   const tab=make("button","lwc-viz-tab"+(selected===-1?" selected":""),"Python Program");
   tab.type="button";tab.setAttribute("role","tab");
   tab.setAttribute("aria-selected",selected===-1?"true":"false");
   tab.addEventListener("click",()=>{
     stopTour(true);selected=-1;render();
     requestAnimationFrame(()=>focusStep({frameIndex:-1,target:"program-summary",text:"Let's examine the Python program."}));
   });
   tabs.append(tab);
 }
 if(selected===-1&&programData){renderProgram();return;}
 if(!frames.length){
   guideText("Run a Python program and I will show its code, variables, output and charts.");
   const box=make("section","lwc-viz-empty");
   box.append(make("h3","","No DataFrames or program trace found"),
     make("p","","Click Visualize to run Python and inspect its source, variables, output and charts. DataFrames also get their own tabs."),
     make("code","","import pandas as pd\ndf = pd.DataFrame({'Subject':['Physics','Maths'], 'Marks':[78,84]})"));
   content.append(box);return;
 }
 frames.forEach((frame,i)=>{
   const tab=make("button","lwc-viz-tab"+(i===selected?" selected":""),frame.name||"DataFrame "+(i+1));
   tab.type="button";tab.setAttribute("role","tab");tab.setAttribute("aria-selected",i===selected?"true":"false");
   tab.addEventListener("click",()=>{
     stopTour(true);
     selected=i;render();
     requestAnimationFrame(()=>focusStep({
       frameIndex:i,target:"intro",
       text:"Let us explore "+(frame.name||"DataFrame "+(i+1))+"."
     }));
   });
   tabs.append(tab);
 });
 const frame=frames[selected]||frames[0],cols=frame.columns||[],charts=frame.charts||[];
 guideText("Let's examine "+(frame.name||"this DataFrame")+
   ": "+Number(frame.rows||0).toLocaleString("en-IN")+" rows, "+
   Number(frame.cols||0).toLocaleString("en-IN")+" columns and "+
   charts.length+" suggested charts.");
 const header=make("section","lwc-viz-intro");
 header.dataset.vizFocus="intro";
 header.append(make("h3","","DataFrame: "+frame.name),
   make("p","","Showing the first "+Math.min(frame.rows||0,12)+" rows and up to 12 columns. Charts are generated from at most "+Math.min(frame.rows||0,1000)+" sampled rows."));
 const metrics=make("div","lwc-viz-metrics");
 metrics.append(smallStat("Rows",compact(frame.rows||0)),smallStat("Columns",compact(frame.cols||0)),
   smallStat("Missing values",compact(cols.reduce((n,c)=>n+(c.missing||0),0))),
   smallStat("Suggested charts",charts.length));
 header.append(metrics);content.append(header);
 const preview=make("section","lwc-viz-section");
 preview.dataset.vizFocus="preview";
 preview.append(make("h3","","Data preview"),tableFor(frame));content.append(preview);
 const details=make("section","lwc-viz-section");
 details.dataset.vizFocus="statistics";
 details.append(make("h3","","Column details"));
 const grid=make("div","lwc-viz-columns");
 cols.forEach(col=>{
   const el=make("article","lwc-viz-column");
   el.append(make("strong","",col.name),make("small","",col.dtype||"unknown"),
     make("span","",(col.missing||0)+" missing"));
   if(col.numeric && col.mean!==undefined)
     el.append(make("span","","Mean "+compact(col.mean)+" · Min "+compact(col.min)+" · Max "+compact(col.max)));
   grid.append(el);
 });
 details.append(grid);content.append(details);
 const section=make("section","lwc-viz-section");
 section.append(make("h3","","Automatically generated charts"));
 const chartGrid=make("div","lwc-viz-charts");
 if(charts.length)charts.forEach((c,index)=>{
   const card=drawChart(c);
   card.dataset.vizFocus="chart-"+index;
   card.tabIndex=0;
   const focusChart=()=>{
     if(tourActive)return;
     focusStep({frameIndex:selected,target:"chart-"+index,
       text:describeChart(c,frame),kind:"chart"},false);
   };
   card.addEventListener("focus",focusChart);
   card.addEventListener("mouseenter",focusChart);
   card.addEventListener("click",()=>{
     if(!tourActive)startTour({startWith:{frameIndex:selected,target:"chart-"+index,text:describeChart(c,frame),kind:"chart"}});
   });
   chartGrid.append(card);
 });
 else chartGrid.append(make("p","lwc-viz-help","This DataFrame has insufficient varied numeric or categorical data for automatic charts."));
 section.append(chartGrid);content.append(section);
}
function setData(next,code,detail={}){
 stopTour(true);
 frames=Array.isArray(next)?next.slice(0,6):[];
 if(typeof code==="string")sourceCode=code;
 programData=detail.program&&typeof detail.program==="object"?detail.program:
   (sourceCode.trim()?{variables:[],trace:[],analysis:{categories:{},highlights:[]},charts:[]}:null);
 runOutput=String(detail.stdout||"");
 runError=String(detail.stderr||"");
 runFigures=Array.isArray(detail.plots)?detail.plots.slice(0,4):[];
 selected=programData?-1:0;
 if(!host.hidden)render();
}
function open(next,code,detail={}){
 if(next!==undefined)setData(next,code,detail);
 previousFocus=document.activeElement;
 mountChamputer();
 host.hidden=false;
 document.body.classList.add("lwc-viz-active");
 render();
 closeButtonState();
 requestAnimationFrame(()=>focusStep({frameIndex:selected,target:"intro",text:guide.textContent},false));
 closer.focus({preventScroll:true});
}
function close(){
 stopTour(true);
 host.hidden=true;
 document.body.classList.remove("lwc-viz-active");
 previousFocus?.focus?.({preventScroll:true});
}
function isOpen(){return !host.hidden;}
tourButton.addEventListener("click",()=>startTour());
stopButton.addEventListener("click",()=>stopTour());
content.addEventListener("scroll",()=>{if(focusedElement)movePresenterTo(focusedElement)},{passive:true});
window.addEventListener("resize",()=>{if(focusedElement)movePresenterTo(focusedElement)},{passive:true});
closer.addEventListener("click",close);
window.addEventListener("keydown",event=>{if(!host.hidden&&event.key==="Escape"){event.preventDefault();close();}});
window.LWCPandasVisualizer={open,close,setData,isOpen,startTour,stopTour,
  focusStep,buildTour,getData:()=>frames,sourceCode:()=>sourceCode,
  debug:()=>({open:isOpen(),tourActive,target:currentTarget,position:presenter.style.transform,guide:guide.textContent})};
})();