import { describe, it, expect, vi } from 'vitest';

/**
 * QOL-M Step 1 — the root route.
 *
 * The catalog moved to `/browse`; `/` is now a temporary redirect there until Step 2
 * builds the landing page. This pins the interim behaviour so `/` never silently 404s
 * after the move. (`redirect` is stubbed — the real one throws NEXT_REDIRECT.)
 */
const redirect = vi.fn();
vi.mock('next/navigation', () => ({ redirect }));

describe('root route (/)', () => {
  it('redirects to the catalog at /browse', async () => {
    const { default: HomePage } = await import('@/app/page');
    HomePage();
    expect(redirect).toHaveBeenCalledWith('/browse');
  });
});
