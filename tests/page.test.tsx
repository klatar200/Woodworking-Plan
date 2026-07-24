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

/**
 * Sprint 19: the `@/lib/recommendations` mock that used to live here is GONE, because
 * the catalog no longer calls it. Recommendations are a SORT now, resolved inside
 * `queryPlans()` — which is already mocked wholesale — and the standalone
 * "Recommended for you" section is deleted. A mock for a module the page doesn't
 * import is dead weight that reads like a dependency.
 */

/**
 * Sprint 4 (this test) needed no auth. The catalog's per-card bookmark overlay
 * (save-toggle.tsx) changed that: the page now always calls `getCurrentUser()`
 * and, for a signed-in visitor, `listSavedPlans()` — both mocked here because the
 * real `@/lib/auth` module reaches Clerk's session and cannot be imported into this
 * render harness.
 *
 * Defaulted to the ANONYMOUS-VISITOR case, which is the state every one of
 * these tests is actually exercising — none of them pass a signed-in user, so
 * `PlanCard`'s `saved` prop stays `undefined` and no bookmark overlay renders.
 */
const getCurrentUser = vi.fn();
const listSavedPlans = vi.fn();

vi.mock('@/lib/auth', () => ({ getCurrentUser }));
vi.mock('@/lib/saves', () => ({ listSavedPlans }));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

/**
 * QOL-H: the sort form is now the SoftGetForm client wrapper, which calls `useRouter()`
 * at render. Under a bare renderToStaticMarkup there's no App Router context, so the real
 * hook throws — stub it. Everything else in `next/navigation` (redirect/notFound/etc.)
 * stays real. The stub is never called; effects don't run in a static render.
 */
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
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
  getCurrentUser.mockReset().mockResolvedValue(null);
  listSavedPlans.mockReset().mockResolvedValue([]);
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
  const { default: CatalogPage } = await import('@/app/browse/page');
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

  it('Sprint 50: two-column rail grid with one sticky container', async () => {
    const html = await render();
    expect(html).toContain('lg:grid-cols-[16rem_minmax(0,1fr)]');
    // Quotes are HTML-escaped in the serialized class attribute.
    expect(html).toMatch(/lg:\[grid-template-areas:(&#x27;|')\._search(&#x27;|')_(&#x27;|')rail_results(&#x27;|')\]/);
    const stickyMatches = html.match(/lg:sticky/g) ?? [];
    expect(stickyMatches).toHaveLength(1);
    expect(html).not.toContain('lg:[grid-area:nav]');
    expect(html).not.toContain('lg:[grid-area:filters]');
    expect(html).not.toContain('13rem_minmax(0,1fr)_18rem');
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
    // QOL-I: renamed from "Clear all" — it clears search AND filters (FilterChips owns
    // the filters-only "Clear all filters").
    expect(html).toContain('Clear search and filters');
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

  it('surfaces the active-filter count on the trigger without opening the panel', async () => {
    const html = await render({ category: 'furniture' });

    // QOL-A: the panel is now an off-canvas DRAWER below 64rem, so it no longer
    // auto-opens on an active filter — that would park a full-height overlay on top of
    // the results the user just filtered for, on every Apply. What still has to be
    // true is that the page TELLS you filters are on: the count rides in the trigger,
    // and FilterChips lists each one above the results (asserted separately below).
    // See filter-disclosure.tsx for the full reasoning.
    //
    // Sprint 46 (Workstream E): the assertion targets the OUTER `.filters` drawer
    // specifically. The INNER filter-section for an active filter (Category, here) DOES
    // auto-open now — that is the point — so a blanket "no open <details>" would wrongly
    // catch it.
    expect(html).not.toMatch(/<details class="filters\b[^>]*\bopen\b/);
    expect(html).toContain('Filters (1)');
    expect(html).toContain('aria-label="Active filters"');
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

/**
 * QOL-F (2026-07-19, variant A) — the visual/motion pass, on the surface it targets.
 *
 * The point of asserting this in a RENDER test rather than eyeballing it: variant A was
 * chosen specifically so the catalog grid needs no client island. If a future change
 * reaches for pointer tracking, the cards stop being server components on the app's
 * highest-traffic page — and that is a decision, not a refactor.
 */
describe('catalog visual pass (QOL-F)', () => {
  it('opens with a plain compact h1, not the removed hero-wash banner (Workstream D)', async () => {
    const html = await render();

    // Sprint 46 (Workstream D): the hero-wash banner is GONE — the landing page carries
    // the pitch. The heading survives as a real h1 for a screen reader (heading order
    // h1 → results h2 intact), but nothing washed or shadowed replaces the wash.
    expect(html).toMatch(/<h1[^>]*>Plans<\/h1>/);
    expect(html).not.toContain('hero-wash');
  });

  it('gives cards a resting elevation and a hover lift, with a reduced-motion escape', async () => {
    queryPlans.mockResolvedValue(
      result({ plans: [plan()], total: 1 }),
    );

    const html = await render();

    expect(html).toContain('shadow-e1');
    expect(html).toContain('hover:-translate-y-[4px]');
    expect(html).toContain('hover:shadow-e3');
    expect(html).toContain('motion-reduce:hover:translate-y-0');
    // `translate`, not `transform` — Tailwind v4 emits it as its own property, so a
    // `transition-[transform]` here would animate nothing.
    expect(html).toContain('transition-[translate,box-shadow]');
  });
});

describe('catalog page — page size (QOL-I)', () => {
  it('clamps a valid perPage to the allowlist and passes it to queryPlans', async () => {
    await render({ perPage: '48' });
    expect(queryPlans.mock.calls[0]![0].perPage).toBe(48);
  });

  it('SECURITY: an out-of-list / garbage perPage degrades to the default', async () => {
    for (const bad of ['9999', '13', 'abc', '0', '-1', '48; DROP TABLE Plan;--']) {
      vi.resetModules();
      queryPlans.mockClear();
      queryPlans.mockResolvedValue(result());
      await render({ perPage: bad });
      expect(queryPlans.mock.calls[0]![0].perPage, `perPage="${bad}"`).toBe(24);
    }
  });

  it('carries a non-default perPage across pagination links', async () => {
    queryPlans.mockResolvedValue(result({ total: 200, totalPages: 5, page: 1 }));
    const html = await render({ perPage: '48' });
    expect(html).toContain('perPage=48');
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
