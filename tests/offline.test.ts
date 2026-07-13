import { describe, it, expect } from 'vitest';
import {
  isCacheable,
  isCacheableResponse,
  NEVER_CACHE_PREFIXES,
  CACHE_NAME,
  OFFLINE_URL,
} from '@/lib/offline';

/**
 * Sprint 8 — the offline caching policy.
 *
 * THIS IS A SECURITY TEST FILE, not a feature test file.
 *
 * A service worker cache is UNENCRYPTED, ORIGIN-SCOPED, and SURVIVES SIGN-OUT.
 * Anything written to it is readable by whoever picks up the phone. So the only
 * question that really matters here is:
 *
 *   Can a user's PRIVATE data end up on disk in cleartext?
 *
 * The policy lives in a plain module (not inside the service worker) precisely so
 * it can be tested. A security rule that only exists inside a service worker is a
 * security rule nobody can test.
 */

const ORIGIN = 'https://woodworking-plan.vercel.app';

const req = (path: string, method = 'GET') => ({
  method,
  url: `${ORIGIN}${path}`,
  origin: ORIGIN,
});

const res = (
  status = 200,
  headers: Record<string, string> = {},
): { status: number; headers: { get(name: string): string | null } } => ({
  status,
  headers: {
    get: (name: string) => headers[name.toLowerCase()] ?? null,
  },
});

describe('SECURITY: private routes are NEVER cached', () => {
  it("does not cache /saved — a user's private library must not go on disk", () => {
    expect(isCacheable(req('/saved'))).toBe(false);
    expect(isCacheable(req('/saved?collection=abc123'))).toBe(false);
  });

  it('does not cache /profile — account details', () => {
    expect(isCacheable(req('/profile'))).toBe(false);
  });

  it('does not cache API routes', () => {
    expect(isCacheable(req('/api/health'))).toBe(false);
    expect(isCacheable(req('/api/anything/invented/later'))).toBe(false);
  });

  it("does not cache Clerk's auth flows or their tokens", () => {
    expect(isCacheable(req('/sign-in'))).toBe(false);
    expect(isCacheable(req('/sign-in/factor-two'))).toBe(false);
    expect(isCacheable(req('/sign-up/verify-email-address'))).toBe(false);
  });

  it('the denylist covers every private surface the app has', () => {
    // If a future sprint adds a private route, it MUST be added here. This test
    // is the reminder — it lists what the policy currently knows about.
    expect(NEVER_CACHE_PREFIXES).toContain('/saved');
    expect(NEVER_CACHE_PREFIXES).toContain('/profile');
    expect(NEVER_CACHE_PREFIXES).toContain('/api');
    expect(NEVER_CACHE_PREFIXES).toContain('/sign-in');
    expect(NEVER_CACHE_PREFIXES).toContain('/sign-up');
  });

  it('SECURITY: a path that merely LOOKS public is still matched by prefix', () => {
    // Guard against a naive `=== '/saved'` check: /saved/anything must also be
    // refused, or a future sub-route silently becomes cacheable.
    expect(isCacheable(req('/saved/export'))).toBe(false);
    expect(isCacheable(req('/profile/settings'))).toBe(false);
  });

  it('SECURITY: a path merely CONTAINING a private prefix elsewhere is fine', () => {
    // /plans/api-cabinet is a plan, not an API route. The check is a prefix
    // match, not a substring match — a substring check would refuse to cache
    // perfectly public content and quietly break offline for it.
    expect(isCacheable(req('/plans/api-cabinet'))).toBe(true);
    expect(isCacheable(req('/plans/saved-tool-rack'))).toBe(true);
  });
});

describe('public plan content IS cached — the whole point of the sprint', () => {
  it('caches plan detail pages (BUSINESS_PLAN.md §5: readable with no signal)', () => {
    expect(isCacheable(req('/plans/edge-grain-maple-cutting-board'))).toBe(true);
  });

  it('caches the catalog and the offline page', () => {
    expect(isCacheable(req('/'))).toBe(true);
    expect(isCacheable(req(OFFLINE_URL))).toBe(true);
  });

  it('caches static assets', () => {
    expect(isCacheable(req('/icons/icon-192.png'))).toBe(true);
    expect(isCacheable(req('/_next/static/chunks/main.js'))).toBe(true);
  });

  it('this is safe because plan content is ALREADY public', () => {
    // BUSINESS_PLAN.md §12 gates saves, not content — a logged-out browser can
    // already read every published plan. Caching them leaks nothing that signing
    // out was ever protecting.
    expect(isCacheable(req('/plans/anything'))).toBe(true);
  });
});

describe('SECURITY: fails closed', () => {
  it('never caches a non-GET — a POST is a server action', () => {
    // Caching a mutation is meaningless, and re-serving one would be actively
    // dangerous.
    expect(isCacheable(req('/plans/x', 'POST'))).toBe(false);
    expect(isCacheable(req('/', 'POST'))).toBe(false);
    expect(isCacheable(req('/plans/x', 'DELETE'))).toBe(false);
  });

  it('never caches cross-origin responses — we are not a proxy for the internet', () => {
    expect(
      isCacheable({
        method: 'GET',
        url: 'https://evil.example.com/payload.js',
        origin: ORIGIN,
      }),
    ).toBe(false);

    // Clerk's own scripts included: they are not ours to cache or to stale.
    expect(
      isCacheable({
        method: 'GET',
        url: 'https://clerk.accounts.dev/npm/@clerk/clerk-js',
        origin: ORIGIN,
      }),
    ).toBe(false);
  });

  it('refuses a malformed URL rather than throwing', () => {
    expect(isCacheable({ method: 'GET', url: 'not a url', origin: ORIGIN })).toBe(
      false,
    );
  });
});

describe('SECURITY: the response gate — a public PATH can still carry a private RESPONSE', () => {
  it('never stores a response that sets a cookie', () => {
    // A response setting a cookie is, by definition, about *this* user. Even on a
    // public path.
    expect(
      isCacheableResponse(res(200, { 'set-cookie': '__session=abc; HttpOnly' })),
    ).toBe(false);
  });

  it('honours Cache-Control: no-store and private', () => {
    expect(isCacheableResponse(res(200, { 'cache-control': 'no-store' }))).toBe(false);
    expect(
      isCacheableResponse(res(200, { 'cache-control': 'private, max-age=0' })),
    ).toBe(false);
  });

  it('never stores an error response', () => {
    // Caching a 404 or a 500 would serve it back forever — an outage that
    // outlives the outage.
    expect(isCacheableResponse(res(404))).toBe(false);
    expect(isCacheableResponse(res(500))).toBe(false);
    expect(isCacheableResponse(res(302))).toBe(false);
  });

  it('stores an ordinary successful public response', () => {
    expect(isCacheableResponse(res(200))).toBe(true);
    expect(
      isCacheableResponse(res(200, { 'cache-control': 'public, max-age=0' })),
    ).toBe(true);
  });
});

describe('RSC payloads are never intercepted (production bug, fixed)', () => {
  it('does not cache a React Server Component payload', () => {
    // These are Next's client-navigation flight streams, not pages. Their content
    // depends on router state and the build id, so a cached one serves an OLD
    // build's payload into a NEW client.
    expect(
      isCacheable(req('/plans/cedar-raised-garden-bed?_rsc=cxciWW')),
    ).toBe(false);
    expect(isCacheable(req('/?_rsc=abc123'))).toBe(false);
  });

  it('still caches the SAME page when requested normally', () => {
    // The exclusion must be on the RSC marker, not on the path — otherwise the
    // offline capability this whole sprint exists for would be silently dead.
    expect(isCacheable(req('/plans/cedar-raised-garden-bed'))).toBe(true);
  });
});

describe('SPRINT 13: the PRINT view is cacheable — this is the whole argument', () => {
  it('caches /plans/x/print, so the workshop sheet works with no signal', () => {
    // This is WHY the sprint chose a print PAGE over a server-generated PDF. A PDF
    // endpoint requires a network round-trip to produce, which makes it the LEAST
    // offline-capable option — in the one sprint whose entire purpose is offline.
    //
    // A print page is public plan content, so the existing policy caches it for free.
    expect(isCacheable(req('/plans/edge-grain-maple-cutting-board/print'))).toBe(true);
  });

  it('caches the cut-list-only variant too', () => {
    // The query string is part of the cache key, so this is a distinct entry — and it
    // is the ONE sheet most likely to be wanted at the saw.
    expect(
      isCacheable(req('/plans/edge-grain-maple-cutting-board/print?view=cutlist')),
    ).toBe(true);
  });

  it('still refuses an RSC payload for the print route', () => {
    // The Sprint 8 RSC exclusion must not be accidentally bypassed by a new path.
    expect(
      isCacheable(req('/plans/edge-grain-maple-cutting-board/print?_rsc=abc')),
    ).toBe(false);
  });

  it('a print route under a PRIVATE prefix would still be refused', () => {
    // Defence in depth: if someone ever adds /saved/print, the denylist wins. The
    // policy is prefix-based and fails closed, and adding a print view must not become
    // a way to smuggle private data onto disk.
    expect(isCacheable(req('/saved/print'))).toBe(false);
    expect(isCacheable(req('/profile/print'))).toBe(false);
  });
});

describe('cache versioning', () => {
  it('has a versioned cache name so a deploy can invalidate stale plans', () => {
    // A plan is not immutable — a cut list can be corrected. Bumping this is how
    // a wrong dimension stops being served from a phone.
    expect(CACHE_NAME).toMatch(/-v\d+$/);
  });
});
