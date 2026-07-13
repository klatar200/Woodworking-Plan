import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Sprint 7 — likes.
 *
 * Same threat model as Sprint 6 (saves): user-owned rows, so IDOR is the risk.
 * Same two defences, asserted the same way:
 *
 *   1. No function takes a `userId` — there is nothing to forge.
 *   2. Every write is scoped by `userId` in its WHERE clause, not just row id.
 *
 * Plus one property unique to this sprint: **there is no denormalized like
 * count.** Counts are computed on read. That is what makes a production backfill
 * unnecessary and makes drift impossible — and it is a direct response to the
 * Sprint 4 and Sprint 6 failures, where a migration created a column and nothing
 * populated it.
 */

const ALICE = { id: 'user_alice', clerkId: 'clerk_alice' };

const like = {
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  findUnique: vi.fn(),
  count: vi.fn(),
};
const plan = { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() };
const queryRaw = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    like = like;
    plan = plan;
    savedPlan = { findUnique: vi.fn() };
    user = { upsert: vi.fn() };
    $queryRaw = queryRaw;
  },
}));

const requireUser = vi.fn();
const getCurrentUser = vi.fn();
vi.mock('@/lib/auth', () => ({ requireUser, getCurrentUser }));

beforeEach(() => {
  vi.resetModules();
  for (const m of [like, plan]) for (const fn of Object.values(m)) fn.mockReset();

  requireUser.mockReset().mockResolvedValue(ALICE);
  getCurrentUser.mockReset().mockResolvedValue(ALICE);

  plan.findFirst.mockResolvedValue({ id: 'plan_1' });
  plan.findMany.mockResolvedValue([]);
  plan.count.mockResolvedValue(0);
  like.findUnique.mockResolvedValue(null);
  like.count.mockResolvedValue(0);
});

describe('SECURITY: no function accepts a userId', () => {
  it('the owner is always derived from the session — there is nothing to forge', async () => {
    const likes = await import('@/lib/likes');

    expect(likes.likePlan.length).toBe(1); // (planId)
    expect(likes.unlikePlan.length).toBe(1); // (planId)
    expect(likes.isPlanLiked.length).toBe(1); // (planId)
    expect(likes.countPlanLikes.length).toBe(1); // (planId)
  });

  it('an anonymous caller cannot like — requireUser throws and nothing is written', async () => {
    requireUser.mockRejectedValue(new Error('Unauthorized: no authenticated user'));

    const { likePlan } = await import('@/lib/likes');

    await expect(likePlan('plan_1')).rejects.toThrow(/Unauthorized/);
    expect(like.upsert).not.toHaveBeenCalled();
  });
});

describe('SECURITY: every write is scoped by userId', () => {
  it('likePlan keys the upsert on the SESSION user, not on anything passed in', async () => {
    const { likePlan } = await import('@/lib/likes');
    await likePlan('plan_1');

    expect(like.upsert.mock.calls[0]![0].where).toEqual({
      userId_planId: { userId: ALICE.id, planId: 'plan_1' },
    });
  });

  it("unlikePlan uses deleteMany with userId — Alice cannot remove Bob's like", async () => {
    const { unlikePlan } = await import('@/lib/likes');
    await unlikePlan('plan_1');

    expect(like.deleteMany).toHaveBeenCalledWith({
      where: { planId: 'plan_1', userId: ALICE.id },
    });

    // A bare `delete({ where: { id } })` would be the IDOR. The mock does not even
    // expose `delete`, so reaching for it would throw rather than silently delete
    // a stranger's row.
    expect('delete' in like).toBe(false);
  });

  it('isPlanLiked asks only about the SESSION user', async () => {
    const { isPlanLiked } = await import('@/lib/likes');
    await isPlanLiked('plan_1');

    expect(like.findUnique.mock.calls[0]![0].where).toEqual({
      userId_planId: { userId: ALICE.id, planId: 'plan_1' },
    });
  });
});

describe('SECURITY: content leakage', () => {
  it('refuses to like an UNPUBLISHED plan', async () => {
    // Liking staged content would confirm its existence and contribute a like to
    // a plan nobody is supposed to know about — a leak straight past the
    // `published` filter that guards browse and search.
    plan.findFirst.mockResolvedValue(null);

    const { likePlan } = await import('@/lib/likes');

    await expect(likePlan('staged_plan')).rejects.toThrow('Plan not found');
    expect(like.upsert).not.toHaveBeenCalled();
  });

  it('checks published:true, not merely that the plan exists', async () => {
    const { likePlan } = await import('@/lib/likes');
    await likePlan('plan_1');

    expect(plan.findFirst.mock.calls[0]![0].where).toEqual({
      id: 'plan_1',
      published: true,
    });
  });
});

describe('behaviour', () => {
  it('liking is idempotent — a double tap cannot inflate the count', async () => {
    const { likePlan } = await import('@/lib/likes');
    await likePlan('plan_1');
    await likePlan('plan_1');

    // upsert on the [userId, planId] unique index. The DATABASE enforces one row,
    // not the application layer's good intentions.
    expect(like.upsert).toHaveBeenCalledTimes(2);
    for (const call of like.upsert.mock.calls) {
      expect(call[0].update).toEqual({});
    }
  });

  it('unliking something not liked is a no-op, not an error', async () => {
    like.deleteMany.mockResolvedValue({ count: 0 });

    const { unlikePlan } = await import('@/lib/likes');
    await expect(unlikePlan('never_liked')).resolves.toBeUndefined();
  });

  it('isPlanLiked returns false for an anonymous visitor rather than throwing', async () => {
    // Called from the PUBLIC plan page. Throwing would 500 it for every visitor.
    getCurrentUser.mockResolvedValue(null);

    const { isPlanLiked } = await import('@/lib/likes');

    expect(await isPlanLiked('plan_1')).toBe(false);
    expect(like.findUnique).not.toHaveBeenCalled();
  });

  it('countPlanLikes COUNTS rows — it does not read a denormalized column', async () => {
    // The whole point. A derived column is a thing that ships to production empty
    // and lies (Sprint 4's searchVector; Sprint 6's missing table). This cannot.
    like.count.mockResolvedValue(7);

    const { countPlanLikes } = await import('@/lib/likes');

    expect(await countPlanLikes('plan_1')).toBe(7);
    expect(like.count).toHaveBeenCalledWith({ where: { planId: 'plan_1' } });
  });
});

describe('Popular sort (BUSINESS_PLAN.md §4.7)', () => {
  it('orders by like COUNT descending, with a deterministic tiebreak', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ sort: 'popular' });

    const orderBy = plan.findMany.mock.calls[0]![0].orderBy;

    expect(orderBy[0]).toEqual({ likes: { _count: 'desc' } });

    // Without a tiebreak, a catalog where every plan has zero likes would shuffle
    // on every request — which looks broken and makes pagination inconsistent
    // between pages.
    expect(orderBy.length).toBeGreaterThan(1);
    expect(orderBy).toContainEqual({ title: 'asc' });
  });

  it('the list view COUNTS likes rather than selecting a column', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans();

    expect(plan.findMany.mock.calls[0]![0].select._count).toEqual({
      select: { likes: true },
    });
  });

  it('does NOT default to Popular — a zero-like catalog would entrench an accident', async () => {
    // Every plan has zero likes on a young catalog, so Popular degenerates into an
    // arbitrary tiebreak — and whatever it surfaces first accumulates the likes,
    // entrenching that accident as the ranking. Easiest-first is defensible: a
    // beginner sees things they can actually build.
    const { DEFAULT_SORT } = await import('@/lib/sort');
    expect(DEFAULT_SORT).not.toBe('popular');
    expect(DEFAULT_SORT).toBe('easiest');
  });

  it('every sort option produces a deterministic order', async () => {
    const { SORT_OPTIONS } = await import('@/lib/sort');
    const { queryPlans } = await import('@/lib/plans');

    for (const option of SORT_OPTIONS) {
      plan.findMany.mockClear();
      await queryPlans({ sort: option.value });

      const orderBy = plan.findMany.mock.calls[0]![0].orderBy;
      // A title tiebreak on every sort, so pagination is stable.
      expect(orderBy, option.value).toContainEqual({ title: 'asc' });
    }
  });

  it('SECURITY: an unknown ?sort= falls back to the default rather than 500ing', async () => {
    const { parseSort, DEFAULT_SORT } = await import('@/lib/sort');

    expect(parseSort('popular')).toBe('popular');
    expect(parseSort('nonsense')).toBe(DEFAULT_SORT);
    expect(parseSort('')).toBe(DEFAULT_SORT);
    expect(parseSort(undefined)).toBe(DEFAULT_SORT);
    expect(parseSort(['array', 'value'])).toBe(DEFAULT_SORT);
    expect(parseSort("popular'; DROP TABLE \"Like\"; --")).toBe(DEFAULT_SORT);
  });

  it('a keyword search IGNORES the sort — relevance IS the sort', async () => {
    // Handing back the most-LIKED plan that merely mentions walnut in step 7,
    // ahead of the actual walnut cutting board, would make search look broken.
    queryRaw.mockResolvedValue([]);

    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ query: 'walnut', sort: 'popular' });

    // It took the raw-SQL relevance path...
    expect(queryRaw).toHaveBeenCalled();
    // ...and never issued a Prisma orderBy, so 'popular' was correctly ignored.
    expect(plan.findMany).not.toHaveBeenCalled();
  });
});
