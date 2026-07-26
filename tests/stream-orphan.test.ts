import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Sprint 66 Attempt 2 — orphaned React stream containers (`div#S:N`).
 *
 * Route difference that matters:
 * - `/designer/*` had no route `loading.tsx` → clean after root loading deleted.
 * - `/browse` + `/plans/[slug]` kept route `loading.tsx` → still postponed (`$~`)
 *   with a full resolved page copy in `S:N` (not the skeleton). Measured on prod
 *   `15fa502`: 2 mains, ~101 KB orphan bag on `/browse`.
 *
 * Fix: delete those route `loading.tsx` files so the page ships in the first
 * flush (same workaround as Next #94750). Skeleton-without-`<main>` was not enough.
 *
 * Nonce: SETTLED — not CSP (0 unnonced inline on prod).
 */
describe('stream orphan — no route loading.tsx (Attempt 2)', () => {
  it('browse and plan-detail have no loading.tsx (no Suspense shell around the page)', () => {
    expect(existsSync('src/app/browse/loading.tsx')).toBe(false);
    expect(existsSync('src/app/plans/[slug]/loading.tsx')).toBe(false);
    expect(existsSync('src/app/loading.tsx')).toBe(false);
    expect(existsSync('src/app/designer/loading.tsx')).toBe(false);
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
