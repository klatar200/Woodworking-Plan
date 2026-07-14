/**
 * Offline caching POLICY — the single source of truth. Sprint 8 / 14; de-duplicated
 * 2026-07-14.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS AS A SEPARATE, PLAIN-JS FILE.
 *
 * The policy used to live TWICE: once in src/lib/offline.ts (so it could be unit
 * tested) and once, copy-pasted, inside public/sw.js (the code the browser actually
 * runs). "Change one, change both" was enforced only by a test that string-matched a
 * few constants — the predicate LOGIC could still drift silently.
 *
 * Now there is ONE copy, here:
 *   - public/sw.js loads it with `importScripts('/sw-policy.js')` and runs it verbatim.
 *   - tests/offline.test.ts loads THIS EXACT FILE and tests the functions the browser
 *     runs — not a mirror of them.
 *
 * So the policy cannot drift from what ships, because there is nothing to drift from.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THE SECURITY LINE. A service worker cache is UNENCRYPTED, ORIGIN-SCOPED, and
 * SURVIVES SIGN-OUT — anything in it is readable by whoever picks up the phone.
 *
 *   TWO CACHES. Public plan content (cached freely) and PRIVATE content (the saved
 *   library, the shopping list), in its own cache.
 *
 *   THE PRIVATE CACHE IS NEVER WRITTEN AS A SIDE EFFECT OF BROWSING. `isCacheable()`
 *   fails CLOSED and refuses every private route. The private cache is written ONLY by
 *   the explicit, user-initiated download (see sw.js's DOWNLOAD_LIBRARY handler).
 *
 *   THE PRIVATE CACHE IS WIPED ON SIGN-OUT. Keeping the two caches separate is what
 *   makes that wipe total and unmissable.
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Written as a classic script (no import/export) so `importScripts` can load it and a
 * Node `vm` sandbox can too. The pure predicates take a plain request-like
 * `{ method, url, origin }` and never touch `self` — that is what keeps them testable.
 * Everything is attached to `self.OfflinePolicy` so consumers read one namespace.
 */
(function () {
  // PUBLIC cache. Plan content, the catalog, static assets — readable by a logged-out
  // stranger anyway, so caching them leaks nothing. v3: Sprint 14 split public/private,
  // so a stale v2 cache is evicted on activate.
  const CACHE_NAME = 'woodworking-plan-v3';

  // PRIVATE cache. The saved library, the shopping list. Written ONLY by the explicit
  // download; deleted wholesale on sign-out. Separate so the deletion cannot miss.
  const PRIVATE_CACHE_NAME = 'woodworking-plan-private-v1';

  const OFFLINE_URL = '/offline';
  // Shell assets pre-cached at install, so the app opens with no network.
  const PRECACHE_URLS = [OFFLINE_URL];

  // Path prefixes the worker must NEVER cache on its own initiative.
  const NEVER_CACHE_PREFIXES = [
    '/saved', // a user's private library
    '/profile', // account details
    '/api', // health today; anything tomorrow
    '/sign-in', // Clerk's flow, and its tokens
    '/sign-up',
    '/shopping-list', // derived from the saved library — as private as the library
  ];

  // Routes the user may EXPLICITLY choose to download. An allowlist, deliberately
  // narrow. Being on it does NOT mean the worker may cache it on its own — isCacheable()
  // still refuses these. It means the user is permitted to ask for it, having been told
  // what that means. /profile and /api are NOT here and must never be.
  const DOWNLOADABLE_PREFIXES = ['/shopping-list', '/saved'];

  // Messages the page may send the worker. Anything else is ignored.
  const SW_MESSAGES = {
    CACHE_PLAN: 'CACHE_PLAN', // cache one public plan + its print/board views (Sprint 8/13/15)
    DOWNLOAD_LIBRARY: 'DOWNLOAD_LIBRARY', // consented download into the private cache (Sprint 14)
    CLEAR_PRIVATE: 'CLEAR_PRIVATE', // wipe the private cache, on sign-out (Sprint 14)
    DOWNLOAD_COMPLETE: 'DOWNLOAD_COMPLETE', // worker → page, when a download finishes
  };

  function sameOriginGetUrl(request) {
    // Shared front-half of both predicates: a same-origin GET that is not an RSC
    // flight stream. Returns the parsed URL, or null if the request is disqualified.
    if (request.method !== 'GET') return null;

    let url;
    try {
      url = new URL(request.url);
    } catch {
      return null;
    }

    // Same origin only. We are not a proxy for the rest of the internet.
    if (url.origin !== request.origin) return null;

    // RSC payloads — Next's client-navigation flight streams. NOT pages: tied to router
    // state and the build id, so a cached one serves an old build's payload into a new
    // client. Intercepting them once made this worker return Response.error() in prod.
    // The header form is passed in by the worker (a plain object cannot carry headers).
    if (url.searchParams.has('_rsc')) return null;
    if (request.rscHeader) return null;

    return url;
  }

  // May the worker cache this ON ITS OWN INITIATIVE? Fails CLOSED. Does NOT change for a
  // user who opted into offline downloads — consented content goes through
  // isDownloadable() into a DIFFERENT cache. Two doors, two keys.
  function isCacheable(request) {
    const url = sameOriginGetUrl(request);
    if (!url) return false;

    const path = url.pathname;
    for (const prefix of NEVER_CACHE_PREFIXES) {
      if (path === prefix || path.startsWith(prefix + '/')) return false;
    }

    return true;
  }

  // May the user EXPLICITLY download this? The CONSENTED path, taken only in response to
  // a direct message from the page — never on the worker's own initiative. Still refuses
  // cross-origin and non-GET: consent is not a licence to cache anything at all.
  function isDownloadable(request) {
    const url = sameOriginGetUrl(request);
    if (!url) return false;

    // Public plan content is downloadable too — that is how "download my library" pulls
    // each plan page and its print view.
    if (isCacheable(request)) return true;

    const path = url.pathname;
    return DOWNLOADABLE_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(prefix + '/'),
    );
  }

  // Second gate for PUBLIC caching, on the way out. A public PATH can still carry a
  // personal RESPONSE — Set-Cookie above all.
  function isCacheableResponse(response) {
    // Only successful, complete responses. Caching a 404/500 serves it back forever.
    if (!response || response.status !== 200) return false;

    // A response that sets a cookie is, by definition, about *this* user.
    if (response.headers.get('set-cookie')) return false;

    const cacheControl = response.headers.get('cache-control') || '';
    if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
      return false;
    }

    return true;
  }

  // Second gate for CONSENTED downloads. Looser than isCacheableResponse in EXACTLY one
  // respect: it does not refuse Set-Cookie, because a private page legitimately carries a
  // session cookie. That difference is why this is a SEPARATE FUNCTION, not a boolean
  // flag — a flag would be one careless `true` away from putting a session-bearing
  // response in the PUBLIC cache, where it would survive sign-out and never be wiped.
  function isDownloadableResponse(response) {
    if (!response || response.status !== 200) return false;

    const cacheControl = response.headers.get('cache-control') || '';
    if (cacheControl.includes('no-store')) return false;

    return true;
  }

  self.OfflinePolicy = {
    CACHE_NAME,
    PRIVATE_CACHE_NAME,
    OFFLINE_URL,
    PRECACHE_URLS,
    NEVER_CACHE_PREFIXES,
    DOWNLOADABLE_PREFIXES,
    SW_MESSAGES,
    isCacheable,
    isDownloadable,
    isCacheableResponse,
    isDownloadableResponse,
  };
})();
