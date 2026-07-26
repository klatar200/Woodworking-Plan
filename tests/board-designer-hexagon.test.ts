import { describe, expect, it } from 'vitest';
import { layoutTopFace } from '@/lib/board-designer/layout';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import {
  cellsColorClosed,
  closingThicknessIn,
  miterLatticeCloses,
} from '@/lib/board-designer/miter-geometry';
import { getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

describe('hexagon template — colour closure (§B3)', () => {
  it('hexagon passes the closure test', () => {
    const tpl = getTemplate('hexagon');
    expect(tpl).toBeTruthy();
    const metrics = calculateMetrics(tpl!.config);
    expect(metrics.finishedLengthIn).toBeCloseTo(7, 5); // 8 × 0.875
    expect(metrics.finishedWidthIn).toBeCloseTo(12, 5); // 8 × 1.5
    expect(metrics.finishedThicknessIn).toBeCloseTo(1.5, 5);

    const cells = layoutTopFace(tpl!.config, metrics);
    expect(cellsColorClosed(cells)).toBe(true);
    expect(miterLatticeCloses(cells, tpl!.config.panels)).toBe(true);
  });

  it('mismatched ⅞″ / 1″ / 30° control fails closure (test has teeth)', () => {
    const tpl = getTemplate('hexagon')!;
    const bad: BoardDesignConfig = {
      ...tpl.config,
      panels: tpl.config.panels.map((p) => ({ ...p, thicknessIn: 1 })),
    };
    const cells = layoutTopFace(bad, calculateMetrics(bad));
    // Colour still continuous (d < t) — the thickness gate is what fails.
    expect(cellsColorClosed(cells)).toBe(true);
    expect(miterLatticeCloses(cells, bad.panels)).toBe(false);
  });

  it('t/w = tan θ + sec θ within 2% for shipped numbers', () => {
    const tpl = getTemplate('hexagon')!;
    const strip = tpl.config.panels[0]!.strips[0]!;
    const t = tpl.config.panels[0]!.thicknessIn;
    const ideal = closingThicknessIn(strip.widthIn, strip.miter!.angleDeg);
    expect(Math.abs(t - ideal) / ideal).toBeLessThan(0.02);
  });

  it('mismatch warning fires for a 1″ panel with the hexagon strips', () => {
    const tpl = getTemplate('hexagon')!;
    const bad: BoardDesignConfig = {
      ...tpl.config,
      panels: tpl.config.panels.map((p) => ({ ...p, thicknessIn: 1 })),
    };
    const metrics = calculateMetrics(bad);
    expect(
      metrics.warnings.some((w) => w.includes('lattice will not close')),
    ).toBe(true);
  });
});
