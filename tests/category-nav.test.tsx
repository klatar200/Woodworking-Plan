import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CategoryNav } from '@/components/category-nav';
import type { PlanFilters } from '@/lib/filters';

/**
 * CategoryNav is a pure server component — filters in, links out — so a static
 * render IS its entire behaviour.
 *
 * What these tests actually protect: every link is the CURRENT state with only
 * the category swapped. The failure mode this component invites is the classic
 * one — clicking a category silently drops the search term, the sort, the other
 * filters, or leaves `?page=4` attached and lands the user on an empty page.
 * Each of those is asserted below, because each of them would still "work".
 */

const categories = [
  { slug: 'outdoor', name: 'Outdoor' },
  { slug: 'storage', name: 'Storage & Shelving' },
];

const noFilters: PlanFilters = {
  category: undefined,
  difficulty: [],
  costTier: [],
  maxMinutes: undefined,
  ownedTools: [],
};

function render(filters: PlanFilters = noFilters, query = '', sort?: string) {
  return renderToStaticMarkup(
    <CategoryNav
      query={query}
      filters={filters}
      sort={sort}
      categories={categories}
    />,
  );
}

describe('CategoryNav', () => {
  it('renders one link per category, plus "All plans"', () => {
    const html = render();
    expect(html).toContain('All plans');
    expect(html).toContain('Outdoor');
    // Names, not slugs.
    expect(html).toContain('Storage &amp; Shelving');
    expect(html).not.toContain('>storage<');
  });

  it('links to the bare catalog when nothing else is set', () => {
    const html = render();
    expect(html).toContain('href="/?category=outdoor"');
    expect(html).toContain('href="/"'); // "All plans"
  });

  it('carries the search term, the sort, and the other filters', () => {
    const html = render(
      { ...noFilters, difficulty: [2], ownedTools: ['table-saw'] },
      'bench',
      'popular',
    );

    // Selecting a category must not discard what the user already narrowed to.
    expect(html).toContain(
      'href="/?q=bench&amp;category=outdoor&amp;difficulty=2&amp;tools=table-saw&amp;sort=popular"',
    );
    // ...and neither must "All plans", which clears ONLY the category.
    expect(html).toContain(
      'href="/?q=bench&amp;difficulty=2&amp;tools=table-saw&amp;sort=popular"',
    );
  });

  it('REPLACES the active category rather than adding a second one', () => {
    const html = render({ ...noFilters, category: 'outdoor' });
    expect(html).toContain('href="/?category=storage"');
    expect(html).not.toContain('category=outdoor&amp;category=storage');
  });

  it('never carries a page number — a category change resets to page 1', () => {
    // buildQueryString is called without a page, by construction. Asserted
    // anyway: `?category=x&page=4` is a link to an empty results page.
    const html = render({ ...noFilters, category: 'outdoor' }, 'bench', 'popular');
    expect(html).not.toContain('page=');
  });

  it('marks the active category, and "All plans" when none is set', () => {
    const active = render({ ...noFilters, category: 'outdoor' });
    // Sprint 30a: the active link's distinguishing style is now a Tailwind utility
    // (`bg-accent-tint`, present only on the active variant) rather than the old
    // `.catalog-nav-link-active` class. aria-current is still the semantic marker.
    expect(active).toContain('bg-accent-tint');
    expect(active).toContain('aria-current="page"');
    // Exactly one link is current — not the category AND "All plans".
    expect(active.match(/aria-current="page"/g)).toHaveLength(1);

    const none = render();
    // With no category filter, "All plans" is the current view. (Attribute ORDER
    // is next/link's business, not ours — match on the anchor, not on a
    // serialization detail.)
    expect(none.match(/aria-current="page"/g)).toHaveLength(1);
    expect(none).toMatch(
      /<a[^>]*bg-accent-tint[^>]*href="\/"[^>]*>All plans</,
    );
  });

  it('is a labelled landmark', () => {
    expect(render()).toContain('aria-label="Categories"');
  });
});
