import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { OptimizerPanel } from '@/components/designer/optimizer-panel';
import { designCutPlan } from '@/lib/board-designer/design-cut-plan';
import { toParts } from '@/lib/board-designer/to-parts';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import {
  DEFAULT_OPTIONS,
  totalBoards,
  yieldRatio,
} from '@/lib/cut-optimizer';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

/**
 * Sprint 64 / U6 — designer cut plan. Packing is shared (`optimize` / `BoardBar`);
 * waste is applied once (metrics keep wasteFactor; packing uses wasteFactor: 0).
 */

function edgeBoard(overrides: Parameters<typeof makeV2Config>[0] = {}) {
  return makeV2Config({
    grain: 'edge',
    sourceLengthIn: 18,
    wasteFactor: 0.15,
    kerfIn: 0.125,
    panels: [
      makePanel('panel-1', 'Panel 1', 1.5, [
        makeStrip('s1', 'walnut', 1.5, 1),
        makeStrip('s2', 'hard-maple', 1.5, 1),
        makeStrip('s3', 'walnut', 1.5, 1),
        makeStrip('s4', 'hard-maple', 1.5, 1),
      ]),
    ],
    ...overrides,
  });
}

describe('designCutPlan', () => {
  it('parts carry real lengths (not board feet) and kerf is accounted in packing', () => {
    const config = edgeBoard();
    const parts = toParts(config);
    expect(parts.every((p) => p.lengthIn === 18)).toBe(true);
    expect(parts.every((p) => p.lengthIn > 0)).toBe(true);

    // Six 16″ parts do not fit a 96″ board once kerf is charged — sanity on shared packer.
    const shortStock = designCutPlan(config, {
      ...DEFAULT_OPTIONS,
      stockLengthIn: 96,
      stockWidthIn: null,
      // waste omitted by DesignCutPlanOptions — designCutPlan forces 0
      kerfIn: 0.125,
      endTrimIn: 1,
    });
    expect(totalBoards(shortStock)).toBeGreaterThan(0);
    for (const g of shortStock) {
      expect(g.impossible).toEqual([]);
      for (const board of g.boards) {
        // usedIn includes kerf per part + end trim
        expect(board.usedIn).toBeGreaterThan(
          board.parts.reduce((sum, p) => sum + p.lengthIn, 0),
        );
      }
    }
  });

  it('a part longer than the stock surfaces as impossible and is not dropped', () => {
    const config = edgeBoard({ sourceLengthIn: 90 });
    const groups = designCutPlan(config, {
      stockLengthIn: 72,
      stockWidthIn: null,
      kerfIn: 0.125,
      endTrimIn: 1,
    });
    const impossible = groups.flatMap((g) => g.impossible);
    expect(impossible.length).toBeGreaterThan(0);
    expect(impossible.every((p) => p.lengthIn === 90)).toBe(true);
    // Parts still appear — not filtered out of the plan.
    expect(impossible.map((p) => p.label).join(' ')).toMatch(/Walnut|Hard Maple/);
  });

  it('totalBoards reflects physical boards, not ripped lanes', () => {
    // 90″ strips each need their own lane (won't share a 96″ board). Four lanes
    // rip from one 9.25″ board — lanes=4, physicalBoards=1.
    const config = edgeBoard({
      sourceLengthIn: 90,
      panels: [
        makePanel('panel-1', 'Panel 1', 0.75, [
          makeStrip('s1', 'hard-maple', 2, 1),
          makeStrip('s2', 'hard-maple', 2, 1),
          makeStrip('s3', 'hard-maple', 2, 1),
          makeStrip('s4', 'hard-maple', 2, 1),
        ]),
      ],
    });
    const groups = designCutPlan(config, {
      stockLengthIn: 96,
      stockWidthIn: 9.25,
      kerfIn: 0.125,
      endTrimIn: 1,
    });
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.ripsPerBoard).toBeGreaterThan(1);
    expect(group.lanes).toBe(4);
    expect(group.physicalBoards).toBe(1);
    expect(totalBoards(groups)).toBe(1);
    expect(totalBoards(groups)).not.toBe(group.lanes);
  });

  it('yield divides by boards bought — a 3-of-4 rip does not report ~95%', () => {
    const config = edgeBoard({
      sourceLengthIn: 90,
      panels: [
        makePanel('panel-1', 'Panel 1', 0.75, [
          makeStrip('s1', 'hard-maple', 2, 1),
          makeStrip('s2', 'hard-maple', 2, 1),
          makeStrip('s3', 'hard-maple', 2, 1),
        ]),
      ],
    });
    const groups = designCutPlan(config, {
      stockLengthIn: 96,
      stockWidthIn: 9.25,
      kerfIn: 0.125,
      endTrimIn: 1,
    });
    const group = groups[0]!;
    expect(group.ripsPerBoard).toBe(4);
    expect(group.lanes).toBe(3);
    expect(group.physicalBoards).toBe(1);
    const yieldPct = yieldRatio(group, 96) * 100;
    // Honest yield counts the empty rip lane — well below a length-only ~95%.
    expect(yieldPct).toBeLessThan(85);
    expect(yieldPct).toBeGreaterThan(50);
  });

  it('waste is applied exactly once — packing ignores config.wasteFactor', () => {
    const config = edgeBoard({ wasteFactor: 0.5 });
    const metrics = calculateMetrics(config);
    const raw =
      metrics.totalBoardFeet / (1 + config.wasteFactor);
    expect(metrics.totalBoardFeet).toBeCloseTo(raw * 1.5, 5);

    const groups = designCutPlan(config, {
      stockLengthIn: 96,
      stockWidthIn: null,
      kerfIn: config.kerfIn,
      endTrimIn: 1,
    });
    // designCutPlan forces wasteFactor: 0, so group.boardFeet === raw part sum.
    const packedBf = groups.reduce((sum, g) => sum + g.boardFeet, 0);
    const parts = toParts(config);
    const partBf = parts.reduce(
      (sum, p) => sum + (p.thicknessIn * p.widthIn * p.lengthIn * p.quantity) / 144,
      0,
    );
    expect(packedBf).toBeCloseTo(partBf, 5);
    expect(packedBf).not.toBeCloseTo(partBf * 1.5, 5);
  });

  it('partitions by species so maple and cherry never share a packed board', () => {
    const config = edgeBoard({
      panels: [
        makePanel('panel-1', 'Panel 1', 1.5, [
          makeStrip('s1', 'hard-maple', 1.5, 1),
          makeStrip('s2', 'cherry', 1.5, 1),
        ]),
      ],
    });
    const groups = designCutPlan(config, {
      stockLengthIn: 96,
      stockWidthIn: null,
      kerfIn: 0.125,
      endTrimIn: 1,
    });
    expect(groups.map((g) => g.material).sort()).toEqual(['Cherry', 'Hard Maple']);
  });
});

describe('OptimizerPanel render', () => {
  it('shows boards / offcut / yield with no currency or decimal-inch strings', () => {
    const html = renderToStaticMarkup(
      createElement(OptimizerPanel, { config: edgeBoard() }),
    );
    expect(html).toMatch(/Cut plan/);
    expect(html).toMatch(/board/i);
    expect(html).toMatch(/left over/);
    expect(html).toMatch(/% of each board consumed/);
    expect(html).not.toMatch(/\$\d/);
    // Visible text only — option value="3.5" / style flex-grow decimals are not inches.
    const visible = html
      .replace(/\s(?:value|style)="[^"]*"/g, '')
      .replace(/<[^>]+>/g, ' ');
    expect(visible).not.toMatch(/\d+\.\d+\s*["″]/);
  });

  it('names impossible parts instead of vanishing them', () => {
    // Default stock is 96″; usable ≈ 95″ after end trim — 100″ parts must surface.
    const html = renderToStaticMarkup(
      createElement(OptimizerPanel, {
        config: edgeBoard({ sourceLengthIn: 100 }),
      }),
    );
    expect(html).toMatch(/do not fit/);
    expect(html).toMatch(/Walnut strip|Hard Maple strip/);
    expect(html).toMatch(/longer than/i);
  });
});
