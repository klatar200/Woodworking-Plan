import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReactElement } from 'react';

/**
 * Catalog page (Sprint 3). Replaces the Sprint 0 status-page test — that page no
 * longer exists.
 *
 * Drives the page component directly: it's an async server component, so calling
 * it returns a React element tree we can walk. No DOM or renderer needed.
 */

const listPlans = vi.fn();

vi.mock('@/lib/plans', () => ({
  listPlans,
  PLANS_PER_PAGE: 12,
}));

/** Collects rendered text, following both children and the props our cards use. */
function textOf(node: unknown, out: string[] = []): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => textOf(child, out));
    return out;
  }

  const element = node as ReactElement<Record<string, unknown>>;
  const props = element.props ?? {};

  if (typeof props.href === 'string') out.push(`href:${props.href}`);
  if ('children' in props) textOf(props.children, out);

  return out;
}

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
  const tree = await CatalogPage({ searchParams: Promise.resolve(searchParams) });
  return textOf(tree).join(' | ');
};

describe('catalog page', () => {
  it('renders a card per plan, linking to its detail page', async () => {
    listPlans.mockResolvedValue({
      plans: [plan(), plan({ id: 'p2', slug: 'pine-bookcase', title: 'Simple Pine Bookcase' })],
      total: 2,
      page: 1,
      totalPages: 1,
    });

    const text = await render();

    expect(text).toContain('Edge-Grain Maple Cutting Board');
    expect(text).toContain('Simple Pine Bookcase');
    expect(text).toContain('href:/plans/edge-grain-maple-cutting-board');
    expect(text).toContain('href:/plans/pine-bookcase');
  });

  it('shows the structured metadata that IS the product differentiator', async () => {
    listPlans.mockResolvedValue({ plans: [plan()], total: 1, page: 1, totalPages: 1 });

    const text = await render();

    expect(text).toContain('Easy'); // difficulty 2
    expect(text).toContain('$$'); // TIER_2
    expect(text).toContain('4–6 hrs'); // 240-360 min
    expect(text).toContain('Cutting Boards');
  });

  it('pluralises the count correctly', async () => {
    listPlans.mockResolvedValue({ plans: [plan()], total: 1, page: 1, totalPages: 1 });
    expect(await render()).toContain('1 plan ');

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
    const text = await render();

    expect(text).toContain('Page 1 of 2');
    expect(text).toContain('href:/?page=2');
    expect(text).not.toContain('Previous');
  });

  it('links back to a bare / from page 2, not /?page=1', async () => {
    listPlans.mockResolvedValue({ plans: [plan()], total: 24, page: 2, totalPages: 2 });
    const text = await render({ page: '2' });

    expect(text).toContain('href:/');
    expect(text).not.toContain('href:/?page=1');
    expect(text).not.toContain('Next');
  });

  it('SECURITY: a garbage page param degrades to page 1 instead of reaching the DB', async () => {
    listPlans.mockResolvedValue({ plans: [], total: 0, page: 1, totalPages: 1 });

    for (const bad of ['abc', '-1', '0', "1; DROP TABLE Plan;--", '']) {
      vi.resetModules();
      listPlans.mockClear();
      listPlans.mockResolvedValue({ plans: [], total: 0, page: 1, totalPages: 1 });

      await render({ page: bad });

      const arg = listPlans.mock.calls[0]![0];
      expect(arg.page, `page="${bad}"`).toBe(1);
    }
  });
});
