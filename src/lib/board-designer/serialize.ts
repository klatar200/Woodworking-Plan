import { z } from 'zod';
import { DEFAULT_PLANE_BUFFER_IN } from './lumber-allowance';
import type {
  BoardDesignConfig,
  Grain,
  Panel,
  RowStep,
  RowTransform,
  Strip,
} from './types';

/** Pre-D1 combined default (kerf+planing+defects). Sprint 74 zeroes this on v2→v3. */
export const STALE_DEFAULT_WASTE_FACTOR = 0.15;

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

/** Shared body for v2 and v3 (only schemaVersion differs). */
const configBodySchema = {
  name: z.string().min(1).max(80),
  grain: z.enum(['edge', 'end']),
  sourceLengthIn: z.number().min(1).max(96),
  sliceThicknessIn: z.number().min(0.25).max(4),
  kerfIn: z.number().min(0).max(0.5),
  wasteFactor: z.number().min(0).max(1),
  /** Optional inches; omitted → DEFAULT_PLANE_BUFFER_IN on parse. */
  planeBuffer: z.number().min(0).max(1).optional(),
  panels: z.array(panelSchema).min(1).max(4),
  rowPattern: z.array(rowStepSchema).min(1).max(24),
  rowCount: z.number().int().min(1).max(60),
} as const;

function refineConfigBody(
  config: {
    panels: Array<{ id: string; strips: unknown[] }>;
    rowPattern: Array<{ panelId: string }>;
  },
  ctx: z.RefinementCtx,
): void {
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
}

const v2Schema = z
  .object({
    schemaVersion: z.literal(2),
    ...configBodySchema,
  })
  .superRefine(refineConfigBody);

const v3Schema = z
  .object({
    schemaVersion: z.literal(3),
    ...configBodySchema,
  })
  .superRefine(refineConfigBody);

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

type V1Config = z.infer<typeof v1Schema>;
type V2Config = z.infer<typeof v2Schema>;

/**
 * Validate unknown JSON into a BoardDesignConfig (always v3).
 * Accepts v1, v2, or v3 on read; never throws.
 */
export function parseConfig(raw: unknown): ParseConfigResult {
  const version =
    raw && typeof raw === 'object'
      ? (raw as { schemaVersion?: unknown }).schemaVersion
      : undefined;

  if (version === 1) {
    const v1 = v1Schema.safeParse(raw);
    if (!v1.success) {
      const first = v1.error.issues[0];
      return { ok: false, error: first?.message ?? 'Invalid board design config' };
    }
    return { ok: true, config: migrateV1ToV2(v1.data) };
  }

  if (version === 2) {
    const v2 = v2Schema.safeParse(raw);
    if (!v2.success) {
      const first = v2.error.issues[0];
      return {
        ok: false,
        error: first?.message ?? 'Invalid board design config',
      };
    }
    return { ok: true, config: migrateV2ToV3(v2.data) };
  }

  const v3 = v3Schema.safeParse(raw);
  if (!v3.success) {
    const first = v3.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? 'Invalid board design config',
    };
  }
  return { ok: true, config: withPlaneBufferDefault(v3.data) };
}

function withPlaneBufferDefault(
  config: BoardDesignConfig,
): BoardDesignConfig {
  return {
    ...config,
    planeBuffer: config.planeBuffer ?? DEFAULT_PLANE_BUFFER_IN,
  };
}

/**
 * v2→v3: field meaning of wasteFactor changed (D1 / Sprint 73). Zero the old
 * combined default only — non-0.15 values are left alone. Deliberate 0.15 on a
 * v2 row is indistinguishable and is also zeroed (DECISIONS_LOG Sprint 74).
 */
export function migrateV2ToV3(v2: V2Config): BoardDesignConfig {
  const wasteFactor =
    v2.wasteFactor === STALE_DEFAULT_WASTE_FACTOR ? 0 : v2.wasteFactor;
  return withPlaneBufferDefault({
    ...v2,
    schemaVersion: 3,
    wasteFactor,
  });
}

/** v1→v2 structural migrate, then v2→v3 waste retirement. Always returns v3. */
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

  const v2: V2Config = {
    schemaVersion: 2,
    name: v1.name,
    grain: v1.grain as Grain,
    sourceLengthIn: v1.sourceLengthIn,
    sliceThicknessIn: v1.sliceThicknessIn,
    kerfIn: v1.kerfIn,
    wasteFactor: v1.wasteFactor,
    planeBuffer: DEFAULT_PLANE_BUFFER_IN,
    panels: [panel],
    rowPattern,
    rowCount,
  };
  return migrateV2ToV3(v2);
}

export type { Strip, RowTransform };
