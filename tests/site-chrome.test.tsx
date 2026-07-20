import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { NAV_CATEGORIES } from '@/lib/nav-categories';

/**
 * QOL-D items 1 and 2 — the Browse menu and the site footer.
 *
 * These render in the ROOT LAYOUT, on every page. Two properties therefore matter more
 * than anything cosmetic:
 *
 *   1. They must cost nothing and be unable to fail. Categories come from a build-time
 *      constant (`src/lib/nav-categories.ts`), not a query — a Prisma call in the layout
 *      would put a database round-trip on `/faq`, make an outage break the 404 page, and
 *      need a reachable database at BUILD time for the prerendered `/_not-found`.
 *   2. Every category link must be a plain GET link into the existing catalog, so
 *      results stay URL-driven and a shared link renders the same for everyone.
 */

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// Clerk's server components gate on the session; both branches are rendered here so a
// single static render covers the signed-in and signed-out navs at once.
vi.mock('@clerk/nextjs', () => ({
  SignedIn: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignedOut: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/account-menu', () => ({ AccountMenu: () => null }));
vi.mock('@/components/install-prompt', () => ({ InstallMenuItem: () => null }));

const { SiteHeader } = await import('@/components/site-header');
const { SiteFooter } = await import('@/components/site-footer');

const header = renderToStaticMarkup(<SiteHeader />);
const footer = renderToStaticMarkup(<SiteFooter />);

describe('the category list is derived from the seed, not hand-typed', () => {
  it('matches content/categories.json exactly, in sortOrder', () => {
    const raw: Array<{ slug: string; name: string; sortOrder: number }> = JSON.parse(
      readFileSync(join(process.cwd(), 'content/categories.json'), 'utf8'),
    );
    const expected = [...raw]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((c) => c.slug);

    // If someone ever replaces this with a hardcoded array, this fails the moment a
    // category is added, renamed or reordered in the content file the seed reads.
    expect(NAV_CATEGORIES.map((c) => c.slug)).toEqual(expected);
    expect(NAV_CATEGORIES.length).toBeGreaterThan(0);
  });
});

/** `&` is escaped in serialized HTML ("Storage & Shelving" → "Storage &amp; Shelving"). */
const escaped = (text: string) => text.replace(/&/g, '&amp;');

describe('the Browse menu (QOL-D item 1)', () => {
  it('offers every category, plus an "All plans" escape hatch', () => {
    for (const category of NAV_CATEGORIES) {
      expect(header).toContain(`/?category=${category.slug}`);
      expect(header).toContain(escaped(category.name));
    }
    expect(header).toContain('All plans');
  });

  it('renders the categories TWICE — once for desktop, once inside the drawer', () => {
    // One DOM serves both breakpoints (CSS decides which is visible), so each category
    // link appears in the desktop menu and in the mobile drawer's collapsible section.
    const first = NAV_CATEGORIES[0]!;
    const occurrences =
      header.split(`/?category=${first.slug}`).length - 1;

    expect(occurrences).toBe(2);
  });

  it('is a native <details>, so it opens with no JavaScript and starts closed', () => {
    expect(header).toContain('<details');
    expect(header).toContain('Browse');
    expect(header).toContain('Browse by category');
    expect(header).not.toContain('open=""');
  });

  /** Every link is a GET into the catalog — no new route, no new query path. */
  it('links into the existing catalog rather than inventing a route', () => {
    for (const category of NAV_CATEGORIES) {
      expect(header).not.toContain(`/categories/${category.slug}`);
      expect(header).not.toContain(`/category/${category.slug}`);
    }
  });
});

describe('the desktop header search (QOL-J)', () => {
  it('offers a role=search GET form that sends q to the catalog', () => {
    expect(header).toContain('role="search"');
    expect(header).toContain('name="q"');
    // Targets the shared catalog path, so a search works from any page.
    expect(header).toMatch(/<form[^>]*action="\/"[^>]*method="get"/);
  });

  it('is desktop-only — below lg, search is the catalog box + drawer, not the header', () => {
    expect(header).toMatch(/<form[^>]*class="[^"]*hidden lg:flex/);
  });

  it('uses a header-scoped input id so it never collides with the catalog SearchBox', () => {
    // Both render on the catalog page; duplicate ids would break the label association.
    expect(header).toContain('id="header-q"');
    expect(header).not.toContain('id="q"');
  });

  it('submits with a "Search" TEXT button, not an icon (Keagan 2026-07-20)', () => {
    expect(header).toMatch(/<button type="submit"[^>]*>Search<\/button>/);
    expect(header).not.toContain('🔍');
  });
});

describe('the signed-out auth links (QOL-J: right of the search)', () => {
  it('keeps Log in / Sign up in the header, desktop-only', () => {
    // Moved out of the left nav to the right of the search bar; still present, still
    // gated to desktop (the mobile drawer carries its own copy).
    expect(header).toContain('href="/sign-in"');
    expect(header).toContain('href="/sign-up"');
  });
});

describe('the signed-in nav after QOL-D', () => {
  it('drops Workshop from the header (it is settings now, per the decision log)', () => {
    expect(header).not.toContain('href="/workshop"');
  });

  it('keeps Saved and Builds', () => {
    expect(header).toContain('href="/saved"');
    expect(header).toContain('href="/builds"');
  });
});

describe('the site footer (QOL-D item 2)', () => {
  it('lists every category and the site links', () => {
    for (const category of NAV_CATEGORIES) {
      expect(footer).toContain(`/?category=${category.slug}`);
    }
    for (const href of ['/paths', '/about', '/faq']) {
      expect(footer).toContain(`href="${href}"`);
    }
  });

  it('labels its two link groups for screen readers', () => {
    expect(footer).toContain('aria-label="Browse by category"');
    expect(footer).toContain('aria-label="Site"');
  });

  /**
   * The print stylesheet hides site chrome BY CLASS. Converting a class to utilities and
   * dropping the class is the regression this migration has hit three times (Sprint 30c,
   * then the orphaned `.filters` rule in QOL-A) — so both halves are asserted: the class
   * is on the element, and the rule that needs it exists.
   */
  it('carries the `site-footer` class the print stylesheet hides', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

    expect(footer).toContain('class="site-footer');
    expect(css).toContain('.site-footer');
    // …in the same rule as the header, i.e. inside an @media print block.
    expect(css).toMatch(/\.site-header,[\s\S]{0,220}\.site-footer,/);
  });
});
