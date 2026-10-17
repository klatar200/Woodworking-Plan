import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_STRIPS_PER_PANEL,
  MAX_STRIPS_TOTAL,
} from '@/lib/board-designer/config-limits';
import {
  DESIGNER_EDIT_NARROW_NOTICE,
  DESIGNER_NEW_NARROW_NOTICE,
} from '@/components/designer/designer-narrow';
import {
  createHistoryState,
  historyReducer,
  type HistoryAction,
  type HistoryState,
} from '@/lib/board-designer/history';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { saveBlockers } from '@/lib/board-designer/save-readiness';
import { parseConfig } from '@/lib/board-designer/serialize';
import { TEMPLATES, getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig, Strip } from '@/lib/board-designer/types';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

/**
 * Sprint 81 — a design the server would reject can never be sent, and the editor cannot build one.
 */

const strips = (n: number, prefix: string): Strip[] =>
  Array.from({ length: n }, (_, i) => makeStrip(`${prefix}${i}`, i % 2 ? 'walnut' : 'hard-maple'));
const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const apply = (state: HistoryState, action: HistoryAction) => historyReducer(state, action);

const checker = () => getTemplate('checkerboard')!.config;

const invalidCases: { name: string; config: BoardDesignConfig; expected: string[] }[] = [
  { name: 'empty name', config: { ...checker(), name: '' }, expected: ['Give the board a name.'] },
  {
    name: 'empty panel label',
    config: { ...checker(), panels: checker().panels.map((p) => ({ ...p, label: '' })) },
    expected: ['Give every panel a label.'],
  },
  {
    name: 'panel with no strips',
    config: makeV2Config({ panels: [makePanel('panel-1', 'Panel 1', 1.5, [])] }),
    expected: ['"Panel 1" needs at least one strip.'],
  },
  {
    name: 'panel with 41 strips',
    config: makeV2Config({ panels: [makePanel('panel-1', 'Panel 1', 1.5, strips(41, 'a'))] }),
    expected: ['"Panel 1" has more than 40 strips.'],
  },
  {
    name: '81 strips in total',
    config: makeV2Config({
      panels: [
        makePanel('p1', 'P1', 1.5, strips(27, 'a')),
        makePanel('p2', 'P2', 1.5, strips(27, 'b')),
        makePanel('p3', 'P3', 1.5, strips(27, 'c')),
      ],
    }),
    expected: ['A board can have at most 80 strips.'],
  },
  {
    name: 'row pointing at a deleted panel',
    config: makeV2Config({ rowPattern: [{ panelId: 'missing', transform: 'none' }] }),
    expected: ['A row in the pattern uses a deleted panel.'],
  },
  {
    name: 'anything else the schema rejects',
    config: { ...checker(), rowCount: 0 },
    expected: ["This design can't be saved — undo your last change."],
  },
];

describe('saveBlockers', () => {
  it('has nothing to say about any template', () => {
    for (const t of TEMPLATES) expect(saveBlockers(t.config), t.id).toEqual([]);
  });

  it.each(invalidCases)('$name → exact message', ({ config, expected }) => {
    expect(saveBlockers(config)).toEqual(expected);
  });

  it('is empty exactly when the server would accept the design', () => {
    for (const config of [...TEMPLATES.map((t) => t.config), ...invalidCases.map((c) => c.config)]) {
      expect(saveBlockers(config).length === 0).toBe(parseConfig(config).ok);
    }
  });
});

describe('strip caps', () => {
  it('names the schema limits and the schema enforces them', () => {
    expect(MAX_STRIPS_PER_PANEL).toBe(40);
    expect(MAX_STRIPS_TOTAL).toBe(80);
    const over = invalidCases.filter((c) => /40 strips|80 strips/.test(c.expected[0]!));
    for (const c of over) expect(parseConfig(c.config).ok, c.name).toBe(false);
  });

  it('add-strip and duplicate-strip stop at 40 in a panel and 80 on the board', () => {
    const fullPanel = createHistoryState(
      makeV2Config({ panels: [makePanel('p1', 'P1', 1.5, strips(40, 'a'))] }),
    );
    expect(apply(fullPanel, { type: 'add-strip', panelId: 'p1' })).toBe(fullPanel);
    expect(apply(fullPanel, { type: 'duplicate-strip', panelId: 'p1', id: 'a0' })).toBe(fullPanel);

    const fullBoard = createHistoryState(
      makeV2Config({
        panels: [
          makePanel('p1', 'P1', 1.5, strips(30, 'a')),
          makePanel('p2', 'P2', 1.5, strips(30, 'b')),
          makePanel('p3', 'P3', 1.5, strips(20, 'c')),
        ],
      }),
    );
    expect(apply(fullBoard, { type: 'add-strip', panelId: 'p3' })).toBe(fullBoard);
    expect(apply(fullBoard, { type: 'duplicate-strip', panelId: 'p3', id: 'c0' })).toBe(fullBoard);
  });

  it('add-panel will not copy a panel past 80 strips', () => {
    const state = createHistoryState(
      makeV2Config({
        panels: [
          makePanel('p1', 'P1', 1.5, strips(40, 'a')),
          makePanel('p2', 'P2', 1.5, strips(40, 'b')),
        ],
      }),
    );
    expect(apply(state, { type: 'add-panel' })).toBe(state);
  });
});

describe('delete-panel', () => {
  it('takes its rows with it, and never leaves the pattern empty', () => {
    let state = createHistoryState(makeV2Config());
    state = apply(state, { type: 'add-panel' });
    const added = state.present.panels[1]!.id;
    state = apply(state, { type: 'delete-panel', id: added });
    expect(state.present.rowPattern.some((s) => s.panelId === added)).toBe(false);

    const everyRowUsesB = createHistoryState(
      makeV2Config({
        panels: [
          makePanel('a', 'A', 1.5, strips(2, 'a')),
          makePanel('b', 'B', 1.5, strips(2, 'b')),
        ],
        rowPattern: [
          { panelId: 'b', transform: 'none' },
          { panelId: 'b', transform: 'rot180' },
        ],
      }),
    );
    const after = apply(everyRowUsesB, { type: 'delete-panel', id: 'b' });
    expect(after.present.rowPattern).toEqual([{ panelId: 'a', transform: 'none' }]);
  });

  it('history.ts no longer says dangling steps are kept on purpose', () => {
    expect(source('src/lib/board-designer/history.ts')).not.toMatch(/deliberately does NOT clean/);
  });
});

describe('miters are end-grain only', () => {
  it('an edge-grain board with a mitered strip gets no lattice warnings', () => {
    const edge = makeV2Config({
      grain: 'edge',
      panels: [
        makePanel('p1', 'P1', 1.5, [
          { ...makeStrip('m', 'hard-maple'), miter: { speciesId: 'walnut', angleDeg: 30, corner: 'tr' } },
          makeStrip('s', 'walnut'),
        ]),
      ],
    });
    const warnings = calculateMetrics(edge).warnings;
    expect(warnings.some((w) => /lattice|Miter pattern does not close/.test(w))).toBe(false);
    expect(calculateMetrics(getTemplate('harlequin')!.config).warnings).toEqual([]);
  });
});

describe('source guards', () => {
  it('drafts never touch localStorage, and sign-out clears them before the worker check', () => {
    expect(source('src/lib/board-designer/draft-store.ts')).not.toContain('localStorage');
    expect(source('src/components/designer/designer-shell.tsx')).not.toContain('localStorage');
    const file = source('src/components/service-worker.tsx');
    const guard = file.slice(file.indexOf('export function PrivateCacheGuard'));
    expect(guard.indexOf('clearAllDrafts()')).toBeGreaterThan(-1);
    expect(guard.indexOf('clearAllDrafts()')).toBeLessThan(
      guard.indexOf("if (!('serviceWorker' in navigator)) return;"),
    );
  });

  it('the clamp-per-keystroke helpers are gone and every listed field uses BoundedNumberInput', () => {
    const stripList = source('src/components/designer/strip-list.tsx');
    const settings = source('src/components/designer/board-settings.tsx');
    expect(stripList).not.toMatch(/function boundedNumber/);
    expect(settings).not.toMatch(/function boundedNumber/);
    expect(stripList.match(/<BoundedNumberInput/g)).toHaveLength(3); // width, repeat, angle
    expect(settings.match(/<BoundedNumberInput/g)).toHaveLength(2); // NumberField ×3 fields, defects
    expect(source('src/components/designer/panel-editor.tsx')).toContain('<BoundedNumberInput');
    expect(source('src/components/designer/row-pattern-editor.tsx')).toContain('<BoundedNumberInput');
    expect(settings).toMatch(/function NumberField[\s\S]*<BoundedNumberInput/);
  });

  it('the library delete goes through DeleteDesignButton', () => {
    const lib = source('src/app/designer/library/page.tsx');
    expect(lib).toContain('<DeleteDesignButton');
    expect(lib).not.toContain('<form action={deleteBoardDesignAction}>');
  });

  it('Sprint 54 narrow notices are unchanged', () => {
    expect(DESIGNER_NEW_NARROW_NOTICE).toBe(
      'Designing a board needs a wider screen. Your saved boards are available here.',
    );
    expect(DESIGNER_EDIT_NARROW_NOTICE).toBe(
      'Editing needs a wider screen. You can still view this board and its print sheet.',
    );
  });
});
