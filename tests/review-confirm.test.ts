import { describe, it, expect } from 'vitest';
import { showConfirm } from '@/lib/review-confirm';

/**
 * Sprint 35 (audit H1) — the destructive-action confirm must reveal ONLY for a target the
 * session user may modify, and a forged/foreign id must reveal nothing. This is the
 * security-relevant decision behind the inline confirm block, unit-tested here so it can't
 * silently regress (the full click-through is browser-verified; the server action re-checks
 * ownership regardless).
 */
describe('showConfirm', () => {
  it('shows the confirm for the user\'s own target id', () => {
    expect(showConfirm('rev_1', 'rev_1', true)).toBe(true);
  });

  it('hides for a foreign/forged id (the audit\'s attack)', () => {
    expect(showConfirm('rev_999', 'rev_1', true)).toBe(false);
  });

  it('hides when the user may not modify the target, even if the id matches', () => {
    expect(showConfirm('rev_1', 'rev_1', false)).toBe(false);
  });

  it('hides when no confirm param is present', () => {
    expect(showConfirm(undefined, 'rev_1', true)).toBe(false);
    expect(showConfirm(null, 'rev_1', true)).toBe(false);
  });
});
