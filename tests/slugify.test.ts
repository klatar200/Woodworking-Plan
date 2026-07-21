import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/format';

/**
 * Sprint 35 (audit A4) — shopping-list checkbox ids were built from raw material names, which
 * are invalid as HTML ids (spaces, quotes, `#`) and collided across unit groups. slugify is the
 * fix; these assert the exact failure cases the audit named.
 */
describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Wood glue')).toBe('wood-glue');
  });

  it('strips punctuation and quotes that break an HTML id', () => {
    // the audit's worst real value
    expect(slugify('Stainless steel screws, #8 x 1-1/4"')).toBe('stainless-steel-screws-8-x-1-1-4');
  });

  it('collapses runs and trims leading/trailing separators', () => {
    expect(slugify('  --Pine  Board-- ')).toBe('pine-board');
  });

  it('returns empty string for empty or all-symbol input (caller must namespace)', () => {
    expect(slugify('')).toBe('');
    expect(slugify('—/#')).toBe('');
  });

  it('produces ids valid under /^[A-Za-z][\\w-]*$/ once prefixed', () => {
    for (const name of ['Wood glue', 'Exterior screws, coated, 1-5/8"', 'Danish oil']) {
      const id = `have-merged-each-${slugify(name)}-`;
      expect(id).toMatch(/^[A-Za-z][\w-]*$/);
    }
  });

  it('the same name in two unit groups yields DISTINCT ids (the collision the audit flagged)', () => {
    const name = 'Wood glue';
    const each = `have-merged-${slugify('each')}-${slugify(name)}-${slugify('')}`;
    const bf = `have-merged-${slugify('board feet')}-${slugify(name)}-${slugify('')}`;
    expect(each).not.toBe(bf);
  });

  it('same name, different species yields DISTINCT ids', () => {
    const a = `have-byplan-cutting-board-${slugify('Board')}-${slugify('Walnut')}`;
    const b = `have-byplan-cutting-board-${slugify('Board')}-${slugify('Maple')}`;
    expect(a).not.toBe(b);
  });
});
