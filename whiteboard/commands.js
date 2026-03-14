import { deepClone } from "./state.js";
import { getObjectById, getGroupById, getSelectionObjects } from "./selection.js";

export const COMMANDS = Object.freeze({
  ADD_OBJECTS: "ADD_OBJECTS",
  DELETE_OBJECTS: "DELETE_OBJECTS",
  UPDATE_OBJECTS: "UPDATE_OBJECTS",
  GROUP_OBJECTS: "GROUP_OBJECTS",
  UNGROUP_OBJECTS: "UNGROUP_OBJECTS",
  LOAD_BOARD: "LOAD_BOARD",
  CLEAR_BOARD: "CLEAR_BOARD",
});

export function createHistory() {
  return {
    undoStack: [],
    redoStack: [],
  };
}

export function applyCommand(state, command) {
  const next = deepClone(state);

  switch (command.type) {
    case COMMANDS.ADD_OBJECTS: {
      next.objects.push(...deepClone(command.payload.objects));
      break;
    }

    case COMMANDS.DELETE_OBJECTS: {
      const ids = new Set(command.payload.ids);
      next.objects = next.objects.filter((obj) => !ids.has(obj.id));
      next.groups = next.groups.filter((group) => !ids.has(group.id));
      next.selection.selectedIds = next.selection.selectedIds.filter((id) => !ids.has(id));
      break;
    }

    case COMMANDS.UPDATE_OBJECTS: {
      const patchMap = new Map(command.payload.after.map((item) => [item.id, item]));
      next.objects = next.objects.map((obj) => patchMap.has(obj.id) ? patchMap.get(obj.id) : obj);
      break;
    }

    case COMMANDS.GROUP_OBJECTS: {
      const group = deepClone(command.payload.group);
      next.groups.push(group);
      for (const childId of group.childIds) {
        const child = next.objects.find((obj) => obj.id === childId);
        if (child) child.groupId = group.id;
      }
      next.selection.selectedIds = [group.id];
      break;
    }

    case COMMANDS.UNGROUP_OBJECTS: {
      const { groupId } = command.payload;
      const group = next.groups.find((g) => g.id === groupId);
      if (group) {
        for (const childId of group.childIds) {
          const child = next.objects.find((obj) => obj.id === childId);
          if (child && child.groupId === groupId) child.groupId = null;
        }
      }
      next.groups = next.groups.filter((g) => g.id !== groupId);
      next.selection.selectedIds = [];
      break;
    }

    case COMMANDS.LOAD_BOARD: {
      return deepClone(command.payload.state);
    }

    case COMMANDS.CLEAR_BOARD: {
      next.objects = [];
      next.groups = [];
      next.connectors = [];
      next.selection.selectedIds = [];
      break;
    }

    default:
      console.warn("Unknown command", command);
  }

  next.metadata.updatedAt = Date.now();
  return next;
}

export function invertCommand(command) {
  switch (command.type) {
    case COMMANDS.ADD_OBJECTS:
      return {
        type: COMMANDS.DELETE_OBJECTS,
        payload: { ids: command.payload.objects.map((obj) => obj.id) },
      };

    case COMMANDS.DELETE_OBJECTS:
      return {
        type: COMMANDS.ADD_OBJECTS,
        payload: { objects: deepClone(command.payload.objectsBackup || []) },
      };

    case COMMANDS.UPDATE_OBJECTS:
      return {
        type: COMMANDS.UPDATE_OBJECTS,
        payload: { after: deepClone(command.payload.before) },
      };

    case COMMANDS.GROUP_OBJECTS:
      return {
        type: COMMANDS.UNGROUP_OBJECTS,
        payload: { groupId: command.payload.group.id },
      };

    case COMMANDS.UNGROUP_OBJECTS:
      return {
        type: COMMANDS.GROUP_OBJECTS,
        payload: { group: deepClone(command.payload.groupBackup) },
      };

    case COMMANDS.LOAD_BOARD:
      return {
        type: COMMANDS.LOAD_BOARD,
        payload: { state: deepClone(command.payload.previousState) },
      };

    case COMMANDS.CLEAR_BOARD:
      return {
        type: COMMANDS.LOAD_BOARD,
        payload: { state: deepClone(command.payload.previousState) },
      };

    default:
      return null;
  }
}

export function createCommandManager(store, history) {
  return {
    execute(command, options = { record: true }) {
      const nextState = applyCommand(store.getState(), command);
      store.setState(nextState);

      if (options.record) {
        history.undoStack.push(deepClone(command));
        history.redoStack.length = 0;
      }
    },

    undo() {
      const command = history.undoStack.pop();
      if (!command) return;
      const inverse = invertCommand(command);
      if (!inverse) return;
      history.redoStack.push(deepClone(command));
      store.setState(applyCommand(store.getState(), inverse));
    },

    redo() {
      const command = history.redoStack.pop();
      if (!command) return;
      history.undoStack.push(deepClone(command));
      store.setState(applyCommand(store.getState(), command));
    },
  };
}
