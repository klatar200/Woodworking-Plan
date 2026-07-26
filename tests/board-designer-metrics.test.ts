import { describe, it, expect } from 'vitest';
import { optimize, DEFAULT_OPTIONS, type Part } from '@/lib/cut-optimizer';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { layoutTopFace } from '@/lib/board-designer/layout';
import { miterLatticeCloses } from '@/lib/board-designer/miter-geometry';
import { toParts } from '@/lib/board-designer/to-parts';
import { getTemplate, TEMPLATES } from '@/lib/board-designer/templates';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

/** §2.3 golden-ish: 12 strips × 1.5″ alternating walnut/maple, 12 rows. */
function goldenConfig(
  over: Partial<BoardDesignConfig> & { panels?: BoardDesignConfig['panels'] } = {},
): BoardDesignConfig {
  const strips = Array.from({ length: 12 }, (_, i) =>
    makeStrip(`g-${i + 1}`, i % 2 === 0 ? 'walnut' : 'hard-maple'),
  );
  return makeV2Config({
    name: 'Golden end-grain',
    grain: 'end',
    sourceLengthIn: 20,
    sliceThicknessIn: 1.5,
    kerfIn: 0.125,
    wasteFactor: 0.15,
    panels: [makePanel('panel-1', 'Panel 1', 1.5, strips)],
    rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
    rowCount: 12,
    ...over,
  });
}

describe('§2.3 golden fixture', () => {
  it('12 strips × 1.5″ / 12 rows / panel 1.5 / slice 1.5 → 18×18×1.5', () => {
    const m = calculateMetrics(goldenConfig());
    expect(m.panelWidthIn).toBe(18);
    expect(m.sliceCount).toBe(12);
    expect(m.panelPlan).toHaveLength(1);
    expect(m.panelPlan[0]!.requiredLengthIn).toBe(19.375);
    expect(m.finishedLengthIn).toBe(18);
    expect(m.finishedWidthIn).toBe(18);
    expect(m.finishedThicknessIn).toBe(1.5);
    expect(m.complete).toBe(true);
    expect(m).not.toHaveProperty('leftoverIn');
  });
});

describe('panelPlan kerf accounting', () => {
  it('requiredLengthIn = rows×slice + (rows−1)×kerf', () => {
    const m = calculateMetrics(
      goldenConfig({
        rowCount: 11,
        panels: [
          makePanel('panel-1', 'Panel 1', 1.5, [
            makeStrip('k-1', 'hard-maple'),
          ]),
        ],
      }),
    );
    expect(m.sliceCount).toBe(11);
    expect(m.panelPlan[0]!.requiredLengthIn).toBe(17.75);
  });
});

describe('edge-grain fixture', () => {
  it('7 × 1.5″ / length 18 / thickness 0.75 → finished 18 × 10.5 × 0.75, sliceCount 0', () => {
    const strips = Array.from({ length: 7 }, (_, i) =>
      makeStrip(`e-${i + 1}`, i % 2 === 0 ? 'hard-maple' : 'walnut'),
    );
    const m = calculateMetrics(
      makeV2Config({
        name: 'Edge stripe',
        grain: 'edge',
        sourceLengthIn: 18,
        sliceThicknessIn: 0.75,
        panels: [makePanel('panel-1', 'Panel 1', 0.75, strips)],
        rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
        rowCount: 1,
      }),
    );
    expect(m.finishedLengthIn).toBe(18);
    expect(m.finishedWidthIn).toBe(10.5);
    expect(m.finishedThicknessIn).toBe(0.75);
    expect(m.sliceCount).toBe(0);
    expect(m.panelPlan).toHaveLength(1);
    expect(m.panelPlan[0]!.requiredLengthIn).toBe(18);
  });
});

describe('board feet', () => {
  it('golden fixture → walnut and maple each ~2.089; total ~4.178', () => {
    // requiredLength 19.375; 6 strips × 1.5″; (1.5 × 1.5 × 19.375) / 144 × 1.15 × 6
    const m = calculateMetrics(goldenConfig());
    const walnut = m.boardFeetBySpecies.find((r) => r.speciesId === 'walnut');
    const maple = m.boardFeetBySpecies.find(
      (r) => r.speciesId === 'hard-maple',
    );
    expect(walnut?.boardFeet).toBeCloseTo(2.0888671875, 10);
    expect(maple?.boardFeet).toBeCloseTo(2.0888671875, 10);
    expect(m.totalBoardFeet).toBeCloseTo(4.177734375, 10);
  });
});

describe('toParts()', () => {
  it('output satisfies Part[] and optimize has no impossible for golden', () => {
    const config = goldenConfig();
    const parts: Part[] = toParts(config);
    expect(parts).toHaveLength(12);
    expect(parts[0]).toMatchObject({
      id: 'g-1',
      label: 'Strip 1',
      quantity: 1,
      thicknessIn: 1.5,
      widthIn: 1.5,
      lengthIn: 19.375,
      material: 'Walnut',
    });
    expect(parts[1]?.label).toBe('Strip 2');

    const groups = optimize(parts, DEFAULT_OPTIONS);
    for (const g of groups) {
      expect(g.impossible).toEqual([]);
    }
  });

  it('uses strip.label in part labels; falls back to Strip n', () => {
    const labelled = makeStrip('a', 'hard-maple');
    labelled.label = 'Accent A';
    const parts = toParts(
      makeV2Config({
        grain: 'edge',
        panels: [makePanel('panel-1', 'Panel 1', 1.5, [labelled, makeStrip('b', 'walnut')])],
        rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
        rowCount: 1,
      }),
    );
    expect(parts[0]?.label).toBe('Accent A');
    expect(parts[1]?.label).toBe('Strip 2');
  });
});

describe('empty strips', () => {
  it('calculateMetrics with empty panel strips → warning, complete false, no NaN', () => {
    const m = calculateMetrics(
      goldenConfig({
        panels: [makePanel('panel-1', 'Panel 1', 1.5, [])],
      }),
    );
    expect(m.warnings).toContain('Add a strip to see your board.');
    expect(m.complete).toBe(false);
    const nums = [
      m.panelWidthIn,
      m.finishedLengthIn,
      m.finishedWidthIn,
      m.finishedThicknessIn,
      m.sliceCount,
      m.totalBoardFeet,
      ...m.panelPlan.map((p) => p.requiredLengthIn),
    ];
    for (const n of nums) {
      expect(Number.isNaN(n)).toBe(false);
    }
  });
});

describe('multi-panel warnings', () => {
  it('unequal panel widths → exact warning and complete:false', () => {
    const m = calculateMetrics(
      makeV2Config({
        panels: [
          makePanel('a', 'A', 1.5, [makeStrip('a1', 'walnut', 2)]),
          makePanel('b', 'B', 1.5, [makeStrip('b1', 'walnut', 3)]),
        ],
        rowPattern: [
          { panelId: 'a', transform: 'none' },
          { panelId: 'b', transform: 'none' },
        ],
        rowCount: 2,
      }),
    );
    expect(m.warnings).toContain(
      'Panels must be the same width — slices will not line up.',
    );
    expect(m.complete).toBe(false);
  });

  it('rowPattern naming a deleted panel → warning, complete:false', () => {
    const m = calculateMetrics(
      makeV2Config({
        panels: [makePanel('a', 'A', 1.5, [makeStrip('a1', 'walnut', 1.5)])],
        rowPattern: [
          { panelId: 'a', transform: 'none' },
          { panelId: 'gone', transform: 'none' },
        ],
        rowCount: 2,
      }),
    );
    expect(m.warnings).toContain('Row pattern uses a panel that was deleted.');
    expect(m.complete).toBe(false);
  });

  it('edge grain with extra panels → exact warning, complete:true', () => {
    const m = calculateMetrics(
      makeV2Config({
        grain: 'edge',
        sourceLengthIn: 18,
        panels: [
          makePanel('a', 'A', 0.75, [
            makeStrip('a1', 'hard-maple', 1.5),
            makeStrip('a2', 'walnut', 1.5),
          ]),
          makePanel('b', 'B', 0.75, [makeStrip('b1', 'cherry', 3)]),
        ],
        rowPattern: [{ panelId: 'a', transform: 'none' }],
        rowCount: 1,
      }),
    );
    expect(m.warnings).toContain('Extra panels are unused in edge grain.');
    expect(m.complete).toBe(true);
    expect(m.finishedWidthIn).toBe(3);
    expect(m.panelPlan).toHaveLength(1);
  });
});

describe('templates — finished dimensions + panelPlan', () => {
  it('checkerboard → 8 slices / finished 18 × 12 × 1.5 / requiredLength 12.875', () => {
    const t = getTemplate('checkerboard');
    expect(t).toBeDefined();
    const m = calculateMetrics(t!.config);
    expect(m.sliceCount).toBe(8);
    expect(m.finishedLengthIn).toBe(18);
    expect(m.finishedWidthIn).toBe(12);
    expect(m.finishedThicknessIn).toBe(1.5);
    expect(m.panelPlan[0]!.requiredLengthIn).toBe(12.875);
  });

  it('every template finished column is asserted', () => {
    const expected: Record<
      string,
      { length: number; width: number; thickness: number }
    > = {
      'classic-stripe': { length: 18, width: 10.5, thickness: 0.75 },
      checkerboard: { length: 18, width: 12, thickness: 1.5 },
      'butcher-block': { length: 20, width: 9.5, thickness: 1.5 },
      'accent-stripe': { length: 16, width: 11, thickness: 0.75 },
      plaid: { length: 9.75, width: 12, thickness: 1.5 },
      brick: { length: 8.75, width: 18, thickness: 1.5 },
      diagonal: { length: 10, width: 18, thickness: 1.5 },
      'thue-morse': { length: 12, width: 12, thickness: 1.5 },
      harlequin: {
        length: 7,
        width: 8,
        thickness: 1.5,
      },
    };
    expect(TEMPLATES).toHaveLength(9);
    for (const t of TEMPLATES) {
      const m = calculateMetrics(t.config);
      const e = expected[t.id]!;
      expect(m.finishedLengthIn).toBe(e.length);
      expect(m.finishedWidthIn).toBe(e.width);
      expect(m.finishedThicknessIn).toBe(e.thickness);
    }
  });

  it('plaid/brick/diagonal/thue-morse panelPlan counts', () => {
    const plaid = calculateMetrics(getTemplate('plaid')!.config);
    expect(plaid.panelPlan).toHaveLength(3);
    expect(plaid.panelPlan.map((p) => p.rows)).toEqual([3, 3, 6]);
    expect(plaid.panelPlan.map((p) => p.requiredLengthIn)).toEqual([
      4.75, 4.75, 9.625,
    ]);

    const brick = calculateMetrics(getTemplate('brick')!.config);
    expect(brick.panelPlan).toHaveLength(2);
    expect(brick.panelPlan.map((p) => p.rows)).toEqual([6, 6]);

    const diagonal = calculateMetrics(getTemplate('diagonal')!.config);
    expect(diagonal.panelPlan).toHaveLength(4);
    expect(diagonal.panelPlan.map((p) => p.rows)).toEqual([3, 3, 3, 3]);

    const tm = calculateMetrics(getTemplate('thue-morse')!.config);
    expect(tm.panelPlan).toHaveLength(1);
    expect(tm.panelPlan[0]!.rows).toBe(8);
    expect(tm.panelPlan[0]!.requiredLengthIn).toBe(12.875);
  });
});

describe('unknown species warning', () => {
  it('emits Unknown wood: <id> and stays complete', () => {
    const m = calculateMetrics(
      makeV2Config({
        grain: 'edge',
        panels: [
          makePanel('panel-1', 'Panel 1', 1.5, [
            makeStrip('u-1', 'bogus-wood'),
          ]),
        ],
      }),
    );
    expect(m.warnings).toContain('Unknown wood: bogus-wood');
    expect(m.complete).toBe(true);
  });
});

describe('miter colour check always runs (Sprint 62)', () => {
  it('schema-max 48k cells: colour check is reached and returns a boolean', () => {
    const strips = Array.from({ length: 40 }, (_, i) => ({
      id: `s${i}`,
      speciesId: 'hard-maple',
      widthIn: 0.25,
      repeat: 20,
      miter: {
        speciesId: 'walnut',
        angleDeg: 30,
        corner: (i % 2 === 0 ? 'tr' : 'tl') as 'tr' | 'tl',

      },
    }));
    const config = makeV2Config({
      name: 'schema-max-cells',
      grain: 'end',
      panels: [makePanel('p1', 'P', 1.5, strips)],
      rowPattern: [
        { panelId: 'p1', transform: 'none' },
        { panelId: 'p1', transform: 'mirrorY' },
      ],
      rowCount: 60,
    });
    const metrics = calculateMetrics(config);
    const cells = layoutTopFace(config, metrics);
    expect(cells.length).toBe(48_000);
    // Colour path ran — either thickness/colour mismatch warning, or clean.
    // Must NOT be silent skip (deleted unreachable note).
    expect(
      metrics.warnings.some((w) =>
        w.includes('too large to check automatically'),
      ),
    ).toBe(false);
    const closed = miterLatticeCloses(cells, config.panels);
    expect(typeof closed).toBe('boolean');
  });

  it('closing harlequin: no spurious does-not-close warning', () => {
    const tpl = getTemplate('harlequin')!;
    const m = calculateMetrics(tpl.config);
    expect(m.warnings).toEqual([]);
  });
});
