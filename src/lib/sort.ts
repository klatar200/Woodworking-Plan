/**
 * Catalog sort options — Sprint 7.
 *
 * Kept separate from filters so the sort can be validated and round-tripped the
 * same way, and so `queryPlans` has one obvious place to look.
 */

export const SORT_OPTIONS = [
  { value: 'popular', label: 'Most liked' },
  { value: 'newest', label: 'Newest' },
  { value: 'easiest', label: 'Easiest first' },
  { value: 'cheapest', label: 'Cheapest first' },
  { value: 'quickest', label: 'Quickest first' },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

/**
 * The default sort.
 *
 * NOT 'popular'. On a young catalog every plan has zero likes, so a Popular sort
 * degenerates into an arbitrary tiebreak — and worse, whatever it happens to
 * surface first accumulates the likes, which entrenches an accident as the
 * ranking. Difficulty-ascending is a defensible default: a beginner landing on
 * the catalog sees things they can actually build.
 *
 * Popular is one click away, which is what BUSINESS_PLAN.md §4.7 asks for.
 */
export const DEFAULT_SORT: SortOption = 'easiest';

/**
 * Parses an untrusted `?sort=` value.
 *
 * Anything unrecognized falls back to the default — a stale bookmark or a
 * hand-edited URL must not 500.
 */
export function parseSort(raw: string | string[] | undefined): SortOption {
  const value = typeof raw === 'string' ? raw : '';
  return SORT_OPTIONS.some((o) => o.value === value)
    ? (value as SortOption)
    : DEFAULT_SORT;
}
