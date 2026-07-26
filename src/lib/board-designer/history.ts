import type { BoardDesignConfig, Strip } from '@/lib/board-designer/types';

/** Max past snapshots kept in memory. Oldest entries drop first. */
export const HISTORY_CAP = 50;

export type ConfigAction =
  | { type: 'load'; config: BoardDesignConfig }
  | { type: 'patch'; patch: Partial<BoardDesignConfig> }
  | { type: 'add-strip' }
  | { type: 'duplicate-strip'; id: string }
  | { type: 'delete-strip'; id: string }
  | { type: 'move-strip'; id: string; direction: -1 | 1 }
  | { type: 'update-strip'; id: string; patch: Partial<Strip> };

export type HistoryAction =
  | ConfigAction
  | { type: 'undo' }
  | { type: 'redo' }
  /** Ends the current coalesce window so the next edit starts a new undo step. */
  | { type: 'commit-coalesce' };

export type HistoryState = {
  past: BoardDesignConfig[];
  present: BoardDesignConfig;
  future: BoardDesignConfig[];
  /** When set, matching consecutive edits update `present` without growing `past`. */
  coalesceKey: string | null;
};

/**
 * Maps a keyboard event to an undo/redo intent. Pure and exported so the
 * case-folding is TESTABLE rather than buried in an effect.
 *
 * `KeyboardEvent.key` is case-shifted: real hardware reports `'Z'` for Shift+Z,
 * so comparing against `'z'` alone silently drops Ctrl+Shift+Z. A synthesized
 * (CDP) keystroke reports `'z'` with `shiftKey` set instead, which means an
 * automated keypress CANNOT distinguish the two — folding case removes the
 * distinction rather than betting on which one arrives.
 */
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

export function cloneConfig(config: BoardDesignConfig): BoardDesignConfig {
  return {
    ...config,
    strips: config.strips.map((strip) => ({ ...strip })),
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
      return {
        ...config,
        strips: [
          ...config.strips,
          {
            id: newStripId(),
            speciesId: 'hard-maple',
            widthIn: 1.5,
            repeat: 1,
          },
        ],
      };
    case 'duplicate-strip': {
      const index = config.strips.findIndex((strip) => strip.id === action.id);
      if (index < 0) return config;
      const copy = { ...config.strips[index]!, id: newStripId() };
      return {
        ...config,
        strips: [
          ...config.strips.slice(0, index + 1),
          copy,
          ...config.strips.slice(index + 1),
        ],
      };
    }
    case 'delete-strip':
      return {
        ...config,
        strips: config.strips.filter((strip) => strip.id !== action.id),
      };
    case 'move-strip': {
      const index = config.strips.findIndex((strip) => strip.id === action.id);
      const nextIndex = index + action.direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= config.strips.length) return config;
      const strips = config.strips.slice();
      const [strip] = strips.splice(index, 1);
      if (!strip) return config;
      strips.splice(nextIndex, 0, strip);
      return { ...config, strips };
    }
    case 'update-strip':
      return {
        ...config,
        strips: config.strips.map((strip) =>
          strip.id === action.id ? { ...strip, ...action.patch } : strip,
        ),
      };
    default:
      return config;
  }
}

/** Typed strip fields only — discrete clicks (species) each get their own undo step. */
const COALESCE_UPDATE_STRIP_FIELDS = new Set(['widthIn', 'repeat']);

/** Typed board fields only — grain / kerf / flip are discrete and never coalesce. */
const COALESCE_PATCH_FIELDS = new Set([
  'name',
  'sourceLengthIn',
  'stockThicknessIn',
  'sliceThicknessIn',
  'wasteFactor',
]);

/**
 * Coalescing policy (Sprint 55):
 * - Consecutive `update-strip` on the same strip id + typed field (widthIn|repeat)
 *   collapse to one undo step; commit on blur (`commit-coalesce`).
 * - Consecutive `patch` on the same typed board field (name, dimensions, waste)
 *   collapse likewise; commit on Name blur.
 * - Discrete actions (species, grain, kerf, flip, add/delete/move/duplicate/load)
 *   never coalesce — each click is one undo step.
 * - Cap: HISTORY_CAP past snapshots; oldest dropped first.
 */
export function coalesceKeyFor(action: ConfigAction): string | null {
  if (action.type === 'update-strip') {
    const keys = Object.keys(action.patch);
    if (keys.length !== 1) return null;
    const field = keys[0]!;
    if (!COALESCE_UPDATE_STRIP_FIELDS.has(field)) return null;
    return `update-strip:${action.id}:${field}`;
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
