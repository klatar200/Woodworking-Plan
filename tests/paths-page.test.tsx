import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';

/**
 * QOL-E — the rebuilt Learning index.
 *
 * A STATIC render, which is the whole feature: the filters are a plain GET form and the
 * grouping happens server-side, so everything asserted here works with JavaScript off
 * and a filtered view is a shareable URL rather than client state.
 */

const listPaths = vi.fn();
const listCategories = vi.fn();

vi.mock('@/lib/paths', async (importOriginal) => {
  // parsePathFilters / buildPathQueryString are pure and tested directly in
  // paths.test.ts — mocking them here would test the mock, not the page.
  const actual = await importOriginal<typeof import('@/lib/paths')>();
  return { ...actual, listPaths };
});
vi.mock('@/lib/plans', () => ({ listCategories }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const categories = [
  { slug: 'cutting-boards', name: 'Cutting Boards' },
  { slug: 'furniture', name: 'Furniture' },
];

const path = (
  slug: string,
  experienceLevel: number | null,
  category: { slug: string; name: string } | null,
  steps = 4,
) => ({
  id: slug,
  slug,
  title: `Title ${slug}`,
  summary: `Summary ${slug}`,
  sortOrder: 1,
  experienceLevel,
  category,
  _count: { steps },
});

async function render(
  params: Record<string, string | string[] | undefined> = {},
): Promise<string> {
  const { default: PathsPage } = await import('@/app/paths/page');
  const element = (await PathsPage({
    searchParams: Promise.resolve(params),
  })) as ReactElement;
  return renderToStaticMarkup(element);
}

beforeEach(() => {
  vi.resetModules();
  listCategories.mockReset().mockResolvedValue(categories);
  listPaths.mockReset().mockResolvedValue([]);
});

describe('the index groups by experience level', () => {
  it('renders a heading per level, in ascending order', async () => {
    listPaths.mockResolvedValue([
      path('advanced-one', 4, null),
      path('beginner-one', 1, null),
      path('easy-one', 2, categories[0]!),
    ]);

    const html = await render();

    // The SAME labels as every plan card — one level vocabulary sitewide
    // (DECISIONS_LOG.md 2026-07-19).
    expect(html).toContain('Beginner');
    expect(html).toContain('Easy');
    expect(html).toContain('Advanced');

    // Ascending: "where do I start" is the question this page answers.
    expect(html.indexOf('>Beginner<')).toBeLessThan(html.indexOf('>Easy<'));
    expect(html.indexOf('>Easy<')).toBeLessThan(html.indexOf('>Advanced<'));
  });

  /**
   * A migration creates a column; the seed populates it. In the window between deploy
   * and seed every path is untagged — and the page must say so rather than filing them
   * all under Beginner, which would be a confident wrong answer on the one page whose
   * job is telling someone where to start.
   */
  it('gives untagged paths their own group, LAST, rather than guessing', async () => {
    listPaths.mockResolvedValue([path('untagged', null, null), path('rated', 2, null)]);

    const html = await render();

    expect(html).toContain('Not yet rated');
    expect(html.indexOf('>Easy<')).toBeLessThan(html.indexOf('Not yet rated'));
  });

  it('labels a category-spanning path "Mixed categories", not blank', async () => {
    listPaths.mockResolvedValue([
      path('mixed', 1, null),
      path('focused', 2, categories[1]!),
    ]);

    const html = await render();

    // `null` is an authored value ("spans several"), not a gap — saying so is more
    // useful than silence and more honest than picking a majority category.
    expect(html).toContain('Mixed categories');
    expect(html).toContain('Furniture');
  });

  it('uses h3 for card titles so the level headings are the h2s', async () => {
    listPaths.mockResolvedValue([path('one', 1, null)]);

    const html = await render();

    // h1 Learning → h2 level → h3 path. Five sibling h2s under an h1 would tell a
    // screen-reader user there is no hierarchy here, when there is.
    expect(html).toMatch(/<h2[^>]*>Beginner<\/h2>/);
    expect(html).toContain('<h3>Title one</h3>');
  });
});

describe('filtering is URL-driven, with no JavaScript', () => {
  it('is a plain GET form pointed at /paths', async () => {
    const html = await render();

    expect(html).toContain('method="get"');
    expect(html).toContain('action="/paths"');
    expect(html).toContain('name="level"');
    expect(html).toContain('name="category"');
  });

  it('passes validated filters through to the data layer', async () => {
    await render({ level: '3', category: 'furniture' });

    expect(listPaths).toHaveBeenCalledWith({ level: 3, category: 'furniture' });
  });

  it('SECURITY: drops a bogus level and an unknown category rather than 500ing', async () => {
    await render({ level: '99', category: 'was-deleted' });

    expect(listPaths).toHaveBeenCalledWith({ level: undefined, category: undefined });
  });

  it('offers a Clear link only while something is actually filtered', async () => {
    listPaths.mockResolvedValue([path('one', 1, null)]);

    expect(await render()).not.toContain('>Clear<');
    expect(await render({ level: '1' })).toContain('>Clear<');
  });

  it('explains an empty FILTERED result differently from an empty catalog', async () => {
    const filtered = await render({ level: '5' });
    expect(filtered).toContain('No learning paths match that yet');

    const empty = await render();
    expect(empty).toContain('db:seed');
  });
});

describe('the rename is display-only', () => {
  it('is titled "Learning" but still lives at /paths', async () => {
    listPaths.mockResolvedValue([path('one', 1, null)]);
    const html = await render();

    expect(html).toContain('<h1>Learning</h1>');
    // Changing the route would rewrite every saved library's offline URL list and
    // invalidate the service-worker entries already holding them — for a label.
    expect(html).toContain('href="/paths/one"');
    expect(html).toContain('action="/paths"');
  });
});
