import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { designBoardFeetBySpecies } from '@/lib/board-designer/design-board-feet';
import { designCutPlan } from '@/lib/board-designer/design-cut-plan';
import {
  DEFAULT_PLANE_BUFFER_IN,
  stripStackOverageRatio,
} from '@/lib/board-designer/lumber-allowance';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { parseConfig } from '@/lib/board-designer/serialize';
import { totalBoards } from '@/lib/cut-optimizer';
import { formatBoardFeet } from '@/lib/format';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

/** Finished volume board feet (no kerf, no plane, no defects). */
function finishedBf(
  widthIn: number,
  lengthIn: number,
  thicknessIn: number,
): number {
  return (widthIn * lengthIn * thicknessIn) / 144;
}

describe('Sprint 73 lumber allowance (D1 / A1–A4)', () => {
  it('12×1″ strips: strip-stack ratio and total volume overage land near 29%', () => {
    // Geometry spelled out: edge grain, 12×1″, L=18, T=¾, wasteFactor 0 (defects off).
    // D1: 11×0.125 kerf + 12×0.175 plane = 3.475″ on 12″ → 28.96%.
    const kerfIn = 0.125;
    const plane = DEFAULT_PLANE_BUFFER_IN;
    const stripW = 1;
    const n = 12;
    const lengthIn = 18;
    const thicknessIn = 0.75;
    const finishedW = n * stripW;

    const stackRatio = stripStackOverageRatio(finishedW, n, kerfIn, plane);
    expect(stackRatio).toBeCloseTo(
      (n * plane + (n - 1) * kerfIn) / finishedW,
      10,
    );
    expect(stackRatio).toBeGreaterThan(0.28);
    expect(stackRatio).toBeLessThan(0.3);

    const strips = Array.from({ length: n }, (_, i) =>
      makeStrip(`s${i}`, i % 2 === 0 ? 'hard-maple' : 'walnut', stripW, 1),
    );
    const config = makeV2Config({
      grain: 'edge',
      sourceLengthIn: lengthIn,
      kerfIn,
      wasteFactor: 0,
      planeBuffer: plane,
      panels: [makePanel('p', 'P', thicknessIn, strips)],
    });
    const total = designBoardFeetBySpecies(config).reduce(
      (sum, r) => sum + r.boardFeet,
      0,
    );
    const finished = finishedBf(finishedW, lengthIn, thicknessIn);
    const overage = total / finished - 1;
    // Volume overage == strip-stack only (no L/T plane, no defects).
    expect(overage).toBeCloseTo(stackRatio, 10);
    expect(overage).toBeGreaterThan(0.28);
    expect(overage).toBeLessThan(0.3);
  });

  it('5×2″ strips: strip-stack ratio and total volume overage land near 14%', () => {
    const kerfIn = 0.125;
    const plane = DEFAULT_PLANE_BUFFER_IN;
    const stripW = 2;
    const n = 5;
    const lengthIn = 18;
    const thicknessIn = 0.75;
    const finishedW = n * stripW; // 10″

    const stackRatio = stripStackOverageRatio(finishedW, n, kerfIn, plane);
    expect(stackRatio).toBeCloseTo(
      (n * plane + (n - 1) * kerfIn) / finishedW,
      10,
    );
    expect(stackRatio).toBeGreaterThan(0.13);
    expect(stackRatio).toBeLessThan(0.15);

    const strips = Array.from({ length: n }, (_, i) =>
      makeStrip(`s${i}`, i % 2 === 0 ? 'hard-maple' : 'walnut', stripW, 1),
    );
    const config = makeV2Config({
      grain: 'edge',
      sourceLengthIn: lengthIn,
      kerfIn,
      wasteFactor: 0,
      planeBuffer: plane,
      panels: [makePanel('p', 'P', thicknessIn, strips)],
    });
    const total = designBoardFeetBySpecies(config).reduce(
      (sum, r) => sum + r.boardFeet,
      0,
    );
    const finished = finishedBf(finishedW, lengthIn, thicknessIn);
    const overage = total / finished - 1;
    expect(overage).toBeCloseTo(stackRatio, 10);
    expect(overage).toBeGreaterThan(0.13);
    expect(overage).toBeLessThan(0.15);
  });

  it('edge-grain allowance stays under 50% at defaults (sanity)', () => {
    // verify-52 shape: 7×1½″, 18″, ¾″ — was +70% when W×L×T×waste compounded.
    const strips = Array.from({ length: 7 }, (_, i) =>
      makeStrip(
        `e${i}`,
        i < 4 ? 'hard-maple' : 'walnut',
        1.5,
        1,
      ),
    );
    const config = makeV2Config({
      grain: 'edge',
      sourceLengthIn: 18,
      kerfIn: 0.125,
      wasteFactor: 0,
      planeBuffer: DEFAULT_PLANE_BUFFER_IN,
      panels: [makePanel('p', 'P', 0.75, strips)],
    });
    const total = designBoardFeetBySpecies(config).reduce(
      (sum, r) => sum + r.boardFeet,
      0,
    );
    const finished = finishedBf(10.5, 18, 0.75);
    const overage = total / finished - 1;
    expect(overage).toBeLessThan(0.5);
    expect(overage).toBeGreaterThan(0.1);
    expect(overage).toBeLessThan(0.25); // ~18.8% strip-stack
  });

  it('saved v2 without planeBuffer parses and gets the default', () => {
    const raw = makeV2Config({
      grain: 'edge',
      panels: [makePanel('p', 'P', 1.5, [makeStrip('a', 'hard-maple')])],
    });
    const { planeBuffer: _omit, ...without } = raw;
    const parsed = parseConfig(without);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.config.planeBuffer).toBe(DEFAULT_PLANE_BUFFER_IN);
  });

  it('v1 upgrade fills planeBuffer default', () => {
    const parsed = parseConfig({
      schemaVersion: 1,
      name: 'Legacy',
      grain: 'edge',
      sourceLengthIn: 18,
      stockThicknessIn: 0.75,
      sliceThicknessIn: 0.75,
      kerfIn: 0.125,
      wasteFactor: 0.15,
      flipEveryOtherSlice: false,
      strips: [
        { id: 's1', speciesId: 'hard-maple', widthIn: 1.5, repeat: 1 },
        { id: 's2', speciesId: 'walnut', widthIn: 1.5, repeat: 1 },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.config.planeBuffer).toBe(DEFAULT_PLANE_BUFFER_IN);
  });

  it('cut-plan path still forces wasteFactor: 0; board counts ignore estimate stock', () => {
    const src = readFileSync('src/lib/board-designer/design-cut-plan.ts', 'utf8');
    expect(src).toContain('wasteFactor: 0');

    const config = makeV2Config({
      grain: 'edge',
      sourceLengthIn: 18,
      wasteFactor: 0.5,
      planeBuffer: 0.175,
      panels: [
        makePanel('p', 'P', 0.75, [
          makeStrip('a', 'hard-maple', 1.5, 1),
          makeStrip('b', 'walnut', 1.5, 1),
        ]),
      ],
    });
    const withBuffer = designCutPlan(config, {
      stockLengthIn: 96,
      stockWidthIn: null,
      kerfIn: config.kerfIn,
      endTrimIn: 1,
    });
    const withoutBuffer = designCutPlan(
      { ...config, planeBuffer: 0, wasteFactor: 0 },
      {
        stockLengthIn: 96,
        stockWidthIn: null,
        kerfIn: config.kerfIn,
        endTrimIn: 1,
      },
    );
    expect(totalBoards(withBuffer)).toBe(totalBoards(withoutBuffer));
  });

  it('board feet reach the DOM only via formatBoardFeet', () => {
    const config = makeV2Config({
      grain: 'edge',
      sourceLengthIn: 18,
      panels: [
        makePanel('p', 'P', 1.5, [
          makeStrip('a', 'hard-maple', 1),
          makeStrip('b', 'walnut', 1),
        ]),
      ],
    });
    const total = calculateMetrics(config).totalBoardFeet;
    expect(formatBoardFeet(total)).toMatch(/^\d+(\.\d+)?$/);
    expect(formatBoardFeet(total)).not.toMatch(/e|E/);
  });
});
