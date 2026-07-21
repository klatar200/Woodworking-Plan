import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilterPanel } from '@/components/filter-panel';
import type { PlanFilters } from '@/lib/filters';

/**
 * Sprint 39.1 (audit H5) — WHAT IS TICKED IS WHAT IS FILTERING.
 *
 * Sprint 25 pre-ticked the "tools you own" boxes from the workshop profile without
 * applying them, so the panel could show six ticked checkboxes over a completely
 * unfiltered catalog. ⚖️ Keagan chose to stop pre-ticking (2026-07-21): the URL is the
 * only thing that ticks a box, and the "Show plans I can build" CTA — already URL-driven,
 * so a shared link renders the same catalog for everyone — is the one prefill affordance.
 *
 * The panel now receives a BOOLEAN rather than the tool slugs, which is what makes the
 * fix structural: it cannot pre-tick tools it does not know. These tests assert the
 * boolean cannot tick anything, and that the tip only appears when the CTA it points at
 * is actually on the page.
 *
 * QOL-I: the panel's form is now the SoftGetForm client wrapper (auto-applying filters as
 * a soft navigation), which calls `useRouter()` at render — stubbed, as under a bare
 * renderToStaticMarkup there's no App Router context. The stub is never invoked.
 */
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const categories = [{ slug: 'outdoor', name: 'Outdoor' }];
const tools = [
  { slug: 'table-saw', name: 'Table Saw', category: 'Power Saw' },
  { slug: 'router', name: 'Router', category: 'Milling' },
];

const noFilters: PlanFilters = {
  category: undefined,
  difficulty: [],
  costTier: [],
  maxMinutes: undefined,
  ownedTools: [],
};

function render(
  filters: PlanFilters,
  hasWorkshop?: boolean,
  extra: { query?: string; sort?: string; perPage?: number } = {},
) {
  return renderToStaticMarkup(
    <FilterPanel
      query={extra.query ?? ''}
      filters={filters}
      sort={extra.sort}
      perPage={extra.perPage}
      categories={categories}
      tools={tools}
      hasWorkshop={hasWorkshop}
    />,
  );
}

/** Is the checkbox for `slug` rendered checked? Attribute order-independent — React may
 *  emit `checked` before or after `value`, so match the whole <input> tag. */
const checked = (html: string, slug: string) => {
  const tag = html.match(new RegExp(`<input[^>]*value="${slug}"[^>]*>`));
  return tag ? tag[0].includes('checked') : false;
};

describe('FilterPanel tool checkboxes (39.1)', () => {
  it('ticks nothing for a user with a workshop but no tools in the URL', () => {
    // The regression this whole item is about: ticked boxes over unfiltered results.
    const html = render(noFilters, true);
    expect(checked(html, 'table-saw')).toBe(false);
    expect(checked(html, 'router')).toBe(false);
  });

  it('ticks exactly what the URL is filtering by', () => {
    const html = render({ ...noFilters, ownedTools: ['router'] }, true);
    expect(checked(html, 'router')).toBe(true);
    expect(checked(html, 'table-saw')).toBe(false);
  });

  it('ticks nothing when there is no workshop and no URL tools', () => {
    const html = render(noFilters, false);
    expect(checked(html, 'table-saw')).toBe(false);
    expect(checked(html, 'router')).toBe(false);
  });

  /**
   * The old wording claimed the boxes were "Pre-filled from your workshop", which was the
   * lie itself. If it ever comes back, so has the bug.
   */
  it('never claims the boxes were pre-filled', () => {
    expect(render(noFilters, true)).not.toContain('Pre-filled from your workshop');
  });
});

describe('FilterPanel workshop tip (39.1)', () => {
  it('points at the CTA when the visitor has a workshop and is not filtering by tools', () => {
    expect(render(noFilters, true)).toContain('Show plans I can build');
  });

  it('says nothing to a visitor with no workshop — that CTA is not on their page', () => {
    expect(render(noFilters, false)).not.toContain('Show plans I can build');
    expect(render(noFilters)).not.toContain('Show plans I can build');
  });

  /** Already filtering by tools ⇒ browse/page.tsx hides the CTA, so the tip must go too. */
  it('says nothing once tools are actually applied', () => {
    const html = render({ ...noFilters, ownedTools: ['router'] }, true);
    expect(html).not.toContain('Show plans I can build');
  });
});

/**
 * QOL-I — the filter panel auto-applies, so Apply is redundant (but KEPT for no-JS /
 * keyboard) and the panel's own "Clear filters" link is gone (it duplicated FilterChips').
 * A static render is the no-JS view, which is exactly the path these must not break.
 */
describe('FilterPanel — auto-apply chrome (QOL-I)', () => {
  it('keeps Apply as the no-JS submit path, visually hidden', () => {
    const html = render(noFilters);
    expect(html).toMatch(
      /<button type="submit" class="visually-hidden">Apply filters<\/button>/,
    );
  });

  it('no longer renders its own "Clear filters" link (FilterChips owns it)', () => {
    // The whole point of the de-dup: FilterPanel must not render a second clear control.
    expect(render({ ...noFilters, category: 'outdoor' })).not.toContain('Clear filters');
  });

  it('is a GET form (works with JS off)', () => {
    const html = render(noFilters);
    expect(html).toContain('<form');
    expect(html).toContain('method="get"');
  });

  it('carries sort and page size as hidden inputs so an auto-apply keeps them', () => {
    // Without these, a checkbox toggle (which now auto-submits) would silently reset the
    // sort and page size to their defaults.
    const html = render(noFilters, false, { sort: 'newest', perPage: 48 });
    expect(html).toContain('name="sort" value="newest"');
    expect(html).toContain('name="perPage" value="48"');
  });

  it('omits the sort/perPage hidden inputs when they are default (clean URLs)', () => {
    const html = render(noFilters);
    expect(html).not.toContain('name="sort"');
    expect(html).not.toContain('name="perPage"');
  });
});
