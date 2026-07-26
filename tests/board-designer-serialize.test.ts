import { describe, it, expect } from 'vitest';
import { parseConfig } from '@/lib/board-designer/serialize';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import {
  goldenV1Fixture,
  makePanel,
  makeStrip,
  makeV2Config,
} from './fixtures/board-design';

function goldenV2Raw(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  const strips = Array.from({ length: 12 }, (_, i) => ({
    id: `g-${i + 1}`,
    speciesId: i % 2 === 0 ? 'walnut' : 'hard-maple',
    widthIn: 1.5,
    repeat: 1,
  }));
  return {
    schemaVersion: 2,
    name: 'Golden end-grain',
    grain: 'end',
    sourceLengthIn: 20,
    sliceThicknessIn: 1.5,
    kerfIn: 0.125,
    wasteFactor: 0.15,
    panels: [
      {
        id: 'panel-1',
        label: 'Panel 1',
        thicknessIn: 1.5,
        strips,
      },
    ],
    rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
    rowCount: 12,
    ...over,
  };
}

describe('parseConfig — v1 migrates to v2', () => {
  it('accepts the golden v1 fixture and returns schemaVersion 2', () => {
    const result = parseConfig(goldenV1Fixture());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const config: BoardDesignConfig = result.config;
    expect(config.schemaVersion).toBe(2);
    expect(config.name).toBe('Golden checkerboard');
    expect(config.panels).toHaveLength(1);
    expect(config.panels[0]!.strips).toHaveLength(12);
    expect(config.panels[0]!.thicknessIn).toBe(1.5);
    expect(config.rowPattern).toEqual([
      { panelId: 'panel-1', transform: 'none' },
      { panelId: 'panel-1', transform: 'rot180' },
    ]);
    expect(config.rowCount).toBe(12);
    expect(config).not.toHaveProperty('strips');
    expect(config).not.toHaveProperty('stockThicknessIn');
    expect(config).not.toHaveProperty('flipEveryOtherSlice');
  });

  it('v1 with flipEveryOtherSlice:false migrates to a one-entry rowPattern', () => {
    const result = parseConfig({
      ...goldenV1Fixture(),
      flipEveryOtherSlice: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.rowPattern).toEqual([
      { panelId: 'panel-1', transform: 'none' },
    ]);
  });
});

describe('parseConfig round-trip', () => {
  it('round-trips a golden v2 config', () => {
    const raw = goldenV2Raw();
    const result = parseConfig(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const config: BoardDesignConfig = result.config;
    expect(config.schemaVersion).toBe(2);
    expect(config.name).toBe('Golden end-grain');
    expect(config.grain).toBe('end');
    expect(config.sourceLengthIn).toBe(20);
    expect(config.panels[0]!.strips).toHaveLength(12);
    const again = parseConfig(JSON.parse(JSON.stringify(config)));
    expect(again).toEqual(result);
  });

  it('is idempotent on its own v2 output', () => {
    const once = parseConfig(makeV2Config());
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    const twice = parseConfig(once.config);
    expect(twice.ok).toBe(true);
    if (!twice.ok) return;
    expect(twice.config).toEqual(once.config);
  });
});

describe('parseConfig bound violations — ok:false, no throw', () => {
  it('rejects schemaVersion: 3', () => {
    expect(() => parseConfig(goldenV2Raw({ schemaVersion: 3 }))).not.toThrow();
    const r = parseConfig(goldenV2Raw({ schemaVersion: 3 }));
    expect(r.ok).toBe(false);
  });

  it('rejects name empty (min 1)', () => {
    const r = parseConfig(goldenV2Raw({ name: '' }));
    expect(r.ok).toBe(false);
  });

  it('rejects name over 80 chars', () => {
    const r = parseConfig(goldenV2Raw({ name: 'x'.repeat(81) }));
    expect(r.ok).toBe(false);
  });

  it('rejects panels empty (min 1)', () => {
    const r = parseConfig(goldenV2Raw({ panels: [] }));
    expect(r.ok).toBe(false);
  });

  it('rejects a panel with empty strips', () => {
    const r = parseConfig(
      goldenV2Raw({
        panels: [
          { id: 'panel-1', label: 'Panel 1', thicknessIn: 1.5, strips: [] },
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it('rejects total strips across panels > 80', () => {
    const config = makeV2Config({
      panels: [
        makePanel(
          'p1',
          'P1',
          1.5,
          Array.from({ length: 41 }, (_, i) => makeStrip(`a${i}`, 'walnut')),
        ),
        makePanel(
          'p2',
          'P2',
          1.5,
          Array.from({ length: 40 }, (_, i) => makeStrip(`b${i}`, 'walnut')),
        ),
      ],
      rowPattern: [{ panelId: 'p1', transform: 'none' }],
    });
    expect(parseConfig(config).ok).toBe(false);
  });

  it('rejects duplicate panel ids', () => {
    const config = makeV2Config({
      panels: [
        makePanel('same', 'A', 1.5, [makeStrip('a', 'walnut')]),
        makePanel('same', 'B', 1.5, [makeStrip('b', 'walnut')]),
      ],
    });
    expect(parseConfig(config).ok).toBe(false);
  });

  it('rejects rowPattern referencing an absent panel', () => {
    const config = makeV2Config({
      rowPattern: [{ panelId: 'nope', transform: 'none' }],
    });
    expect(parseConfig(config).ok).toBe(false);
  });

  it('rejects widthIn below 0.0625', () => {
    const r = parseConfig(
      goldenV2Raw({
        panels: [
          {
            id: 'panel-1',
            label: 'Panel 1',
            thicknessIn: 1.5,
            strips: [
              { id: 's1', speciesId: 'hard-maple', widthIn: 0.03125, repeat: 1 },
            ],
          },
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it('rejects widthIn above 24', () => {
    const r = parseConfig(
      goldenV2Raw({
        panels: [
          {
            id: 'panel-1',
            label: 'Panel 1',
            thicknessIn: 1.5,
            strips: [
              { id: 's1', speciesId: 'hard-maple', widthIn: 24.1, repeat: 1 },
            ],
          },
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it('rejects repeat below 1', () => {
    const r = parseConfig(
      goldenV2Raw({
        panels: [
          {
            id: 'panel-1',
            label: 'Panel 1',
            thicknessIn: 1.5,
            strips: [
              { id: 's1', speciesId: 'hard-maple', widthIn: 1.5, repeat: 0 },
            ],
          },
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it('rejects repeat above 20', () => {
    const r = parseConfig(
      goldenV2Raw({
        panels: [
          {
            id: 'panel-1',
            label: 'Panel 1',
            thicknessIn: 1.5,
            strips: [
              { id: 's1', speciesId: 'hard-maple', widthIn: 1.5, repeat: 21 },
            ],
          },
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it('rejects sourceLengthIn below 1', () => {
    const r = parseConfig(goldenV2Raw({ sourceLengthIn: 0.5 }));
    expect(r.ok).toBe(false);
  });

  it('rejects sourceLengthIn above 96', () => {
    const r = parseConfig(goldenV2Raw({ sourceLengthIn: 97 }));
    expect(r.ok).toBe(false);
  });

  it('rejects panel thicknessIn below 0.125', () => {
    const r = parseConfig(
      goldenV2Raw({
        panels: [
          {
            id: 'panel-1',
            label: 'Panel 1',
            thicknessIn: 0.1,
            strips: [
              { id: 's1', speciesId: 'hard-maple', widthIn: 1.5, repeat: 1 },
            ],
          },
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it('rejects panel thicknessIn above 4', () => {
    const r = parseConfig(
      goldenV2Raw({
        panels: [
          {
            id: 'panel-1',
            label: 'Panel 1',
            thicknessIn: 4.1,
            strips: [
              { id: 's1', speciesId: 'hard-maple', widthIn: 1.5, repeat: 1 },
            ],
          },
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it('rejects sliceThicknessIn below 0.25', () => {
    const r = parseConfig(goldenV2Raw({ sliceThicknessIn: 0.1 }));
    expect(r.ok).toBe(false);
  });

  it('rejects sliceThicknessIn above 4', () => {
    const r = parseConfig(goldenV2Raw({ sliceThicknessIn: 5 }));
    expect(r.ok).toBe(false);
  });

  it('rejects kerfIn below 0', () => {
    const r = parseConfig(goldenV2Raw({ kerfIn: -0.01 }));
    expect(r.ok).toBe(false);
  });

  it('rejects kerfIn above 0.5', () => {
    const r = parseConfig(goldenV2Raw({ kerfIn: 0.6 }));
    expect(r.ok).toBe(false);
  });

  it('rejects wasteFactor below 0', () => {
    const r = parseConfig(goldenV2Raw({ wasteFactor: -0.1 }));
    expect(r.ok).toBe(false);
  });

  it('rejects wasteFactor above 1', () => {
    const r = parseConfig(goldenV2Raw({ wasteFactor: 1.1 }));
    expect(r.ok).toBe(false);
  });

  it('rejects rowCount below 1', () => {
    const r = parseConfig(goldenV2Raw({ rowCount: 0 }));
    expect(r.ok).toBe(false);
  });

  it('rejects rowCount above 60', () => {
    const r = parseConfig(goldenV2Raw({ rowCount: 61 }));
    expect(r.ok).toBe(false);
  });
});
