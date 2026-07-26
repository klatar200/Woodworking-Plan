import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Exactly one `<main` landmark in page sources that own the document landmark.
 *
 * Streaming orphans duplicate `<main>` in the *browser DOM* after a postponed
 * `$RC` no-op — fetch()/static render cannot see that. This source guard
 * catches authoring a second landmark. Browser census:
 * `scripts/smoke-stream-dom.mjs` (real Chrome against a running server).
 *
 * Settings/profile/workshop pages redirect or nest under a layout landmark —
 * they are allowed to have zero `<main>` here; they must not have two.
 */
const MUST_HAVE_ONE_MAIN = [
  'src/app/page.tsx',
  'src/app/browse/page.tsx',
  'src/app/plans/[slug]/page.tsx',
  'src/app/plans/[slug]/build/page.tsx',
  'src/app/plans/[slug]/boards/page.tsx',
  'src/app/plans/[slug]/print/page.tsx',
  'src/app/designer/page.tsx',
  'src/app/designer/[id]/page.tsx',
  'src/app/designer/[id]/print/page.tsx',
  'src/app/designer/library/page.tsx',
  'src/app/saved/page.tsx',
  'src/app/shopping-list/page.tsx',
  'src/app/builds/page.tsx',
  'src/app/paths/page.tsx',
  'src/app/paths/[slug]/page.tsx',
  'src/app/about/page.tsx',
  'src/app/faq/page.tsx',
  'src/app/offline/page.tsx',
  'src/app/sign-in/[[...sign-in]]/page.tsx',
  'src/app/sign-up/[[...sign-up]]/page.tsx',
];

const NEVER_TWO = [
  ...MUST_HAVE_ONE_MAIN,
  'src/app/profile/page.tsx',
  'src/app/workshop/page.tsx',
  'src/app/settings/page.tsx',
  'src/app/settings/billing/page.tsx',
  'src/app/settings/preferences/page.tsx',
  'src/app/settings/profile/page.tsx',
  'src/app/settings/security/[[...rest]]/page.tsx',
  'src/app/settings/terms/page.tsx',
  'src/app/settings/workshop/page.tsx',
];

function mainOpens(file: string): number {
  const src = readFileSync(file, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return (code.match(/<main\b/g) ?? []).length;
}

describe('one <main> landmark per content page source', () => {
  for (const file of MUST_HAVE_ONE_MAIN) {
    it(`${file} has exactly one <main`, () => {
      expect(mainOpens(file)).toBe(1);
    });
  }

  for (const file of NEVER_TWO) {
    it(`${file} never has two <main> tags`, () => {
      expect(mainOpens(file)).toBeLessThan(2);
    });
  }
});
