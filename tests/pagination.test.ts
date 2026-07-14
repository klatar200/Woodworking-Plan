import { describe, it, expect } from 'vitest';
import { paginationWindow } from '@/lib/pagination';

describe('paginationWindow', () => {
  it('returns just page 1 when there is only one page', () => {
    expect(paginationWindow(1, 1)).toEqual([1]);
  });

  it('shows every page when the total is small', () => {
    expect(paginationWindow(1, 4)).toEqual([1, 2, 3, 4]);
    expect(paginationWindow(3, 4)).toEqual([1, 2, 3, 4]);
  });

  it('always includes page 1 and the last page', () => {
    const window = paginationWindow(10, 20);
    expect(window[0]).toBe(1);
    expect(window[window.length - 1]).toBe(20);
  });

  it('collapses a gap into a single … token, never a run of skipped numbers', () => {
    // current=10 of 20, siblings=1 → {1, 9, 10, 11, 20}, with one gap on each side.
    expect(paginationWindow(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
  });

  it('does not duplicate a gap token when the window touches an edge', () => {
    // current=2 of 20 → {1, 2, 3} touches page 1 directly, so no leading gap.
    expect(paginationWindow(2, 20)).toEqual([1, 2, 3, '…', 20]);
    // current=19 of 20 → {18, 19, 20} touches the last page directly.
    expect(paginationWindow(19, 20)).toEqual([1, '…', 18, 19, 20]);
  });

  it('never returns the same page number twice even when the window overlaps 1 or totalPages', () => {
    for (const [current, total] of [
      [1, 5],
      [5, 5],
      [1, 1],
      [2, 2],
    ] as const) {
      const window = paginationWindow(current, total);
      const numbers = window.filter((t): t is number => t !== '…');
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });

  it('respects a wider sibling count', () => {
    expect(paginationWindow(10, 20, 2)).toEqual([1, '…', 8, 9, 10, 11, 12, '…', 20]);
  });
});
