import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
// (statSync also verifies the generated icon rasters below.)
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import {
  BRAND_NAME,
  BRAND_SHORT_NAME,
  BRAND_DESCRIPTION,
  SITE_HOST,
  CONTACT_EMAIL,
} from '../src/lib/brand';
import { THEME_CHROME_COLOR } from '../src/lib/theme';

/**
 * Sprint 43 — the Notch rebrand's cross-checks.
 *
 * `src/lib/brand.ts` is the single source for the product's identity, but the PWA
 * manifest is static JSON that cannot import it — the same class of mirror as
 * `THEME_CHROME_COLOR` and the Clerk appearance objects, so it gets the same kind
 * of guard: assert the copies are equal instead of trusting anyone to remember.
 *
 * SCOPE OF THE SWEEP: `src/` only, on purpose. The `woodworking-plan-*` service-worker
 * CACHE NAMES in `public/sw-policy.js` are deliberately kept (renaming the private
 * cache would orphan users' downloaded offline libraries — DECISIONS_LOG.md
 * 2026-07-21), and `tests/` fixture ORIGINs are arbitrary test hosts, not brand
 * surfaces. Neither is a defect for this sweep to find.
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const srcFiles = walk(join(root, 'src'));

describe('manifest.webmanifest mirrors brand.ts', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
    name: string;
    short_name: string;
    description: string;
  };

  it('name is the brand name', () => {
    expect(manifest.name).toBe(BRAND_NAME);
  });

  it('short_name is the brand short name (and launcher-safe at ≤12 chars)', () => {
    expect(manifest.short_name).toBe(BRAND_SHORT_NAME);
    expect(BRAND_SHORT_NAME.length).toBeLessThanOrEqual(12);
  });

  it('description is the shared brand description', () => {
    expect(manifest.description).toBe(BRAND_DESCRIPTION);
  });
});

describe('manifest colors mirror the light theme (Sprint 44)', () => {
  // The manifest was the ONE color mirror with no guard (THEME_CHROME_COLOR and the
  // Clerk appearance objects each have one) — which is exactly how it sat at the
  // pre-rebrand cream while everything else moved. Chain all three copies to the
  // token: manifest colors === `:root --bg` === THEME_CHROME_COLOR.light.
  const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
    background_color: string;
    theme_color: string;
  };
  const css = read('src/app/globals.css');
  const rootBlock = css.slice(css.search(/^:root\s*\{/m));
  const bg = /--bg:\s*(#[0-9a-f]{6})/i.exec(rootBlock)?.[1];

  it('background_color and theme_color equal the :root --bg token', () => {
    expect(bg).toBeTruthy();
    expect(manifest.background_color).toBe(bg);
    expect(manifest.theme_color).toBe(bg);
  });

  it('…and THEME_CHROME_COLOR.light agrees (one paper color, three copies, zero drift)', () => {
    expect(THEME_CHROME_COLOR.light).toBe(bg);
  });
});

describe('the placeholder identity is fully gone from src/', () => {
  it('no file still says "Woodworking Plan"', () => {
    // Case-SENSITIVE on purpose: the brand was Title Case. Lowercase "woodworking
    // plan(s)" is the product category and legitimately appears in prose (the
    // landing eyebrow, the about page, BRAND_DESCRIPTION itself).
    const offenders = srcFiles.filter((f) =>
      readFileSync(f, 'utf8').includes('Woodworking Plan'),
    );
    expect(offenders.map((f) => f.slice(root.length))).toEqual([]);
  });

  it('the placeholder contact address is gone', () => {
    const offenders = srcFiles.filter((f) =>
      readFileSync(f, 'utf8').includes('hello@example.com'),
    );
    expect(offenders.map((f) => f.slice(root.length))).toEqual([]);
  });

  it('the old vercel.app provenance host is gone', () => {
    const offenders = srcFiles.filter((f) =>
      readFileSync(f, 'utf8').includes('woodworking-plan.vercel.app'),
    );
    expect(offenders.map((f) => f.slice(root.length))).toEqual([]);
  });
});

describe('brand surfaces read from brand.ts', () => {
  it('the printed provenance line uses SITE_HOST (a cut sheet found on a bench must lead back here)', () => {
    const printPage = read('src/app/plans/[slug]/print/page.tsx');
    expect(printPage).toContain('{SITE_HOST}/plans/');
    expect(SITE_HOST).toBe('notchplans.com');
  });

  it('the contact address is the real support mailbox', () => {
    expect(CONTACT_EMAIL).toBe('support@notchplans.com');
    // Both public pages render it from the constant, not a re-typed literal.
    expect(read('src/app/about/page.tsx')).toContain('{CONTACT_EMAIL}');
    expect(read('src/app/faq/page.tsx')).toContain('{CONTACT_EMAIL}');
  });

  it('root metadata builds its title template from the brand name', () => {
    const layout = read('src/app/layout.tsx');
    expect(layout).toContain('default: BRAND_NAME');
    expect(layout).toContain('metadataBase: new URL(SITE_ORIGIN)');
  });
});

describe('logo assets (Sprint 45 — generated from Keagan\'s SVG)', () => {
  it('every manifest icon exists on disk and is a real render, not a placeholder tile', () => {
    // The pre-rebrand icons were 756–2627-byte placeholder tiles. A real raster of
    // the mark can't be that small; this catches the file-never-regenerated class
    // of bug (regenerate with `node scripts/generate-icons.mjs`).
    const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
      icons: Array<{ src: string }>;
    };
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of manifest.icons) {
      const stat = statSync(join(root, 'public', icon.src));
      expect(stat.size, `${icon.src} looks like a placeholder`).toBeGreaterThan(3000);
    }
    expect(statSync(join(root, 'public/icons/apple-touch-icon.png')).size).toBeGreaterThan(3000);
  });

  it('the canonical mark is TRANSPARENT — the supplied background was stripped', () => {
    // Keagan's file arrived with a full-canvas #F5EDDF background path; he asked
    // for transparency. If the SVG is ever re-imported wholesale, this goes red.
    const mark = read('public/brand/notch-logo.svg');
    expect(mark).not.toContain('#F5EDDF');
    expect(mark).toContain('viewBox="0 0 319 342"');
  });

  it('the favicon is the same mark, served via the App Router file convention', () => {
    const favicon = read('src/app/icon.svg');
    expect(favicon).not.toContain('#F5EDDF');
    expect(favicon).toContain('<svg');
  });

  it('the header renders the lockup (mark + wordmark) from the brand asset', () => {
    const header = read('src/components/site-header.tsx');
    expect(header).toContain('/brand/notch-logo.svg');
    expect(header).toContain('{BRAND_NAME}');
  });
});
