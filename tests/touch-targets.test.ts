import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

/**
 * Sprint 34 (audit UX_AUDIT_2026-07-21 M1, V3) — the app's own rule (DESIGN_BRIEF.md §3,
 * CLAUDE.md) is that no interactive control ships below 44×44 CSS px (2.75rem). This shipped
 * broken in ~9 places. These are string-level guards so a future "compact" refactor of a
 * SHARED constant (btnBase is ~80 call sites) fails a named test instead of silently
 * shrinking every button on a phone. Same read-the-source technique as tests/dark-theme.test.ts.
 */
function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

const ui = read('../src/lib/ui.ts');

/** Extract the source of `const NAME = ...;` (up to the first semicolon). */
function constSource(src: string, name: string): string {
  const start = src.search(new RegExp(`\\bconst ${name}\\s*=`));
  if (start === -1) throw new Error(`const ${name} not found`);
  const end = src.indexOf(';', start);
  return src.slice(start, end === -1 ? undefined : end);
}

describe('shared UI constants meet the 44px (2.75rem) minimum', () => {
  // These are the constants that define a control's own height. `btnBase` feeds every
  // btn* variant (~80 call sites), so it is THE one that must never shrink.
  it.each(['btnBase', 'chipBase', 'checkbox', 'searchInput', 'selectControl'])(
    '%s carries min-h-[2.75rem]',
    (name) => {
      expect(constSource(ui, name)).toContain('min-h-[2.75rem]');
    },
  );
});

describe('Sprint 34 per-component fixes stay at 44px', () => {
  it('step-walker dots are 2.75rem square', () => {
    const dot = constSource(read('../src/components/step-walker.tsx'), 'dotBase');
    expect(dot).toContain('w-[2.75rem]');
    expect(dot).toContain('h-[2.75rem]');
  });

  it('filter drawer trigger + close are 44px (mobile) — no 2.25rem remains', () => {
    const src = read('../src/components/filter-disclosure.tsx');
    expect(src).toContain('min-h-[2.75rem]');
    expect(src).toContain('min-w-[2.75rem]'); // close ✕
    // the old sub-44 mobile sizes must be gone
    expect(src).not.toContain('min-h-[2.25rem]');
    expect(src).not.toContain('min-w-[2.25rem]');
  });

  it('account avatar trigger + modal close are 44px hit areas', () => {
    const menu = read('../src/components/account-menu.tsx');
    expect(menu).toContain('min-w-[2.75rem]');
    expect(menu).toContain('min-h-[2.75rem]');
    // the 36px VISUAL circle is preserved (audit: a 44px avatar unbalances the header)
    expect(menu).toContain('w-[36px]');
    const modal = read('../src/components/account-modal.tsx');
    expect(modal).toContain('min-h-[2.75rem]');
    expect(modal).toContain('min-w-[2.75rem]');
    expect(modal).not.toContain('min-h-[2.25rem]');
  });

  it('saved-page collection-remove ✕ is a 44px hit area', () => {
    const src = read('../src/app/saved/page.tsx');
    expect(src).toMatch(/min-h-\[2\.75rem\][^"]*min-w-\[2\.75rem\]|min-w-\[2\.75rem\][^"]*min-h-\[2\.75rem\]/);
  });

  it('shopping-list rows are 44px targets and the checkbox grew to 24px', () => {
    const src = read('../src/app/shopping-list/page.tsx');
    expect(src).toContain('min-h-[2.75rem]'); // the line row
    expect(src).toContain('w-[1.5rem]'); // 24px checkbox box
    expect(src).not.toContain('w-[1.15rem]'); // old 18.4px box gone
  });

  it('pagination + breadcrumb hit 2.75rem in globals.css', () => {
    const css = read('../src/app/globals.css');
    // .pagination-number
    expect(css).toMatch(/\.pagination-number\s*\{[\s\S]*?min-height:\s*2\.75rem/);
    // .breadcrumb a
    expect(css).toMatch(/\.breadcrumb a\s*\{[\s\S]*?min-height:\s*2\.75rem/);
    // no 2.375rem (old 38px pagination) or 2.25rem breadcrumb left in these two blocks
    expect(css).not.toContain('2.375rem');
  });
});

/**
 * Sprint 41.2 (audit V4) — the todo Sprint 34 left here is now a real assertion.
 *
 * `compactOnMobile` was a shared constant holding the last sub-44px value in `ui.ts`
 * (`min-h-[2.25rem]!`), with zero call sites since Sprint 39 rebuilt the sort control.
 * A dead export is one `import` away from being live again, and this one would have
 * shrunk a control below the app's own floor while every other guard above passed.
 */
describe('the last sub-44px shared value is gone (41.2)', () => {
  it('ui.ts no longer exports compactOnMobile', () => {
    expect(ui).not.toContain('export const compactOnMobile');
    expect(() => constSource(ui, 'compactOnMobile')).toThrow();
  });

  it('no shared constant carries a sub-44px height any more', () => {
    // The deletion comment names the old value, so match the utility as it would be
    // WRITTEN (in a class string), not merely mentioned in prose.
    expect(ui).not.toMatch(/['"`][^'"`]*min-h-\[2\.25rem\]/);
  });
});
