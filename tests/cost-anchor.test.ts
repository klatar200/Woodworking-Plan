import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { COST_TIER_ANCHOR, costTierSymbol } from '@/lib/format';

/**
 * Sprint 41.3 (audit C3, ⚖️ Keagan 2026-07-21) — the cost tiers get an anchor.
 *
 * `$$$` is a comparison with nothing to compare to. A first-time visitor can tell it is
 * more than `$$` but not whether the top of the scale is a bag of screws or a hardwood
 * order, which is the only thing they wanted to know.
 *
 * THE CONSTRAINT THAT MAKES THIS DELICATE: the standing rule (CLAUDE.md, and the header
 * of src/lib/format.ts) is that no dollar AMOUNT appears anywhere in the public UI —
 * `formatCents`/`formatCostRange` were deleted so that rendering one is impossible.
 * The anchor is comparative language only. These tests are what keep the wording on the
 * right side of that line as it gets reworded.
 */
function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

describe('COST_TIER_ANCHOR states no amount (41.3)', () => {
  /**
   * The `$` characters in the anchor are the TIER GLYPHS (`costTierSymbol` output), not
   * currency. What must never appear is a `$` followed by a digit — that is a price.
   */
  it('contains no dollar figure, only the tier glyphs', () => {
    expect(COST_TIER_ANCHOR).not.toMatch(/\$\s*\d/);
    expect(COST_TIER_ANCHOR).not.toMatch(/\d/); // no bare numbers either ("under 50")
    expect(COST_TIER_ANCHOR).toContain(costTierSymbol('TIER_1')); // "$"
    expect(COST_TIER_ANCHOR).toContain(costTierSymbol('TIER_5')); // "$$$$$"
  });

  /** Both ends named — one end alone still leaves the scale unplaced. */
  it('anchors both ends of the scale', () => {
    const [low, high] = COST_TIER_ANCHOR.split('·');
    expect(low?.trim()).toBeTruthy();
    expect(high?.trim()).toBeTruthy();
  });
});

/**
 * ONE constant, three surfaces. The reason it is a constant and not three strings: the
 * place you FILTER by cost and the place you DECIDE on a plan must not describe the same
 * five symbols differently, and DRAFT copy is going to get reworded at least once.
 */
describe('every cost surface reads the same anchor', () => {
  it.each([
    ['../src/components/filter-panel.tsx', 'filter Cost fieldset'],
    ['../src/components/plan-card.tsx', 'catalog card badge'],
    ['../src/app/plans/[slug]/page.tsx', 'plan glance strip'],
  ])('%s (%s) imports it rather than restating it', (file) => {
    const src = read(file);
    expect(src).toContain('COST_TIER_ANCHOR');
    // No hand-copied variant of the wording.
    expect(src).not.toContain('scrap-wood');
  });

  /**
   * The filter panel's copy is VISIBLE TEXT, not a `title`. A tooltip is unreachable by
   * touch and by keyboard, so if the anchor only ever lived in `title` attributes it
   * would be invisible to most of the people who need it — and the filter panel is where
   * someone is actually choosing between tiers.
   */
  it('the filter panel renders the anchor as text, not a tooltip', () => {
    const src = read('../src/components/filter-panel.tsx');
    expect(src).toMatch(/\{COST_TIER_ANCHOR\}/);
  });
});
