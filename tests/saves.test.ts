import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Sprint 6 — saves and collections. THE multi-tenancy sprint.
 *
 * This is the first time the app stores data owned by a *particular* user, which
 * makes IDOR (OWASP A01, Broken Access Control) the single most likely way it
 * leaks. So these tests are aimed squarely at one question:
 *
 *   Can user A read, modify, or delete user B's data?
 *
 * The defence has two halves, and both are asserted here:
 *
 *   1. NO FUNCTION TAKES A `userId`. The owner always comes from the verified
 *      session. There is no parameter to forge.
 *   2. EVERY WRITE IS SCOPED BY `userId` IN ITS WHERE CLAUSE — not just by row
 *      id. `delete({ where: { id } })` would let anyone who guesses a cuid delete
 *      anyone's save. `deleteMany({ where: { id, userId } })` affects zero rows
 *      instead, which is exactly right.
 */

const ALICE = { id: 'user_alice', clerkId: 'clerk_alice' };

const savedPlan = {
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
};
const collection = {
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  updateMany: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
};
const collectionPlan = { upsert: vi.fn(), deleteMany: vi.fn() };
const plan = { findFirst: vi.fn() };

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    savedPlan = savedPlan;
    collection = collection;
    collectionPlan = collectionPlan;
    plan = plan;
    user = { upsert: vi.fn() };
    $queryRaw = vi.fn();
  },
}));

const requireUser = vi.fn();
const getCurrentUser = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser, getCurrentUser }));

beforeEach(() => {
  vi.resetModules();
  for (const m of [savedPlan, collection, collectionPlan, plan]) {
    for (const fn of Object.values(m)) fn.mockReset();
  }
  requireUser.mockReset().mockResolvedValue(ALICE);
  getCurrentUser.mockReset().mockResolvedValue(ALICE);

  plan.findFirst.mockResolvedValue({ id: 'plan_1' });
  savedPlan.findUnique.mockResolvedValue({ id: 'saved_1' });
  collection.findFirst.mockResolvedValue({ id: 'col_1' });
  savedPlan.findMany.mockResolvedValue([]);
  collection.findMany.mockResolvedValue([]);
  savedPlan.count.mockResolvedValue(0);
});

describe('SECURITY: no function accepts a userId — there is nothing to forge', () => {
  it('every exported write function derives the owner from the session', async () => {
    const saves = await import('@/lib/saves');

    // If any of these ever grows a `userId` parameter, that is an IDOR bug and
    // this test is the tripwire. Arity is checked because it is the one property
    // an attacker cannot argue with.
    expect(saves.savePlan.length).toBe(1); // (planId)
    expect(saves.unsavePlan.length).toBe(1); // (planId)
    expect(saves.isPlanSaved.length).toBe(1); // (planId)
    expect(saves.createCollection.length).toBe(1); // (name)
    expect(saves.deleteCollection.length).toBe(1); // (collectionId)
    expect(saves.addPlanToCollection.length).toBe(2); // (planId, collectionId)
    expect(saves.removePlanFromCollection.length).toBe(2);
  });

  it('every function calls requireUser (or getCurrentUser) before touching data', async () => {
    const { savePlan, unsavePlan, listSavedPlans, listCollections } = await import(
      '@/lib/saves'
    );

    await savePlan('plan_1');
    await unsavePlan('plan_1');
    await listSavedPlans();
    await listCollections();

    expect(requireUser).toHaveBeenCalledTimes(4);
  });

  it('an anonymous caller cannot write — requireUser throws and nothing is touched', async () => {
    requireUser.mockRejectedValue(new Error('Unauthorized: no authenticated user'));

    const { savePlan } = await import('@/lib/saves');

    await expect(savePlan('plan_1')).rejects.toThrow(/Unauthorized/);
    expect(savedPlan.upsert).not.toHaveBeenCalled();
  });
});

describe('SECURITY: every write is scoped by userId, not just by row id', () => {
  it('unsavePlan uses deleteMany with userId — a guessed id deletes nothing', async () => {
    const { unsavePlan } = await import('@/lib/saves');
    await unsavePlan('plan_1');

    expect(savedPlan.deleteMany).toHaveBeenCalledWith({
      where: { planId: 'plan_1', userId: ALICE.id },
    });

    // A bare `delete({ where: { id } })` would be the IDOR — the mock does not
    // even expose `delete`, so if the implementation reached for it the call
    // would throw rather than silently delete a stranger's row.
    expect('delete' in savedPlan).toBe(false);
  });

  it('deleteCollection scopes by userId — Alice cannot delete Bob’s folder', async () => {
    const { deleteCollection } = await import('@/lib/saves');
    await deleteCollection('bobs_collection_id');

    expect(collection.deleteMany).toHaveBeenCalledWith({
      where: { id: 'bobs_collection_id', userId: ALICE.id },
    });
    // Affects zero rows for a stranger's id. Silent, and correct.
  });

  it('renameCollection scopes by userId — Alice cannot rename Bob’s folder', async () => {
    const { renameCollection } = await import('@/lib/saves');
    await renameCollection('bobs_collection_id', 'Pwned');

    expect(collection.updateMany).toHaveBeenCalledWith({
      where: { id: 'bobs_collection_id', userId: ALICE.id },
      data: { name: 'Pwned' },
    });
  });

  it('listSavedPlans scopes reads by userId', async () => {
    const { listSavedPlans } = await import('@/lib/saves');
    await listSavedPlans();

    expect(savedPlan.findMany.mock.calls[0]![0].where.userId).toBe(ALICE.id);
  });

  it('SECURITY: filtering by a stranger’s collection id returns nothing, not their contents', async () => {
    const { listSavedPlans } = await import('@/lib/saves');
    await listSavedPlans({ collectionId: 'bobs_collection' });

    const where = savedPlan.findMany.mock.calls[0]![0].where;

    // The saved plans are Alice's...
    expect(where.userId).toBe(ALICE.id);
    // ...AND the collection filter is *also* scoped to Alice. Without that second
    // scope, passing Bob's collection id would list Bob's plans.
    expect(where.collections.some.collection).toEqual({
      id: 'bobs_collection',
      userId: ALICE.id,
    });
  });

  it('removePlanFromCollection scopes BOTH sides by userId', async () => {
    const { removePlanFromCollection } = await import('@/lib/saves');
    await removePlanFromCollection('plan_1', 'col_1');

    const where = collectionPlan.deleteMany.mock.calls[0]![0].where;
    expect(where.collection).toEqual({ id: 'col_1', userId: ALICE.id });
    expect(where.savedPlan).toEqual({ planId: 'plan_1', userId: ALICE.id });
  });

  it('addPlanToCollection verifies BOTH ids belong to the caller before writing', async () => {
    const { addPlanToCollection } = await import('@/lib/saves');
    await addPlanToCollection('plan_1', 'col_1');

    expect(savedPlan.findUnique.mock.calls[0]![0].where).toEqual({
      userId_planId: { userId: ALICE.id, planId: 'plan_1' },
    });
    expect(collection.findFirst.mock.calls[0]![0].where).toEqual({
      id: 'col_1',
      userId: ALICE.id,
    });
  });

  it("SECURITY: adding to someone else's collection throws and writes nothing", async () => {
    collection.findFirst.mockResolvedValue(null); // not Alice's

    const { addPlanToCollection } = await import('@/lib/saves');

    await expect(addPlanToCollection('plan_1', 'bobs_col')).rejects.toThrow('Not found');
    expect(collectionPlan.upsert).not.toHaveBeenCalled();
  });

  it('SECURITY: the error does not reveal WHICH id was bad — no existence oracle', async () => {
    const { addPlanToCollection } = await import('@/lib/saves');

    const messageOf = async (planId: string, collectionId: string) => {
      try {
        await addPlanToCollection(planId, collectionId);
        return 'no error thrown';
      } catch (error) {
        return (error as Error).message;
      }
    };

    // Case 1: the plan isn't the caller's saved plan.
    savedPlan.findUnique.mockResolvedValue(null);
    collection.findFirst.mockResolvedValue({ id: 'col_1' });
    const badPlan = await messageOf('nope', 'col_1');

    // Case 2: the collection isn't the caller's.
    savedPlan.findUnique.mockResolvedValue({ id: 'saved_1' });
    collection.findFirst.mockResolvedValue(null);
    const badCollection = await messageOf('plan_1', 'nope');

    // Identical messages. Distinguishing them would confirm the existence of the
    // *other* id — a small oracle, but an oracle.
    expect(badPlan).toBe('Not found');
    expect(badCollection).toBe('Not found');
  });
});

describe('SECURITY: content leakage through saves', () => {
  it('refuses to save an UNPUBLISHED plan', async () => {
    // Otherwise a user could bookmark staged content by guessing a plan id, and
    // then see its title on their saved page forever — a content leak by another
    // route, straight past the published filter that guards browse and search.
    plan.findFirst.mockResolvedValue(null);

    const { savePlan } = await import('@/lib/saves');

    await expect(savePlan('staged_plan')).rejects.toThrow('Plan not found');
    expect(savedPlan.upsert).not.toHaveBeenCalled();
  });

  it('checks published:true, not merely that the plan exists', async () => {
    const { savePlan } = await import('@/lib/saves');
    await savePlan('plan_1');

    expect(plan.findFirst.mock.calls[0]![0].where).toEqual({
      id: 'plan_1',
      published: true,
    });
  });
});

describe('behaviour', () => {
  it('saving is idempotent — a double-tapped button cannot create two rows', async () => {
    const { savePlan } = await import('@/lib/saves');
    await savePlan('plan_1');

    // upsert on the [userId, planId] unique index. The DATABASE enforces this,
    // not the application layer's good intentions.
    expect(savedPlan.upsert.mock.calls[0]![0].where).toEqual({
      userId_planId: { userId: ALICE.id, planId: 'plan_1' },
    });
    expect(savedPlan.upsert.mock.calls[0]![0].update).toEqual({});
  });

  it('unsaving something not saved is a no-op, not an error', async () => {
    savedPlan.deleteMany.mockResolvedValue({ count: 0 });

    const { unsavePlan } = await import('@/lib/saves');

    // The user's intent — "I don't want this saved" — is satisfied either way.
    await expect(unsavePlan('never_saved')).resolves.toBeUndefined();
  });

  it('isPlanSaved returns false for an anonymous visitor rather than throwing', async () => {
    // It is called from the PUBLIC plan page. Throwing would 500 the page for
    // every logged-out visitor.
    getCurrentUser.mockResolvedValue(null);

    const { isPlanSaved } = await import('@/lib/saves');

    expect(await isPlanSaved('plan_1')).toBe(false);
    expect(savedPlan.findUnique).not.toHaveBeenCalled();
  });

  it('collection names are trimmed and rejected when empty', async () => {
    const { createCollection } = await import('@/lib/saves');

    await createCollection('  Gifts  ');
    expect(collection.upsert.mock.calls[0]![0].create.name).toBe('Gifts');

    await expect(createCollection('   ')).rejects.toThrow(/empty/);
  });

  it('rejects an absurdly long collection name', async () => {
    const { createCollection } = await import('@/lib/saves');
    await expect(createCollection('x'.repeat(61))).rejects.toThrow(/too long/);
  });

  it('creating a duplicate collection name is a no-op, not an error', async () => {
    // The user asked for a folder called Kitchen. Afterwards they have one.
    const { createCollection } = await import('@/lib/saves');
    await createCollection('Kitchen');

    expect(collection.upsert.mock.calls[0]![0].update).toEqual({});
  });

  it('deleting a collection does NOT unsave its plans', async () => {
    const { deleteCollection } = await import('@/lib/saves');
    await deleteCollection('col_1');

    // Only the Collection row is removed. The cascade hits CollectionPlan, never
    // SavedPlan. A folder delete that silently unsaved twelve plans would be a
    // destructive surprise, and nobody would trust folders again.
    expect(savedPlan.deleteMany).not.toHaveBeenCalled();
    expect(collection.deleteMany).toHaveBeenCalledOnce();
  });

  it('NO LIMIT is enforced on saves or collections (DECISIONS_LOG 2026-07-13)', async () => {
    // Pricing is unconfirmed and there is no billing, so a cap would be a wall
    // with no door. When a limit IS confirmed it goes in savePlan/createCollection
    // and nowhere else — every write already funnels through them.
    savedPlan.count.mockResolvedValue(9999);

    const { savePlan } = await import('@/lib/saves');
    await expect(savePlan('plan_1')).resolves.toBeUndefined();
    expect(savedPlan.upsert).toHaveBeenCalled();
  });
});
