import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * QOL-G — the pilot route is DEV-ONLY, and that has to be enforced by the code rather
 * than by nobody linking to it.
 *
 * A dev route that ships to production is a live page nobody reviewed, on a domain
 * anybody can guess a path on. `/dev/diagrams` is scaffolding for a decision Keagan has
 * not made yet; it must not exist on the deployed site at all.
 *
 * TWO INDEPENDENT GATES, both asserted here:
 *   1. `NODE_ENV === 'production'` → `notFound()`, before any query or any read of the
 *      search params. This is the real one — it holds for a signed-in user and an admin
 *      alike, because "is this feature approved" is not an authorization question.
 *   2. The path is NOT on the `PUBLIC_ROUTES` allowlist, so the middleware demands a
 *      session too. Redundant in production, correct in development.
 */

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const getPlanBySlug = vi.fn();

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/plans', () => ({ getPlanBySlug }));
vi.mock('next/link', () => ({ default: () => null }));

beforeEach(() => {
  vi.resetModules();
  notFound.mockClear();
  getPlanBySlug.mockReset().mockResolvedValue(null);
});

/**
 * NOTE ON THE NON-PRODUCTION CASES: they run under vitest's own `NODE_ENV=test` rather
 * than a stubbed `'development'`. React's JSX runtime picks its dev/prod entry point from
 * `NODE_ENV` at import time, so stubbing it mid-suite yields `jsxDEV is not a function` —
 * a failure of the harness, not of the gate. `'test'` exercises the identical branch: the
 * gate asks `=== 'production'`, so every non-production value behaves the same way, which
 * is the property being tested.
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

async function render() {
  const { default: DevDiagramsPage } = await import('@/app/dev/diagrams/page');
  return DevDiagramsPage({ searchParams: Promise.resolve({}) });
}

/**
 * ORDER IS DELIBERATE: the two rendering cases run BEFORE the production one.
 * `vi.stubEnv('NODE_ENV', 'production')` changes which entry point React's JSX runtime
 * resolves to on the next fresh import, so once a test in this file has rendered under
 * `production`, a later render in the same file fails with `jsxDEV is not a function` —
 * a harness artefact, not a defect in the gate. The production case renders nothing, so
 * putting it last costs nothing.
 */
describe('GATE 1: the pilot route is dev-only', () => {
  it('renders outside production, so the pilot is actually usable locally', async () => {
    await expect(render()).resolves.toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
    expect(getPlanBySlug).toHaveBeenCalled();
  });

  it('survives a pilot plan being missing rather than crashing', async () => {
    // getPlanBySlug returns null for unknown AND unpublished slugs alike — a pilot slug
    // that gets renamed or unpublished must not take the page down.
    getPlanBySlug.mockResolvedValue(null);

    await expect(render()).resolves.toBeTruthy();
  });

  it('404s in PRODUCTION, and does no data work on the way out', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    // The gate runs before anything else — a 404 that still queried five plans would be
    // a 404 that still costs five queries.
    expect(getPlanBySlug).not.toHaveBeenCalled();
  });
});

describe('GATE 2: /dev is not on the public allowlist', () => {
  const isPublic = async (pathname: string) => {
    const { isPublicRoute } = await import('@/lib/public-routes');
    return isPublicRoute({ nextUrl: { pathname } } as never);
  };

  it('requires a session — the allowlist fails CLOSED for anything unlisted', async () => {
    expect(await isPublic('/dev/diagrams')).toBe(false);
    expect(await isPublic('/dev')).toBe(false);
  });

  /**
   * `/plans(.*)` IS public. A dev route that happened to live under it would inherit
   * that, which is the kind of thing nobody notices until it is indexed — so the pilot
   * deliberately lives at `/dev/...`, outside every public prefix.
   */
  it('does not hide under a public prefix', async () => {
    expect(await isPublic('/plans/dev-diagrams')).toBe(true);
    expect(await isPublic('/dev/diagrams')).toBe(false);
  });
});
