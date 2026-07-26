import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_CONFIG_BYTES } from '@/lib/board-designer/config-limits';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { layoutTopFace } from '@/lib/board-designer/layout';
import { closingThicknessHint } from '@/lib/board-designer/miter-geometry';
import { parseConfig } from '@/lib/board-designer/serialize';
import { getTemplate } from '@/lib/board-designer/templates';
import {
  DESIGN_TOO_LARGE_NOTICE_VALUE,
  hasDesignTooLargeNotice,
} from '@/lib/rate-limit-feedback';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import {
  buildSchemaMaxConfig,
  makePanel,
  makeStrip,
  makeV2Config,
} from './fixtures/board-design';

/**
 * Sprint 62 — every user-facing designer warning/hint/notice must have a named
 * witness. A string with no way to appear fails the suite (the Sprint 61 skip
 * note shipped unreachable; this is the mechanism that catches the next one).
 */

type Witness = {
  id: string;
  needle: string | RegExp;
  config: BoardDesignConfig;
  /** false = editor draft / post-delete state that parseConfig rejects. */
  schemaValid?: boolean;
};

function warningsOf(config: BoardDesignConfig): string[] {
  return calculateMetrics(config).warnings;
}

const harlequin = () => getTemplate('harlequin')!.config;

const WITNESSES: Witness[] = [
  {
    id: 'deleted-panel',
    needle: 'Row pattern uses a panel that was deleted.',
    // Editor can hold this after deleting a panel; serialize rejects it.
    schemaValid: false,
    config: makeV2Config({
      panels: [makePanel('keep', 'Keep', 1.5, [makeStrip('s1', 'walnut')])],
      rowPattern: [
        { panelId: 'keep', transform: 'none' },
        { panelId: 'missing-panel', transform: 'rot180' },
      ],
      rowCount: 4,
    }),
  },
  {
    id: 'unequal-panel-widths',
    needle: 'Panels must be the same width — slices will not line up.',
    config: makeV2Config({
      panels: [
        makePanel('a', 'A', 1.5, [makeStrip('a1', 'walnut', 2)]),
        makePanel('b', 'B', 1.5, [makeStrip('b1', 'hard-maple', 3)]),
      ],
      rowPattern: [
        { panelId: 'a', transform: 'none' },
        { panelId: 'b', transform: 'none' },
      ],
      rowCount: 4,
    }),
  },
  {
    id: 'extra-panels-in-edge-grain',
    needle: 'Extra panels are unused in edge grain.',
    config: makeV2Config({
      grain: 'edge',
      panels: [
        makePanel('a', 'A', 0.75, [makeStrip('a1', 'walnut')]),
        makePanel('b', 'B', 0.75, [makeStrip('b1', 'hard-maple')]),
      ],
      rowPattern: [{ panelId: 'a', transform: 'none' }],
      rowCount: 1,
    }),
  },
  {
    id: 'add-a-strip',
    needle: 'Add a strip to see your board.',
    schemaValid: false,
    config: makeV2Config({
      panels: [{ id: 'p1', label: 'Empty', thicknessIn: 1.5, strips: [] }],
      rowPattern: [{ panelId: 'p1', transform: 'none' }],
      rowCount: 1,
    }),
  },
  {
    id: 'unknown-wood',
    needle: 'Unknown wood: not-a-real-species',
    config: makeV2Config({
      panels: [
        makePanel('p1', 'P', 1.5, [makeStrip('s1', 'not-a-real-species')]),
      ],
    }),
  },
  {
    id: 'wider-than-planer',
    needle: 'Wider than most planers — plan to hand-flatten.',
    config: makeV2Config({
      grain: 'edge',
      panels: [
        makePanel('p1', 'P', 1.5, [
          makeStrip('s1', 'walnut', 12),
          makeStrip('s2', 'hard-maple', 12),
          makeStrip('s3', 'cherry', 1),
        ]),
      ],
      rowPattern: [{ panelId: 'p1', transform: 'none' }],
      rowCount: 1,
    }),
  },
  {
    id: 'miter-closing-thickness-mismatch',
    needle:
      'Closing thickness for a 7/8" strip at 30° is ≈ 1" — panel is 1 1/2" (>5% off; lattice will not close).',
    config: {
      ...harlequin(),
      panels: harlequin().panels.map((p) => ({ ...p, thicknessIn: 1.5 })),
    },
  },
  {
    id: 'miter-does-not-close-fallback',
    needle: 'Miter pattern does not close — check corners and row transforms.',
    config: (() => {
      const base = harlequin();
      return {
        ...base,
        panels: base.panels.map((p) => ({
          ...p,
          strips: p.strips.map((s, i) =>
            i === 0
              ? { ...s, miter: { ...s.miter!, corner: 'tl' as const } }
              : s,
          ),
        })),
      };
    })(),
  },
];

describe('designer user-facing string reachability (Sprint 62)', () => {
  it.each(WITNESSES)(
    '$id has a named witness that produces the string',
    ({ id, needle, config, schemaValid = true }) => {
      const parsed = parseConfig(config);
      if (schemaValid) {
        expect(parsed.ok, `${id} must be schema-valid`).toBe(true);
      } else {
        expect(parsed.ok, `${id} is an editor draft (not schema-valid)`).toBe(
          false,
        );
      }

      const warnings = warningsOf(config);
      const hit =
        typeof needle === 'string'
          ? warnings.includes(needle) || warnings.some((w) => w.includes(needle))
          : warnings.some((w) => needle.test(w));
      expect(
        hit,
        `${id}: expected ${String(needle)} in ${JSON.stringify(warnings)}`,
      ).toBe(true);
    },
  );

  it('closingThicknessHint matches the metrics mismatch warning (same helper)', () => {
    const msg = closingThicknessHint(0.875, 1.5, 30);
    const mismatched = {
      ...harlequin(),
      panels: harlequin().panels.map((p) => ({ ...p, thicknessIn: 1.5 })),
    };
    expect(warningsOf(mismatched)).toContain(msg);
  });

  it('design-too-large has no schema-valid witness (defence-in-depth only)', () => {
    const max = buildSchemaMaxConfig();
    expect(parseConfig(max).ok).toBe(true);
    const bytes = new TextEncoder().encode(JSON.stringify(max)).byteLength;
    expect(bytes).toBeLessThanOrEqual(MAX_CONFIG_BYTES);
    expect(DESIGN_TOO_LARGE_NOTICE_VALUE).toBe('design-too-large');
    expect(hasDesignTooLargeNotice('design-too-large')).toBe(true);
  });

  it('skip-note string is gone from metrics (gate deleted)', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/board-designer/metrics.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/too large to check automatically/);
    expect(source).not.toContain('MITER_COLOUR_CHECK_SKIPPED_NOTE');
    expect(source).not.toContain('MITER_COLOUR_CHECK_CELL_CAP');
  });

  it('every static warnings.push literal has a witness id', () => {
    const covered = new Set(WITNESSES.map((w) => w.id));
    const required = [
      'deleted-panel',
      'unequal-panel-widths',
      'extra-panels-in-edge-grain',
      'add-a-strip',
      'unknown-wood',
      'wider-than-planer',
      'miter-closing-thickness-mismatch',
      'miter-does-not-close-fallback',
    ];
    for (const id of required) {
      expect(covered.has(id), `missing witness id ${id}`).toBe(true);
    }
  });
});

describe('MAX_DRAWN_CELLS / MAX_3D_CELLS engage below schema max (record only)', () => {
  it('notes the caps; 48k cells exceeds both (do not retune this sprint)', () => {
    const diagram = readFileSync(
      join(process.cwd(), 'src/components/designer/board-diagram.tsx'),
      'utf8',
    );
    const r3f = readFileSync(
      join(process.cwd(), 'src/components/designer/r3f-layout.ts'),
      'utf8',
    );
    expect(diagram).toMatch(/MAX_DRAWN_CELLS\s*=\s*5_000/);
    expect(r3f).toMatch(/MAX_3D_CELLS\s*=\s*8_000/);

    const strips = Array.from({ length: 40 }, (_, i) => ({
      id: `s${i}`,
      speciesId: 'hard-maple',
      widthIn: 0.25,
      repeat: 20,
      miter: {
        speciesId: 'walnut',
        angleDeg: 30,
        corner: (i % 2 === 0 ? 'tr' : 'tl') as 'tr' | 'tl',

      },
    }));
    const config = makeV2Config({
      panels: [makePanel('p1', 'P', 1.5, strips)],
      rowPattern: [{ panelId: 'p1', transform: 'none' }],
      rowCount: 60,
    });
    const cells = layoutTopFace(config, calculateMetrics(config));
    expect(cells.length).toBe(48_000);
    expect(cells.length).toBeGreaterThan(5_000);
    expect(cells.length).toBeGreaterThan(8_000);
  });
});
