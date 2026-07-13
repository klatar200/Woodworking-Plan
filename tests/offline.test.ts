import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isCacheable,
  isCacheableResponse,
  isDownloadable,
  isDownloadableResponse,
  NEVER_CACHE_PREFIXES,
  DOWNLOADABLE_PREFIXES,
  CACHE_NAME,
  PRIVATE_CACHE_NAME,
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

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPRINT 14 — the consented private cache.
 *
 * The Sprint 8 rule said we never write a private library to disk. That was OVERSTATED
 * (saving a plan pre-caches its page, so the cache already approximated the library).
 * Sprint 14 replaces the pretence with a structure:
 *
 *   - isCacheable()   — what the worker may store ON ITS OWN. Still fails closed.
 *   - isDownloadable() — what the USER may explicitly ask us to store. Consent.
 *   - Two separate caches, so the sign-out wipe is TOTAL.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe('SPRINT 14: the worker still NEVER caches private data on its own', () => {
  it('refuses /shopping-list — it is derived from the saved library', () => {
    // As private as the library itself: it is literally a list of what you saved.
    expect(isCacheable(req('/shopping-list'))).toBe(false);
    expect(isCacheable(req('/shopping-list?collection=abc'))).toBe(false);
  });

  it('browsing to a private page while ONLINE caches nothing', () => {
    // Nothing lands in the private cache as a side effect of using the app. The ONLY
    // path that writes there is the explicit download. This is the whole design.
    for (const path of ['/saved', '/profile', '/shopping-list']) {
      expect(isCacheable(req(path))).toBe(false);
    }
  });

  it('the private prefixes still fail closed', () => {
    expect(NEVER_CACHE_PREFIXES).toContain('/shopping-list');
    expect(NEVER_CACHE_PREFIXES).toContain('/saved');
    expect(NEVER_CACHE_PREFIXES).toContain('/profile');
  });
});

describe('SPRINT 14: CONSENT — what the user may explicitly download', () => {
  it('the user CAN download their shopping list — this closes the §5 gap', () => {
    // BUSINESS_PLAN.md §5 calls "usable in a hardware store with no signal" the single
    // most important capability. Sprint 12 had to ship without it. This is the fix.
    expect(isDownloadable(req('/shopping-list'))).toBe(true);
    expect(isDownloadable(req('/shopping-list?collection=abc'))).toBe(true);
  });

  it('the user CAN download their saved list and their plans', () => {
    expect(isDownloadable(req('/saved'))).toBe(true);
    expect(isDownloadable(req('/plans/cedar-raised-garden-bed'))).toBe(true);
    expect(isDownloadable(req('/plans/cedar-raised-garden-bed/print'))).toBe(true);
  });

  it('SECURITY: consent is NOT a licence to store anything at all', () => {
    // A compromised page could send a DOWNLOAD_LIBRARY message with any URLs it liked.
    // The worker re-checks every one against this allowlist, so it cannot be used to
    // stash the account page — or anything else — on disk.
    expect(isDownloadable(req('/profile'))).toBe(false);
    expect(isDownloadable(req('/api/health'))).toBe(false);
    expect(isDownloadable(req('/sign-in'))).toBe(false);

    expect(DOWNLOADABLE_PREFIXES).not.toContain('/profile');
    expect(DOWNLOADABLE_PREFIXES).not.toContain('/api');
  });

  it('SECURITY: still refuses cross-origin and non-GET, consent or not', () => {
    expect(
      isDownloadable({
        method: 'GET',
        url: 'https://evil.example.com/x',
        origin: ORIGIN,
      }),
    ).toBe(false);

    // A user asking for their shopping list is not asking us to replay a mutation.
    expect(isDownloadable(req('/shopping-list', 'POST'))).toBe(false);
  });

  it('still refuses RSC payloads on the consented path too', () => {
    expect(isDownloadable(req('/shopping-list?_rsc=abc'))).toBe(false);
  });
});

describe('SPRINT 14: the two response gates are SEPARATE functions, deliberately', () => {
  it('the PUBLIC gate still refuses a Set-Cookie response', () => {
    // A response that sets a cookie is about *this* user. It must never reach the
    // public cache — where it would survive sign-out and never be wiped.
    expect(
      isCacheableResponse(res(200, { 'set-cookie': '__session=abc; HttpOnly' })),
    ).toBe(false);
  });

  it('the CONSENTED gate ALLOWS Set-Cookie — a private page legitimately carries one', () => {
    // This is the ONLY difference between the two gates, and it is exactly why they are
    // separate functions rather than one function with a boolean flag: a flag would be
    // one careless `true` away from letting a session-bearing response into the PUBLIC
    // cache.
    expect(
      isDownloadableResponse(res(200, { 'set-cookie': '__session=abc; HttpOnly' })),
    ).toBe(true);
  });

  it('but the consented gate still honours no-store and refuses errors', () => {
    // If the server says do not store this, we do not — whatever the user asked for.
    expect(isDownloadableResponse(res(200, { 'cache-control': 'no-store' }))).toBe(false);
    expect(isDownloadableResponse(res(401))).toBe(false);
    expect(isDownloadableResponse(res(302))).toBe(false);
  });
});

describe('SPRINT 14: two caches, so the sign-out wipe cannot miss anything', () => {
  it('public and private data live in DIFFERENT caches', () => {
    // Deleting the whole private cache — rather than walking entries and deciding which
    // are private — is what makes the sign-out wipe total. One cache with mixed content
    // would mean the wipe is only as good as the filter that walks it.
    expect(PRIVATE_CACHE_NAME).not.toBe(CACHE_NAME);
  });

  it('both cache names are versioned', () => {
    expect(CACHE_NAME).toMatch(/-v\d+$/);
    expect(PRIVATE_CACHE_NAME).toMatch(/-v\d+$/);
  });
});

/**
 * "CHANGE ONE, CHANGE BOTH" — now actually ENFORCED.
 *
 * The policy lives twice: in this module (testable) and in public/sw.js (shipped). Every
 * comment in both files says to keep them in step, and until now NOTHING CHECKED. A rule
 * that relies on someone remembering is a rule that gets forgotten — and the failure is
 * silent, because the tests would keep passing against a module the browser never runs.
 *
 * These tests read the real shipped worker off disk and assert the parts that must match.
 */
describe('the shipped worker and this policy module do not drift apart', () => {
  const sw = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

  it('the cache names match the shipped worker', () => {
    // A mismatch here means a deploy evicts the wrong cache — or evicts nothing, and
    // stale content is served forever.
    expect(sw).toContain(`'${CACHE_NAME}'`);
    expect(sw).toContain(`'${PRIVATE_CACHE_NAME}'`);
  });

  it('every NEVER_CACHE prefix is in the shipped worker', () => {
    // Add a private route here and forget the worker, and the worker happily caches it.
    // That is a data leak whose test suite is green.
    for (const prefix of NEVER_CACHE_PREFIXES) {
      expect(sw).toContain(`'${prefix}'`);
    }
  });

  it('the shipped worker never writes the private cache from its fetch handler', () => {
    // The one structural invariant of Sprint 14: nothing lands in the private cache as
    // a side effect of browsing. Only the explicit DOWNLOAD_LIBRARY message writes it.
    const fetchHandler = sw.slice(
      sw.indexOf("addEventListener('fetch'"),
      sw.indexOf("addEventListener('message'"),
    );

    expect(fetchHandler).not.toContain('caches.open(PRIVATE_CACHE_NAME)');
    expect(fetchHandler).not.toContain('privateCache.put');
  });

  it('the shipped worker handles the sign-out wipe', () => {
    // If CLEAR_PRIVATE is ever removed or renamed, the mitigation the entire
    // offline-library decision rests on is gone — silently.
    expect(sw).toContain('CLEAR_PRIVATE');
    expect(sw).toContain(`caches.delete(PRIVATE_CACHE_NAME)`);
  });
});

describe('cache versioning', () => {
  it('has a versioned cache name so a deploy can invalidate stale plans', () => {
    // A plan is not immutable — a cut list can be corrected. Bumping this is how
    // a wrong dimension stops being served from a phone.
    expect(CACHE_NAME).toMatch(/-v\d+$/);
  });
});
