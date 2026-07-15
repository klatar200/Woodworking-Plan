import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

/**
 * Build logs — "My builds" (Sprint 27). BUSINESS_PLAN.md §10 (Phase 4, build logs),
 * deliberately cut down: NO forums, NO comments, NO user-to-user surface.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DERIVED, NOT STORED — the fourth feature in a row to refuse a new table.
 *
 * A build IS a review. You reviewed a plan ⇒ you built it. That is the Sprint 16 rule
 * (see src/lib/paths.ts, prisma/schema.prisma: no `PathProgress`, no `completed` column),
 * and it is the whole reason this file adds ZERO schema. `Review` and `BuildPhoto`
 * (Sprint 10) already are the truth; "My builds" is just a second READING of them, keyed
 * on the author instead of the plan. Nothing to backfill, nothing that can drift.
 *
 * The accepted cost is the same one paths already pay: someone who builds a plan and
 * never reviews it does not appear here. A real gap, a fair price for no drift — and if
 * it ever matters, an explicit "mark as built" table is a clean follow-on that needs no
 * data migration precisely because nothing was stored.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SECURITY — same rule as saves.ts / reviews.ts / workshop.ts:
 *
 *   NO FUNCTION HERE TAKES A `userId`.
 *
 * The owner is the verified Clerk session, always. There is no parameter through which a
 * caller could ask for someone else's build log — which, unlike a public review list, is
 * a per-person view and must never be addressable by another user's id. The list is also
 * scoped to `published: true` plans in the WHERE, so a plan pulled from the catalog after
 * a build was logged silently drops off the log rather than surfacing staged content.
 */

/**
 * The fields the "My builds" view renders per build.
 *
 * Note what is NOT selected: no `userId` on the review (it's always the session user),
 * and no identity fields on the plan. A build-log row carries only what the card shows.
 */
const MY_BUILD_SELECT = {
  id: true,
  rating: true,
  body: true,
  createdAt: true,
  photos: {
    select: { id: true, url: true, alt: true, width: true, height: true },
  },
  plan: {
    select: {
      slug: true,
      title: true,
      category: { select: { slug: true, name: true } },
    },
  },
} as const;

export type MyBuild = Awaited<ReturnType<typeof listMyBuilds>>[number];

/**
 * The signed-in user's build log — every plan they've reviewed, newest first.
 *
 * `requireUser()`: /builds is a PRIVATE route (off the allowlist, fails closed), so an
 * anonymous request never reaches this — a session is guaranteed. The owner is derived
 * here, not passed in.
 *
 * Ordered by the review's `createdAt` (when the build was logged), not the plan's — a
 * build log is a timeline of what you made, in the order you recorded making it.
 */
export async function listMyBuilds() {
  const user = await requireUser();

  return prisma.review.findMany({
    where: { userId: user.id, plan: { published: true } },
    select: MY_BUILD_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * ON THE "N built this" PLAN-PAGE COUNT (Sprint 27): it is NOT computed here.
 *
 * A build is a review, so the build count is the review count — the exact number
 * `getRatingSummary()` (src/lib/reviews.ts) already returns as `.count`, which the plan
 * page already fetches. Adding a `getBuildCount()` here would be a second query for a
 * number we already hold, and Sprint 9 spent effort deleting redundant queries, not
 * adding them. The plan page reads it through the "built" lens off the rating summary.
 * This note exists so the next reader does not "helpfully" add the missing function.
 */
