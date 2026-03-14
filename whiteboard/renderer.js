import { OBJECT_TYPES } from "./state.js";
import { getSelectionBounds } from "./selection.js";

export function createRenderer(canvas, store) {
  const ctx = canvas.getContext("2d");
  let pending = false;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    requestRender();
  }

  function requestRender() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      render();
    });
  }

  function screenToWorld(x, y) {
    const state = store.getState();
    const { zoom, panX, panY } = state.camera;
    return { x: (x - panX) / zoom, y: (y - panY) / zoom };
  }

  function drawBackground(width, height) {
    const styles = getComputedStyle(document.documentElement);
    ctx.fillStyle = styles.getPropertyValue("--canvas-bg").trim();
    ctx.fillRect(0, 0, width, height);
  }

  function drawGrid(screenWidth, screenHeight, state) {
    if (!state.settings.showGrid) return;
    const styles = getComputedStyle(document.documentElement);
    const { gridSize } = state.settings;
    const { zoom, panX, panY } = state.camera;
    const step = gridSize * zoom;

    ctx.save();
    ctx.strokeStyle = styles.getPropertyValue("--line").trim();
    ctx.lineWidth = 1;

    const startX = ((panX % step) + step) % step;
    const startY = ((panY % step) + step) % step;

    for (let x = startX; x < screenWidth; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, screenHeight);
      ctx.stroke();
    }
    for (let y = startY; y < screenHeight; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(screenWidth, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function applyCameraTransform(state) {
    ctx.translate(state.camera.panX, state.camera.panY);
    ctx.scale(state.camera.zoom, state.camera.zoom);
  }

  function roundRectPath(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function setStrokeAndFill(obj) {
    ctx.globalAlpha = obj.style?.opacity ?? 1;
    ctx.strokeStyle = obj.style?.stroke || "#1f2328";
    ctx.fillStyle = obj.style?.fill || "transparent";
    ctx.lineWidth = obj.style?.strokeWidth || 2;
  }

  function drawArrowHead(x1, y1, x2, y2, color) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const size = 12;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawObject(obj) {
    switch (obj.type) {
      case OBJECT_TYPES.RECT:
        setStrokeAndFill(obj);
        if (obj.radius) {
          roundRectPath(obj.x, obj.y, obj.width, obj.height, obj.radius);
          if (obj.style?.fill) ctx.fill();
          ctx.stroke();
        } else {
          if (obj.style?.fill) ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
          ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        }
        break;

      case OBJECT_TYPES.ELLIPSE:
        setStrokeAndFill(obj);
        ctx.beginPath();
        ctx.ellipse(obj.x + obj.width / 2, obj.y + obj.height / 2, Math.abs(obj.width / 2), Math.abs(obj.height / 2), 0, 0, Math.PI * 2);
        if (obj.style?.fill) ctx.fill();
        ctx.stroke();
        break;

      case OBJECT_TYPES.DIAMOND:
        setStrokeAndFill(obj);
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.width / 2, obj.y);
        ctx.lineTo(obj.x + obj.width, obj.y + obj.height / 2);
        ctx.lineTo(obj.x + obj.width / 2, obj.y + obj.height);
        ctx.lineTo(obj.x, obj.y + obj.height / 2);
        ctx.closePath();
        if (obj.style?.fill) ctx.fill();
        ctx.stroke();
        break;

      case OBJECT_TYPES.LINE:
        ctx.save();
        ctx.globalAlpha = obj.style?.opacity ?? 1;
        ctx.strokeStyle = obj.style?.stroke || "#1f2328";
        ctx.lineWidth = obj.style?.strokeWidth || 2;
        ctx.beginPath();
        ctx.moveTo(obj.x1, obj.y1);
        ctx.lineTo(obj.x2, obj.y2);
        ctx.stroke();
        ctx.restore();
        break;

      case OBJECT_TYPES.ARROW:
        ctx.save();
        ctx.globalAlpha = obj.style?.opacity ?? 1;
        ctx.strokeStyle = obj.style?.stroke || "#1f2328";
        ctx.lineWidth = obj.style?.strokeWidth || 2;
        ctx.beginPath();
        ctx.moveTo(obj.x1, obj.y1);
        ctx.lineTo(obj.x2, obj.y2);
        ctx.stroke();
        drawArrowHead(obj.x1, obj.y1, obj.x2, obj.y2, obj.style?.stroke || "#1f2328");
        ctx.restore();
        break;

      case OBJECT_TYPES.TEXT:
        ctx.save();
        ctx.globalAlpha = obj.style?.opacity ?? 1;
        ctx.fillStyle = obj.style?.color || "#1f2328";
        ctx.font = `${obj.style?.fontWeight || 600} ${obj.style?.fontSize || 18}px ${obj.style?.fontFamily || "Inter, sans-serif"}`;
        ctx.textBaseline = "top";
        ctx.fillText(obj.text || "", obj.x, obj.y);
        ctx.restore();
        break;
    }
  }

  function drawSelectionOverlay(state) {
    const bounds = getSelectionBounds(state);
    if (!bounds) return;
    ctx.save();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim();
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(bounds.x - 6, bounds.y - 6, bounds.width + 12, bounds.height + 12);
    ctx.restore();
  }

  function drawMarquee(state) {
    const m = state.selection.marquee;
    if (!m.active) return;
    ctx.save();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim();
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(m.x, m.y, m.width, m.height);
    ctx.restore();
  }

  function render() {
    const state = store.getState();
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    drawBackground(rect.width, rect.height);
    drawGrid(rect.width, rect.height, state);

    ctx.save();
    applyCameraTransform(state);

    const objects = [...state.objects]
      .filter((obj) => obj.visible !== false)
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const obj of objects) drawObject(obj);

    drawSelectionOverlay(state);
    drawMarquee(state);
    ctx.restore();
  }

  return {
    ctx,
    resize,
    render,
    requestRender,
    screenToWorld,
  };
}
