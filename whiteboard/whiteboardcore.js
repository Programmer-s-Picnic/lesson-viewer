(function whiteboardCoreModule() {
  // =========================================================
  // WHITEBOARD CORE MODULE
  // - World transform (pan/scale)
  // - Canvas drawing: pen, highlighter, eraser
  // - Object layer: add/move/resize/rotate/select
  // - Grid + snap
  // - Import/Export objects JSON
  // - Guide panel state
  // =========================================================

  // -------------
  // DOM References
  // -------------
  // If you rename any IDs in index.html, you MUST update here.
  const viewport = document.getElementById('viewport');
  const world = document.getElementById('world');
  const objectsLayer = document.getElementById('objectsLayer');
  const drawingCanvas = document.getElementById('drawing');
  const selRect = document.getElementById('selRect');

  // 2D context for drawing
  const ctx = drawingCanvas.getContext('2d', { alpha: true });

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

  // -------------------------
  // Default style values
  // -------------------------
  // If nothing is selected, these act as defaults for NEW objects.
  let defaultFontColor = fontColorInput.value || '#000000';
  let defaultFontSize = Number(fontSizeInput.value) || 16;
  let defaultShapeFill = shapeFillInput.value || 'teal';
  let defaultShapeBorder = shapeBorderInput.value || 'red';

  // -------------------------
  // World sizing & transform
  // -------------------------
  // worldW/worldH define the size of the "infinite-ish" canvas area.
  let worldW = 2400;
  let worldH = 1600;

  // pan = translation applied to world
  // scale = zoom factor (currently fixed at 1, but ready for zoom feature)
  let pan = { x: 0, y: 0 };
  let scale = 1;

  /**
   * Resize world based on viewport size.
   *
   * CHANGE WHAT?
   * - To make larger working area: increase multipliers or minimums below.
   * - Example: vw * 3 instead of vw * 2
   */
  function resizeWorld() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    // CHANGE MINIMUM WORLD SIZE HERE (bigger = more canvas space)
    worldW = Math.max(1400, Math.floor(vw * 2));
    worldH = Math.max(900, Math.floor(vh * 2));

    world.style.width = worldW + 'px';
    world.style.height = worldH + 'px';

    objectsLayer.style.width = worldW + 'px';
    objectsLayer.style.height = worldH + 'px';

    // Canvas internal resolution
    drawingCanvas.width = worldW;
    drawingCanvas.height = worldH;

    // Canvas CSS size (kept equal for now)
    drawingCanvas.style.width = worldW + 'px';
    drawingCanvas.style.height = worldH + 'px';
  }

  /**
   * Apply pan & scale to world element.
   *
   * CHANGE WHAT?
   * - This is where zoom would be applied (scale).
   * - If you add zoom limits, do it before calling applyTransform().
   */
  function applyTransform() {
    world.style.transform =
      `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
  }

  /**
   * Convert page (client) coords to world coords.
   *
   * WHY?
   * - Pointer events are in page coordinates,
   * - but your drawing/object math is in world coordinates.
   */
  function pageToWorld(clientX, clientY) {
    const r = viewport.getBoundingClientRect();
    const x = (clientX - r.left - pan.x) / scale;
    const y = (clientY - r.top - pan.y) / scale;
    return { x, y };
  }

  /**
   * Convert world coords to page coords.
   * Not heavily used now, but useful for future features.
   */
  function worldToPage(wx, wy) {
    const r = viewport.getBoundingClientRect();
    return {
      x: r.left + pan.x + wx * scale,
      y: r.top + pan.y + wy * scale
    };
  }

  /**
   * Snap a numeric value to the grid if snap is enabled.
   *
   * CHANGE WHAT?
   * - Grid size comes from <select id="gridSize"> in HTML.
   * - Add new sizes there if needed.
   */
  function snapValue(v) {
    if (!snapToggle.checked) return v;
    const g = parseInt(gridSizeSelect.value, 10) || 12;
    return Math.round(v / g) * g;
  }

  /**
   * Snap angle to 15-degree increments if snap is enabled.
   *
   * CHANGE WHAT?
   * - To snap at 5 degrees: change step = 5
   * - To snap at 30 degrees: change step = 30
   */
  function snapAngle(a) {
    if (!snapToggle.checked) return a;
    const step = 15; // <--- CHANGE THIS to change rotation snapping
    return Math.round(a / step) * step;
  }

  // Initial world setup
  window.addEventListener('resize', () => {
    resizeWorld();
    applyTransform();
  });
  resizeWorld();
  applyTransform();

  // -------------------------
  // Drawing tools
  // -------------------------
  // drawMode controls pointer behavior.
  let drawMode = 'pen'; // 'pen' | 'highlighter' | 'eraser' | 'select'

  /**
   * Set active tool and update UI.
   *
   * CHANGE WHAT?
   * - If you add new tools, extend this function and add a button in HTML.
   */
  function setActiveTool(tool) {
    drawMode = tool;

    // Remove active from all
    [penToolBtn, highlighterToolBtn, eraserToolBtn, selectToolBtn]
      .forEach(b => b.classList.remove('active'));

    // Add active to current
    if (tool === 'pen') penToolBtn.classList.add('active');
    if (tool === 'highlighter') highlighterToolBtn.classList.add('active');
    if (tool === 'eraser') eraserToolBtn.classList.add('active');
    if (tool === 'select') selectToolBtn.classList.add('active');

    updateEraserCursorVisibility();
  }

  // Tool button wiring
  penToolBtn.addEventListener('click', () => setActiveTool('pen'));
  highlighterToolBtn.addEventListener('click', () => setActiveTool('highlighter'));
  eraserToolBtn.addEventListener('click', () => setActiveTool('eraser'));
  selectToolBtn.addEventListener('click', () => setActiveTool('select'));

  // Canvas drawing state
  let isDrawing = false;
  let lastPoint = null;

  /**
   * Begin a stroke.
   *
   * CHANGE WHAT?
   * - Round line ends & joins are set here (for pen/eraser).
   * - If you want sharp pen: change lineCap/lineJoin to 'butt' / 'miter'.
   */
  function startDrawAt(worldPt) {
    isDrawing = true;
    lastPoint = worldPt;

    // CHANGE THIS for pen feel
    ctx.lineCap = 'round';   // <--- change to 'butt' for flat ends
    ctx.lineJoin = 'round';  // <--- change to 'miter' for sharp corners

    ctx.beginPath();
    ctx.moveTo(worldPt.x, worldPt.y);

    // Hide eraser overlay while actively erasing (cleaner UX)
    if (drawMode === 'eraser') {
      hideEraserCursorTemporarily();
    }
  }

  /**
   * Continue drawing to new point.
   *
   * This is where each tool's rendering happens.
   */
  function continueDrawTo(worldPt) {
    if (!isDrawing || !lastPoint) return;

    const size = Number(penSize.value);

    // =========================================================
    // ERASER TOOL
    // =========================================================
    if (drawMode === 'eraser') {
      // Erase by drawing in "destination-out" mode:
      // any pixels you stroke become transparent.
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';

      // CHANGE THIS to make eraser "stronger":
      // - lineWidth is already using size slider
      ctx.lineWidth = size;

      // strokeStyle doesn't matter much for destination-out,
      // but keep it opaque.
      ctx.strokeStyle = 'rgba(0,0,0,1)';

      ctx.lineTo(worldPt.x, worldPt.y);
      ctx.stroke();
      ctx.restore();
    }

    // =========================================================
    // HIGHLIGHTER TOOL
    // =========================================================
    else if (drawMode === 'highlighter') {
      // Debug log can be removed when stable
      console.log("HIGHLIGHTER ACTIVE");

      ctx.save();

      // Usually we want highlights on top.
      // If you want highlighter to "blend" with ink, experiment with:
      // - 'multiply'
      // - 'screen'
      // - 'overlay'
      ctx.globalCompositeOperation = 'source-over'; // <--- CHANGE THIS for blending style

      // ---- OPACITY ----
      // CHANGE THIS to make highlight more/less transparent
      ctx.globalAlpha = 0.55; // <--- MAIN transparency control

      // ---- THICKNESS ----
      // CHANGE multiplier to make highlighter thicker/thinner relative to penSize
      ctx.lineWidth = size * 2.6; // <--- thickness control

      // ---- COLOR (Your requested example) ----
      // CHANGE THIS LINE to change highlighter color
      // Example green: 'rgba(120, 255, 120, 1)'
      // Example pink:  'rgba(255, 120, 200, 1)'
      ctx.strokeStyle = 'rgba(255, 245, 0, 1)'; // <--- CHANGE COLOR HERE

      // ---- EDGE STYLE ----
      // 'butt' makes it look like a real highlighter flat edge
      // change to 'round' for rounded ends
      ctx.lineCap = 'butt'; // <--- change to 'round' if you prefer

      // ---- GLOW / BLEED EFFECT ----
      // This is what gave you the visible "boost".
      // CHANGE THESE to adjust glow strength:
      ctx.shadowColor = 'rgba(255, 245, 0, 0.6)'; // <--- glow color (match highlight)
      ctx.shadowBlur = size * 1.2;                // <--- glow blur amount

      // Draw the stroke
      ctx.lineTo(worldPt.x, worldPt.y);
      ctx.stroke();

      ctx.restore();
    }

    // =========================================================
    // PEN TOOL
    // =========================================================
    else if (drawMode === 'pen') {
      ctx.save();

      // Normal drawing
      ctx.globalCompositeOperation = 'source-over';

      // CHANGE THIS to force pen to always opaque:
      // ctx.globalAlpha = 1;
      ctx.globalAlpha = Number(penOpacity.value); // <--- pen opacity slider controls this

      // Pen thickness
      ctx.lineWidth = size;

      // CHANGE THIS to change pen color:
      // penColor is linked to <input type=color id="penColor">
      ctx.strokeStyle = penColor.value;

      ctx.lineTo(worldPt.x, worldPt.y);
      ctx.stroke();

      ctx.restore();
    }

    lastPoint = worldPt;
  }

  /**
   * End a stroke.
   */
  function endDraw() {
    isDrawing = false;
    lastPoint = null;
    showEraserCursorIfNeeded();
  }

  // -------------------------
  // Eraser cursor overlay
  // -------------------------
  let eraserVisible = false;
  let eraserHiddenTemporarily = false;
  let lastPointerInViewport = false;

  /**
   * Shows/hides eraser cursor based on tool + pointer position.
   *
   * CHANGE WHAT?
   * - If you want cursor visible even while drawing, remove temporary hide logic.
   */
  function updateEraserCursorVisibility() {
    if (drawMode === 'eraser' &&
      lastPointerInViewport &&
      !eraserHiddenTemporarily) {
      eraserCursor.style.display = 'block';
      eraserSizeLabel.style.display = 'block';
      eraserVisible = true;
      viewport.style.cursor = 'none'; // hide default cursor
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

  /**
   * Position & size eraser cursor overlay.
   *
   * CHANGE WHAT?
   * - displaySize uses scale factor so cursor matches zoom.
   * - If you want cursor to remain fixed size on screen, remove "* scale".
   */
  function positionEraserCursor(pageX, pageY) {
    const sizeWorld = Number(penSize.value) || 10;

    // If you add zoom, this keeps cursor consistent with actual eraser stroke width.
    const displaySize = Math.max(6, sizeWorld * scale);

    eraserCursor.style.width = displaySize + 'px';
    eraserCursor.style.height = displaySize + 'px';
    eraserCursor.style.left = pageX + 'px';
    eraserCursor.style.top = pageY + 'px';
    eraserCursor.style.borderRadius = (displaySize / 2) + 'px';

    // Label shows current eraser size in world pixels
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

  // Global pointermove: handles eraser cursor + drawing
  window.addEventListener('pointermove', ev => {
    if (eraserVisible || (drawMode === 'eraser' && lastPointerInViewport)) {
      positionEraserCursor(ev.clientX, ev.clientY);
    }

    if (isDrawing) {
      const wpt = pageToWorld(ev.clientX, ev.clientY);
      continueDrawTo(wpt);
    }
  });

  penSize.addEventListener('input', () => {
    // No action needed; cursor updates on next pointermove.
    // If you want live update immediately, call positionEraserCursor with last mouse coords.
  });

  // -------------------------
  // Panning & selection box
  // -------------------------
  let spaceDown = false;
  let panning = false;
  let panStart = null;
  let savedPan = null;

  let selecting = false;
  let selStart = null;

  /**
   * pointerdown on viewport
   * - Space + drag => panning
   * - Select tool + drag => selection rectangle
   * - Pen/highlighter/eraser => start drawing
   */
  viewport.addEventListener('pointerdown', ev => {
    viewport.focus();

    // Holding space => pan mode
    if (spaceDown) {
      panning = true;
      panStart = { x: ev.clientX, y: ev.clientY };
      savedPan = { x: pan.x, y: pan.y };
      viewport.style.cursor = 'grabbing';
      ev.preventDefault();
      return;
    }

    // Selection rectangle when in "select" mode and clicking empty area
    if (drawMode === 'select' &&
      (ev.target === viewport || ev.target === world || ev.target === drawingCanvas)) {
      selecting = true;
      selStart = { x: ev.clientX, y: ev.clientY };

      // Initialize rectangle UI
      selRect.style.left = selStart.x + 'px';
      selRect.style.top = selStart.y + 'px';
      selRect.style.width = '0px';
      selRect.style.height = '0px';
      selRect.style.display = 'block';

      ev.preventDefault();
      return;
    }

    // Start drawing for drawing tools
    if (drawMode === 'pen' ||
      drawMode === 'highlighter' ||
      drawMode === 'eraser') {
      const wpt = pageToWorld(ev.clientX, ev.clientY);
      startDrawAt(wpt);
      ev.preventDefault();
    }
  });

  // Separate pointermove handler to pan and resize selection rectangle
  window.addEventListener('pointermove', ev => {
    // Handle panning
    if (panning) {
      pan.x = savedPan.x + (ev.clientX - panStart.x);
      pan.y = savedPan.y + (ev.clientY - panStart.y);
      applyTransform();
      return;
    }

    // Handle selection rectangle resizing
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

  // pointerup ends panning, selection, drawing
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

    if (isDrawing) {
      endDraw();
    }
  });

  /**
   * Spacebar toggles panning mode.
   *
   * CHANGE WHAT?
   * - If you want middle-mouse pan instead, you’d add mousedown logic.
   */
  window.addEventListener('keydown', ev => {
    if (ev.code === 'Space') {
      spaceDown = true;
      viewport.style.cursor = 'grab';
      ev.preventDefault(); // prevents page scrolling
    }
  });

  window.addEventListener('keyup', ev => {
    if (ev.code === 'Space') {
      spaceDown = false;
      viewport.style.cursor = 'default';
    }
  });

  // -------------------------
  // Object selection model
  // -------------------------
  // selectedSet holds selected DOM nodes
  // selectionOrder preserves selection order (useful for group operations)
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
    for (const e of Array.from(selectedSet)) {
      e.classList.remove('selected');
    }
    selectedSet.clear();
    selectionOrder = [];
  }

  function getSelectionArray() {
    return Array.from(selectionOrder);
  }

  /**
   * Select a single object.
   * - append=false: clear old selection and select only this
   * - append=true: toggle selection membership
   */
  function selectObjectSingle(el, append = false) {
    if (append) {
      if (selectedSet.has(el)) {
        removeFromSelection(el);
      } else {
        addToSelection(el);
      }
    } else {
      clearSelection();
      if (el) addToSelection(el);
    }
  }

  // -------------------------
  // Style application helpers
  // -------------------------
  // These apply styles to selected objects; if none selected, update defaults.

  function applyFontColor(color) {
    if (selectedSet.size > 0) {
      for (const el of getSelectionArray()) {
        const c = el.querySelector('.content');
        if (c) c.style.color = color;
      }
    } else {
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
        if (el.classList.contains('rect') ||
          el.classList.contains('circle')) {
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
        if (el.classList.contains('rect') ||
          el.classList.contains('circle')) {
          el.style.borderColor = color;
        }
      }
    } else {
      defaultShapeBorder = color;
    }
  }

  // Wire style inputs
  fontColorInput.addEventListener('input', e => applyFontColor(e.target.value));
  fontSizeInput.addEventListener('input', e => applyFontSize(e.target.value));
  shapeFillInput.addEventListener('input', e => applyShapeFill(e.target.value));
  shapeBorderInput.addEventListener('input', e => applyShapeBorder(e.target.value));

  // -------------------------
  // Object creation
  // -------------------------
  /**
   * Create an object DOM element in the objects layer.
   *
   * CHANGE WHAT?
   * - Default sizes/positions here
   * - Default classes (rect/circle/text)
   */
  function createObject({ x = 120, y = 80, w = 220, h = 120, type = 'rect', html = '' } = {}) {
    const el = document.createElement('div');

    // Choose class based on type
    el.className = 'obj ' + (
      type === 'circle' ? 'circle' :
        type === 'text' ? 'text' :
          'rect'
    );

    // Assign unique ID
    el.dataset.objId = 'obj' + (objectCounter++);

    // Position and size
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';

    // Rotation stored in style + dataset
    el.style.transform = 'rotate(0deg)';
    el.dataset.angle = '0';

    // Z-index for stacking
    el.style.zIndex = ++zCounter;

    const content = document.createElement('div');
    content.className = 'content';

    // Type-specific initialization
    if (type === 'text') {
      content.innerHTML = html || 'Double-click to edit';
      content.style.color = defaultFontColor;
      content.style.fontSize = defaultFontSize + 'px';
    } else if (type === 'rect' || type === 'circle') {
      content.innerHTML = html || '';
      el.style.background = defaultShapeFill;
      el.style.borderColor = defaultShapeBorder;
    } else {
      content.innerHTML = html || '';
    }

    el.appendChild(content);

    // Handles
    const rotateHandle = document.createElement('div');
    rotateHandle.className = 'handle rotate';
    el.appendChild(rotateHandle);

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'handle resize';
    el.appendChild(resizeHandle);

    // Make interactive (drag/rotate/resize/edit)
    makeInteractiveObject(el, rotateHandle, resizeHandle);

    // Add to layer
    objectsLayer.appendChild(el);

    // Select newly created
    selectObjectSingle(el);

    return el;
  }

  // Toolbar create-button wiring
  document.getElementById('addRect').addEventListener('click', () => createObject({ type: 'rect' }));
  document.getElementById('addCircle').addEventListener('click', () => createObject({ type: 'circle', w: 140, h: 140 }));
  document.getElementById('addText').addEventListener('click', () => createObject({ type: 'text', w: 220, h: 80, html: 'Double-click to edit' }));

  document.getElementById('addImage').addEventListener('click', () => {
    // CHANGE WHAT?
    // - Replace prompt() with a custom modal if you want a better UX.
    const url = prompt('Image URL (direct):');
    if (!url) return;

    createObject({
      // Using rect container to hold image
      type: 'rect',
      w: 260,
      h: 160,
      html: `<img src="${url.replace(/"/g, '')}" alt="">`
    });
  });

  document.getElementById('dupBtn').addEventListener('click', () => duplicateSelected());

  clearAllBtn.addEventListener('click', () => {
    if (confirm('Remove all objects and drawings?')) {
      objectsLayer.innerHTML = '';

      // Clear canvas drawings
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

      clearSelection();
    }
  });

  // -------------------------
  // Selection rectangle finalize
  // -------------------------
  function finalizeSelectionRect(ev) {
    if (!selRect) return;

    const rectPage = selRect.getBoundingClientRect();
    const vpRect = viewport.getBoundingClientRect();

    // Convert selection rect from page-space into world-space
    const worldRect = {
      left: (rectPage.left - vpRect.left - pan.x) / scale,
      top: (rectPage.top - vpRect.top - pan.y) / scale,
      right: (rectPage.right - vpRect.left - pan.x) / scale,
      bottom: (rectPage.bottom - vpRect.top - pan.y) / scale
    };

    const els = Array.from(objectsLayer.children)
      .filter(e => e.classList && e.classList.contains('obj'));

    // Shift key allows additive selection
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

      if (intersects) {
        addToSelection(el);
      }
    }
  }

  // -------------------------
  // Interactive object behaviors
  // -------------------------
  function makeInteractiveObject(el, rotateHandle, resizeHandle) {
    // ---- DRAGGING (move object or group) ----
    let dragging = false;
    let dragStart = null;
    let groupOrig = null;

    el.addEventListener('pointerdown', ev => {
      // Only left mouse button
      if (ev.button && ev.button !== 0) return;

      // Ignore if user grabbed rotate/resize handles
      if (ev.target === rotateHandle || ev.target === resizeHandle) return;

      ev.stopPropagation();

      // SHIFT-click toggles selection membership
      if (ev.shiftKey) {
        selectObjectSingle(el, true);
      } else if (!selectedSet.has(el)) {
        selectObjectSingle(el, false);
      }

      if (el.setPointerCapture) el.setPointerCapture(ev.pointerId);

      dragging = true;
      dragStart = { x: ev.clientX, y: ev.clientY };

      // Save all selected objects original positions for group move
      groupOrig = getSelectionArray().map(o => ({
        el: o,
        left: parseFloat(o.style.left),
        top: parseFloat(o.style.top)
      }));
    });

    window.addEventListener('pointermove', ev => {
      if (!dragging) return;

      const dxpx = ev.clientX - dragStart.x;
      const dypx = ev.clientY - dragStart.y;

      // Convert screen pixels to world movement using scale
      const dx = dxpx / scale;
      const dy = dypx / scale;

      for (const o of groupOrig) {
        let nx = o.left + dx;
        let ny = o.top + dy;

        // Snap to grid if enabled
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

      // Ensure object is selected
      if (!selectedSet.has(el)) {
        clearSelection();
        addToSelection(el);
      }
    });

    window.addEventListener('pointermove', ev => {
      if (!resizing) return;

      const dxpx = ev.clientX - rStart.x;
      const dypx = ev.clientY - rStart.y;

      const dx = dxpx / scale;
      const dy = dypx / scale;

      // Minimum sizes
      let nw = Math.max(20, rOrig.w + dx);
      let nh = Math.max(12, rOrig.h + dy);

      // Snap sizes
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
      if (resizeHandle.releasePointerCapture) {
        resizeHandle.releasePointerCapture(ev.pointerId);
      }
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

      // Center point in page coords
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // Convert center to world coords
      rotateCenter = pageToWorld(cx, cy);

      rotateStartAngle = parseFloat(el.dataset.angle || '0');

      // Starting pointer angle
      const p = pageToWorld(ev.clientX, ev.clientY);
      rotateStartPointerDeg =
        Math.atan2(p.y - rotateCenter.y, p.x - rotateCenter.x) * 180 / Math.PI;

      // Ensure selected
      if (!selectedSet.has(el)) {
        clearSelection();
        addToSelection(el);
      }
    });

    window.addEventListener('pointermove', ev => {
      if (!rotating) return;

      const p = pageToWorld(ev.clientX, ev.clientY);
      const pointerDeg =
        Math.atan2(p.y - rotateCenter.y, p.x - rotateCenter.x) * 180 / Math.PI;

      let delta = pointerDeg - rotateStartPointerDeg;

      // NOTE: +90 is a “visual alignment offset” here.
      // CHANGE WHAT?
      // - If rotation feels “off” for you, adjust/remove this.
      let newAngle = rotateStartAngle + delta + 90;

      if (snapToggle.checked) newAngle = snapAngle(newAngle);

      el.style.transform = `rotate(${newAngle}deg)`;
      el.dataset.angle = String(newAngle);
    });

    window.addEventListener('pointerup', ev => {
      if (!rotating) return;
      rotating = false;
      if (rotateHandle.releasePointerCapture) {
        rotateHandle.releasePointerCapture(ev.pointerId);
      }
    });

    // ---- TEXT EDITING on double click ----
    el.addEventListener('dblclick', () => {
      if (!el.classList.contains('text')) return;
      const c = el.querySelector('.content');
      if (!c) return;

      // Make editable
      c.contentEditable = true;
      c.focus();

      // Save on blur
      c.addEventListener('blur', () => {
        c.contentEditable = false;
      }, { once: true });
    });

    // ---- Click selection ----
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      const append = ev.shiftKey;
      selectObjectSingle(el, append);
    });
  }

  // -------------------------
  // Duplication & deletion
  // -------------------------
  function duplicateSelected() {
    const sel = getSelectionArray();
    if (sel.length === 0) return;

    clearSelection();

    for (const el of sel) {
      // Clone node including handles and content
      const clone = el.cloneNode(true);
      clone.dataset.objId = 'obj' + (objectCounter++);

      // Offset so user sees it duplicated
      const left = parseFloat(el.style.left || '0') + 20;
      const top = parseFloat(el.style.top || '0') + 20;

      clone.style.left = left + 'px';
      clone.style.top = top + 'px';
      clone.style.zIndex = ++zCounter;

      // Re-ensure handles exist
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

      // IMPORTANT: re-wire events for the clone
      makeInteractiveObject(clone, rotateHandle, resizeHandle);

      objectsLayer.appendChild(clone);
      addToSelection(clone);
    }
  }

  function deleteSelected() {
    const sel = getSelectionArray();
    if (sel.length === 0) return;
    for (const el of sel) el.remove();
    clearSelection();
  }

  // Clicking empty stage clears selection (only when NOT in drawing mode)
  viewport.addEventListener('pointerdown', ev => {
    if (ev.target === viewport || ev.target === world || ev.target === drawingCanvas) {
      if (drawMode !== 'pen' && drawMode !== 'highlighter' && drawMode !== 'eraser') {
        clearSelection();
      }
    }
  });

  // -------------------------
  // Export / Import JSON
  // -------------------------
  exportJSONBtn.addEventListener('click', () => {
    // Export only objects (DOM elements), not canvas strokes.
    // If you want to export drawings too, you’d also export:
    // drawingCanvas.toDataURL() OR raw bitmap data (advanced).
    const out = [];

    for (const el of objectsLayer.children) {
      if (!el.classList || !el.classList.contains('obj')) continue;

      const content = el.querySelector('.content');

      out.push({
        id: el.dataset.objId,
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

    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);

    // CHANGE THIS filename if you want a different export name
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

        objectsLayer.innerHTML = '';
        clearSelection();

        for (const item of data) {
          const el = createObject({
            x: item.left,
            y: item.top,
            w: item.width,
            h: item.height,
            type: item.type,
            html: item.html
          });

          // Restore z-index, rotation, styles
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
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(f);

    // Reset file input so importing same file again triggers change event
    ev.target.value = '';
  });

  // -------------------------
  // Grid toggle
  // -------------------------
  toggleGridBtn.addEventListener('click', () => {
    const showGrid = !world.classList.contains('grid');

    // NOTE: this toggles visual grid only.
    // snapping is controlled by snapToggle + gridSizeSelect.
    if (showGrid) {
      world.classList.add('grid');
      world.classList.remove('nogrid');
    } else {
      world.classList.remove('grid');
      world.classList.add('nogrid');
    }
  });

  // -------------------------
  // Guide visibility (help panel)
  // -------------------------
  const GUIDE_KEY = 'wb_guide_style_v1';
  let guideState = { open: true };

  try {
    const saved = localStorage.getItem(GUIDE_KEY);
    if (saved) guideState = JSON.parse(saved);
  } catch (e) {
    // ignore parse errors
  }

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
    // Currently collapse = hide (same as close)
    // If you want true "collapsed bubble", apply .guide.collapsed class instead.
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

  // -------------------------
  // Keyboard shortcuts
  // -------------------------
  window.addEventListener('keydown', ev => {
    // Duplicate: Ctrl/Cmd + D
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd') {
      duplicateSelected();
      ev.preventDefault();
    }

    // Delete: Del or Backspace
    // CHANGE WHAT?
    // - If you want Backspace to NOT delete (to avoid accidental deletions),
    //   remove 'Backspace' from this condition.
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      deleteSelected();
      ev.preventDefault();
    }
  });

  // -------------------------
  // Touch behavior: prevent scrolling on touch draw
  // -------------------------
  document.body.addEventListener('touchstart', e => {
    if (e.target.closest('.world')) e.preventDefault();
  }, { passive: false });

  document.body.addEventListener('touchmove', e => {
    if (e.target.closest('.world')) e.preventDefault();
  }, { passive: false });

  // -------------------------
  // Initial demo objects
  // -------------------------
  // CHANGE WHAT?
  // - Remove these three calls if you want empty board on start.
  // - Or add your own branded starter layout.
  createObject({ x: 80, y: 60, w: 260, h: 150, type: 'rect' });
  createObject({ x: 420, y: 120, w: 160, h: 160, type: 'circle' });
  createObject({
    x: 120, y: 320, w: 260, h: 110, type: 'text',
    html: 'Double-click to edit'
  });

  // Ensure sized correctly
  resizeWorld();
  applyTransform();
  setActiveTool('pen'); // default tool on load
})();
