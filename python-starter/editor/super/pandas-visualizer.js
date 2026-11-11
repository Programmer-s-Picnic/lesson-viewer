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
 '<h2 id="lwcVizTitle">Pandas Data Explorer</h2></div></div>'+
 '<button type="button" id="lwcVizClose" aria-label="Close visualization">✕ Close</button></div>'+
 '<div class="lwc-viz-tabs" id="lwcVizTabs" role="tablist" aria-label="DataFrames"></div>'+
 '<div class="lwc-viz-scroll" id="lwcVizScroll"></div>'+
 '<footer class="lwc-viz-footer">Auto-generated from DataFrames created by the current Python run. Samples may omit some rows. No data is uploaded.</footer></div>';
app.appendChild(host);
const $=id=>host.querySelector("#"+id);
const tabs=$("lwcVizTabs"),content=$("lwcVizScroll"),closer=$("lwcVizClose");
const palette=["#3183c7","#2cab97","#e6a74f","#8966ca","#d46584","#7eb5dd","#537b97","#b08c59"];
let frames=[],selected=0,sourceCode="",previousFocus=null;
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
function render(){
 tabs.replaceChildren();content.replaceChildren();
 if(!frames.length){
   const box=make("section","lwc-viz-empty");
   box.append(make("h3","","No Pandas DataFrames found"),
     make("p","","Run a Python program that creates a DataFrame variable such as df, passed or grouped. Then select Visualize again."),
     make("code","","import pandas as pd\ndf = pd.DataFrame({'Subject':['Physics','Maths'], 'Marks':[78,84]})"));
   content.append(box);return;
 }
 frames.forEach((frame,i)=>{
   const tab=make("button","lwc-viz-tab"+(i===selected?" selected":""),frame.name||"DataFrame "+(i+1));
   tab.type="button";tab.setAttribute("role","tab");tab.setAttribute("aria-selected",i===selected?"true":"false");
   tab.addEventListener("click",()=>{selected=i;render();});
   tabs.append(tab);
 });
 const frame=frames[selected]||frames[0],cols=frame.columns||[],charts=frame.charts||[];
 const header=make("section","lwc-viz-intro");
 header.append(make("h3","","DataFrame: "+frame.name),
   make("p","","Showing the first "+Math.min(frame.rows||0,12)+" rows and up to 12 columns. Charts are generated from at most "+Math.min(frame.rows||0,1000)+" sampled rows."));
 const metrics=make("div","lwc-viz-metrics");
 metrics.append(smallStat("Rows",compact(frame.rows||0)),smallStat("Columns",compact(frame.cols||0)),
   smallStat("Missing values",compact(cols.reduce((n,c)=>n+(c.missing||0),0))),
   smallStat("Suggested charts",charts.length));
 header.append(metrics);content.append(header);
 const preview=make("section","lwc-viz-section");
 preview.append(make("h3","","Data preview"),tableFor(frame));content.append(preview);
 const details=make("section","lwc-viz-section");
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
 if(charts.length)charts.forEach(c=>chartGrid.append(drawChart(c)));
 else chartGrid.append(make("p","lwc-viz-help","This DataFrame has insufficient varied numeric or categorical data for automatic charts."));
 section.append(chartGrid);content.append(section);
}
function setData(next,code){
 frames=Array.isArray(next)?next.slice(0,6):[];
 if(typeof code==="string")sourceCode=code;
 selected=0;
 if(!host.hidden)render();
}
function open(next,code){
 if(next!==undefined)setData(next,code);
 previousFocus=document.activeElement;
 host.hidden=false;
 document.body.classList.add("lwc-viz-active");
 render();
 closer.focus({preventScroll:true});
}
function close(){
 host.hidden=true;
 document.body.classList.remove("lwc-viz-active");
 previousFocus?.focus?.({preventScroll:true});
}
function isOpen(){return !host.hidden;}
closer.addEventListener("click",close);
window.addEventListener("keydown",event=>{if(!host.hidden&&event.key==="Escape"){event.preventDefault();close();}});
window.LWCPandasVisualizer={open,close,setData,isOpen,getData:()=>frames,sourceCode:()=>sourceCode};
})();