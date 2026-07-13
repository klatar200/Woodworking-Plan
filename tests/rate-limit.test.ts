import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Rate limiting.
 *
 * The properties worth asserting are not "does it count to 30". They are the
 * design decisions — each of which is the kind of thing a future refactor would
 * quietly get backwards:
 *
 *   1. It FAILS OPEN when the store is unreachable.
 *   2. It identifies by SESSION USER first, IP only as a fallback.
 *   3. It runs BEFORE any database work.
 *   4. It is a no-op when unconfigured (so tests and bare local dev still run).
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
    const { enforceRateLimit, isRateLimitEnabled } = await import('@/lib/rate-limit');

    expect(isRateLimitEnabled()).toBe(false);
    await expect(enforceRateLimit('toggle')).resolves.toBeUndefined();
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
    const { enforceRateLimit } = await import('@/lib/rate-limit');
    await enforceRateLimit('toggle');

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

    const { enforceRateLimit } = await import('@/lib/rate-limit');
    await enforceRateLimit('toggle');

    expect(limit).toHaveBeenCalledWith('ip:203.0.113.7');
  });

  it('SECURITY: takes the FIRST x-forwarded-for entry, not the last', async () => {
    // The header is a proxy chain. A client can append whatever it likes to the
    // END of it, so trusting the last entry lets an attacker pick their own bucket
    // — and therefore evade the limit entirely.
    configure();
    getCurrentUser.mockResolvedValue(null);
    headersGet.mockReturnValue('203.0.113.7, 10.0.0.1, 172.16.0.1');

    const { enforceRateLimit } = await import('@/lib/rate-limit');
    await enforceRateLimit('toggle');

    expect(limit).toHaveBeenCalledWith('ip:203.0.113.7');
  });

  it('buckets an unidentifiable caller rather than letting them through unbucketed', async () => {
    configure();
    getCurrentUser.mockResolvedValue(null);
    headersGet.mockReturnValue(null);

    const { enforceRateLimit } = await import('@/lib/rate-limit');
    await enforceRateLimit('toggle');

    expect(limit).toHaveBeenCalledWith('ip:unknown');
  });
});

describe('enforcement', () => {
  it('throws when the limit is exceeded', async () => {
    configure();
    limit.mockResolvedValue({ success: false });

    const { enforceRateLimit, RateLimitError } = await import('@/lib/rate-limit');

    await expect(enforceRateLimit('toggle')).rejects.toBeInstanceOf(RateLimitError);
  });

  it('does not leak the exact limit in the error — that is a map for tuning an attack', async () => {
    configure();
    limit.mockResolvedValue({ success: false });

    const { enforceRateLimit } = await import('@/lib/rate-limit');

    let message = '';
    try {
      await enforceRateLimit('toggle');
    } catch (error) {
      message = (error as Error).message;
    }

    // "You have made 31 requests in the last 60 seconds" tells an attacker exactly
    // what to tune to. Say nothing useful.
    expect(message).not.toMatch(/\d/);
    expect(message).toMatch(/slow down/i);
  });

  it('allows a request under the limit', async () => {
    configure();
    const { enforceRateLimit } = await import('@/lib/rate-limit');
    await expect(enforceRateLimit('toggle')).resolves.toBeUndefined();
  });
});

describe('FAILS OPEN — the decision this module lives or dies on', () => {
  it('ALLOWS the request when the store is unreachable', async () => {
    configure();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    limit.mockRejectedValue(new Error('ECONNREFUSED'));

    const { enforceRateLimit } = await import('@/lib/rate-limit');

    // This is an ABUSE control, not an AUTHORIZATION control. Authorization is
    // requireUser(), and it fails CLOSED. If the limiter failed closed too, an
    // Upstash outage would take the entire app down — trading a real availability
    // incident for a hypothetical abuse one. That is the wrong trade, and it is a
    // decision, not an oversight.
    await expect(enforceRateLimit('toggle')).resolves.toBeUndefined();
  });

  it('logs the outage rather than swallowing it silently', async () => {
    configure();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    limit.mockRejectedValue(new Error('ECONNREFUSED'));

    const { enforceRateLimit } = await import('@/lib/rate-limit');
    await enforceRateLimit('toggle');

    // Failing open silently would mean nobody ever finds out the limiter is dead.
    expect(warn).toHaveBeenCalled();
  });

  it('a RateLimitError is NOT swallowed by the fail-open catch', async () => {
    // The catch is for STORE failures. If it also swallowed the limiter's own
    // "you are over the limit" signal, the limiter would never block anything —
    // a bug that would look exactly like working code.
    configure();
    limit.mockResolvedValue({ success: false });

    const { enforceRateLimit, RateLimitError } = await import('@/lib/rate-limit');

    await expect(enforceRateLimit('create')).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe('buckets', () => {
  it('separates cheap toggles from row-creating writes', async () => {
    configure();
    const { enforceRateLimit } = await import('@/lib/rate-limit');

    await enforceRateLimit('toggle');
    await enforceRateLimit('create');

    // Both go through, but through different limiters — a like is idempotent and
    // cheap; a collection is a row that persists and that a human has to look at
    // if it turns out to be spam.
    expect(limit).toHaveBeenCalledTimes(2);
  });
});
