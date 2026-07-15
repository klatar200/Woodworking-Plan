import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Build logs — "My builds" (Sprint 27).
 *
 * THE PROPERTIES THAT MATTER — the same shape every read in this codebase must hold:
 *
 *   1. `listMyBuilds` TAKES NO ARGUMENTS. The owner is the verified session, always.
 *      Asserted by ARITY — a signature that ever grows a `userId` turns this red. A
 *      build log is a per-person timeline, so an addressable-by-id version would be an
 *      IDOR far worse than the public per-plan review list.
 *   2. THE QUERY IS SCOPED BY THE SESSION USER, and to `published: true` plans — so a
 *      plan pulled from the catalog after a build was logged drops off the log rather
 *      than leaking staged content through it.
 *   3. NEWEST FIRST — a build log is a timeline of what you made.
 */

const review = {
  findMany: vi.fn(),
};

const requireUser = vi.fn();

vi.mock('@/lib/db', () => ({ prisma: { review } }));
vi.mock('@/lib/auth', () => ({ requireUser }));

const ALICE = { id: 'user_alice' };

beforeEach(() => {
  vi.resetModules();
  review.findMany.mockReset();
  requireUser.mockReset();
  requireUser.mockResolvedValue(ALICE);
  review.findMany.mockResolvedValue([]);
});

describe('IDOR TRIPWIRE: listMyBuilds accepts no userId', () => {
  it('takes zero arguments — the owner is the session, never a parameter', async () => {
    const { listMyBuilds } = await import('@/lib/builds');
    expect(listMyBuilds.length).toBe(0);
  });
});

describe('OWNER + PUBLISHED SCOPING', () => {
  it('scopes the query by the session user AND published plans', async () => {
    const { listMyBuilds } = await import('@/lib/builds');
    await listMyBuilds();

    expect(requireUser).toHaveBeenCalledOnce();
    expect(review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_alice', plan: { published: true } },
      }),
    );
  });

  it('never passes a raw plan-id or userId that a caller could have forged', async () => {
    const { listMyBuilds } = await import('@/lib/builds');
    await listMyBuilds();

    // The userId in the WHERE is the one requireUser returned — not anything a caller
    // supplied (listMyBuilds has no parameters to supply it through).
    const arg = review.findMany.mock.calls[0]![0];
    expect(arg.where.userId).toBe('user_alice');
  });
});

describe('ORDERING: a build log is a timeline', () => {
  it('orders by the review createdAt, newest first', async () => {
    const { listMyBuilds } = await import('@/lib/builds');
    await listMyBuilds();

    expect(review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });
});

describe('SELECT: no identity fields leak into a build row', () => {
  it('selects plan display fields and photos, but no user identity', async () => {
    const { listMyBuilds } = await import('@/lib/builds');
    await listMyBuilds();

    const select = review.findMany.mock.calls[0]![0].select;
    // What the card needs.
    expect(select.rating).toBe(true);
    expect(select.photos).toBeTruthy();
    expect(select.plan.select.slug).toBe(true);
    // What it must NOT carry: the review's userId (always the session user) has no
    // business being shipped to the view, and there is no user relation selected at all.
    expect(select.userId).toBeUndefined();
    expect(select.user).toBeUndefined();
  });
});
