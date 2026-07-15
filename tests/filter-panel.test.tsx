import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilterPanel } from '@/components/filter-panel';
import type { PlanFilters } from '@/lib/filters';

/**
 * Sprint 25 — the workshop PREFILL on the filter panel.
 *
 * The load-bearing rule: the URL is the source of truth for results, so the profile may
 * only pre-tick the "tools you own" boxes when the URL carries no tools filter. When the
 * URL has `?tools=`, that wins and the prefill is ignored — otherwise a shared link would
 * render differently per viewer. These tests assert exactly that precedence.
 */

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

function render(filters: PlanFilters, prefillTools?: string[]) {
  return renderToStaticMarkup(
    <FilterPanel
      query=""
      filters={filters}
      categories={categories}
      tools={tools}
      prefillTools={prefillTools}
    />,
  );
}

/** Is the checkbox for `slug` rendered checked? Attribute order-independent — React may
 *  emit `checked` before or after `value`, so match the whole <input> tag. */
const checked = (html: string, slug: string) => {
  const tag = html.match(new RegExp(`<input[^>]*value="${slug}"[^>]*>`));
  return tag ? tag[0].includes('checked') : false;
};

describe('FilterPanel tool prefill', () => {
  it('pre-ticks the profile tools when the URL has NO tools filter', () => {
    const html = render(noFilters, ['table-saw']);
    expect(checked(html, 'table-saw')).toBe(true);
    expect(checked(html, 'router')).toBe(false);
    expect(html).toContain('Pre-filled from your workshop');
  });

  it('URL tools WIN over the profile — a shared link renders the same for everyone', () => {
    // URL says router; profile says table-saw. The URL must win, and the prefill hint
    // must not show (these are real, applied filters, not a suggestion).
    const html = render({ ...noFilters, ownedTools: ['router'] }, ['table-saw']);
    expect(checked(html, 'router')).toBe(true);
    expect(checked(html, 'table-saw')).toBe(false);
    expect(html).not.toContain('Pre-filled from your workshop');
  });

  it('no profile, no URL tools: nothing pre-ticked, no hint', () => {
    const html = render(noFilters, []);
    expect(checked(html, 'table-saw')).toBe(false);
    expect(checked(html, 'router')).toBe(false);
    expect(html).not.toContain('Pre-filled from your workshop');
  });
});
