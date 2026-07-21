import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilterChips } from '@/components/filter-chips';
import type { PlanFilters } from '@/lib/filters';

/**
 * FilterChips is a pure server component: filters in, links out. A static
 * render IS the component's entire behaviour — there is no client state to
 * exercise — so these tests assert the one thing that matters: each chip's
 * href is the current URL with exactly that one filter removed, and nothing
 * else (query, sort, the other filters) goes missing.
 */

const categories = [
  { slug: 'outdoor', name: 'Outdoor' },
  { slug: 'storage', name: 'Storage & Shelving' },
];
const tools = [
  { slug: 'table-saw', name: 'Table Saw' },
  { slug: 'drill-driver', name: 'Drill/Driver' },
];

const noFilters: PlanFilters = {
  category: undefined,
  difficulty: [],
  costTier: [],
  maxMinutes: undefined,
  ownedTools: [],
};

function render(filters: PlanFilters, query = '', sort?: string) {
  return renderToStaticMarkup(
    <FilterChips
      query={query}
      filters={filters}
      sort={sort}
      categories={categories}
      tools={tools}
    />,
  );
}

describe('FilterChips', () => {
  it('renders nothing when no filter is active', () => {
    expect(render(noFilters)).toBe('');
  });

  it('renders nothing for a plain keyword search with no filters', () => {
    // A search term alone is not a filter — the chips row must not appear
    // just because someone searched.
    expect(render(noFilters, 'walnut')).toBe('');
  });

  it('renders one removal chip per active filter value', () => {
    const html = render({
      category: 'outdoor',
      difficulty: [1, 3],
      costTier: ['TIER_2'],
      maxMinutes: 480,
      ownedTools: ['table-saw'],
    });

    // Human-readable labels, not slugs or enum names.
    expect(html).toContain('Outdoor');
    expect(html).toContain('Beginner');
    expect(html).toContain('Intermediate');
    expect(html).toContain('$$');
    expect(html).toContain('A day');
    expect(html).toContain('Table Saw');
  });

  it("a chip's href removes exactly that value and keeps everything else", () => {
    const html = render(
      { ...noFilters, difficulty: [1, 3], category: 'outdoor' },
      'bench',
    );

    // Removing Beginner keeps difficulty=3, the category, and the search.
    expect(html).toContain(
      // React escapes & as &amp; in attributes.
      'href="/browse?q=bench&amp;category=outdoor&amp;difficulty=3"',
    );
    // Removing the category keeps both difficulties and the search.
    expect(html).toContain(
      'href="/browse?q=bench&amp;difficulty=1&amp;difficulty=3"',
    );
  });

  it('carries a non-default sort on every chip', () => {
    const html = render({ ...noFilters, category: 'outdoor' }, '', 'popular');
    expect(html).toContain('sort=popular');
  });

  it('has no bulk "clear all filters" link (removed 2026-07-20 — see the subtitle clear)', () => {
    // The stacked-duplicate clear is gone; only per-chip ✕ removal remains here.
    const html = render({ ...noFilters, category: 'outdoor' }, 'bench');
    expect(html).not.toContain('Clear all filters');
  });

  it('removing the last filter links to the bare catalog', () => {
    const html = render({ ...noFilters, category: 'outdoor' });
    expect(html).toContain('href="/browse"');
  });

  it('each chip is labelled as a removal control for screen readers', () => {
    const html = render({ ...noFilters, category: 'outdoor' });
    expect(html).toContain('aria-label="Remove filter: Outdoor"');
  });
});
