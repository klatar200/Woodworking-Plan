import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { planCountCopy, COUNT_FLOOR } from '@/lib/landing-copy';

/**
 * Sprint 40.2 (audit C1) — the landing states the real catalog size.
 *
 * The branch worth testing is the one nobody will ever see in a browser: a fresh, failed
 * or partially-seeded database. On Keagan's machine `total` is 948 and the happy path is
 * self-evident; the floor only fires somewhere nobody is looking, which is exactly where a
 * "0 plans" headline would ship.
 */
describe('planCountCopy', () => {
  it('states the real number once the catalog is big enough to be a selling point', () => {
    expect(planCountCopy(948).chip).toBe('948 plans');
    expect(planCountCopy(948).sentence).toBe('948 plans, each fully specified.');
  });

  it('separates thousands — "1,204 plans", not "1204 plans"', () => {
    expect(planCountCopy(1204).chip).toBe('1,204 plans');
  });

  /**
   * NOT "Hundreds of plans". That was the old hardcoded copy, and with 40 plans seeded it
   * is a false claim — the same failure mode as a dollar figure we cannot support. Under
   * the floor the size claim is dropped entirely.
   */
  it('drops the size claim below the floor rather than softening it', () => {
    for (const total of [0, 1, 12, COUNT_FLOOR - 1]) {
      const copy = planCountCopy(total);
      expect(copy.chip, `total=${total}`).toBe('Every plan fully specified');
      expect(copy.chip).not.toMatch(/\d/);
      expect(copy.sentence).not.toMatch(/Hundreds/i);
    }
  });

  it('takes the real number at exactly the floor', () => {
    expect(planCountCopy(COUNT_FLOOR).chip).toBe('100 plans');
  });

  /** `total` comes from a query; a failed one must not render "NaN plans". */
  it('falls back rather than rendering a non-number', () => {
    expect(planCountCopy(Number.NaN).chip).toBe('Every plan fully specified');
    expect(planCountCopy(Number.POSITIVE_INFINITY).chip).toBe('Every plan fully specified');
  });
});

describe('the landing reads the count from data, not from a literal', () => {
  const SOURCE = readFileSync(join(process.cwd(), 'src/app/page.tsx'), 'utf8');

  it('no longer hardcodes the old claim anywhere on the page', () => {
    expect(SOURCE).not.toMatch(/Hundreds of plans/);
  });

  /** `total` was already in this result and discarded — the honest number costs no query. */
  it('takes `total` from the featured-plans query it already runs', () => {
    expect(SOURCE).toContain('const { plans: featured, total } = await queryPlans(');
    expect(SOURCE).toContain('planCountCopy(total)');
    // One query on this page for plans; a second would be a real cost for a number the
    // first call already returned.
    expect(SOURCE.match(/await queryPlans\(/g)).toHaveLength(1);
  });

  /**
   * 🛑 THE COUNT MUST MEAN "THE WHOLE PUBLISHED CATALOG", i.e. the same number `/browse`
   * puts in its results heading — both read `total` off the same `queryPlans()`.
   *
   * This is the failure the count is one careless edit away from. The landing's call is
   * shared with the featured carousel, so anyone improving THAT ("only show Outdoor
   * plans", "hide the ones with no photo") would add a `filters` or `query` argument and
   * silently turn the headline into a subset count — a number that still renders, still
   * looks live, and is quietly wrong. Nothing in the type system objects; `total` just
   * starts meaning something narrower.
   *
   * `sort` and `perPage` are safe by construction: ordering and page size cannot change
   * how many rows MATCH. Anything that narrows the set cannot appear here.
   */
  it('counts the whole published catalog — the same number /browse shows', () => {
    const call = SOURCE.match(/await queryPlans\(([\s\S]*?)\);/)?.[1] ?? '';

    expect(call).not.toMatch(/\bfilters\s*:/);
    expect(call).not.toMatch(/\bquery\s*:/);
    // Whitelist rather than blacklist: a future narrowing option nobody has thought of
    // yet fails here too, instead of slipping past a list of known-bad names.
    const keys = [...call.matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
    expect(keys.sort()).toEqual(['perPage', 'sort']);
  });
});
