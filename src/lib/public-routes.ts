import { createRouteMatcher } from '@clerk/nextjs/server';

/**
 * The explicit allowlist of routes reachable without a session.
 *
 * Lives in its own module so it can be tested directly, rather than only being
 * exercised through middleware that needs a full request pipeline to run.
 *
 * SECURITY — read before adding anything here:
 *
 * This is an ALLOWLIST. Everything not on it requires authentication. That
 * direction is deliberate and is the whole safety property:
 *
 *   - Allowlist (this): forget to add a new public route → it demands a login.
 *     Annoying, obvious, harmless. Fails CLOSED.
 *   - Denylist ("protect these"): forget to add a new private route → it's
 *     world-readable. Silent, invisible, a breach. Fails OPEN.
 *
 * So adding a path here is a security decision, not a routing convenience. Every
 * entry needs a reason it can be safely served to an anonymous stranger.
 */
export const PUBLIC_ROUTES = [
  // The marketing landing page (QOL-M, 2026-07-20 — the catalog moved to /browse).
  // Public: static content, no user data.
  '/',

  // The catalog itself (QOL-M): browse, keyword search, and filters. Same reasoning as
  // `/plans` below — content is free to build the habit; only saves/likes/categories are
  // gated (BUSINESS_PLAN.md §12). The catch-all covers its query-string variants
  // (?category=, ?q=, ?page=, ?sort=, …), which are all still just the public catalog.
  '/browse(.*)',

  // Plan detail pages (Sprint 3).
  //
  // This is a deliberate security decision, not a convenience. BUSINESS_PLAN.md
  // §12 is explicit: "Gate high-value actions (unlimited saves/categories) rather
  // than content itself; keep search/browse free to build habit." Putting plan
  // content behind a login would invert the monetization strategy and kill SEO.
  //
  // What is NOT exposed by this: only `published: true` plans are ever readable
  // (enforced in src/lib/plans.ts, in the data layer, not in the pages). Saving,
  // liking, and categorizing remain private — those are Sprints 6-7 and they are
  // not on this list.
  '/plans(.*)',

  // Learning paths (Sprint 16).
  //
  // Same reasoning as the plan pages, and the same limits. A path is CURATED CATALOG
  // CONTENT — an ordered list of published plans plus an explanation of the order.
  // BUSINESS_PLAN.md §12 gates participation, not content, and someone deciding whether
  // this site is worth signing up for should be able to see that it knows what order to
  // teach things in.
  //
  // What this does NOT expose: only `published: true` paths, containing only
  // `published: true` plans — both enforced in src/lib/paths.ts, in the data layer.
  // PROGRESS is not exposed at all: `getBuiltPlanIds()` derives its owner from the
  // verified session and returns an empty set for an anonymous visitor, so the page
  // renders the path with no personalization rather than someone else's.
  '/paths(.*)',

  // Auth flows themselves. Obviously must be reachable while signed out, and
  // the catch-alls cover Clerk's own sub-steps (verify, reset, factor-two).
  '/sign-in(.*)',
  '/sign-up(.*)',

  // Uptime/monitoring. Reports only *whether* services are configured — never a
  // key, never a connection string. See src/app/api/health/route.ts.
  '/api/health',

  // Clerk user-deletion webhook (data retention — Sprint 2 follow-up).
  //
  // SECURITY: this is "public" ONLY to the auth middleware. Clerk's servers call it
  // with no user session, so auth.protect() would reject a legitimate delivery. It is
  // NOT unauthenticated — every request is verified by its Svix signature against
  // CLERK_WEBHOOK_SIGNING_SECRET before a single byte is trusted, and the route fails
  // CLOSED when the signature is absent, wrong, or the secret unset. Exact path, not a
  // catch-all, so nothing else under /api/webhooks is implicitly exposed.
  // See src/app/api/webhooks/clerk/route.ts.
  '/api/webhooks/clerk',

  // Standard marketing/trust nav (2026-07-14). Static content, no user data —
  // safe to serve to anyone, same as the plan catalog.
  '/about',
  '/faq',

  // Sprint 8: the offline fallback page.
  //
  // The service worker pre-caches it at install — which happens before anyone
  // signs in — so it MUST be reachable without a session, or the offline
  // experience is a login redirect that also cannot load.
  //
  // Safe: it contains no user data whatsoever. It deliberately tells the reader
  // that their saved *list* is NOT available offline, precisely because we refuse
  // to write a private library to an unencrypted device cache.
  '/offline',
] as const;

export const isPublicRoute = createRouteMatcher([...PUBLIC_ROUTES]);
