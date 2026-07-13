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

/** `$` through `$$$$$` — BUSINESS_PLAN.md §4.8. */
export function costTierSymbol(tier: CostTier): string {
  return '$'.repeat(COST_TIER_ORDER.indexOf(tier) + 1);
}

/**
 * Integer cents → a dollar string.
 *
 * Cents are integers precisely so no rounding happens before this point. Whole
 * dollars render without decimals ("$48", not "$48.00") — nobody buying lumber
 * cares about the cents, and the noise makes a cost range harder to scan.
 */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars)
    ? `$${dollars.toLocaleString('en-US')}`
    : `$${dollars.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
}

/** An itemized estimated cost range, e.g. "$55 – $85". */
export function formatCostRange(minCents: number, maxCents: number): string {
  if (minCents === maxCents) return formatCents(minCents);
  return `${formatCents(minCents)} – ${formatCents(maxCents)}`;
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
