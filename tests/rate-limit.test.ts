import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Rate limiting.
 *
 * The properties worth asserting are not "does it count to 30". They are the
 * design decisions — each of which is the kind of thing a future refactor would
 * quietly get backwards:
 *
 *   1. It NEVER THROWS. A denied request returns false; the action does no work
 *      and redirects with a notice (a framework-handled 303, not an exception).
 *   2. It FAILS OPEN when the store is unreachable.
 *   3. It identifies by SESSION USER first, IP only as a fallback.
 *   4. It runs BEFORE any database work.
 *   5. It is a no-op when unconfigured (so tests and bare local dev still run).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * (1) IS HERE BECAUSE THE FIRST VERSION OF THIS FILE ASSERTED THE OPPOSITE.
 *
 * It asserted `rejects.toBeInstanceOf(RateLimitError)` — and it PASSED, and the
 * throw it was proving took production down. An uncaught throw out of a server
 * action is an unhandled server exception: HTTP 500, and the browser renders the
 * global error boundary ("Application error: a server-side exception has
 * occurred"). Vercel logged it plainly:
 *
 *     POST 500 /plans/cedar-raised-garden-bed
 *     Error [RateLimitError]: Too many requests. Please slow down...
 *
 * The limiter worked exactly as tested, and the page crashed anyway.
 *
 * A green test proved the code did what I wrote. It could not tell me that what
 * I wrote was the wrong thing to want. Tests must assert the behaviour the APP
 * needs, not the behaviour the implementation happens to have.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const limit = vi.fn();
const getCurrentUser = vi.fn();
const headersGet = vi.fn();

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn(() => 'sliding-window');
    limit = limit;
  },
}));

vi.mock('@upstash/redis', () => ({ Redis: class {} }));

vi.mock('@/lib/auth', () => ({ getCurrentUser }));

vi.mock('next/headers', () => ({
  headers: async () => ({ get: headersGet }),
}));

const configure = () => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');
};

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  limit.mockReset().mockResolvedValue({ success: true });
  getCurrentUser.mockReset().mockResolvedValue({ id: 'user_alice' });
  headersGet.mockReset().mockReturnValue(null);
});

describe('configuration', () => {
  it('is a no-op when Upstash is not configured — tests and bare local dev still run', async () => {
    const { checkRateLimit, isRateLimitEnabled } = await import('@/lib/rate-limit');

    expect(isRateLimitEnabled()).toBe(false);
    await expect(checkRateLimit('toggle')).resolves.toBe(true);
    expect(limit).not.toHaveBeenCalled();
  });

  it('is enabled once both env vars are present', async () => {
    configure();
    const { isRateLimitEnabled } = await import('@/lib/rate-limit');
    expect(isRateLimitEnabled()).toBe(true);
  });
});

describe('identity — session user first, IP only as fallback', () => {
  it('keys on the SESSION USER when there is one', async () => {
    configure();
    const { checkRateLimit } = await import('@/lib/rate-limit');
    await checkRateLimit('toggle');

    // NOT the IP. Keying on IP alone punishes everyone behind a shared NAT — an
    // office, a campus, a carrier's CGNAT — for one person's behaviour. And an
    // attacker rotates IPs trivially anyway.
    expect(limit).toHaveBeenCalledWith('u:user_alice');
  });

  it('falls back to IP for an anonymous caller', async () => {
    // An unauthenticated POST straight to a server-action id is exactly what an
    // attacker would try. It must land in SOME bucket rather than none.
    configure();
    getCurrentUser.mockResolvedValue(null);
    headersGet.mockReturnValue('203.0.113.7');

    const { checkRateLimit } = await import('@/lib/rate-limit');
    await checkRateLimit('toggle');

    expect(limit).toHaveBeenCalledWith('ip:203.0.113.7');
  });

  it('SECURITY: takes the FIRST x-forwarded-for entry, not the last', async () => {
    // The header is a proxy chain. A client can append whatever it likes to the
    // END of it, so trusting the last entry lets an attacker pick their own bucket
    // — and therefore evade the limit entirely.
    configure();
    getCurrentUser.mockResolvedValue(null);
    headersGet.mockReturnValue('203.0.113.7, 10.0.0.1, 172.16.0.1');

    const { checkRateLimit } = await import('@/lib/rate-limit');
    await checkRateLimit('toggle');

    expect(limit).toHaveBeenCalledWith('ip:203.0.113.7');
  });

  it('buckets an unidentifiable caller rather than letting them through unbucketed', async () => {
    configure();
    getCurrentUser.mockResolvedValue(null);
    headersGet.mockReturnValue(null);

    const { checkRateLimit } = await import('@/lib/rate-limit');
    await checkRateLimit('toggle');

    expect(limit).toHaveBeenCalledWith('ip:unknown');
  });
});

describe('enforcement', () => {
  it('returns false when the limit is exceeded', async () => {
    configure();
    limit.mockResolvedValue({ success: false });

    const { checkRateLimit } = await import('@/lib/rate-limit');

    await expect(checkRateLimit('toggle')).resolves.toBe(false);
  });

  it('REGRESSION: it RESOLVES when denied — it does not reject', async () => {
    // The production bug, in one assertion. `.resolves` fails the test outright if
    // the promise rejects, so this is a real assertion and not a property access
    // (`.resolves.not.toThrow` would be the latter — it passes on anything).
    configure();
    limit.mockResolvedValue({ success: false });

    const { checkRateLimit } = await import('@/lib/rate-limit');

    await expect(checkRateLimit('toggle')).resolves.toBe(false);
    await expect(checkRateLimit('create')).resolves.toBe(false);
  });

  it('allows a request under the limit', async () => {
    configure();
    const { checkRateLimit } = await import('@/lib/rate-limit');
    await expect(checkRateLimit('toggle')).resolves.toBe(true);
  });
});

describe('FAILS OPEN — the decision this module lives or dies on', () => {
  it('ALLOWS the request when the store is unreachable', async () => {
    configure();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    limit.mockRejectedValue(new Error('ECONNREFUSED'));

    const { checkRateLimit } = await import('@/lib/rate-limit');

    // This is an ABUSE control, not an AUTHORIZATION control. Authorization is
    // requireUser(), and it fails CLOSED. If the limiter failed closed too, an
    // Upstash outage would take the entire app down — trading a real availability
    // incident for a hypothetical abuse one. That is the wrong trade, and it is a
    // decision, not an oversight.
    await expect(checkRateLimit('toggle')).resolves.toBe(true);
  });

  it('logs the outage rather than swallowing it silently', async () => {
    configure();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    limit.mockRejectedValue(new Error('ECONNREFUSED'));

    const { checkRateLimit } = await import('@/lib/rate-limit');
    await checkRateLimit('toggle');

    // Failing open silently would mean nobody ever finds out the limiter is dead.
    expect(warn).toHaveBeenCalled();
  });

  it('a DENIAL is not confused with an OUTAGE — the two must not collapse', async () => {
    // The catch is for STORE failures, which mean "allow". A denial means "deny".
    // If the two ever collapse into one path, the limiter blocks nothing and looks
    // exactly like working code.
    configure();
    limit.mockResolvedValue({ success: false });

    const { checkRateLimit } = await import('@/lib/rate-limit');

    await expect(checkRateLimit('create')).resolves.toBe(false);
  });
});

describe('buckets', () => {
  it('separates cheap toggles from row-creating writes', async () => {
    configure();
    const { checkRateLimit } = await import('@/lib/rate-limit');

    await checkRateLimit('toggle');
    await checkRateLimit('create');

    // Both go through, but through different limiters — a like is idempotent and
    // cheap; a collection is a row that persists and that a human has to look at
    // if it turns out to be spam.
    expect(limit).toHaveBeenCalledTimes(2);
  });
});

/**
 * The actions themselves. This is the layer the production bug actually lived at:
 * `checkRateLimit` can be perfect and the app still 500s if its CALLER throws.
 *
 * Since 2026-07-14 a denial is no longer SILENT: the action `redirect()`s back
 * with `?notice=slow-down` (see src/lib/rate-limit-feedback.ts). These tests use
 * the REAL next/navigation, so a denial rejects with the framework's
 * NEXT_REDIRECT control-flow signal — which Next turns into a 303, NOT a 500.
 * What must still never escape is a real error, and the database must still
 * never be touched.
 */
describe('THE SERVER ACTIONS: a denied request does no work and redirects with a notice', () => {
  it('likePlanAction does not write when denied — it redirects to the plan page', async () => {
    configure();
    limit.mockResolvedValue({ success: false });

    const likePlan = vi.fn();
    vi.doMock('@/lib/likes', () => ({ likePlan, unlikePlan: vi.fn() }));
    const revalidatePath = vi.fn();
    vi.doMock('next/cache', () => ({ revalidatePath }));

    const { likePlanAction } = await import('@/app/actions/likes');

    const formData = new FormData();
    formData.set('planId', 'plan_1');
    formData.set('slug', 'cedar-raised-garden-bed');

    // The REAL redirect() throws NEXT_REDIRECT — a signal Next catches and turns
    // into a 303 response. It is not the RateLimitError 500 of the original
    // incident, and asserting its digest proves the user lands back on the plan
    // page with the notice attached.
    await expect(likePlanAction(formData)).rejects.toMatchObject({
      digest: expect.stringContaining(
        '/plans/cedar-raised-garden-bed?notice=slow-down',
      ),
    });

    // And it never touched the database — avoiding that work is why the limiter
    // runs first.
    expect(likePlan).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('createCollectionAction does not write when denied — it redirects to /saved', async () => {
    configure();
    limit.mockResolvedValue({ success: false });

    const createCollection = vi.fn();
    vi.doMock('@/lib/saves', () => ({
      savePlan: vi.fn(),
      unsavePlan: vi.fn(),
      createCollection,
      deleteCollection: vi.fn(),
      renameCollection: vi.fn(),
      addPlanToCollection: vi.fn(),
      removePlanFromCollection: vi.fn(),
    }));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    // NOTE: next/navigation is deliberately NOT mocked. A redirect mock that
    // doesn't throw lets execution fall straight through the denial branch and
    // into the database write — this exact test shipped with that bug in its
    // first version.

    const { createCollectionAction } = await import('@/app/actions/saves');

    const formData = new FormData();
    formData.set('name', 'Garden');

    await expect(createCollectionAction(formData)).rejects.toMatchObject({
      digest: expect.stringContaining('/saved?notice=slow-down'),
    });
    expect(createCollection).not.toHaveBeenCalled();
  });

  it('still writes when the limiter ALLOWS — the limiter must not break the happy path', async () => {
    configure();
    limit.mockResolvedValue({ success: true });

    const likePlan = vi.fn();
    vi.doMock('@/lib/likes', () => ({ likePlan, unlikePlan: vi.fn() }));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));

    const { likePlanAction } = await import('@/app/actions/likes');

    const formData = new FormData();
    formData.set('planId', 'plan_1');
    formData.set('slug', 'cedar-raised-garden-bed');

    await likePlanAction(formData);

    expect(likePlan).toHaveBeenCalledWith('plan_1');
  });
});
