import { describe, it, expect } from 'vitest';
import { formString, formInt } from '@/lib/form-fields';

/**
 * The FormData readers behind every server action (2026-07-19).
 *
 * These replaced four copies of a helper that THREW on a missing field — and an uncaught
 * throw out of a server action is an HTTP 500 with a client "Application error" boundary,
 * the same failure the rate limiter caused before it was fixed to no-throw. A server
 * action is a public HTTP endpoint: a POST with a missing or junk field is ordinary
 * untrusted input, so it must DEGRADE, not explode.
 */

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

describe('formString', () => {
  it('returns a real value', () => {
    expect(formString(form({ planId: 'abc' }), 'planId')).toBe('abc');
  });

  it('returns null — never throws — for missing, empty or whitespace-only fields', () => {
    expect(formString(form({}), 'planId')).toBeNull();
    expect(formString(form({ planId: '' }), 'planId')).toBeNull();
    expect(formString(form({ planId: '   ' }), 'planId')).toBeNull();
  });

  it('trims, so a padded field is still usable', () => {
    expect(formString(form({ name: '  Shelves  ' }), 'name')).toBe('Shelves');
  });

  /**
   * `FormData.get` returns `string | File | null`. A File where a string is expected
   * means a hand-built request; stringifying it would hand `"[object File]"` to a
   * database query as if it were an id.
   */
  it('rejects a File posted where a string was expected', () => {
    const data = new FormData();
    data.set('planId', new File(['x'], 'x.txt'));

    expect(formString(data, 'planId')).toBeNull();
  });
});

describe('formInt', () => {
  it('accepts an integer inside the range', () => {
    expect(formInt(form({ rating: '1' }), 'rating', 1, 5)).toBe(1);
    expect(formInt(form({ rating: '5' }), 'rating', 1, 5)).toBe(5);
  });

  it('rejects values outside the range rather than storing them', () => {
    // A rating of 0 or 900 silently poisons every average on the catalog — those are
    // computed on read from these rows, so there is no later validation to catch it.
    for (const rating of ['0', '6', '-3', '900']) {
      expect(formInt(form({ rating }), 'rating', 1, 5), rating).toBeNull();
    }
  });

  /**
   * The precise reason `Number.parseInt` is not used on its own: it reads "5abc" as 5
   * and "1e9" as 1, so a junk string arrives at the database looking like a valid rating.
   */
  it('refuses partially-numeric junk that parseInt would happily accept', () => {
    expect(Number.parseInt('5abc', 10)).toBe(5); // …which is the trap.
    expect(formInt(form({ rating: '5abc' }), 'rating', 1, 5)).toBeNull();
    expect(formInt(form({ rating: '1e9' }), 'rating', 1, 5)).toBeNull();
    expect(formInt(form({ rating: '3.7' }), 'rating', 1, 5)).toBeNull();
    expect(formInt(form({ rating: 'NaN' }), 'rating', 1, 5)).toBeNull();
    expect(formInt(form({ rating: '' }), 'rating', 1, 5)).toBeNull();
    expect(formInt(form({}), 'rating', 1, 5)).toBeNull();
  });
});
