/**
 * Offline caching policy — Sprint 8.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE SECURITY LINE, and it is the whole reason this file exists separately
 * from the service worker:
 *
 *   A service worker cache is UNENCRYPTED, ORIGIN-SCOPED, and PERSISTS AFTER
 *   SIGN-OUT. Anything cached is readable by anyone who picks up the phone —
 *   and by any script running on this origin.
 *
 * So the rule is: **cache PUBLIC content only. Never cache anything that is
 * only visible because of who you are.**
 *
 *   CACHEABLE  — plan pages, the catalog, static assets. All already public
 *                (BUSINESS_PLAN.md §12: gate saves, not content). Caching them
 *                leaks nothing, because signing out was never what protected them.
 *
 *   NEVER      — /saved, /profile (a user's private library and account),
 *                /api/* (health today; anything tomorrow),
 *                /sign-in, /sign-up (Clerk's own flows and tokens),
 *                any POST (server actions — caching a mutation is meaningless
 *                and re-serving one would be dangerous),
 *                any response carrying Set-Cookie or Authorization.
 *
 * The consequence, stated plainly: **the /saved PAGE will not work offline, but
 * every plan you saved will.** That is the right trade. §5 says the capability
 * that matters is "plans a user has already saved remain viewable with no
 * signal" — the plan content, in the workshop. It does not say the account page
 * must render on a plane. Caching someone's private library onto disk in
 * cleartext to achieve that would be a bad bargain.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kept as a plain module (no DOM, no SW globals) so the policy can be unit
 * tested directly. A security rule that only exists inside a service worker is a
 * security rule nobody can test.
 */

/** Cache version. Bump to invalidate every cached response on the next deploy. */
export const CACHE_NAME = 'woodworking-plan-v1';

/** Path prefixes that must NEVER be written to the cache. */
export const NEVER_CACHE_PREFIXES = [
  '/saved', // a user's private library
  '/profile', // account details
  '/api', // health today; anything tomorrow
  '/sign-in', // Clerk's flow, and its tokens
  '/sign-up',
] as const;

/**
 * Decides whether a request's response may be written to the offline cache.
 *
 * Fails CLOSED: anything not positively identified as public, same-origin, and a
 * GET is refused. A denylist alone would be one forgotten route away from
 * caching somebody's account page onto their phone.
 */
export function isCacheable(request: {
  method: string;
  url: string;
  origin: string;
}): boolean {
  // 1. Only GETs. A POST is a server action — caching a mutation is meaningless,
  //    and re-serving one would be actively dangerous.
  if (request.method !== 'GET') return false;

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }

  // 2. Same origin only. We are not a proxy for the rest of the internet, and a
  //    cross-origin response could be anything.
  if (url.origin !== request.origin) return false;

  // 3. The explicit denylist: private, session-bearing, or API routes.
  const path = url.pathname;
  for (const prefix of NEVER_CACHE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return false;
  }

  return true;
}

/**
 * Should this RESPONSE be stored, given it was allowed by `isCacheable`?
 *
 * Second gate, on the way out rather than the way in. A page can be public by
 * path and still carry something personal — `Set-Cookie` above all. Checking both
 * directions is what makes a mistake in one of them survivable.
 */
export function isCacheableResponse(response: {
  status: number;
  headers: { get(name: string): string | null };
}): boolean {
  // Only successful, complete responses. Caching a 404 or a 500 would serve it
  // back forever — an outage that outlives the outage.
  if (response.status !== 200) return false;

  // A response that sets a cookie is, by definition, about *this* user.
  if (response.headers.get('set-cookie')) return false;

  // Respect an explicit no-store from the server.
  const cacheControl = response.headers.get('cache-control') ?? '';
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false;
  }

  return true;
}

/** The offline fallback page, pre-cached at install. */
export const OFFLINE_URL = '/offline';

/** The shell assets pre-cached at install, so the app opens with no network. */
export const PRECACHE_URLS = [OFFLINE_URL] as const;
