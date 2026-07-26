import { describe, it, expect } from 'vitest';
import { applyRowTransform, layoutTopFace } from '@/lib/board-designer/layout';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { getTemplate } from '@/lib/board-designer/templates';
import { UNKNOWN_SPECIES_COLOR } from '@/lib/board-designer/species';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

describe('layoutTopFace — checkerboard', () => {
  it('returns 12 strips × 8 rows = 96 cells, and row 1 reverses via rot180', () => {
    const t = getTemplate('checkerboard');
    expect(t).toBeDefined();
    const config = t!.config;
    const metrics = calculateMetrics(config);
    expect(metrics.sliceCount).toBe(8);

    const cells = layoutTopFace(config, metrics);
    expect(cells).toHaveLength(96); // 12 × 8

    const rowHeight = config.panels[0]!.thicknessIn;
    const row0 = cells.filter((c) => c.yIn === 0);
    const row1 = cells.filter((c) => c.yIn === rowHeight);
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
    const config = makeV2Config({
      name: 'Unknown',
      grain: 'edge',
      sourceLengthIn: 12,
      sliceThicknessIn: 0.75,
      panels: [
        makePanel('panel-1', 'Panel 1', 0.75, [
          makeStrip('u1', 'not-a-wood', 2),
        ]),
      ],
      rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
      rowCount: 1,
    });
    const metrics = calculateMetrics(config);
    const cells = layoutTopFace(config, metrics);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.colorHex).toBe(UNKNOWN_SPECIES_COLOR);
    expect(cells[0]!.colorHex).toBe('#8A8A8A');
  });
});

describe('row transforms — unequal widths + odd strip count', () => {
  it('none/mirrorY keep order; rot180/mirrorX reverse (not rotate-by-one)', () => {
    const strips = [
      makeStrip('a', 'walnut', 2),
      makeStrip('b', 'hard-maple', 0.25),
      makeStrip('c', 'cherry', 1),
    ];

    expect(applyRowTransform(strips, 'none').map((s) => s.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(applyRowTransform(strips, 'mirrorY').map((s) => s.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(applyRowTransform(strips, 'rot180').map((s) => s.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
    expect(applyRowTransform(strips, 'mirrorX').map((s) => s.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
    // Old rotateByOne would have been [b,c,a] — reverse must not match that.
    expect(applyRowTransform(strips, 'rot180').map((s) => s.id)).not.toEqual([
      'b',
      'c',
      'a',
    ]);

    const config = makeV2Config({
      panels: [makePanel('panel-1', 'Panel 1', 1.5, strips)],
      rowPattern: [
        { panelId: 'panel-1', transform: 'none' },
        { panelId: 'panel-1', transform: 'rot180' },
      ],
      rowCount: 2,
    });
    const metrics = calculateMetrics(config);
    const cells = layoutTopFace(config, metrics);
    const row0 = cells.filter((c) => c.yIn === 0);
    const row1 = cells.filter((c) => c.yIn === 1.5);
    expect(row0.map((c) => c.speciesId)).toEqual([
      'walnut',
      'hard-maple',
      'cherry',
    ]);
    expect(row1.map((c) => c.speciesId)).toEqual([
      'cherry',
      'hard-maple',
      'walnut',
    ]);
    expect(row0.map((c) => c.wIn)).toEqual([2, 0.25, 1]);
    expect(row1.map((c) => c.wIn)).toEqual([1, 0.25, 2]);
  });
});
