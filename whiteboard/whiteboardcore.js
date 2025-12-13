
    (function whiteboardCoreModule() {
      // -------------
      // DOM References
      // -------------
      const viewport = document.getElementById('viewport');
      const world = document.getElementById('world');
      const objectsLayer = document.getElementById('objectsLayer');
      const drawingCanvas = document.getElementById('drawing');
      const selRect = document.getElementById('selRect');
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

      // Style controls
      const fontColorInput = document.getElementById('fontColor');
      const fontSizeInput = document.getElementById('fontSize');
      const shapeFillInput = document.getElementById('shapeFill');
      const shapeBorderInput = document.getElementById('shapeBorder');

      // -------------------------
      // Default style values
      // -------------------------
      let defaultFontColor = fontColorInput.value || '#000000';
      let defaultFontSize = Number(fontSizeInput.value) || 16;
      let defaultShapeFill = shapeFillInput.value || 'teal';
      let defaultShapeBorder = shapeBorderInput.value || 'red';

      // -------------------------
      // World sizing & transform
      // -------------------------
      let worldW = 2400;
      let worldH = 1600;
      let pan = { x: 0, y: 0 };
      let scale = 1;

      /**
       * Resize world based on viewport size.
       * We make it at least a minimum width/height for comfortable drawing.
       */
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
        drawingCanvas.style.width = worldW + 'px';
        drawingCanvas.style.height = worldH + 'px';
      }

      /**
       * Apply pan & scale to world element.
       */
      function applyTransform() {
        world.style.transform =
          `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
      }

      /**
       * Convert page (client) coords to world coords (inside the big drawing area).
       */
      function pageToWorld(clientX, clientY) {
        const r = viewport.getBoundingClientRect();
        const x = (clientX - r.left - pan.x) / scale;
        const y = (clientY - r.top - pan.y) / scale;
        return { x, y };
      }

      /**
       * Convert world coords to page (client) coords. (Sometimes useful.)
       */
      function worldToPage(wx, wy) {
        const r = viewport.getBoundingClientRect();
        return {
          x: r.left + pan.x + wx * scale,
          y: r.top + pan.y + wy * scale
        };
      }

      /**
       * Snap a numeric value to grid if snap is enabled.
       */
      function snapValue(v) {
        if (!snapToggle.checked) return v;
        const g = parseInt(gridSizeSelect.value, 10) || 12;
        return Math.round(v / g) * g;
      }

      /**
       * Snap angle to 15-degree increments if snap is enabled.
       */
      function snapAngle(a) {
        if (!snapToggle.checked) return a;
        const step = 15;
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
      // Drawing tools (pen, highlighter, eraser, select)
      // -------------------------
      let drawMode = 'pen'; // 'pen' | 'highlighter' | 'eraser' | 'select'

      /**
       * Set active drawing tool and adjust UI accordingly.
       */
      function setActiveTool(tool) {
        drawMode = tool;

        // Toggle active class on tool buttons
        [penToolBtn, highlighterToolBtn, eraserToolBtn, selectToolBtn]
          .forEach(b => b.classList.remove('active'));

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

      function startDrawAt(worldPt) {
        isDrawing = true;
        lastPoint = worldPt;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(worldPt.x, worldPt.y);

        // While actually erasing, hide the overlay cursor so user sees erasure clearly
        if (drawMode === 'eraser') {
          hideEraserCursorTemporarily();
        }
      }

      function continueDrawTo(worldPt) {
        if (!isDrawing || !lastPoint) return;

        const size = Number(penSize.value);

        if (drawMode === 'eraser') {
          // Erase using destination-out
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = size;
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.lineTo(worldPt.x, worldPt.y);
          ctx.stroke();
          ctx.restore();
        }
       
        
        




        

        else if (drawMode === 'highlighter') {
          console.log("HIGHLIGHTER ACTIVE");

  ctx.save();

  ctx.globalCompositeOperation = 'source-over';

  // Base marker stroke
  ctx.globalAlpha = 0.55;

  ctx.lineWidth = size * 2.6;
  ctx.strokeStyle = 'rgba(255, 245, 0, 1)';
  ctx.lineCap = 'butt';

  // Soft bleed (THIS is the visible boost)
  ctx.shadowColor = 'rgba(255, 245, 0, 0.6)';
  ctx.shadowBlur = size * 1.2;


  ctx.lineTo(worldPt.x, worldPt.y);
  ctx.stroke();

  ctx.restore();
}



        else if (drawMode === 'pen') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Number(penOpacity.value);
          ctx.lineWidth = size;
          ctx.strokeStyle = penColor.value;
          ctx.lineTo(worldPt.x, worldPt.y);
          ctx.stroke();
          ctx.restore();
        }

        lastPoint = worldPt;
      }

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

      function updateEraserCursorVisibility() {
        if (drawMode === 'eraser' &&
          lastPointerInViewport &&
          !eraserHiddenTemporarily) {
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
        // Eraser size in world units; convert to display size using scale
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

      // Global pointermove: handle eraser cursor position + canvas drawing
      window.addEventListener('pointermove', ev => {
        if (eraserVisible || (drawMode === 'eraser' && lastPointerInViewport)) {
          positionEraserCursor(ev.clientX, ev.clientY);
        }

        if (isDrawing) {
          const wpt = pageToWorld(ev.clientX, ev.clientY);
          continueDrawTo(wpt);
        }
      });

      // Pen size change: cursor will update on next pointermove; nothing to do here
      penSize.addEventListener('input', () => { /* no-op; visual updates automatically */ });

      // -------------------------
      // Panning & selection box
      // -------------------------
      let spaceDown = false;
      let panning = false;
      let panStart = null;
      let savedPan = null;

      let selecting = false;
      let selStart = null;

      viewport.addEventListener('pointerdown', ev => {
        viewport.focus();

        // Holding space = pan mode
        if (spaceDown) {
          panning = true;
          panStart = { x: ev.clientX, y: ev.clientY };
          savedPan = { x: pan.x, y: pan.y };
          viewport.style.cursor = 'grabbing';
          ev.preventDefault();
          return;
        }

        // Selection rectangle when in "select" mode and clicking on empty area
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

        // If a drawing tool is active, start drawing
        if (drawMode === 'pen' ||
          drawMode === 'highlighter' ||
          drawMode === 'eraser') {
          const wpt = pageToWorld(ev.clientX, ev.clientY);
          startDrawAt(wpt);
          ev.preventDefault();
        }
      });

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

      // Spacebar toggles panning mode
      window.addEventListener('keydown', ev => {
        if (ev.code === 'Space') {
          spaceDown = true;
          viewport.style.cursor = 'grab';
          ev.preventDefault();
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
      let selectedSet = new Set();
      let selectionOrder = [];  // preserve order of selection
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
       * - If append is false: clear old selection and select only this.
       * - If append is true: toggle this element in the selection set.
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
      function applyFontColor(color) {
        if (selectedSet.size > 0) {
          for (const el of getSelectionArray()) {
            const c = el.querySelector('.content');
            if (c) c.style.color = color;
          }
        } else {
          // If nothing selected, change the default for future text objects
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
      function createObject({ x = 120, y = 80, w = 220, h = 120, type = 'rect', html = '' } = {}) {
        const el = document.createElement('div');

        // Base classes
        el.className = 'obj ' + (
          type === 'circle' ? 'circle' :
            type === 'text' ? 'text' :
              'rect'
        );

        el.dataset.objId = 'obj' + (objectCounter++);
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        el.style.transform = 'rotate(0deg)';
        el.style.zIndex = ++zCounter;
        el.dataset.angle = '0';

        const content = document.createElement('div');
        content.className = 'content';

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

        // Rotate + resize handles
        const rotateHandle = document.createElement('div');
        rotateHandle.className = 'handle rotate';
        el.appendChild(rotateHandle);

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'handle resize';
        el.appendChild(resizeHandle);

        makeInteractiveObject(el, rotateHandle, resizeHandle);
        objectsLayer.appendChild(el);

        // Select newly created object
        selectObjectSingle(el);

        return el;
      }

      // Toolbar create-button wiring
      document.getElementById('addRect').addEventListener('click', () => createObject({ type: 'rect' }));
      document.getElementById('addCircle').addEventListener('click', () => createObject({ type: 'circle', w: 140, h: 140 }));
      document.getElementById('addText').addEventListener('click', () => createObject({ type: 'text', w: 220, h: 80, html: 'Double-click to edit' }));
      document.getElementById('addImage').addEventListener('click', () => {
        const url = prompt('Image URL (direct):');
        if (!url) return;
        createObject({
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

        // Convert selection rectangle (page space) into world space
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

          if (intersects) {
            addToSelection(el);
          }
        }
      }

      // -------------------------
      // Interactive object behaviors
      // (drag, resize, rotate, double-click edit, click select)
      // -------------------------
      function makeInteractiveObject(el, rotateHandle, resizeHandle) {
        // ---- Dragging (move object or selection group) ----
        let dragging = false;
        let dragStart = null;
        let groupOrig = null;

        el.addEventListener('pointerdown', ev => {
          // Only left button
          if (ev.button && ev.button !== 0) return;

          if (ev.target === rotateHandle || ev.target === resizeHandle) return;

          ev.stopPropagation();

          // Selection behavior: shift-click toggles in selection, otherwise single select
          if (ev.shiftKey) {
            selectObjectSingle(el, true);
          } else if (!selectedSet.has(el)) {
            selectObjectSingle(el, false);
          }

          if (el.setPointerCapture) el.setPointerCapture(ev.pointerId);

          dragging = true;
          dragStart = { x: ev.clientX, y: ev.clientY };

          // Capture original positions of all selected objects for group move
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

          const dx = dxpx / scale;
          const dy = dypx / scale;

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
        });

        // ---- Resizing (bottom-right handle) ----
        let resizing = false;
        let rStart = null;
        let rOrig = null;

        resizeHandle.addEventListener('pointerdown', ev => {
          ev.stopPropagation();
          if (el.setPointerCapture) el.setPointerCapture(ev.pointerId);

          resizing = true;
          rStart = { x: ev.clientX, y: ev.clientY };
          rOrig = { w: el.offsetWidth, h: el.offsetHeight };

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
          if (resizeHandle.releasePointerCapture) {
            resizeHandle.releasePointerCapture(ev.pointerId);
          }
        });

        // ---- Rotating (top handle) ----
        let rotating = false;
        let rotateStartPointerDeg = 0;
        let rotateStartAngle = 0;
        let rotateCenter = null;

        rotateHandle.addEventListener('pointerdown', ev => {
          ev.stopPropagation();
          if (el.setPointerCapture) el.setPointerCapture(ev.pointerId);

          rotating = true;

          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;

          rotateCenter = pageToWorld(cx, cy);
          rotateStartAngle = parseFloat(el.dataset.angle || '0');

          const p = pageToWorld(ev.clientX, ev.clientY);
          rotateStartPointerDeg =
            Math.atan2(p.y - rotateCenter.y, p.x - rotateCenter.x) * 180 / Math.PI;

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

        // ---- Text edit on double-click ----
        el.addEventListener('dblclick', () => {
          if (!el.classList.contains('text')) return;
          const c = el.querySelector('.content');
          if (!c) return;
          c.contentEditable = true;
          c.focus();
          c.addEventListener('blur', () => {
            c.contentEditable = false;
          }, { once: true });
        });

        // ---- Click selection (single-click) ----
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
          const clone = el.cloneNode(true);
          clone.dataset.objId = 'obj' + (objectCounter++);

          const left = parseFloat(el.style.left || '0') + 20;
          const top = parseFloat(el.style.top || '0') + 20;

          clone.style.left = left + 'px';
          clone.style.top = top + 'px';
          clone.style.zIndex = ++zCounter;

          // Ensure handles exist & re-wire interaction
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

          makeInteractiveObject(clone, rotateHandle, resizeHandle);
          objectsLayer.appendChild(clone);
          addToSelection(clone);
        }
      }

      function deleteSelected() {
        const sel = getSelectionArray();
        if (sel.length === 0) return;
        for (const el of sel) {
          el.remove();
        }
        clearSelection();
      }

      // Clicking on empty stage: clear selection (when not drawing)
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
        ev.target.value = ''; // reset file input
      });

      // -------------------------
      // Grid toggle
      // -------------------------
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

      // -------------------------
      // Guide visibility (help panel)
      // -------------------------
      const GUIDE_KEY = 'wb_guide_style_v1';
      let guideState = { open: true };

      try {
        const saved = localStorage.getItem(GUIDE_KEY);
        if (saved) {
          guideState = JSON.parse(saved);
        }
      } catch (e) {
        // ignore parse errors and use defaults
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
        // Here we simply hide it; you can later add a "collapsed bubble" style if you want.
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

        // Delete selected (Del or Backspace)
        if (ev.key === 'Delete' || ev.key === 'Backspace') {
          deleteSelected();
          ev.preventDefault();
        }
      });

      // -------------------------
      // Touch behavior: prevent scrolling when drawing on world
      // -------------------------
      document.body.addEventListener('touchstart', e => {
        if (e.target.closest('.world')) e.preventDefault();
      }, { passive: false });

      document.body.addEventListener('touchmove', e => {
        if (e.target.closest('.world')) e.preventDefault();
      }, { passive: false });

      // -------------------------
      // Initial demo objects (for a friendly starting state)
      // -------------------------
      createObject({ x: 80, y: 60, w: 260, h: 150, type: 'rect' });
      createObject({ x: 420, y: 120, w: 160, h: 160, type: 'circle' });
      createObject({
        x: 120, y: 320, w: 260, h: 110, type: 'text',
        html: 'Double-click to edit'
      });

      // Ensure world sized correctly relative to viewport
      resizeWorld();
      applyTransform();
      setActiveTool('pen'); // default tool
    })();
  