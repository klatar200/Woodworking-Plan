import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Sprint 40.5/40.6 (audit D2) — the landing page uses the SITE scale, not its own.
 *
 * `src/app/page.tsx` was built from a mockup and arrived speaking its own dialect: seven
 * font sizes (0.72 / 0.9 / 0.93 / 0.95 / 1.02 / 1.1 / 1.15rem) and four radii (0.6 / 0.7 /
 * 0.8 / 1.1rem) that appear on no other page. None of them are individually wrong — the
 * problem is that "0.93rem" is a decision someone made once by eye, and the next person
 * tuning the hero makes another one, and a scale is not a scale once it has twelve steps.
 *
 * SO THIS IS A SOURCE TEST, NOT A RENDER TEST, deliberately. Rendering proves the page
 * works; it cannot prove the page's values belong to a system. The failure this guards
 * against never breaks anything — it just quietly re-forks the type scale, which is
 * precisely why it needs a machine watching rather than a code review.
 *
 * `clamp()` sizes are exempt: those are display headings that must scale with the
 * viewport, and a clamp IS the system's answer for that. Pill/circle/hairline radii
 * (999px, 50%, 2px) are shapes, not scale steps.
 */
const SOURCE = readFileSync(join(process.cwd(), 'src/app/page.tsx'), 'utf8');

/** The type ramp. Anything outside it on this page is drift. */
const FONT_SIZES = new Set([
  '0.75rem',
  '0.875rem',
  '0.9375rem',
  '1rem',
  '1.0625rem',
  '1.125rem',
  '1.25rem',
  '1.5rem',
]);

/** Radius steps, plus the three shape values that are not steps at all. */
const RADII = new Set(['0.375rem', '0.5rem', '0.75rem', '1rem', '2px', '50%', '999px']);

/** Every `text-[…]` / `rounded-[…]` arbitrary in the file, variants included. */
function arbitraries(prefix: string): string[] {
  const found = new Set<string>();
  const re = new RegExp(`(?:^|[\\s"'\`:])(?:[a-z-]+:)*${prefix}-\\[([^\\]]+)\\]`, 'g');
  for (const m of SOURCE.matchAll(re)) if (m[1]) found.add(m[1]);
  return [...found];
}

describe('landing page type + radius scale (40.5)', () => {
  it('uses no font size outside the documented ramp', () => {
    const offenders = arbitraries('text').filter(
      // A `text-[…]` arbitrary is only a font size when it looks like one; the same
      // utility prefix also carries colours (`text-[#c9c2b6]`) on this page.
      (v) => !v.startsWith('clamp(') && !v.startsWith('#') && !FONT_SIZES.has(v),
    );

    expect(offenders, `off-scale font sizes in page.tsx: ${offenders.join(', ')}`).toEqual([]);
  });

  it('uses no border radius outside the documented steps', () => {
    const offenders = arbitraries('rounded').filter((v) => !RADII.has(v));

    expect(offenders, `off-scale radii in page.tsx: ${offenders.join(', ')}`).toEqual([]);
  });

  /**
   * The regexes above are the whole test, so a typo that matched nothing would pass
   * silently and green-light any value at all. This asserts they still find the page's
   * real utilities.
   */
  it('actually finds the page’s utilities (the regex is load-bearing)', () => {
    expect(arbitraries('text').length).toBeGreaterThan(5);
    expect(arbitraries('rounded').length).toBeGreaterThan(3);
  });

  /**
   * Sprint 40.4 (audit V2). The timeline cards lifted 6px on hover while every other card
   * in the app lifts 4px — a difference nobody chose, visible when the two sit on one
   * screen.
   */
  it('lifts cards by the one shared hover distance', () => {
    expect(SOURCE).not.toContain('-translate-y-[6px]');
    expect(SOURCE).toContain('hover:-translate-y-[4px]');
  });
});

/**
 * Sprint 40.1/40.3 — the two structural bits of this sprint that are CSS-selected, so a
 * render assertion would not see them, but dropping the class would silently revert the
 * behaviour (the standing "any class a stylesheet targets stays on its element" rule).
 */
describe('landing marquee + accordion wiring (40.1, 40.3)', () => {
  const CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

  it('marks the featured band as the swipe row, and only that band', () => {
    // Exactly one ELEMENT carries it — the trust and category bands are text, and they
    // keep animating everywhere (they gained the focus-pause instead).
    expect(SOURCE.match(/className="[^"]*landing-marquee-swipe/g)).toHaveLength(1);
    expect(CSS).toContain('.landing-marquee-swipe');
  });

  it('kills the animation and drops the loop duplicates below lg', () => {
    const block = CSS.slice(CSS.indexOf('@media (max-width: 63.9375rem)'));

    expect(block).toMatch(/\.landing-marquee-swipe \.landing-marquee-track \{\s*animation: none;/);
    // The duplicates are selected by `inert` — the same attribute PlanCard's `decorative`
    // sets — so the CSS cannot disagree with the copy count.
    expect(block).toMatch(/\.landing-marquee-track > \[inert\] \{\s*display: none;/);
    expect(block).toContain('scroll-snap-type: x mandatory');
  });

  it('pauses every marquee on focus, not just on hover', () => {
    // The category row is links: tabbing into a moving band drags the focused control out
    // from under the user, and hover is not available to a keyboard.
    expect(CSS).toContain('.landing-marquee:focus-within .landing-marquee-track');
    // The reduced-motion escape must survive alongside it.
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.landing-marquee-track/);
  });

  it('gives the landing FAQ the same summary treatment as /faq', () => {
    const faq = readFileSync(join(process.cwd(), 'src/app/faq/page.tsx'), 'utf8');

    for (const marker of [
      'group-open:rotate-90',
      '[&::-webkit-details-marker]:hidden',
      '[interpolate-size:allow-keywords]',
      'open:[&::details-content]:h-auto',
      'motion-reduce:transition-none',
    ]) {
      expect(SOURCE, `landing FAQ is missing ${marker}`).toContain(marker);
      expect(faq, `/faq is missing ${marker}`).toContain(marker);
    }
  });
});
