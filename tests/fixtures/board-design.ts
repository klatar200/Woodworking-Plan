import type { BoardDesignConfig, Panel, Strip } from '@/lib/board-designer/types';

export function makeStrip(
  id: string,
  speciesId: string,
  widthIn = 1.5,
  repeat = 1,
): Strip {
  return { id, speciesId, widthIn, repeat };
}

export function makePanel(
  id: string,
  label: string,
  thicknessIn: number,
  strips: Strip[],
): Panel {
  return { id, label, thicknessIn, strips };
}

/** Minimal valid v2 end-grain config for tests. */
export function makeV2Config(
  overrides: Partial<BoardDesignConfig> & {
    panels?: Panel[];
  } = {},
): BoardDesignConfig {
  const panels =
    overrides.panels ??
    [
      makePanel('panel-1', 'Panel 1', 1.5, [
        makeStrip('s1', 'hard-maple'),
        makeStrip('s2', 'walnut'),
      ]),
    ];
  return {
    schemaVersion: 2,
    name: 'Test board',
    grain: 'end',
    sourceLengthIn: 20,
    sliceThicknessIn: 1.5,
    kerfIn: 0.125,
    wasteFactor: 0.15,
    rowCount: 8,
    ...overrides,
    panels,
    rowPattern: overrides.rowPattern ?? [
      { panelId: panels[0]!.id, transform: 'none' },
    ],
  };
}

/** §2.3 golden fixture as stored v1 JSON (for migration tests). */
export function goldenV1Fixture() {
  const strips = Array.from({ length: 12 }, (_, i) => ({
    id: `golden-${i + 1}`,
    speciesId: i % 2 === 0 ? 'walnut' : 'hard-maple',
    widthIn: 1.5,
    repeat: 1,
  }));
  return {
    schemaVersion: 1 as const,
    name: 'Golden checkerboard',
    grain: 'end' as const,
    sourceLengthIn: 20,
    stockThicknessIn: 1.5,
    sliceThicknessIn: 1.5,
    kerfIn: 0.125,
    wasteFactor: 0.15,
    flipEveryOtherSlice: true,
    strips,
  };
}
