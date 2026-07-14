import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Plan views — Sprint 19. The data behind the Trending and Most Viewed sorts.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHAT A VIEW IS, AND WHAT IT IS NOT
 *
 * A row here means "a browser rendered this plan page." It carries NO user id — see
 * prisma/schema.prisma. The two sorts this feeds are counts, and a count does not
 * need to know who. A per-user view log is a browsing history, and this app has no
 * product reason to hold one.
 *
 * A view is therefore a SIGNAL, not an audited fact. It is approximate by design:
 *   - a no-JS visitor is never counted (the write is a client-triggered action),
 *   - an offline visitor reading a cached plan in a workshop is never counted,
 *   - a rate-limited visitor is never counted.
 * All three are fine. Nothing in the product is decided by a view count except the
 * order of a list, and a ranking signal is allowed to be lossy. What it must not be
 * is INFLATED — see below.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * WHY THE WRITE IS NOT IN THE PAGE RENDER (this is the whole design)
 *
 * The obvious move is to log the view in the plan page's server component, or in
 * Next's `after()`. Both would count things that are not views:
 *
 *   - **Prefetch.** `next/link` prefetches the RSC payload for every catalog card
 *     in the viewport. That RENDERS the page on the server. Logging in the render
 *     means hovering the catalog logs a view for every card on the page — and the
 *     Trending sort becomes "plans that happened to be near the top of the grid",
 *     which is a feedback loop that entrenches its own output.
 *   - **Crawlers.** A bot that never runs JS would fill the trending list.
 *
 * So the write happens from a client effect after hydration (see
 * src/components/view-logger.tsx), through a rate-limited server action. That
 * costs us the no-JS visitor and buys us a number that means something.
 */

/** Trending's window. 7 days — from BUILD_PLAN.md §4.1.1, Sprint 19. */
export const TRENDING_WINDOW_DAYS = 7;

/**
 * Records one view of a published plan.
 *
 * Takes a SLUG, not an id. The slug is what the URL already exposes; accepting an
 * id would mean accepting an opaque primary key from client input for no benefit.
 * Either way the row is only written after the plan is confirmed to exist and be
 * PUBLISHED — otherwise a caller could probe for staged content by watching which
 * ids "work". (They cannot: an unknown slug and an unpublished one both no-op, in
 * silence, identically.)
 */
export async function recordPlanView(slug: string): Promise<void> {
  if (typeof slug !== 'string' || slug === '') return;

  const plan = await prisma.plan.findFirst({
    where: { slug, published: true },
    select: { id: true },
  });

  if (!plan) return;

  await prisma.planView.create({ data: { planId: plan.id } });
}

/**
 * Published plan ids, ordered by view count DESC.
 *
 * `windowDays` — count only views newer than this (Trending). Omit for all-time
 * (Most Viewed). One query, two sorts: they differ by a WHERE clause, and writing
 * them as two functions would be two places for the tiebreak to drift.
 *
 * A LEFT JOIN, not an inner one: a plan with zero views must still appear in the
 * list. An inner join would silently DROP every unviewed plan from the catalog —
 * on day one, when the table is empty, that is the entire catalog. A sort that
 * hides plans is not a sort.
 *
 * THE TIEBREAK IS LOAD-BEARING. On a cold table every count is 0, so the tiebreak
 * IS the order: newest first, then title. Deterministic, so pagination doesn't
 * shuffle between pages, and defensible, because "trending" on a site with no
 * traffic yet honestly means "most recent".
 *
 * SECURITY: `$queryRaw` is a tagged template — the interval is a BOUND PARAMETER
 * via `make_interval`, never string-concatenated into SQL. `$queryRawUnsafe` is
 * not used anywhere in this codebase.
 */
export async function viewRankedPlanIds(windowDays?: number): Promise<string[]> {
  const windowClause =
    windowDays === undefined
      ? Prisma.empty
      : Prisma.sql`AND v."viewedAt" >= NOW() - make_interval(days => ${windowDays})`;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT p.id
    FROM "Plan" p
    LEFT JOIN "PlanView" v
      ON v."planId" = p.id
      ${windowClause}
    WHERE p.published = true
    GROUP BY p.id, p."publishedAt", p.title
    ORDER BY COUNT(v.id) DESC, p."publishedAt" DESC NULLS LAST, p.title ASC
  `;

  return rows.map((row) => row.id);
}

/** Trending: the last 7 days of views. */
export function trendingPlanIds(): Promise<string[]> {
  return viewRankedPlanIds(TRENDING_WINDOW_DAYS);
}

/** Most viewed: all time. */
export function mostViewedPlanIds(): Promise<string[]> {
  return viewRankedPlanIds();
}
