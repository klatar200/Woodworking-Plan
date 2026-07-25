import { describe, it, expect } from 'vitest';
import { layoutTopFace } from '@/lib/board-designer/layout';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { getTemplate } from '@/lib/board-designer/templates';
import { UNKNOWN_SPECIES_COLOR } from '@/lib/board-designer/species';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

describe('layoutTopFace — checkerboard', () => {
  it('returns 12 strips × 8 slices = 96 cells, and row 1 flips species', () => {
    const t = getTemplate('checkerboard');
    expect(t).toBeDefined();
    const config = t!.config;
    const metrics = calculateMetrics(config);
    expect(metrics.sliceCount).toBe(8);

    const cells = layoutTopFace(config, metrics);
    expect(cells).toHaveLength(96); // 12 × 8

    // Row 0 first cell vs row 1 first cell — flipEveryOtherSlice rotates by one
    const row0 = cells.filter((c) => c.yIn === 0);
    const row1 = cells.filter((c) => c.yIn === config.stockThicknessIn);
    expect(row0).toHaveLength(12);
    expect(row1).toHaveLength(12);
    expect(row1[0]!.speciesId).not.toBe(row0[0]!.speciesId);
  });
});

describe('layoutTopFace — edge grain', () => {
  it('classic-stripe yields 7 cells stacked on y', () => {
    const t = getTemplate('classic-stripe');
    expect(t).toBeDefined();
    const metrics = calculateMetrics(t!.config);
    const cells = layoutTopFace(t!.config, metrics);
    expect(cells).toHaveLength(7);
    expect(cells.every((c) => c.wIn === metrics.finishedLengthIn)).toBe(true);
    expect(cells[0]!.yIn).toBe(0);
    expect(cells[1]!.yIn).toBe(1.5);
  });
});

describe('layoutTopFace — unknown species', () => {
  it('uses #8A8A8A fallback and does not crash', () => {
    const config: BoardDesignConfig = {
      schemaVersion: 1,
      name: 'Unknown',
      grain: 'edge',
      sourceLengthIn: 12,
      stockThicknessIn: 0.75,
      sliceThicknessIn: 0.75,
      kerfIn: 0.125,
      wasteFactor: 0.15,
      flipEveryOtherSlice: false,
      strips: [
        {
          id: 'u1',
          speciesId: 'not-a-wood',
          widthIn: 2,
          repeat: 1,
        },
      ],
    };
    const metrics = calculateMetrics(config);
    const cells = layoutTopFace(config, metrics);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.colorHex).toBe(UNKNOWN_SPECIES_COLOR);
    expect(cells[0]!.colorHex).toBe('#8A8A8A');
  });
});
