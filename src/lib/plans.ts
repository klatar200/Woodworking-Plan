import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { PlanFilters } from '@/lib/filters';

/**
 * Plan catalog reads.
 *
 * ONE RULE: `published: true` is applied on EVERY read. The filter lives here,
 * in the data layer, not in the pages. Pages cannot forget what they never had
 * to remember.
 */

/** Page size. Small on purpose — BUSINESS_PLAN.md §5: phones, weak workshop wifi. */
export const PLANS_PER_PAGE = 12;

/** The fields a catalog card renders, and nothing more. Shared by every list view. */
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
} as const;

const EMPTY_FILTERS: PlanFilters = {
  difficulty: [],
  costTier: [],
  ownedTools: [],
};

/**
 * Translates validated filters into a Prisma `where` clause.
 *
 * `published: true` is baked in and non-negotiable — every path through this file
 * goes through here.
 */
function buildWhere(filters: PlanFilters): Prisma.PlanWhereInput {
  const where: Prisma.PlanWhereInput = { published: true };

  if (filters.category) {
    where.category = { slug: filters.category };
  }

  if (filters.difficulty.length > 0) {
    where.difficulty = { in: filters.difficulty };
  }

  if (filters.costTier.length > 0) {
    where.costTier = { in: filters.costTier };
  }

  if (filters.maxMinutes) {
    // Filter on the plan's MAXIMUM estimate, not its minimum.
    //
    // If someone asks for "an afternoon (≤4 hrs)", a plan estimated at "3–7 hrs"
    // must NOT match — it might well eat their whole evening. Filtering on
    // timeMinMinutes would return exactly that plan and make the filter a liar.
    // Honest under-promising is the only way this number stays trustworthy.
    where.timeMaxMinutes = { lte: filters.maxMinutes };
  }

  if (filters.ownedTools.length > 0) {
    // "Only show plans I can BUILD with the tools I own" (BUSINESS_PLAN.md §4.6).
    //
    // This is a SUBSET test, not an intersection: a plan qualifies when it has NO
    // essential tool outside the owned set. Optional tools are ignored — that is
    // what `essential: false` is for, and it is why the flag exists in the schema.
    //
    // The naive reading ("plans that use any tool I own") would happily return a
    // plan needing a lathe you don't have. A filter that lies is worse than no
    // filter.
    where.tools = {
      none: {
        essential: true,
        tool: { slug: { notIn: filters.ownedTools } },
      },
    };
  }

  return where;
}

export interface QueryPlansArgs {
  query?: string;
  filters?: PlanFilters;
  page?: number;
}

/**
 * The one catalog query — browse, keyword search, filters, and every combination.
 *
 * Sprint 3 gave us browse. Sprint 4 gave us ranked keyword search. Sprint 5 has
 * to make filters work *with* search, so all three collapse into one function
 * rather than three that drift apart.
 *
 * HOW SEARCH AND FILTERS COMBINE:
 *   Ranking needs raw SQL (Prisma has no tsvector support). Filtering is far
 *   safer and clearer in Prisma. So: the raw query returns the FULL set of
 *   matching ids in rank order, Prisma applies the filters and gives us the
 *   surviving ids, then we intersect — preserving rank order — and paginate.
 *
 *   The trade-off: the id list is fetched unpaginated. At the launch catalog size
 *   (BUSINESS_PLAN.md §6: 300–500 plans) that is a few hundred short strings, so
 *   it is fine. It would stop being fine in the tens of thousands, at which point
 *   the filters belong in the SQL. Noted deliberately, not overlooked.
 */
export async function queryPlans({
  query = '',
  filters = EMPTY_FILTERS,
  page = 1,
}: QueryPlansArgs = {}) {
  const trimmed = query.trim();
  const currentPage = Math.max(1, Math.floor(page));
  const skip = (currentPage - 1) * PLANS_PER_PAGE;
  const where = buildWhere(filters);

  // --- No keyword: Prisma does everything, including pagination. ---
  if (trimmed === '') {
    const [plans, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        select: PLAN_CARD_SELECT,
        orderBy: [{ difficulty: 'asc' }, { title: 'asc' }],
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

  // --- Keyword present: rank in SQL, filter in Prisma, intersect. ---
  //
  // SECURITY: `$queryRaw` is a tagged template. Prisma sends ${trimmed} as a bound
  // parameter, never concatenated into the SQL string. `$queryRawUnsafe` is not
  // used anywhere in this codebase.
  //
  // `websearch_to_tsquery`, not `to_tsquery`: the latter throws a syntax error on
  // ordinary human input (a stray `&`, an unbalanced quote), turning a typo into
  // a 500. Users type strange things into search boxes.
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

  // Apply the filters to the matched set. `published: true` is in `where` too —
  // belt and braces, so this never depends on the raw query having remembered it.
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

  // findMany returns rows in whatever order Postgres likes. Restore relevance
  // order — an unranked list of search results is just a list.
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

export type PlanListItem = Prisma.PlanGetPayload<{
  select: typeof PLAN_CARD_SELECT;
}>;

/** Categories for the filter UI, in display order. */
export async function listCategories() {
  return prisma.category.findMany({
    select: { slug: true, name: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Tools for the "tools I own" filter, grouped for the UI.
 *
 * Only tools that some published plan actually requires — offering a filter for a
 * tool that returns nothing no matter what is just noise.
 */
export async function listFilterableTools() {
  return prisma.tool.findMany({
    where: { plans: { some: { plan: { published: true } } } },
    select: { slug: true, name: true, category: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

export async function getPlanBySlug(slug: string) {
  return prisma.plan.findFirst({
    // Unknown slug and unpublished slug both return null — so a 404 cannot be
    // used to probe for the existence of unreleased content.
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
    },
  });
}

export type PlanDetail = NonNullable<Awaited<ReturnType<typeof getPlanBySlug>>>;

export async function listPublishedSlugs(): Promise<string[]> {
  const plans = await prisma.plan.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return plans.map((p) => p.slug);
}
