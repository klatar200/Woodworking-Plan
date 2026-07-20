/**
 * The URL list the "Make available offline" download asks the service worker to cache.
 *
 * Extracted from the component as a pure function for one reason: it is a SECURITY-shaped
 * list (it decides what gets written to an unencrypted, sign-out-surviving cache), and a
 * list like that should be testable directly rather than only through a client component
 * that needs a DOM and a live worker. `tests/offline-urls.test.ts` cross-checks every URL
 * here against the real policy in `public/sw-policy.js` — so this list cannot contain
 * something the worker would (correctly) refuse, which would otherwise be a silent hole.
 *
 * Everything here is either public plan/path content (→ the PUBLIC cache) or the user's
 * own saved list / shopping list (→ the PRIVATE cache, wiped on sign-out). The worker
 * routes each URL by `isCacheable()`, so this function does not decide the destination —
 * it only decides the SET.
 */

export interface OfflineDownloadInput {
  /** Slugs of every saved plan. Their pages, print views, and board plans get cached. */
  planSlugs: string[];
  /** Collection ids, so each collection TAB of /saved works offline (see below). */
  collectionIds: string[];
  /** Slugs of every published learning path. The hub and each path page get cached. */
  pathSlugs: string[];
}

export function offlineDownloadUrls({
  planSlugs,
  collectionIds,
  pathSlugs,
}: OfflineDownloadInput): string[] {
  return [
    // The saved plans themselves.
    ...planSlugs.map((slug) => `/plans/${slug}`),
    // The print view is the sheet that actually goes to the shop (Sprint 13).
    ...planSlugs.map((slug) => `/plans/${slug}/print`),
    ...planSlugs.map((slug) => `/plans/${slug}/print?view=cutlist`),
    // The board plan — what to buy. The one you want at the lumberyard (Sprint 15).
    ...planSlugs.map((slug) => `/plans/${slug}/boards`),
    // The build page (2026-07-16) — where "Start building" now points. Mid-build
    // with no signal is the §5 scenario; the primary CTA must not 404 offline.
    ...planSlugs.map((slug) => `/plans/${slug}/build`),

    // The shopping list — BOTH views. This is what closes the BUSINESS_PLAN.md §5
    // hardware-store gap.
    //
    // ⚠️ AUDIT FIX 2026-07-19: the SW cache matches EXACT URLs (no `ignoreSearch`), so
    // every view someone can tap offline must be downloaded under its own query string.
    // This list previously cached `/shopping-list?collection=<id>` — a parameter the
    // page STOPPED READING in Sprint 22 (it takes `?view=` now), so the download pulled
    // N identical copies of the merged view under dead URLs — and did NOT cache
    // `?view=by-plan`, so toggling views offline hit the fallback page. The stale
    // param and the missing view were the same bug from two sides.
    '/shopping-list',
    '/shopping-list?view=by-plan',

    // The saved list itself, so the app is navigable offline rather than a set of pages
    // reachable only if you already know their URLs — and each collection TAB, which is
    // its own URL for the same exact-match reason.
    '/saved',
    ...collectionIds.map((id) => `/saved?collection=${id}`),

    // Learning paths — Sprint 16 gap, closed 2026-07-14. Paths are public curated content
    // (an ordered list of published plans), so they land in the PUBLIC cache exactly like
    // plan pages already do. The hub AND each path page, so the "what do I build next"
    // guidance is usable with no signal, not just at a desk.
    //
    // Honest limit: a path page renders its step cards inline, so the path itself reads
    // fine offline — but tapping through to a step's plan only works if that plan was
    // saved (hence downloaded) or visited online. A path's plans are not force-downloaded
    // here; doing so would pull the entire catalog through any path that spans it.
    '/paths',
    ...pathSlugs.map((slug) => `/paths/${slug}`),
  ];
}
