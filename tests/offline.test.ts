import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

/**
 * Sprint 8 — the offline caching policy. Sprint 14 added the consented private cache.
 * The policy was de-duplicated 2026-07-14: it now lives ONCE, in public/sw-policy.js.
 *
 * THIS IS A SECURITY TEST FILE, not a feature test file.
 *
 * A service worker cache is UNENCRYPTED, ORIGIN-SCOPED, and SURVIVES SIGN-OUT. Anything
 * written to it is readable by whoever picks up the phone. So the only question that
 * really matters is: can a user's PRIVATE data end up on disk in cleartext?
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY THIS LOADS public/sw-policy.js DIRECTLY (via a Node `vm` sandbox):
 *
 * The policy used to live twice — a testable TS module AND a copy inside the worker —
 * and only a string-matching test guarded the two against drifting. Now there is one
 * copy, and this test exercises THAT EXACT FILE: the functions asserted below are the
 * functions the browser runs. There is no mirror to fall out of step.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

function loadPolicy() {
  const code = readFileSync(resolve(process.cwd(), 'public/sw-policy.js'), 'utf8');
  // The worker attaches its API to `self`; give the sandbox a `self` and the `URL`
  // global the predicates use, then run the real shipped file.
  const context: { self: Record<string, unknown>; URL: typeof URL } = { self: {}, URL };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.self.OfflinePolicy as {
    CACHE_NAME: string;
    PRIVATE_CACHE_NAME: string;
    OFFLINE_URL: string;
    PRECACHE_URLS: string[];
    NEVER_CACHE_PREFIXES: string[];
    DOWNLOADABLE_PREFIXES: string[];
    SW_MESSAGES: Record<string, string>;
    isCacheable: (r: { method: string; url: string; origin: string; rscHeader?: boolean }) => boolean;
    isDownloadable: (r: { method: string; url: string; origin: string; rscHeader?: boolean }) => boolean;
    isCacheableResponse: (r: { status: number; headers: { get(n: string): string | null } }) => boolean;
    isDownloadableResponse: (r: { status: number; headers: { get(n: string): string | null } }) => boolean;
  };
}

const {
  isCacheable,
  isCacheableResponse,
  isDownloadable,
  isDownloadableResponse,
  NEVER_CACHE_PREFIXES,
  DOWNLOADABLE_PREFIXES,
  CACHE_NAME,
  PRIVATE_CACHE_NAME,
  OFFLINE_URL,
} = loadPolicy();

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

  it('does not cache /builds — a per-person build log (Sprint 27)', () => {
    expect(isCacheable(req('/builds'))).toBe(false);
  });

  it('does not cache /workshop — a user’s owned-tools profile (Sprint 25)', () => {
    expect(isCacheable(req('/workshop'))).toBe(false);
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
    expect(NEVER_CACHE_PREFIXES).toContain('/saved');
    expect(NEVER_CACHE_PREFIXES).toContain('/profile');
    expect(NEVER_CACHE_PREFIXES).toContain('/builds');
    expect(NEVER_CACHE_PREFIXES).toContain('/workshop');
    expect(NEVER_CACHE_PREFIXES).toContain('/api');
    expect(NEVER_CACHE_PREFIXES).toContain('/sign-in');
    expect(NEVER_CACHE_PREFIXES).toContain('/sign-up');
  });

  it('SECURITY: a path that merely LOOKS public is still matched by prefix', () => {
    expect(isCacheable(req('/saved/export'))).toBe(false);
    expect(isCacheable(req('/profile/settings'))).toBe(false);
  });

  it('SECURITY: a path merely CONTAINING a private prefix elsewhere is fine', () => {
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
    expect(isCacheable(req('/plans/anything'))).toBe(true);
  });
});

describe('SECURITY: fails closed', () => {
  it('never caches a non-GET — a POST is a server action', () => {
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

    expect(
      isCacheable({
        method: 'GET',
        url: 'https://clerk.accounts.dev/npm/@clerk/clerk-js',
        origin: ORIGIN,
      }),
    ).toBe(false);
  });

  it('refuses a malformed URL rather than throwing', () => {
    expect(isCacheable({ method: 'GET', url: 'not a url', origin: ORIGIN })).toBe(false);
  });
});

describe('SECURITY: the response gate — a public PATH can still carry a private RESPONSE', () => {
  it('never stores a response that sets a cookie', () => {
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
  it('does not cache a React Server Component payload (query marker)', () => {
    expect(isCacheable(req('/plans/cedar-raised-garden-bed?_rsc=cxciWW'))).toBe(false);
    expect(isCacheable(req('/?_rsc=abc123'))).toBe(false);
  });

  it('does not cache an RSC request identified by the RSC header', () => {
    // The worker reads the `RSC` request header and passes it through as `rscHeader`.
    // A navigation and its RSC prefetch share a URL but differ by this header.
    expect(
      isCacheable({ ...req('/plans/cedar-raised-garden-bed'), rscHeader: true }),
    ).toBe(false);
  });

  it('still caches the SAME page when requested normally', () => {
    expect(isCacheable(req('/plans/cedar-raised-garden-bed'))).toBe(true);
  });
});

describe('SPRINT 13: the PRINT view is cacheable — this is the whole argument', () => {
  it('caches /plans/x/print, so the workshop sheet works with no signal', () => {
    expect(isCacheable(req('/plans/edge-grain-maple-cutting-board/print'))).toBe(true);
  });

  it('caches the cut-list-only variant too', () => {
    expect(
      isCacheable(req('/plans/edge-grain-maple-cutting-board/print?view=cutlist')),
    ).toBe(true);
  });

  it('still refuses an RSC payload for the print route', () => {
    expect(
      isCacheable(req('/plans/edge-grain-maple-cutting-board/print?_rsc=abc')),
    ).toBe(false);
  });

  it('a print route under a PRIVATE prefix would still be refused', () => {
    expect(isCacheable(req('/saved/print'))).toBe(false);
    expect(isCacheable(req('/profile/print'))).toBe(false);
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPRINT 14 — the consented private cache.
 *   - isCacheable()   — what the worker may store ON ITS OWN. Fails closed.
 *   - isDownloadable() — what the USER may explicitly ask us to store. Consent.
 *   - Two separate caches, so the sign-out wipe is TOTAL.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe('SPRINT 14: the worker still NEVER caches private data on its own', () => {
  it('refuses /shopping-list — it is derived from the saved library', () => {
    expect(isCacheable(req('/shopping-list'))).toBe(false);
    expect(isCacheable(req('/shopping-list?collection=abc'))).toBe(false);
  });

  it('browsing to a private page while ONLINE caches nothing', () => {
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
    expect(isDownloadable(req('/shopping-list'))).toBe(true);
    expect(isDownloadable(req('/shopping-list?collection=abc'))).toBe(true);
  });

  it('the user CAN download their saved list and their plans', () => {
    expect(isDownloadable(req('/saved'))).toBe(true);
    expect(isDownloadable(req('/plans/cedar-raised-garden-bed'))).toBe(true);
    expect(isDownloadable(req('/plans/cedar-raised-garden-bed/print'))).toBe(true);
  });

  it('SECURITY: consent is NOT a licence to store anything at all', () => {
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

    expect(isDownloadable(req('/shopping-list', 'POST'))).toBe(false);
  });

  it('still refuses RSC payloads on the consented path too', () => {
    expect(isDownloadable(req('/shopping-list?_rsc=abc'))).toBe(false);
  });
});

describe('SPRINT 14: the two response gates are SEPARATE functions, deliberately', () => {
  it('the PUBLIC gate still refuses a Set-Cookie response', () => {
    expect(
      isCacheableResponse(res(200, { 'set-cookie': '__session=abc; HttpOnly' })),
    ).toBe(false);
  });

  it('the CONSENTED gate ALLOWS Set-Cookie — a private page legitimately carries one', () => {
    expect(
      isDownloadableResponse(res(200, { 'set-cookie': '__session=abc; HttpOnly' })),
    ).toBe(true);
  });

  it('but the consented gate still honours no-store and refuses errors', () => {
    expect(isDownloadableResponse(res(200, { 'cache-control': 'no-store' }))).toBe(false);
    expect(isDownloadableResponse(res(401))).toBe(false);
    expect(isDownloadableResponse(res(302))).toBe(false);
  });
});

describe('SPRINT 14: two caches, so the sign-out wipe cannot miss anything', () => {
  it('public and private data live in DIFFERENT caches', () => {
    expect(PRIVATE_CACHE_NAME).not.toBe(CACHE_NAME);
  });

  it('both cache names are versioned', () => {
    expect(CACHE_NAME).toMatch(/-v\d+$/);
    expect(PRIVATE_CACHE_NAME).toMatch(/-v\d+$/);
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE-DUPLICATION (2026-07-14): the policy lives ONCE, and the worker CONSUMES it.
 *
 * These tests replace the old "change one, change both" string-matching. They assert the
 * worker loads the shared policy and does NOT re-declare it — so the class of bug the old
 * tests only partially caught (drift in predicate LOGIC, not just constants) is now
 * structurally impossible: there is one copy.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe('the shipped worker consumes the single policy source, not a copy', () => {
  const sw = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

  it('loads the policy via importScripts and reads it from self.OfflinePolicy', () => {
    expect(sw).toContain("importScripts('/sw-policy.js')");
    expect(sw).toContain('self.OfflinePolicy');
  });

  it('does NOT re-declare the policy — the private prefixes appear only in sw-policy.js', () => {
    // If sw.js hardcoded these again, we would be back to two copies that can drift. The
    // worker references them only through the destructured predicates, never by literal.
    expect(sw).not.toContain('NEVER_CACHE_PREFIXES = [');
    expect(sw).not.toContain("'/profile'");
    expect(sw).not.toContain("'/shopping-list'");
  });

  it('the shipped worker never writes the private cache from its fetch handler', () => {
    // The one structural invariant of Sprint 14: nothing lands in the private cache as a
    // side effect of browsing. Only the explicit DOWNLOAD_LIBRARY message writes it.
    const fetchHandler = sw.slice(
      sw.indexOf("addEventListener('fetch'"),
      sw.indexOf("addEventListener('message'"),
    );

    expect(fetchHandler).not.toContain('caches.open(PRIVATE_CACHE_NAME)');
    expect(fetchHandler).not.toContain('privateCache.put');
  });

  it('the shipped worker handles the sign-out wipe', () => {
    // If CLEAR_PRIVATE is ever removed, the mitigation the whole offline-library decision
    // rests on is gone — silently. It now comes from SW_MESSAGES, so assert both the wipe
    // call and that the message name still resolves through the shared policy.
    expect(sw).toContain('SW_MESSAGES.CLEAR_PRIVATE');
    expect(sw).toContain('caches.delete(PRIVATE_CACHE_NAME)');
  });
});
