import { describe, expect, it } from 'vitest';
import { layoutTopFace } from '@/lib/board-designer/layout';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import {
  cellsColorClosed,
  closingThicknessIn,
  miterLatticeCloses,
  speciesComponents,
} from '@/lib/board-designer/miter-geometry';
import { getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

const T_CLOSE = 0.875 / Math.cos(Math.PI / 6); // ≈ 1.0104

describe('harlequin template — shape + closure (Sprint 59)', () => {
  it('finished dims match ⅞″ strips at t = w·secθ', () => {
    const tpl = getTemplate('harlequin');
    expect(tpl).toBeTruthy();
    expect(getTemplate('hexagon')).toBeUndefined();
    const metrics = calculateMetrics(tpl!.config);
    expect(metrics.finishedLengthIn).toBeCloseTo(7, 5); // 8 × 0.875
    expect(metrics.finishedWidthIn).toBeCloseTo(8 * T_CLOSE, 4);
    expect(metrics.finishedThicknessIn).toBeCloseTo(1.5, 5);
    expect(tpl!.config.panels[0]!.thicknessIn).toBeCloseTo(T_CLOSE, 6);
  });

  it('speciesComponents: walnut = disjoint rhombi; maple = 1 field', () => {
    const tpl = getTemplate('harlequin')!;
    const cells = layoutTopFace(tpl.config, calculateMetrics(tpl.config));
    // High SPI keeps the maple waist connected; tip-to-tip rhombi stay 4-connected-separate.
    // Shipped [none, mirrorY] leaves half-rhombi on the board's first/last edges:
    // 12 full + 8 half = 20 walnut components (verified at spi 40 and 48).
    const a = speciesComponents(cells, 40);
    const b = speciesComponents(cells, 48);
    expect(a.get('walnut')!.count).toBe(b.get('walnut')!.count);
    expect(a.get('hard-maple')!.count).toBe(b.get('hard-maple')!.count);

    const walnut = a.get('walnut')!;
    const maple = a.get('hard-maple')!;
    expect(maple.count).toBe(1);
    expect(walnut.count).toBe(20);

    const sorted = [...walnut.areas].sort((x, y) => x - y);
    const halves = sorted.slice(0, 8);
    const fulls = sorted.slice(8);
    expect(fulls).toHaveLength(12);
    const fullMean = fulls.reduce((s, v) => s + v, 0) / fulls.length;
    for (const area of fulls) {
      expect(Math.abs(area - fullMean) / fullMean).toBeLessThan(0.02);
    }
    const halfMean = halves.reduce((s, v) => s + v, 0) / halves.length;
    for (const area of halves) {
      expect(Math.abs(area - halfMean) / halfMean).toBeLessThan(0.02);
    }
    // Halves are half a rhombus (within raster tolerance).
    expect(halfMean / fullMean).toBeGreaterThan(0.4);
    expect(halfMean / fullMean).toBeLessThan(0.6);
  });

  it('colour continuity holds; thickness gate accepts the closing t', () => {
    const tpl = getTemplate('harlequin')!;
    const cells = layoutTopFace(tpl.config, calculateMetrics(tpl.config));
    expect(cellsColorClosed(cells)).toBe(true);
    expect(miterLatticeCloses(cells, tpl.config.panels)).toBe(true);
  });

  it('1.5″ panel (old shipped t) raises mismatch; 1″ is near-close', () => {
    const tpl = getTemplate('harlequin')!;
    const oldT: BoardDesignConfig = {
      ...tpl.config,
      panels: tpl.config.panels.map((p) => ({ ...p, thicknessIn: 1.5 })),
    };
    const oldCells = layoutTopFace(oldT, calculateMetrics(oldT));
    expect(miterLatticeCloses(oldCells, oldT.panels)).toBe(false);
    expect(
      calculateMetrics(oldT).warnings.some((w) =>
        w.includes('lattice will not close'),
      ),
    ).toBe(true);

    // 1″ is within 5% of t = 1.0104 — the old "failing control" is now near-correct.
    expect(
      Math.abs(1 - closingThicknessIn(0.875, 30)) /
        closingThicknessIn(0.875, 30),
    ).toBeLessThan(0.05);
    const near: BoardDesignConfig = {
      ...tpl.config,
      panels: tpl.config.panels.map((p) => ({ ...p, thicknessIn: 1 })),
    };
    expect(
      miterLatticeCloses(layoutTopFace(near, calculateMetrics(near)), near.panels),
    ).toBe(true);
  });

  it('cellsColorClosed is false when strip-1 corner breaks the alternation', () => {
    const tpl = getTemplate('harlequin')!;
    const broken: BoardDesignConfig = {
      ...tpl.config,
      panels: tpl.config.panels.map((p) => ({
        ...p,
        strips: p.strips.map((s, i) =>
          i === 0
            ? { ...s, miter: { ...s.miter!, corner: 'tl' } } // was tr
            : s,
        ),
      })),
    };
    const cells = layoutTopFace(broken, calculateMetrics(broken));
    expect(cellsColorClosed(cells)).toBe(false);
  });
});
