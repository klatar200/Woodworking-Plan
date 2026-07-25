import { z } from 'zod';
import type { BoardDesignConfig } from './types';

const stripSchema = z.object({
  id: z.string().min(1),
  speciesId: z.string().min(1),
  widthIn: z.number().min(0.0625).max(24),
  repeat: z.number().int().min(1).max(20),
});

const configSchema = z.object({
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
 * Validate unknown JSON into a BoardDesignConfig.
 * Uses zod safeParse — never throws.
 */
export function parseConfig(raw: unknown): ParseConfigResult {
  const result = configSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? 'Invalid board design config',
    };
  }
  return { ok: true, config: result.data };
}
