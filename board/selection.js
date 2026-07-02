import { OBJECT_TYPES } from "./state.js";

export function normalizeRect(x1, y1, x2, y2) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export function pointInRect(px, py, rect) {
  return (
    px >= rect.x &&
    py >= rect.y &&
    px <= rect.x + rect.width &&
    py <= rect.y + rect.height
  );
}

export function marqueeIntersect(rectA, rectB) {
  return (
    rectA.x < rectB.x + rectB.width &&
    rectA.x + rectA.width > rectB.x &&
    rectA.y < rectB.y + rectB.height &&
    rectA.y + rectA.height > rectB.y
  );
}

export function getObjectById(state, id) {
  return state.objects.find((obj) => obj.id === id) || null;
}

export function getGroupById(state, id) {
  return state.groups.find((group) => group.id === id) || null;
}

export function getObjectBounds(obj) {
  if (!obj) return null;

  if (obj.type === OBJECT_TYPES.LINE || obj.type === OBJECT_TYPES.ARROW) {
    return normalizeRect(obj.x1, obj.y1, obj.x2, obj.y2);
  }

  return {
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
  };
}

export function getTopSelectableId(state, id) {
  const obj = getObjectById(state, id);
  if (!obj) return null;
  return obj.groupId || obj.id;
}

export function expandSelectionIds(state, ids) {
  const expanded = new Set();
  for (const id of ids) {
    const group = getGroupById(state, id);
    if (group) {
      group.childIds.forEach((childId) => expanded.add(childId));
      continue;
    }
    const obj = getObjectById(state, id);
    if (!obj) continue;

    if (obj.groupId) {
      const parent = getGroupById(state, obj.groupId);
      if (parent) parent.childIds.forEach((childId) => expanded.add(childId));
      else expanded.add(obj.id);
    } else {
      expanded.add(obj.id);
    }
  }
  return [...expanded];
}

export function getSelectionObjects(state) {
  return expandSelectionIds(state, state.selection.selectedIds)
    .map((id) => getObjectById(state, id))
    .filter(Boolean);
}

export function getSelectionBounds(state) {
  const items = getSelectionObjects(state);
  if (!items.length) return null;

  const bounds = items.map(getObjectBounds).filter(Boolean);
  const x1 = Math.min(...bounds.map((b) => b.x));
  const y1 = Math.min(...bounds.map((b) => b.y));
  const x2 = Math.max(...bounds.map((b) => b.x + b.width));
  const y2 = Math.max(...bounds.map((b) => b.y + b.height));

  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function hitTest(state, worldX, worldY) {
  const objects = [...state.objects]
    .filter((obj) => obj.visible !== false)
    .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  for (const obj of objects) {
    const bounds = getObjectBounds(obj);
    if (bounds && pointInRect(worldX, worldY, bounds)) return obj;
  }
  return null;
}
