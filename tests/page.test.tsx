import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';

/**
 * Catalog page — browse (Sprint 3) + search (Sprint 4).
 *
 * Uses a REAL static render, not a hand-rolled element-tree walker, so the
 * PlanCard children actually render. A walker that only follows `props.children`
 * silently skips every child component — it would pass while rendering nothing,
 * which is the worst kind of green test.
 */

const searchPlans = vi.fn();

vi.mock('@/lib/plans', () => ({ searchPlans, PLANS_PER_PAGE: 12 }));

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

/** Default result shape: browse mode (empty query). */
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
  searchPlans.mockReset();
});

const render = async (searchParams: Record<string, string> = {}) => {
  const { default: CatalogPage } = await import('@/app/page');
  const tree = (await CatalogPage({
    searchParams: Promise.resolve(searchParams),
  })) as ReactElement;
  return renderToStaticMarkup(tree);
};

describe('catalog page — browse', () => {
  it('renders a card per plan, linking to its detail page', async () => {
    searchPlans.mockResolvedValue(
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
    expect(html).toContain('Simple Pine Bookcase');
    expect(html).toContain('href="/plans/edge-grain-maple-cutting-board"');
    expect(html).toContain('href="/plans/pine-bookcase"');
  });

  it('shows the structured metadata that IS the product differentiator', async () => {
    searchPlans.mockResolvedValue(result());

    const html = await render();

    expect(html).toContain('Easy'); // difficulty 2
    expect(html).toContain('$$'); // TIER_2
    expect(html).toContain('4–6 hrs'); // 240–360 minutes
    expect(html).toContain('Cutting Boards'); // category
  });

  it('always offers the search box', async () => {
    searchPlans.mockResolvedValue(result());
    const html = await render();

    expect(html).toContain('name="q"');
    expect(html).toContain('role="search"');
  });

  it('pluralises the plan count', async () => {
    searchPlans.mockResolvedValue(result({ total: 1 }));
    expect(await render()).toContain('1 plan');

    vi.resetModules();
    searchPlans.mockResolvedValue(result({ total: 24, totalPages: 2 }));
    expect(await render()).toContain('24 plans');
  });

  it('shows an empty state rather than a blank page', async () => {
    searchPlans.mockResolvedValue(result({ plans: [], total: 0 }));
    expect(await render()).toContain('No plans yet');
  });

  it('hides pagination when everything fits on one page', async () => {
    searchPlans.mockResolvedValue(result());
    expect(await render()).not.toContain('Page 1 of');
  });

  it('shows pagination when there is more than one page', async () => {
    searchPlans.mockResolvedValue(result({ total: 24, totalPages: 2 }));
    const html = await render();

    expect(html).toContain('Page 1 of 2');
    expect(html).toContain('href="/?page=2"');
    expect(html).not.toContain('Previous');
  });
});

describe('catalog page — search', () => {
  it('passes the query through to searchPlans', async () => {
    searchPlans.mockResolvedValue(result({ query: 'walnut', total: 3 }));
    await render({ q: 'walnut' });

    expect(searchPlans.mock.calls[0]![0]).toEqual({ query: 'walnut', page: 1 });
  });

  it('reports the result count and echoes the query back', async () => {
    searchPlans.mockResolvedValue(result({ query: 'walnut', total: 3 }));
    const html = await render({ q: 'walnut' });

    expect(html).toContain('3 results for');
    expect(html).toContain('walnut');
    expect(html).toContain('Clear');
  });

  it('says "result" not "results" when there is exactly one', async () => {
    searchPlans.mockResolvedValue(result({ query: 'lathe', total: 1 }));
    expect(await render({ q: 'lathe' })).toContain('1 result for');
  });

  it('gives a useful empty state for a search that matched nothing', async () => {
    searchPlans.mockResolvedValue(result({ plans: [], total: 0, query: 'zzzz' }));
    const html = await render({ q: 'zzzz' });

    expect(html).toContain('Nothing matched');
    // Suggests what to try instead of just saying "no results".
    expect(html).toContain('walnut');
  });

  it('preserves the query across pagination links', async () => {
    // Losing the search term on "Next" is the classic pagination bug.
    searchPlans.mockResolvedValue(
      result({ query: 'oak', total: 24, totalPages: 2, page: 1 }),
    );
    const html = await render({ q: 'oak' });

    expect(html).toContain('q=oak&amp;page=2');
  });

  it('drops page=1 from the Previous link rather than emitting ?page=1', async () => {
    searchPlans.mockResolvedValue(
      result({ query: 'oak', total: 24, totalPages: 2, page: 2 }),
    );
    const html = await render({ q: 'oak', page: '2' });

    expect(html).toContain('href="/?q=oak"');
    expect(html).not.toContain('page=1');
  });
});

describe('catalog page — untrusted input', () => {
  it('SECURITY: a garbage page param degrades to page 1', async () => {
    for (const bad of ['abc', '-1', '0', '1; DROP TABLE Plan;--', '']) {
      vi.resetModules();
      searchPlans.mockClear();
      searchPlans.mockResolvedValue(result({ plans: [], total: 0 }));

      await render({ page: bad });

      expect(searchPlans.mock.calls[0]![0].page, `page="${bad}"`).toBe(1);
    }
  });

  it('SECURITY: a hostile query string is escaped when echoed back, not injected', async () => {
    const xss = '<script>alert(1)</script>';
    searchPlans.mockResolvedValue(result({ plans: [], total: 0, query: xss }));

    const html = await render({ q: xss });

    // React escapes by default. Assert it, because the day someone reaches for
    // dangerouslySetInnerHTML to "fix" the quotes, this test should fail.
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
