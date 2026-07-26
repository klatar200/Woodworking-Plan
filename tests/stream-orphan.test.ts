import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 66 Part A — orphaned React stream containers (`div#S:N`).
 *
 * Characterisation (prod + local HTML, 2026-07-26):
 *
 * Trigger (one sentence): when an App Router Suspense boundary from `loading.tsx`
 * (or the segment shell) streams under React's postponed opener `<!--$~-->`,
 * `$RC` silently no-ops and leaves `div#S:N` in the DOM with a full page copy
 * while the visible tree already holds the real content.
 *
 * Nonce: SETTLED — every inline streaming script on prod `/browse` (including
 * `$RC(...)` completion scripts) carries the request nonce from middleware;
 * unnonced inline count was 0. CSP `'strict-dynamic'` is not the cause.
 *
 * `/browse` raw HTML already contains two `<main>` tags inside stream bags
 * (loading skeleton + page) before `$RC` runs — same mechanism as designer,
 * not unrelated markup. Mitigations: delete null root `loading.tsx`; stop using
 * `<main>` in route skeletons so a surviving bag is not a second landmark.
 *
 * Framework limit: we cannot teach `$RC` to handle `$~` (Next/React issues
 * #94170 / #94750). Documented inert duplicate when the race hits.
 */
describe('stream orphan mitigations + CSP nonce seam', () => {
  it('route loading skeletons are not <main> landmarks', () => {
    const browse = readFileSync('src/app/browse/loading.tsx', 'utf8');
    const plan = readFileSync('src/app/plans/[slug]/loading.tsx', 'utf8');
    // Strip block comments so prose mentioning <main> does not false-fail.
    const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripComments(browse)).not.toMatch(/<main\b/);
    expect(stripComments(plan)).not.toMatch(/<main\b/);
    expect(browse).toMatch(/role="status"/);
    expect(stripComments(browse)).toMatch(/return \(\s*<div\b/);
  });

  it('null root app/loading.tsx is gone (it only created an empty Suspense boundary)', () => {
    let missing = false;
    try {
      readFileSync('src/app/loading.tsx', 'utf8');
    } catch {
      missing = true;
    }
    expect(missing).toBe(true);
  });

  it('middleware still stamps x-nonce + CSP for Next/Clerk/streaming scripts', () => {
    const mw = readFileSync('src/middleware.ts', 'utf8');
    expect(mw).toContain("'strict-dynamic'");
    expect(mw).toContain('x-nonce');
    expect(mw).toMatch(/nonce-\$\{nonce\}/);
  });

  it('root layout keeps ClerkProvider dynamic (nonce switch) and theme script nonce', () => {
    const layout = readFileSync('src/app/layout.tsx', 'utf8');
    expect(layout).toMatch(/<ClerkProvider\s+dynamic/);
    expect(layout).toMatch(/nonce=\{nonce\}/);
  });
});
