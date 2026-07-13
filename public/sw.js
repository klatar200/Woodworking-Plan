/**
 * Service worker — Sprint 8.
 *
 * Delivers the capability BUSINESS_PLAN.md §5 calls "the single most important
 * one": a plan you saved stays readable in the workshop, on a job site, or in a
 * hardware store aisle with no signal.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * SECURITY — read before adding a single line to this file.
 *
 * A service worker cache is UNENCRYPTED, ORIGIN-SCOPED, and SURVIVES SIGN-OUT.
 * Whatever lands in it is readable by anyone holding the phone.
 *
 *   CACHE:       public plan content and static assets. These are public anyway
 *                (BUSINESS_PLAN.md §12 gates saves, not content), so caching them
 *                leaks nothing that a logged-out browser could not already see.
 *
 *   NEVER CACHE: /saved, /profile, /api/*, /sign-in, /sign-up, any non-GET, and
 *                any response carrying Set-Cookie or Cache-Control: private.
 *
 * The consequence, deliberately accepted: the /saved PAGE does not work offline,
 * but every plan you saved does. §5 asks for the plan content in the shop — not
 * for someone's private library written to disk in cleartext.
 *
 * This logic is mirrored in src/lib/offline.ts, which is UNIT TESTED. A service
 * worker cannot be imported into a test, so the policy lives in a testable module
 * and is restated here. If you change one, change both — and the tests will tell
 * you if you didn't.
 * ═════════════════════════════════════════════════════════════════════════════
 */

const CACHE_NAME = 'woodworking-plan-v1';
const OFFLINE_URL = '/offline';

/** Path prefixes that must NEVER be written to the cache. */
const NEVER_CACHE_PREFIXES = ['/saved', '/profile', '/api', '/sign-in', '/sign-up'];

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
            // Drop every cache from a previous version. Bumping CACHE_NAME is how
            // a deploy invalidates stale plan pages.
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ──────────────────────────────── policy ───────────────────────────────

/** Fails CLOSED — anything not positively public, same-origin, and GET is refused. */
function isCacheable(request) {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;

  const path = url.pathname;
  for (const prefix of NEVER_CACHE_PREFIXES) {
    if (path === prefix || path.startsWith(prefix + '/')) return false;
  }

  return true;
}

/** Second gate, on the way out. A public path can still carry a personal response. */
function isCacheableResponse(response) {
  if (!response || response.status !== 200) return false;
  if (response.headers.get('set-cookie')) return false;

  const cacheControl = response.headers.get('cache-control') || '';
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false;
  }

  return true;
}

// ──────────────────────────────── fetch ────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Not ours to cache — let it go straight to the network, untouched.
  if (!isCacheable(request)) return;

  /**
   * NETWORK-FIRST, falling back to cache.
   *
   * Not cache-first. A woodworking plan is not immutable — a cut list can be
   * corrected, a price updated — and serving a stale one to someone standing at
   * a table saw is a genuinely bad outcome. So: fresh when there is signal,
   * cached when there is not. The cache is a safety net, not the source of truth.
   */
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (isCacheableResponse(response)) {
          // Clone BEFORE returning: a Response body can only be read once, and
          // the browser is about to read this one.
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        // Offline. Serve the cached copy if we have one.
        const cached = await caches.match(request);
        if (cached) return cached;

        // No cached copy. For a page navigation, show the offline page rather
        // than the browser's dinosaur — at least it can say "here's what you
        // saved". For a sub-resource, just fail.
        if (request.mode === 'navigate') {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }

        return Response.error();
      }),
  );
});

// ───────────────────────── save-for-offline ────────────────────────────

/**
 * The page asks us to pre-cache a plan it just saved.
 *
 * This is what makes §5's promise real: you save a plan at home on wifi, and it
 * is on the device before you get to the workshop. Waiting for the user to
 * *visit* the plan while offline would be too late — that is precisely when they
 * have no signal.
 *
 * The URL is still run through isCacheable(). A message from the page is not a
 * reason to trust it: a compromised page could otherwise ask us to cache
 * /profile.
 */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'CACHE_PLAN' || typeof data.url !== 'string') return;

  const url = new URL(data.url, self.location.origin);
  const request = new Request(url, { method: 'GET' });

  if (!isCacheable(request)) return;

  event.waitUntil(
    fetch(request)
      .then((response) => {
        if (isCacheableResponse(response)) {
          return caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
        }
      })
      .catch(() => {
        // Offline while saving. The plan is still saved server-side; it will be
        // cached the next time it is opened with signal. Failing silently is
        // correct — this is a background nicety, not the save itself.
      }),
  );
});
