/**
 * Service worker — Sprint 8, substantially revised in Sprint 14.
 *
 * Delivers the capability BUSINESS_PLAN.md §5 calls "the single most important one": a
 * plan you saved stays usable in the workshop, on a job site, or in a hardware store
 * aisle with no signal.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * SECURITY — read before adding a single line to this file.
 *
 * A service worker cache is UNENCRYPTED, ORIGIN-SCOPED, and SURVIVES SIGN-OUT.
 *
 * Sprint 8 claimed we never write a user's private library to disk. That claim was
 * OVERSTATED: pre-caching a plan when it is saved means the cached plan pages already
 * approximated the saved library. Sprint 14 stops pretending and makes it defensible:
 *
 *   TWO CACHES.
 *     CACHE_NAME         — public plan content. Cached freely, as before.
 *     PRIVATE_CACHE_NAME — the saved library and the shopping list.
 *
 *   THE PRIVATE CACHE IS NEVER WRITTEN AS A SIDE EFFECT OF BROWSING. The fetch handler
 *   below never writes to it. It is written ONLY on an explicit DOWNLOAD_LIBRARY
 *   message, which fires only when the user taps "Make available offline".
 *
 *   THE PRIVATE CACHE IS WIPED ON SIGN-OUT (CLEAR_PRIVATE). That is the mitigation the
 *   whole design rests on. Two separate caches is what makes the wipe TOTAL.
 *
 * Mirrored in src/lib/offline.ts, which is UNIT TESTED. A service worker cannot be
 * imported into a test, so the policy lives in a testable module and is restated here.
 * **CHANGE ONE, CHANGE BOTH** — and the tests will tell you if you didn't.
 * ═════════════════════════════════════════════════════════════════════════════
 */

// v3: Sprint 14 splits public from private. A stale v2 cache may hold entries written
// under the older, laxer assumptions, so activate evicts it.
const CACHE_NAME = 'woodworking-plan-v3';
const PRIVATE_CACHE_NAME = 'woodworking-plan-private-v1';
const OFFLINE_URL = '/offline';

/** Never cached by the worker on its own initiative. */
const NEVER_CACHE_PREFIXES = [
  '/saved',
  '/profile',
  '/api',
  '/sign-in',
  '/sign-up',
  '/shopping-list',
];

/** Narrow allowlist of what the user may EXPLICITLY ask us to store. */
const DOWNLOADABLE_PREFIXES = ['/shopping-list', '/saved'];

// ─────────────────────────────── install ───────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      // Take over immediately rather than waiting for every tab to close. A
      // half-updated worker serving a stale shell is worse than a brief flash.
      .then(() => self.skipWaiting()),
  );
});

// ─────────────────────────────── activate ──────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            // Drop every cache from a previous version. NOTE the private cache is KEPT
            // — it is versioned separately, and it is the user's consented data, not
            // ours to discard on a deploy. It goes on sign-out, and only then.
            .filter((name) => name !== CACHE_NAME && name !== PRIVATE_CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ──────────────────────────────── policy ───────────────────────────────

/** Fails CLOSED — anything not positively public, same-origin and GET is refused. */
function isCacheable(request) {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;

  // RSC payloads are Next's client-navigation flight streams, not pages. Caching one
  // serves an old build's payload into a new client, and intercepting them at all once
  // made this worker return Response.error() in production.
  if (url.searchParams.has('_rsc')) return false;
  if (request.headers.get('RSC')) return false;

  const path = url.pathname;
  for (const prefix of NEVER_CACHE_PREFIXES) {
    if (path === prefix || path.startsWith(prefix + '/')) return false;
  }

  return true;
}

/** The CONSENTED path. Only ever reached from a DOWNLOAD_LIBRARY message. */
function isDownloadable(request) {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.searchParams.has('_rsc')) return false;

  if (isCacheable(request)) return true;

  const path = url.pathname;
  return DOWNLOADABLE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + '/'),
  );
}

/** Second gate for PUBLIC caching. A public path can still carry a personal response. */
function isCacheableResponse(response) {
  if (!response || response.status !== 200) return false;
  if (response.headers.get('set-cookie')) return false;

  const cacheControl = response.headers.get('cache-control') || '';
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false;
  }

  return true;
}

/**
 * Second gate for CONSENTED downloads. Looser in exactly one respect: it does not
 * refuse Set-Cookie, because a private page legitimately carries a session cookie.
 *
 * A SEPARATE FUNCTION rather than a flag, deliberately: a flag would be one careless
 * `true` away from letting a session-bearing response into the PUBLIC cache, where it
 * would survive sign-out and never be wiped.
 */
function isDownloadableResponse(response) {
  if (!response || response.status !== 200) return false;

  const cacheControl = response.headers.get('cache-control') || '';
  if (cacheControl.includes('no-store')) return false;

  return true;
}

// ──────────────────────────────── fetch ────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  /**
   * NOTE WHAT THIS HANDLER DOES NOT DO: it never WRITES to PRIVATE_CACHE_NAME.
   *
   * Browsing to /shopping-list while online does not cache it. Nothing lands in the
   * private cache as a side effect of using the app. That is the entire point.
   */
  if (!isCacheable(request)) {
    // Not ours to cache — but if we are OFFLINE and the user previously DOWNLOADED
    // this, serve it from the private cache. This is what makes the shopping list work
    // in a hardware store aisle. Read-only: it reads the private cache, never writes.
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request).catch(async () => {
          const cached = await caches.match(request, { cacheName: PRIVATE_CACHE_NAME });
          if (cached) return cached;

          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;

          return Response.error();
        }),
      );
    }
    return;
  }

  /**
   * NETWORK-FIRST, falling back to cache.
   *
   * Not cache-first. A woodworking plan is not immutable — a cut list can be corrected,
   * a price updated — and serving a stale one to someone standing at a table saw is a
   * genuinely bad outcome. Fresh when there is signal, cached when there is not.
   */
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (isCacheableResponse(response)) {
          // Clone BEFORE returning: a Response body can only be read once.
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { cacheName: CACHE_NAME });
        if (cached) return cached;

        if (request.mode === 'navigate') {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }

        return Response.error();
      }),
  );
});

// ───────────────────────────── messages ────────────────────────────────

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data.type !== 'string') return;

  // ── Sprint 8 / 13: pre-cache one PUBLIC plan (and its print view). ──────────
  if (data.type === 'CACHE_PLAN' && typeof data.url === 'string') {
    const request = new Request(new URL(data.url, self.location.origin), {
      method: 'GET',
    });

    // Still run through isCacheable(). A message from the page is not a reason to trust
    // it: a compromised page could otherwise ask us to cache /profile.
    if (!isCacheable(request)) return;

    event.waitUntil(
      fetch(request)
        .then((response) => {
          if (isCacheableResponse(response)) {
            return caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
          }
        })
        .catch(() => {
          // Offline while saving. The plan is still saved server-side and will be cached
          // next time it is opened with signal. A background nicety, not the save itself.
        }),
    );
    return;
  }

  // ── Sprint 14: the CONSENTED download. ─────────────────────────────────────
  //
  // Fired ONLY when the user taps "Make available offline". This is the one and only
  // path that writes to the private cache.
  if (data.type === 'DOWNLOAD_LIBRARY' && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const publicCache = await caches.open(CACHE_NAME);
        const privateCache = await caches.open(PRIVATE_CACHE_NAME);

        await Promise.all(
          data.urls.map(async (rawUrl) => {
            if (typeof rawUrl !== 'string') return;

            const request = new Request(new URL(rawUrl, self.location.origin), {
              method: 'GET',
            });

            // Consent is not a licence to store anything at all. The allowlist still
            // applies — a compromised page cannot use this to stash /profile on disk.
            if (!isDownloadable(request)) return;

            try {
              // The private pages need the session cookie, or they come back as a
              // sign-in redirect.
              const response = await fetch(request, { credentials: 'same-origin' });
              if (!isDownloadableResponse(response)) return;

              // PUBLIC content to the public cache; PRIVATE content to the private one.
              // Routing by isCacheable() — rather than guessing from the path — means
              // the two caches cannot drift apart from the policy.
              const target = isCacheable(request) ? publicCache : privateCache;
              await target.put(request, response);
            } catch {
              // One failed URL must not abort the whole download. The user gets what
              // could be fetched, and can retry.
            }
          }),
        );

        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({ type: 'DOWNLOAD_COMPLETE' });
        }
      })(),
    );
    return;
  }

  // ── Sprint 14: the WIPE. The mitigation the whole design rests on. ──────────
  //
  // A shared, sold, or lost phone must not hand over a library after the user has
  // signed out. Deleting the WHOLE cache — rather than walking entries — is exactly why
  // the private data lives in its own cache: the wipe cannot miss anything.
  if (data.type === 'CLEAR_PRIVATE') {
    event.waitUntil(caches.delete(PRIVATE_CACHE_NAME));
  }
});
