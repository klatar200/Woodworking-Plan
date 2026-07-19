import { describe, it, expect } from 'vitest';
import {
  btn,
  btnGhost,
  btnPrimary,
  btnDanger,
  btnLiked,
  page,
  searchInput,
  categoryLabel,
} from '@/lib/ui';

/**
 * Sprint 29 (UI migration, wave 1). Guards the ONE subtle correctness property of
 * the shared button classes: because Tailwind emits same-property utilities in a
 * fixed source order (not className order), each button must carry EXACTLY ONE
 * border-color utility and AT MOST ONE text-color utility — otherwise a later
 * source-ordered utility silently wins and the button renders the wrong border or
 * text (e.g. a base `border-transparent` erasing a variant's `border-border`).
 * A future edit that reintroduces that conflict fails here instead of on the site.
 */
const BORDER_COLORS = ['border-border', 'border-fg', 'border-transparent'];
const TEXT_COLORS = ['text-fg', 'text-surface', 'text-err'];
// 2026-07-16: globals.css has no `button` reset, so a `<button>` with no background
// utility keeps the UA `ButtonFace` fill — invisible in dark mode. Every variant must
// declare EXACTLY ONE background (same fixed-source-order reasoning as border/text color).
const BACKGROUNDS = ['bg-transparent', 'bg-fg'];

function count(cls: string, tokens: string[]): number {
  const set = new Set(cls.split(/\s+/));
  return tokens.filter((t) => set.has(t)).length;
}

describe('shared button classes (@/lib/ui)', () => {
  const variants = { btn, btnGhost, btnPrimary, btnDanger, btnLiked };

  for (const [name, cls] of Object.entries(variants)) {
    it(`${name}: exactly one border-color, one background, at most one text-color`, () => {
      expect(count(cls, BORDER_COLORS)).toBe(1);
      expect(count(cls, BACKGROUNDS)).toBe(1);
      expect(count(cls, TEXT_COLORS)).toBeLessThanOrEqual(1);
    });

    it(`${name}: carries the shared 44px height + focus ring, no legacy btn-* tokens`, () => {
      expect(cls).toContain('min-h-[2.75rem]');
      expect(cls).toContain('focus-visible:outline-ok');
      expect(cls).not.toMatch(/\bbtn-(ghost|primary|danger|liked)\b/);
    });
  }

  /**
   * QOL-F (2026-07-19, variant A) — press feedback on every button.
   *
   * `:active`, not `:hover`: Tailwind compiles `hover:` inside `@media (hover: hover)`,
   * so a hover-based press effect does nothing on a phone, which is where most of these
   * taps happen. And the transition must name `translate` — Tailwind v4 emits it as its
   * own property, so `transition-[transform]` would animate nothing at all.
   */
  for (const [name, cls] of Object.entries(variants)) {
    it(`${name}: settles on press, and stops moving under reduced motion`, () => {
      expect(cls).toContain('active:translate-y-px');
      expect(cls).toContain('transition-[translate,box-shadow]');
      expect(cls).not.toContain('transition-[transform');
      expect(cls).toContain('motion-reduce:transition-none');
      expect(cls).toContain('motion-reduce:active:translate-y-0');
    });
  }

  /** Elevation is a signal, so exactly one variant may carry it. */
  it('ONLY btnPrimary is elevated — if everything is raised, nothing is', () => {
    expect(btnPrimary).toContain('shadow-e2');
    expect(btnPrimary).toContain('hover:shadow-e3');
    // The press collapses the shadow as well as settling the button; that pairing is
    // what makes it read as weight rather than as a colour change.
    expect(btnPrimary).toContain('active:shadow-e1');

    for (const [name, cls] of Object.entries({ btn, btnGhost, btnDanger, btnLiked })) {
      expect(cls, name).not.toMatch(/\bshadow-e\d/);
    }
  });

  it('btnGhost is outlined ink; btnPrimary is ink-filled; btnDanger is red text', () => {
    expect(btnGhost).toContain('border-border');
    expect(btnGhost).toContain('text-fg');
    expect(btnPrimary).toContain('bg-fg');
    expect(btnPrimary).toContain('text-surface');
    expect(btnDanger).toContain('text-err');
    expect(btnLiked).toContain('border-fg');
  });
});

describe('shared shell classes (@/lib/ui)', () => {
  it('page retains the `page` class (for print + width modifiers) and the mobile width', () => {
    // Retaining the class is load-bearing: the print stylesheet and `.page-wide`
    // still target `.page`. See src/lib/ui.ts.
    expect(page.split(/\s+/)).toContain('page');
    expect(page).toContain('max-w-[40rem]');
    expect(page).toContain('mx-auto');
  });

  it('searchInput is a 44px field with the shared focus ring', () => {
    expect(searchInput).toContain('min-h-[2.75rem]');
    expect(searchInput).toContain('focus-visible:outline-ok');
  });

  it('categoryLabel is the uppercase muted eyebrow', () => {
    expect(categoryLabel).toContain('uppercase');
    expect(categoryLabel).toContain('text-muted');
  });
});
