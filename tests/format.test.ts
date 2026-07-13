import { describe, it, expect } from 'vitest';
import {
  costTierSymbol,
  formatCents,
  formatCostRange,
  formatMinutes,
  formatTimeRange,
  difficultyLabel,
  formatInches,
  formatDimensions,
} from '@/lib/format';

/**
 * Formatters look cosmetic. They are not.
 *
 * A cut list printed in decimal inches is unusable in a workshop — nobody has a
 * tape measure marked 0.8125. And a maker pricing a build off a mis-rendered cost
 * range has been actively misled, which is exactly the trust failure
 * BUSINESS_PLAN.md §12 warns about.
 */

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

describe('formatCents — integer cents to dollars', () => {
  it('drops meaningless decimals on whole dollars', () => {
    expect(formatCents(4800)).toBe('$48');
    expect(formatCents(130000)).toBe('$1,300');
  });

  it('keeps cents when there actually are any', () => {
    expect(formatCents(4850)).toBe('$48.50');
  });

  it('handles zero', () => {
    expect(formatCents(0)).toBe('$0');
  });
});

describe('formatCostRange', () => {
  it('renders a range', () => {
    expect(formatCostRange(5500, 8500)).toBe('$55 – $85');
  });

  it('collapses to a single figure when min equals max', () => {
    expect(formatCostRange(5000, 5000)).toBe('$50');
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
