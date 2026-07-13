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
  // The catalog landing page. Browse/search stay free to build the habit —
  // BUSINESS_PLAN.md §12 explicitly gates saves/categories, NOT content.
  '/',

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

  // Auth flows themselves. Obviously must be reachable while signed out, and
  // the catch-alls cover Clerk's own sub-steps (verify, reset, factor-two).
  '/sign-in(.*)',
  '/sign-up(.*)',

  // Uptime/monitoring. Reports only *whether* services are configured — never a
  // key, never a connection string. See src/app/api/health/route.ts.
  '/api/health',
] as const;

export const isPublicRoute = createRouteMatcher([...PUBLIC_ROUTES]);
