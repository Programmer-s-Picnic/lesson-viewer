export const OBJECT_TYPES = Object.freeze({
  RECT: "rect",
  ELLIPSE: "ellipse",
  DIAMOND: "diamond",
  LINE: "line",
  ARROW: "arrow",
  TEXT: "text",
  STICKY: "sticky",
  CODEBLOCK: "codeblock",
});

export const TOOLS = Object.freeze({
  SELECT: "select",
  RECT: "rect",
  ELLIPSE: "ellipse",
  DIAMOND: "diamond",
  LINE: "line",
  ARROW: "arrow",
  TEXT: "text",
});

let objectCounter = 1;
let groupCounter = 1;

export function nextObjectId() {
  return `obj_${objectCounter++}`;
}

export function nextGroupId() {
  return `group_${groupCounter++}`;
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createInitialBoardState() {
  const now = Date.now();
  return {
    version: 1,
    metadata: {
      boardId: `board_${now}`,
      title: "Untitled Board",
      createdAt: now,
      updatedAt: now,
      author: "Programmer's Picnic",
    },
    camera: {
      zoom: 1,
      panX: 0,
      panY: 0,
      minZoom: 0.25,
      maxZoom: 4,
    },
    settings: {
      theme: "light",
      showGrid: true,
      snapToGrid: false,
      gridSize: 20,
      background: "#fff8ef",
    },
    toolState: {
      activeTool: TOOLS.SELECT,
      toolOptions: {
        stroke: "#1f2328",
        fill: "#fff1c7",
        strokeWidth: 2,
        fontSize: 18,
        fontFamily: "Inter, sans-serif",
      },
    },
    selection: {
      selectedIds: [],
      hoverId: null,
      marquee: {
        active: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
    },
    objects: [],
    groups: [],
    connectors: [],
  };
}

export function createStore(initialState = createInitialBoardState()) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    setState(nextState) {
      state = nextState;
      for (const listener of listeners) listener(state);
    },
    update(updater) {
      state = updater(state);
      for (const listener of listeners) listener(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
