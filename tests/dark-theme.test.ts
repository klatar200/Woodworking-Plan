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

  it('forces the tokens back to light under @media print', () => {
    // Dark must never print. Assert a print block resets `:root, .dark` to white bg / black ink,
    // so paper is light regardless of the on-screen theme.
    expect(css).toMatch(
      /@media print\s*\{\s*:root,\s*\.dark\s*\{[\s\S]*?--bg:\s*#ffffff[\s\S]*?--fg:\s*#000000/,
    );
  });
});
