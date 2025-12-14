(function whiteboardCoreModule() {
  // =========================================================
  // WHITEBOARD CORE MODULE
  // =========================================================

  // -------------
  // DOM References
  // -------------
  const viewport = document.getElementById('viewport');
  const world = document.getElementById('world');
  const objectsLayer = document.getElementById('objectsLayer');
  const drawingCanvas = document.getElementById('drawing');
  const selRect = document.getElementById('selRect');

  const ctx = drawingCanvas.getContext('2d', { alpha: true });

  const penToolBtn = document.getElementById('penTool');
  const highlighterToolBtn = document.getElementById('highlighterTool');
  const eraserToolBtn = document.getElementById('eraserTool');
  const selectToolBtn = document.getElementById('selectTool');

  const penColor = document.getElementById('penColor');
  const penSize = document.getElementById('penSize');
  const penOpacity = document.getElementById('penOpacity');

  const toggleGridBtn = document.getElementById('toggleGrid');
  const gridSizeSelect = document.getElementById('gridSize');
  const snapToggle = document.getElementById('snapToggle');

  const exportJSONBtn = document.getElementById('exportJSON');
  const importJSONbtn = document.getElementById('importJSONbtn');
  const importJSONfile = document.getElementById('importJSONfile');
  const clearAllBtn = document.getElementById('clearAll');

  const helpBtn = document.getElementById('helpBtn');
  const guide = document.getElementById('guide');
  const collapseGuide = document.getElementById('collapseGuide');
  const closeGuide = document.getElementById('closeGuide');

  // =========================================================
  // >>> UNDO / REDO INSERTED HERE (GLOBAL STACKS)
  // =========================================================
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 50;

  // -------------------------
  // Default style values
  // -------------------------
  let defaultFontColor = '#000000';
  let defaultFontSize = 16;
  let defaultShapeFill = '#aaaaaa';
  let defaultShapeBorder = '#ff0000';

  // -------------------------
  // World sizing & transform
  // -------------------------
  let worldW = 2400;
  let worldH = 1600;
  let pan = { x: 0, y: 0 };
  let scale = 1;

  function resizeWorld() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    worldW = Math.max(1400, Math.floor(vw * 2));
    worldH = Math.max(900, Math.floor(vh * 2));

    world.style.width = worldW + 'px';
    world.style.height = worldH + 'px';
    objectsLayer.style.width = worldW + 'px';
    objectsLayer.style.height = worldH + 'px';

    drawingCanvas.width = worldW;
    drawingCanvas.height = worldH;
  }

  function applyTransform() {
    world.style.transform =
      `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
  }

  function pageToWorld(x, y) {
    const r = viewport.getBoundingClientRect();
    return {
      x: (x - r.left - pan.x) / scale,
      y: (y - r.top - pan.y) / scale
    };
  }

  resizeWorld();
  applyTransform();

  // =========================================================
  // >>> UNDO / REDO INSERTED HERE (CAPTURE)
  // =========================================================
  function captureState() {
    const canvasData = ctx.getImageData(
      0, 0, drawingCanvas.width, drawingCanvas.height
    );

    const objectsData = [];
    for (const el of objectsLayer.children) {
      if (!el.classList.contains('obj')) continue;

      const c = el.querySelector('.content');

      objectsData.push({
        type: el.classList.contains('circle') ? 'circle'
          : el.classList.contains('text') ? 'text'
            : 'rect',
        left: parseFloat(el.style.left),
        top: parseFloat(el.style.top),
        width: parseFloat(el.style.width),
        height: parseFloat(el.style.height),
        angle: parseFloat(el.dataset.angle || 0),
        html: c ? c.innerHTML : '',
        css: {
          background: el.style.background || '',
          borderColor: el.style.borderColor || '',
          fontSize: c?.style.fontSize || '',
          color: c?.style.color || ''
        },
        z: parseInt(el.style.zIndex || 1, 10)
      });
    }

    undoStack.push({ canvasData, objectsData });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
  }

  // =========================================================
  // >>> UNDO / REDO INSERTED HERE (RESTORE)
  // =========================================================
  function restoreState(state) {
    if (!state) return;

    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    ctx.putImageData(state.canvasData, 0, 0);

    objectsLayer.innerHTML = '';

    for (const item of state.objectsData) {
      const el = document.createElement('div');
      el.className = 'obj ' + item.type;
      el.style.left = item.left + 'px';
      el.style.top = item.top + 'px';
      el.style.width = item.width + 'px';
      el.style.height = item.height + 'px';
      el.style.zIndex = item.z;
      el.style.transform = `rotate(${item.angle}deg)`;
      el.dataset.angle = item.angle;

      if (item.css.background) el.style.background = item.css.background;
      if (item.css.borderColor) el.style.borderColor = item.css.borderColor;

      const content = document.createElement('div');
      content.className = 'content';
      content.innerHTML = item.html;
      if (item.css.fontSize) content.style.fontSize = item.css.fontSize;
      if (item.css.color) content.style.color = item.css.color;

      el.appendChild(content);
      objectsLayer.appendChild(el);
    }
  }

  // =========================================================
  // >>> UNDO / REDO INSERTED HERE (COMMANDS)
  // =========================================================
  function undo() {
    if (undoStack.length < 2) return;
    const current = undoStack.pop();
    redoStack.push(current);
    restoreState(undoStack[undoStack.length - 1]);
  }

  function redo() {
    if (!redoStack.length) return;
    const state = redoStack.pop();
    undoStack.push(state);
    restoreState(state);
  }

  // -------------------------
  // Drawing tools
  // -------------------------
  let isDrawing = false;
  let lastPoint = null;
  let drawMode = 'pen';

  function startDrawAt(pt) {
    isDrawing = true;
    lastPoint = pt;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  }

  function continueDrawTo(pt) {
    if (!isDrawing) return;
    ctx.lineWidth = Number(penSize.value);
    ctx.strokeStyle = penColor.value;
    ctx.globalAlpha = Number(penOpacity.value);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPoint = pt;
  }

  function endDraw() {
    isDrawing = false;
    lastPoint = null;

    // >>> UNDO / REDO INSERTED HERE
    captureState();
  }

  viewport.addEventListener('pointerdown', ev => {
    const pt = pageToWorld(ev.clientX, ev.clientY);
    startDrawAt(pt);
  });

  window.addEventListener('pointermove', ev => {
    if (!isDrawing) return;
    continueDrawTo(pageToWorld(ev.clientX, ev.clientY));
  });

  window.addEventListener('pointerup', endDraw);

  // -------------------------
  // Keyboard shortcuts
  // -------------------------
  window.addEventListener('keydown', ev => {

    // >>> UNDO / REDO INSERTED HERE
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
      undo();
      ev.preventDefault();
    }

    if (
      (ev.ctrlKey || ev.metaKey) &&
      (ev.key.toLowerCase() === 'y' ||
        (ev.shiftKey && ev.key.toLowerCase() === 'z'))
    ) {
      redo();
      ev.preventDefault();
    }
  });

  // -------------------------
  // Initial state snapshot
  // -------------------------
  // >>> UNDO / REDO INSERTED HERE
  captureState();

})();