import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Sprint 2 auth tests.
 *
 * These target the two things that actually cause auth breaches, rather than
 * re-testing Clerk (which is a vendor's job, and the reason we bought auth
 * instead of building it — BUILD_PLAN.md §3, decision #5):
 *
 *   1. Is the current user ALWAYS derived from the verified session, and never
 *      from client-supplied input? (Broken Access Control — OWASP A01.)
 *   2. Do protected routes actually fail closed?
 */

const authFn = vi.fn();
const currentUserFn = vi.fn();
const userUpsert = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: authFn,
  currentUser: currentUserFn,
  createRouteMatcher: (routes: string[]) => {
    // Mirrors Clerk's behaviour closely enough to test our allowlist: exact match,
    // or prefix match for a `(.*)` catch-all.
    const patterns = routes.map((r) => r.replace('(.*)', ''));
    return (req: { nextUrl: { pathname: string } }) =>
      routes.some((route, i) => {
        const base = patterns[i]!;
        return route.endsWith('(.*)')
          ? req.nextUrl.pathname.startsWith(base)
          : req.nextUrl.pathname === base;
      });
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    user = { upsert: userUpsert };
    $queryRaw = vi.fn();
  },
}));

const CLERK_USER = {
  primaryEmailAddress: { emailAddress: 'keagan@example.com' },
  firstName: 'Keagan',
  lastName: 'Latarewicz',
  username: null,
  imageUrl: 'https://img.clerk.com/abc',
};

const DB_USER = {
  id: 'usr_local_1',
  clerkId: 'user_clerk_123',
  email: 'keagan@example.com',
  displayName: 'Keagan Latarewicz',
  imageUrl: 'https://img.clerk.com/abc',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

beforeEach(() => {
  vi.resetModules();
  authFn.mockReset();
  currentUserFn.mockReset();
  userUpsert.mockReset();
  userUpsert.mockResolvedValue(DB_USER);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getCurrentUser', () => {
  it('returns null when there is no session — anonymous visitors have no user', async () => {
    authFn.mockResolvedValue({ userId: null });

    const { getCurrentUser } = await import('@/lib/auth');
    expect(await getCurrentUser()).toBeNull();
    // Must not touch the database for an anonymous request.
    expect(userUpsert).not.toHaveBeenCalled();
  });

  it('returns null when Clerk has a session id but no user record', async () => {
    authFn.mockResolvedValue({ userId: 'user_clerk_123' });
    currentUserFn.mockResolvedValue(null);

    const { getCurrentUser } = await import('@/lib/auth');
    expect(await getCurrentUser()).toBeNull();
    expect(userUpsert).not.toHaveBeenCalled();
  });

  it('creates the local User row on first authenticated request', async () => {
    authFn.mockResolvedValue({ userId: 'user_clerk_123' });
    currentUserFn.mockResolvedValue(CLERK_USER);

    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();

    expect(user).toEqual(DB_USER);
    expect(userUpsert).toHaveBeenCalledOnce();

    const arg = userUpsert.mock.calls[0]![0];
    expect(arg.where).toEqual({ clerkId: 'user_clerk_123' });
    expect(arg.create.clerkId).toBe('user_clerk_123');
    expect(arg.create.email).toBe('keagan@example.com');
    expect(arg.create.displayName).toBe('Keagan Latarewicz');
  });

  it('is idempotent — it upserts, so repeat requests cannot duplicate the user', async () => {
    authFn.mockResolvedValue({ userId: 'user_clerk_123' });
    currentUserFn.mockResolvedValue(CLERK_USER);

    const { getCurrentUser } = await import('@/lib/auth');
    await getCurrentUser();
    await getCurrentUser();
    await getCurrentUser();

    expect(userUpsert).toHaveBeenCalledTimes(3);
    // Every call keys on the same unique clerkId — Postgres enforces one row.
    for (const call of userUpsert.mock.calls) {
      expect(call[0].where).toEqual({ clerkId: 'user_clerk_123' });
    }
  });

  it('refreshes cached display fields, so a name change in Clerk is not stale forever', async () => {
    authFn.mockResolvedValue({ userId: 'user_clerk_123' });
    currentUserFn.mockResolvedValue({ ...CLERK_USER, firstName: 'Keg' });

    const { getCurrentUser } = await import('@/lib/auth');
    await getCurrentUser();

    expect(userUpsert.mock.calls[0]![0].update.displayName).toBe('Keg Latarewicz');
  });

  it('falls back to username, then null, when the user has no real name set', async () => {
    authFn.mockResolvedValue({ userId: 'user_clerk_123' });
    currentUserFn.mockResolvedValue({
      ...CLERK_USER,
      firstName: null,
      lastName: null,
      username: 'sawdust_dan',
    });

    const { getCurrentUser } = await import('@/lib/auth');
    await getCurrentUser();

    expect(userUpsert.mock.calls[0]![0].create.displayName).toBe('sawdust_dan');
  });

  it('SECURITY: the clerkId comes from the session, NOT from any caller input', async () => {
    // The signature takes no arguments at all — there is no way for a caller to
    // ask "give me user X". That is the whole defence against IDOR here, so it is
    // worth asserting rather than assuming.
    const { getCurrentUser } = await import('@/lib/auth');
    expect(getCurrentUser.length).toBe(0);

    authFn.mockResolvedValue({ userId: 'user_session_owner' });
    currentUserFn.mockResolvedValue(CLERK_USER);

    // Even called with a forged id, it is ignored — the session wins.
    await (getCurrentUser as unknown as (id: string) => Promise<unknown>)(
      'user_victim_999',
    );

    expect(userUpsert.mock.calls[0]![0].where).toEqual({
      clerkId: 'user_session_owner',
    });
  });
});

describe('requireUser', () => {
  it('throws for an anonymous request — protected data access fails CLOSED', async () => {
    authFn.mockResolvedValue({ userId: null });

    const { requireUser } = await import('@/lib/auth');
    await expect(requireUser()).rejects.toThrow(/Unauthorized/);
  });

  it('returns the user when a session exists', async () => {
    authFn.mockResolvedValue({ userId: 'user_clerk_123' });
    currentUserFn.mockResolvedValue(CLERK_USER);

    const { requireUser } = await import('@/lib/auth');
    expect(await requireUser()).toEqual(DB_USER);
  });
});

describe('public route allowlist', () => {
  const check = async (pathname: string) => {
    const { isPublicRoute } = await import('@/lib/public-routes');
    return isPublicRoute({ nextUrl: { pathname } } as never);
  };

  it('allows the routes an anonymous visitor legitimately needs', async () => {
    expect(await check('/')).toBe(true);
    expect(await check('/sign-in')).toBe(true);
    expect(await check('/sign-up')).toBe(true);
    expect(await check('/api/health')).toBe(true);
  });

  it("allows Clerk's own sub-steps under the auth catch-alls", async () => {
    expect(await check('/sign-in/factor-two')).toBe(true);
    expect(await check('/sign-up/verify-email-address')).toBe(true);
  });

  it('SECURITY: /profile is NOT public', async () => {
    expect(await check('/profile')).toBe(false);
  });

  it('SECURITY: unknown/future routes are private by default — the allowlist fails CLOSED', async () => {
    // This is the property that matters. A route nobody has thought of yet must
    // require auth, so that forgetting to update the matcher can never silently
    // expose data.
    expect(await check('/saved')).toBe(false);
    expect(await check('/api/plans/my-saves')).toBe(false);
    expect(await check('/admin')).toBe(false);
    expect(await check('/billing')).toBe(false);
    expect(await check('/some/route/invented/next/year')).toBe(false);
  });

  it('SECURITY: a path merely CONTAINING a public route is not public', async () => {
    // Guards against a sloppy substring matcher: /evil/sign-in must not be public.
    expect(await check('/evil/sign-in')).toBe(false);
    expect(await check('/api/health/../admin')).toBe(false);
  });
});
