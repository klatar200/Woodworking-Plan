import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MAX_CONFIG_BYTES } from '@/lib/board-designer/config-limits';
import { parseConfig } from '@/lib/board-designer/serialize';
import type { BoardDesignConfig, MiterCorner, Panel, Strip } from '@/lib/board-designer/types';

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

describe('schema-max config byte budget (Sprint 61)', () => {
  it('accepts the largest schema-valid config with ≥25% headroom under MAX_CONFIG_BYTES', () => {
    const config = buildSchemaMaxConfig();
    const parsed = parseConfig(config);
    expect(parsed.ok).toBe(true);

    const raw = JSON.stringify(config);
    const bytes = new TextEncoder().encode(raw).byteLength;

    // Measurement for the sprint log / cap derivation comment.
    expect(bytes, `schema-max bytes=${bytes} cap=${MAX_CONFIG_BYTES}`).toBeLessThanOrEqual(
      MAX_CONFIG_BYTES * 0.75,
    );
    expect(MAX_CONFIG_BYTES).toBe(32 * 1024);
  });

  it('parseConfig still rejects over-schema shapes (byte cap is a second line)', () => {
    const base = buildSchemaMaxConfig();

    const tooManyStrips = {
      ...base,
      panels: base.panels.map((p, i) =>
        i === 0
          ? {
              ...p,
              strips: [
                ...p.strips,
                {
                  id: randomUUID(),
                  speciesId: 'walnut',
                  widthIn: 1,
                  repeat: 1,
                },
              ],
            }
          : p,
      ),
    };
    // 81 strips total
    expect(parseConfig(tooManyStrips).ok).toBe(false);

    const fivePanels = {
      ...base,
      panels: [
        ...base.panels,
        {
          id: randomUUID(),
          label: 'Extra',
          thicknessIn: 1.5,
          strips: base.panels[0]!.strips.slice(0, 1),
        },
      ],
    };
    expect(parseConfig(fivePanels).ok).toBe(false);

    const tooManySteps = {
      ...base,
      rowPattern: [
        ...base.rowPattern,
        { panelId: base.panels[0]!.id, transform: 'none' as const },
      ],
    };
    expect(parseConfig(tooManySteps).ok).toBe(false);
  });
});
