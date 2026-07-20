import { describe, it, expect } from 'vitest';
import { softGetTarget } from '@/lib/use-soft-get-form';

/**
 * QOL-H — the soft-navigation URL builder.
 *
 * The hook itself (a `submit` listener + `router.push`) needs a DOM and a router, which
 * this repo's `node` vitest doesn't have — so the real logic worth proving, that the URL
 * a client push lands on is byte-for-byte the one a native GET submit would have built,
 * is extracted into `softGetTarget` and tested here. A drift between the two would
 * silently change what resorting/refiltering actually queries. `FormData`, `URL`, and
 * `URLSearchParams` are Node globals.
 */

function form(entries: Array<[string, string]>): FormData {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

const BASE = 'https://plans.example.com/plans/some-slug?leftover=1';

describe('softGetTarget', () => {
  it('returns just the action path when the form has no fields', () => {
    expect(softGetTarget('/', form([]), BASE)).toBe('/');
  });

  it('serialises fields as a query string on the action path', () => {
    expect(
      softGetTarget(
        '/',
        form([
          ['sort', 'trending'],
          ['category', 'outdoor'],
        ]),
        BASE,
      ),
    ).toBe('/?sort=trending&category=outdoor');
  });

  it('drops empty-string values (an unselected select is not a filter)', () => {
    const target = softGetTarget(
      '/',
      form([
        ['category', ''],
        ['difficulty', '1'],
        ['time', ''],
        ['perPage', '48'],
      ]),
      BASE,
    );
    expect(target).toBe('/?difficulty=1&perPage=48');
  });

  it('preserves repeated fields (multi-value filters survive)', () => {
    expect(
      softGetTarget(
        '/',
        form([
          ['sort', 'newest'],
          ['difficulty', '2'],
          ['difficulty', '3'],
          ['tools', 'table-saw'],
        ]),
        BASE,
      ),
    ).toBe('/?sort=newest&difficulty=2&difficulty=3&tools=table-saw');
  });

  it('drops the query the action itself carried — native GET replaces, not merges', () => {
    // The action is "/", so the base URL's own ?leftover=1 must NOT leak through.
    expect(softGetTarget('/', form([['sort', 'trending']]), BASE)).toBe('/?sort=trending');
  });

  it('resolves a non-root action against the current location', () => {
    expect(softGetTarget('/browse', form([['sort', 'trending']]), BASE)).toBe(
      '/browse?sort=trending',
    );
  });

  it('treats a missing action as the current path', () => {
    // getAttribute('action') === null → resolve '' against BASE → BASE's pathname.
    expect(softGetTarget(null, form([['sort', 'trending']]), BASE)).toBe(
      '/plans/some-slug?sort=trending',
    );
  });
});
