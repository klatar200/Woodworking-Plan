import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
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

describe('Sprint 73 lumber allowance (D1 / A1–A4)', () => {
  it('12×1″ strips derive ~29% strip-stack overage; 5×2″ derive ~14%', () => {
    const twelve = stripStackOverageRatio(12, 12, 0.125, DEFAULT_PLANE_BUFFER_IN);
    const five = stripStackOverageRatio(10, 5, 0.125, DEFAULT_PLANE_BUFFER_IN);
    expect(twelve).toBeCloseTo(0.2895833333333333, 10);
    expect(five).toBeCloseTo(0.1375, 10);
    // Near the D1 shop targets — derived, not a lookup table.
    expect(twelve).toBeGreaterThan(0.28);
    expect(twelve).toBeLessThan(0.3);
    expect(five).toBeGreaterThan(0.13);
    expect(five).toBeLessThan(0.15);
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
