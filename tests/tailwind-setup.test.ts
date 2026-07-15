import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

/**
 * Sprint 28 — guards the two invariants the Tailwind migration rests on. Both are
 * things a well-meaning future edit could break SILENTLY (the app would still build;
 * only the rendered pixels would drift), so they are worth locking down:
 *
 *  1. Preflight (Tailwind's base reset) must NOT be imported. `globals.css` owns the
 *     reset for the whole migration; pulling in Preflight (e.g. by switching to the
 *     bare `@import "tailwindcss";`) would zero heading margins/list styles across
 *     every page — the exact zero-visual-diff violation BUILD_PLAN.md §4.4 forbids.
 *  2. Every color token maps to a `var(--token)`, not a hardcoded hex. That is what
 *     keeps `:root` in globals.css the single source of truth (and lets Sprint 31's
 *     dark theme work by flipping the vars). A literal hex here would fork the palette.
 */
const cssPath = fileURLToPath(
  new URL('../src/app/tailwind.css', import.meta.url),
);
const css = readFileSync(cssPath, 'utf8');

// Strip /* ... */ comments before asserting on directives — the file's own
// explanatory comments quote the forbidden `@import "tailwindcss";` as an example
// of what NOT to do, and that documentation must not trip the guard.
const code = css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('Tailwind entry CSS (Sprint 28 foundation)', () => {
  it('imports the theme and utilities layers', () => {
    expect(code).toContain("@import 'tailwindcss/theme.css' layer(theme)");
    expect(code).toContain(
      "@import 'tailwindcss/utilities.css' layer(utilities)",
    );
  });

  it('does NOT import Preflight or the bundle that includes it', () => {
    // The bare bundle (`@import "tailwindcss"`) and the preflight entry both inject
    // the base reset. Neither may appear, or zero-visual-diff is broken.
    expect(code).not.toMatch(/@import\s+['"]tailwindcss['"]\s*;/);
    expect(code).not.toMatch(/preflight/i);
  });

  it('maps every color token to a :root var, never a hardcoded value', () => {
    // Pull each `--color-*: <value>;` line out of the @theme block and assert the
    // value is a var() reference (the single-source-of-truth contract).
    const colorLines = [...code.matchAll(/--color-[\w-]+:\s*([^;]+);/g)];
    expect(colorLines.length).toBeGreaterThanOrEqual(15);
    for (const [, value] of colorLines) {
      expect(value?.trim()).toMatch(/^var\(--[\w-]+\)$/);
    }
  });

  it('defines the one custom breakpoint the default scale lacks (34rem)', () => {
    // 40/64/80/96rem already match Tailwind's sm/lg/xl/2xl; only 34rem needs adding.
    expect(code).toContain('--breakpoint-xs: 34rem');
  });
});
