// ====== BASIC SETUP ======
const canvas = document.getElementById("whiteboard");
const ctx = canvas.getContext("2d");
const boardWrapper = document.getElementById("board-wrapper");

// Toolbar elements
const penBtn = document.getElementById("penBtn");
const eraserBtn = document.getElementById("eraserBtn");
const highlighterBtn = document.getElementById("highlighterBtn");
const lineBtn = document.getElementById("lineBtn");
const rectBtn = document.getElementById("rectBtn");
const circleBtn = document.getElementById("circleBtn");
const textBtn = document.getElementById("textBtn");
const selectBtn = document.getElementById("selectBtn");
const pointerBtn = document.getElementById("pointerBtn");
const fillToggleBtn = document.getElementById("fillToggleBtn");
const colorPicker = document.getElementById("colorPicker");
const sizePicker = document.getElementById("sizePicker");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const saveJsonBtn = document.getElementById("saveJsonBtn");
const loadJsonBtn = document.getElementById("loadJsonBtn");
const jsonFileInput = document.getElementById("jsonFileInput");
const clearBtn = document.getElementById("clearBtn");
const helpBtn = document.getElementById("helpBtn");
const helpOverlay = document.getElementById("helpOverlay");
const helpCloseBtn = document.getElementById("helpCloseBtn");

// State
let currentTool = "pen"; 
// 'pen' | 'eraser' | 'highlighter' | 'line' | 'rect' | 'circle' | 'text' | 'select' | 'pointer'

let fillMode = false;
let painting = false;

let startX = 0;
let startY = 0;

let currentObject = null;       // object being drawn
let objects = [];               // scene graph
let history = [];               // undo history snapshots
let redoStack = [];             // redo snapshots

let editingTextOverlay = null;  // { element, x, y, fontSize, mode, index }

// Selection & resize
let selectedIndex = -1;
let draggingSelected = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

let resizingSelected = false;
let resizeHandleCorner = null;
let resizeOriginalBox = null;
let resizeOriginalObj = null;

const HANDLE_RADIUS = 7;
const AUTOSAVE_KEY = "pp_whiteboard_scene";

// ====== RESIZE CANVAS ======
function resizeCanvas() {
    const toolbarWidth = document.getElementById("toolbar").offsetWidth;
    canvas.width = window.innerWidth - toolbarWidth;
    canvas.height = window.innerHeight;
    redrawAll();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ====== HISTORY & AUTOSAVE ======
function saveState() {
    const snapshot = JSON.stringify(objects);
    history.push(snapshot);
    if (history.length > 150) history.shift();
    redoStack = [];

    try {
        localStorage.setItem(AUTOSAVE_KEY, snapshot);
    } catch (e) {
        // ignore
    }
}

function loadStateFromSnapshot(snapshot) {
    try {
        objects = JSON.parse(snapshot) || [];
    } catch (e) {
        objects = [];
    }
    selectedIndex = -1;
    draggingSelected = false;
    resizingSelected = false;
    redrawAll();
}

function undo() {
    if (history.length > 1) {
        const last = history.pop();
        redoStack.push(last);
        const prev = history[history.length - 1];
        loadStateFromSnapshot(prev);
    }
}

function redo() {
    if (redoStack.length > 0) {
        const snap = redoStack.pop();
        history.push(snap);
        loadStateFromSnapshot(snap);
    }
}

// ====== DRAWING ======
function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    objects.forEach(drawObject);
    drawSelectionOutline();
}

function drawObject(obj) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (obj.type === "pen") {
        ctx.strokeStyle = obj.eraser ? "#ffffff" : obj.color;
        ctx.lineWidth = obj.size;
        ctx.beginPath();
        if (obj.points.length > 0) {
            ctx.moveTo(obj.points[0].x, obj.points[0].y);
            for (let i = 1; i < obj.points.length; i++) {
                ctx.lineTo(obj.points[i].x, obj.points[i].y);
            }
        }
        ctx.stroke();
    }

    if (obj.type === "highlighter") {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = obj.size;
        ctx.beginPath();
        if (obj.points.length > 0) {
            ctx.moveTo(obj.points[0].x, obj.points[0].y);
            for (let i = 1; i < obj.points.length; i++) {
                ctx.lineTo(obj.points[i].x, obj.points[i].y);
            }
        }
        ctx.stroke();
    }

    if (obj.type === "line") {
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = obj.size;
        ctx.beginPath();
        ctx.moveTo(obj.x1, obj.y1);
        ctx.lineTo(obj.x2, obj.y2);
        ctx.stroke();
    }

    if (obj.type === "rect") {
        ctx.strokeStyle = obj.color;
        ctx.fillStyle = obj.color;
        ctx.lineWidth = obj.size;

        const x = obj.w >= 0 ? obj.x : obj.x + obj.w;
        const y = obj.h >= 0 ? obj.y : obj.y + obj.h;
        const w = Math.abs(obj.w);
        const h = Math.abs(obj.h);

        if (obj.fill) ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
    }

    if (obj.type === "circle") {
        ctx.strokeStyle = obj.color;
        ctx.fillStyle = obj.color;
        ctx.lineWidth = obj.size;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
        if (obj.fill) ctx.fill();
        ctx.stroke();
    }

    if (obj.type === "text") {
        ctx.fillStyle = obj.color;
        const fontSize = obj.size || 18;
        ctx.font = fontSize + "px system-ui, sans-serif";
        ctx.textBaseline = "top";
        const lines = obj.text.split("\n");
        const lineHeight = fontSize * 1.3;
        lines.forEach((line, index) => {
            ctx.fillText(line, obj.x, obj.y + index * lineHeight);
        });
    }

    ctx.restore();
}

// ====== BOUNDING & HIT TESTING ======
function getBoundingBox(obj) {
    if (obj.type === "pen" || obj.type === "highlighter") {
        if (!obj.points || obj.points.length === 0) {
            return { x: 0, y: 0, w: 0, h: 0 };
        }
        let minX = obj.points[0].x;
        let minY = obj.points[0].y;
        let maxX = obj.points[0].x;
        let maxY = obj.points[0].y;
        for (let p of obj.points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    if (obj.type === "line") {
        const x = Math.min(obj.x1, obj.x2);
        const y = Math.min(obj.y1, obj.y2);
        const w = Math.abs(obj.x2 - obj.x1);
        const h = Math.abs(obj.y2 - obj.y1);
        return { x, y, w, h };
    }

    if (obj.type === "rect") {
        const x = obj.w >= 0 ? obj.x : obj.x + obj.w;
        const y = obj.h >= 0 ? obj.y : obj.y + obj.h;
        const w = Math.abs(obj.w);
        const h = Math.abs(obj.h);
        return { x, y, w, h };
    }

    if (obj.type === "circle") {
        return { x: obj.x - obj.radius, y: obj.y - obj.radius, w: obj.radius * 2, h: obj.radius * 2 };
    }

    if (obj.type === "text") {
        const fontSize = obj.size || 18;
        ctx.save();
        ctx.font = fontSize + "px system-ui, sans-serif";
        const lines = obj.text.split("\n");
        const lineHeight = fontSize * 1.3;
        let maxWidth = 0;
        lines.forEach(line => {
            const w = ctx.measureText(line).width;
            if (w > maxWidth) maxWidth = w;
        });
        ctx.restore();
        return { x: obj.x, y: obj.y, w: maxWidth, h: lines.length * lineHeight };
    }

    return { x: 0, y: 0, w: 0, h: 0 };
}

function pointInPenStroke(obj, x, y) {
    if (!obj.points || obj.points.length < 2) return false;
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = obj.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(obj.points[0].x, obj.points[0].y);
    for (let i = 1; i < obj.points.length; i++) {
        ctx.lineTo(obj.points[i].x, obj.points[i].y);
    }
    const hit = ctx.isPointInStroke(x, y);
    ctx.restore();
    return hit;
}

function pointInObject(obj, x, y) {
    if (obj.type === "pen") {
        return pointInPenStroke(obj, x, y);
    }

    if (obj.type === "line") {
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = obj.size;
        ctx.moveTo(obj.x1, obj.y1);
        ctx.lineTo(obj.x2, obj.y2);
        const hit = ctx.isPointInStroke(x, y);
        ctx.restore();
        return hit;
    }

    if (obj.type === "rect") {
        const box = getBoundingBox(obj);
        return x >= box.x && x <= box.x + box.w &&
               y >= box.y && y <= box.y + box.h;
    }

    if (obj.type === "circle") {
        const dx = x - obj.x;
        const dy = y - obj.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        return dist <= obj.radius + obj.size / 2;
    }

    if (obj.type === "text") {
        const box = getBoundingBox(obj);
        return x >= box.x && x <= box.x + box.w &&
               y >= box.y && y <= box.y + box.h;
    }

    // highlighter non-selectable
    return false;
}

function hitTest(x, y) {
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (obj.type === "highlighter") continue;
        if (pointInObject(obj, x, y)) return i;
    }
    return -1;
}

// ====== SELECTION OUTLINE & HANDLES ======
function getHandlePositions(box) {
    return [
        { x: box.x,         y: box.y,         corner: "tl" },
        { x: box.x + box.w, y: box.y,         corner: "tr" },
        { x: box.x + box.w, y: box.y + box.h, corner: "br" },
        { x: box.x,         y: box.y + box.h, corner: "bl" }
    ];
}

function drawSelectionOutline() {
    if (selectedIndex < 0 || selectedIndex >= objects.length) return;

    const obj = objects[selectedIndex];
    const box = getBoundingBox(obj);
    if (box.w === 0 && box.h === 0) return;

    // soft glow rectangle
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(25,118,210,0.9)";
    ctx.shadowColor = "rgba(25,118,210,0.4)";
    ctx.shadowBlur = 8;
    ctx.strokeRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
    ctx.restore();

    // round blue handles
    const handles = getHandlePositions(box);
    ctx.save();
    handles.forEach(h => {
        ctx.beginPath();
        ctx.arc(h.x, h.y, HANDLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#1976d2";
        ctx.stroke();
    });
    ctx.restore();
}

function hitTestHandle(x, y) {
    if (selectedIndex < 0 || selectedIndex >= objects.length) return null;
    const box = getBoundingBox(objects[selectedIndex]);
    const handles = getHandlePositions(box);
    for (let h of handles) {
        const dx = x - h.x;
        const dy = y - h.y;
        if (dx*dx + dy*dy <= HANDLE_RADIUS*HANDLE_RADIUS) {
            return h.corner;
        }
    }
    return null;
}

// ====== TOOL UI ======
function clearActiveTools() {
    document.querySelectorAll(".tool-btn").forEach(btn =>
        btn.classList.remove("active")
    );
}

function setActiveTool(tool) {
    currentTool = tool;
    clearActiveTools();

    if (tool === "pen") penBtn.classList.add("active");
    if (tool === "eraser") eraserBtn.classList.add("active");
    if (tool === "highlighter") highlighterBtn.classList.add("active");
    if (tool === "line") lineBtn.classList.add("active");
    if (tool === "rect") rectBtn.classList.add("active");
    if (tool === "circle") circleBtn.classList.add("active");
    if (tool === "text") textBtn.classList.add("active");
    if (tool === "select") selectBtn.classList.add("active");
    if (tool === "pointer") pointerBtn.classList.add("active");

    updateFillToggleButton();

    if (tool === "select") {
        canvas.style.cursor = "default";
    } else if (tool === "pointer") {
        canvas.style.cursor = "pointer";
    } else {
        canvas.style.cursor = "crosshair";
    }
}

function updateFillToggleButton() {
    fillToggleBtn.textContent = fillMode ? "🔳" : "🔲";
    if (fillMode) fillToggleBtn.classList.add("active");
    else fillToggleBtn.classList.remove("active");
}
updateFillToggleButton();

// ====== COORDINATES ======
function getPos(evt) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (evt.touches && evt.touches[0]) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
    } else {
        clientX = evt.clientX;
        clientY = evt.clientY;
    }
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

// ====== TEXT OVERLAY ======
function createTextOverlay(x, y, existingObj = null, index = null) {
    finishTextEdit();

    const textarea = document.createElement("textarea");
    textarea.className = "text-input-overlay";
    textarea.style.left = x + "px";
    textarea.style.top = y + "px";

    let fontSize;
    if (existingObj) {
        textarea.value = existingObj.text || "";
        fontSize = existingObj.size || 18;
        textarea.style.fontSize = fontSize + "px";
        textarea.style.color = existingObj.color || "#000000";
        colorPicker.value = existingObj.color || colorPicker.value;
    } else {
        const baseSize = 10;
        fontSize = baseSize + parseInt(sizePicker.value || "4", 10);
        textarea.style.fontSize = fontSize + "px";
        textarea.style.color = colorPicker.value;
    }

    boardWrapper.appendChild(textarea);
    textarea.focus();

    textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            finishTextEdit();
        }
    });

    textarea.addEventListener("blur", () => {
        finishTextEdit();
    });

    editingTextOverlay = {
        element: textarea,
        x,
        y,
        fontSize,
        mode: existingObj ? "edit" : "new",
        index
    };
}

function finishTextEdit() {
    if (!editingTextOverlay) return;

    const { element, x, y, fontSize, mode, index } = editingTextOverlay;
    const text = element.value.trim();
    element.remove();
    editingTextOverlay = null;

    if (!text) return;

    if (mode === "new") {
        const obj = {
            type: "text",
            x,
            y,
            text,
            color: colorPicker.value,
            size: fontSize
        };
        objects.push(obj);
        saveState();
        redrawAll();
    } else if (mode === "edit" && index != null && objects[index]) {
        const obj = objects[index];
        obj.text = text;
        obj.x = x;
        obj.y = y;
        obj.size = fontSize;
        obj.color = colorPicker.value;
        saveState();
        redrawAll();
    }
}

// ====== MOVE SELECTED OBJECT ======
function moveSelectedObject(targetX, targetY) {
    if (selectedIndex < 0 || selectedIndex >= objects.length) return;
    const obj = objects[selectedIndex];
    const box = getBoundingBox(obj);

    const newX = targetX - dragOffsetX;
    const newY = targetY - dragOffsetY;
    const dx = newX - box.x;
    const dy = newY - box.y;

    if (obj.type === "pen" || obj.type === "highlighter") {
        obj.points.forEach(p => {
            p.x += dx;
            p.y += dy;
        });
    } else if (obj.type === "line") {
        obj.x1 += dx; obj.y1 += dy;
        obj.x2 += dx; obj.y2 += dy;
    } else if (obj.type === "rect") {
        obj.x += dx;
        obj.y += dy;
    } else if (obj.type === "circle") {
        obj.x += dx;
        obj.y += dy;
    } else if (obj.type === "text") {
        obj.x += dx;
        obj.y += dy;
    }
}

// ====== RESIZE SELECTED OBJECT ======
function startResize(corner) {
    if (selectedIndex < 0 || selectedIndex >= objects.length) return;
    resizeHandleCorner = corner;
    resizeOriginalObj = JSON.parse(JSON.stringify(objects[selectedIndex]));
    resizeOriginalBox = getBoundingBox(resizeOriginalObj);
    resizingSelected = true;
}

function applyResizeAtPointer(x, y) {
    if (!resizingSelected || !resizeOriginalObj || !resizeOriginalBox) return;
    const obox = resizeOriginalBox;
    if (obox.w === 0 || obox.h === 0) return;

    let fixedX, fixedY;
    if (resizeHandleCorner === "tl") {
        fixedX = obox.x + obox.w; fixedY = obox.y + obox.h;
    } else if (resizeHandleCorner === "tr") {
        fixedX = obox.x;         fixedY = obox.y + obox.h;
    } else if (resizeHandleCorner === "br") {
        fixedX = obox.x;         fixedY = obox.y;
    } else if (resizeHandleCorner === "bl") {
        fixedX = obox.x + obox.w; fixedY = obox.y;
    } else {
        return;
    }

    const minSize = 10;
    const newX1 = Math.min(fixedX, x);
    const newY1 = Math.min(fixedY, y);
    const newW = Math.max(minSize, Math.abs(fixedX - x));
    const newH = Math.max(minSize, Math.abs(fixedY - y));

    const scaleX = newW / obox.w;
    const scaleY = newH / obox.h;
    const avgScale = (scaleX + scaleY) / 2;

    const obj0 = resizeOriginalObj;
    const obj = objects[selectedIndex];

    function tx(px) { return newX1 + (px - obox.x) * scaleX; }
    function ty(py) { return newY1 + (py - obox.y) * scaleY; }

    if (obj0.type === "pen" || obj0.type === "highlighter") {
        obj.points = obj0.points.map(p => ({ x: tx(p.x), y: ty(p.y) }));
        obj.size = obj0.size * avgScale;
    } else if (obj0.type === "line") {
        obj.x1 = tx(obj0.x1);
        obj.y1 = ty(obj0.y1);
        obj.x2 = tx(obj0.x2);
        obj.y2 = ty(obj0.y2);
        obj.size = obj0.size * avgScale;
    } else if (obj0.type === "rect") {
        obj.x = tx(obj0.x);
        obj.y = ty(obj0.y);
        obj.w = obj0.w * scaleX;
        obj.h = obj0.h * scaleY;
        obj.size = obj0.size * avgScale;
        obj.fill = obj0.fill;
        obj.color = obj0.color;
    } else if (obj0.type === "circle") {
        obj.x = tx(obj0.x);
        obj.y = ty(obj0.y);
        obj.radius = obj0.radius * avgScale;
        obj.size = obj0.size * avgScale;
        obj.color = obj0.color;
        obj.fill = obj0.fill;
    } else if (obj0.type === "text") {
        obj.x = tx(obj0.x);
        obj.y = ty(obj0.y);
        obj.size = obj0.size * avgScale;
        obj.text = obj0.text;
        obj.color = obj0.color;
    }

    redrawAll();
}

// ====== POINTER GLOW ======
function showPointerGlow(x, y) {
    const glow = document.createElement("div");
    glow.className = "pointer-glow";
    glow.style.left = (x - 9) + "px";
    glow.style.top = (y - 9) + "px";
    boardWrapper.appendChild(glow);
    setTimeout(() => glow.remove(), 700);
}

// ====== POINTER EVENTS ======
function pointerDown(e) {
    e.preventDefault();
    const pos = getPos(e);
    const x = pos.x;
    const y = pos.y;

    // Pointer tool: only glow, no state change
    if (currentTool === "pointer") {
        showPointerGlow(x, y);
        return;
    }

    // Text tool: new text
    if (currentTool === "text") {
        createTextOverlay(x, y);
        return;
    }

    // Select tool
    if (currentTool === "select") {
        // Check handles for resize
        if (selectedIndex !== -1) {
            const corner = hitTestHandle(x, y);
            if (corner) {
                startResize(corner);
                canvas.style.cursor = "nwse-resize";
                return;
            }
        }

        const idx = hitTest(x, y);
        selectedIndex = idx;
        draggingSelected = idx !== -1;
        resizingSelected = false;
        resizeHandleCorner = null;

        if (draggingSelected) {
            const box = getBoundingBox(objects[idx]);
            dragOffsetX = x - box.x;
            dragOffsetY = y - box.y;
            canvas.style.cursor = "grabbing";
        } else {
            canvas.style.cursor = "default";
        }
        redrawAll();
        return;
    }

    // Drawing tools
    painting = true;
    startX = x;
    startY = y;

    const color = colorPicker.value;
    const size = parseInt(sizePicker.value, 10) || 4;

    if (currentTool === "pen" || currentTool === "eraser") {
        currentObject = {
            type: "pen",
            eraser: currentTool === "eraser",
            color: currentTool === "eraser" ? "#ffffff" : color,
            size: size,
            points: [{ x, y }]
        };
    } else if (currentTool === "highlighter") {
        currentObject = {
            type: "highlighter",
            color: color,
            size: size * 1.8,
            points: [{ x, y }]
        };
    } else {
        currentObject = null; // shapes created on move
    }
}

function pointerMove(e) {
    const pos = getPos(e);
    const x = pos.x;
    const y = pos.y;

    if (currentTool === "pointer") {
        return;
    }

    // Select mode: resize or drag
    if (currentTool === "select") {
        if (resizingSelected) {
            applyResizeAtPointer(x, y);
            return;
        }
        if (draggingSelected) {
            moveSelectedObject(x, y);
            redrawAll();
            return;
        }
        const idx = hitTest(x, y);
        canvas.style.cursor = (idx !== -1) ? "move" : "default";
        return;
    }

    if (!painting) return;
    e.preventDefault();

    const color = colorPicker.value;
    const size = parseInt(sizePicker.value, 10) || 4;

    if (currentTool === "pen" || currentTool === "eraser" || currentTool === "highlighter") {
        if (!currentObject) return;
        currentObject.points.push({ x, y });
        redrawAll();
        drawObject(currentObject);
    } else {
        // Shape preview
        let tempObj = null;

        if (currentTool === "line") {
            tempObj = {
                type: "line",
                x1: startX,
                y1: startY,
                x2: x,
                y2: y,
                color,
                size
            };
        }

        if (currentTool === "rect") {
            tempObj = {
                type: "rect",
                x: startX,
                y: startY,
                w: x - startX,
                h: y - startY,
                color,
                size,
                fill: fillMode
            };
        }

        if (currentTool === "circle") {
            const dx = x - startX;
            const dy = y - startY;
            const radius = Math.sqrt(dx*dx + dy*dy);
            tempObj = {
                type: "circle",
                x: startX,
                y: startY,
                radius,
                color,
                size,
                fill: fillMode
            };
        }

        if (tempObj) {
            currentObject = tempObj;
            redrawAll();
            drawObject(tempObj);
        }
    }
}

function pointerUp(e) {
    if (currentTool === "pointer") {
        return;
    }

    if (currentTool === "select") {
        if (resizingSelected) {
            resizingSelected = false;
            resizeHandleCorner = null;
            resizeOriginalBox = null;
            resizeOriginalObj = null;
            canvas.style.cursor = "default";
            saveState();
            return;
        }
        if (draggingSelected) {
            draggingSelected = false;
            canvas.style.cursor = "default";
            saveState();
        }
        return;
    }

    if (!painting) return;
    e.preventDefault();
    painting = false;

    if (currentTool === "pen" || currentTool === "eraser" || currentTool === "highlighter") {
        if (currentObject && currentObject.points.length > 1) {
            objects.push(currentObject);
            saveState();
            redrawAll();
        }
        currentObject = null;
    } else if (["line", "rect", "circle"].includes(currentTool)) {
        if (currentObject) {
            objects.push(currentObject);
            saveState();
            redrawAll();
            currentObject = null;
        }
    }
}

// Mouse
canvas.addEventListener("mousedown", pointerDown);
canvas.addEventListener("mousemove", pointerMove);
canvas.addEventListener("mouseup", pointerUp);
canvas.addEventListener("mouseleave", (e) => {
    if (painting) pointerUp(e);
});

// Touch
canvas.addEventListener("touchstart", pointerDown, { passive: false });
canvas.addEventListener("touchmove", pointerMove, { passive: false });
canvas.addEventListener("touchend", pointerUp, { passive: false });
canvas.addEventListener("touchcancel", pointerUp, { passive: false });

// Double-click to edit text
canvas.addEventListener("dblclick", (e) => {
    e.preventDefault();
    const pos = getPos(e);
    const x = pos.x;
    const y = pos.y;

    // topmost text
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (obj.type !== "text") continue;
        if (pointInObject(obj, x, y)) {
            selectedIndex = i;
            redrawAll();
            createTextOverlay(obj.x, obj.y, obj, i);
            return;
        }
    }
});

// ====== BUTTON HANDLERS ======
penBtn.onclick = () => setActiveTool("pen");
eraserBtn.onclick = () => setActiveTool("eraser");
highlighterBtn.onclick = () => setActiveTool("highlighter");
lineBtn.onclick = () => setActiveTool("line");
rectBtn.onclick = () => setActiveTool("rect");
circleBtn.onclick = () => setActiveTool("circle");
textBtn.onclick = () => setActiveTool("text");
selectBtn.onclick = () => setActiveTool("select");
pointerBtn.onclick = () => setActiveTool("pointer");

fillToggleBtn.onclick = () => {
    fillMode = !fillMode;
    updateFillToggleButton();
};

undoBtn.onclick = undo;
redoBtn.onclick = redo;

clearBtn.onclick = () => {
    objects = [];
    selectedIndex = -1;
    draggingSelected = false;
    resizingSelected = false;
    saveState();
    redrawAll();
};

// JSON Save/Load
saveJsonBtn.onclick = () => {
    const dataStr = JSON.stringify(objects, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "whiteboard-scene.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

loadJsonBtn.onclick = () => {
    jsonFileInput.click();
};

jsonFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (Array.isArray(data)) {
                objects = data;
                history = [JSON.stringify(objects)];
                redoStack = [];
                selectedIndex = -1;
                draggingSelected = false;
                resizingSelected = false;
                redrawAll();
                try {
                    localStorage.setItem(AUTOSAVE_KEY, history[0]);
                } catch (e) {}
            } else {
                alert("Invalid JSON format: expected an array.");
            }
        } catch (err) {
            alert("Error parsing JSON file.");
        }
    };
    reader.readAsText(file);
});

// ====== HELP OVERLAY ======
helpBtn.onclick = () => {
    helpOverlay.style.display = "flex";
};
helpCloseBtn.onclick = () => {
    helpOverlay.style.display = "none";
};
helpOverlay.addEventListener("click", (e) => {
    if (e.target === helpOverlay) {
        helpOverlay.style.display = "none";
    }
});

// ====== KEYBOARD SHORTCUTS ======
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && helpOverlay.style.display === "flex") {
        helpOverlay.style.display = "none";
        return;
    }
    if (e.ctrlKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undo();
    }
    if (e.ctrlKey && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
    }
});

// ====== INITIAL LOAD: URL SCENE OR AUTOSAVE ======
(function initScene() {
    const params = new URLSearchParams(window.location.search);
    const scene = params.get("scene");

    if (scene) {
        // Try to load scene from URL param
        fetch(scene)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    objects = data;
                    history = [JSON.stringify(objects)];
                    redoStack = [];
                    selectedIndex = -1;
                    redrawAll();
                    try {
                        localStorage.setItem(AUTOSAVE_KEY, history[0]);
                    } catch (e) {}
                }
            })
            .catch(() => {
                // Fallback to autosave if available
                const saved = localStorage.getItem(AUTOSAVE_KEY);
                if (saved) {
                    history = [saved];
                    redoStack = [];
                    loadStateFromSnapshot(saved);
                } else {
                    objects = [];
                    saveState();
                }
            });
    } else {
        // No scene param -> try autosave
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (saved) {
            history = [saved];
            redoStack = [];
            loadStateFromSnapshot(saved);
        } else {
            objects = [];
            saveState();
        }
    }
})();
