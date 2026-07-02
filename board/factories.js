import { OBJECT_TYPES, nextObjectId, nextGroupId } from "./state.js";

function getNextZIndex(state) {
  const zValues = state.objects.map((obj) => obj.zIndex || 0);
  return (zValues.length ? Math.max(...zValues) : 0) + 1;
}

function createBaseObject(state, type, x, y, width, height, style = {}) {
  const toolOptions = state.toolState?.toolOptions || {};
  return {
    id: nextObjectId(),
    type,
    x,
    y,
    width,
    height,
    rotation: 0,
    zIndex: getNextZIndex(state),
    locked: false,
    visible: true,
    groupId: null,
    style: {
      stroke: toolOptions.stroke || "#1f2328",
      fill: toolOptions.fill || "#fff1c7",
      strokeWidth: toolOptions.strokeWidth || 2,
      opacity: 1,
      ...style,
    },
    meta: {},
  };
}

export function createRect(state, x, y, width, height) {
  return {
    ...createBaseObject(state, OBJECT_TYPES.RECT, x, y, width, height),
    radius: 12,
  };
}

export function createEllipse(state, x, y, width, height) {
  return createBaseObject(state, OBJECT_TYPES.ELLIPSE, x, y, width, height);
}

export function createDiamond(state, x, y, width, height) {
  return createBaseObject(state, OBJECT_TYPES.DIAMOND, x, y, width, height);
}

export function createLine(state, x1, y1, x2, y2) {
  return {
    id: nextObjectId(),
    type: OBJECT_TYPES.LINE,
    x1,
    y1,
    x2,
    y2,
    zIndex: getNextZIndex(state),
    locked: false,
    visible: true,
    groupId: null,
    style: {
      stroke: state.toolState?.toolOptions?.stroke || "#1f2328",
      strokeWidth: state.toolState?.toolOptions?.strokeWidth || 2,
      opacity: 1,
    },
    meta: {},
  };
}

export function createArrow(state, x1, y1, x2, y2) {
  return {
    ...createLine(state, x1, y1, x2, y2),
    type: OBJECT_TYPES.ARROW,
    arrowStart: false,
    arrowEnd: true,
  };
}

export function createText(state, x, y, text) {
  return {
    id: nextObjectId(),
    type: OBJECT_TYPES.TEXT,
    x,
    y,
    width: Math.max(120, text.length * 10),
    height: 32,
    rotation: 0,
    zIndex: getNextZIndex(state),
    locked: false,
    visible: true,
    groupId: null,
    text,
    textAlign: "left",
    verticalAlign: "top",
    style: {
      color: state.toolState?.toolOptions?.stroke || "#1f2328",
      fontSize: state.toolState?.toolOptions?.fontSize || 18,
      fontFamily: state.toolState?.toolOptions?.fontFamily || "Inter, sans-serif",
      fontWeight: 600,
      opacity: 1,
    },
    meta: {},
  };
}

export function createGroup(childIds) {
  return {
    id: nextGroupId(),
    type: "group",
    childIds: [...childIds],
    parentGroupId: null,
    locked: false,
    visible: true,
    meta: {},
  };
}
