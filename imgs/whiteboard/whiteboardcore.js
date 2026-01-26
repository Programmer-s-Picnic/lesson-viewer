/**
 * ============================================================
 * WHITEBOARD CORE MODULE
 * ============================================================
 * This is the engine.
 *
 * It manages:
 * - Canvas drawing (pen / highlighter / eraser)
 * - Objects layer (rect / circle / text / image)
 * - Selection, dragging, resizing, rotating
 * - Grid/snap
 * - Undo/Redo history
 * - Import/Export JSON (objects only)
 * - Help/Guide persistence
 *
 * CHANGE THIS -> DO THIS (Common edits):
 * ------------------------------------------------------------
 * A) Default canvas/world size:
 *    - resizeWorld(): worldW/worldH calculation
 *
 * B) Default tool:
 *    - setActiveTool('pen') near end
 *
 * C) Pen defaults:
 *    - HTML default values OR in code use .value assignments
 *
 * D) Snap grid angle step:
 *    - snapAngle(): change step = 15
 *
 * E) History length:
 *    - MAX_HISTORY = 40
 *
 * F) Export should include canvas too:
 *    - capture canvasData as a PNG (toDataURL) and include in JSON export
 *
 * SAFETY:
 * - Do not remove historyLock logic unless you know why.
 * - Do not put IDs into cloned dropdown elements (handled in whiteboard.js).
 */

(function whiteboardCoreModule() {
  // =========================================================
  // 1) DOM REFERENCES
  // =========================================================
  const viewport = document.getElementById('viewport');
  const world = document.getElementById('world');
  const objectsLayer = document.getElementById('objectsLayer');
  const drawingCanvas = document.getElementById('drawing');
  const selRect = document.getElementById('selRect');

  /**
   * Canvas 2D context
   * - alpha: true -> allows transparency
   * - willReadFrequently: true -> helps performance when reading pixels (undo)
   */
  const ctx = drawingCanvas.getContext('2d', {
    alpha: true,
    willReadFrequently: true
  });

  // Tool buttons
  const penToolBtn = document.getElementById('penTool');
  const highlighterToolBtn = document.getElementById('highlighterTool');
  const eraserToolBtn = document.getElementById('eraserTool');
  const selectToolBtn = document.getElementById('selectTool');

  // Draw controls
  const penColor = document.getElementById('penColor');
  const penSize = document.getElementById('penSize');
  const penOpacity = document.getElementById('penOpacity');

  // Grid & snap controls
  const toggleGridBtn = document.getElementById('toggleGrid');
  const gridSizeSelect = document.getElementById('gridSize');
  const snapToggle = document.getElementById('snapToggle');

  // Import/Export
  const exportJSONBtn = document.getElementById('exportJSON');
  const importJSONbtn = document.getElementById('importJSONbtn');
  const importJSONfile = document.getElementById('importJSONfile');
  const clearAllBtn = document.getElementById('clearAll');

  // Guide & help
  const helpBtn = document.getElementById('helpBtn');
  const guide = document.getElementById('guide');
  const collapseGuide = document.getElementById('collapseGuide');
  const closeGuide = document.getElementById('closeGuide');

  // Eraser overlay
  const eraserCursor = document.getElementById('eraserCursor');
  const eraserSizeLabel = document.getElementById('eraserSizeLabel');

  // Style controls for objects
  const fontColorInput = document.getElementById('fontColor');
  const fontSizeInput = document.getElementById('fontSize');
  const shapeFillInput = document.getElementById('shapeFill');
  const shapeBorderInput = document.getElementById('shapeBorder');

  // Undo/Redo toolbar buttons
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  // =========================================================
  // 2) DEFAULT STYLE VALUES
  // =========================================================
  /**
   * These are applied:
   * - When NO object is selected -> they become "defaults for new objects"
   * - When objects ARE selected -> changes apply to selected objects
   *
   * CHANGE THIS -> DO THIS:
   * - Want different defaults on load? change HTML values or set here.
   */
  let defaultFontColor = fontColorInput.value || '#000000';
  let defaultFontSize = Number(fontSizeInput.value) || 16;
  let defaultShapeFill = shapeFillInput.value || 'teal';
  let defaultShapeBorder = shapeBorderInput.value || 'red';

  // =========================================================
  // 3) WORLD SIZING & TRANSFORM (Pan + Zoom)
  // =========================================================
  /**
   * worldW/worldH:
   * - determines how big the internal drawable plane is.
   *
   * CHANGE THIS -> DO THIS:
   * - Want infinite board? you'd need tiling / dynamic expansion
   * - Want larger board always? increase multipliers in resizeWorld()
   */
  let worldW = 2400;
  let worldH = 1600;

  // pan = translation (pixels), scale = zoom factor
  let pan = { x: 0, y: 0 };
  let scale = 1;

  function resizeWorld() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    // The board is about 2x viewport in each dimension (min bounds)
    worldW = Math.max(1400, Math.floor(vw * 2));
    worldH = Math.max(900, Math.floor(vh * 2));

    world.style.width = worldW + 'px';
    world.style.height = worldH + 'px';

    objectsLayer.style.width = worldW + 'px';
    objectsLayer.style.height = worldH + 'px';

    // IMPORTANT: Canvas pixel buffer sizes must be set via width/height properties
    drawingCanvas.width = worldW;
    drawingCanvas.height = worldH;

    // CSS sizes match, so drawing is 1:1
    drawingCanvas.style.width = worldW + 'px';
    drawingCanvas.style.height = worldH + 'px';
  }

  function applyTransform() {
    // Transform world: translate then scale
    world.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
  }

  /**
   * Convert page coordinates (clientX/clientY) to world coordinates,
   * taking pan and scale into account.
   *
   * CHANGE THIS -> DO THIS:
   * - If you add zoom with mousewheel, this stays correct.
   */
  function pageToWorld(clientX, clientY) {
    const r = viewport.getBoundingClientRect();
    const x = (clientX - r.left - pan.x) / scale;
    const y = (clientY - r.top - pan.y) / scale;
    return { x, y };
  }

  /**
   * Snap helpers:
   * snapToggle controls whether snapping applies.
   */
  function snapValue(v) {
    if (!snapToggle.checked) return v;
    const g = parseInt(gridSizeSelect.value, 10) || 12;
    return Math.round(v / g) * g;
  }

  function snapAngle(a) {
    if (!snapToggle.checked) return a;
    const step = 15; // CHANGE THIS -> DO THIS: set 5 for smoother, 30 for chunkier
    return Math.round(a / step) * step;
  }

  // Resize board when window resizes
  window.addEventListener('resize', () => {
    resizeWorld();
    applyTransform();
  });
  resizeWorld();
  applyTransform();

  // =========================================================
  // 4) UNDO / REDO (Snapshot history)
  // =========================================================
  /**
   * This uses a safe snapshot approach:
   * - canvasData: ImageData of entire canvas
   * - objectsData: serializable object list snapshot
   *
   * CHANGE THIS -> DO THIS:
   * - Increase history: MAX_HISTORY
   * - Reduce memory usage: store canvas as PNG dataURL instead of ImageData
   */
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 40;

  // historyLock prevents recursive captures during restore/import
  let historyLock = 0;
  function withHistoryLock(fn) {
    historyLock++;
    try { fn(); } finally { historyLock--; }
  }

  function updateUndoRedoUI() {
    if (!undoBtn || !redoBtn) return;
    // Need at least 2 states to undo: baseline + current
    undoBtn.disabled = undoStack.length < 2;
    redoBtn.disabled = redoStack.length === 0;
  }

  /**
   * Snapshot all objects into plain JSON structures.
   * NOTE: This stores innerHTML (content) for text and images.
   * If you import untrusted JSON, it could inject HTML.
   *
   * CHANGE THIS -> DO THIS:
   * - For safety, sanitize HTML before setting innerHTML on restore.
   */
  function snapshotObjects() {
    const out = [];
    for (const el of objectsLayer.children) {
      if (!el.classList || !el.classList.contains('obj')) continue;

      const content = el.querySelector('.content');

      out.push({
        id: el.dataset.objId || '',
        type: el.classList.contains('circle') ? 'circle'
          : el.classList.contains('text') ? 'text'
            : 'rect',
        left: parseFloat(el.style.left || 0),
        top: parseFloat(el.style.top || 0),
        width: parseFloat(el.style.width || el.offsetWidth),
        height: parseFloat(el.style.height || el.offsetHeight),
        angle: parseFloat(el.dataset.angle || 0),
        html: content ? content.innerHTML : '',
        css: {
          background: el.style.background || '',
          borderColor: el.style.borderColor || '',
          fontSize: content ? (content.style.fontSize || '') : '',
          color: content ? (content.style.color || '') : ''
        },
        z: parseInt(el.style.zIndex || '0', 10)
      });
    }
    return out;
  }

  /**
   * Restore object list from snapshot data.
   * Uses createObject(..., noHistory: true) so it doesn’t pollute history.
   */
  function restoreObjects(data) {
    objectsLayer.innerHTML = '';
    clearSelection();

    for (const item of data) {
      const el = createObject({
        x: item.left,
        y: item.top,
        w: item.width,
        h: item.height,
        type: item.type,
        html: item.html,
        noHistory: true // IMPORTANT: do not capture state while restoring
      });

      el.style.zIndex = item.z || 1;
      el.style.transform = `rotate(${item.angle || 0}deg)`;
      el.dataset.angle = String(item.angle || 0);

      if (item.css) {
        if (item.css.background) el.style.background = item.css.background;
        if (item.css.borderColor) el.style.borderColor = item.css.borderColor;

        const c = el.querySelector('.content');
        if (c) {
          if (item.css.fontSize) c.style.fontSize = item.css.fontSize;
          if (item.css.color) c.style.color = item.css.color;
        }
      }
    }
  }

  function captureState() {
    if (historyLock > 0) return;

    // Snapshot canvas pixels (can be heavy but reliable)
    const canvasData = ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
    const objectsData = snapshotObjects();

    undoStack.push({ canvasData, objectsData });

    if (undoStack.length > MAX_HISTORY) undoStack.shift();

    // Any new action clears redo stack (standard behavior)
    redoStack.length = 0;
    updateUndoRedoUI();
  }

  function restoreState(state) {
    if (!state) return;

    // lock prevents accidental capture during restore
    withHistoryLock(() => {
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      ctx.putImageData(state.canvasData, 0, 0);
      restoreObjects(state.objectsData);
    });

    updateUndoRedoUI();
  }

  function undo() {
    if (undoStack.length < 2) return;
    const cur = undoStack.pop();
    redoStack.push(cur);
    restoreState(undoStack[undoStack.length - 1]);
  }

  function redo() {
    if (redoStack.length === 0) return;
    const s = redoStack.pop();
    undoStack.push(s);
    restoreState(s);
  }

  if (undoBtn) undoBtn.addEventListener('click', undo);
  if (redoBtn) redoBtn.addEventListener('click', redo);

  // =========================================================
  // 5) DRAWING TOOLS (Pen / Highlighter / Eraser / Select)
  // =========================================================
  let drawMode = 'pen';
  let isDrawing = false;
  let lastPoint = null;

  // strokeChanged prevents history spam when no real drawing occurred
  let strokeChanged = false;

  /**
   * Set active tool + update UI
   * CHANGE THIS -> DO THIS:
   * - Want default tool: call setActiveTool('select') at end instead.
   */
  function setActiveTool(tool) {
    drawMode = tool;

    [penToolBtn, highlighterToolBtn, eraserToolBtn, selectToolBtn]
      .forEach(b => b.classList.remove('active'));

    if (tool === 'pen') penToolBtn.classList.add('active');
    if (tool === 'highlighter') highlighterToolBtn.classList.add('active');
    if (tool === 'eraser') eraserToolBtn.classList.add('active');
    if (tool === 'select') selectToolBtn.classList.add('active');

    updateEraserCursorVisibility();
  }

  penToolBtn.addEventListener('click', () => setActiveTool('pen'));
  highlighterToolBtn.addEventListener('click', () => setActiveTool('highlighter'));
  eraserToolBtn.addEventListener('click', () => setActiveTool('eraser'));
  selectToolBtn.addEventListener('click', () => setActiveTool('select'));

  function startDrawAt(worldPt) {
    isDrawing = true;
    strokeChanged = false;
    lastPoint = worldPt;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(worldPt.x, worldPt.y);

    // Hide eraser cursor while actively erasing (looks cleaner)
    if (drawMode === 'eraser') hideEraserCursorTemporarily();
  }

  function continueDrawTo(worldPt) {
    if (!isDrawing || !lastPoint) return;

    const size = Number(penSize.value);

    if (drawMode === 'eraser') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineTo(worldPt.x, worldPt.y);
      ctx.stroke();
      ctx.restore();
      strokeChanged = true;

    } else if (drawMode === 'highlighter') {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = size * 2.6;
      ctx.strokeStyle = 'rgba(255, 245, 0, 1)';
      ctx.lineCap = 'butt';
      ctx.shadowColor = 'rgba(255, 245, 0, 0.6)';
      ctx.shadowBlur = size * 1.2;

      ctx.lineTo(worldPt.x, worldPt.y);
      ctx.stroke();
      ctx.restore();
      strokeChanged = true;

    } else if (drawMode === 'pen') {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Number(penOpacity.value);
      ctx.lineWidth = size;
      ctx.strokeStyle = penColor.value;

      ctx.lineTo(worldPt.x, worldPt.y);
      ctx.stroke();
      ctx.restore();
      strokeChanged = true;
    }

    lastPoint = worldPt;
  }

  function endDraw() {
    if (!isDrawing) return;

    isDrawing = false;
    lastPoint = null;
    showEraserCursorIfNeeded();

    // IMPORTANT:
    // requestAnimationFrame ensures the last stroke is committed before snapshot
    if (strokeChanged) {
      requestAnimationFrame(() => captureState());
    }
  }

  // =========================================================
  // 6) ERASER CURSOR OVERLAY
  // =========================================================
  let eraserVisible = false;
  let eraserHiddenTemporarily = false;
  let lastPointerInViewport = false;

  function updateEraserCursorVisibility() {
    if (drawMode === 'eraser' && lastPointerInViewport && !eraserHiddenTemporarily) {
      eraserCursor.style.display = 'block';
      eraserSizeLabel.style.display = 'block';
      eraserVisible = true;
      viewport.style.cursor = 'none';
    } else {
      eraserCursor.style.display = 'none';
      eraserSizeLabel.style.display = 'none';
      eraserVisible = false;
      viewport.style.cursor = 'default';
    }
  }

  function hideEraserCursorTemporarily() {
    eraserHiddenTemporarily = true;
    eraserCursor.style.display = 'none';
    eraserSizeLabel.style.display = 'none';
  }

  function showEraserCursorIfNeeded() {
    eraserHiddenTemporarily = false;
    updateEraserCursorVisibility();
  }

  function positionEraserCursor(pageX, pageY) {
    // sizeWorld = tool size, displaySize = scaled size on screen
    const sizeWorld = Number(penSize.value) || 10;
    const displaySize = Math.max(6, sizeWorld * scale);

    eraserCursor.style.width = displaySize + 'px';
    eraserCursor.style.height = displaySize + 'px';
    eraserCursor.style.left = pageX + 'px';
    eraserCursor.style.top = pageY + 'px';
    eraserCursor.style.borderRadius = (displaySize / 2) + 'px';

    eraserSizeLabel.textContent = `${sizeWorld}px`;

    const labelOffsetY = 12 + displaySize / 2;
    eraserSizeLabel.style.left = pageX + 'px';
    eraserSizeLabel.style.top = (pageY - labelOffsetY) + 'px';
  }

  viewport.addEventListener('pointerenter', () => {
    lastPointerInViewport = true;
    updateEraserCursorVisibility();
  });

  viewport.addEventListener('pointerleave', () => {
    lastPointerInViewport = false;
    updateEraserCursorVisibility();
  });

  // This pointermove handles:
  // - eraser cursor tracking
  // - active drawing updates
  window.addEventListener('pointermove', ev => {
    if (eraserVisible || (drawMode === 'eraser' && lastPointerInViewport)) {
      positionEraserCursor(ev.clientX, ev.clientY);
    }
    if (isDrawing) {
      continueDrawTo(pageToWorld(ev.clientX, ev.clientY));
    }
  });

  // =========================================================
  // 7) PANNING & SELECTION BOX
  // =========================================================
  let spaceDown = false;
  let panning = false;
  let panStart = null;
  let savedPan = null;

  let selecting = false;
  let selStart = null;

  viewport.addEventListener('pointerdown', ev => {
    viewport.focus();

    // Space+drag = pan
    if (spaceDown) {
      panning = true;
      panStart = { x: ev.clientX, y: ev.clientY };
      savedPan = { x: pan.x, y: pan.y };
      viewport.style.cursor = 'grabbing';
      ev.preventDefault();
      return;
    }

    // Selection box draw (only when in select mode and clicking background)
    if (drawMode === 'select' &&
      (ev.target === viewport || ev.target === world || ev.target === drawingCanvas)) {

      selecting = true;
      selStart = { x: ev.clientX, y: ev.clientY };

      selRect.style.left = selStart.x + 'px';
      selRect.style.top = selStart.y + 'px';
      selRect.style.width = '0px';
      selRect.style.height = '0px';
      selRect.style.display = 'block';

      ev.preventDefault();
      return;
    }

    // Draw modes start stroke
    if (drawMode === 'pen' || drawMode === 'highlighter' || drawMode === 'eraser') {
      startDrawAt(pageToWorld(ev.clientX, ev.clientY));
      ev.preventDefault();
    }
  });

  // Global pointermove handles panning and selection-rect resizing
  window.addEventListener('pointermove', ev => {
    if (panning) {
      pan.x = savedPan.x + (ev.clientX - panStart.x);
      pan.y = savedPan.y + (ev.clientY - panStart.y);
      applyTransform();
      return;
    }

    if (selecting && selStart) {
      const x = Math.min(selStart.x, ev.clientX);
      const y = Math.min(selStart.y, ev.clientY);
      const w = Math.abs(ev.clientX - selStart.x);
      const h = Math.abs(ev.clientY - selStart.y);

      selRect.style.left = x + 'px';
      selRect.style.top = y + 'px';
      selRect.style.width = w + 'px';
      selRect.style.height = h + 'px';
      return;
    }
  });

  window.addEventListener('pointerup', ev => {
    if (panning) {
      panning = false;
      viewport.style.cursor = 'default';
      return;
    }

    if (selecting) {
      finalizeSelectionRect(ev);
      selecting = false;
      selRect.style.display = 'none';
      selStart = null;
      return;
    }

    if (isDrawing) endDraw();
  });

  // Keyboard controls:
  // - Space toggles pan mode
  // - Ctrl/Cmd+Z -> undo
  // - Ctrl/Cmd+Y or Ctrl+Shift+Z -> redo
  // - Ctrl/Cmd+D -> duplicate
  // - Delete -> delete selection
  window.addEventListener('keydown', ev => {
    if (ev.code === 'Space') {
      spaceDown = true;
      viewport.style.cursor = 'grab';
      ev.preventDefault();
    }

    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
      undo();
      ev.preventDefault();
    }

    if ((ev.ctrlKey || ev.metaKey) &&
      (ev.key.toLowerCase() === 'y' || (ev.shiftKey && ev.key.toLowerCase() === 'z'))) {
      redo();
      ev.preventDefault();
    }

    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd') {
      duplicateSelected();
      ev.preventDefault();
    }

    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      deleteSelected();
      ev.preventDefault();
    }
  });

  window.addEventListener('keyup', ev => {
    if (ev.code === 'Space') {
      spaceDown = false;
      viewport.style.cursor = 'default';
    }
  });

  // =========================================================
  // 8) OBJECT SELECTION MODEL
  // =========================================================
  let selectedSet = new Set();
  let selectionOrder = [];
  let objectCounter = 1;
  let zCounter = 1;

  function addToSelection(el) {
    if (!el || selectedSet.has(el)) return;
    selectedSet.add(el);
    selectionOrder.push(el);
    el.classList.add('selected');
  }

  function removeFromSelection(el) {
    if (!el || !selectedSet.has(el)) return;
    selectedSet.delete(el);
    selectionOrder = selectionOrder.filter(x => x !== el);
    el.classList.remove('selected');
  }

  function clearSelection() {
    for (const e of Array.from(selectedSet)) e.classList.remove('selected');
    selectedSet.clear();
    selectionOrder = [];
  }

  function getSelectionArray() {
    return Array.from(selectionOrder);
  }

  /**
   * Select an object:
   * - append=true toggles selection if Shift pressed
   */
  function selectObjectSingle(el, append = false) {
    if (append) {
      if (selectedSet.has(el)) removeFromSelection(el);
      else addToSelection(el);
    } else {
      clearSelection();
      if (el) addToSelection(el);
    }
  }

  // =========================================================
  // 9) STYLE APPLICATION HELPERS
  // =========================================================
  function applyFontColor(color) {
    if (selectedSet.size > 0) {
      for (const el of getSelectionArray()) {
        const c = el.querySelector('.content');
        if (c) c.style.color = color;
      }
    } else {
      // No selection => this becomes the default for future objects
      defaultFontColor = color;
    }
  }

  function applyFontSize(size) {
    const px = (Number(size) || 12) + 'px';
    if (selectedSet.size > 0) {
      for (const el of getSelectionArray()) {
        if (el.classList.contains('text')) {
          const c = el.querySelector('.content');
          if (c) c.style.fontSize = px;
        }
      }
    } else {
      defaultFontSize = Number(size) || 12;
    }
  }

  function applyShapeFill(color) {
    if (selectedSet.size > 0) {
      for (const el of getSelectionArray()) {
        if (el.classList.contains('rect') || el.classList.contains('circle')) {
          el.style.background = color;
        }
      }
    } else {
      defaultShapeFill = color;
    }
  }

  function applyShapeBorder(color) {
    if (selectedSet.size > 0) {
      for (const el of getSelectionArray()) {
        if (el.classList.contains('rect') || el.classList.contains('circle')) {
          el.style.borderColor = color;
        }
      }
    } else {
      defaultShapeBorder = color;
    }
  }

  // Bind UI inputs to style functions
  fontColorInput.addEventListener('input', e => applyFontColor(e.target.value));
  fontSizeInput.addEventListener('input', e => applyFontSize(e.target.value));
  shapeFillInput.addEventListener('input', e => applyShapeFill(e.target.value));
  shapeBorderInput.addEventListener('input', e => applyShapeBorder(e.target.value));

  // =========================================================
  // 10) OBJECT CREATION
  // =========================================================
  /**
   * createObject creates DOM objects (not canvas drawing).
   *
   * CHANGE THIS -> DO THIS:
   * - Want different default sizes? change defaults in parameters below.
   * - Want new object types (arrow, sticky note)? add class + rendering logic.
   */
  function createObject({ x = 120, y = 80, w = 220, h = 120, type = 'rect', html = '', noHistory = false } = {}) {
    const el = document.createElement('div');

    // Assign class based on type
    el.className = 'obj ' + (
      type === 'circle' ? 'circle' :
        type === 'text' ? 'text' :
          'rect'
    );

    // Unique object ID
    el.dataset.objId = 'obj' + (objectCounter++);

    // Position and size
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';

    // Rotation stored in dataset (degrees)
    el.style.transform = 'rotate(0deg)';
    el.dataset.angle = '0';

    // New objects go above older objects
    el.style.zIndex = ++zCounter;

    const content = document.createElement('div');
    content.className = 'content';

    /**
     * IMPORTANT CLEANUP:
     * Your original code had duplicated else-if blocks for rect/circle.
     * This version uses one consistent rule set:
     * - text/rect/circle are editable
     * - rect/circle get fill/border defaults
     */
    content.innerHTML = html || 'Double-click to edit';
    content.style.color = defaultFontColor;
    content.style.fontSize = defaultFontSize + 'px';

    if (type === 'rect' || type === 'circle') {
      el.style.background = defaultShapeFill;
      el.style.borderColor = defaultShapeBorder;
    }

    el.appendChild(content);

    // Handles
    const rotateHandle = document.createElement('div');
    rotateHandle.className = 'handle rotate';
    el.appendChild(rotateHandle);

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'handle resize';
    el.appendChild(resizeHandle);

    // Make it interactive (drag/resize/rotate/edit/select)
    makeInteractiveObject(el, rotateHandle, resizeHandle);

    // Add to DOM
    objectsLayer.appendChild(el);

    // Select newly created object
    selectObjectSingle(el);

    // Capture history for user-created objects only
    if (!noHistory) captureState();

    return el;
  }

  // UI bindings for add buttons
  document.getElementById('addRect').addEventListener('click', () => createObject({ type: 'rect' }));
  document.getElementById('addCircle').addEventListener('click', () => createObject({ type: 'circle', w: 140, h: 140 }));
  document.getElementById('addText').addEventListener('click', () =>
    createObject({ type: 'text', w: 220, h: 80, html: 'Double-click to edit' })
  );

  /**
   * Add image uses prompt() for URL:
   * CHANGE THIS -> DO THIS:
   * - Replace prompt with a modal, or allow file upload.
   */
  document.getElementById('addImage').addEventListener('click', () => {
    const url = prompt('Image URL (direct):');
    if (!url) return;

    createObject({
      type: 'rect',
      w: 260,
      h: 160,
      // NOTE: this is raw HTML insertion
      // CHANGE THIS -> DO THIS:
      // - sanitize or validate URL, set <img src> safely
      html: `<img src="${url.replace(/"/g, '')}" alt="">`
    });
  });

  document.getElementById('dupBtn').addEventListener('click', () => duplicateSelected());

  // Clear all objects + drawings
  clearAllBtn.addEventListener('click', () => {
    if (confirm('Remove all objects and drawings?')) {
      objectsLayer.innerHTML = '';
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      clearSelection();
      captureState();
    }
  });

  // =========================================================
  // 11) SELECTION RECTANGLE FINALIZE
  // =========================================================
  function finalizeSelectionRect(ev) {
    const rectPage = selRect.getBoundingClientRect();
    const vpRect = viewport.getBoundingClientRect();

    // Convert selection rectangle from page coords to world coords
    const worldRect = {
      left: (rectPage.left - vpRect.left - pan.x) / scale,
      top: (rectPage.top - vpRect.top - pan.y) / scale,
      right: (rectPage.right - vpRect.left - pan.x) / scale,
      bottom: (rectPage.bottom - vpRect.top - pan.y) / scale
    };

    const els = Array.from(objectsLayer.children)
      .filter(e => e.classList && e.classList.contains('obj'));

    const append = !!ev.shiftKey;
    if (!append) clearSelection();

    for (const el of els) {
      const l = parseFloat(el.style.left);
      const t = parseFloat(el.style.top);
      const w = parseFloat(el.style.width);
      const h = parseFloat(el.style.height);

      const r = l + w;
      const b = t + h;

      const intersects = !(
        r < worldRect.left ||
        l > worldRect.right ||
        b < worldRect.top ||
        t > worldRect.bottom
      );

      if (intersects) addToSelection(el);
    }
  }

  // =========================================================
  // 12) INTERACTIVE OBJECT BEHAVIORS
  // =========================================================
  /**
   * makeInteractiveObject attaches:
   * - Dragging
   * - Resizing
   * - Rotating
   * - Dblclick edit
   * - Click to select
   */
  function makeInteractiveObject(el, rotateHandle, resizeHandle) {
    // ---- DRAGGING ----
    let dragging = false;
    let dragStart = null;
    let groupOrig = null;

    el.addEventListener('pointerdown', ev => {
      if (ev.button && ev.button !== 0) return;

      // If grabbing handles, do not start dragging
      if (ev.target === rotateHandle || ev.target === resizeHandle) return;

      ev.stopPropagation();

      // Shift toggles selection, otherwise single select
      if (ev.shiftKey) selectObjectSingle(el, true);
      else if (!selectedSet.has(el)) selectObjectSingle(el, false);

      if (el.setPointerCapture) el.setPointerCapture(ev.pointerId);

      dragging = true;
      dragStart = { x: ev.clientX, y: ev.clientY };

      // Multi-select move: store original positions for all selected
      groupOrig = getSelectionArray().map(o => ({
        el: o,
        left: parseFloat(o.style.left),
        top: parseFloat(o.style.top)
      }));
    });

    window.addEventListener('pointermove', ev => {
      if (!dragging) return;

      const dx = (ev.clientX - dragStart.x) / scale;
      const dy = (ev.clientY - dragStart.y) / scale;

      for (const o of groupOrig) {
        let nx = o.left + dx;
        let ny = o.top + dy;

        if (snapToggle.checked) {
          nx = snapValue(nx);
          ny = snapValue(ny);
        }
        o.el.style.left = nx + 'px';
        o.el.style.top = ny + 'px';
      }
    });

    window.addEventListener('pointerup', ev => {
      if (!dragging) return;
      dragging = false;
      if (el.releasePointerCapture) el.releasePointerCapture(ev.pointerId);

      // Commit movement to history
      captureState();
    });

    // ---- RESIZING ----
    let resizing = false;
    let rStart = null;
    let rOrig = null;

    resizeHandle.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      if (el.setPointerCapture) el.setPointerCapture(ev.pointerId);

      resizing = true;
      rStart = { x: ev.clientX, y: ev.clientY };
      rOrig = { w: el.offsetWidth, h: el.offsetHeight };

      // Ensure resizing object is selected
      if (!selectedSet.has(el)) {
        clearSelection();
        addToSelection(el);
      }
    });

    window.addEventListener('pointermove', ev => {
      if (!resizing) return;

      const dx = (ev.clientX - rStart.x) / scale;
      const dy = (ev.clientY - rStart.y) / scale;

      let nw = Math.max(20, rOrig.w + dx);
      let nh = Math.max(12, rOrig.h + dy);

      if (snapToggle.checked) {
        nw = snapValue(nw);
        nh = snapValue(nh);
      }

      el.style.width = nw + 'px';
      el.style.height = nh + 'px';
    });

    window.addEventListener('pointerup', ev => {
      if (!resizing) return;
      resizing = false;
      if (resizeHandle.releasePointerCapture) resizeHandle.releasePointerCapture(ev.pointerId);

      captureState();
    });

    // ---- ROTATING ----
    let rotating = false;
    let rotateStartPointerDeg = 0;
    let rotateStartAngle = 0;
    let rotateCenter = null;

    rotateHandle.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      if (el.setPointerCapture) el.setPointerCapture(ev.pointerId);

      rotating = true;

      // Find element center in page coords
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // Convert center to world coords
      rotateCenter = pageToWorld(cx, cy);

      rotateStartAngle = parseFloat(el.dataset.angle || '0');

      // Initial pointer angle relative to center
      const p = pageToWorld(ev.clientX, ev.clientY);
      rotateStartPointerDeg = Math.atan2(p.y - rotateCenter.y, p.x - rotateCenter.x) * 180 / Math.PI;

      if (!selectedSet.has(el)) {
        clearSelection();
        addToSelection(el);
      }
    });

    window.addEventListener('pointermove', ev => {
      if (!rotating) return;

      const p = pageToWorld(ev.clientX, ev.clientY);
      const pointerDeg = Math.atan2(p.y - rotateCenter.y, p.x - rotateCenter.x) * 180 / Math.PI;

      let delta = pointerDeg - rotateStartPointerDeg;

      // NOTE:
      // Your code adds +90; leaving as-is.
      // CHANGE THIS -> DO THIS:
      // - If rotation feels offset, remove +90 and test.
      let newAngle = rotateStartAngle + delta + 90;

      if (snapToggle.checked) newAngle = snapAngle(newAngle);

      el.style.transform = `rotate(${newAngle}deg)`;
      el.dataset.angle = String(newAngle);
    });

    window.addEventListener('pointerup', ev => {
      if (!rotating) return;
      rotating = false;
      if (rotateHandle.releasePointerCapture) rotateHandle.releasePointerCapture(ev.pointerId);

      captureState();
    });

    // ---- TEXT EDITING ----
    el.addEventListener('dblclick', () => {
      const c = el.querySelector('.content');
      if (!c) return;

      c.contentEditable = true;
      c.focus();

      // Select all text for convenience
      document.execCommand('selectAll', false, null);

      // When editing finishes, commit to history
      c.addEventListener('blur', () => {
        c.contentEditable = false;
        captureState();
      }, { once: true });
    });

    // Click selects object (with shift toggle)
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      selectObjectSingle(el, ev.shiftKey);
    });
  }

  // =========================================================
  // 13) DUPLICATION & DELETION
  // =========================================================
  function duplicateSelected() {
    const sel = getSelectionArray();
    if (sel.length === 0) return;

    clearSelection();

    for (const el of sel) {
      const clone = el.cloneNode(true);
      clone.dataset.objId = 'obj' + (objectCounter++);

      // Offset so duplicates are visible
      const left = parseFloat(el.style.left || '0') + 20;
      const top = parseFloat(el.style.top || '0') + 20;

      clone.style.left = left + 'px';
      clone.style.top = top + 'px';
      clone.style.zIndex = ++zCounter;

      // Ensure handles exist
      let rotateHandle = clone.querySelector('.handle.rotate');
      let resizeHandle = clone.querySelector('.handle.resize');

      if (!rotateHandle) {
        rotateHandle = document.createElement('div');
        rotateHandle.className = 'handle rotate';
        clone.appendChild(rotateHandle);
      }
      if (!resizeHandle) {
        resizeHandle = document.createElement('div');
        resizeHandle.className = 'handle resize';
        clone.appendChild(resizeHandle);
      }

      // Attach interactivity again (important!)
      makeInteractiveObject(clone, rotateHandle, resizeHandle);

      objectsLayer.appendChild(clone);
      addToSelection(clone);
    }

    captureState();
  }

  function deleteSelected() {
    const sel = getSelectionArray();
    if (sel.length === 0) return;

    for (const el of sel) el.remove();
    clearSelection();
    captureState();
  }

  // Clicking blank area clears selection in non-draw modes
  viewport.addEventListener('pointerdown', ev => {
    if (ev.target === viewport || ev.target === world || ev.target === drawingCanvas) {
      if (drawMode !== 'pen' && drawMode !== 'highlighter' && drawMode !== 'eraser') {
        clearSelection();
      }
    }
  });

  // =========================================================
  // 14) EXPORT / IMPORT JSON (Objects only)
  // =========================================================
  exportJSONBtn.addEventListener('click', () => {
    const out = snapshotObjects();

    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'whiteboard-objects.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  importJSONbtn.addEventListener('click', () => importJSONfile.click());

  importJSONfile.addEventListener('change', ev => {
    const f = ev.target.files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);

        withHistoryLock(() => {
          objectsLayer.innerHTML = '';
          clearSelection();

          for (const item of data) {
            const el = createObject({
              x: item.left,
              y: item.top,
              w: item.width,
              h: item.height,
              type: item.type,
              html: item.html,
              noHistory: true
            });

            el.style.zIndex = item.z || 1;
            el.style.transform = `rotate(${item.angle || 0}deg)`;
            el.dataset.angle = String(item.angle || 0);

            if (item.css) {
              if (item.css.background) el.style.background = item.css.background;
              if (item.css.borderColor) el.style.borderColor = item.css.borderColor;
              const c = el.querySelector('.content');
              if (c) {
                if (item.css.fontSize) c.style.fontSize = item.css.fontSize;
                if (item.css.color) c.style.color = item.css.color;
              }
            }
          }
        });

        captureState(); // commit import
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(f);
    ev.target.value = '';
  });

  // =========================================================
  // 15) GRID TOGGLE
  // =========================================================
  toggleGridBtn.addEventListener('click', () => {
    const showGrid = !world.classList.contains('grid');
    if (showGrid) {
      world.classList.add('grid');
      world.classList.remove('nogrid');
    } else {
      world.classList.remove('grid');
      world.classList.add('nogrid');
    }
  });

  // =========================================================
  // 16) GUIDE VISIBILITY (Persisted)
  // =========================================================
  const GUIDE_KEY = 'wb_guide_style_v1';
  let guideState = { open: true };

  try {
    const saved = localStorage.getItem(GUIDE_KEY);
    if (saved) guideState = JSON.parse(saved);
  } catch (e) { }

  function applyGuideState() {
    if (!guideState.open) {
      guide.style.display = 'none';
      helpBtn.style.display = 'block';
    } else {
      guide.style.display = 'block';
      helpBtn.style.display = 'none';
    }
  }

  function saveGuideState() {
    localStorage.setItem(GUIDE_KEY, JSON.stringify(guideState));
  }

  applyGuideState();

  collapseGuide.addEventListener('click', () => {
    guideState.open = false;
    saveGuideState();
    applyGuideState();
  });

  closeGuide.addEventListener('click', () => {
    guideState.open = false;
    saveGuideState();
    applyGuideState();
  });

  helpBtn.addEventListener('click', () => {
    guideState.open = true;
    saveGuideState();
    applyGuideState();
  });

  // =========================================================
  // 17) TOUCH BEHAVIOR (Prevent scrolling while drawing)
  // =========================================================
  document.body.addEventListener('touchstart', e => {
    if (e.target.closest('.world')) e.preventDefault();
  }, { passive: false });

  document.body.addEventListener('touchmove', e => {
    if (e.target.closest('.world')) e.preventDefault();
  }, { passive: false });

  // =========================================================
  // 18) INITIAL DEMO OBJECTS + BASELINE HISTORY SNAPSHOT
  // =========================================================
  withHistoryLock(() => {
    createObject({ x: 80, y: 60, w: 260, h: 150, type: 'rect', noHistory: true });
    createObject({ x: 420, y: 120, w: 160, h: 160, type: 'circle', noHistory: true });
    createObject({ x: 120, y: 320, w: 260, h: 110, type: 'text', html: 'Double-click to edit', noHistory: true });
  });

  resizeWorld();
  applyTransform();
  setActiveTool('pen');

  // baseline state
  captureState();
  updateUndoRedoUI();

  // =========================================================
  // 19) PUBLIC API (Expose safe methods to outside world)
  // =========================================================
  window.Whiteboard = {
    clearBoard() {
      withHistoryLock(() => {
        objectsLayer.innerHTML = '';
        clearSelection();
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      });
      captureState();
    },

    loadObjects(objects) {
      withHistoryLock(() => {
        objectsLayer.innerHTML = '';
        clearSelection();
        restoreObjects(objects || []);
      });
    },

    loadCanvas(base64) {
      if (!base64) {
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        return;
      }

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        ctx.drawImage(img, 0, 0);
        captureState();
      };
      img.src = base64;
    }
  };



})();
