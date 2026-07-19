import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SortSelect } from '@/components/sort-select';
import { SORT_OPTIONS, DEFAULT_SORT } from '@/lib/sort';
import type { PlanFilters } from '@/lib/filters';

/**
 * QOL-A item 3 — sort auto-applies on change.
 *
 * The auto-submit itself is a pointer event handler and cannot be exercised by a
 * static render. What CAN be proven here, and is the thing that actually matters, is
 * that the enhancement did not eat its own fallback: the form, the hidden filter
 * inputs, and the Apply button must all still be in the server-rendered document, or
 * a no-JS visitor loses the ability to sort at all.
 */

const noFilters: PlanFilters = {
  category: undefined,
  difficulty: [],
  costTier: [],
  maxMinutes: undefined,
  ownedTools: [],
};

const render = (filters: PlanFilters = noFilters, query = '') =>
  renderToStaticMarkup(
    <SortSelect sort={DEFAULT_SORT} query={query} filters={filters} />,
  );

describe('SortSelect — server render (no JS yet)', () => {
  it('KEEPS the Apply button — the no-JS submit path', () => {
    const html = render();

    expect(html).toContain('<form');
    expect(html).toContain('method="get"');
    expect(html).toMatch(/<button type="submit"[^>]*>Apply<\/button>/);
  });

  it('still renders a plain <select name="sort"> with every option', () => {
    const html = render();

    expect(html).toContain('name="sort"');
    for (const option of SORT_OPTIONS) {
      expect(html).toContain(`value="${option.value}"`);
      expect(html).toContain(option.label);
    }
  });

  it('carries the active filters through as hidden inputs', () => {
    const html = render({
      category: 'outdoor',
      difficulty: [2],
      costTier: ['TIER_2'],
      maxMinutes: 240,
      ownedTools: ['table-saw'],
    });

    expect(html).toContain('name="category" value="outdoor"');
    expect(html).toContain('name="difficulty" value="2"');
    expect(html).toContain('name="cost" value="TIER_2"');
    expect(html).toContain('name="time" value="240"');
    expect(html).toContain('name="tools" value="table-saw"');
  });

  /** The Apply button shrinks below lg only; `lg:` restores btnBase's own sizing. */
  it('shrinks the Apply trigger on mobile only', () => {
    const html = render();

    expect(html).toContain('min-h-[2.25rem]!');
    expect(html).toContain('lg:min-h-[2.75rem]!');
  });

  /**
   * The select's font stays at 16px: below that, iOS zooms the viewport on focus —
   * a documented rule for every control in this app (see `selectControl`).
   */
  it('does not shrink the select font below 16px', () => {
    const html = render();
    const select = html.match(/<select[^>]*>/)?.[0] ?? '';

    expect(select).toContain('text-[1rem]');
    expect(select).not.toContain('text-[0.8125rem]');
  });

  it('renders nothing during a keyword search (relevance IS the sort)', () => {
    expect(render(noFilters, 'walnut')).toBe('');
  });
});
