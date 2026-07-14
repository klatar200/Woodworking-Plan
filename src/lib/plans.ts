import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { PlanFilters } from '@/lib/filters';
import { DEFAULT_SORT, isIdOrderedSort, type SortOption } from '@/lib/sort';
import { trendingPlanIds, mostViewedPlanIds } from '@/lib/views';
// Sprint 19: the 'recommended' SORT. `@/lib/recommendations` imports PLAN_CARD_SELECT
// back from this module — a cycle, but a safe one: both sides only touch the other's
// exports inside function bodies, never at module init. Do not "fix" it by duplicating
// the select; a recommendation card that silently drops a field is the bug that avoids.
import { getRecommendations } from '@/lib/recommendations';

/**
 * Plan catalog reads.
 *
 * ONE RULE: `published: true` is applied on EVERY read. The filter lives here, in
 * the data layer, not in the pages. Pages cannot forget what they never had to
 * remember. Sprints 4–7 EXTEND these functions; they must not bypass them.
 */

/** Page size. Small on purpose — BUSINESS_PLAN.md §5: phones, weak workshop wifi. */
export const PLANS_PER_PAGE = 12;

/**
 * The fields a catalog card renders, and nothing more. Shared by every list view.
 *
 * `_count.likes` — the like count is COUNTED, never read from a denormalized
 * column. See prisma/schema.prisma: a derived column is a thing that can ship to
 * production empty and silently lie, which has already happened twice here.
 */
// Exported for Sprint 11 (recommendations), which must return the SAME shape a
// catalog card renders. Duplicating this select there would let the two drift, and a
// recommendation card silently missing a field is the kind of bug nobody files.
export const PLAN_CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  difficulty: true,
  costTier: true,
  costMinCents: true,
  costMaxCents: true,
  timeMinMinutes: true,
  timeMaxMinutes: true,
  category: { select: { slug: true, name: true } },
  images: {
    where: { isPrimary: true },
    select: { url: true, alt: true },
    take: 1,
  },
  _count: { select: { likes: true } },
} as const;

export type PlanListItem = Prisma.PlanGetPayload<{ select: typeof PLAN_CARD_SELECT }>;

const EMPTY_FILTERS: PlanFilters = { difficulty: [], costTier: [], ownedTools: [] };

function buildWhere(filters: PlanFilters): Prisma.PlanWhereInput {
  const where: Prisma.PlanWhereInput = { published: true };

  if (filters.category) where.category = { slug: filters.category };
  if (filters.difficulty.length > 0) where.difficulty = { in: filters.difficulty };
  if (filters.costTier.length > 0) where.costTier = { in: filters.costTier };

  if (filters.maxMinutes) {
    // Filter on the MAXIMUM estimate, not the minimum. Asking for "an afternoon
    // (<=4 hrs)" must NOT return a plan estimated at "3-7 hrs" — that might eat
    // the whole evening. Filtering on timeMinMinutes would make the filter a liar.
    where.timeMaxMinutes = { lte: filters.maxMinutes };
  }

  if (filters.ownedTools.length > 0) {
    // "Only show plans I can BUILD with the tools I own" (BUSINESS_PLAN.md §4.6).
    // A SUBSET test, not an intersection: the plan must have NO essential tool
    // outside the owned set. Optional tools are ignored — that is what the
    // `essential` flag is for. The naive reading ("plans using any tool I own")
    // would return a plan needing a lathe you do not have. A filter that lies is
    // worse than no filter.
    where.tools = {
      none: { essential: true, tool: { slug: { notIn: filters.ownedTools } } },
    };
  }

  return where;
}

/**
 * Sprint 7 — the "Popular" sort. Sprint 19 removed 'easiest'/'cheapest'/'quickest'
 * (they duplicated filters) and moved the view- and recommendation-driven sorts to
 * the id-ordered path below, so only two sorts are expressible as a Prisma orderBy.
 *
 * Popular sorts by like count DESC, then falls back to difficulty and title so
 * the order is deterministic. Without a tiebreak, a catalog where every plan has
 * zero likes would shuffle on every request — which looks broken and, worse,
 * makes pagination inconsistent between pages.
 */
function buildOrderBy(sort: SortOption): Prisma.PlanOrderByWithRelationInput[] {
  switch (sort) {
    case 'popular':
      return [
        { likes: { _count: 'desc' } },
        { difficulty: 'asc' },
        { title: 'asc' },
      ];
    case 'newest':
    default:
      return [{ publishedAt: 'desc' }, { title: 'asc' }];
  }
}

/**
 * The ordered id list for a sort that Postgres' ORDER BY cannot express directly.
 *
 * TRENDING / MOST VIEWED — counts over a window, from src/lib/views.ts.
 *
 * RECOMMENDED — the personalized plans first (in score order), then THE REST OF THE
 * CATALOG by trending. Two things about this are deliberate:
 *
 *   1. `getRecommendations()` TAKES NO ARGUMENTS, and this function does not take a
 *      user either. The recommender is an inference channel: its output is derived
 *      from the caller's saves and likes, so a `userId` parameter anywhere on this
 *      path would let someone ask "what would Bob be recommended?" and read back
 *      Bob's library. The Sprint 11 rule survives this sprint intact.
 *
 *   2. The TAIL is the whole catalog, not nothing. An anonymous visitor and a
 *      cold-start user both get zero recommendations, so this degrades to exactly
 *      the Trending list. That is NOT the thing Sprint 11 forbade: what it forbade
 *      was a *heading* promising personalization over a generic list. This is a sort
 *      over the full catalog — nothing is hidden and nothing is claimed. (The
 *      standalone "Recommended for you" section is retired this sprint, which is
 *      what makes that distinction true rather than convenient.)
 */
async function orderedIdsForSort(sort: SortOption): Promise<string[]> {
  if (sort === 'viewed') return mostViewedPlanIds();
  if (sort === 'trending') return trendingPlanIds();

  // 'recommended'
  const [recommendations, trending] = await Promise.all([
    getRecommendations(),
    trendingPlanIds(),
  ]);

  const recommendedIds = recommendations.map((r) => r.plan.id);
  const seen = new Set(recommendedIds);

  return [...recommendedIds, ...trending.filter((id) => !seen.has(id))];
}

export interface QueryPlansArgs {
  query?: string;
  filters?: PlanFilters;
  sort?: SortOption;
  page?: number;
}

/**
 * The ONE catalog query — browse, keyword search, filters, sort, and every
 * combination.
 *
 * Ranking a keyword search needs raw SQL (Prisma has no tsvector). Filtering and
 * sorting are safer and clearer in Prisma. So: raw SQL returns the FULL matched id
 * list in relevance order, Prisma applies the filters, and we intersect.
 *
 * NOTE ON SORT + SEARCH: when a keyword is present, RELEVANCE wins and the sort
 * dropdown is ignored. That is deliberate. If you search "walnut" and we hand you
 * the most-liked plan that merely mentions walnut in step 7 ahead of the walnut
 * cutting board, the search looks broken. Relevance is the sort, when you searched.
 *
 * Trade-off: the id list is unpaginated. At launch scale (BUSINESS_PLAN.md §6:
 * 300–500 plans) that is a few hundred short strings — fine. It stops being fine
 * in the tens of thousands, at which point the filters belong in the SQL. Noted
 * deliberately, not overlooked.
 */
export async function queryPlans({
  query = '',
  filters = EMPTY_FILTERS,
  sort = DEFAULT_SORT,
  page = 1,
}: QueryPlansArgs = {}) {
  const trimmed = query.trim();
  const currentPage = Math.max(1, Math.floor(page));
  const skip = (currentPage - 1) * PLANS_PER_PAGE;
  const where = buildWhere(filters);

  /**
   * --- Sprint 19: a sort whose order is an ID LIST, not an ORDER BY. ---
   *
   * Trending, Most Viewed and Recommended all rank plans by something Postgres'
   * ORDER BY can't reach from a `prisma.plan.findMany` (a windowed count over
   * another table; a per-user score computed in JS). They reuse the keyword
   * search's machinery exactly: an ordered id list, intersected with the filter
   * `where`, paginated in memory. One path, so the filters cannot work on one
   * sort and quietly not on another.
   *
   * Skipped entirely during a keyword search — relevance wins, see below.
   */
  if (trimmed === '' && isIdOrderedSort(sort)) {
    const orderedIds = await orderedIdsForSort(sort);
    return paginateOrderedIds({ orderedIds, where, skip, currentPage, query: '' });
  }

  // --- No keyword: Prisma does everything, including sort and pagination. ---
  if (trimmed === '') {
    const [plans, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        select: PLAN_CARD_SELECT,
        orderBy: buildOrderBy(sort),
        skip,
        take: PLANS_PER_PAGE,
      }),
      prisma.plan.count({ where }),
    ]);

    return {
      plans,
      total,
      page: currentPage,
      totalPages: Math.max(1, Math.ceil(total / PLANS_PER_PAGE)),
      query: '',
    };
  }

  // --- Keyword: rank in SQL, filter in Prisma, intersect. ---
  //
  // SECURITY: $queryRaw is a tagged template — ${trimmed} is a BOUND PARAMETER,
  // never concatenated. $queryRawUnsafe is not used anywhere in this codebase.
  // websearch_to_tsquery (not to_tsquery): the latter throws a syntax error on a
  // stray '&' or unbalanced quote, turning a user's typo into a 500.
  const ranked = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "Plan"
    WHERE published = true
      AND "searchVector" @@ websearch_to_tsquery('english', ${trimmed})
    ORDER BY ts_rank("searchVector", websearch_to_tsquery('english', ${trimmed})) DESC,
             title ASC
  `;

  const rankedIds = ranked.map((r) => r.id);

  return paginateOrderedIds({
    orderedIds: rankedIds,
    where,
    skip,
    currentPage,
    query: trimmed,
  });
}

/**
 * Takes an ORDERED id list (relevance, trending, most-viewed, recommended), applies
 * the filter `where`, and returns one page of cards in that order.
 *
 * Extracted in Sprint 19, when a second family of sorts needed exactly what the
 * keyword search was already doing. Two copies of this would be two places for
 * `published: true` to go missing — and a missing `published` filter still "works",
 * it just quietly serves staged content.
 *
 * Trade-off, unchanged from Sprint 4 and still deliberate: the id list is
 * UNPAGINATED. At launch scale (BUSINESS_PLAN.md §6: 300–500 plans) that is a few
 * hundred short strings. It stops being fine in the tens of thousands, at which
 * point the filters belong in the SQL.
 */
async function paginateOrderedIds({
  orderedIds,
  where,
  skip,
  currentPage,
  query,
}: {
  orderedIds: string[];
  where: Prisma.PlanWhereInput;
  skip: number;
  currentPage: number;
  query: string;
}) {
  if (orderedIds.length === 0) {
    return {
      plans: [] as PlanListItem[],
      total: 0,
      page: currentPage,
      totalPages: 1,
      query,
    };
  }

  // `published: true` is in `where` too — belt and braces, so this never depends
  // on the ranking query having remembered it.
  const allowed = await prisma.plan.findMany({
    where: { AND: [where, { id: { in: orderedIds } }] },
    select: { id: true },
  });

  const allowedIds = new Set(allowed.map((p) => p.id));
  const ordered = orderedIds.filter((id) => allowedIds.has(id));

  const total = ordered.length;
  const pageIds = ordered.slice(skip, skip + PLANS_PER_PAGE);

  if (pageIds.length === 0) {
    return {
      plans: [] as PlanListItem[],
      total,
      page: currentPage,
      totalPages: Math.max(1, Math.ceil(total / PLANS_PER_PAGE)),
      query,
    };
  }

  const plans = await prisma.plan.findMany({
    where: { id: { in: pageIds }, published: true },
    select: PLAN_CARD_SELECT,
  });

  // Restore the ranked order — findMany returns rows in whatever order it likes.
  const byId = new Map(plans.map((p) => [p.id, p]));
  const pagePlans = pageIds
    .map((id) => byId.get(id))
    .filter((p): p is PlanListItem => p !== undefined);

  return {
    plans: pagePlans,
    total,
    page: currentPage,
    totalPages: Math.max(1, Math.ceil(total / PLANS_PER_PAGE)),
    query,
  };
}

export async function listCategories() {
  return prisma.category.findMany({
    select: { slug: true, name: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

/** Only tools some PUBLISHED plan requires — a filter that can never match is noise. */
export async function listFilterableTools() {
  return prisma.tool.findMany({
    where: { plans: { some: { plan: { published: true } } } },
    select: { slug: true, name: true, category: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

/**
 * A single plan with everything the detail page renders.
 *
 * PERF (Sprint 9): wrapped in React's `cache()`, which memoizes per REQUEST.
 *
 * The plan page calls this twice — once in `generateMetadata` (for the <title>)
 * and once in the component — and Next.js runs both. Without this, every view of
 * the app's most-visited route issued **two identical queries**, each pulling the
 * full plan with its steps, cut list, materials, tools and images. On Neon's free
 * tier that is also two cold-start-eligible round trips.
 *
 * Found by auditing the query paths, not by a user complaining. It is exactly the
 * kind of waste that is invisible until the catalog and the traffic are both real.
 */
export const getPlanBySlug = cache(async (slug: string) => {
  return prisma.plan.findFirst({
    // Unknown slug and unpublished slug both return null, so a 404 cannot be used
    // to probe for the existence of unreleased content.
    where: { slug, published: true },
    include: {
      category: true,
      tools: {
        include: { tool: true },
        orderBy: [{ essential: 'desc' }, { tool: { name: 'asc' } }],
      },
      materials: { orderBy: { sortOrder: 'asc' } },
      cutList: { orderBy: { sortOrder: 'asc' } },
      steps: { orderBy: { stepNumber: 'asc' } },
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      _count: { select: { likes: true } },
    },
  });
});

export type PlanDetail = NonNullable<Awaited<ReturnType<typeof getPlanBySlug>>>;

export async function listPublishedSlugs(): Promise<string[]> {
  const plans = await prisma.plan.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return plans.map((p) => p.slug);
}
