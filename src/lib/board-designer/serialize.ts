import { z } from 'zod';
import type {
  BoardDesignConfig,
  Grain,
  Panel,
  RowStep,
  RowTransform,
  Strip,
} from './types';

const miterSchema = z.object({
  speciesId: z.string().min(1),
  angleDeg: z.number().min(5).max(85),
  corner: z.enum(['tl', 'tr', 'bl', 'br']),
});

const stripLabelSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}, z.string().max(40).optional());

const stripSchema = z
  .object({
    id: z.string().min(1),
    label: stripLabelSchema,
    speciesId: z.string().min(1),
    widthIn: z.number().min(0.0625).max(24),
    repeat: z.number().int().min(1).max(20),
    miter: miterSchema.optional(),
  })
  .transform((strip) => {
    if (strip.label) return strip;
    const { label: _label, ...rest } = strip;
    return rest;
  });

const panelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(24),
  thicknessIn: z.number().min(0.125).max(4),
  strips: z.array(stripSchema).min(1).max(40),
});

const rowTransformSchema = z.enum(['none', 'rot180', 'mirrorX', 'mirrorY']);

const rowStepSchema = z.object({
  panelId: z.string().min(1),
  transform: rowTransformSchema,
});

const v2Schema = z
  .object({
    schemaVersion: z.literal(2),
    name: z.string().min(1).max(80),
    grain: z.enum(['edge', 'end']),
    sourceLengthIn: z.number().min(1).max(96),
    sliceThicknessIn: z.number().min(0.25).max(4),
    kerfIn: z.number().min(0).max(0.5),
    wasteFactor: z.number().min(0).max(1),
    panels: z.array(panelSchema).min(1).max(4),
    rowPattern: z.array(rowStepSchema).min(1).max(24),
    rowCount: z.number().int().min(1).max(60),
  })
  .superRefine((config, ctx) => {
    const totalStrips = config.panels.reduce((sum, p) => sum + p.strips.length, 0);
    if (totalStrips > 80) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total strips across all panels must be ≤ 80',
        path: ['panels'],
      });
    }

    const ids = config.panels.map((p) => p.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Panel ids must be unique',
        path: ['panels'],
      });
    }

    const idSet = new Set(ids);
    for (let i = 0; i < config.rowPattern.length; i += 1) {
      const step = config.rowPattern[i]!;
      if (!idSet.has(step.panelId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Row pattern references unknown panel id: ${step.panelId}`,
          path: ['rowPattern', i, 'panelId'],
        });
      }
    }
  });

const v1Schema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(80),
  grain: z.enum(['edge', 'end']),
  sourceLengthIn: z.number().min(1).max(96),
  stockThicknessIn: z.number().min(0.25).max(4),
  sliceThicknessIn: z.number().min(0.25).max(4),
  kerfIn: z.number().min(0).max(0.5),
  wasteFactor: z.number().min(0).max(1),
  flipEveryOtherSlice: z.boolean(),
  strips: z.array(stripSchema).min(1).max(60),
});

export type ParseConfigResult =
  | { ok: true; config: BoardDesignConfig }
  | { ok: false; error: string };

/**
 * Validate unknown JSON into a BoardDesignConfig (always v2).
 * Accepts v1 or v2 on read; never throws.
 */
export function parseConfig(raw: unknown): ParseConfigResult {
  if (raw && typeof raw === 'object' && (raw as { schemaVersion?: unknown }).schemaVersion === 1) {
    const v1 = v1Schema.safeParse(raw);
    if (!v1.success) {
      const first = v1.error.issues[0];
      return { ok: false, error: first?.message ?? 'Invalid board design config' };
    }
    return { ok: true, config: migrateV1ToV2(v1.data) };
  }

  const v2 = v2Schema.safeParse(raw);
  if (!v2.success) {
    const first = v2.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? 'Invalid board design config',
    };
  }
  return { ok: true, config: v2.data };
}

type V1Config = z.infer<typeof v1Schema>;

export function migrateV1ToV2(v1: V1Config): BoardDesignConfig {
  const panel: Panel = {
    id: 'panel-1',
    label: 'Panel 1',
    thicknessIn: v1.stockThicknessIn,
    strips: v1.strips.map((s) => ({ ...s })),
  };

  const rowPattern: RowStep[] = v1.flipEveryOtherSlice
    ? [
        { panelId: 'panel-1', transform: 'none' },
        { panelId: 'panel-1', transform: 'rot180' },
      ]
    : [{ panelId: 'panel-1', transform: 'none' }];

  const rowCount =
    v1.grain === 'end'
      ? Math.max(
          1,
          Math.floor(
            (v1.sourceLengthIn + v1.kerfIn) / (v1.sliceThicknessIn + v1.kerfIn),
          ),
        )
      : 1;

  return {
    schemaVersion: 2,
    name: v1.name,
    grain: v1.grain as Grain,
    sourceLengthIn: v1.sourceLengthIn,
    sliceThicknessIn: v1.sliceThicknessIn,
    kerfIn: v1.kerfIn,
    wasteFactor: v1.wasteFactor,
    panels: [panel],
    rowPattern,
    rowCount,
  };
}

export type { Strip, RowTransform };
