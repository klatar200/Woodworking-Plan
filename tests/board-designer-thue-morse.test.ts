import { describe, expect, it } from 'vitest';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { layoutTopFace } from '@/lib/board-designer/layout';
import { getTemplate } from '@/lib/board-designer/templates';
import { getSpecies } from '@/lib/board-designer/species';

/** Popcount parity of n — independent oracle for the 2-D Thue-Morse lattice. */
function parityOfPopcount(n: number): number {
  let bits = 0;
  let x = n;
  while (x > 0) {
    bits += x & 1;
    x >>>= 1;
  }
  return bits & 1;
}

describe('thue-morse template (Sprint 57 Part B — write first)', () => {
  it('layoutTopFace matches the independent popcount grid cell for cell', () => {
    const template = getTemplate('thue-morse');
    expect(template).toBeDefined();
    const config = template!.config;
    const metrics = calculateMetrics(config);
    const cells = layoutTopFace(config, metrics);

    expect(metrics.finishedLengthIn).toBe(12);
    expect(metrics.finishedWidthIn).toBe(12);
    expect(metrics.finishedThicknessIn).toBe(1.5);
    expect(metrics.sliceCount).toBe(8);
    expect(metrics.panelPlan).toHaveLength(1);
    expect(metrics.panelPlan[0]!.requiredLengthIn).toBe(12.875);

    const walnut = getSpecies('walnut')!.colorHex;
    const maple = getSpecies('hard-maple')!.colorHex;

    // 8×8 grid, each cell 1.5×1.5; row i, col j.
    expect(cells).toHaveLength(64);
    for (let i = 0; i < 8; i += 1) {
      for (let j = 0; j < 8; j += 1) {
        const speciesId =
          parityOfPopcount(i ^ j) === 0 ? 'walnut' : 'hard-maple';
        const expectedColor = speciesId === 'walnut' ? walnut : maple;
        const cell = cells.find(
          (c) =>
            Math.abs(c.xIn - j * 1.5) < 1e-9 &&
            Math.abs(c.yIn - i * 1.5) < 1e-9,
        );
        expect(cell, `missing cell at row ${i} col ${j}`).toBeDefined();
        expect(cell!.speciesId).toBe(speciesId);
        expect(cell!.colorHex).toBe(expectedColor);
        expect(cell!.wIn).toBe(1.5);
        expect(cell!.hIn).toBe(1.5);
      }
    }
  });
});
