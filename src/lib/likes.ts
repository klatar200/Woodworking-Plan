import { prisma } from '@/lib/db';
import { requireUser, getCurrentUser } from '@/lib/auth';

/**
 * Likes — Sprint 7. BUSINESS_PLAN.md §4.7.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SAME SECURITY RULE AS src/lib/saves.ts, and for the same reason:
 *
 *   NO FUNCTION HERE TAKES A `userId`.
 *
 * The owner comes only from the verified Clerk session. There is no parameter
 * through which a caller could like, or unlike, on someone else's behalf.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ON COUNTS: there is deliberately no `likeCount` column. Counts are computed on
 * read. See prisma/schema.prisma for the full reasoning — short version: a
 * derived column is a thing that can be created empty in production and silently
 * lie, which has already happened twice on this project.
 */

/**
 * Likes a plan for the signed-in user.
 *
 * Idempotent: `upsert` on the `[userId, planId]` unique index. A double-tapped
 * like button cannot create two rows or inflate the count.
 *
 * Refuses to like an unpublished plan — same reasoning as `savePlan()`. Liking
 * staged content would let a user confirm its existence, and would contribute a
 * like to a plan nobody is supposed to know about.
 */
export async function likePlan(planId: string): Promise<void> {
  const user = await requireUser();

  const plan = await prisma.plan.findFirst({
    where: { id: planId, published: true },
    select: { id: true },
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  await prisma.like.upsert({
    where: { userId_planId: { userId: user.id, planId } },
    create: { userId: user.id, planId },
    update: {},
  });
}

/**
 * Removes a like.
 *
 * `deleteMany` scoped by BOTH planId and userId — a bare `delete({ where: { id }})`
 * would let anyone who guesses a cuid remove someone else's like. This affects
 * zero rows for a stranger, which is silent and correct.
 *
 * Idempotent: unliking something not liked is a no-op, not an error.
 */
export async function unlikePlan(planId: string): Promise<void> {
  const user = await requireUser();

  await prisma.like.deleteMany({
    where: { planId, userId: user.id },
  });
}

/**
 * Has the signed-in user liked this plan?
 *
 * `getCurrentUser`, not `requireUser` — this is called from the PUBLIC plan page,
 * so an anonymous visitor gets `false` rather than an exception.
 */
export async function isPlanLiked(planId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const like = await prisma.like.findUnique({
    where: { userId_planId: { userId: user.id, planId } },
    select: { id: true },
  });

  return like !== null;
}

/**
 * How many people have liked this plan.
 *
 * Counted, not read from a column. Public — a like count is not private
 * information, and BUSINESS_PLAN.md §4.7 exists precisely so the community
 * signal is visible.
 */
export async function countPlanLikes(planId: string): Promise<number> {
  return prisma.like.count({ where: { planId } });
}
