import { createInitialBoardState, createStore, TOOLS, deepClone } from "./state.js";
import { createRect, createEllipse, createDiamond, createLine, createArrow, createText, createGroup } from "./factories.js";
import { COMMANDS, createHistory, createCommandManager } from "./commands.js";
import { normalizeRect, hitTest, getSelectionObjects, getSelectionBounds, getObjectById, getObjectBounds, marqueeIntersect, getTopSelectableId } from "./selection.js";
import { createRenderer } from "./renderer.js";

const canvas = document.getElementById("board");
const store = createStore(createInitialBoardState());
const history = createHistory();
const commandManager = createCommandManager(store, history);
const renderer = createRenderer(canvas, store);

const statusText = document.getElementById("statusText");
const strokeColorInput = document.getElementById("strokeColor");
const fillColorInput = document.getElementById("fillColor");
const strokeWidthInput = document.getElementById("strokeWidth");
const strokeWidthValue = document.getElementById("strokeWidthValue");
const fontFamilyInput = document.getElementById("fontFamily");
const fontSizeInput = document.getElementById("fontSize");
const fontSizeValue = document.getElementById("fontSizeValue");
const propStroke = document.getElementById("propStroke");
const propFill = document.getElementById("propFill");
const propWidth = document.getElementById("propWidth");
const propHeight = document.getElementById("propHeight");
const propStrokeWidth = document.getElementById("propStrokeWidth");
const propFontFamily = document.getElementById("propFontFamily");
const propFontSize = document.getElementById("propFontSize");
const propText = document.getElementById("propText");

const interaction = {
  pointerDown: false,
  dragMode: null, // create | marquee | move
  startWorld: null,
  startScreen: null,
  activeDraftObject: null,
  moveSnapshot: null,
};

function updateStatus() {
  const state = store.getState();
  statusText.textContent = `${state.objects.length} objects · ${state.groups.length} groups · ${state.selection.selectedIds.length} selected`;
}

store.subscribe(() => {
  renderer.requestRender();
  updateStatus();
  syncPropertyPanel();
  syncColorInputs();
});

function getPointerScreenPosition(event) {
  const r = canvas.getBoundingClientRect();
  return { x: event.clientX - r.left, y: event.clientY - r.top };
}

function updateCanvasCursor(tool) {
  const cursorMap = {
    select: "default",
    rect: "crosshair",
    ellipse: "crosshair",
    diamond: "crosshair",
    line: "cell",
    arrow: "cell",
    text: "text",
  };
  canvas.style.cursor = cursorMap[tool] || "crosshair";
}

function syncColorInputs() {
  const state = store.getState();
  if (strokeColorInput) strokeColorInput.value = state.toolState.toolOptions.stroke || "#1f2328";
  if (fillColorInput) fillColorInput.value = state.toolState.toolOptions.fill || "#fff1c7";
  if (strokeWidthInput) strokeWidthInput.value = state.toolState.toolOptions.strokeWidth || 2;
  if (strokeWidthValue) strokeWidthValue.textContent = String(state.toolState.toolOptions.strokeWidth || 2);
  if (fontFamilyInput) fontFamilyInput.value = state.toolState.toolOptions.fontFamily || "Inter, sans-serif";
  if (fontSizeInput) fontSizeInput.value = state.toolState.toolOptions.fontSize || 18;
  if (fontSizeValue) fontSizeValue.textContent = String(state.toolState.toolOptions.fontSize || 18);
}

function getPrimarySelectedObject() {
  const state = store.getState();
  const selection = getSelectionObjects(state);
  return selection.length ? selection[0] : null;
}

function syncPropertyPanel() {
  const obj = getPrimarySelectedObject();
  const disabled = !obj;

  [propStroke, propFill, propWidth, propHeight, propStrokeWidth, propFontFamily, propFontSize, propText].forEach((el) => {
    if (el) el.disabled = disabled;
  });

  if (!obj) {
    if (propText) propText.value = "";
    if (propWidth) propWidth.value = "";
    if (propHeight) propHeight.value = "";
    if (propFontFamily) propFontFamily.value = "Inter, sans-serif";
    if (propFontSize) propFontSize.value = 18;
    return;
  }

  const stroke = obj.style?.stroke || obj.style?.color || "#1f2328";
  const fill = obj.style?.fill || "#fff1c7";
  const sw = obj.style?.strokeWidth || 2;

  if (propStroke) propStroke.value = normalizeColor(stroke);
  if (propFill) propFill.value = normalizeColor(fill);
  if (propStrokeWidth) propStrokeWidth.value = sw;
  if (propWidth) propWidth.value = obj.width ?? "";
  if (propHeight) propHeight.value = obj.height ?? "";
  if (propFontFamily) propFontFamily.value = obj.style?.fontFamily || "Inter, sans-serif";
  if (propFontSize) propFontSize.value = obj.style?.fontSize || 18;
  if (propText) propText.value = obj.text || "";
}

function normalizeColor(value) {
  if (!value) return "#1f2328";
  if (value.startsWith("#") && (value.length === 7 || value.length === 4)) return value;
  return "#1f2328";
}

function updateSelectedObjects(mutator) {
  const state = store.getState();
  const selection = getSelectionObjects(state);
  if (!selection.length) return;

  const ids = new Set(selection.map((o) => o.id));
  const before = selection.map((o) => deepClone(o));
  const nextObjects = state.objects.map((obj) => {
    if (!ids.has(obj.id)) return obj;
    const copy = deepClone(obj);
    mutator(copy);
    return copy;
  });
  const after = nextObjects.filter((o) => ids.has(o.id)).map((o) => deepClone(o));

  commandManager.execute({
    type: COMMANDS.UPDATE_OBJECTS,
    payload: { before, after },
  });
}

function setActiveTool(tool) {
  const state = store.getState();
  store.setState({
    ...state,
    toolState: {
      ...state.toolState,
      activeTool: tool,
    },
  });

  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  updateCanvasCursor(tool);
  syncColorInputs();
}

function handleSelectPointerDown(event, hit, world) {
  const state = store.getState();
  if (hit) {
    const targetSelectableId = getTopSelectableId(state, hit.id);
    let nextIds;
    if (event.shiftKey) {
      const ids = new Set(state.selection.selectedIds);
      ids.add(targetSelectableId);
      nextIds = [...ids];
    } else {
      nextIds = [targetSelectableId];
    }

    store.setState({
      ...state,
      selection: {
        ...state.selection,
        selectedIds: nextIds,
      },
    });

    interaction.dragMode = "move";
    interaction.moveSnapshot = getSelectionObjects(store.getState()).map((obj) => deepClone(obj));
  } else {
    store.setState({
      ...state,
      selection: {
        ...state.selection,
        selectedIds: event.shiftKey ? state.selection.selectedIds : [],
        marquee: { active: true, x: world.x, y: world.y, width: 0, height: 0 },
      },
    });
    interaction.dragMode = "marquee";
  }
}

function handleCreatePointerDown(tool, world) {
  const state = store.getState();
  interaction.dragMode = "create";

  switch (tool) {
    case TOOLS.RECT:
      interaction.activeDraftObject = createRect(state, world.x, world.y, 0, 0);
      break;
    case TOOLS.ELLIPSE:
      interaction.activeDraftObject = createEllipse(state, world.x, world.y, 0, 0);
      break;
    case TOOLS.DIAMOND:
      interaction.activeDraftObject = createDiamond(state, world.x, world.y, 0, 0);
      break;
    case TOOLS.LINE:
      interaction.activeDraftObject = createLine(state, world.x, world.y, world.x, world.y);
      break;
    case TOOLS.ARROW:
      interaction.activeDraftObject = createArrow(state, world.x, world.y, world.x, world.y);
      break;
    case TOOLS.TEXT: {
      const text = prompt("Enter text");
      if (text) {
        commandManager.execute({
          type: COMMANDS.ADD_OBJECTS,
          payload: { objects: [createText(state, world.x, world.y, text)] },
        });
      }
      interaction.dragMode = null;
      break;
    }
  }
}

function updateDraftObject(world) {
  const obj = interaction.activeDraftObject;
  if (!obj) return;

  if (obj.type === "line" || obj.type === "arrow") {
    obj.x2 = world.x;
    obj.y2 = world.y;
    return;
  }

  const rect = normalizeRect(interaction.startWorld.x, interaction.startWorld.y, world.x, world.y);
  obj.x = rect.x;
  obj.y = rect.y;
  obj.width = rect.width;
  obj.height = rect.height;
}

function finalizeDraftObject() {
  const obj = interaction.activeDraftObject;
  if (!obj) return;

  const bounds = getObjectBounds(obj);
  const valid =
    (obj.type === "line" || obj.type === "arrow")
      ? Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1) > 2
      : bounds.width > 4 && bounds.height > 4;

  if (!valid) return;

  commandManager.execute({
    type: COMMANDS.ADD_OBJECTS,
    payload: { objects: [obj] },
  });
}

function updateMarquee(startWorld, currentWorld) {
  const rect = normalizeRect(startWorld.x, startWorld.y, currentWorld.x, currentWorld.y);
  const state = store.getState();
  store.setState({
    ...state,
    selection: {
      ...state.selection,
      marquee: { active: true, ...rect },
    },
  });
}

function finalizeMarqueeSelection() {
  const state = store.getState();
  const marquee = state.selection.marquee;
  const selectedIds = [];

  for (const obj of state.objects) {
    const bounds = getObjectBounds(obj);
    if (bounds && marqueeIntersect(marquee, bounds)) {
      selectedIds.push(getTopSelectableId(state, obj.id));
    }
  }

  store.setState({
    ...state,
    selection: {
      ...state.selection,
      selectedIds: [...new Set(selectedIds)],
      marquee: { active: false, x: 0, y: 0, width: 0, height: 0 },
    },
  });
}

function updateSelectionMove(world) {
  if (!interaction.moveSnapshot) return;
  const dx = world.x - interaction.startWorld.x;
  const dy = world.y - interaction.startWorld.y;
  const state = store.getState();
  const snapshotMap = new Map(interaction.moveSnapshot.map((obj) => [obj.id, obj]));

  const nextObjects = state.objects.map((obj) => {
    if (!getSelectionObjects(state).some((selected) => selected.id === obj.id)) return obj;

    const original = snapshotMap.get(obj.id);
    if (!original) return obj;

    if (obj.type === "line" || obj.type === "arrow") {
      return {
        ...obj,
        x1: original.x1 + dx,
        y1: original.y1 + dy,
        x2: original.x2 + dx,
        y2: original.y2 + dy,
      };
    }

    return {
      ...obj,
      x: original.x + dx,
      y: original.y + dy,
    };
  });

  store.setState({
    ...state,
    objects: nextObjects,
  });
}

function finalizeMove() {
  if (!interaction.moveSnapshot) return;
  const state = store.getState();
  const before = interaction.moveSnapshot;
  const after = getSelectionObjects(state).map((obj) => deepClone(obj));

  commandManager.execute({
    type: COMMANDS.UPDATE_OBJECTS,
    payload: { before, after },
  });
}

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);

  const screen = getPointerScreenPosition(event);
  const world = renderer.screenToWorld(screen.x, screen.y);
  const state = store.getState();
  const tool = state.toolState.activeTool;
  const hit = hitTest(state, world.x, world.y);

  interaction.pointerDown = true;
  interaction.startScreen = screen;
  interaction.startWorld = world;
  interaction.activeDraftObject = null;
  interaction.moveSnapshot = null;

  if (tool === TOOLS.SELECT) {
    handleSelectPointerDown(event, hit, world);
    return;
  }

  handleCreatePointerDown(tool, world);
});

canvas.addEventListener("pointermove", (event) => {
  if (!interaction.pointerDown) return;
  const screen = getPointerScreenPosition(event);
  const world = renderer.screenToWorld(screen.x, screen.y);

  if (interaction.dragMode === "create") {
    updateDraftObject(world);
    renderer.requestRender();
  } else if (interaction.dragMode === "marquee") {
    updateMarquee(interaction.startWorld, world);
  } else if (interaction.dragMode === "move") {
    updateSelectionMove(world);
  }
});

canvas.addEventListener("pointerup", () => {
  if (!interaction.pointerDown) return;

  if (interaction.dragMode === "create" && interaction.activeDraftObject) {
    finalizeDraftObject();
  } else if (interaction.dragMode === "marquee") {
    finalizeMarqueeSelection();
  } else if (interaction.dragMode === "move") {
    finalizeMove();
  }

  interaction.pointerDown = false;
  interaction.dragMode = null;
  interaction.activeDraftObject = null;
  interaction.moveSnapshot = null;
  renderer.requestRender();
});

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => setActiveTool(button.dataset.tool));
});

document.getElementById("groupBtn").addEventListener("click", () => {
  const state = store.getState();
  const childIds = getSelectionObjects(state).map((obj) => obj.id);
  if (childIds.length < 2) return;
  const group = createGroup(childIds);
  commandManager.execute({
    type: COMMANDS.GROUP_OBJECTS,
    payload: { group },
  });
});

document.getElementById("ungroupBtn").addEventListener("click", () => {
  const state = store.getState();
  const selectedGroupId = state.selection.selectedIds.find((id) => state.groups.some((g) => g.id === id));
  if (!selectedGroupId) return;

  const backup = state.groups.find((g) => g.id === selectedGroupId);
  commandManager.execute({
    type: COMMANDS.UNGROUP_OBJECTS,
    payload: {
      groupId: selectedGroupId,
      groupBackup: deepClone(backup),
    },
  });
});

document.getElementById("undoBtn").addEventListener("click", () => commandManager.undo());
document.getElementById("redoBtn").addEventListener("click", () => commandManager.redo());

document.getElementById("selectAllBtn").addEventListener("click", () => {
  const state = store.getState();
  const ids = state.objects.map((obj) => obj.groupId || obj.id);
  store.setState({
    ...state,
    selection: {
      ...state.selection,
      selectedIds: [...new Set(ids)],
    },
  });
});

document.getElementById("newBtn").addEventListener("click", () => {
  const previousState = deepClone(store.getState());
  commandManager.execute({
    type: COMMANDS.CLEAR_BOARD,
    payload: { previousState },
  });
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(store.getState(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pp-whiteboard.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

document.getElementById("loadBtn").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const previousState = deepClone(store.getState());
      const parsed = JSON.parse(String(reader.result));
      commandManager.execute({
        type: COMMANDS.LOAD_BOARD,
        payload: {
          state: parsed,
          previousState,
        },
      });
    } catch (error) {
      alert("Invalid JSON file.");
      console.error(error);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
});

document.getElementById("pngBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "pp-whiteboard.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

if (strokeColorInput) {
  strokeColorInput.addEventListener("input", (event) => {
    const state = store.getState();
    store.setState({
      ...state,
      toolState: {
        ...state.toolState,
        toolOptions: {
          ...state.toolState.toolOptions,
          stroke: event.target.value,
        },
      },
    });
  });
}

if (fillColorInput) {
  fillColorInput.addEventListener("input", (event) => {
    const state = store.getState();
    store.setState({
      ...state,
      toolState: {
        ...state.toolState,
        toolOptions: {
          ...state.toolState.toolOptions,
          fill: event.target.value,
        },
      },
    });
  });
}

if (strokeWidthInput) {
  strokeWidthInput.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    const state = store.getState();
    store.setState({
      ...state,
      toolState: {
        ...state.toolState,
        toolOptions: {
          ...state.toolState.toolOptions,
          strokeWidth: value,
        },
      },
    });
    if (strokeWidthValue) strokeWidthValue.textContent = String(value);
  });
}

if (fontFamilyInput) {
  fontFamilyInput.addEventListener("change", (event) => {
    const state = store.getState();
    store.setState({
      ...state,
      toolState: {
        ...state.toolState,
        toolOptions: {
          ...state.toolState.toolOptions,
          fontFamily: event.target.value,
        },
      },
    });
  });
}

if (fontSizeInput) {
  fontSizeInput.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    const state = store.getState();
    store.setState({
      ...state,
      toolState: {
        ...state.toolState,
        toolOptions: {
          ...state.toolState.toolOptions,
          fontSize: value,
        },
      },
    });
    if (fontSizeValue) fontSizeValue.textContent = String(value);
  });
}

if (propStroke) {
  propStroke.addEventListener("input", (event) => {
    const color = event.target.value;
    updateSelectedObjects((obj) => {
      obj.style = obj.style || {};
      if (obj.type === "text") obj.style.color = color;
      else obj.style.stroke = color;
    });
  });
}

if (propFill) {
  propFill.addEventListener("input", (event) => {
    const color = event.target.value;
    updateSelectedObjects((obj) => {
      obj.style = obj.style || {};
      if (obj.type !== "line" && obj.type !== "arrow" && obj.type !== "text") {
        obj.style.fill = color;
      }
    });
  });
}

if (propStrokeWidth) {
  propStrokeWidth.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    updateSelectedObjects((obj) => {
      obj.style = obj.style || {};
      obj.style.strokeWidth = value;
    });
  });
}

if (propWidth) {
  propWidth.addEventListener("change", (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value <= 0) return;
    updateSelectedObjects((obj) => {
      if ("width" in obj) obj.width = value;
    });
  });
}

if (propHeight) {
  propHeight.addEventListener("change", (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value <= 0) return;
    updateSelectedObjects((obj) => {
      if ("height" in obj) obj.height = value;
    });
  });
}

if (propFontFamily) {
  propFontFamily.addEventListener("change", (event) => {
    const value = event.target.value;
    updateSelectedObjects((obj) => {
      obj.style = obj.style || {};
      obj.style.fontFamily = value;
    });
  });
}

if (propFontSize) {
  propFontSize.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    updateSelectedObjects((obj) => {
      obj.style = obj.style || {};
      obj.style.fontSize = value;
    });
  });
}

if (propText) {
  propText.addEventListener("input", (event) => {
    const value = event.target.value;
    updateSelectedObjects((obj) => {
      if ("text" in obj) obj.text = value;
    });
  });
}

document.getElementById("themeBtn").addEventListener("click", () => {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);

  const state = store.getState();
  store.setState({
    ...state,
    settings: {
      ...state.settings,
      theme: next,
    },
  });

  localStorage.setItem("pp-theme", next);
});

document.addEventListener("keydown", (event) => {
  const mod = event.ctrlKey || event.metaKey;
  const state = store.getState();

  if (mod && event.key.toLowerCase() === "z") {
    event.preventDefault();
    commandManager.undo();
  }

  if (mod && event.key.toLowerCase() === "y") {
    event.preventDefault();
    commandManager.redo();
  }

  if (mod && event.key.toLowerCase() === "a") {
    event.preventDefault();
    const ids = state.objects.map((obj) => obj.groupId || obj.id);
    store.setState({
      ...state,
      selection: {
        ...state.selection,
        selectedIds: [...new Set(ids)],
      },
    });
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    if (!state.selection.selectedIds.length) return;
    const ids = getSelectionObjects(state).map((obj) => obj.id);
    const deletedObjects = ids.map((id) => getObjectById(state, id)).filter(Boolean).map(deepClone);

    commandManager.execute({
      type: COMMANDS.DELETE_OBJECTS,
      payload: {
        ids,
        objectsBackup: deletedObjects,
      },
    });
  }
});

function boot() {
  const savedTheme = localStorage.getItem("pp-theme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
    const state = store.getState();
    store.setState({
      ...state,
      settings: {
        ...state.settings,
        theme: savedTheme,
      },
    });
  }

  window.addEventListener("resize", () => renderer.resize());
  renderer.resize();

  const state = store.getState();
  commandManager.execute(
    {
      type: COMMANDS.ADD_OBJECTS,
      payload: {
        objects: [
          createRect(state, 120, 120, 180, 90),
          createText(state, 160, 155, "Start here"),
          createEllipse(state, 420, 120, 160, 90),
          createArrow(state, 300, 165, 420, 165),
        ],
      },
    },
    { record: false }
  );

  syncColorInputs();
  setActiveTool(TOOLS.SELECT);
  syncPropertyPanel();
  renderer.requestRender();
}

boot();
