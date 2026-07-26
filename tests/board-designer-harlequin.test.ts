import { describe, expect, it } from 'vitest';
import { layoutTopFace } from '@/lib/board-designer/layout';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { evaluateHexagonLattice } from '@/lib/board-designer/hexagon-criteria';
import {
  cellsColorClosed,
  closingThicknessHint,
  closingThicknessIn,
  miterLatticeCloses,
  speciesComponents,
} from '@/lib/board-designer/miter-geometry';
import { getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

describe('harlequin template — shape + closure (Sprint 59/60)', () => {
  it('ships thicknessIn === 1; finished 7 × 8 × 1½; no warnings', () => {
    const tpl = getTemplate('harlequin');
    expect(tpl).toBeTruthy();
    expect(getTemplate('hexagon')).toBeUndefined();
    expect(tpl!.config.panels[0]!.thicknessIn).toBe(1);
    const metrics = calculateMetrics(tpl!.config);
    expect(metrics.finishedLengthIn).toBe(7);
    expect(metrics.finishedWidthIn).toBe(8);
    expect(metrics.finishedThicknessIn).toBe(1.5);
    expect(metrics.warnings).toEqual([]);
    // 1″ is within 5% of ideal t = w·secθ ≈ 1.0104
    expect(
      Math.abs(1 - closingThicknessIn(0.875, 30)) /
        closingThicknessIn(0.875, 30),
    ).toBeLessThan(0.05);
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

  it('colour continuity holds; thickness gate accepts shipped 1″', () => {
    const tpl = getTemplate('harlequin')!;
    const cells = layoutTopFace(tpl.config, calculateMetrics(tpl.config));
    expect(cellsColorClosed(cells)).toBe(true);
    expect(miterLatticeCloses(cells, tpl.config.panels)).toBe(true);
  });

  it('1.5″ panel raises exactly one fraction mismatch warning', () => {
    const tpl = getTemplate('harlequin')!;
    const oldT: BoardDesignConfig = {
      ...tpl.config,
      panels: tpl.config.panels.map((p) => ({ ...p, thicknessIn: 1.5 })),
    };
    const oldCells = layoutTopFace(oldT, calculateMetrics(oldT));
    expect(miterLatticeCloses(oldCells, oldT.panels)).toBe(false);
    const warnings = calculateMetrics(oldT).warnings.filter((w) =>
      w.includes('lattice will not close'),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toBe(closingThicknessHint(0.875, 1.5, 30));
    expect(warnings[0]).toMatch(/7\/8"/);
    expect(warnings[0]).toMatch(/1 1\/2"/);
    expect(warnings[0]).not.toMatch(/\d+\.\d+\s*[″"]/);
  });

  it('metrics warning and editor hint share one string', () => {
    const msg = closingThicknessHint(0.875, 1.5, 30);
    const tpl = getTemplate('harlequin')!;
    const mismatched: BoardDesignConfig = {
      ...tpl.config,
      panels: tpl.config.panels.map((p) => ({ ...p, thicknessIn: 1.5 })),
    };
    const fromMetrics = calculateMetrics(mismatched).warnings.find((w) =>
      w.includes('lattice will not close'),
    );
    expect(fromMetrics).toBe(msg);
    // Editor path is the same helper (strip-list imports closingThicknessHint).
    expect(msg).toBe(
      'Closing thickness for a 7/8" strip at 30° is ≈ 1" — panel is 1 1/2" (>5% off; lattice will not close).',
    );
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

  it('fails the hexagonal-lattice criteria (Sprint 59 §B2)', () => {
    const tpl = getTemplate('harlequin')!;
    const cells = layoutTopFace(tpl.config, calculateMetrics(tpl.config));
    const result = evaluateHexagonLattice(cells, 'hard-maple', 'walnut', 40);
    expect(result.ok).toBe(false);
    // Harlequin: many contrast components (rhombi), not a single web.
    expect(result.contrastComponents).toBeGreaterThan(1);
    expect(result.reason).toMatch(/not a single connected web/);
  });

  it('one-miter 60° web is connected but not hexagonal (4/8-gons)', () => {
    // Part B candidate (2): d ≥ t at θ=60°. Forms a walnut web + many maple
    // cells, but simplified hulls are 4- and 8-gons — never 6.
    const strips = Array.from({ length: 8 }, (_, i) => ({
      id: `s${i}`,
      speciesId: 'hard-maple',
      widthIn: 0.875,
      repeat: 1,
      miter: {
        speciesId: 'walnut',
        angleDeg: 60,
        corner: (i % 2 === 0 ? ('tr' as const) : ('tl' as const)),
      },
    }));
    const config: BoardDesignConfig = {
      schemaVersion: 2,
      name: '60-web',
      grain: 'end',
      sourceLengthIn: 20,
      sliceThicknessIn: 1.5,
      kerfIn: 0.125,
      wasteFactor: 0.15,
      panels: [{ id: 'panel-1', label: 'C', thicknessIn: 1.5, strips }],
      rowPattern: [
        { panelId: 'panel-1', transform: 'none' },
        { panelId: 'panel-1', transform: 'mirrorY' },
      ],
      rowCount: 8,
    };
    const cells = layoutTopFace(config, calculateMetrics(config));
    expect(cellsColorClosed(cells)).toBe(true);
    const comps = speciesComponents(cells, 40);
    expect(comps.get('walnut')!.count).toBe(1);
    expect(comps.get('hard-maple')!.count).toBeGreaterThanOrEqual(6);
    const result = evaluateHexagonLattice(cells, 'hard-maple', 'walnut', 40);
    expect(result.ok).toBe(false);
    // Connectivity may pass; area equality and/or 6-vertex hulls fail.
    expect(
      result.reason === 'interior base cell areas differ by more than 5%' ||
        result.reason === 'interior cells are not 6-vertex hexagons',
    ).toBe(true);
    if (result.interiorHullVertices.length > 0) {
      expect(
        result.interiorHullVertices.every((v) => v === 4 || v === 8),
      ).toBe(true);
      expect(result.interiorHullVertices.includes(6)).toBe(false);
    }
  });
});
