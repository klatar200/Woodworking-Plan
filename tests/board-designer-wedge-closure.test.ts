import { describe, expect, it } from 'vitest';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { layoutTopFace } from '@/lib/board-designer/layout';
import {
  miterLatticeCloses,
  wedgeWebContinuous,
} from '@/lib/board-designer/miter-geometry';
import { getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

/**
 * Sprint 63 — closure is geometric (wedge membership), not chromatic.
 */
describe('wedgeWebContinuous — geometric closure (Sprint 63)', () => {
  const harlequin = () => getTemplate('harlequin')!.config;

  function cellsOf(config: BoardDesignConfig) {
    return layoutTopFace(config, calculateMetrics(config));
  }

  it('harlequin with one base strip changed to cherry closes (regression)', () => {
    const base = harlequin();
    const accent: BoardDesignConfig = {
      ...base,
      panels: base.panels.map((p) => ({
        ...p,
        strips: p.strips.map((s, i) =>
          i === 0 ? { ...s, speciesId: 'cherry' } : s,
        ),
      })),
    };
    const cells = cellsOf(accent);
    expect(wedgeWebContinuous(cells)).toBe(true);
    expect(miterLatticeCloses(cells, accent.panels)).toBe(true);
    expect(
      calculateMetrics(accent).warnings.some((w) =>
        w.startsWith('Miter pattern does not close'),
      ),
    ).toBe(false);
  });

  it('harlequin with several different base species still closes', () => {
    const species = ['cherry', 'walnut', 'purpleheart', 'hard-maple'] as const;
    const base = harlequin();
    const mixed: BoardDesignConfig = {
      ...base,
      panels: base.panels.map((p) => ({
        ...p,
        strips: p.strips.map((s, i) => ({
          ...s,
          // Keep wedge walnut; vary base only.
          speciesId: species[i % species.length]!,
        })),
      })),
    };
    expect(wedgeWebContinuous(cellsOf(mixed))).toBe(true);
    expect(miterLatticeCloses(cellsOf(mixed), mixed.panels)).toBe(true);
  });

  it('unmodified harlequin still closes', () => {
    const tpl = harlequin();
    const cells = cellsOf(tpl);
    expect(wedgeWebContinuous(cells)).toBe(true);
    expect(miterLatticeCloses(cells, tpl.panels)).toBe(true);
  });

  it('strip-1 corner flip breaks the web', () => {
    const base = harlequin();
    const broken: BoardDesignConfig = {
      ...base,
      panels: base.panels.map((p) => ({
        ...p,
        strips: p.strips.map((s, i) =>
          i === 0
            ? { ...s, miter: { ...s.miter!, corner: 'tl' } }
            : s,
        ),
      })),
    };
    expect(wedgeWebContinuous(cellsOf(broken))).toBe(false);
    expect(
      calculateMetrics(broken).warnings.some((w) =>
        w.startsWith('Miter pattern does not close'),
      ),
    ).toBe(true);
  });

  it('repeat:20 on every strip does not close (identical corners adjacent)', () => {
    const base = harlequin();
    const repeated: BoardDesignConfig = {
      ...base,
      panels: base.panels.map((p) => ({
        ...p,
        strips: p.strips.map((s) => ({ ...s, repeat: 20 })),
      })),
    };
    expect(wedgeWebContinuous(cellsOf(repeated))).toBe(false);
  });

  it('adjacent wedges of different species with matching membership do not close', () => {
    const base = harlequin();
    const splitWedge: BoardDesignConfig = {
      ...base,
      panels: base.panels.map((p) => ({
        ...p,
        strips: p.strips.map((s, i) =>
          i === 0
            ? { ...s, miter: { ...s.miter!, speciesId: 'cherry' } }
            : s,
        ),
      })),
    };
    // Geometry/corners unchanged — membership aligns, but strip 0's wedge is cherry
    // where neighbours are walnut → fails §A3.2.
    expect(wedgeWebContinuous(cellsOf(splitWedge))).toBe(false);
  });

  it('1.5″ thickness fails miterLatticeCloses but passes wedgeWebContinuous alone', () => {
    const base = harlequin();
    const thick: BoardDesignConfig = {
      ...base,
      panels: base.panels.map((p) => ({ ...p, thicknessIn: 1.5 })),
    };
    const cells = cellsOf(thick);
    expect(wedgeWebContinuous(cells)).toBe(true);
    expect(miterLatticeCloses(cells, thick.panels)).toBe(false);
  });

  it('solid plaid (no miter) produces no closure warning', () => {
    const plaid = getTemplate('plaid')!.config;
    expect(plaid.panels.some((p) => p.strips.some((s) => s.miter))).toBe(false);
    const m = calculateMetrics(plaid);
    expect(
      m.warnings.some(
        (w) =>
          w.startsWith('Miter pattern does not close') ||
          w.includes('lattice will not close'),
      ),
    ).toBe(false);
  });
});
