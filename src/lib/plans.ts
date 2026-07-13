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
      select: {
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
      },
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
