import { prisma } from '@/lib/db';

/**
 * Plan catalog reads — Sprint 3 (browse + detail).
 *
 * ONE RULE GOVERNS THIS FILE: **`published: true` is applied on every read.**
 *
 * The `published` flag exists so content can be staged in the database before it
 * is fit to show anyone. A single query that forgets the filter silently exposes
 * half-finished plans to the public — and because it *works*, nobody notices.
 * So the filter lives here, in the data layer, not in the pages. Pages cannot
 * forget what they never had to remember.
 *
 * Search (Sprint 4) and filters (Sprint 5) will extend these functions. They must
 * not bypass them.
 */

/** Page size. Deliberately small — BUSINESS_PLAN.md §5: phones, weak workshop wifi. */
export const PLANS_PER_PAGE = 12;

/**
 * The fields a catalog card renders — and nothing more.
 *
 * Shared by browse and search so the two cannot drift apart. A list view has no
 * business pulling every step and cut-list row for every plan.
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
} as const;

/**
 * A page of the catalog.
 *
 * Paginated rather than returning everything: the seed catalog is 24 plans, but
 * BUSINESS_PLAN.md §6 targets 300–500 at launch, and shipping 500 plans to a
 * phone on hardware-store wifi is a real failure, not a hypothetical one. Doing
 * it now costs nothing; retrofitting it after Sprints 4–5 build on top would not.
 *
 * Selects only the fields a card renders. A list view has no business pulling
 * every step and cut-list row for every plan.
 */
export async function listPlans({ page = 1 }: { page?: number } = {}) {
  const currentPage = Math.max(1, Math.floor(page));
  const skip = (currentPage - 1) * PLANS_PER_PAGE;

  const [plans, total] = await Promise.all([
    prisma.plan.findMany({
      where: { published: true },
      select: PLAN_CARD_SELECT,
      orderBy: [{ difficulty: 'asc' }, { title: 'asc' }],
      skip,
      take: PLANS_PER_PAGE,
    }),
    prisma.plan.count({ where: { published: true } }),
  ]);

  return {
    plans,
    total,
    page: currentPage,
    totalPages: Math.max(1, Math.ceil(total / PLANS_PER_PAGE)),
  };
}

export type PlanListItem = Awaited<ReturnType<typeof listPlans>>['plans'][number];

/**
 * A single plan with everything the detail page renders.
 *
 * Returns null for an unknown slug AND for an unpublished one — a caller must not
 * be able to distinguish "no such plan" from "not published yet", because that
 * distinction leaks the existence of unreleased content.
 *
 * Children are ordered here, in the query, rather than in the component. Steps
 * out of order are not a styling bug; they are wrong instructions.
 */
export async function getPlanBySlug(slug: string) {
  return prisma.plan.findFirst({
    where: { slug, published: true },
    include: {
      category: true,
      tools: {
        include: { tool: true },
        // Essential tools first — that's the question a maker is actually asking
        // ("can I build this?"), so it should not require scanning a list.
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

/**
 * Full-text keyword search — Sprint 4.
 *
 * Searches title, summary, tags, tools, materials, description, and step bodies,
 * per BUSINESS_PLAN.md §4.5, and ranks results by weighted relevance (see the
 * weights in prisma/seed.ts).
 *
 * WHY RAW SQL: Prisma has no tsvector support. This is the one place in the
 * codebase that drops to SQL, and it is the reason BUILD_PLAN.md §3 chose
 * Postgres over MongoDB in the first place.
 *
 * SECURITY — two things carry the weight here:
 *
 *   1. The query is PARAMETERIZED. `$queryRaw` is a tagged template: Prisma sends
 *      `${query}` as a bound parameter, never as concatenated SQL. It is not
 *      string interpolation, despite looking like it. `$queryRawUnsafe` would be
 *      an injection hole; it is not used, here or anywhere.
 *
 *   2. `websearch_to_tsquery` is used, NOT `to_tsquery`. `to_tsquery` throws a
 *      syntax error on ordinary human input — an unbalanced quote, a stray `&`,
 *      the word "and" — which would turn a typo into a 500. `websearch_to_tsquery`
 *      parses Google-style input ("walnut -oak", quoted phrases) and never throws.
 *      Users type strange things into search boxes; that must not be an outage.
 *
 * And, as everywhere in this file: `published = true`. Search must not be a
 * back door into staged content that browse won't show.
 */
export async function searchPlans({
  query,
  page = 1,
}: {
  query: string;
  page?: number;
}) {
  const trimmed = query.trim();

  // An empty search is not a search — it is the catalog. Falling through to
  // listPlans keeps one code path for "show me everything".
  if (trimmed === '') {
    return { ...(await listPlans({ page })), query: '' };
  }

  const currentPage = Math.max(1, Math.floor(page));
  const skip = (currentPage - 1) * PLANS_PER_PAGE;

  // Two-step: rank ids in SQL, then hydrate through Prisma's typed client.
  // Doing the hydration in raw SQL would mean hand-writing the joins for
  // category and images and losing the `published` filter's single source of
  // truth. This keeps the raw SQL to exactly what only SQL can do.
  const ranked = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
    SELECT id, ts_rank("searchVector", websearch_to_tsquery('english', ${trimmed})) AS rank
    FROM "Plan"
    WHERE published = true
      AND "searchVector" @@ websearch_to_tsquery('english', ${trimmed})
    ORDER BY rank DESC, title ASC
    LIMIT ${PLANS_PER_PAGE}
    OFFSET ${skip}
  `;

  const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*) AS count
    FROM "Plan"
    WHERE published = true
      AND "searchVector" @@ websearch_to_tsquery('english', ${trimmed})
  `;

  const total = Number(totalRows[0]?.count ?? 0);
  const ids = ranked.map((r) => r.id);

  if (ids.length === 0) {
    return {
      plans: [],
      total,
      page: currentPage,
      totalPages: Math.max(1, Math.ceil(total / PLANS_PER_PAGE)),
      query: trimmed,
    };
  }

  const plans = await prisma.plan.findMany({
    // `published: true` again — belt and braces. The ids came from a published-only
    // query, but this function must not depend on a caller's memory of that.
    where: { id: { in: ids }, published: true },
    select: PLAN_CARD_SELECT,
  });

  // findMany returns rows in whatever order Postgres likes. Restore relevance
  // order — an unranked list of search results is just a list.
  const byId = new Map(plans.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter((p) => p !== undefined);

  return {
    plans: ordered,
    total,
    page: currentPage,
    totalPages: Math.max(1, Math.ceil(total / PLANS_PER_PAGE)),
    query: trimmed,
  };
}

/**
 * Slugs for static generation / sitemap use.
 * Published only, for the same reason as everything else in this file.
 */
export async function listPublishedSlugs(): Promise<string[]> {
  const plans = await prisma.plan.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return plans.map((p) => p.slug);
}
