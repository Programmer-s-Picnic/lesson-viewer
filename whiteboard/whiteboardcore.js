(function () {

  // ================= DOM =================
  const viewport = document.getElementById('viewport');
  const world = document.getElementById('world');
  const canvas = document.getElementById('drawing');
  const ctx = canvas.getContext('2d');
  const objectsLayer = document.getElementById('objectsLayer');

  const penToolBtn = document.getElementById('penTool');
  const selectToolBtn = document.getElementById('selectTool');

  const penColor = document.getElementById('penColor');
  const penSize = document.getElementById('penSize');
  const penOpacity = document.getElementById('penOpacity');

  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  // ================= WORLD =================
  let pan = { x: 0, y: 0 };
  let scale = 1;

  function resize() {
    const w = viewport.clientWidth * 2;
    const h = viewport.clientHeight * 2;
    canvas.width = w;
    canvas.height = h;
    world.style.width = w + 'px';
    world.style.height = h + 'px';
  }

  resize();
  window.addEventListener('resize', resize);

  function pageToWorld(x, y) {
    const r = viewport.getBoundingClientRect();
    return {
      x: (x - r.left - pan.x) / scale,
      y: (y - r.top - pan.y) / scale
    };
  }

  // ================= UNDO / REDO =================
  const undoStack = [];
  const redoStack = [];
  let historyLock = 0;

  function withHistoryLock(fn) {
    historyLock++;
    try { fn(); }
    finally { historyLock--; }
  }

  function captureState() {
    if (historyLock) return;

    undoStack.push({
      canvas: ctx.getImageData(0, 0, canvas.width, canvas.height),
      objects: objectsLayer.innerHTML
    });

    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
    updateUI();
  }

  function restoreState(state) {
    withHistoryLock(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(state.canvas, 0, 0);
      objectsLayer.innerHTML = state.objects;
    });
    updateUI();
  }

  function undo() {
    if (undoStack.length < 2) return;
    const cur = undoStack.pop();
    redoStack.push(cur);
    restoreState(undoStack[undoStack.length - 1]);
  }

  function redo() {
    if (!redoStack.length) return;
    const s = redoStack.pop();
    undoStack.push(s);
    restoreState(s);
  }

  function updateUI() {
    undoBtn.disabled = undoStack.length < 2;
    redoBtn.disabled = !redoStack.length;
  }

  undoBtn.onclick = undo;
  redoBtn.onclick = redo;

  // ================= DRAW =================
  let drawing = false;

  viewport.addEventListener('pointerdown', e => {
    drawing = true;
    const p = pageToWorld(e.clientX, e.clientY);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });

  window.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pageToWorld(e.clientX, e.clientY);
    ctx.lineWidth = penSize.value;
    ctx.strokeStyle = penColor.value;
    ctx.globalAlpha = penOpacity.value;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });

  window.addEventListener('pointerup', () => {
    if (!drawing) return;
    drawing = false;
    captureState();
  });

  // ================= SHORTCUTS =================
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      undo(); e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
      redo(); e.preventDefault();
    }
  });

  // Initial snapshot
  captureState();

})();