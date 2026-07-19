import { describe, it, expect } from 'vitest';
import * as format from '@/lib/format';
import {
  costTierSymbol,
  costTierForCents,
  formatMinutes,
  formatTimeRange,
  difficultyLabel,
  formatInches,
  formatDimensions,
  isBoardFeetUnit,
  boardFeetExample,
} from '@/lib/format';

/**
 * Formatters look cosmetic. They are not.
 *
 * A cut list printed in decimal inches is unusable in a workshop — nobody has a
 * tape measure marked 0.8125. And a maker pricing a build off a mis-rendered cost
 * range has been actively misled, which is exactly the trust failure
 * BUSINESS_PLAN.md §12 warns about.
 */

/**
 * QOL-B item 5 — board feet.
 *
 * A board foot is a VOLUME (144 cubic inches), which is why "8 board feet" tells a
 * beginner nothing about what to carry out of the yard. The example has to be in units
 * a tape measure has: feet and fractional inches, never decimals.
 */
describe('board feet — making a volume something you can picture', () => {
  it('recognizes both spellings the catalog actually uses', () => {
    expect(isBoardFeetUnit('board feet')).toBe(true);
    expect(isBoardFeetUnit('board ft')).toBe(true);
    // Tolerant of casing and stray whitespace in authored content.
    expect(isBoardFeetUnit(' Board Feet ')).toBe(true);
  });

  it('does NOT claim units that merely contain the word "board"', () => {
    // 2 plans quantify a material as plain "board" — a count of boards, not a volume.
    // Treating that as board feet would print a nonsense example beside a real number.
    expect(isBoardFeetUnit('board')).toBe(false);
    expect(isBoardFeetUnit('sheet')).toBe(false);
    expect(isBoardFeetUnit('each')).toBe(false);
  });

  it('converts to a length of 3/4" x 6" stock — 1 bd ft = 144 cu in', () => {
    // 1 bd ft × 144 = 144 cu in ÷ (0.75 × 6) = 32 inches ≈ 3 ft.
    expect(boardFeetExample(1)).toBe('about 3 ft of 3/4" × 6" board');
  });

  it('is arithmetically right, in feet, for a realistic quantity', () => {
    // 8 bd ft × 144 = 1152 cu in ÷ 4.5 sq in = 256 in = 21.3 ft.
    expect(boardFeetExample(8)).toBe('about 21 ft of 3/4" × 6" board');
    // 3 bd ft → 96 in → 8 ft, i.e. one standard board. A number a person can act on.
    expect(boardFeetExample(3)).toBe('about 8 ft of 3/4" × 6" board');
  });

  it('renders sub-foot amounts as tape-measure inches, not a rounded 0 ft', () => {
    // 0.25 bd ft → 8 inches.
    expect(boardFeetExample(0.25)).toBe('about 8" of 3/4" × 6" board');
  });

  it('returns nothing for a nonsensical quantity rather than "about NaN ft"', () => {
    expect(boardFeetExample(0)).toBe('');
    expect(boardFeetExample(-4)).toBe('');
    expect(boardFeetExample(Number.NaN)).toBe('');
  });
});

describe('formatInches — decimals to tape-measure fractions', () => {
  it('renders whole inches without a fraction', () => {
    expect(formatInches(2)).toBe('2"');
    expect(formatInches(19)).toBe('19"');
  });

  it('converts the common lumber thicknesses woodworkers actually use', () => {
    expect(formatInches(0.75)).toBe('3/4"'); // nominal 1x stock
    expect(formatInches(0.8125)).toBe('13/16"'); // surfaced 4/4
    expect(formatInches(1.5)).toBe('1 1/2"'); // nominal 2x stock
    expect(formatInches(1.75)).toBe('1 3/4"'); // surfaced 8/4
    expect(formatInches(3.5)).toBe('3 1/2"'); // 4x4 actual
  });

  it('reduces fractions rather than leaving them in sixteenths', () => {
    expect(formatInches(0.5)).toBe('1/2"'); // not 8/16
    expect(formatInches(0.25)).toBe('1/4"'); // not 4/16
    expect(formatInches(5.625)).toBe('5 5/8"'); // not 5 10/16
  });

  it('snaps to the nearest 1/16 — the real resolution of a tape measure', () => {
    expect(formatInches(0.0625)).toBe('1/16"');
    expect(formatInches(2.0624)).toBe('2 1/16"');
  });

  it('rounds up cleanly rather than emitting a nonsense 16/16', () => {
    expect(formatInches(1.9999)).toBe('2"');
  });

  it('formats a full cut-list dimension the way a plan prints it', () => {
    expect(formatDimensions(0.8125, 2, 19)).toBe('13/16" × 2" × 19"');
    expect(formatDimensions(1.5, 7.25, 96)).toBe('1 1/2" × 7 1/4" × 96"');
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO DOLLAR FORMATTERS EXIST. DECISIONS_LOG.md 2026-07-13.
 *
 * The public UI shows COST TIERS ONLY. `formatCents` and `formatCostRange` were
 * DELETED rather than merely left unused, because a formatter that exists will
 * eventually get called. Removing them makes the rule STRUCTURAL: you cannot render a
 * dollar amount, because there is nothing to render it with.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe('costTierSymbol FAILS LOUD rather than rendering nothing', () => {
  it('throws on an unknown tier instead of returning an empty string', () => {
    // REGRESSION. The old implementation returned '' for an unrecognized tier, so a
    // page would render "<dd> of $$$$$</dd>" — a missing cost band, with no error.
    // That actually happened (a fixture was missing `costTier`).
    //
    // The tier is now the ONLY cost signal in the whole UI, since dollar figures are
    // gone. Silently rendering nothing is no longer cosmetic — it hides a data bug.
    expect(() => costTierSymbol('NOT_A_TIER' as never)).toThrow(/unknown cost tier/i);
    expect(() => costTierSymbol(undefined as never)).toThrow(/unknown cost tier/i);
  });

  it('every real tier still renders a non-empty band', () => {
    for (const tier of ['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4', 'TIER_5'] as const) {
      expect(costTierSymbol(tier).length).toBeGreaterThan(0);
    }
  });
});

describe('the dollar formatters are GONE, and that is the enforcement', () => {
  it('formatCents and formatCostRange do not exist', () => {
    // If someone re-adds these, this test goes red and they have to come and read the
    // reasoning above rather than quietly reintroducing a number we cannot stand behind.
    expect('formatCents' in format).toBe(false);
    expect('formatCostRange' in format).toBe(false);
  });
});

describe('costTierForCents — a cost BAND, not a price', () => {
  /**
   * The thresholds are DERIVED from the 24 authored plans, whose tiers were assigned by
   * hand. These cases are taken straight from the real catalog, so if someone nudges the
   * thresholds "by feel" the test tells them they have contradicted the content.
   */
  it('reproduces the hand-assigned tiers of real plans', () => {
    // dovetailed-keepsake-box: authored TIER_1, costMax $45
    expect(costTierForCents(4_500)).toBe('TIER_1');
    // edge-grain-maple-cutting-board: authored TIER_2, costMax $85
    expect(costTierForCents(8_500)).toBe('TIER_2');
    // nightstand-with-drawer: authored TIER_3, costMax $300
    expect(costTierForCents(30_000)).toBe('TIER_3');
    // live-edge-coffee-table: authored TIER_4, costMax $720
    expect(costTierForCents(72_000)).toBe('TIER_4');
    // garden-storage-shed: authored TIER_5, costMax $2,200
    expect(costTierForCents(220_000)).toBe('TIER_5');
  });

  it('a shopping list spanning several plans lands in a high band, not a wrong number', () => {
    // This is the job the deleted "≈ $84" total used to do: stop someone expecting to
    // build an end-grain butcher block for $10. A band does it without pretending to
    // know what a board costs at your lumberyard this week.
    expect(costTierSymbol(costTierForCents(1_000))).toBe('$');
    expect(costTierSymbol(costTierForCents(150_000))).toBe('$$$$$');
  });

  it('never returns undefined for an absurd input', () => {
    expect(costTierForCents(0)).toBe('TIER_1');
    expect(costTierForCents(999_999_999)).toBe('TIER_5');
  });
});

describe('costTierSymbol', () => {
  it('maps to the $ – $$$$$ scale from BUSINESS_PLAN.md §4.8', () => {
    expect(costTierSymbol('TIER_1')).toBe('$');
    expect(costTierSymbol('TIER_2')).toBe('$$');
    expect(costTierSymbol('TIER_5')).toBe('$$$$$');
  });
});

describe('formatMinutes / formatTimeRange', () => {
  it('renders sub-hour times as minutes', () => {
    expect(formatMinutes(45)).toBe('45 min');
  });

  it('renders hours, singular and plural', () => {
    expect(formatMinutes(60)).toBe('1 hr');
    expect(formatMinutes(240)).toBe('4 hrs');
  });

  it('rolls long builds into 8-hour SHOP days, not 24-hour days', () => {
    // 2400 minutes = 40 hours = 5 shop days. Rendering "1.7 days" would be
    // technically true and completely useless to someone planning weekends.
    expect(formatMinutes(2400)).toBe('5 days');
  });

  it('collapses a shared unit rather than repeating it', () => {
    expect(formatTimeRange(240, 360)).toBe('4–6 hrs'); // not "4 hrs – 6 hrs"
  });

  it('collapses fractional-hour ranges too', () => {
    expect(formatTimeRange(90, 150)).toBe('1.5–2.5 hrs');
  });

  it('keeps both units when they genuinely differ', () => {
    // 45 min → "45 min", 2400 min → "5 days". Different units, so show both.
    expect(formatTimeRange(45, 2400)).toBe('45 min – 5 days');
  });

  it('collapses when min equals max', () => {
    expect(formatTimeRange(120, 120)).toBe('2 hrs');
  });
});

describe('difficultyLabel', () => {
  it('maps the 1-5 scale to words', () => {
    expect(difficultyLabel(1)).toBe('Beginner');
    expect(difficultyLabel(3)).toBe('Intermediate');
    expect(difficultyLabel(5)).toBe('Expert');
  });
});
