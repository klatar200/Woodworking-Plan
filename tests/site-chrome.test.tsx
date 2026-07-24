import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { NAV_CATEGORIES } from '@/lib/nav-categories';
import { CATALOG_PATH } from '@/lib/routes';

/**
 * Site chrome — header + footer.
 *
 * Sprint 49: the Browse mega-menu is gone; "Plans" is a plain link to the catalog.
 * Footer category listing is unchanged (out of scope for 49).
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

    expect(NAV_CATEGORIES.map((c) => c.slug)).toEqual(expected);
    expect(NAV_CATEGORIES.length).toBeGreaterThan(0);
  });
});

describe('the Plans nav link (Sprint 49)', () => {
  it('is a plain link to the catalog, not a mega-menu', () => {
    expect(header).toContain(`href="${CATALOG_PATH}"`);
    expect(header).toMatch(/href="\/browse"[^>]*>Plans</);
    // No Browse disclosure chrome (mobile hamburger <details> remains — that is the drawer).
    expect(header).not.toContain('Browse by category');
    expect(header).not.toContain('All plans');
    expect(header).not.toContain('BrowseMenu');
  });

  it('does not embed category links in the header (footer still does)', () => {
    for (const category of NAV_CATEGORIES) {
      expect(header).not.toContain(`/browse?category=${category.slug}`);
    }
  });
});

describe('the desktop header search (QOL-J)', () => {
  it('offers a role=search GET form that sends q to the catalog', () => {
    expect(header).toContain('role="search"');
    expect(header).toContain('name="q"');
    expect(header).toMatch(/<form[^>]*action="\/browse"[^>]*method="get"/);
  });

  it('is desktop-only — below lg, search is the catalog box + drawer, not the header', () => {
    expect(header).toMatch(/<form[^>]*class="[^"]*hidden lg:flex/);
  });

  it('uses a header-scoped input id so it never collides with the catalog SearchBox', () => {
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
      expect(footer).toContain(`/browse?category=${category.slug}`);
    }
    for (const href of ['/paths', '/about', '/faq']) {
      expect(footer).toContain(`href="${href}"`);
    }
  });

  it('labels its two link groups for screen readers', () => {
    expect(footer).toContain('aria-label="Browse by category"');
    expect(footer).toContain('aria-label="Site"');
  });

  it('carries the `site-footer` class the print stylesheet hides', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

    expect(footer).toContain('class="site-footer');
    expect(css).toContain('.site-footer');
    expect(css).toMatch(/\.site-header,[\s\S]{0,220}\.site-footer,/);
  });
});
