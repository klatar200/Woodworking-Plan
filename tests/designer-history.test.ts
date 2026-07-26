import { describe, expect, it } from 'vitest';
import {
  HISTORY_CAP,
  canRedo,
  canUndo,
  cloneConfig,
  configsEqual,
  createHistoryState,
  historyReducer,
  undoRedoShortcut,
  type HistoryState,
} from '@/lib/board-designer/history';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

const base: BoardDesignConfig = makeV2Config({
  name: 'Start',
  grain: 'edge',
  sourceLengthIn: 20,
  sliceThicknessIn: 1.5,
  panels: [
    makePanel('panel-1', 'Panel 1', 1.5, [
      makeStrip('s1', 'hard-maple'),
      makeStrip('s2', 'walnut', 1),
    ]),
  ],
  rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
  rowCount: 1,
});

function apply(state: HistoryState, ...actions: Parameters<typeof historyReducer>[1][]) {
  return actions.reduce((s, action) => historyReducer(s, action), state);
}

function stripsOf(config: BoardDesignConfig) {
  return config.panels[0]!.strips;
}

describe('designer history reducer', () => {
  it('undo restores the previous config; redo restores the undone one', () => {
    let state = createHistoryState(base);
    state = apply(state, { type: 'add-strip', panelId: 'panel-1' });
    expect(stripsOf(state.present)).toHaveLength(3);
    const afterAdd = state.present;

    state = apply(state, { type: 'undo' });
    expect(configsEqual(state.present, base)).toBe(true);
    expect(canRedo(state)).toBe(true);

    state = apply(state, { type: 'redo' });
    expect(configsEqual(state.present, afterAdd)).toBe(true);
    expect(canUndo(state)).toBe(true);
  });

  it('a new action after undo clears the redo stack', () => {
    let state = createHistoryState(base);
    state = apply(
      state,
      { type: 'patch', patch: { name: 'A' } },
      { type: 'commit-coalesce' },
      { type: 'patch', patch: { name: 'B' } },
      { type: 'undo' },
    );
    expect(state.present.name).toBe('A');
    expect(canRedo(state)).toBe(true);

    state = apply(state, { type: 'add-strip', panelId: 'panel-1' });
    expect(canRedo(state)).toBe(false);
    expect(state.future).toHaveLength(0);
    expect(stripsOf(state.present)).toHaveLength(3);
    expect(state.present.name).toBe('A');
  });

  it('undo at the start and redo at the end are no-ops', () => {
    const start = createHistoryState(base);
    expect(historyReducer(start, { type: 'undo' })).toBe(start);

    const atEnd = apply(start, { type: 'add-strip', panelId: 'panel-1' });
    expect(historyReducer(atEnd, { type: 'redo' })).toBe(atEnd);
  });

  it('caps past at HISTORY_CAP and drops the oldest entry', () => {
    let state = createHistoryState(base);
    for (let i = 0; i < HISTORY_CAP + 5; i += 1) {
      state = historyReducer(state, {
        type: 'patch',
        patch: { name: `n-${i}` },
      });
      state = historyReducer(state, { type: 'commit-coalesce' });
    }
    expect(state.past).toHaveLength(HISTORY_CAP);
    // Oldest kept snapshot is after the first 5 dropped edits (names n-0..n-4 gone).
    expect(state.past[0]!.name).toBe('n-4');
    expect(state.present.name).toBe(`n-${HISTORY_CAP + 4}`);
  });

  it('coalesced width typing collapses to one undo step', () => {
    let state = createHistoryState(base);
    state = apply(
      state,
      { type: 'update-strip', panelId: 'panel-1', id: 's1', patch: { widthIn: 1 } },
      { type: 'update-strip', panelId: 'panel-1', id: 's1', patch: { widthIn: 2 } },
      { type: 'update-strip', panelId: 'panel-1', id: 's1', patch: { widthIn: 3 } },
      { type: 'update-strip', panelId: 'panel-1', id: 's1', patch: { widthIn: 4 } },
    );
    expect(state.past).toHaveLength(1);
    expect(stripsOf(state.present)[0]!.widthIn).toBe(4);

    state = apply(state, { type: 'undo' });
    expect(stripsOf(state.present)[0]!.widthIn).toBe(1.5);
    expect(configsEqual(state.present, base)).toBe(true);
  });

  it('commit-coalesce starts a new undo step for the next typed edit', () => {
    let state = createHistoryState(base);
    state = apply(
      state,
      { type: 'update-strip', panelId: 'panel-1', id: 's1', patch: { widthIn: 2 } },
      { type: 'commit-coalesce' },
      { type: 'update-strip', panelId: 'panel-1', id: 's1', patch: { widthIn: 3 } },
    );
    expect(state.past).toHaveLength(2);

    state = apply(state, { type: 'undo' });
    expect(stripsOf(state.present)[0]!.widthIn).toBe(2);
    state = apply(state, { type: 'undo' });
    expect(stripsOf(state.present)[0]!.widthIn).toBe(1.5);
  });

  it('template/load is undoable and restores the exact prior config', () => {
    const template: BoardDesignConfig = makeV2Config({
      name: 'Template board',
      grain: 'edge',
      panels: [
        makePanel('panel-1', 'Panel 1', 1.5, [
          makeStrip('t1', 'cherry', 2, 2),
        ]),
      ],
      rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
      rowCount: 1,
    });
    let state = createHistoryState(base);
    state = apply(
      state,
      {
        type: 'update-strip',
        panelId: 'panel-1',
        id: 's1',
        patch: { speciesId: 'cherry' },
      },
      { type: 'load', config: template },
    );
    expect(state.present.name).toBe('Template board');
    expect(stripsOf(state.present)).toHaveLength(1);

    state = apply(state, { type: 'undo' });
    expect(state.present.name).toBe('Start');
    expect(stripsOf(state.present)[0]!.speciesId).toBe('cherry');
    expect(stripsOf(state.present)).toHaveLength(2);

    state = apply(state, { type: 'undo' });
    expect(configsEqual(state.present, base)).toBe(true);
  });

  it('undoing to the initial config clears dirty (serialized equality)', () => {
    let state = createHistoryState(base);
    state = apply(state, { type: 'add-strip', panelId: 'panel-1' });
    expect(configsEqual(state.present, base)).toBe(false);

    state = apply(state, { type: 'undo' });
    expect(configsEqual(state.present, base)).toBe(true);
    // Mirrors DesignerShell: dirty = serialize(present) !== serialize(initial)
    expect(JSON.stringify(state.present) !== JSON.stringify(base)).toBe(false);
  });

  it('present serialization is what a hidden config input would submit', () => {
    let state = createHistoryState(base);
    state = apply(state, {
      type: 'update-strip',
      panelId: 'panel-1',
      id: 's1',
      patch: { widthIn: 2.25 },
    });
    const submitted = JSON.stringify(state.present);
    expect(JSON.parse(submitted).panels[0].strips[0].widthIn).toBe(2.25);

    state = apply(state, { type: 'undo' });
    expect(JSON.stringify(state.present)).toBe(JSON.stringify(base));
  });

  it('discrete species changes do not coalesce', () => {
    let state = createHistoryState(base);
    state = apply(
      state,
      {
        type: 'update-strip',
        panelId: 'panel-1',
        id: 's1',
        patch: { speciesId: 'cherry' },
      },
      {
        type: 'update-strip',
        panelId: 'panel-1',
        id: 's1',
        patch: { speciesId: 'walnut' },
      },
    );
    expect(state.past).toHaveLength(2);
  });

  it('cloneConfig deep-clones panels, strips, and rowPattern', () => {
    const config = makeV2Config({
      rowPattern: [
        { panelId: 'panel-1', transform: 'none' },
        { panelId: 'panel-1', transform: 'rot180' },
      ],
    });
    const cloned = cloneConfig(config);
    cloned.panels[0]!.strips[0]!.widthIn = 9;
    cloned.rowPattern[0]!.transform = 'mirrorY';
    expect(config.panels[0]!.strips[0]!.widthIn).toBe(1.5);
    expect(config.rowPattern[0]!.transform).toBe('none');
  });
});

describe('reorder-strip — one drag, one undo (Sprint 65)', () => {
  const threeStrip: BoardDesignConfig = makeV2Config({
    name: 'Reorder',
    grain: 'edge',
    panels: [
      makePanel('panel-1', 'Panel 1', 1.5, [
        makeStrip('s1', 'hard-maple'),
        makeStrip('s2', 'walnut', 1),
        makeStrip('s3', 'cherry', 2),
      ]),
    ],
    rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
    rowCount: 1,
  });

  it('moves strip i to index j in one reduction', () => {
    let state = createHistoryState(threeStrip);
    state = apply(state, {
      type: 'reorder-strip',
      panelId: 'panel-1',
      fromIndex: 0,
      toIndex: 2,
    });
    expect(stripsOf(state.present).map((s) => s.id)).toEqual(['s2', 's3', 's1']);
    expect(state.past).toHaveLength(1);
  });

  it('same-index reorder is a no-op that writes no history entry', () => {
    const start = createHistoryState(threeStrip);
    const next = historyReducer(start, {
      type: 'reorder-strip',
      panelId: 'panel-1',
      fromIndex: 1,
      toIndex: 1,
    });
    expect(next).toBe(start);
    expect(next.past).toHaveLength(0);
  });

  it('one reorder → exactly one undo entry; undo restores original order', () => {
    let state = createHistoryState(threeStrip);
    state = apply(state, {
      type: 'reorder-strip',
      panelId: 'panel-1',
      fromIndex: 2,
      toIndex: 0,
    });
    expect(state.past).toHaveLength(1);
    expect(stripsOf(state.present).map((s) => s.id)).toEqual(['s3', 's1', 's2']);

    state = apply(state, { type: 'undo' });
    expect(stripsOf(state.present).map((s) => s.id)).toEqual(['s1', 's2', 's3']);
    expect(canRedo(state)).toBe(true);

    state = apply(state, { type: 'redo' });
    expect(stripsOf(state.present).map((s) => s.id)).toEqual(['s3', 's1', 's2']);
  });

  it('out-of-range indices are ignored (same bail as delete-row / move-strip)', () => {
    const start = createHistoryState(threeStrip);
    for (const action of [
      { type: 'reorder-strip' as const, panelId: 'panel-1', fromIndex: -1, toIndex: 0 },
      { type: 'reorder-strip' as const, panelId: 'panel-1', fromIndex: 0, toIndex: 99 },
      { type: 'reorder-strip' as const, panelId: 'panel-1', fromIndex: 99, toIndex: 0 },
      { type: 'move-strip' as const, panelId: 'panel-1', id: 's1', direction: -1 as const },
      { type: 'delete-row' as const, index: -1 },
    ]) {
      expect(historyReducer(start, action)).toBe(start);
    }
  });

  it('arrow move-strip still reorders one step at a time', () => {
    let state = createHistoryState(threeStrip);
    state = apply(state, {
      type: 'move-strip',
      panelId: 'panel-1',
      id: 's1',
      direction: 1,
    });
    expect(stripsOf(state.present).map((s) => s.id)).toEqual(['s2', 's1', 's3']);
    expect(state.past).toHaveLength(1);
  });

  it('mutating present after reorder does not mutate the past snapshot', () => {
    let state = createHistoryState(threeStrip);
    state = apply(state, {
      type: 'reorder-strip',
      panelId: 'panel-1',
      fromIndex: 0,
      toIndex: 2,
    });
    const pastFrozen = JSON.stringify(state.past[0]);
    stripsOf(state.present)[0]!.widthIn = 99;
    expect(JSON.stringify(state.past[0])).toBe(pastFrozen);
    expect(stripsOf(state.past[0]!)[0]!.widthIn).toBe(1.5);

    state = apply(state, { type: 'undo' });
    const futureFrozen = JSON.stringify(state.future[0]);
    stripsOf(state.present)[0]!.speciesId = 'padauk';
    expect(JSON.stringify(state.future[0])).toBe(futureFrozen);
  });
});


describe('undoRedoShortcut — key case is NOT stable across input sources', () => {
  const ev = (over: Partial<KeyboardEvent> & { key: string }) => ({
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    ...over,
  });

  it('undoes on Ctrl+Z and Cmd+Z', () => {
    expect(undoRedoShortcut(ev({ key: 'z', ctrlKey: true }))).toBe('undo');
    expect(undoRedoShortcut(ev({ key: 'z', metaKey: true }))).toBe('undo');
  });

  // Real hardware reports 'Z' for Shift+Z; a CDP-synthesized keystroke reports
  // 'z' with shiftKey set. BOTH must redo — the original handler matched only
  // lowercase 'z' for the shift branch, so Ctrl+Shift+Z was a silent no-op on a
  // real keyboard while any automated test would have passed.
  it('redoes on Ctrl+Shift+Z whichever case the platform reports', () => {
    expect(undoRedoShortcut(ev({ key: 'Z', ctrlKey: true, shiftKey: true }))).toBe('redo');
    expect(undoRedoShortcut(ev({ key: 'z', ctrlKey: true, shiftKey: true }))).toBe('redo');
    expect(undoRedoShortcut(ev({ key: 'Z', metaKey: true, shiftKey: true }))).toBe('redo');
  });

  it('redoes on Ctrl+Y in either case', () => {
    expect(undoRedoShortcut(ev({ key: 'y', ctrlKey: true }))).toBe('redo');
    expect(undoRedoShortcut(ev({ key: 'Y', ctrlKey: true }))).toBe('redo');
  });

  it('ignores the keys without a modifier, and unrelated modified keys', () => {
    expect(undoRedoShortcut(ev({ key: 'z' }))).toBeNull();
    expect(undoRedoShortcut(ev({ key: 'Z', shiftKey: true }))).toBeNull();
    expect(undoRedoShortcut(ev({ key: 's', ctrlKey: true }))).toBeNull();
    expect(undoRedoShortcut(ev({ key: 'ArrowLeft', ctrlKey: true }))).toBeNull();
  });
});
