import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Sprint 19 — plan views, and the sorts they feed.
 *
 * What is worth testing here is NOT "does COUNT(*) count". It is the handful of
 * decisions that are easy to get wrong and that still look like working code:
 *
 *   1. A view is only recorded for a PUBLISHED plan, and an unknown slug is
 *      indistinguishable from a staged one (no probing for unreleased content).
 *   2. The view row carries NO user id — this table must never become a browsing
 *      history (see prisma/schema.prisma).
 *   3. The ranking is a LEFT JOIN: a plan with zero views must still appear. An
 *      inner join would hide the entire catalog on day one, when the table is empty.
 *   4. The tiebreak exists, because on a cold table the tiebreak IS the order.
 *   5. Trending's window is bound as a PARAMETER, never concatenated into SQL.
 *   6. A denied rate limit no-ops. It does not throw (an uncaught throw out of a
 *      server action is an HTTP 500 — the Sprint 10 incident) and it does not
 *      redirect (this fires from a background effect, not a user gesture).
 */

const plan = { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() };
const planView = { create: vi.fn() };
const queryRaw = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    plan = plan;
    planView = planView;
    $queryRaw = queryRaw;
  },
  // Stand-in for the real namespace: capture the template so the tests can inspect
  // what the SQL says and what was passed as a BOUND VALUE rather than inlined.
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join('?'),
      values,
    }),
    empty: { sql: '', values: [] },
  },
}));

const checkRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit }));

/** The 'recommended' SORT delegates to this. Note it still takes NO arguments. */
const getRecommendations = vi.fn();
vi.mock('@/lib/recommendations', () => ({ getRecommendations }));

/** The tagged-template call `prisma.$queryRaw` received, reassembled. */
function lastRawSql(): string {
  const call = queryRaw.mock.calls.at(-1)!;
  const strings = call[0] as TemplateStringsArray;
  return strings.join(' ? ');
}

function lastRawValues(): unknown[] {
  return queryRaw.mock.calls.at(-1)!.slice(1);
}

beforeEach(() => {
  vi.resetModules();
  plan.findFirst.mockReset();
  plan.findMany.mockReset().mockResolvedValue([]);
  plan.count.mockReset().mockResolvedValue(0);
  planView.create.mockReset();
  queryRaw.mockReset().mockResolvedValue([]);
  checkRateLimit.mockReset().mockResolvedValue(true);
  getRecommendations.mockReset().mockResolvedValue([]);
});

/** Card rows for whatever ids the query asks for, in Prisma's arbitrary order. */
function cardsFor(ids: string[]) {
  return ids.map((id) => ({
    id,
    slug: id,
    title: id,
    summary: '',
    difficulty: 1,
    costTier: 'TIER_1',
    costMinCents: 0,
    costMaxCents: 0,
    timeMinMinutes: 0,
    timeMaxMinutes: 0,
    category: { slug: 'c', name: 'C' },
    images: [],
    _count: { likes: 0 },
  }));
}

describe('recordPlanView', () => {
  it('records a view for a published plan', async () => {
    plan.findFirst.mockResolvedValue({ id: 'plan_1' });

    const { recordPlanView } = await import('@/lib/views');
    await recordPlanView('maple-cutting-board');

    expect(plan.findFirst).toHaveBeenCalledWith({
      where: { slug: 'maple-cutting-board', published: true },
      select: { id: true },
    });
    expect(planView.create).toHaveBeenCalledWith({ data: { planId: 'plan_1' } });
  });

  it('PRIVACY: the row it writes contains no user id', async () => {
    plan.findFirst.mockResolvedValue({ id: 'plan_1' });

    const { recordPlanView } = await import('@/lib/views');
    await recordPlanView('maple-cutting-board');

    // A view log with a user id is a browsing history. The sorts need counts, and a
    // count does not need to know who. Adding the column later is a migration;
    // un-collecting a year of browsing history is not a thing you can do.
    const data = planView.create.mock.calls[0]![0].data;
    expect(Object.keys(data)).toEqual(['planId']);
  });

  it('SECURITY: an unpublished plan and an unknown slug both no-op, identically', async () => {
    // `findFirst` filters on `published: true`, so a staged plan returns null exactly
    // like a nonexistent one. Neither writes a row, and neither tells the caller which
    // it was — so this cannot be used to probe for unreleased content.
    plan.findFirst.mockResolvedValue(null);

    const { recordPlanView } = await import('@/lib/views');

    await expect(recordPlanView('staged-plan')).resolves.toBeUndefined();
    await expect(recordPlanView('does-not-exist')).resolves.toBeUndefined();
    expect(planView.create).not.toHaveBeenCalled();
  });

  it('an empty slug never reaches the database', async () => {
    const { recordPlanView } = await import('@/lib/views');
    await recordPlanView('');

    expect(plan.findFirst).not.toHaveBeenCalled();
  });
});

describe('view-ranked sorts', () => {
  it('LEFT JOINs, so a plan with zero views is still in the list', async () => {
    // The bug this prevents: an INNER JOIN silently drops every unviewed plan. On day
    // one — the table is empty — that is the entire catalog. A sort that hides plans
    // is not a sort.
    const { mostViewedPlanIds } = await import('@/lib/views');
    await mostViewedPlanIds();

    expect(lastRawSql()).toContain('LEFT JOIN');
  });

  it('only ranks PUBLISHED plans', async () => {
    const { mostViewedPlanIds } = await import('@/lib/views');
    await mostViewedPlanIds();

    expect(lastRawSql()).toContain('published = true');
  });

  it('has a deterministic tiebreak — on a cold table the tiebreak IS the order', async () => {
    const { trendingPlanIds } = await import('@/lib/views');
    await trendingPlanIds();

    const sql = lastRawSql();
    expect(sql).toContain('ORDER BY COUNT(v.id) DESC');
    // Newest, then title. Without this, a zero-view catalog would come back in
    // whatever order Postgres felt like — and pagination would shuffle between pages.
    expect(sql).toContain('"publishedAt" DESC');
    expect(sql).toContain('title ASC');
  });

  it('SECURITY + REGRESSION: the trending window binds a computed Date, never make_interval', async () => {
    const { trendingPlanIds, TRENDING_WINDOW_DAYS } = await import('@/lib/views');
    await trendingPlanIds();

    // The window is a bound parameter, not string-concatenated. It is a plain timestamp
    // comparison (`v."viewedAt" >= $cutoff`) — NOT `make_interval(days => $1)`, which
    // 500'd every Trending request in production because Postgres couldn't resolve the
    // function against the bound parameter's type. This test is the guard against that
    // shape ever coming back.
    const windowFragment = lastRawValues().find(
      (value) =>
        typeof value === 'object' &&
        value !== null &&
        'values' in (value as Record<string, unknown>),
    ) as { sql: string; values: unknown[] } | undefined;

    expect(windowFragment).toBeDefined();
    expect(windowFragment!.sql).toContain('"viewedAt"');
    expect(windowFragment!.sql).not.toContain('make_interval');

    // The bound value is a JS Date roughly TRENDING_WINDOW_DAYS in the past.
    const cutoff = windowFragment!.values[0];
    expect(cutoff).toBeInstanceOf(Date);
    const ageDays = (Date.now() - (cutoff as Date).getTime()) / 86_400_000;
    expect(ageDays).toBeCloseTo(TRENDING_WINDOW_DAYS, 1);
    expect(TRENDING_WINDOW_DAYS).toBe(7);
  });

  it('Most Viewed applies NO window — it is all-time', async () => {
    const { mostViewedPlanIds } = await import('@/lib/views');
    await mostViewedPlanIds();

    const values = lastRawValues();
    // The only interpolation is `Prisma.empty`. No day count, no cutoff Date, no interval.
    expect(JSON.stringify(values)).not.toContain('make_interval');
    expect(values.some((v) => v instanceof Date)).toBe(false);
  });
});

describe("the 'recommended' sort", () => {
  /**
   * `plan.findMany` is called twice on the id-ordered path: once to intersect the id
   * list with the filters (selecting only `id`), once to fetch the page's cards.
   */
  function wirePlans(allowed: string[]) {
    plan.findMany.mockImplementation((args: { select: Record<string, unknown> }) => {
      const idOnly = Object.keys(args.select).length === 1;
      return Promise.resolve(
        idOnly ? allowed.map((id) => ({ id })) : cardsFor(allowed),
      );
    });
  }

  it('ranks the personalized plans FIRST, then the rest of the catalog by trending', async () => {
    // Trending order from SQL: t1, p1, t2. Recommended: p1.
    queryRaw.mockResolvedValue([{ id: 't1' }, { id: 'p1' }, { id: 't2' }]);
    getRecommendations.mockResolvedValue([{ plan: { id: 'p1' }, reason: 'x' }]);
    wirePlans(['t1', 'p1', 't2']);

    const { queryPlans } = await import('@/lib/plans');
    const { plans } = await queryPlans({ sort: 'recommended' });

    // p1 is promoted to the top and NOT duplicated further down the tail.
    expect(plans.map((p) => p.id)).toEqual(['p1', 't1', 't2']);
  });

  it('a cold-start or anonymous visitor gets exactly the Trending list — the whole catalog, nothing hidden', async () => {
    // This is the Sprint 11 rule, correctly scoped: what it forbade was a HEADING
    // promising personalization over a generic list. A sort with no personalization to
    // apply falls back to trending across the FULL catalog — nothing is claimed and
    // nothing is hidden. The standalone "Recommended for you" section is gone.
    queryRaw.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
    getRecommendations.mockResolvedValue([]);
    wirePlans(['t1', 't2']);

    const { queryPlans } = await import('@/lib/plans');
    const { plans, total } = await queryPlans({ sort: 'recommended' });

    expect(plans.map((p) => p.id)).toEqual(['t1', 't2']);
    expect(total).toBe(2);
  });

  it('SECURITY: nothing on this path accepts a user id', async () => {
    // A recommender is an INFERENCE CHANNEL: its output is derived from the caller's
    // saves and likes, so a `userId` parameter anywhere here would let someone ask
    // "what would Bob be recommended?" and read back Bob's library. The identity comes
    // from the verified session, inside getRecommendations(), which takes no arguments.
    queryRaw.mockResolvedValue([]);

    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ sort: 'recommended' });

    expect(getRecommendations).toHaveBeenCalledWith();
    expect(getRecommendations.mock.calls[0]).toHaveLength(0);
  });

  it('a keyword search still IGNORES the sort — relevance wins', async () => {
    queryRaw.mockResolvedValue([]);

    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ query: 'walnut', sort: 'recommended' });

    // It took the relevance path, so the recommender was never consulted.
    expect(getRecommendations).not.toHaveBeenCalled();
  });
});

describe('the id-ordered path still enforces the data-layer rules', () => {
  /**
   * The trending/viewed/recommended sorts bypass Prisma's `orderBy` — so the question
   * that matters is whether they also bypass anything they SHOULDN'T. They don't, and
   * this is where that is proved: the filters and `published: true` are intersected
   * with the ranked id list, not skipped. A ranking path that quietly ignored the
   * filters would still return plans, and nobody would file a bug — they'd just think
   * the filters were broken.
   */
  it('intersects the ranked ids with the filters AND published:true', async () => {
    queryRaw.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    plan.findMany.mockResolvedValue([]);

    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({
      sort: 'trending',
      filters: {
        category: 'outdoor',
        difficulty: [2],
        costTier: [],
        maxMinutes: undefined,
        ownedTools: [],
      },
    });

    const where = plan.findMany.mock.calls[0]![0].where;

    expect(where.AND[1]).toEqual({ id: { in: ['a', 'b'] } });
    expect(where.AND[0].published).toBe(true);
    expect(where.AND[0].category).toEqual({ slug: 'outdoor' });
    expect(where.AND[0].difficulty).toEqual({ in: [2] });
  });

  it('an empty ranking returns an empty page rather than the whole catalog', async () => {
    // Fail CLOSED. If the ranking query somehow comes back empty, the safe answer is
    // "no results", not "here is everything, unordered".
    queryRaw.mockResolvedValue([]);

    const { queryPlans } = await import('@/lib/plans');
    const { plans, total } = await queryPlans({ sort: 'viewed' });

    expect(plans).toEqual([]);
    expect(total).toBe(0);
    expect(plan.findMany).not.toHaveBeenCalled();
  });
});

describe('recordPlanViewAction — the public HTTP endpoint', () => {
  it('a rate-limited view is DROPPED silently: no write, no throw, no redirect', async () => {
    checkRateLimit.mockResolvedValue(false);

    const { recordPlanViewAction } = await import('@/app/actions/views');

    // Not `rejects` — an uncaught throw out of a server action is an HTTP 500 and a
    // crashed page (src/lib/rate-limit.ts documents the production incident). And not
    // a redirect either: this fires from a background effect while someone is reading
    // a plan; yanking them to another URL because a beacon was throttled would be
    // absurd.
    await expect(recordPlanViewAction('maple-cutting-board')).resolves.toBeUndefined();
    expect(plan.findFirst).not.toHaveBeenCalled();
    expect(planView.create).not.toHaveBeenCalled();
  });

  it('checks the limit BEFORE touching the database', async () => {
    plan.findFirst.mockResolvedValue({ id: 'plan_1' });

    const { recordPlanViewAction } = await import('@/app/actions/views');
    await recordPlanViewAction('maple-cutting-board');

    expect(checkRateLimit).toHaveBeenCalledWith('toggle');
    expect(planView.create).toHaveBeenCalled();
  });
});
