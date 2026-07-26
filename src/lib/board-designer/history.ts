import type {
  BoardDesignConfig,
  Panel,
  RowStep,
  Strip,
} from '@/lib/board-designer/types';

/** Max past snapshots kept in memory. Oldest entries drop first. */
export const HISTORY_CAP = 50;

export type ConfigAction =
  | { type: 'load'; config: BoardDesignConfig }
  | { type: 'patch'; patch: Partial<BoardDesignConfig> }
  | { type: 'add-strip'; panelId: string }
  | { type: 'duplicate-strip'; panelId: string; id: string }
  | { type: 'delete-strip'; panelId: string; id: string }
  | { type: 'move-strip'; panelId: string; id: string; direction: -1 | 1 }
  | { type: 'update-strip'; panelId: string; id: string; patch: Partial<Strip> }
  | { type: 'add-panel'; sourcePanelId?: string }
  | { type: 'delete-panel'; id: string }
  | { type: 'update-panel'; id: string; patch: Partial<Pick<Panel, 'label' | 'thicknessIn'>> }
  | { type: 'add-row' }
  | { type: 'delete-row'; index: number }
  | { type: 'update-row'; index: number; patch: Partial<RowStep> };

export type HistoryAction =
  | ConfigAction
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'commit-coalesce' };

export type HistoryState = {
  past: BoardDesignConfig[];
  present: BoardDesignConfig;
  future: BoardDesignConfig[];
  coalesceKey: string | null;
};

export function undoRedoShortcut(event: {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}): 'undo' | 'redo' | null {
  if (!event.ctrlKey && !event.metaKey) return null;
  const key = event.key.toLowerCase();
  if (key !== 'z' && key !== 'y') return null;
  return key === 'y' || event.shiftKey ? 'redo' : 'undo';
}

/** Deep-clone panels, nested strips (incl. miter), and rowPattern. */
export function cloneConfig(config: BoardDesignConfig): BoardDesignConfig {
  return {
    ...config,
    panels: config.panels.map((panel) => ({
      ...panel,
      strips: panel.strips.map((strip) => ({
        ...strip,
        miter: strip.miter ? { ...strip.miter } : undefined,
      })),
    })),
    rowPattern: config.rowPattern.map((step) => ({ ...step })),
  };
}

export function configsEqual(a: BoardDesignConfig, b: BoardDesignConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createHistoryState(initial: BoardDesignConfig): HistoryState {
  return {
    past: [],
    present: cloneConfig(initial),
    future: [],
    coalesceKey: null,
  };
}

export function canUndo(state: HistoryState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: HistoryState): boolean {
  return state.future.length > 0;
}

function mapPanel(
  config: BoardDesignConfig,
  panelId: string,
  map: (panel: Panel) => Panel,
): BoardDesignConfig {
  let changed = false;
  const panels = config.panels.map((panel) => {
    if (panel.id !== panelId) return panel;
    const next = map(panel);
    if (next !== panel) changed = true;
    return next;
  });
  return changed ? { ...config, panels } : config;
}

export function configReducer(
  config: BoardDesignConfig,
  action: ConfigAction,
): BoardDesignConfig {
  switch (action.type) {
    case 'load':
      return cloneConfig(action.config);
    case 'patch':
      return { ...config, ...action.patch };
    case 'add-strip':
      return mapPanel(config, action.panelId, (panel) => ({
        ...panel,
        strips: [
          ...panel.strips,
          {
            id: newStripId(),
            speciesId: 'hard-maple',
            widthIn: 1.5,
            repeat: 1,
          },
        ],
      }));
    case 'duplicate-strip':
      return mapPanel(config, action.panelId, (panel) => {
        const index = panel.strips.findIndex((strip) => strip.id === action.id);
        if (index < 0) return panel;
        const src = panel.strips[index]!;
        const copy = {
          ...src,
          id: newStripId(),
          miter: src.miter ? { ...src.miter } : undefined,
        };
        return {
          ...panel,
          strips: [
            ...panel.strips.slice(0, index + 1),
            copy,
            ...panel.strips.slice(index + 1),
          ],
        };
      });
    case 'delete-strip':
      return mapPanel(config, action.panelId, (panel) => ({
        ...panel,
        strips: panel.strips.filter((strip) => strip.id !== action.id),
      }));
    case 'move-strip':
      return mapPanel(config, action.panelId, (panel) => {
        const index = panel.strips.findIndex((strip) => strip.id === action.id);
        const nextIndex = index + action.direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= panel.strips.length) {
          return panel;
        }
        const strips = panel.strips.slice();
        const [strip] = strips.splice(index, 1);
        if (!strip) return panel;
        strips.splice(nextIndex, 0, strip);
        return { ...panel, strips };
      });
    case 'update-strip':
      return mapPanel(config, action.panelId, (panel) => ({
        ...panel,
        strips: panel.strips.map((strip) => {
          if (strip.id !== action.id) return strip;
          const next = { ...strip, ...action.patch };
          if ('miter' in action.patch) {
            next.miter = action.patch.miter
              ? { ...action.patch.miter }
              : undefined;
          } else if (strip.miter) {
            next.miter = { ...strip.miter };
          }
          return next;
        }),
      }));
    case 'add-panel': {
      if (config.panels.length >= 4) return config;
      const source =
        (action.sourcePanelId
          ? config.panels.find((p) => p.id === action.sourcePanelId)
          : undefined) ?? config.panels[config.panels.length - 1]!;
      const nextIndex = config.panels.length + 1;
      const copy: Panel = {
        id: newPanelId(),
        label: `Panel ${nextIndex}`.slice(0, 24),
        thicknessIn: source.thicknessIn,
        strips: source.strips.map((s) => ({
          ...s,
          id: newStripId(),
          miter: s.miter ? { ...s.miter } : undefined,
        })),
      };
      return { ...config, panels: [...config.panels, copy] };
    }
    case 'delete-panel': {
      if (config.panels.length <= 1) return config;
      if (!config.panels.some((p) => p.id === action.id)) return config;
      // Leave dangling rowPattern entries so metrics can warn.
      return {
        ...config,
        panels: config.panels.filter((p) => p.id !== action.id),
      };
    }
    case 'update-panel':
      return mapPanel(config, action.id, (panel) => ({ ...panel, ...action.patch }));
    case 'add-row': {
      if (config.rowPattern.length >= 24) return config;
      const fallback = config.panels[0]?.id;
      if (!fallback) return config;
      const last = config.rowPattern[config.rowPattern.length - 1];
      return {
        ...config,
        rowPattern: [
          ...config.rowPattern,
          { panelId: last?.panelId ?? fallback, transform: last?.transform ?? 'none' },
        ],
      };
    }
    case 'delete-row': {
      if (config.rowPattern.length <= 1) return config;
      if (action.index < 0 || action.index >= config.rowPattern.length) return config;
      return {
        ...config,
        rowPattern: config.rowPattern.filter((_, i) => i !== action.index),
      };
    }
    case 'update-row': {
      if (action.index < 0 || action.index >= config.rowPattern.length) return config;
      return {
        ...config,
        rowPattern: config.rowPattern.map((step, i) =>
          i === action.index ? { ...step, ...action.patch } : step,
        ),
      };
    }
    default:
      return config;
  }
}

const COALESCE_UPDATE_STRIP_FIELDS = new Set(['widthIn', 'repeat']);
const COALESCE_UPDATE_PANEL_FIELDS = new Set(['thicknessIn', 'label']);
const COALESCE_PATCH_FIELDS = new Set([
  'name',
  'sourceLengthIn',
  'sliceThicknessIn',
  'wasteFactor',
  'rowCount',
]);

export function coalesceKeyFor(action: ConfigAction): string | null {
  if (action.type === 'update-strip') {
    const keys = Object.keys(action.patch);
    // Typed miter angle coalesces; species/corner stay discrete.
    if (
      keys.length === 1 &&
      keys[0] === 'miter' &&
      action.patch.miter &&
      action.patch.miter.angleDeg !== undefined
    ) {
      // Only coalesce when the patch is an angle-only miter update from the UI
      // (same species+corner, changing angleDeg). Key includes species+corner so
      // a corner click cannot merge with a prior angle type.
      const m = action.patch.miter;
      return `update-strip:${action.panelId}:${action.id}:miter.angleDeg:${m.speciesId}:${m.corner}`;
    }
    if (keys.length !== 1) return null;
    const field = keys[0]!;
    if (!COALESCE_UPDATE_STRIP_FIELDS.has(field)) return null;
    return `update-strip:${action.panelId}:${action.id}:${field}`;
  }
  if (action.type === 'update-panel') {
    const keys = Object.keys(action.patch);
    if (keys.length !== 1) return null;
    const field = keys[0]!;
    if (!COALESCE_UPDATE_PANEL_FIELDS.has(field)) return null;
    return `update-panel:${action.id}:${field}`;
  }
  if (action.type === 'patch') {
    const keys = Object.keys(action.patch);
    if (keys.length !== 1) return null;
    const field = keys[0]!;
    if (!COALESCE_PATCH_FIELDS.has(field)) return null;
    return `patch:${field}`;
  }
  return null;
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === 'commit-coalesce') {
    if (state.coalesceKey === null) return state;
    return { ...state, coalesceKey: null };
  }

  if (action.type === 'undo') {
    if (state.past.length === 0) return state;
    const past = state.past.slice();
    const previous = past.pop()!;
    return {
      past,
      present: previous,
      future: [cloneConfig(state.present), ...state.future],
      coalesceKey: null,
    };
  }

  if (action.type === 'redo') {
    if (state.future.length === 0) return state;
    const [next, ...rest] = state.future;
    if (!next) return state;
    return {
      past: [...state.past, cloneConfig(state.present)],
      present: next,
      future: rest,
      coalesceKey: null,
    };
  }

  const next = configReducer(state.present, action);
  if (next === state.present) return state;

  const key = coalesceKeyFor(action);
  if (key !== null && key === state.coalesceKey) {
    return {
      ...state,
      present: next,
      future: [],
      coalesceKey: key,
    };
  }

  const past = [...state.past, cloneConfig(state.present)];
  if (past.length > HISTORY_CAP) {
    past.splice(0, past.length - HISTORY_CAP);
  }

  return {
    past,
    present: next,
    future: [],
    coalesceKey: key,
  };
}

function newStripId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `strip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newPanelId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `panel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
