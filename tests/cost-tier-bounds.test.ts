import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { COST_TIER_BOUNDS, COST_TIERS } from '@/content/plan-schema';
import { costTierForCents } from '@/lib/format';

/**
 * The cost scale is stated in TWO places and they are allowed to drift silently:
 *
 *   - `src/content/plan-schema.ts` COST_TIER_BOUNDS — the validator's gate. A plan file
 *     whose costMaxCents exceeds its tier's bound fails `validate-plans.mjs`.
 *   - `src/lib/format.ts` TIER_MAX_CENTS — the display fallback, used where there is no
 *     authored tier (the shopping list, which spans plans).
 *
 * `format.ts` cannot import the schema — that would pull zod into the client bundle — so
 * the copy is deliberate and the guard has to live here.
 *
 * They HAD drifted (schema $350/$750 vs format $300/$720), which meant a $320 shopping
 * list showed `$$$$` while a $320 plan showed `$$$`. Reconciled 2026-07-22 in favour of
 * the schema (PLAN_AUDIT_BRIEF.md §3). This test is what stops it happening again.
 */
describe('cost tier bounds — format.ts mirrors the schema', () => {
  it('agrees with the schema at every boundary, in both directions', () => {
    for (const tier of COST_TIERS) {
      const bound = COST_TIER_BOUNDS[tier].maxUpToCents;
      if (tier === 'TIER_5') continue; // unbounded by design

      // Exactly on the bound is still this tier...
      expect(costTierForCents(bound), `${tier} at its bound`).toBe(tier);
      // ...and one cent over must NOT be.
      expect(costTierForCents(bound + 1), `${tier} one cent over`).not.toBe(tier);
    }
  });

  it('still refuses to leak a dollar figure', () => {
    // The whole point of a tier is that it is not a price. If this module ever grows a
    // formatter that renders cents, the no-dollar-figures rule has been broken.
    const format = readFileSync(join(process.cwd(), 'src', 'lib', 'format.ts'), 'utf8');
    expect(format).not.toMatch(/export function formatCents/);
    expect(format).not.toMatch(/export function formatCostRange/);
  });
});
