/**
 * Offline caching policy — Sprint 8, substantially revised in Sprint 14.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * THE SECURITY LINE, AND AN HONEST CORRECTION TO IT.
 *
 * A service worker cache is UNENCRYPTED, ORIGIN-SCOPED, and SURVIVES SIGN-OUT.
 * Anything in it is readable by whoever picks up the phone.
 *
 * Sprint 8 claimed we "never write a user's private library to disk." **That claim was
 * overstated.** Saving a plan pre-caches that plan's page — so the set of cached plan
 * pages already approximated the user's saved library. There was partial cover (pages
 * you merely visit get cached too), but the line was not cleanly held, and a security
 * rule that overstates its own guarantee is worse than an honest one: everything
 * downstream trusts it.
 *
 * Sprint 14 stops pretending, and replaces the pretence with a structure that is
 * actually defensible:
 *
 *   1. TWO CACHES. Public plan content (cacheable freely, as before) and PRIVATE
 *      content, which lives in its own cache.
 *
 *   2. THE PRIVATE CACHE IS NEVER WRITTEN AS A SIDE EFFECT OF BROWSING. The worker
 *      will not put anything there on its own initiative. It is written ONLY by an
 *      explicit, user-initiated "Make available offline" action. **Consent is what
 *      separates a defensible cache from a silent one.**
 *
 *   3. THE PRIVATE CACHE IS WIPED ON SIGN-OUT. This is the mitigation the whole design
 *      rests on. A shared, sold, or lost phone must not hand over a library after the
 *      user logged out. Keeping the caches separate is what makes "delete all the
 *      private data" one operation that cannot miss an entry.
 *
 * The DEFAULT remains FAIL-CLOSED: `isCacheable()` still refuses every private route.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Kept as a plain module (no DOM, no SW globals) so the policy can be unit tested. A
 * security rule that only exists inside a service worker is a rule nobody can test.
 */

/**
 * PUBLIC cache. Plan content, the catalog, static assets — readable by a logged-out
 * stranger anyway, so caching them leaks nothing.
 *
 * v3: Sprint 14 splits public from private. A stale v2 cache may hold entries written
 * under the older, laxer assumptions, so it is evicted on activate.
 */
export const CACHE_NAME = 'woodworking-plan-v3';

/**
 * PRIVATE cache. The user's saved library, their shopping list.
 *
 * Written ONLY by the explicit download action. Deleted wholesale on sign-out. It is a
 * separate cache precisely so that the deletion is total and cannot forget an entry.
 */
export const PRIVATE_CACHE_NAME = 'woodworking-plan-private-v1';

/** Path prefixes the worker must NEVER cache on its own initiative. */
export const NEVER_CACHE_PREFIXES = [
  '/saved', // a user's private library
  '/profile', // account details
  '/api', // health today; anything tomorrow
  '/sign-in', // Clerk's flow, and its tokens
  '/sign-up',
  '/shopping-list', // derived from the saved library — as private as the library itself
] as const;

/**
 * Routes the user may EXPLICITLY choose to download.
 *
 * An ALLOWLIST, deliberately narrow. Being on it does NOT mean "the worker may cache
 * this" — `isCacheable()` still refuses all of these. It means "the user is permitted
 * to ask for this to be stored, having been told what that means."
 *
 * `/profile` and `/api/*` are NOT here and must never be: an account page and an API
 * surface are not things anyone needs in a workshop, and the point of an allowlist is
 * that it does not quietly grow.
 */
export const DOWNLOADABLE_PREFIXES = ['/shopping-list', '/saved'] as const;

/**
 * May the worker cache this ON ITS OWN INITIATIVE?
 *
 * Fails CLOSED. Anything not positively public, same-origin and a GET is refused. This
 * answer does NOT change for a user who opted into offline downloads — consented
 * content goes through `isDownloadable()` into a DIFFERENT cache. Two doors, two keys.
 */
export function isCacheable(request: {
  method: string;
  url: string;
  origin: string;
}): boolean {
  // 1. Only GETs. A POST is a server action — caching a mutation is meaningless and
  //    re-serving one would be actively dangerous.
  if (request.method !== 'GET') return false;

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }

  // 2. Same origin only. We are not a proxy for the rest of the internet.
  if (url.origin !== request.origin) return false;

  // 3. React Server Component payloads — Next's client-navigation flight streams. NOT
  //    pages: tied to router state and the build id, so a cached one serves an old
  //    build's payload into a new client. Intercepting them once made this worker
  //    return Response.error() in production.
  if (url.searchParams.has('_rsc')) return false;

  // 4. The denylist: private, session-bearing, or API routes.
  const path = url.pathname;
  for (const prefix of NEVER_CACHE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return false;
  }

  return true;
}

/**
 * May the user EXPLICITLY download this for offline use?
 *
 * Distinct from `isCacheable()` on purpose. This is the CONSENTED path, and the worker
 * only takes it in response to a direct message from the page — never on its own.
 *
 * Still refuses cross-origin and non-GET: consent is not a licence to cache anything at
 * all. A user asking for their shopping list is not asking us to proxy the internet.
 */
export function isDownloadable(request: {
  method: string;
  url: string;
  origin: string;
}): boolean {
  if (request.method !== 'GET') return false;

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }

  if (url.origin !== request.origin) return false;
  if (url.searchParams.has('_rsc')) return false;

  // Public plan content is downloadable too — that is how "download my library" pulls
  // each plan page and its print view.
  if (isCacheable(request)) return true;

  // Otherwise it must be explicitly on the narrow allowlist.
  const path = url.pathname;
  return DOWNLOADABLE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Should this RESPONSE be stored, given the request was allowed? The second gate, on
 * the way out. A page can be public by path and still carry something personal —
 * `Set-Cookie` above all.
 */
export function isCacheableResponse(response: {
  status: number;
  headers: { get(name: string): string | null };
}): boolean {
  // Only successful, complete responses. Caching a 404 or a 500 serves it back forever
  // — an outage that outlives the outage.
  if (response.status !== 200) return false;

  // A response that sets a cookie is, by definition, about *this* user.
  if (response.headers.get('set-cookie')) return false;

  const cacheControl = response.headers.get('cache-control') ?? '';
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false;
  }

  return true;
}

/**
 * The response gate for CONSENTED downloads.
 *
 * Looser than `isCacheableResponse` in exactly one respect: it does not refuse a
 * `Set-Cookie`, because a private page's response legitimately carries a session cookie
 * and refusing it would make the feature impossible.
 *
 * That difference is precisely why this is a SEPARATE FUNCTION rather than a boolean
 * flag on the other one. A flag would be one careless `true` away from letting a
 * session-bearing response into the PUBLIC cache — where it would survive sign-out and
 * never be wiped.
 *
 * `no-store` is still honoured: if the server says do not store this, we do not,
 * whatever the user asked for.
 */
export function isDownloadableResponse(response: {
  status: number;
  headers: { get(name: string): string | null };
}): boolean {
  if (response.status !== 200) return false;

  const cacheControl = response.headers.get('cache-control') ?? '';
  if (cacheControl.includes('no-store')) return false;

  return true;
}

/** The offline fallback page, pre-cached at install. */
export const OFFLINE_URL = '/offline';

/** The shell assets pre-cached at install, so the app opens with no network. */
export const PRECACHE_URLS = [OFFLINE_URL] as const;

/** Messages the page may send the worker. Anything else is ignored. */
export const SW_MESSAGES = {
  /** Cache one public plan and its print view. Sprint 8 / 13. */
  CACHE_PLAN: 'CACHE_PLAN',
  /** Consented download of the user's library into the PRIVATE cache. Sprint 14. */
  DOWNLOAD_LIBRARY: 'DOWNLOAD_LIBRARY',
  /** Wipe the private cache. Fired on sign-out. Sprint 14. */
  CLEAR_PRIVATE: 'CLEAR_PRIVATE',
} as const;
