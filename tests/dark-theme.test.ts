import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

/**
 * Sprint 31/32 — dark mode is a token flip: `.dark {}` overrides the `:root` colour tokens,
 * and every utility + the component-CSS residual reads them. The failure mode is silent: add
 * a `--token` to `:root` and forget it in `.dark`, and that one colour stays LIGHT in dark
 * mode (un-themed). This test locks light and dark to the same token set so that can't happen.
 */
const css = readFileSync(
  fileURLToPath(new URL('../src/app/globals.css', import.meta.url)),
  'utf8',
);

/** Grab the token names declared inside the FIRST `<selector> { ... }` block. */
function tokensIn(selectorPattern: RegExp): Set<string> {
  const start = css.search(selectorPattern);
  if (start === -1) throw new Error(`block not found: ${selectorPattern}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  return new Set([...body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!));
}

describe('light/dark theme tokens stay in sync', () => {
  const light = tokensIn(/^:root\s*\{/m);
  const dark = tokensIn(/^\.dark\s*\{/m);

  it('every :root colour token is also defined in .dark (nothing stays un-themed)', () => {
    const missing = [...light].filter((t) => !dark.has(t));
    expect(missing).toEqual([]);
  });

  it('.dark introduces no token that light lacks (no dangling dark-only var)', () => {
    const extra = [...dark].filter((t) => !light.has(t));
    expect(extra).toEqual([]);
  });

  it('defines --accent-fg (on-accent ink) in both themes', () => {
    expect(light.has('--accent-fg')).toBe(true);
    expect(dark.has('--accent-fg')).toBe(true);
  });

  /**
   * QOL-F (2026-07-19) — the elevation scale. Same failure mode as a colour: define it
   * in `:root`, forget it in `.dark`, and dark mode silently keeps light-mode shadows,
   * which on a near-black surface means no visible elevation at all. The set-based
   * checks above already catch that; this states the tokens by name so the intent
   * survives someone "tidying" them.
   */
  it('defines the elevation scale in BOTH themes', () => {
    for (const token of ['--elev-1', '--elev-2', '--elev-3']) {
      expect(light.has(token), `light ${token}`).toBe(true);
      expect(dark.has(token), `dark ${token}`).toBe(true);
    }
  });

  it('gives the DARK theme its own elevation values, not the light ones', () => {
    // A shadow barely registers on a dark surface, so dark elevation leads with an inset
    // top-edge highlight. If this ever matches the light values, the tokens were copied
    // rather than designed and dark mode is flatter than light.
    const darkBlock = css.slice(css.search(/^\.dark\s*\{/m));
    expect(darkBlock).toMatch(/--elev-1:\s*inset/);
  });

  it('forces the tokens back to light under @media print', () => {
    // Dark must never print. Assert a print block resets `:root, .dark` to white bg / black ink,
    // so paper is light regardless of the on-screen theme.
    expect(css).toMatch(
      /@media print\s*\{\s*:root,\s*\.dark\s*\{[\s\S]*?--bg:\s*#ffffff[\s\S]*?--fg:\s*#000000/,
    );
  });

  /**
   * QOL-F — a shadow is INK. A printer renders one as a soft grey blur around every card
   * and button: wasted toner, and a cut sheet that looks photocopied. Killed twice on
   * purpose — at the tokens (which the component-CSS residual reads) and with a blanket
   * override (because `box-shadow` also arrives from Tailwind utilities that never touch
   * a token).
   */
  it('prints nothing elevated', () => {
    expect(css).toMatch(/--elev-1:\s*none/);
    expect(css).toMatch(/box-shadow:\s*none\s*!important/);
  });

  /**
   * 🛑 THE BLANK-CATALOG HAZARD. The card settle-in uses `animation-fill-mode: both`, so
   * a card is held at `opacity: 0` until its delay elapses. If the animation does not
   * run — on paper, or for a reader who asked for no motion — the fill would leave the
   * whole grid invisible. `animation: none` in both escapes restores opacity to 1.
   * These two assertions are the difference between a polish effect and a printed page
   * of nothing.
   */
  it('escapes the card settle-in for print AND reduced motion', () => {
    const printBlocks = css.match(/@media print\s*\{[\s\S]*?\n\}/g) ?? [];
    expect(printBlocks.some((b) => /\.plan-grid > li\s*\{\s*animation:\s*none/.test(b))).toBe(
      true,
    );

    const rmBlocks = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/g) ?? [];
    expect(rmBlocks.some((b) => /\.plan-grid > li\s*\{\s*animation:\s*none/.test(b))).toBe(
      true,
    );
  });
});
