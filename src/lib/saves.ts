import { prisma } from '@/lib/db';
import { requireUser, getCurrentUser } from '@/lib/auth';

/**
 * Saved plans and user collections — Sprint 6.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE SECURITY RULE FOR THIS ENTIRE FILE — read before adding anything:
 *
 *   NO FUNCTION HERE TAKES A `userId`.
 *
 * Every function calls `requireUser()` itself and derives the owner from the
 * verified Clerk session. There is no parameter through which a caller — a page,
 * a server action, or an attacker crafting a request — could ask to operate on
 * someone else's data.
 *
 * This is not a style preference. It is the entire defence against IDOR (OWASP
 * A01, Broken Access Control), which is the single most likely way this app
 * leaks one user's data to another. The moment a signature reads
 * `unsavePlan(userId, planId)`, an attacker just passes a different userId.
 *
 * Corollary, equally important: every WRITE is scoped by `userId` in its WHERE
 * clause, not just by row id. `delete({ where: { id } })` would let anyone who
 * guesses a cuid delete anyone's save. `deleteMany({ where: { id, userId } })`
 * cannot — it silently affects zero rows, which is exactly right.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ON LIMITS: there are none. BUSINESS_PLAN.md §7 proposes gating Free users at
 * ~10 saves and 1 collection, but pricing is an unconfirmed recommendation (see
 * DECISIONS_LOG.md, 2026-07-13). When a limit is confirmed, it goes in
 * `savePlan()` and `createCollection()` — these two functions — and nowhere
 * else. Every write path already funnels through them, which is what makes that
 * possible.
 */

/** The fields a saved-plan card renders. */
const SAVED_PLAN_SELECT = {
  id: true,
  createdAt: true,
  plan: {
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
      // Sprint 7: the card shows a like count, so a saved-plan card needs it too.
      // Counted, never a denormalized column — see prisma/schema.prisma.
      _count: { select: { likes: true } },
    },
  },
  collections: {
    select: { collection: { select: { id: true, name: true } } },
  },
} as const;

// ─────────────────────────────── saves ───────────────────────────────

/**
 * Bookmarks a plan for the signed-in user.
 *
 * Idempotent by construction: `upsert` on the `[userId, planId]` unique index
 * means a double-tapped save button cannot create two rows, and a re-save is a
 * no-op rather than an error.
 *
 * Refuses to save an unpublished plan. Otherwise a user could bookmark staged
 * content by guessing a plan id — and then see its title forever on their saved
 * page, which is a content leak by another route.
 */
export async function savePlan(planId: string): Promise<void> {
  const user = await requireUser();

  // NOT `findUnique({ id })` — the `published` check is the point.
  const plan = await prisma.plan.findFirst({
    where: { id: planId, published: true },
    select: { id: true },
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  // ⬇ WHEN A FREE-TIER SAVE LIMIT IS CONFIRMED, IT GOES HERE. Nowhere else.

  await prisma.savedPlan.upsert({
    where: { userId_planId: { userId: user.id, planId } },
    create: { userId: user.id, planId },
    update: {},
  });
}

/**
 * Removes a bookmark.
 *
 * `deleteMany` with BOTH planId and userId, deliberately. A `delete({ where: {
 * id } })` on the SavedPlan row would let anyone who guesses a cuid delete
 * someone else's save. This affects zero rows for a stranger, which is correct
 * and silent.
 *
 * Idempotent: unsaving something that isn't saved is a no-op, not an error. The
 * user's intent ("I don't want this saved") is satisfied either way.
 */
export async function unsavePlan(planId: string): Promise<void> {
  const user = await requireUser();

  await prisma.savedPlan.deleteMany({
    where: { planId, userId: user.id },
  });
}

/**
 * Is this plan saved by the signed-in user?
 *
 * Uses `getCurrentUser` (not `requireUser`) because this is called from the
 * PUBLIC plan detail page — an anonymous visitor gets `false`, not an exception.
 */
export async function isPlanSaved(planId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const saved = await prisma.savedPlan.findUnique({
    where: { userId_planId: { userId: user.id, planId } },
    select: { id: true },
  });

  return saved !== null;
}

/**
 * The signed-in user's saved plans, newest first.
 *
 * Optionally narrowed to one collection — and note the collection filter is
 * *also* scoped by userId, so passing someone else's collection id returns
 * nothing rather than their contents.
 */
export async function listSavedPlans({
  collectionId,
}: { collectionId?: string } = {}) {
  const user = await requireUser();

  return prisma.savedPlan.findMany({
    where: {
      userId: user.id,
      ...(collectionId
        ? {
            collections: {
              some: {
                collection: { id: collectionId, userId: user.id },
              },
            },
          }
        : {}),
    },
    select: SAVED_PLAN_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

export type SavedPlanItem = Awaited<ReturnType<typeof listSavedPlans>>[number];

/** How many plans the user has saved. */
export async function countSavedPlans(): Promise<number> {
  const user = await requireUser();
  return prisma.savedPlan.count({ where: { userId: user.id } });
}

// ──────────────────────────── collections ────────────────────────────

/**
 * Creates a user-named folder.
 *
 * Names are unique per user, not globally — two people may both have a "Kitchen"
 * folder, obviously. A duplicate is a no-op rather than an error: the user asked
 * for a folder called Kitchen, and afterwards they have one.
 */
export async function createCollection(name: string): Promise<void> {
  const user = await requireUser();

  const trimmed = name.trim();
  if (trimmed === '') {
    throw new Error('Collection name cannot be empty');
  }
  if (trimmed.length > 60) {
    throw new Error('Collection name is too long');
  }

  // ⬇ WHEN A FREE-TIER COLLECTION LIMIT IS CONFIRMED, IT GOES HERE.

  await prisma.collection.upsert({
    where: { userId_name: { userId: user.id, name: trimmed } },
    create: { userId: user.id, name: trimmed },
    update: {},
  });
}

/**
 * Deletes a folder. The saved plans inside SURVIVE — only the grouping is
 * removed (the cascade is on CollectionPlan, not on SavedPlan).
 *
 * Deleting a folder called "Gifts" must not silently unsave twelve plans. That
 * would be a destructive surprise, and users would rightly never trust folders
 * again.
 */
export async function deleteCollection(collectionId: string): Promise<void> {
  const user = await requireUser();

  // userId in the WHERE — a stranger's id affects zero rows.
  await prisma.collection.deleteMany({
    where: { id: collectionId, userId: user.id },
  });
}

export async function renameCollection(
  collectionId: string,
  name: string,
): Promise<void> {
  const user = await requireUser();

  const trimmed = name.trim();
  if (trimmed === '' || trimmed.length > 60) {
    throw new Error('Invalid collection name');
  }

  await prisma.collection.updateMany({
    where: { id: collectionId, userId: user.id },
    data: { name: trimmed },
  });
}

/** The signed-in user's folders, with a count of what's in each. */
export async function listCollections() {
  const user = await requireUser();

  return prisma.collection.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      _count: { select: { plans: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export type CollectionItem = Awaited<ReturnType<typeof listCollections>>[number];

/**
 * Puts a saved plan into a folder.
 *
 * BOTH ids are verified to belong to the signed-in user before anything is
 * written. Trusting either one would let an attacker file someone else's saved
 * plan into their own folder — or worse, discover that a given id exists.
 */
export async function addPlanToCollection(
  planId: string,
  collectionId: string,
): Promise<void> {
  const user = await requireUser();

  const [savedPlan, collection] = await Promise.all([
    prisma.savedPlan.findUnique({
      where: { userId_planId: { userId: user.id, planId } },
      select: { id: true },
    }),
    prisma.collection.findFirst({
      where: { id: collectionId, userId: user.id },
      select: { id: true },
    }),
  ]);

  // Deliberately one indistinguishable error. Telling the caller *which* id was
  // bad would confirm the existence of the other — a small oracle, but an oracle.
  if (!savedPlan || !collection) {
    throw new Error('Not found');
  }

  await prisma.collectionPlan.upsert({
    where: {
      collectionId_savedPlanId: {
        collectionId: collection.id,
        savedPlanId: savedPlan.id,
      },
    },
    create: { collectionId: collection.id, savedPlanId: savedPlan.id },
    update: {},
  });
}

/** Removes a plan from a folder. The save itself survives. */
export async function removePlanFromCollection(
  planId: string,
  collectionId: string,
): Promise<void> {
  const user = await requireUser();

  await prisma.collectionPlan.deleteMany({
    where: {
      // Both sides scoped to the session user. A stranger's ids match nothing.
      collection: { id: collectionId, userId: user.id },
      savedPlan: { planId, userId: user.id },
    },
  });
}
