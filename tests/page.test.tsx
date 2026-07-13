import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';

/**
 * Catalog page — browse (Sprint 3) + search (Sprint 4) + filters (Sprint 5).
 *
 * Uses a REAL static render, not a hand-rolled element-tree walker, so child
 * components actually render. A walker that only follows `props.children`
 * silently skips every child component — it would pass while rendering nothing,
 * which is the worst kind of green test.
 */

const queryPlans = vi.fn();
const listCategories = vi.fn();
const listFilterableTools = vi.fn();

vi.mock('@/lib/plans', () => ({
  queryPlans,
  listCategories,
  listFilterableTools,
  PLANS_PER_PAGE: 12,
}));

/**
 * Sprint 10. The catalog fetches rating summaries for the plans on the page — one
 * groupBy, not one query per card. Mocked to an empty Map: an unreviewed catalog is
 * the default state, and the cards must render fine without a single review.
 */
const getRatingSummaries = vi.fn();

vi.mock('@/lib/reviews', () => ({ getRatingSummaries }));

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
  // Sprint 7: like count is COUNTED, never a column.
  _count: { likes: 0 },
  ...over,
});

const result = (over: Record<string, unknown> = {}) => ({
  plans: [plan()],
  total: 1,
  page: 1,
  totalPages: 1,
  query: '',
  ...over,
});

beforeEach(() => {
  vi.resetModules();
  getRatingSummaries.mockReset().mockResolvedValue(new Map());
  queryPlans.mockReset().mockResolvedValue(result());
  listCategories.mockReset().mockResolvedValue([
    { slug: 'cutting-boards', name: 'Cutting Boards' },
    { slug: 'furniture', name: 'Furniture' },
  ]);
  listFilterableTools.mockReset().mockResolvedValue([
    { slug: 'table-saw', name: 'Table Saw', category: 'Power Saw' },
    { slug: 'router', name: 'Router', category: 'Milling' },
  ]);
});

const render = async (searchParams: Record<string, string | string[]> = {}) => {
  const { default: CatalogPage } = await import('@/app/page');
  const tree = (await CatalogPage({
    searchParams: Promise.resolve(searchParams),
  })) as ReactElement;
  return renderToStaticMarkup(tree);
};

describe('catalog page — browse', () => {
  it('renders a card per plan, linking to its detail page', async () => {
    queryPlans.mockResolvedValue(
      result({
        plans: [
          plan(),
          plan({ id: 'p2', slug: 'pine-bookcase', title: 'Simple Pine Bookcase' }),
        ],
        total: 2,
      }),
    );

    const html = await render();

    expect(html).toContain('Edge-Grain Maple Cutting Board');
    expect(html).toContain('href="/plans/pine-bookcase"');
  });

  it('shows the structured metadata that IS the product differentiator', async () => {
    const html = await render();

    expect(html).toContain('Easy'); // difficulty 2
    expect(html).toContain('$$'); // TIER_2
    expect(html).toContain('4–6 hrs'); // 240–360 minutes
    expect(html).toContain('Cutting Boards');
  });

  it('offers the search box and the filter panel', async () => {
    const html = await render();

    expect(html).toContain('name="q"');
    expect(html).toContain('role="search"');
    expect(html).toContain('Filters');
    expect(html).toContain('Tools you own');
  });

  it('shows an empty state rather than a blank page', async () => {
    queryPlans.mockResolvedValue(result({ plans: [], total: 0 }));
    expect(await render()).toContain('No plans yet');
  });
});

describe('catalog page — search', () => {
  it('passes the query through', async () => {
    queryPlans.mockResolvedValue(result({ query: 'walnut', total: 3 }));
    await render({ q: 'walnut' });

    expect(queryPlans.mock.calls[0]![0].query).toBe('walnut');
  });

  it('reports the count and echoes the query back', async () => {
    queryPlans.mockResolvedValue(result({ query: 'walnut', total: 3 }));
    const html = await render({ q: 'walnut' });

    expect(html).toContain('3 plans');
    expect(html).toContain('walnut');
    expect(html).toContain('Clear all');
  });

  it('gives a useful empty state, pointing at the strictest filter', async () => {
    queryPlans.mockResolvedValue(result({ plans: [], total: 0, query: 'zzzz' }));
    const html = await render({ q: 'zzzz' });

    expect(html).toContain('Nothing matched');
    expect(html).toContain('tools you own');
  });
});

describe('catalog page — filters', () => {
  it('parses filters out of the query string and passes them down', async () => {
    await render({
      category: 'furniture',
      difficulty: ['2', '3'],
      cost: 'TIER_1',
      time: '480',
      tools: ['table-saw'],
    });

    const filters = queryPlans.mock.calls[0]![0].filters;
    expect(filters.category).toBe('furniture');
    expect(filters.difficulty).toEqual([2, 3]);
    expect(filters.costTier).toEqual(['TIER_1']);
    expect(filters.maxMinutes).toBe(480);
    expect(filters.ownedTools).toEqual(['table-saw']);
  });

  it('SECURITY: drops an unknown category and an unknown tool rather than 500ing', async () => {
    // A stale bookmark pointing at a deleted category must show results, not
    // break.
    await render({ category: 'was-deleted', tools: ['nonexistent-tool'] });

    const filters = queryPlans.mock.calls[0]![0].filters;
    expect(filters.category).toBeUndefined();
    expect(filters.ownedTools).toEqual([]);
  });

  it('opens the filter panel automatically when filters are active', async () => {
    const html = await render({ category: 'furniture' });
    expect(html).toContain('<details class="filters" open');
  });

  it('preserves search AND filters across pagination links', async () => {
    // Losing them on "Next" is the classic bug.
    queryPlans.mockResolvedValue(
      result({ query: 'oak', total: 24, totalPages: 2, page: 1 }),
    );
    const html = await render({ q: 'oak', category: 'furniture' });

    expect(html).toContain('q=oak');
    expect(html).toContain('category=furniture');
    expect(html).toContain('page=2');
  });
});

describe('catalog page — untrusted input', () => {
  it('SECURITY: a garbage page param degrades to page 1', async () => {
    for (const bad of ['abc', '-1', '0', '1; DROP TABLE Plan;--', '']) {
      vi.resetModules();
      queryPlans.mockClear();
      queryPlans.mockResolvedValue(result({ plans: [], total: 0 }));

      await render({ page: bad });

      expect(queryPlans.mock.calls[0]![0].page, `page="${bad}"`).toBe(1);
    }
  });

  it('SECURITY: a hostile query is escaped when echoed back, not injected', async () => {
    const xss = '<script>alert(1)</script>';
    queryPlans.mockResolvedValue(result({ plans: [], total: 0, query: xss }));

    const html = await render({ q: xss });

    // React escapes by default. Assert it, so that the day someone reaches for
    // dangerouslySetInnerHTML to "fix" the quotes, this test fails.
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });
});
