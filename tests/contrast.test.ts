import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

/**
 * Sprint 33 (audit UX_AUDIT_2026-07-21 A1) — the light theme shipped two text tokens that
 * failed WCAG AA: --accent-strong as text (3.57:1 on --bg) and --muted-2 (3.64:1). This test
 * makes contrast a red/green FACT for every future palette edit, in BOTH themes, so a token
 * tweak that reintroduces a sub-AA text colour fails a named assertion instead of shipping.
 *
 * Technique mirrors tests/dark-theme.test.ts: parse the hex tokens straight out of globals.css
 * (no build, no browser) and compute WCAG relative-luminance contrast in-process.
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

/** WCAG 2.1 relative luminance + contrast ratio. */
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

const light = colorTokens(/^:root\s*\{/m);
const dark = colorTokens(/^\.dark\s*\{/m);

/**
 * Every token-on-token pairing the app renders as text (or as a 3:1 graphic where noted),
 * with the WCAG threshold and a real call site. Foreground first, background second.
 * 4.5 = normal body text; 3.0 = large text / graphic. Add a row here when a new coloured
 * text usage lands — this table is the contract.
 */
const PAIRS: Array<{ fg: string; bg: string; min: number; where: string }> = [
  { fg: '--fg', bg: '--bg', min: 4.5, where: 'body copy on the page' },
  { fg: '--fg', bg: '--surface', min: 4.5, where: 'text inside a card' },
  { fg: '--muted', bg: '--bg', min: 4.5, where: 'muted subtitles / captions' },
  { fg: '--muted', bg: '--surface', min: 4.5, where: 'muted text inside a card' },
  { fg: '--muted-2', bg: '--bg', min: 4.5, where: 'landing footnote / trust marquee' },
  { fg: '--muted-2', bg: '--surface', min: 4.5, where: 'step-rail label' },
  // Sprint 46 (Direction C): the landing eyebrow/<em> moved to muted+oak; forest-as-text now
  // lives on interactive surfaces — the "Clear search and filters" link and the header nav hover.
  { fg: '--accent-text', bg: '--bg', min: 4.5, where: 'accent link text (Clear search and filters)' },
  { fg: '--accent-text', bg: '--surface', min: 4.5, where: 'accent text in a card / header nav hover' },
  { fg: '--accent-text', bg: '--accent-tint', min: 4.5, where: 'eyebrow / tool-fit text on tint' },
  { fg: '--accent-fg', bg: '--accent', min: 4.5, where: 'on-accent ink (chipActive, active pill)' },
  { fg: '--danger', bg: '--bg', min: 4.5, where: 'destructive-action / error text' },
  { fg: '--err', bg: '--surface', min: 4.5, where: 'impossible-part warning in a card' },
  { fg: '--ok', bg: '--surface', min: 4.5, where: 'success text (tool-fit "you own all")' },
  { fg: '--surface', bg: '--fg', min: 4.5, where: 'btnPrimary label (surface ink on fg fill)' },
  { fg: '--pending', bg: '--surface', min: 4.5, where: 'pending status text' },
];

describe.each([
  ['light', light],
  ['dark', dark],
])('WCAG AA contrast — %s theme', (themeName, tokens) => {
  it.each(PAIRS)(
    `$fg on $bg is AA ($where)`,
    ({ fg, bg, min }) => {
      const fgHex = tokens[fg];
      const bgHex = tokens[bg];
      expect(fgHex, `${fg} missing in ${themeName}`).toBeDefined();
      expect(bgHex, `${bg} missing in ${themeName}`).toBeDefined();
      const ratio = contrast(fgHex!, bgHex!);
      expect(
        ratio,
        `${themeName}: ${fg}(${fgHex}) on ${bg}(${bgHex}) = ${ratio.toFixed(2)}:1, need ${min}`,
      ).toBeGreaterThanOrEqual(min);
    },
  );
});

// Sanity: the computation itself is right — known reference pairs.
describe('contrast() sanity', () => {
  it('black on white is 21:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('white on white is 1:1', () => {
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });
});
