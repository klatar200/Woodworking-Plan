import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MAX_CONFIG_BYTES } from '@/lib/board-designer/config-limits';
import { parseConfig } from '@/lib/board-designer/serialize';
import { buildSchemaMaxConfig } from './fixtures/board-design';

describe('schema-max config byte budget (Sprint 61)', () => {
  it('accepts the largest schema-valid config with ≥25% headroom under MAX_CONFIG_BYTES', () => {
    const config = buildSchemaMaxConfig();
    const parsed = parseConfig(config);
    expect(parsed.ok).toBe(true);

    const raw = JSON.stringify(config);
    const bytes = new TextEncoder().encode(raw).byteLength;

    expect(
      bytes,
      `schema-max bytes=${bytes} cap=${MAX_CONFIG_BYTES}`,
    ).toBeLessThanOrEqual(MAX_CONFIG_BYTES * 0.75);
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
