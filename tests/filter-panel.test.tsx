import { describe, it, expect, vi } from 'vitest';
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
  prefillTools?: string[],
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
    const html = render(noFilters, [], { sort: 'newest', perPage: 48 });
    expect(html).toContain('name="sort" value="newest"');
    expect(html).toContain('name="perPage" value="48"');
  });

  it('omits the sort/perPage hidden inputs when they are default (clean URLs)', () => {
    const html = render(noFilters);
    expect(html).not.toContain('name="sort"');
    expect(html).not.toContain('name="perPage"');
  });
});
