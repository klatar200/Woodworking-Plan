/**
 * Service worker — Sprint 8, revised in Sprint 14, de-duplicated 2026-07-14.
 *
 * Delivers the capability BUSINESS_PLAN.md §5 calls "the single most important one": a
 * plan you saved stays usable in the workshop, on a job site, or in a hardware-store
 * aisle with no signal.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THE CACHING POLICY IS NOT IN THIS FILE. It lives ONCE, in /sw-policy.js, and is
 * loaded verbatim by `importScripts` below. tests/offline.test.ts loads that SAME file
 * and tests the exact functions this worker runs — so the policy cannot drift from what
 * ships, because there is only one copy.
 *
 * This file is only the EVENT WIRING: install, activate, fetch, and message. It reads
 * every policy decision from `self.OfflinePolicy`; it makes none of its own.
 *
 * SECURITY, in one line: the fetch handler NEVER writes the private cache — only the
 * explicit DOWNLOAD_LIBRARY message does — and CLEAR_PRIVATE wipes it on sign-out. See
 * /sw-policy.js for the full reasoning.
 * ═════════════════════════════════════════════════════════════════════════════
 */

importScripts('/sw-policy.js');

const {
  CACHE_NAME,
  PRIVATE_CACHE_NAME,
  OFFLINE_URL,
  PRECACHE_URLS,
  SW_MESSAGES,
  isCacheable,
  isDownloadable,
  isCacheableResponse,
  isDownloadableResponse,
} = self.OfflinePolicy;

/**
 * The policy predicates take a plain, environment-agnostic request-like object (so they
 * can be unit tested without a real ServiceWorker). This adapts a real `Request` into
 * that shape — the origin comes from the worker, and the RSC header (which a plain object
 * cannot carry) is read here and passed through as a flag.
 */
function toPolicyRequest(request) {
  return {
    method: request.method,
    url: request.url,
    origin: self.location.origin,
    rscHeader: Boolean(request.headers && request.headers.get('RSC')),
  };
}

// ─────────────────────────────── install ───────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
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

// ──────────────────────────────── fetch ────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  /**
   * NOTE WHAT THIS HANDLER DOES NOT DO: it never WRITES to PRIVATE_CACHE_NAME.
   *
   * Browsing to /shopping-list while online does not cache it. Nothing lands in the
   * private cache as a side effect of using the app. That is the entire point.
   */
  if (!isCacheable(toPolicyRequest(request))) {
    // Not ours to cache — but if we are OFFLINE and the user previously DOWNLOADED
    // this, serve it from the private cache. This is what makes the shopping list work
    // in a hardware-store aisle. Read-only: it reads the private cache, never writes.
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

  // ── Sprint 8 / 13 / 15: pre-cache one PUBLIC plan (and its print/board views). ──
  if (data.type === SW_MESSAGES.CACHE_PLAN && typeof data.url === 'string') {
    const request = new Request(new URL(data.url, self.location.origin), {
      method: 'GET',
    });

    // Still run through isCacheable(). A message from the page is not a reason to trust
    // it: a compromised page could otherwise ask us to cache /profile.
    if (!isCacheable(toPolicyRequest(request))) return;

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
  if (data.type === SW_MESSAGES.DOWNLOAD_LIBRARY && Array.isArray(data.urls)) {
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
            const policyRequest = toPolicyRequest(request);

            // Consent is not a licence to store anything at all. The allowlist still
            // applies — a compromised page cannot use this to stash /profile on disk.
            if (!isDownloadable(policyRequest)) return;

            try {
              // The private pages need the session cookie, or they come back as a
              // sign-in redirect.
              const response = await fetch(request, { credentials: 'same-origin' });
              if (!isDownloadableResponse(response)) return;

              // PUBLIC content to the public cache; PRIVATE content to the private one.
              // Routing by isCacheable() — rather than guessing from the path — means
              // the two caches cannot drift apart from the policy.
              const target = isCacheable(policyRequest) ? publicCache : privateCache;
              await target.put(request, response);
            } catch {
              // One failed URL must not abort the whole download. The user gets what
              // could be fetched, and can retry.
            }
          }),
        );

        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({ type: SW_MESSAGES.DOWNLOAD_COMPLETE });
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
  if (data.type === SW_MESSAGES.CLEAR_PRIVATE) {
    event.waitUntil(caches.delete(PRIVATE_CACHE_NAME));
  }
});
