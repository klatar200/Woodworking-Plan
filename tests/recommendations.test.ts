import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Personalized recommendations — Sprint 11.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * A RECOMMENDER IS AN INFERENCE CHANNEL, and that shapes what is worth testing.
 *
 * The output is DERIVED from the user's saves and likes — so leaking the output
 * leaks the input. "What would Bob be recommended?" is a question that must be
 * unaskable, which is why `getRecommendations()` takes no arguments at all.
 *
 * The other properties that matter are the ones that make a recommender OBVIOUSLY
 * broken rather than subtly wrong:
 *
 *   1. It never recommends a plan you already saved or liked.
 *   2. It never surfaces an unpublished plan.
 *   3. It returns NOTHING on a cold start — no popular-plans fallback under a
 *      personalized heading, which would be a lie told by the UI.
 *   4. Its order is STABLE — no reshuffling between renders.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const savedPlan = { findMany: vi.fn() };
const like = { findMany: vi.fn() };
const plan = { findMany: vi.fn() };
const getCurrentUser = vi.fn();

vi.mock('@/lib/db', () => ({ prisma: { savedPlan, like, plan } }));
vi.mock('@/lib/auth', () => ({ getCurrentUser }));

const ALICE = { id: 'user_alice' };

/** A plan as the taste-profile query returns it. */
const taste = (over: Record<string, unknown> = {}) => ({
  plan: {
    id: 'p_saved',
    categoryId: 'cat_boards',
    difficulty: 2,
    tags: ['walnut', 'gift'],
    tools: [{ toolId: 'tool_saw' }, { toolId: 'tool_planer' }],
    ...over,
  },
});

/** A plan as the candidate query returns it (card fields + scoring fields). */
const candidate = (over: Record<string, unknown> = {}) => ({
  id: 'p_candidate',
  slug: 'a-plan',
  title: 'A Plan',
  summary: 'Summary',
  difficulty: 3,
  costTier: 'TIER_2',
  costMinCents: 1000,
  costMaxCents: 2000,
  timeMinMinutes: 60,
  timeMaxMinutes: 120,
  category: { slug: 'cutting-boards', name: 'Cutting Boards' },
  images: [],
  _count: { likes: 0 },
  categoryId: 'cat_boards',
  tags: ['walnut'],
  tools: [{ toolId: 'tool_saw' }],
  ...over,
});

beforeEach(() => {
  vi.resetModules();
  savedPlan.findMany.mockReset().mockResolvedValue([]);
  like.findMany.mockReset().mockResolvedValue([]);
  plan.findMany.mockReset().mockResolvedValue([]);
  getCurrentUser.mockReset().mockResolvedValue(ALICE);
});

describe('IDOR TRIPWIRE: you cannot ask what SOMEONE ELSE would be recommended', () => {
  it('getRecommendations takes no arguments at all', async () => {
    const { getRecommendations } = await import('@/lib/recommendations');

    // Zero parameters. The taste profile is built from the VERIFIED SESSION user's
    // own rows. A `userId` parameter here would not merely be an IDOR — because the
    // output is derived from saves and likes, it would leak Bob's library by
    // inference to anyone who asked for his recommendations.
    expect(getRecommendations.length).toBe(0);
  });

  it('builds the profile from the SESSION user’s rows only', async () => {
    savedPlan.findMany.mockResolvedValue([taste()]);
    plan.findMany.mockResolvedValue([]);

    const { getRecommendations } = await import('@/lib/recommendations');
    await getRecommendations();

    expect(savedPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_alice' } }),
    );
    expect(like.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_alice' } }),
    );
  });
});

describe('COLD START: nothing to say, so say nothing', () => {
  it('returns [] for an anonymous visitor, and does not query at all', async () => {
    getCurrentUser.mockResolvedValue(null);

    const { getRecommendations } = await import('@/lib/recommendations');

    expect(await getRecommendations()).toEqual([]);
    expect(savedPlan.findMany).not.toHaveBeenCalled();
    expect(plan.findMany).not.toHaveBeenCalled();
  });

  it('returns [] for a signed-in user with no saves and no likes', async () => {
    const { getRecommendations } = await import('@/lib/recommendations');

    expect(await getRecommendations()).toEqual([]);

    // And it does NOT fall back to popular plans. A row headed "Recommended for you"
    // showing the same plans everyone else sees is a LIE TOLD BY THE UI — it makes
    // the feature look alive while personalizing nothing. The catalog already has a
    // Popular sort for that need.
    expect(plan.findMany).not.toHaveBeenCalled();
  });
});

describe('the two ways a recommender is OBVIOUSLY broken', () => {
  it('never recommends a plan the user already saved or liked', async () => {
    savedPlan.findMany.mockResolvedValue([taste({ id: 'p_saved' })]);
    like.findMany.mockResolvedValue([taste({ id: 'p_liked' })]);
    plan.findMany.mockResolvedValue([]);

    const { getRecommendations } = await import('@/lib/recommendations');
    await getRecommendations();

    const where = plan.findMany.mock.calls[0]![0].where;

    // Recommending the thing you just told it you already have is the single most
    // obviously broken output a recommender can produce.
    expect(where.id.notIn).toEqual(expect.arrayContaining(['p_saved', 'p_liked']));
  });

  it('SECURITY: never surfaces an unpublished plan', async () => {
    savedPlan.findMany.mockResolvedValue([taste()]);
    plan.findMany.mockResolvedValue([]);

    const { getRecommendations } = await import('@/lib/recommendations');
    await getRecommendations();

    // Leaking staged content to whoever happens to have the right taste would be a
    // uniquely stupid way to leak it. `published: true` is enforced in the data
    // layer, per the standing rule — never in the page.
    expect(plan.findMany.mock.calls[0]![0].where.published).toBe(true);
  });

  it('counts a plan that is BOTH saved and liked only once', async () => {
    // Double engagement must not double-weight its category — that is a bias nobody
    // asked for, and it would quietly make one plan dominate the whole profile.
    savedPlan.findMany.mockResolvedValue([taste({ id: 'p_same' })]);
    like.findMany.mockResolvedValue([taste({ id: 'p_same' })]);

    plan.findMany.mockResolvedValue([candidate()]);

    const { getRecommendations, scorePlan } = await import('@/lib/recommendations');
    const results = await getRecommendations();

    expect(results).toHaveLength(1);
    expect(typeof scorePlan).toBe('function');

    // notIn contains it once, not twice.
    const notIn = plan.findMany.mock.calls[0]![0].where.id.notIn;
    expect(notIn).toEqual(['p_same']);
  });
});

describe('ranking', () => {
  it('category is the strongest signal — it outranks a shared tag', async () => {
    savedPlan.findMany.mockResolvedValue([taste()]);

    plan.findMany.mockResolvedValue([
      // Shares a tag, wrong category.
      candidate({
        id: 'p_tag_only',
        categoryId: 'cat_furniture',
        tags: ['walnut'],
        tools: [],
        difficulty: 2,
      }),
      // Shares the category.
      candidate({
        id: 'p_same_category',
        categoryId: 'cat_boards',
        tags: [],
        tools: [],
        difficulty: 2,
      }),
    ]);

    const { getRecommendations } = await import('@/lib/recommendations');
    const results = await getRecommendations();

    // Someone who saves cutting boards is telling us something much louder than a
    // shared tag ever could.
    expect(results[0]!.plan.id).toBe('p_same_category');
  });

  it('prefers a plan one step ABOVE the user’s level, not another identical one', async () => {
    // Mean difficulty 2 → ideal is 2.5.
    savedPlan.findMany.mockResolvedValue([taste({ difficulty: 2 })]);

    plan.findMany.mockResolvedValue([
      candidate({ id: 'p_same_level', difficulty: 2, tags: [], tools: [] }),
      candidate({ id: 'p_step_up', difficulty: 3, tags: [], tools: [] }),
      candidate({ id: 'p_way_too_hard', difficulty: 5, tags: [], tools: [] }),
    ]);

    const { getRecommendations } = await import('@/lib/recommendations');
    const results = await getRecommendations();
    const ids = results.map((r) => r.plan.id);

    // Recommending a beginner their fourth identical beginner project is safe and
    // useless. The plan worth surfacing is the next rung up — but not a jump to
    // expert, which is just discouraging.
    expect(ids.indexOf('p_way_too_hard')).toBeGreaterThan(ids.indexOf('p_step_up'));
    expect(ids[0]).toBe('p_step_up');
  });

  it('the order is STABLE for equal scores — no reshuffling between renders', async () => {
    savedPlan.findMany.mockResolvedValue([taste()]);

    // Two identical scores. Without a deterministic tiebreaker these swap places
    // between renders and the row visibly reshuffles on every navigation, which looks
    // exactly like a bug.
    plan.findMany.mockResolvedValue([
      candidate({ id: 'p_bbb', _count: { likes: 3 } }),
      candidate({ id: 'p_aaa', _count: { likes: 3 } }),
    ]);

    const { getRecommendations } = await import('@/lib/recommendations');

    const first = (await getRecommendations()).map((r) => r.plan.id);
    const second = (await getRecommendations()).map((r) => r.plan.id);

    expect(first).toEqual(second);
    expect(first).toEqual(['p_aaa', 'p_bbb']); // id breaks the tie, deterministically
  });

  it('a more-liked plan wins a tie on score', async () => {
    savedPlan.findMany.mockResolvedValue([taste()]);

    plan.findMany.mockResolvedValue([
      candidate({ id: 'p_unloved', _count: { likes: 0 } }),
      candidate({ id: 'p_loved', _count: { likes: 40 } }),
    ]);

    const { getRecommendations } = await import('@/lib/recommendations');
    const results = await getRecommendations();

    expect(results[0]!.plan.id).toBe('p_loved');
  });

  it('drops candidates that score zero rather than padding the row', async () => {
    savedPlan.findMany.mockResolvedValue([taste()]);

    plan.findMany.mockResolvedValue([
      // Nothing in common at all, and the DB OR-filter would not have returned this
      // — but if it ever did, a zero-scoring plan is not a recommendation.
      {
        ...candidate({ id: 'p_unrelated', categoryId: 'cat_none', tags: [], tools: [] }),
        difficulty: 99, // far from ideal → proximity clamps to 0
      },
    ]);

    const { getRecommendations } = await import('@/lib/recommendations');
    expect(await getRecommendations()).toEqual([]);
  });

  it('caps the row at RECOMMENDATION_COUNT', async () => {
    savedPlan.findMany.mockResolvedValue([taste()]);

    const { RECOMMENDATION_COUNT, getRecommendations } = await import(
      '@/lib/recommendations'
    );

    plan.findMany.mockResolvedValue(
      Array.from({ length: RECOMMENDATION_COUNT + 10 }, (_, i) =>
        candidate({ id: `p_${i}` }),
      ),
    );

    expect(await getRecommendations()).toHaveLength(RECOMMENDATION_COUNT);
  });
});

describe('EVERY recommendation says why', () => {
  it('gives a non-empty reason for each plan', async () => {
    savedPlan.findMany.mockResolvedValue([taste()]);
    plan.findMany.mockResolvedValue([candidate()]);

    const { getRecommendations } = await import('@/lib/recommendations');
    const results = await getRecommendations();

    // A recommendation with no reason is indistinguishable from a random plan — the
    // user cannot tell whether the feature works, and neither can we.
    for (const result of results) {
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it('names the category match when that is why', async () => {
    savedPlan.findMany.mockResolvedValue([taste()]);
    plan.findMany.mockResolvedValue([
      candidate({ id: 'p_x', categoryId: 'cat_boards', tags: [], tools: [] }),
    ]);

    const { getRecommendations } = await import('@/lib/recommendations');
    const results = await getRecommendations();

    expect(results[0]!.reason).toMatch(/category you build in/i);
  });

  it('never gives more than two clauses — a four-part reason is not a reason', async () => {
    savedPlan.findMany.mockResolvedValue([taste()]);
    plan.findMany.mockResolvedValue([
      candidate({
        id: 'p_everything',
        categoryId: 'cat_boards',
        tags: ['walnut', 'gift'],
        tools: [{ toolId: 'tool_saw' }],
        difficulty: 3,
      }),
    ]);

    const { getRecommendations } = await import('@/lib/recommendations');
    const results = await getRecommendations();

    // A "reason" listing four things is a confession that we don't know why.
    expect(results[0]!.reason.split(',').length).toBeLessThanOrEqual(2);
  });
});

describe('scorePlan is exported so the ranking can actually be checked', () => {
  it('scores a total mismatch at zero', async () => {
    const { scorePlan } = await import('@/lib/recommendations');

    const emptyProfile = {
      categoryIds: new Map<string, number>(),
      tagCounts: new Map<string, number>(),
      toolIds: new Set<string>(),
      meanDifficulty: null,
      seenPlanIds: new Set<string>(),
      size: 0,
    };

    // A ranking function whose behaviour is only observable through a database query
    // is a ranking function nobody can check.
    const { score } = scorePlan(
      { id: 'x', categoryId: 'c', difficulty: 3, tags: [], tools: [] },
      emptyProfile,
    );

    expect(score).toBe(0);
  });
});
