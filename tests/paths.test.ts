import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Learning paths — Sprint 16.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * THE PROPERTY THIS SPRINT LIVES OR DIES ON: PROGRESS IS DERIVED, NOT STORED.
 *
 * A step is complete when the user has REVIEWED that plan. There is no PathProgress
 * table, no `completed` column, nothing to backfill, and nothing that can drift out of
 * step with reality. Sprints 4 and 6 both broke production by creating derived state a
 * migration could not populate; this is the third feature in a row to refuse the offer.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const path = { findMany: vi.fn(), findFirst: vi.fn() };
const review = { findMany: vi.fn() };
const getCurrentUser = vi.fn();

vi.mock('@/lib/db', () => ({ prisma: { path, review } }));
vi.mock('@/lib/auth', () => ({ getCurrentUser }));
vi.mock('@/lib/plans', () => ({ PLAN_CARD_SELECT: { id: true } }));

const ALICE = { id: 'user_alice' };

const step = (n: number, planId: string) => ({
  id: `s${n}`,
  stepNumber: n,
  reason: 'Because.',
  plan: { id: planId },
});

beforeEach(() => {
  vi.resetModules();
  path.findMany.mockReset().mockResolvedValue([]);
  path.findFirst.mockReset().mockResolvedValue(null);
  review.findMany.mockReset().mockResolvedValue([]);
  getCurrentUser.mockReset().mockResolvedValue(ALICE);
});

describe('PROGRESS IS DERIVED FROM REVIEWS — there is no progress table', () => {
  it('reads completion from the Review table, not a progress column', async () => {
    review.findMany.mockResolvedValue([{ planId: 'p1' }, { planId: 'p3' }]);

    const { getBuiltPlanIds } = await import('@/lib/paths');
    const built = await getBuiltPlanIds();

    // The ONLY source of truth. `Review` already exists (Sprint 10) and is already
    // correct, so there is nothing here to keep in sync.
    expect(review.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_alice' },
      select: { planId: true },
    });
    expect(built).toEqual(new Set(['p1', 'p3']));
  });

  it('an anonymous visitor has built nothing — and we do not query for it', async () => {
    getCurrentUser.mockResolvedValue(null);

    const { getBuiltPlanIds } = await import('@/lib/paths');

    // The paths pages are PUBLIC (§12 gates participation, not content). An anonymous
    // visitor sees the path with no personalization — not someone else's.
    expect(await getBuiltPlanIds()).toEqual(new Set());
    expect(review.findMany).not.toHaveBeenCalled();
  });

  it('IDOR TRIPWIRE: getBuiltPlanIds takes no arguments', async () => {
    const { getBuiltPlanIds } = await import('@/lib/paths');

    // The owner comes from the verified session. A `userId` parameter here would let a
    // caller ask "what has Bob built?" — which is Bob's review history.
    expect(getBuiltPlanIds.length).toBe(0);
  });
});

describe('summarizeProgress: "next" is the first UNBUILT step', () => {
  it('counts what is built', async () => {
    const { summarizeProgress } = await import('@/lib/paths');

    const progress = summarizeProgress(
      [step(1, 'p1'), step(2, 'p2'), step(3, 'p3')],
      new Set(['p1']),
    );

    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(3);
    expect(progress.nextStepNumber).toBe(2);
  });

  it('does NOT compute next as completed + 1 — people build out of order', async () => {
    const { summarizeProgress } = await import('@/lib/paths');

    // Someone saw the dovetail box, built it FIRST, and came back. They have completed
    // one step. `completed + 1` would point at step 2 — but they have not done step 1.
    const progress = summarizeProgress(
      [step(1, 'p1'), step(2, 'p2'), step(3, 'p3')],
      new Set(['p3']),
    );

    expect(progress.completed).toBe(1);
    // The FIRST unbuilt step, which is 1 — not 2.
    expect(progress.nextStepNumber).toBe(1);
  });

  it('a finished path has no next step', async () => {
    const { summarizeProgress } = await import('@/lib/paths');

    const progress = summarizeProgress(
      [step(1, 'p1'), step(2, 'p2')],
      new Set(['p1', 'p2']),
    );

    expect(progress.completed).toBe(2);
    // Null, not 3. There is no step 3, and pointing at one would be a lie.
    expect(progress.nextStepNumber).toBeNull();
  });

  it('a fresh user has zero progress and starts at step 1', async () => {
    const { summarizeProgress } = await import('@/lib/paths');

    const progress = summarizeProgress([step(1, 'p1'), step(2, 'p2')], new Set());

    expect(progress.completed).toBe(0);
    expect(progress.nextStepNumber).toBe(1);
  });
});

describe('SECURITY: published: true, in the data layer, on every read', () => {
  it('listPaths returns published paths only', async () => {
    const { listPaths } = await import('@/lib/paths');
    await listPaths();

    expect(path.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true } }),
    );
  });

  it('getPathBySlug refuses an unpublished path', async () => {
    const { getPathBySlug } = await import('@/lib/paths');
    await getPathBySlug('staged-path');

    // Null for unknown AND unpublished alike — so a 404 cannot be used to probe for
    // staged content.
    expect(path.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'staged-path', published: true } }),
    );
  });

  it('a published path does NOT surface an unpublished PLAN', async () => {
    const { getPathBySlug } = await import('@/lib/paths');
    await getPathBySlug('your-first-five');

    const select = path.findFirst.mock.calls[0]![0].select;

    // TWO independent gates. A path is published; a plan it points at may since have been
    // pulled. One forgotten filter is how staged content ships while everything still
    // "works" — so the step query filters too.
    expect(select.steps.where).toEqual({ plan: { published: true } });
  });

  it('steps come back in authored order, not insertion order', async () => {
    const { getPathBySlug } = await import('@/lib/paths');
    await getPathBySlug('your-first-five');

    const select = path.findFirst.mock.calls[0]![0].select;

    // A learning path whose order depends on row insertion is not a learning path.
    expect(select.steps.orderBy).toEqual({ stepNumber: 'asc' });
  });

  /**
   * QOL-E. The filtered index must go through the SAME function as the unfiltered one —
   * a second query for "the filtered case" is exactly how `published: true` goes missing
   * on one code path while the page still appears to work (the standing Sprint 3 rule).
   */
  it('a FILTERED listPaths still enforces published: true', async () => {
    const { listPaths } = await import('@/lib/paths');
    await listPaths({ level: 3, category: 'furniture' });

    const where = path.findMany.mock.calls[0]![0].where;

    expect(where.published).toBe(true);
    expect(where.experienceLevel).toBe(3);
    expect(where.category).toEqual({ slug: 'furniture' });
  });

  it('omits a filter entirely rather than matching on undefined', async () => {
    const { listPaths } = await import('@/lib/paths');
    await listPaths({ level: 2 });

    const where = path.findMany.mock.calls[0]![0].where;

    // `{ category: undefined }` is not the same query as no category key at all, and
    // relying on Prisma to treat them alike is relying on an implementation detail.
    expect(where).not.toHaveProperty('category');
    expect(where.experienceLevel).toBe(2);
  });
});

/**
 * QOL-E — the /paths filters. Untrusted query-string input, validated the same way the
 * catalog's are (src/lib/filters.ts): garbage degrades to "no filter" rather than being
 * handed to Postgres, or worse, arriving as `NaN`.
 */
describe('parsePathFilters: never trust the query string', () => {
  const categories = ['furniture', 'cutting-boards'];

  it('accepts a real level and a real category', async () => {
    const { parsePathFilters } = await import('@/lib/paths');

    expect(parsePathFilters({ level: '3', category: 'furniture' }, categories)).toEqual({
      level: 3,
      category: 'furniture',
    });
  });

  it('drops an out-of-range, non-numeric or fractional level', async () => {
    const { parsePathFilters } = await import('@/lib/paths');

    for (const level of ['0', '6', '99', 'abc', '', '-1']) {
      expect(parsePathFilters({ level }, categories).level, `level=${level}`).toBeUndefined();
    }
  });

  it('drops a category that is not a real category — a stale bookmark shows results', async () => {
    const { parsePathFilters } = await import('@/lib/paths');

    expect(parsePathFilters({ category: 'was-deleted' }, categories).category).toBeUndefined();
    // An array (`?category=a&category=b`) is not a single value; it is not a filter.
    expect(
      parsePathFilters({ category: ['furniture', 'x'] }, categories).category,
    ).toBeUndefined();
  });

  it('round-trips through buildPathQueryString', async () => {
    const { parsePathFilters, buildPathQueryString } = await import('@/lib/paths');

    expect(buildPathQueryString({})).toBe('/paths');
    expect(buildPathQueryString({ level: 4 })).toBe('/paths?level=4');
    expect(buildPathQueryString({ level: 4, category: 'furniture' })).toBe(
      '/paths?level=4&category=furniture',
    );

    // The URL is the state: what the page builds, it can parse back.
    const filters = { level: 4, category: 'furniture' };
    const url = new URL(buildPathQueryString(filters), 'https://example.test');
    expect(
      parsePathFilters(Object.fromEntries(url.searchParams), categories),
    ).toEqual(filters);
  });
});
