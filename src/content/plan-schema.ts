import { z } from 'zod';

/**
 * The contract every seed file in content/plans/*.json must satisfy.
 *
 * Why this is strict: BUSINESS_PLAN.md §12 names "thin/low-quality catalog" and
 * inconsistent metadata as the top risks to trust, and §6 requires editorial QC
 * so "search and filters remain trustworthy." A plan with a missing tool list or
 * a cost tier that contradicts its dollar range silently poisons every filter we
 * build in Sprints 4–5. Catching that here — at ingestion, in CI — is the whole
 * point of the content pipeline.
 *
 * `.strict()` everywhere is deliberate: a typo'd key ("dificulty") should fail
 * loudly, not be silently dropped.
 */

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase kebab-case slug');

/** Money is integer cents everywhere. Never floats. */
const cents = z.number().int().nonnegative();

export const COST_TIERS = ['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4', 'TIER_5'] as const;
export type CostTierName = (typeof COST_TIERS)[number];

/**
 * The $ – $$$$$ scale, anchored to real dollar ranges so the tier a plan claims
 * can be checked against the cost it actually has. Without this, "cost tier" is
 * just a vibe and the cheap/expensive filter lies to people.
 *
 * Bounds are on the plan's MAXIMUM estimated material cost, in cents.
 */
export const COST_TIER_BOUNDS: Record<CostTierName, { maxUpToCents: number }> = {
  TIER_1: { maxUpToCents: 5_000 }, // $      up to $50
  TIER_2: { maxUpToCents: 15_000 }, // $$     $50–$150
  TIER_3: { maxUpToCents: 35_000 }, // $$$    $150–$350
  TIER_4: { maxUpToCents: 75_000 }, // $$$$   $350–$750
  TIER_5: { maxUpToCents: Number.MAX_SAFE_INTEGER }, // $$$$$  $750+
};

const toolRef = z
  .object({
    slug,
    essential: z.boolean().default(true),
    note: z.string().min(1).optional(),
  })
  .strict();

const material = z
  .object({
    name: z.string().min(1),
    unit: z.string().min(1),
    quantity: z.number().positive(),
    species: z.string().min(1).optional(),
    costCents: cents.optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

const cutListItem = z
  .object({
    part: z.string().min(1),
    quantity: z.number().int().positive(),
    thicknessIn: z.number().positive(),
    widthIn: z.number().positive(),
    lengthIn: z.number().positive(),
    material: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

const step = z
  .object({
    title: z.string().min(1),
    body: z.string().min(1),
  })
  .strict();

const image = z
  .object({
    url: z.string().url(),
    // Not optional. An empty alt on a catalog image is an accessibility bug we
    // would only have to fix later (Sprint 9).
    alt: z.string().min(1),
    isPrimary: z.boolean().default(false),
  })
  .strict();

export const planSchema = z
  .object({
    slug,
    title: z.string().min(1),
    summary: z.string().min(1).max(200),
    description: z.string().min(1),

    category: slug,

    difficulty: z.number().int().min(1).max(5),

    timeMinMinutes: z.number().int().positive(),
    timeMaxMinutes: z.number().int().positive(),
    timeLabel: z.string().min(1),

    costTier: z.enum(COST_TIERS),
    costMinCents: cents,
    costMaxCents: cents,

    tags: z.array(z.string().min(1)).min(1),

    tools: z.array(toolRef).min(1),
    materials: z.array(material).min(1),
    cutList: z.array(cutListItem),
    steps: z.array(step).min(1),
    images: z.array(image),

    published: z.boolean().default(true),
  })
  .strict()
  // --- Cross-field integrity. These are the checks that keep filters honest. ---
  .refine((p) => p.timeMaxMinutes >= p.timeMinMinutes, {
    message: 'timeMaxMinutes must be >= timeMinMinutes',
    path: ['timeMaxMinutes'],
  })
  .refine((p) => p.costMaxCents >= p.costMinCents, {
    message: 'costMaxCents must be >= costMinCents',
    path: ['costMaxCents'],
  })
  .refine((p) => p.costMaxCents <= COST_TIER_BOUNDS[p.costTier].maxUpToCents, {
    message:
      'costTier contradicts costMaxCents — the plan claims a cheaper tier than it actually costs. See COST_TIER_BOUNDS.',
    path: ['costTier'],
  })
  .refine((p) => p.tools.some((t) => t.essential), {
    message: 'a plan must require at least one essential tool',
    path: ['tools'],
  })
  .refine((p) => p.images.filter((i) => i.isPrimary).length <= 1, {
    message: 'at most one image may be marked isPrimary',
    path: ['images'],
  });

export type PlanInput = z.infer<typeof planSchema>;

export const categorySchema = z
  .object({
    slug,
    name: z.string().min(1),
    description: z.string().min(1).optional(),
    sortOrder: z.number().int().default(0),
  })
  .strict();

export type CategoryInput = z.infer<typeof categorySchema>;

export const toolSchema = z
  .object({
    slug,
    name: z.string().min(1),
    category: z.string().min(1).optional(),
  })
  .strict();

export type ToolInput = z.infer<typeof toolSchema>;

/** Human-readable `$`–`$$$$$` for display. */
export function costTierSymbol(tier: CostTierName): string {
  return '$'.repeat(COST_TIERS.indexOf(tier) + 1);
}
