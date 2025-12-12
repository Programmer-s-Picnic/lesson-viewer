/* ============================================================
   ADVANCED WHITEBOARD – CORE LOGIC
   ------------------------------------------------------------
   This file intentionally contains ALL JavaScript so that:
   - Students can read one file
   - Logic flow is easy to trace
   - No build tools are required
   ============================================================ */

'use strict';

/* ================= GLOBAL STATE ================= */

const WB = {
  mode: 'pen',
  pan: { x: 0, y: 0 },
  scale: 1,
  isDrawing: false,
  lastPoint: null,
  selected: new Set()
};

/* ================= DOM REFERENCES ================= */

const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const canvas = document.getElementById('drawing');
const ctx = canvas.getContext('2d');
const objectsLayer = document.getElementById('objectsLayer');

const penColor = document.getElementById('penColor');
const penSize = document.getElementById('penSize');
const penOpacity = document.getElementById('penOpacity');

/* ================= TOOL SWITCHING ================= */

function setTool(tool){
  WB.mode = tool;
  document.querySelectorAll('.toolbtn').forEach(b=>b.classList.remove('active'));
  document.getElementById(tool+'Tool').classList.add('active');
}

penTool.onclick = ()=>setTool('pen');
highlighterTool.onclick = ()=>setTool('highlighter');
eraserTool.onclick = ()=>setTool('eraser');
selectTool.onclick = ()=>setTool('select');

/* ================= COORDINATE HELPERS ================= */

function pageToWorld(x,y){
  const r = viewport.getBoundingClientRect();
  return {
    x:(x-r.left-WB.pan.x)/WB.scale,
    y:(y-r.top-WB.pan.y)/WB.scale
  };
}

/* ================= DRAWING ENGINE ================= */

viewport.addEventListener('pointerdown',e=>{
  if(!['pen','highlighter','eraser'].includes(WB.mode)) return;
  WB.isDrawing = true;
  WB.lastPoint = pageToWorld(e.clientX,e.clientY);
  ctx.beginPath();
  ctx.moveTo(WB.lastPoint.x,WB.lastPoint.y);
});

window.addEventListener('pointermove',e=>{
  if(!WB.isDrawing) return;

  const p = pageToWorld(e.clientX,e.clientY);

  if(WB.mode==='eraser'){
    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    ctx.lineWidth=penSize.value;
    ctx.lineTo(p.x,p.y);
    ctx.stroke();
    ctx.restore();
  }

  else if(WB.mode==='highlighter'){
    /* REAL highlighter effect */
    ctx.save();
    ctx.globalCompositeOperation='multiply';
    ctx.globalAlpha=penOpacity.value;
    ctx.strokeStyle=penColor.value;
    ctx.lineWidth=penSize.value*2.5;
    ctx.lineTo(p.x,p.y);
    ctx.stroke();
    ctx.restore();
  }

  else{
    ctx.save();
    ctx.globalAlpha=penOpacity.value;
    ctx.strokeStyle=penColor.value;
    ctx.lineWidth=penSize.value;
    ctx.lineTo(p.x,p.y);
    ctx.stroke();
    ctx.restore();
  }

  WB.lastPoint=p;
});

window.addEventListener('pointerup',()=>{
  WB.isDrawing=false;
});

/* ================= WORLD SIZE ================= */

function resize(){
  const w=viewport.clientWidth*2;
  const h=viewport.clientHeight*2;
  world.style.width=w+'px';
  world.style.height=h+'px';
  canvas.width=w;
  canvas.height=h;
}
resize();
window.addEventListener('resize',resize);

/* ================= DEMO OBJECT ================= */

const box=document.createElement('div');
box.className='obj';
box.style.left='100px';
box.style.top='100px';
box.style.width='200px';
box.style.height='120px';
objectsLayer.appendChild(box);