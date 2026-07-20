import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

// NOTE: this is a `.ts` file (esbuild won't parse JSX here), so the mock components are
// built with createElement rather than JSX. The page under test is a server component we
// invoke directly, so no JSX is needed in this file.

/**
 * The root route `/` — QOL-M.
 *
 * Repurposed from the Step-1 redirect test: in Step 2 `/` became the marketing LANDING
 * page (the interim redirect is gone). These pin the two properties that matter — the
 * primary CTA goes to the catalog at `/browse`, and the featured plans come from the REAL
 * Trending query, not fabricated picks. (`git mv` to `landing-page.test.ts` when convenient.)
 */

const queryPlans = vi.fn();
const getPlanBySlug = vi.fn();

vi.mock('@/lib/plans', () => ({ queryPlans, getPlanBySlug }));
// The real PlanCard reaches Clerk (SaveToggle); the landing only needs its title here.
vi.mock('@/components/plan-card', () => ({
  PlanCard: ({ plan }: { plan: { title: string } }) =>
    createElement('li', { className: 'plan-card' }, plan.title),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement('a', { href }, children),
}));

const plan = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  slug: 'edge-grain-maple-cutting-board',
  title: 'Edge-Grain Maple Cutting Board',
  ...over,
});

beforeEach(() => {
  vi.resetModules();
  queryPlans
    .mockReset()
    .mockResolvedValue({
      plans: [plan(), plan({ id: 'p2', slug: 'x-bench', title: 'X Bench' })],
    });
  // null → the hero's showcase cut-list panel is skipped; the rest of the page still renders.
  getPlanBySlug.mockReset().mockResolvedValue(null);
});

const render = async () => {
  const { default: LandingPage } = await import('@/app/page');
  const tree = (await LandingPage()) as ReactElement;
  return renderToStaticMarkup(tree);
};

describe('landing page (/)', () => {
  it('leads with a primary CTA into the catalog at /browse', async () => {
    const html = await render();
    expect(html).toContain('href="/browse"');
    expect(html).toContain('Browse the plans');
  });

  it('pulls featured plans from the real Trending query', async () => {
    const html = await render();
    expect(queryPlans).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'trending' }),
    );
    expect(html).toContain('X Bench');
  });
});
