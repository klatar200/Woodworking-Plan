import { readFileSync } from 'fs';
import { join } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepWalker } from '@/components/step-walker';

/**
 * StepWalker's entire safety property is that it degrades to PLAIN CONTENT
 * without JavaScript — see the file doc in step-walker.tsx. `useEffect` never
 * runs during server-side rendering (React SSR does not execute effects), so
 * a static render of this component is exactly what a no-JS visitor, a crawler,
 * or the instant before hydration actually sees. That makes
 * `renderToStaticMarkup` the right tool here, without needing a DOM
 * environment (jsdom) this project doesn't otherwise depend on.
 */

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const steps = (n: number) =>
  Array.from({ length: n }, (_, i) => (
    <li key={i} className="step" data-step={i + 1}>
      Step {i + 1} content
    </li>
  ));

describe('StepWalker — server render (no JS yet)', () => {
  it('renders every step for a multi-step plan, with none hidden', () => {
    const html = renderToStaticMarkup(
      <StepWalker stepTitles={['First', 'Second', 'Third']} slug="desk">
        <ol>{steps(3)}</ol>
      </StepWalker>,
    );

    expect(html).toContain('Step 1 content');
    expect(html).toContain('Step 2 content');
    expect(html).toContain('Step 3 content');
    // None of the JS-only chrome exists before mount — a Prev/Next button
    // with no attached handler would be a dead control.
    expect(html).not.toContain('step-walker-nav');
    expect(html).not.toContain('step-rail');
    expect(html).not.toContain('step-dots');
  });

  it('renders children UNCHANGED for a single-step plan (no walker chrome at all)', () => {
    const html = renderToStaticMarkup(
      <StepWalker stepTitles={['Only step']} slug="desk">
        <ol>{steps(1)}</ol>
      </StepWalker>,
    );

    expect(html).toBe(renderToStaticMarkup(<ol>{steps(1)}</ol>));
  });

  /**
   * Sprint 38.1 — the restore lives in the mount effect, which SSR never runs. If it ever
   * migrated into render (a `useState` initialiser, say), the server would touch a browser
   * global: a hydration mismatch at best, a crash on the server at worst. Asserting on a
   * recording stub proves the read is where it is supposed to be, without a DOM.
   */
  describe('the remembered step is never read during a server render', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    afterEach(() => {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else delete (globalThis as { localStorage?: unknown }).localStorage;
    });

    it('touches no storage while rendering to markup', () => {
      const calls: string[] = [];
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        writable: true,
        value: {
          getItem: (k: string) => (calls.push(`get ${k}`), '3'),
          setItem: (k: string) => void calls.push(`set ${k}`),
          removeItem: (k: string) => void calls.push(`remove ${k}`),
        },
      });

      const html = renderToStaticMarkup(
        <StepWalker stepTitles={['a', 'b', 'c']} slug="desk">
          <ol>{steps(3)}</ol>
        </StepWalker>,
      );

      expect(calls).toEqual([]);
      // …and the stored "3" did not leak into the markup: no step is hidden pre-mount.
      expect(html).toContain('Step 1 content');
      expect(html).toContain('Step 3 content');
    });
  });
});

/**
 * Sprint 38.3 — the sticky bar, asserted at the source level because there is no DOM here
 * and its correctness is entirely a question of which classes are present.
 */
describe('the mobile Prev/Next bar (38.3)', () => {
  const walker = source('src/components/step-walker.tsx');

  it('is sticky below lg and returns to the flow at lg', () => {
    expect(walker).toContain('sticky bottom-0');
    // Every mobile-only declaration needs its `lg:` counterpart, or desktop drifts.
    for (const cls of [
      'lg:static',
      'lg:mx-0',
      'lg:px-0',
      'lg:pt-0',
      'lg:pb-0',
      'lg:border-t-0',
      'lg:bg-transparent',
    ]) {
      expect(walker, cls).toContain(cls);
    }
  });

  it('clears the phone home indicator', () => {
    expect(walker).toContain('pb-[calc(0.75rem+env(safe-area-inset-bottom))]');
  });

  /**
   * `py-*` compiles to the `padding-block` SHORTHAND and would fight the `pb-*` longhand
   * by Tailwind's source order, not className order — the standing migration gotcha. The
   * safe-area padding silently losing is exactly the kind of thing nobody notices until a
   * button sits under the home indicator.
   */
  it('uses padding longhands, never the py- shorthand, on the bar', () => {
    const nav = /const stepNav =\s*'([^']*)'/.exec(walker)?.[1] ?? '';
    expect(nav).not.toMatch(/\bpy-/);
    expect(nav).not.toMatch(/\blg:py-/);
  });

  /** Without the runway the bar can pin over the finish CTA with nothing left to scroll. */
  it('leaves scroll runway below the bar on mobile only', () => {
    expect(walker).toContain('pb-[4.5rem] lg:pb-0');
  });
});

/**
 * Sprint 38.5 — RE-VERIFY THE PRINT CONTRACT. This sprint edits the most print-sensitive
 * component in the app, and the print stylesheet has been silently orphaned three times
 * (Sprint 30b/30c, QOL-A): a class was converted to utilities, dropped from the element,
 * and its `@media print` rule went on matching nothing. Both halves are asserted — the
 * rule exists AND the class is still on the element.
 */
describe('print still gets the whole plan, and none of the walker (38.5)', () => {
  const css = source('src/app/globals.css');
  const walker = source('src/components/step-walker.tsx');

  /**
   * globals.css has FIVE `@media print` blocks, so "everything after the first one" is
   * not the print stylesheet — it is most of the file. Collect each block by matching
   * braces, with comments stripped first (one of them talks about `@media print`).
   */
  const printBlock = (() => {
    const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
    let out = '';
    for (let i = code.indexOf('@media print'); i !== -1; i = code.indexOf('@media print', i)) {
      const open = code.indexOf('{', i);
      let depth = 0;
      let j = open;
      for (; j < code.length; j++) {
        if (code[j] === '{') depth++;
        else if (code[j] === '}' && --depth === 0) break;
      }
      out += `${code.slice(open + 1, j)}\n`;
      i = j;
    }
    return out;
  })();

  it('found the print stylesheet it is asserting against', () => {
    // A brace-matching parse that silently returned '' would make every test below pass.
    expect(printBlock.length).toBeGreaterThan(500);
  });

  it('forces every step visible on paper, overriding the inline display:none', () => {
    expect(printBlock).toMatch(/\.step\s*\{[^}]*display:\s*block\s*!important/);
  });

  it.each([
    'step-rail',
    'step-dots',
    'step-walker-bar',
    'step-walker-nav',
    'step-finish-cta',
  ])('hides .%s on paper — and the class is still on its element', (cls) => {
    expect(printBlock, `${cls} missing from the print block`).toContain(`.${cls}`);
    expect(walker, `${cls} dropped from step-walker.tsx`).toContain(cls);
  });

  /** 38.2's scroll offset must not become print's problem — it is a screen concern. */
  it('adds scroll-margin to .step outside the print block', () => {
    expect(css).toMatch(/\.step\s*\{[^}]*scroll-margin-top/);
    expect(printBlock).not.toContain('scroll-margin-top');
  });
});
