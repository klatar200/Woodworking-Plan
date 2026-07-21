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

/**
 * `$` through `$$$$$` — BUSINESS_PLAN.md §4.8.
 *
 * FAILS LOUD ON AN UNKNOWN TIER, and that is a deliberate change.
 *
 * The old version was `'$'.repeat(indexOf(tier) + 1)`. For an unrecognized tier
 * `indexOf` returns -1, `repeat(0)` returns `''`, and the page renders **an empty
 * string where the cost should be** — no error, no warning, just a missing price band
 * that nobody notices in review.
 *
 * That is not hypothetical: it happened. A test fixture was missing its `costTier` and
 * the print view rendered `<dd> of $$$$$</dd>`. The assertion caught it, but only
 * because it checked for an exact string; a laxer test would have passed against a page
 * that silently shows no cost at all.
 *
 * Now the cost tier is the ONLY cost signal in the entire UI (dollar figures are gone —
 * see below), so silently rendering nothing is no longer a cosmetic bug. Throw instead:
 * a missing tier is a data bug, and it should be impossible to ship one quietly.
 */
/**
 * Slugify free text into a value safe as an HTML `id` / URL fragment. Sprint 35 (audit A4):
 * the shopping-list "have it" checkbox ids were built from raw material names — `Wood glue`,
 * `Stainless steel screws, #8 x 1-1/4"` — which contain spaces and quotes (invalid in an id and
 * so silently breaking every `htmlFor`→`id` link), and collided when the same name appeared in
 * two unit groups. Lowercase, every run of non-alphanumerics → a single `-`, trimmed. Empty
 * (or all-symbol) input returns `''`, so callers namespace with a prefix that guarantees a
 * leading letter.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function costTierSymbol(tier: CostTier): string {
  const index = COST_TIER_ORDER.indexOf(tier);

  if (index < 0) {
    throw new Error(
      `Unknown cost tier: ${String(tier)}. The tier is now the only cost signal in the UI — rendering nothing would hide the bug.`,
    );
  }

  return '$'.repeat(index + 1);
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

/**
 * ── BOARD FEET (QOL-B item 5) ────────────────────────────────────────────────
 *
 * "8 board feet" is the single most opaque quantity on a materials list. It is a
 * VOLUME (1 bd ft = 144 cubic inches = a piece 1″ × 12″ × 12″), not a length, so a
 * beginner reading "8" has no idea whether that is an armful or a truckload — and a
 * lumberyard sells it by the board, not by the board foot. Getting this wrong means
 * driving home with a third of the wood.
 *
 * The catalog spells the unit two ways ("board feet", "board ft"), so match on a
 * normalized set rather than an equality check. NOTE for whoever tidies the content:
 * the shopping list's merge is EXACT on (name, unit, species) by design, so those two
 * spellings do NOT merge — that is a data inconsistency to fix in the plans, never by
 * teaching the matcher to guess (see CLAUDE.md's shopping-list rules).
 */
const BOARD_FEET_UNITS = new Set([
  'board feet',
  'board ft',
  'board foot',
  'bd ft',
  'bf',
]);

/** Is this material quantified in board feet? Case/whitespace tolerant. */
export function isBoardFeetUnit(unit: string): boolean {
  return BOARD_FEET_UNITS.has(unit.trim().toLowerCase());
}

/**
 * Board feet → something you can picture on a rack, e.g. "about 21 ft of 3/4" × 6"
 * board".
 *
 * The example board is 3/4″ × 6″ because that is the commonest hardwood dimension a
 * hobbyist actually buys, and because a worked example beats a definition: the
 * arithmetic (`bd ft × 144 ÷ (T × W)` inches of length) is right there in the numbers.
 * It is explicitly AN EXAMPLE, not a substitute for the quantity — the caller renders
 * it as a note beside the real figure, never in place of it.
 *
 * Feet, not decimal inches, for anything over a foot: `formatInches` exists because a
 * decimal is unusable at a tape measure, and "252 1/2 inches" is no better. Returns an
 * empty string for a nonsensical quantity so a bad row renders nothing rather than
 * "about NaN ft".
 */
export function boardFeetExample(boardFeet: number): string {
  if (!Number.isFinite(boardFeet) || boardFeet <= 0) return '';

  const thicknessIn = 0.75;
  const widthIn = 6;
  const stock = `${formatInches(thicknessIn)} × ${formatInches(widthIn)} board`;
  const lengthIn = (boardFeet * 144) / (thicknessIn * widthIn);

  if (lengthIn < 12) return `about ${formatInches(lengthIn)} of ${stock}`;

  return `about ${Math.round(lengthIn / 12)} ft of ${stock}`;
}

/** A cut-list line's dimensions, e.g. `13/16" × 2" × 19"`. */
export function formatDimensions(
  thicknessIn: number,
  widthIn: number,
  lengthIn: number,
): string {
  return `${formatInches(thicknessIn)} × ${formatInches(widthIn)} × ${formatInches(lengthIn)}`;
}
