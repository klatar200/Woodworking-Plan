import { describe, it, expect } from 'vitest';
import { optimize, DEFAULT_OPTIONS, type Part } from '@/lib/cut-optimizer';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { toParts } from '@/lib/board-designer/to-parts';
import { getTemplate, TEMPLATES } from '@/lib/board-designer/templates';
import type { BoardDesignConfig, Strip } from '@/lib/board-designer/types';

/** §2.3 golden: 12 strips × 1.5″ alternating walnut/maple. */
function goldenConfig(
  over: Partial<BoardDesignConfig> = {},
): BoardDesignConfig {
  const strips: Strip[] = [];
  for (let i = 0; i < 12; i++) {
    strips.push({
      id: `g-${i + 1}`,
      speciesId: i % 2 === 0 ? 'walnut' : 'hard-maple',
      widthIn: 1.5,
      repeat: 1,
    });
  }
  return {
    schemaVersion: 1,
    name: 'Golden end-grain',
    grain: 'end',
    sourceLengthIn: 20,
    stockThicknessIn: 1.5,
    sliceThicknessIn: 1.5,
    kerfIn: 0.125,
    wasteFactor: 0.15,
    flipEveryOtherSlice: false,
    strips,
    ...over,
  };
}

describe('§2.3 golden fixture', () => {
  it('12 strips × 1.5″ / length 20 / stock 1.5 / slice 1.5 / kerf 0.125 → 18×18×1.5', () => {
    const m = calculateMetrics(goldenConfig());
    expect(m.panelWidthIn).toBe(18);
    expect(m.sliceCount).toBe(12);
    expect(m.leftoverIn).toBe(0.625);
    // usedIn is not on BoardMetrics; leftover proves used = 19.375
    expect(20 - m.leftoverIn).toBe(19.375);
    expect(m.finishedLengthIn).toBe(18);
    expect(m.finishedWidthIn).toBe(18);
    expect(m.finishedThicknessIn).toBe(1.5);
    expect(m.complete).toBe(true);
  });
});

describe('§2.3 kerf-trap fixture', () => {
  it('panelLength 18 / slice 1.5 / kerf 0.125 → 11 slices, not naive 12', () => {
    // Same failure class as six-16″-on-a-96″-board: floor((18+0.125)/(1.5+0.125))=11
    const m = calculateMetrics(
      goldenConfig({
        sourceLengthIn: 18,
        strips: [
          {
            id: 'k-1',
            speciesId: 'hard-maple',
            widthIn: 1.5,
            repeat: 1,
          },
        ],
      }),
    );
    expect(m.sliceCount).toBe(11);
    expect(m.sliceCount).not.toBe(12);
  });
});

describe('§2.3 zero-slice fixture', () => {
  it('panelLength 1 / slice 1.5 → sliceCount 0, loud warning, complete false', () => {
    const m = calculateMetrics(
      goldenConfig({
        sourceLengthIn: 1,
        strips: [
          {
            id: 'z-1',
            speciesId: 'hard-maple',
            widthIn: 1.5,
            repeat: 1,
          },
        ],
      }),
    );
    expect(m.sliceCount).toBe(0);
    expect(m.complete).toBe(false);
    expect(m.warnings).toContain(
      'No slices fit — increase panel length or reduce slice thickness.',
    );
  });
});

describe('edge-grain fixture', () => {
  it('7 × 1.5″ / length 18 / stock 0.75 → finished 18 × 10.5 × 0.75, sliceCount 0', () => {
    const strips: Strip[] = Array.from({ length: 7 }, (_, i) => ({
      id: `e-${i + 1}`,
      speciesId: i % 2 === 0 ? 'hard-maple' : 'walnut',
      widthIn: 1.5,
      repeat: 1,
    }));
    const m = calculateMetrics({
      schemaVersion: 1,
      name: 'Edge stripe',
      grain: 'edge',
      sourceLengthIn: 18,
      stockThicknessIn: 0.75,
      sliceThicknessIn: 0.75,
      kerfIn: 0.125,
      wasteFactor: 0.15,
      flipEveryOtherSlice: false,
      strips,
    });
    expect(m.finishedLengthIn).toBe(18);
    expect(m.finishedWidthIn).toBe(10.5);
    expect(m.finishedThicknessIn).toBe(0.75);
    expect(m.sliceCount).toBe(0);
    expect(m.leftoverIn).toBe(0);
  });
});

describe('board feet', () => {
  it('golden fixture → walnut and maple each 2.15625; total 4.3125', () => {
    // (1.5 × 9 × 20) / 144 × 1.15 = 2.15625 per species (6 strips × 1.5″ = 9″)
    const m = calculateMetrics(goldenConfig());
    const walnut = m.boardFeetBySpecies.find((r) => r.speciesId === 'walnut');
    const maple = m.boardFeetBySpecies.find(
      (r) => r.speciesId === 'hard-maple',
    );
    expect(walnut?.boardFeet).toBeCloseTo(2.15625, 10);
    expect(maple?.boardFeet).toBeCloseTo(2.15625, 10);
    expect(m.totalBoardFeet).toBeCloseTo(4.3125, 10);
  });
});

describe('toParts()', () => {
  it('output satisfies §2.5 — Part[] and optimize has no impossible for golden', () => {
    const config = goldenConfig();
    const parts: Part[] = toParts(config);
    expect(parts).toHaveLength(12);
    expect(parts[0]).toMatchObject({
      id: 'g-1',
      label: 'Walnut strip 1',
      quantity: 1,
      thicknessIn: 1.5,
      widthIn: 1.5,
      lengthIn: 20,
      material: 'Walnut',
    });
    expect(parts[1]?.label).toBe('Hard Maple strip 2');

    const groups = optimize(parts, DEFAULT_OPTIONS);
    for (const g of groups) {
      expect(g.impossible).toEqual([]);
    }
  });
});

describe('empty strips (§2.6)', () => {
  it('calculateMetrics({...golden, strips: []}) → warning, complete false, no NaN', () => {
    const m = calculateMetrics(goldenConfig({ strips: [] }));
    expect(m.warnings).toContain('Add a strip to see your board.');
    expect(m.complete).toBe(false);
    const nums = [
      m.panelWidthIn,
      m.panelLengthIn,
      m.panelThicknessIn,
      m.finishedLengthIn,
      m.finishedWidthIn,
      m.finishedThicknessIn,
      m.sliceCount,
      m.leftoverIn,
      m.totalBoardFeet,
    ];
    for (const n of nums) {
      expect(Number.isNaN(n)).toBe(false);
    }
  });
});

describe('§3.3 templates — finished dimensions', () => {
  it('checkerboard → 8 slices / leftover 1.125 / finished 18 × 12 × 1.5', () => {
    const t = getTemplate('checkerboard');
    expect(t).toBeDefined();
    const m = calculateMetrics(t!.config);
    expect(m.sliceCount).toBe(8);
    expect(m.leftoverIn).toBe(1.125);
    expect(m.finishedLengthIn).toBe(18);
    expect(m.finishedWidthIn).toBe(12);
    expect(m.finishedThicknessIn).toBe(1.5);
  });

  it('every §3.3 template finished column is asserted', () => {
    const expected: Record<
      string,
      { length: number; width: number; thickness: number }
    > = {
      'classic-stripe': { length: 18, width: 10.5, thickness: 0.75 },
      checkerboard: { length: 18, width: 12, thickness: 1.5 },
      'butcher-block': { length: 20, width: 9.5, thickness: 1.5 },
      'accent-stripe': { length: 16, width: 11, thickness: 0.75 },
    };
    expect(TEMPLATES).toHaveLength(4);
    for (const t of TEMPLATES) {
      const m = calculateMetrics(t.config);
      const e = expected[t.id]!;
      expect(m.finishedLengthIn).toBe(e.length);
      expect(m.finishedWidthIn).toBe(e.width);
      expect(m.finishedThicknessIn).toBe(e.thickness);
    }
  });
});

describe('unknown species warning', () => {
  it('emits Unknown wood: <id> and stays complete', () => {
    const m = calculateMetrics(
      goldenConfig({
        grain: 'edge',
        strips: [
          {
            id: 'u-1',
            speciesId: 'bogus-wood',
            widthIn: 1.5,
            repeat: 1,
          },
        ],
      }),
    );
    expect(m.warnings).toContain('Unknown wood: bogus-wood');
    expect(m.complete).toBe(true);
  });
});
