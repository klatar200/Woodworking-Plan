import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';

/**
 * Catalog page (Sprint 3). Replaces the Sprint 0 status-page test — that page no
 * longer exists.
 *
 * Uses a REAL static render rather than a hand-rolled element-tree walker, so the
 * PlanCard children actually render. A walker that only follows `props.children`
 * silently skips every child component — it would pass while rendering nothing,
 * which is the worst kind of green test.
 */

const listPlans = vi.fn();

vi.mock('@/lib/plans', () => ({ listPlans, PLANS_PER_PAGE: 12 }));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const plan = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  slug: 'edge-grain-maple-cutting-board',
  title: 'Edge-Grain Maple Cutting Board',
  summary: 'The classic first glue-up.',
  difficulty: 2,
  costTier: 'TIER_2',
  costMinCents: 5500,
  costMaxCents: 8500,
  timeMinMinutes: 240,
  timeMaxMinutes: 360,
  category: { slug: 'cutting-boards', name: 'Cutting Boards' },
  images: [],
  ...over,
});

beforeEach(() => {
  vi.resetModules();
  listPlans.mockReset();
});

const render = async (searchParams: Record<string, string> = {}) => {
  const { default: CatalogPage } = await import('@/app/page');
  const tree = (await CatalogPage({
    searchParams: Promise.resolve(searchParams),
  })) as ReactElement;
  return renderToStaticMarkup(tree);
};

describe('catalog page', () => {
  it('renders a card per plan, linking to its detail page', async () => {
    listPlans.mockResolvedValue({
      plans: [
        plan(),
        plan({ id: 'p2', slug: 'pine-bookcase', title: 'Simple Pine Bookcase' }),
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    });

    const html = await render();

    expect(html).toContain('Edge-Grain Maple Cutting Board');
    expect(html).toContain('Simple Pine Bookcase');
    expect(html).toContain('href="/plans/edge-grain-maple-cutting-board"');
    expect(html).toContain('href="/plans/pine-bookcase"');
  });

  it('shows the structured metadata that IS the product differentiator', async () => {
    listPlans.mockResolvedValue({ plans: [plan()], total: 1, page: 1, totalPages: 1 });

    const html = await render();

    expect(html).toContain('Easy'); // difficulty 2
    expect(html).toContain('$$'); // TIER_2
    expect(html).toContain('4–6 hrs'); // 240–360 minutes
    expect(html).toContain('Cutting Boards'); // category
  });

  it('pluralises the plan count', async () => {
    listPlans.mockResolvedValue({ plans: [plan()], total: 1, page: 1, totalPages: 1 });
    expect(await render()).toContain('1 plan');

    vi.resetModules();
    listPlans.mockResolvedValue({ plans: [plan()], total: 24, page: 1, totalPages: 2 });
    expect(await render()).toContain('24 plans');
  });

  it('shows an empty state rather than a blank page', async () => {
    listPlans.mockResolvedValue({ plans: [], total: 0, page: 1, totalPages: 1 });
    expect(await render()).toContain('No plans yet');
  });

  it('hides pagination when everything fits on one page', async () => {
    listPlans.mockResolvedValue({ plans: [plan()], total: 1, page: 1, totalPages: 1 });
    expect(await render()).not.toContain('Page 1 of');
  });

  it('shows pagination when there is more than one page', async () => {
    listPlans.mockResolvedValue({ plans: [plan()], total: 24, page: 1, totalPages: 2 });
    const html = await render();

    expect(html).toContain('Page 1 of 2');
    expect(html).toContain('href="/?page=2"');
    expect(html).not.toContain('Previous');
  });

  it('links back to a bare / from page 2, not /?page=1', async () => {
    listPlans.mockResolvedValue({ plans: [plan()], total: 24, page: 2, totalPages: 2 });
    const html = await render({ page: '2' });

    expect(html).toContain('href="/"');
    expect(html).not.toContain('href="/?page=1"');
    expect(html).not.toContain('Next');
  });

  it('SECURITY: a garbage page param degrades to page 1 — no raw input reaches the DB', async () => {
    for (const bad of ['abc', '-1', '0', '1; DROP TABLE Plan;--', '']) {
      vi.resetModules();
      listPlans.mockClear();
      listPlans.mockResolvedValue({ plans: [], total: 0, page: 1, totalPages: 1 });

      await render({ page: bad });

      expect(listPlans.mock.calls[0]![0].page, `page="${bad}"`).toBe(1);
    }
  });
});
