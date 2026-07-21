import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SortSelect } from '@/components/sort-select';
import { SORT_OPTIONS, DEFAULT_SORT } from '@/lib/sort';
import type { PlanFilters } from '@/lib/filters';

/**
 * QOL-A item 3 — sort auto-applies on change. QOL-H — that submit is now a soft
 * client navigation, and the Apply button is visually hidden rather than removed.
 *
 * The soft-nav interception and the auto-submit are both event handlers that a static
 * render cannot exercise. What CAN be proven here, and is the thing that actually
 * matters, is that the enhancement did not eat its own fallback: the form, the hidden
 * filter inputs, and the (now visually-hidden) Apply button must all still be in the
 * server-rendered document, or a no-JS visitor loses the ability to sort at all.
 *
 * SortSelect now renders through the SoftGetForm client wrapper, which calls
 * `useRouter()` at render — with no App Router context under a bare renderToStaticMarkup,
 * the real hook throws, so it's stubbed. The stub is never invoked (effects don't run in
 * a static render); it only has to exist.
 */
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

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

  /**
   * QOL-H (2026-07-20 decision): the button is HIDDEN, not deleted. `visually-hidden`
   * clips it while leaving it in the document and the tab order, so keyboard and no-JS
   * users can still submit; `display:none` would have removed it from the no-JS path.
   */
  it('visually hides the Apply button rather than deleting it', () => {
    const html = render();

    expect(html).toMatch(/<button type="submit" class="visually-hidden">Apply<\/button>/);
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

  /**
   * Sprint 36 (audit H7): during a keyword search the sort is fixed to relevance. Rather than
   * VANISHING (a control disappearing reads as "sorting broke"), it stays as a DISABLED select
   * reading "Relevance", with the reason exposed, and a disabled Apply so no-JS can't submit a
   * dead control. (Was: rendered nothing.)
   */
  it('during a keyword search, shows a disabled "Relevance" control instead of vanishing', () => {
    const html = render(noFilters, 'walnut');

    expect(html).not.toBe('');
    expect(html).toContain('Relevance');
    expect(html).toMatch(/<select[^>]*disabled/);
    expect(html).toContain('ordered by relevance');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Apply<\/button>/);
  });
});
