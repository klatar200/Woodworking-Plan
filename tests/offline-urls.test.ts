import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { offlineDownloadUrls } from '@/lib/offline-urls';

/**
 * The "Make available offline" download list — Sprint 14, extended for learning paths
 * 2026-07-14.
 *
 * This is a SECURITY-shaped test: the list decides what gets written to an unencrypted,
 * sign-out-surviving cache. The key assertion is the cross-check — EVERY url this
 * function emits must be one the real service-worker policy (public/sw-policy.js) is
 * willing to download. If they ever disagree, the download would silently skip URLs (a
 * page missing in the shop) or — worse — the list would name something the worker should
 * refuse. Testing them together is what keeps the two honest.
 */

function loadPolicy() {
  const code = readFileSync(resolve(process.cwd(), 'public/sw-policy.js'), 'utf8');
  const context: { self: Record<string, unknown>; URL: typeof URL } = { self: {}, URL };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.self.OfflinePolicy as {
    isDownloadable: (r: { method: string; url: string; origin: string }) => boolean;
    isCacheable: (r: { method: string; url: string; origin: string }) => boolean;
  };
}

const { isDownloadable, isCacheable } = loadPolicy();
const ORIGIN = 'https://woodworking-plan.vercel.app';

const INPUT = {
  planSlugs: ['edge-grain-maple-cutting-board', 'cedar-raised-garden-bed'],
  collectionIds: ['col_abc', 'col_def'],
  pathSlugs: ['your-first-five', 'the-cutting-board-path'],
};

describe('offlineDownloadUrls', () => {
  it('includes each saved plan, its print views, and its board plan', () => {
    const urls = offlineDownloadUrls(INPUT);
    for (const slug of INPUT.planSlugs) {
      expect(urls).toContain(`/plans/${slug}`);
      expect(urls).toContain(`/plans/${slug}/print`);
      expect(urls).toContain(`/plans/${slug}/print?view=cutlist`);
      expect(urls).toContain(`/plans/${slug}/boards`);
      // The build page — where "Start building" points (2026-07-16).
      expect(urls).toContain(`/plans/${slug}/build`);
    }
  });

  it('includes the shopping list, one per collection, and the saved list', () => {
    const urls = offlineDownloadUrls(INPUT);
    expect(urls).toContain('/shopping-list');
    expect(urls).toContain('/shopping-list?collection=col_abc');
    expect(urls).toContain('/shopping-list?collection=col_def');
    expect(urls).toContain('/saved');
  });

  it('includes the learning-paths hub and each path — the Sprint 16 gap, now closed', () => {
    const urls = offlineDownloadUrls(INPUT);
    expect(urls).toContain('/paths');
    expect(urls).toContain('/paths/your-first-five');
    expect(urls).toContain('/paths/the-cutting-board-path');
  });

  it('SECURITY: every emitted URL is one the real worker policy will download', () => {
    // The cross-check. If this fails, the component and the worker disagree about what is
    // downloadable — a silent hole in either direction.
    const urls = offlineDownloadUrls(INPUT);
    for (const url of urls) {
      const request = { method: 'GET', url: `${ORIGIN}${url}`, origin: ORIGIN };
      expect(isDownloadable(request), `${url} must be downloadable`).toBe(true);
    }
  });

  it('the learning paths route to the PUBLIC cache — they are public content', () => {
    // Paths are curated catalog content, not user data. The worker routes by isCacheable,
    // so this confirms they land in the public cache (not the private, sign-out-wiped one).
    for (const slug of INPUT.pathSlugs) {
      const request = { method: 'GET', url: `${ORIGIN}/paths/${slug}`, origin: ORIGIN };
      expect(isCacheable(request)).toBe(true);
    }
    expect(isCacheable({ method: 'GET', url: `${ORIGIN}/paths`, origin: ORIGIN })).toBe(true);
  });

  it('the private entries route to the PRIVATE cache — /saved and /shopping-list', () => {
    // These are the user's own data: downloadable by consent, but NOT cacheable on the
    // worker's own initiative, so they go to the private cache that the sign-out wipe clears.
    for (const url of ['/saved', '/shopping-list', '/shopping-list?collection=col_abc']) {
      const request = { method: 'GET', url: `${ORIGIN}${url}`, origin: ORIGIN };
      expect(isDownloadable(request)).toBe(true);
      expect(isCacheable(request)).toBe(false);
    }
  });

  it('emits nothing for an empty library', () => {
    // Not strictly empty — the hub and the whole-library shopping list are always useful —
    // but it must not crash or emit malformed URLs with undefined slugs.
    const urls = offlineDownloadUrls({ planSlugs: [], collectionIds: [], pathSlugs: [] });
    expect(urls).toEqual(['/shopping-list', '/saved', '/paths']);
    expect(urls.some((u) => u.includes('undefined'))).toBe(false);
  });
});
