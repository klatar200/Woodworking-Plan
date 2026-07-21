import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { clerkAppearance, clerkAppearanceDark } from '@/lib/clerk-appearance';

/**
 * Sprint 37.2 (audit D1) — Clerk's palette must equal ours, in BOTH themes.
 *
 * Clerk's components render in their own portal/iframe in some flows and do not inherit
 * our CSS custom properties, so `clerk-appearance.ts` duplicates the token values as
 * literal hexes. That duplication was policed by a COMMENT ("if the palette ever changes,
 * this file needs the same update") — and it silently failed: `colorTextSecondary` was
 * still `#8a8175`, the pre-Sprint-33 `--muted-2`, i.e. the value that sprint darkened for
 * failing WCAG AA. A comment is not a mechanism.
 *
 * This test IS the mechanism. It parses the tokens out of globals.css and asserts every
 * Clerk variable equals the token it mirrors, so the next palette edit fails here instead
 * of leaving the auth screens behind.
 */
const css = readFileSync(
  fileURLToPath(new URL('../src/app/globals.css', import.meta.url)),
  'utf8',
);

/** Parse `--name: #hex;` colour tokens from the first block matching `selector`. */
function colorTokens(selector: RegExp): Record<string, string> {
  const start = css.search(selector);
  if (start === -1) throw new Error(`block not found: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b/g)) {
    out[m[1]!] = m[2]!.toLowerCase();
  }
  return out;
}

const light = colorTokens(/^:root\s*\{/m);
const dark = colorTokens(/^\.dark\s*\{/m);

/** Which app token each Clerk variable mirrors. This mapping is the contract. */
const MIRRORS: Record<string, string> = {
  colorPrimary: '--fg',
  colorBackground: '--surface',
  colorText: '--fg',
  colorTextSecondary: '--muted-2',
  colorDanger: '--danger',
  colorInputBackground: '--bg',
  colorInputText: '--fg',
};

describe('Clerk appearance mirrors the app palette', () => {
  it.each(Object.entries(MIRRORS))(
    'light %s equals %s from :root',
    (variable, token) => {
      const actual = (clerkAppearance.variables as Record<string, string>)[variable];
      expect(actual?.toLowerCase(), `clerkAppearance.${variable}`).toBe(light[token]);
    },
  );

  it.each(Object.entries(MIRRORS))(
    'dark %s equals %s from .dark',
    (variable, token) => {
      const actual = (clerkAppearanceDark.variables as Record<string, string>)[variable];
      expect(actual?.toLowerCase(), `clerkAppearanceDark.${variable}`).toBe(dark[token]);
    },
  );

  /**
   * A dark object that quietly lost a key would fall back to Clerk's own default for it —
   * usually white — reintroducing exactly the flashbang this sprint removed, in one field.
   */
  it('defines the SAME variables in both themes (no half-themed surface)', () => {
    expect(Object.keys(clerkAppearanceDark.variables).sort()).toEqual(
      Object.keys(clerkAppearance.variables).sort(),
    );
  });

  it('shares the non-colour values (radius and font are not themed)', () => {
    expect(clerkAppearanceDark.variables.borderRadius).toBe(
      clerkAppearance.variables.borderRadius,
    );
    expect(clerkAppearanceDark.variables.fontFamily).toBe(
      clerkAppearance.variables.fontFamily,
    );
  });

  /**
   * The dark object is NOT the light one with a couple of tweaks — if these ever match,
   * someone copied rather than themed and dark mode's auth pages are white again.
   */
  it('actually differs from the light theme', () => {
    expect(clerkAppearanceDark.variables.colorBackground).not.toBe(
      clerkAppearance.variables.colorBackground,
    );
    expect(clerkAppearanceDark.variables.colorText).not.toBe(
      clerkAppearance.variables.colorText,
    );
  });
});

/** WCAG 2.1 relative luminance + contrast ratio (same maths as tests/contrast.test.ts). */
function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Sprint 33 made the app's own text AA in both themes. The auth pages are text too, and
 * they are the first screen a new user sees — so they get the same bar, not a pass because
 * a vendor renders them.
 */
describe('Clerk surfaces meet WCAG AA text contrast', () => {
  const cases = [
    ['light', clerkAppearance.variables],
    ['dark', clerkAppearanceDark.variables],
  ] as const;

  it.each(cases)('%s body text on the card background', (_name, vars) => {
    expect(contrast(vars.colorText, vars.colorBackground)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(cases)('%s secondary text on the card background', (_name, vars) => {
    expect(contrast(vars.colorTextSecondary, vars.colorBackground)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it.each(cases)('%s input text on the input background', (_name, vars) => {
    expect(contrast(vars.colorInputText, vars.colorInputBackground)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
