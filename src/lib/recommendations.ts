import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { PLAN_CARD_SELECT, type PlanListItem } from '@/lib/plans';

/**
 * Personalized recommendations — Sprint 11. BUSINESS_PLAN.md §10.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY CONTENT-BASED AND NOT COLLABORATIVE FILTERING
 *
 * The obvious recommender is "people who saved this also saved that." It is also
 * completely useless here, and would look like working code while returning nothing:
 * collaborative filtering needs OTHER PEOPLE, and this app has no user base. With one
 * user, every co-occurrence count is 1 or 0 and the output is noise.
 *
 * So: content-based. We build a TASTE PROFILE from the plans a user has saved and
 * liked — their categories, difficulty, tags, and tools — and score every other plan
 * against it. This works from the very FIRST saved plan, which is the only regime
 * that currently exists and will be the regime every new user starts in forever.
 *
 * When there is a real user base, revisit. Not before. A recommender that needs data
 * we do not have is a recommender that does not work.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SECURITY — the same rule as saves.ts, likes.ts and reviews.ts:
 *
 *   NO FUNCTION HERE TAKES A `userId`.
 *
 * The taste profile is built from the VERIFIED SESSION user's own rows. There is no
 * parameter through which a caller could ask "what would Bob be recommended?" — which
 * would leak Bob's saves and likes by inference, since the recommendations are
 * derived from them. A recommender is an inference channel, and that is worth saying
 * out loud: leaking the OUTPUT can leak the INPUT.
 */

/** How many plans to recommend. A short row, not an endless feed. */
export const RECOMMENDATION_COUNT = 6;

/**
 * How many of the user's most recent saves/likes to learn from.
 *
 * Bounded on purpose. Someone with 500 saved plans should not cause a 500-row scan on
 * every page load, and their taste five years ago is not evidence about today.
 */
const TASTE_SAMPLE_SIZE = 30;

/** Score weights. See `scorePlan` for why each is what it is. */
const WEIGHT = {
  /** The strongest signal we have. Someone who saves cutting boards wants boards. */
  category: 5,
  /** A shared tag ("outdoor", "beginner", "gift") is a real but weaker hint. */
  tag: 2,
  /** Shared tools mean it's buildable in the same shop — practical, not just similar. */
  tool: 1,
  /** Being one step harder than what you've built is the interesting direction. */
  difficultyStep: 3,
} as const;

export interface Recommendation {
  plan: PlanListItem;
  /** Human-readable justification. Shown in the UI — see `explain()`. */
  reason: string;
}

interface TasteProfile {
  categoryIds: Map<string, number>;
  tagCounts: Map<string, number>;
  toolIds: Set<string>;
  /** Mean difficulty of what they've engaged with. Null when there is no signal. */
  meanDifficulty: number | null;
  /** Plans to never recommend: they already have them. */
  seenPlanIds: Set<string>;
  /** Total plans the profile was built from. Zero means a cold user. */
  size: number;
}

/**
 * Builds the taste profile from the session user's saved and liked plans.
 *
 * Saves and likes are pooled rather than weighted differently. A save is arguably the
 * stronger intent ("I will build this") and a like the weaker ("nice"), but that is a
 * guess, and there is no data to justify tuning against. Pretending to a precision we
 * cannot measure would be decoration. Pool them; revisit when there is behaviour to
 * learn from.
 */
async function buildTasteProfile(userId: string): Promise<TasteProfile> {
  const [saved, liked] = await Promise.all([
    prisma.savedPlan.findMany({
      where: { userId },
      select: {
        plan: {
          select: {
            id: true,
            categoryId: true,
            difficulty: true,
            tags: true,
            tools: { select: { toolId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: TASTE_SAMPLE_SIZE,
    }),
    prisma.like.findMany({
      where: { userId },
      select: {
        plan: {
          select: {
            id: true,
            categoryId: true,
            difficulty: true,
            tags: true,
            tools: { select: { toolId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: TASTE_SAMPLE_SIZE,
    }),
  ]);

  const profile: TasteProfile = {
    categoryIds: new Map(),
    tagCounts: new Map(),
    toolIds: new Set(),
    meanDifficulty: null,
    seenPlanIds: new Set(),
    size: 0,
  };

  const difficulties: number[] = [];

  // A plan that is BOTH saved and liked is counted once, not twice. `seenPlanIds`
  // dedupes it — otherwise double-engagement would double-weight its category, which
  // is a bias nobody asked for.
  for (const { plan } of [...saved, ...liked]) {
    if (profile.seenPlanIds.has(plan.id)) continue;
    profile.seenPlanIds.add(plan.id);
    profile.size += 1;

    profile.categoryIds.set(
      plan.categoryId,
      (profile.categoryIds.get(plan.categoryId) ?? 0) + 1,
    );

    for (const tag of plan.tags) {
      profile.tagCounts.set(tag, (profile.tagCounts.get(tag) ?? 0) + 1);
    }

    for (const { toolId } of plan.tools) {
      profile.toolIds.add(toolId);
    }

    difficulties.push(plan.difficulty);
  }

  if (difficulties.length > 0) {
    profile.meanDifficulty =
      difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
  }

  return profile;
}

interface Candidate {
  id: string;
  categoryId: string;
  difficulty: number;
  tags: string[];
  tools: { toolId: string }[];
}

interface Scored {
  score: number;
  reason: string;
}

/**
 * Scores one candidate plan against the taste profile.
 *
 * Exported for testing. A ranking function whose behaviour is only observable through
 * a database query is a ranking function nobody can actually check.
 */
export function scorePlan(candidate: Candidate, profile: TasteProfile): Scored {
  let score = 0;
  const reasons: string[] = [];

  // 1. CATEGORY — the strongest signal. Someone who saves three cutting boards is
  //    telling us something much louder than a shared tag ever could.
  const categoryHits = profile.categoryIds.get(candidate.categoryId) ?? 0;
  if (categoryHits > 0) {
    score += WEIGHT.category * categoryHits;
    reasons.push('a category you build in');
  }

  // 2. TAGS — a real hint, weaker than category. "outdoor", "gift", "beginner".
  let tagHits = 0;
  for (const tag of candidate.tags) {
    if (profile.tagCounts.has(tag)) tagHits += 1;
  }
  if (tagHits > 0) {
    score += WEIGHT.tag * tagHits;
    reasons.push('similar to plans you saved');
  }

  // 3. TOOLS — practical rather than aesthetic. A plan needing only tools that appear
  //    in plans you already chose is a plan you can probably actually BUILD. That is
  //    a different claim from "you'll like it", and it is the one woodworkers care
  //    about (BUSINESS_PLAN.md §4.6).
  let toolHits = 0;
  for (const { toolId } of candidate.tools) {
    if (profile.toolIds.has(toolId)) toolHits += 1;
  }
  if (toolHits > 0) {
    score += WEIGHT.tool * toolHits;
    if (candidate.tools.length > 0 && toolHits === candidate.tools.length) {
      reasons.push('uses tools you already need');
    }
  }

  // 4. DIFFICULTY — reward the plan that is slightly ABOVE their level.
  //
  //    Recommending a beginner their fourth identical beginner project is safe and
  //    useless; the plan worth surfacing is the next rung up. So the ideal is
  //    mean + 0.5 and the score decays with distance from it.
  //
  //    THE DECAY IS ASYMMETRIC, and it has to be. A symmetric decay around mean + 0.5
  //    scores difficulty 2 and difficulty 3 IDENTICALLY for a user whose mean is 2 —
  //    they are equidistant from 2.5 — so "prefer a step up" would be a claim the
  //    code did not actually implement. (It was, until a test caught it.) Going EASIER
  //    than the ideal is penalized harder than going harder, which is what actually
  //    encodes the preference.
  if (profile.meanDifficulty !== null) {
    const ideal = profile.meanDifficulty + 0.5;
    const delta = candidate.difficulty - ideal;

    // Below the ideal costs 1.5× as much as the same distance above it.
    const EASIER_PENALTY = 1.5;
    const weighted = delta < 0 ? Math.abs(delta) * EASIER_PENALTY : delta;

    const proximity = Math.max(0, 1 - weighted / 2);
    score += WEIGHT.difficultyStep * proximity;

    if (candidate.difficulty > profile.meanDifficulty && Math.abs(delta) <= 1) {
      reasons.push('a step up from your usual');
    }
  }

  return {
    score,
    // Deduped, and capped at two clauses — a "reason" listing four things is not a
    // reason, it is a confession that we don't know why.
    reason: [...new Set(reasons)].slice(0, 2).join(', '),
  };
}

/**
 * Recommendations for the signed-in user.
 *
 * Returns an EMPTY ARRAY for:
 *   - an anonymous visitor (no session, nothing to personalize from),
 *   - a signed-in user who has saved and liked nothing (the COLD START).
 *
 * Empty, not "popular plans as a fallback". A row headed "Recommended for you" that
 * silently shows the same popular plans everyone else sees is a lie told by the UI —
 * and the catalog already has a Popular sort for exactly that need. The section
 * simply does not render. Honest absence beats a fake presence.
 */
export async function getRecommendations(): Promise<Recommendation[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const profile = await buildTasteProfile(user.id);

  // COLD START. Nothing to learn from, so nothing to say.
  if (profile.size === 0) return [];

  /**
   * Candidate pool.
   *
   * `published: true` — enforced HERE, in the data layer, per the standing rule. A
   * recommender that surfaces staged content would leak unreleased plans to whoever
   * happened to have the right taste, which is a uniquely stupid way to leak them.
   *
   * `id: { notIn: seen }` — never recommend what they already saved or liked. The
   * single most obviously broken thing a recommender can do is recommend the thing
   * you just told it you already have.
   *
   * Narrowed to plans that share a category, tag or tool with the profile. Without
   * this we would score the ENTIRE catalog on every page load; with it we score only
   * plans that could plausibly rank at all. At 24 plans this is irrelevant; at 500
   * (BUSINESS_PLAN.md §6) it is the difference between a query and a table scan.
   */
  const seen = [...profile.seenPlanIds];
  const categoryIds = [...profile.categoryIds.keys()];
  const tags = [...profile.tagCounts.keys()];
  const toolIds = [...profile.toolIds];

  const candidates = await prisma.plan.findMany({
    where: {
      published: true,
      id: { notIn: seen },
      OR: [
        { categoryId: { in: categoryIds } },
        { tags: { hasSome: tags } },
        { tools: { some: { toolId: { in: toolIds } } } },
      ],
    },
    select: {
      ...PLAN_CARD_SELECT,
      categoryId: true,
      tags: true,
      tools: { select: { toolId: true } },
    },
  });

  const scored = candidates
    .map((candidate) => ({
      plan: candidate as unknown as PlanListItem,
      ...scorePlan(
        {
          id: candidate.id,
          categoryId: candidate.categoryId,
          difficulty: candidate.difficulty,
          tags: candidate.tags,
          tools: candidate.tools,
        },
        profile,
      ),
    }))
    .filter((entry) => entry.score > 0)
    // Ties broken by like count, then id. A STABLE order matters: without a
    // tiebreaker, two plans with equal scores swap places between renders and the row
    // visibly reshuffles on every navigation, which looks broken.
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.plan._count.likes - a.plan._count.likes ||
        a.plan.id.localeCompare(b.plan.id),
    )
    .slice(0, RECOMMENDATION_COUNT);

  return scored.map(({ plan, reason }) => ({
    plan,
    reason: reason || 'similar to plans you saved',
  }));
}
