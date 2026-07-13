import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { env } from '@/env';

/**
 * Rate limiting for server actions.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY A VENDOR, AND NOT A MAP IN MEMORY
 *
 * An in-memory limiter is THEATRE on serverless. Every Vercel instance has its
 * own memory, so a `Map` of counters is per-instance — spread the requests across
 * instances (which the platform does automatically) and the limit evaporates. It
 * would look like a fix, close the issue in everyone's mind, and leave the hole
 * exactly as open as before. That is worse than shipping nothing.
 *
 * Rate limiting needs shared state. Shared state needs a store. Hence Upstash
 * (free tier: 500K commands/month — far beyond what this needs).
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * WHY SERVER ACTIONS NEED THIS AT ALL: a Next.js server action is a PUBLIC HTTP
 * ENDPOINT. Next generates an id for it and anyone can POST to that id in a loop.
 * The fact that no button in the UI does so means nothing. Without a limiter,
 * `likePlanAction` is an unauthenticated-shaped write endpoint with no throttle —
 * cheap to hammer, and every hit costs a Neon query on a free tier with a hard
 * monthly compute budget.
 *
 * FAILS OPEN, deliberately. If Upstash is unreachable, requests are ALLOWED. The
 * reasoning: this is an abuse control, not an authorization control. Authorization
 * is `requireUser()` and it fails closed. If the rate limiter fails closed, an
 * Upstash outage takes the whole app down — trading a real availability incident
 * for a hypothetical abuse one. That is the wrong trade, and it is a decision, not
 * an oversight.
 */

/** Configured only when the env vars are present — see `isEnabled` below. */
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * Two buckets, because the actions are not equally expensive to abuse.
 *
 * A sliding window, not a fixed one: a fixed window lets someone fire the whole
 * quota at 11:59:59 and the whole quota again at 12:00:00 — double the intended
 * rate, right at the boundary.
 */
const limiters = redis
  ? {
      /**
       * Cheap, idempotent toggles: like, unlike, save, unsave.
       *
       * 30/minute is far above any human — a fast tapper manages maybe 3–4 — and
       * far below what makes hammering worthwhile.
       */
      toggle: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        prefix: 'rl:toggle',
        analytics: false,
      }),

      /**
       * Writes that CREATE rows: collections, and (Sprint 10) reviews and photo
       * uploads. Stricter, because each one is a row that persists and that a
       * human has to look at if it turns out to be spam.
       */
      create: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        prefix: 'rl:create',
        analytics: false,
      }),
    }
  : null;

export type LimitBucket = 'toggle' | 'create';

/** True when Upstash is configured. Absent in tests and in a bare local dev setup. */
export function isRateLimitEnabled(): boolean {
  return limiters !== null;
}

/**
 * Identifies the caller for limiting purposes.
 *
 * Prefers the SESSION USER over the IP, deliberately:
 *   - IP alone punishes everyone behind a shared NAT (an office, a campus, a
 *     phone carrier's CGNAT) for one person's behaviour.
 *   - IP alone is also trivially rotated by anyone who actually means harm.
 *
 * A user id is stable, and every mutating action in this app already requires a
 * session. The IP fallback exists only so an unauthenticated POST to an action id
 * — which is exactly what an attacker would try — still lands in a bucket rather
 * than in no bucket at all.
 */
async function identify(): Promise<string> {
  const user = await getCurrentUser();
  if (user) return `u:${user.id}`;

  const headerList = await headers();

  // Vercel sets x-forwarded-for. Take the FIRST entry: the rest are proxies, and
  // a client can append whatever it likes to the end of that header.
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

  return `ip:${ip}`;
}

/**
 * Throws if the caller has exceeded the bucket's limit.
 *
 * Call it FIRST in a server action, before any database work — the whole point is
 * to avoid the database work.
 */
export async function enforceRateLimit(bucket: LimitBucket): Promise<void> {
  if (!limiters) {
    // Not configured (tests, local dev without Upstash). Allow — see "fails open".
    return;
  }

  const identifier = await identify();

  try {
    const { success } = await limiters[bucket].limit(identifier);

    if (!success) {
      // Deliberately vague, and deliberately not "you have made 31 requests in the
      // last 60 seconds" — precise limits are a map for tuning an attack around.
      throw new RateLimitError();
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;

    // Upstash is unreachable. ALLOW the request — see the module comment. An abuse
    // control that takes the app down is a worse bug than the abuse it prevents.
    console.warn('[rate-limit] store unreachable, allowing request:', error);
  }
}

export class RateLimitError extends Error {
  constructor() {
    super('Too many requests. Please slow down and try again in a moment.');
    this.name = 'RateLimitError';
  }
}
