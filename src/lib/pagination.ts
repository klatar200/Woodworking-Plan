/**
 * Windowed page-number list for the catalog's numbered pagination
 * (mockup: `[← Prev] [1] [2] [3] [Next →]`, current page filled).
 *
 * Pure function, no framework/DB dependency — a page count and a current page
 * go in, a list of page numbers and `'…'` gaps come out. Kept out of
 * src/app/page.tsx so it's unit-testable on its own, same as src/lib/filters.ts
 * and src/lib/sort.ts.
 *
 * Always includes page 1 and the last page, plus up to `siblings` pages on
 * each side of the current page, collapsing any gap into a single `'…'` —
 * never a run of skipped numbers, and never more than one `'…'` per side.
 */
export type PageToken = number | '…';

export function paginationWindow(
  currentPage: number,
  totalPages: number,
  siblings = 1,
): PageToken[] {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([1, totalPages]);
  for (let p = currentPage - siblings; p <= currentPage + siblings; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const tokens: PageToken[] = [];
  let previous: number | null = null;

  for (const current of sorted) {
    if (previous !== null) {
      const gap = current - previous;
      // Exactly one hidden page: show it — "…" for a single missing number is
      // the same width as the number and strictly less informative.
      if (gap === 2) tokens.push(previous + 1);
      else if (gap > 2) tokens.push('…');
    }
    tokens.push(current);
    previous = current;
  }

  return tokens;
}
