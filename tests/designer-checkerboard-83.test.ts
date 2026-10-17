import { describe, expect, it } from 'vitest';
import { cutPlanGroupsForConfig } from '@/components/designer/optimizer-panel';
import { designBuildSteps, formatBuildQuantity } from '@/lib/board-designer/build-steps';
import { designCutPieces } from '@/lib/board-designer/cut-pieces';
import { defaultCutPlanStockWidthIn } from '@/lib/board-designer/design-cut-plan';
import { layoutTopFace } from '@/lib/board-designer/layout';
import { thumbModelFromConfig } from '@/lib/board-designer/library-thumb';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { PLANER_WIDTH_WARNING } from '@/lib/board-designer/panel-geometry';
import { saveBlockers } from '@/lib/board-designer/save-readiness';
import { parseConfig } from '@/lib/board-designer/serialize';
import { TEMPLATES, getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import { totalBoards } from '@/lib/cut-optimizer';
import { formatBoardFeet } from '@/lib/format';

/** Sprint 83 — the default new board (Checkerboard) fits a 13″ benchtop planer. */

const checkerboard = (): BoardDesignConfig => getTemplate('checkerboard')!.config;

describe('Checkerboard template', () => {
  it('is one 1½″ panel of 8 alternating maple/walnut strips at 1½″', () => {
    const { panels } = checkerboard();
    expect(panels).toHaveLength(1);
    const panel = panels[0]!;
    expect(panel.id).toBe('panel-1');
    expect(panel.thicknessIn).toBe(1.5);
    expect(panel.strips).toHaveLength(8);
    panel.strips.forEach((strip, i) => {
      expect(strip.widthIn).toBe(1.5);
      expect(strip.repeat).toBe(1);
      expect(strip.speciesId).toBe(i % 2 === 0 ? 'hard-maple' : 'walnut');
    });
  });

  it('keeps every other setting', () => {
    const config = checkerboard();
    expect(config.grain).toBe('end');
    expect(config.sourceLengthIn).toBe(14);
    expect(config.sliceThicknessIn).toBe(1.5);
    expect(config.kerfIn).toBe(0.125);
    expect(config.wasteFactor).toBe(0);
    expect(config.rowCount).toBe(8);
    expect(config.rowPattern).toEqual([
      { panelId: 'panel-1', transform: 'none' },
      { panelId: 'panel-1', transform: 'rot180' },
    ]);
  });

  it('finishes 12 × 12 × 1½ from one 12″ panel', () => {
    const m = calculateMetrics(checkerboard());
    expect(m.finishedLengthIn).toBe(12);
    expect(m.finishedWidthIn).toBe(12);
    expect(m.finishedThicknessIn).toBe(1.5);
    expect(m.sliceCount).toBe(8);
    expect(m.panelPlan).toHaveLength(1);
    expect(m.panelPlan[0]!.widthIn).toBe(12);
    expect(m.panelPlan[0]!.requiredLengthIn).toBe(12.875);
  });

  it('has no warnings, and no template warns about the planer', () => {
    expect(calculateMetrics(checkerboard()).warnings).toEqual([]);
    for (const t of TEMPLATES) {
      expect(calculateMetrics(t.config).warnings, t.id).not.toContain(PLANER_WIDTH_WARNING);
    }
  });

  it('is a true checkerboard: 64 squares, 32 per species, no matching neighbours', () => {
    const config = checkerboard();
    const cells = layoutTopFace(config, calculateMetrics(config));
    expect(cells).toHaveLength(64);
    expect(cells.filter((c) => c.speciesId === 'hard-maple')).toHaveLength(32);
    expect(cells.filter((c) => c.speciesId === 'walnut')).toHaveLength(32);

    const at = new Map(cells.map((c) => [`${c.xIn},${c.yIn}`, c]));
    let pairs = 0;
    for (const cell of cells) {
      for (const neighbour of [
        at.get(`${cell.xIn + 1.5},${cell.yIn}`),
        at.get(`${cell.xIn},${cell.yIn + 1.5}`),
      ]) {
        if (!neighbour) continue;
        pairs += 1;
        expect(neighbour.speciesId).not.toBe(cell.speciesId);
      }
    }
    expect(pairs).toBe(112); // 8 rows × 7 + 8 columns × 7
  });
});

describe('Checkerboard — derived numbers', () => {
  it('cuts 8 strip pieces at 1.675 × 14.275', () => {
    const config = checkerboard();
    const pieces = designCutPieces(config, calculateMetrics(config).panelPlan);
    expect(pieces).toHaveLength(8);
    for (const piece of pieces) {
      expect(piece.role).toBe('strip');
      expect(piece.finishedWidthIn).toBe(1.5);
      expect(piece.ripWidthIn).toBeCloseTo(1.675, 9);
      expect(piece.lengthIn).toBeCloseTo(14.275, 9);
    }
  });

  it('needs 2.12 board feet and buys 2 boards at 3 1/2″', () => {
    const config = checkerboard();
    expect(formatBoardFeet(calculateMetrics(config).totalBoardFeet)).toBe('2.12');
    expect(totalBoards(cutPlanGroupsForConfig(config))).toBe(2);
    expect(defaultCutPlanStockWidthIn(config)).toBe(3.5);
  });

  it('build guide counts 4 strips per species', () => {
    const config = checkerboard();
    const steps = designBuildSteps(config, calculateMetrics(config));
    const step = (id: string) => steps.find((s) => s.id === id)!;

    expect(step('mill-stock').quantities.map(formatBuildQuantity)).toEqual([
      'Hard Maple stock · 1 1/2" thick — for 4 strips',
      'Walnut stock · 1 1/2" thick — for 4 strips',
    ]);
    expect(step('crosscut-strips').detail).toBe('Crosscut strips to 14 1/4".');
    expect(step('crosscut-strips').quantities.map(formatBuildQuantity)).toEqual([
      '4× Hard Maple strips · 14 1/4" long × 1 11/16" wide',
      '4× Walnut strips · 14 1/4" long × 1 11/16" wide',
    ]);
    expect(step('crosscut-slices').detail).toBe(
      'Crosscut the panel into 8 slices at 1 11/16" thick.',
    );
    expect(step('dry-fit').detail).toContain('Strip 8 (Walnut 1 1/2")');
    expect(step('dry-fit').detail).not.toContain('Strip 9');
  });

  it('saves as-is', () => {
    const config = checkerboard();
    expect(saveBlockers(config)).toEqual([]);
    expect(parseConfig(JSON.parse(JSON.stringify(config))).ok).toBe(true);
  });

  it('thumbnails exactly', () => {
    const config = checkerboard();
    const model = thumbModelFromConfig(config);
    expect(model.kind).toBe('ok');
    if (model.kind !== 'ok') return;
    expect(model.approximate).toBe(false);
    expect(model.cells).toEqual(layoutTopFace(config, calculateMetrics(config)));
  });
});
