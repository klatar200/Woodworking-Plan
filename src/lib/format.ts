import type { CostTier } from '@prisma/client';

/**
 * Display formatters for plan metadata.
 *
 * Kept out of the components so they can be tested directly — these convert the
 * database's deliberately-precise storage formats (integer cents, minutes) into
 * the things a human reads. Getting them wrong is the kind of bug that looks
 * cosmetic and isn't: a maker pricing a build off a wrong cost range has been
 * actively misled.
 */

const COST_TIER_ORDER: CostTier[] = ['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4', 'TIER_5'];

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THERE IS NO `formatCents`. THERE IS NO `formatCostRange`. THIS IS DELIBERATE.
 *
 * DECISIONS_LOG.md 2026-07-13: the public UI shows COST TIERS ONLY — $ through $$$$$
 * — and no dollar figures anywhere. Not on cards, not on plan pages, not in the
 * materials table, not on the shopping list, not in print.
 *
 * WHY THE FUNCTIONS ARE DELETED RATHER THAN MERELY UNUSED: a formatter that exists
 * will eventually get called. Removing it makes the rule STRUCTURAL — you cannot
 * render a dollar amount, because there is nothing to render it with. That is worth
 * more than a comment asking people not to.
 *
 * WHY: an itemized dollar total is a CLAIM OF PRECISION WE CANNOT SUPPORT. Lumber
 * varies by region, species and season, and every figure in the catalog is a
 * hand-authored ballpark. A tier communicates the same decision-relevant fact — "this
 * is a cheap project" vs "this is not" — and cannot be wrong in the way a number can.
 *
 * `Material.costCents`, `Plan.costMinCents` and `Plan.costMaxCents` REMAIN in the
 * schema and remain populated. They are the INPUT that derives the tier. This is a
 * presentation decision, not a data decision — deleting the underlying numbers would
 * be a one-way door and would make the tiers unmaintainable.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** `$` through `$$$$$` — BUSINESS_PLAN.md §4.8. */
export function costTierSymbol(tier: CostTier): string {
  return '$'.repeat(COST_TIER_ORDER.indexOf(tier) + 1);
}

/**
 * Upper bound of each tier, in integer cents.
 *
 * NOT INVENTED — derived from the 24 authored plans, whose `costTier` was assigned by
 * hand. Bucketing them by `costMaxCents` separates the tiers with no overlap at all:
 *
 *   TIER_1  max cost $45–$50      TIER_4  max cost $620–$720
 *   TIER_2  max cost $55–$150     TIER_5  max cost $2200
 *   TIER_3  max cost $170–$300
 *
 * So these thresholds reproduce the human judgement already in the catalog rather than
 * imposing a different one on top of it. If the catalog's price distribution shifts,
 * re-derive them from the data — do not nudge them by feel.
 */
const TIER_MAX_CENTS: [CostTier, number][] = [
  ['TIER_1', 5_000], // ≤ $50
  ['TIER_2', 15_000], // ≤ $150
  ['TIER_3', 30_000], // ≤ $300
  ['TIER_4', 72_000], // ≤ $720
];

/**
 * Integer cents → the tier that best describes them.
 *
 * Used where there is no authored tier to fall back on — chiefly the shopping list,
 * which spans several plans and therefore has no tier of its own.
 *
 * This is what preserves the job the shopping-list total used to do: stop someone
 * expecting to build an end-grain butcher block for $10. It does that without printing
 * a number we do not really stand behind.
 */
export function costTierForCents(cents: number): CostTier {
  for (const [tier, maxCents] of TIER_MAX_CENTS) {
    if (cents <= maxCents) return tier;
  }
  return 'TIER_5';
}

/**
 * Minutes → a readable shop-time estimate.
 *
 * Note plans also carry a human `timeLabel` ("2 weekends", "4–6 hrs over 2 days"),
 * which is what we actually show on the detail page — because "2 weekends" is a
 * truer answer than "960 minutes" and cannot be derived from it. This function is
 * for the compact card badge, where a consistent, sortable format matters more
 * than nuance.
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;

  const hours = minutes / 60;
  if (hours < 24) {
    const rounded = Number.isInteger(hours) ? hours : Math.round(hours * 10) / 10;
    return `${rounded} hr${rounded === 1 ? '' : 's'}`;
  }

  const days = Math.round(hours / 8); // an 8-hour shop day, not a 24-hour day
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** A compact time range for a card badge, e.g. "4–6 hrs". */
export function formatTimeRange(minMinutes: number, maxMinutes: number): string {
  if (minMinutes === maxMinutes) return formatMinutes(minMinutes);

  const min = formatMinutes(minMinutes);
  const max = formatMinutes(maxMinutes);

  // "4 hrs–6 hrs" reads badly. If the units match, show them once: "4–6 hrs".
  const minUnit = min.replace(/^[\d.]+\s*/, '');
  const maxUnit = max.replace(/^[\d.]+\s*/, '');
  if (minUnit === maxUnit) {
    const minValue = min.replace(/\s*\D+$/, '');
    return `${minValue}–${max}`;
  }

  return `${min} – ${max}`;
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Easy',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

/** 1–5 → a word. BUSINESS_PLAN.md §4.6 allows either a word or the 1–5 scale. */
export function difficultyLabel(difficulty: number): string {
  return DIFFICULTY_LABELS[difficulty] ?? `Level ${difficulty}`;
}

/**
 * Fractional inches → the way a woodworker actually reads a cut list.
 *
 * 0.8125 is meaningless on a tape measure. 13/16" is not. A cut list printed in
 * decimals is a cut list nobody can use in a workshop, so this is not cosmetic.
 */
export function formatInches(value: number): string {
  const whole = Math.floor(value);
  const fraction = value - whole;

  if (fraction < 0.001) return `${whole}"`;

  // Snap to the nearest 1/16 — the practical resolution of a tape measure.
  const sixteenths = Math.round(fraction * 16);
  if (sixteenths === 16) return `${whole + 1}"`;

  // Reduce the fraction: 8/16 → 1/2, 12/16 → 3/4.
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(sixteenths, 16);
  const numerator = sixteenths / divisor;
  const denominator = 16 / divisor;

  return whole > 0
    ? `${whole} ${numerator}/${denominator}"`
    : `${numerator}/${denominator}"`;
}

/** A cut-list line's dimensions, e.g. `13/16" × 2" × 19"`. */
export function formatDimensions(
  thicknessIn: number,
  widthIn: number,
  lengthIn: number,
): string {
  return `${formatInches(thicknessIn)} × ${formatInches(widthIn)} × ${formatInches(lengthIn)}`;
}
