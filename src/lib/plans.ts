import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { PlanFilters } from '@/lib/filters';
import { DEFAULT_SORT, type SortOption } from '@/lib/sort';

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
const PLAN_CARD_SELECT = {
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
 * Sprint 7 — the "Popular" sort and friends.
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
      return [{ publishedAt: 'desc' }, { title: 'asc' }];
    case 'cheapest':
      return [{ costMinCents: 'asc' }, { title: 'asc' }];
    case 'quickest':
      return [{ timeMaxMinutes: 'asc' }, { title: 'asc' }];
    case 'easiest':
    default:
      return [{ difficulty: 'asc' }, { title: 'asc' }];
  }
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

  if (rankedIds.length === 0) {
    return {
      plans: [] as PlanListItem[],
      total: 0,
      page: currentPage,
      totalPages: 1,
      query: trimmed,
    };
  }

  // `published: true` is in `where` too — belt and braces, so this never depends
  // on the raw query having remembered it.
  const allowed = await prisma.plan.findMany({
    where: { AND: [where, { id: { in: rankedIds } }] },
    select: { id: true },
  });

  const allowedIds = new Set(allowed.map((p) => p.id));
  const ordered = rankedIds.filter((id) => allowedIds.has(id));

  const total = ordered.length;
  const pageIds = ordered.slice(skip, skip + PLANS_PER_PAGE);

  if (pageIds.length === 0) {
    return {
      plans: [] as PlanListItem[],
      total,
      page: currentPage,
      totalPages: Math.max(1, Math.ceil(total / PLANS_PER_PAGE)),
      query: trimmed,
    };
  }

  const plans = await prisma.plan.findMany({
    where: { id: { in: pageIds }, published: true },
    select: PLAN_CARD_SELECT,
  });

  // Restore relevance order — findMany returns rows in whatever order it likes.
  const byId = new Map(plans.map((p) => [p.id, p]));
  const pagePlans = pageIds
    .map((id) => byId.get(id))
    .filter((p): p is PlanListItem => p !== undefined);

  return {
    plans: pagePlans,
    total,
    page: currentPage,
    totalPages: Math.max(1, Math.ceil(total / PLANS_PER_PAGE)),
    query: trimmed,
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
