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

  it('caps past at HISTORY_CAP but keeps the loaded baseline as undo floor', () => {
    let state = createHistoryState(base);
    expect(state.baseline.name).toBe('Start');
    for (let i = 0; i < HISTORY_CAP + 5; i += 1) {
      state = historyReducer(state, {
        type: 'patch',
        patch: { name: `n-${i}` },
      });
      state = historyReducer(state, { type: 'commit-coalesce' });
    }
    expect(state.past).toHaveLength(HISTORY_CAP);
    // Floor is always the opened design — never a mid-edit empty/partial name.
    expect(state.past[0]!.name).toBe('Start');
    expect(configsEqual(state.past[0]!, state.baseline)).toBe(true);
    expect(state.present.name).toBe(`n-${HISTORY_CAP + 4}`);
  });

  it('opening a saved design seeds baseline; undo-to-bottom restores name/grain/strips', () => {
    const loaded = makeV2Config({
      name: 'verify-51',
      grain: 'end',
      panels: [
        makePanel('panel-1', 'Panel 1', 1.5, [
          makeStrip('s1', 'hard-maple'),
          makeStrip('s2', 'walnut', 1),
        ]),
      ],
      rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
      rowCount: 1,
    });
    let state = createHistoryState(loaded);
    expect(configsEqual(state.present, loaded)).toBe(true);
    expect(configsEqual(state.baseline, loaded)).toBe(true);

    state = apply(
      state,
      { type: 'patch', patch: { name: '' } },
      { type: 'commit-coalesce' },
      { type: 'add-strip', panelId: 'panel-1' },
      {
        type: 'update-strip',
        panelId: 'panel-1',
        id: 's1',
        patch: { label: 'Accent A' },
      },
      { type: 'commit-coalesce' },
    );
    expect(state.present.name).toBe('');
    expect(stripsOf(state.present)).toHaveLength(3);

    while (canUndo(state)) {
      state = apply(state, { type: 'undo' });
    }
    expect(state.present.name).toBe('verify-51');
    expect(state.present.grain).toBe('end');
    expect(stripsOf(state.present).map((s) => s.id)).toEqual(['s1', 's2']);
    expect(configsEqual(state.present, loaded)).toBe(true);
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

  it('coalesced label typing collapses to one undo step and empty labels are omitted', () => {
    let state = createHistoryState(base);
    state = apply(
      state,
      { type: 'update-strip', panelId: 'panel-1', id: 's1', patch: { label: 'M' } },
      { type: 'update-strip', panelId: 'panel-1', id: 's1', patch: { label: 'Ma' } },
      { type: 'update-strip', panelId: 'panel-1', id: 's1', patch: { label: 'Maple rail' } },
    );
    expect(state.past).toHaveLength(1);
    expect(stripsOf(state.present)[0]!.label).toBe('Maple rail');

    state = apply(state, {
      type: 'update-strip',
      panelId: 'panel-1',
      id: 's1',
      patch: { label: undefined },
    });
    expect(stripsOf(state.present)[0]).not.toHaveProperty('label');

    state = apply(state, { type: 'undo' });
    expect(stripsOf(state.present)[0]).not.toHaveProperty('label');
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

  it('strip labels survive reorder and serialized reload', async () => {
    const { parseConfig } = await import('@/lib/board-designer/serialize');
    let state = createHistoryState(base);
    state = apply(
      state,
      {
        type: 'update-strip',
        panelId: 'panel-1',
        id: 's1',
        patch: { label: 'Maple rail' },
      },
      {
        type: 'reorder-strip',
        panelId: 'panel-1',
        fromIndex: 0,
        toIndex: 1,
      },
    );

    const reloaded = parseConfig(JSON.parse(JSON.stringify(state.present)));
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    expect(stripsOf(reloaded.config).map((strip) => [strip.id, strip.label])).toEqual([
      ['s2', undefined],
      ['s1', 'Maple rail'],
    ]);
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

describe('add-panel — appends one row step (Sprint 77)', () => {
  const endBase: BoardDesignConfig = makeV2Config({
    name: 'End panel',
    grain: 'end',
    panels: [
      makePanel('panel-1', 'Panel 1', 1.5, [makeStrip('s1', 'hard-maple')]),
    ],
    rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
    rowCount: 8,
  });

  it('appends exactly one RowStep for the new panel with transform none', () => {
    let state = createHistoryState(endBase);
    state = apply(state, { type: 'add-panel' });
    expect(state.present.panels).toHaveLength(2);
    const newId = state.present.panels[1]!.id;
    expect(state.present.rowPattern).toHaveLength(2);
    expect(state.present.rowPattern[1]).toEqual({
      panelId: newId,
      transform: 'none',
    });
    // One history entry — single dispatch, single past snapshot.
    expect(state.past).toHaveLength(1);
  });

  it('at 24 row steps still adds the panel and appends no step', () => {
    const fullPattern = Array.from({ length: 24 }, () => ({
      panelId: 'panel-1' as const,
      transform: 'none' as const,
    }));
    const start = createHistoryState(
      makeV2Config({
        ...endBase,
        rowPattern: fullPattern,
      }),
    );
    const next = historyReducer(start, { type: 'add-panel' });
    expect(next.present.panels).toHaveLength(2);
    expect(next.present.rowPattern).toHaveLength(24);
    expect(next.present.rowPattern).toEqual(fullPattern);
    expect(next.past).toHaveLength(1);
  });

  it('at 4 panels returns the config unchanged — no panel and no step', () => {
    const four = makeV2Config({
      panels: [
        makePanel('p1', 'Panel 1', 1.5, [makeStrip('a', 'walnut')]),
        makePanel('p2', 'Panel 2', 1.5, [makeStrip('b', 'walnut')]),
        makePanel('p3', 'Panel 3', 1.5, [makeStrip('c', 'walnut')]),
        makePanel('p4', 'Panel 4', 1.5, [makeStrip('d', 'walnut')]),
      ],
      rowPattern: [{ panelId: 'p1', transform: 'none' }],
    });
    const start = createHistoryState(four);
    const next = historyReducer(start, { type: 'add-panel' });
    expect(next).toBe(start);
    expect(next.present.panels).toHaveLength(4);
    expect(next.present.rowPattern).toHaveLength(1);
    expect(next.past).toHaveLength(0);
  });

  it('delete-panel still leaves dangling rowPattern entries', () => {
    let state = createHistoryState(endBase);
    state = apply(state, { type: 'add-panel' });
    const removedId = state.present.panels[1]!.id;
    expect(state.present.rowPattern.some((s) => s.panelId === removedId)).toBe(
      true,
    );
    state = apply(state, { type: 'delete-panel', id: removedId });
    expect(state.present.panels).toHaveLength(1);
    expect(state.present.rowPattern.some((s) => s.panelId === removedId)).toBe(
      true,
    );
  });
});
