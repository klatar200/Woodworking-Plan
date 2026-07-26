import { randomUUID } from 'node:crypto';
import type {
  BoardDesignConfig,
  MiterCorner,
  Panel,
  Strip,
} from '@/lib/board-designer/types';

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

/** Largest config the schema accepts — 4 panels, 80 mitered strips, 24 steps, 60 rows. */
export function buildSchemaMaxConfig(): BoardDesignConfig {
  const panels: Panel[] = [];
  for (let p = 0; p < 4; p += 1) {
    const strips: Strip[] = [];
    for (let i = 0; i < 20; i += 1) {
      strips.push({
        id: randomUUID(),
        speciesId: 'hard-maple',
        widthIn: 0.875,
        repeat: 1,
        miter: {
          speciesId: 'walnut',
          angleDeg: 30,
          corner: (i % 2 === 0 ? 'tr' : 'tl') as MiterCorner,
        },
      });
    }
    panels.push({
      id: randomUUID(),
      label: `Panel ${p + 1}`,
      thicknessIn: 1.5,
      strips,
    });
  }

  const rowPattern = Array.from({ length: 24 }, (_, i) => ({
    panelId: panels[i % 4]!.id,
    transform: (['none', 'rot180', 'mirrorX', 'mirrorY'] as const)[i % 4]!,
  }));

  return {
    schemaVersion: 2,
    name: 'X'.repeat(80),
    grain: 'end',
    sourceLengthIn: 96,
    sliceThicknessIn: 4,
    kerfIn: 0.5,
    wasteFactor: 1,
    panels,
    rowPattern,
    rowCount: 60,
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
