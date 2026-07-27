import { describe, expect, it } from 'vitest';
import { designBoardFeetBySpecies } from '@/lib/board-designer/design-board-feet';
import { designCutPlan } from '@/lib/board-designer/design-cut-plan';
import {
  parseConfig,
  STALE_DEFAULT_WASTE_FACTOR,
} from '@/lib/board-designer/serialize';
import { totalBoards } from '@/lib/cut-optimizer';
import { formatBoardFeet } from '@/lib/format';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

/** verify-52 geometry: edge, 7×1½″, 18″, ¾″. */
function verify52V2Raw(wasteFactor: number) {
  const strips = Array.from({ length: 7 }, (_, i) => ({
    id: `e${i}`,
    speciesId: i < 4 ? 'hard-maple' : 'walnut',
    widthIn: 1.5,
    repeat: 1,
  }));
  return {
    schemaVersion: 2 as const,
    name: 'verify-52',
    grain: 'edge' as const,
    sourceLengthIn: 18,
    sliceThicknessIn: 0.75,
    kerfIn: 0.125,
    wasteFactor,
    planeBuffer: 0.175,
    panels: [
      {
        id: 'p',
        label: 'P',
        thicknessIn: 0.75,
        strips,
      },
    ],
    rowPattern: [{ panelId: 'p', transform: 'none' as const }],
    rowCount: 1,
  };
}

describe('Sprint 74 schemaVersion 3 — retire stale wasteFactor', () => {
  it('v2 with wasteFactor 0.15 upgrades to 0', () => {
    const parsed = parseConfig(verify52V2Raw(STALE_DEFAULT_WASTE_FACTOR));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.config.schemaVersion).toBe(3);
    expect(parsed.config.wasteFactor).toBe(0);
  });

  it('v2 with a non-default wasteFactor is left alone', () => {
    const parsed = parseConfig(verify52V2Raw(0.2));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.config.schemaVersion).toBe(3);
    expect(parsed.config.wasteFactor).toBe(0.2);

    const zero = parseConfig(verify52V2Raw(0));
    expect(zero.ok).toBe(true);
    if (!zero.ok) return;
    expect(zero.config.wasteFactor).toBe(0);
  });

  it('v3 with deliberate 0.15 is NOT zeroed on re-parse', () => {
    const v3 = {
      ...verify52V2Raw(0),
      schemaVersion: 3 as const,
      wasteFactor: STALE_DEFAULT_WASTE_FACTOR,
    };
    const parsed = parseConfig(v3);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.config.schemaVersion).toBe(3);
    expect(parsed.config.wasteFactor).toBe(STALE_DEFAULT_WASTE_FACTOR);
  });

  it('v1 still upgrades cleanly through to v3 with stale 0.15 zeroed', () => {
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
    expect(parsed.config.schemaVersion).toBe(3);
    expect(parsed.config.wasteFactor).toBe(0);
    expect(parsed.config.planeBuffer).toBe(0.175);
  });

  it('verify-52 total matches fresh template (~1.17) after v2→v3', () => {
    const upgraded = parseConfig(verify52V2Raw(0.15));
    expect(upgraded.ok).toBe(true);
    if (!upgraded.ok) return;

    const fresh = makeV2Config({
      grain: 'edge',
      sourceLengthIn: 18,
      wasteFactor: 0,
      planeBuffer: 0.175,
      panels: [
        makePanel('p', 'P', 0.75, [
          ...Array.from({ length: 4 }, (_, i) =>
            makeStrip(`m${i}`, 'hard-maple', 1.5, 1),
          ),
          ...Array.from({ length: 3 }, (_, i) =>
            makeStrip(`w${i}`, 'walnut', 1.5, 1),
          ),
        ]),
      ],
    });

    const upTotal = designBoardFeetBySpecies(upgraded.config).reduce(
      (s, r) => s + r.boardFeet,
      0,
    );
    const freshTotal = designBoardFeetBySpecies(fresh).reduce(
      (s, r) => s + r.boardFeet,
      0,
    );
    expect(upTotal).toBeCloseTo(freshTotal, 10);
    expect(upTotal).toBeCloseTo(1.16953125, 5);
    expect(formatBoardFeet(upTotal)).toBe('1.17');
  });

  it('cut-plan board counts unchanged by schema v3 waste retirement', () => {
    const upgraded = parseConfig(verify52V2Raw(0.15));
    expect(upgraded.ok).toBe(true);
    if (!upgraded.ok) return;
    const groups = designCutPlan(upgraded.config, {
      stockLengthIn: 96,
      stockWidthIn: null,
      kerfIn: 0.125,
      endTrimIn: 1,
    });
    expect(totalBoards(groups)).toBe(2);
  });
});
