/**
 * Catalog sort options — Sprint 7, rebuilt in Sprint 19.
 *
 * Kept separate from filters so the sort can be validated and round-tripped the
 * same way, and so `queryPlans` has one obvious place to look.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPRINT 19 — WHAT CHANGED AND WHY (Keagan's call, BUILD_PLAN.md §4.1.1)
 *
 * GONE: 'easiest', 'cheapest', 'quickest'. Those three are FILTERS wearing a sort's
 * clothes — the filter panel already answers "beginner", "under $$", "an afternoon"
 * precisely, and it answers them better, because a filter REMOVES what you can't use
 * while a sort merely buries it on page 3. Two controls for one job, one of them
 * worse.
 *
 * NEW: 'trending' (7-day views), 'viewed' (all-time views), and 'recommended'.
 *
 * 'recommended' as a SORT reverses two earlier decisions, both deliberately and both
 * at Keagan's explicit direction, not by re-litigation here:
 *   1. The standalone "Recommended for you" section is retired — one control, in the
 *      place people look for ordering.
 *   2. Sprint 11's "never fall back to popular plans" rule stands where it was aimed:
 *      a *heading* that promises personalization and delivers a generic list is a lie.
 *      A SORT that ranks personalized plans first and orders the rest of the full
 *      catalog by trending is not that — nothing is hidden, nothing is claimed, and
 *      the catalog is all there either way. See src/lib/plans.ts.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'recommended', label: 'Recommended for you' },
  { value: 'viewed', label: 'Most viewed' },
  { value: 'popular', label: 'Most liked' },
  { value: 'newest', label: 'Newest' },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

/**
 * The default sort — 'trending' (Sprint 19; Keagan's call).
 *
 * BE HONEST ABOUT THE COLD START: the `PlanView` table ships EMPTY, so for a while
 * every plan has zero views and Trending is decided entirely by its tiebreak —
 * newest first, then title (src/lib/views.ts). That is a real property of this
 * default, not a bug, and it is why the tiebreak was chosen to be something a person
 * would defend on its own ("the newest plans") rather than an arbitrary id order.
 *
 * The Sprint 7 objection to defaulting to 'popular' — that a zero-signal ranking
 * entrenches whatever it happens to surface, because that is what then gets the likes
 * — applies to views too, and is worth stating rather than quietly inheriting. The
 * difference is that the feedback loop is *bounded* here: the tiebreak keeps rotating
 * as new plans are published, and view counts move far faster than like counts, so a
 * cold accident does not become permanent.
 */
export const DEFAULT_SORT: SortOption = 'trending';

/**
 * Parses an untrusted `?sort=` value.
 *
 * Anything unrecognized falls back to the default — a stale bookmark or a
 * hand-edited URL must not 500. That now includes the three sorts Sprint 19 REMOVED
 * (`?sort=cheapest`), which is exactly the case this function exists for: a link
 * someone shared last month still works, it just lands on the default.
 */
export function parseSort(raw: string | string[] | undefined): SortOption {
  const value = typeof raw === 'string' ? raw : '';
  return SORT_OPTIONS.some((o) => o.value === value)
    ? (value as SortOption)
    : DEFAULT_SORT;
}

/**
 * Sorts whose order comes from an id list computed OUTSIDE Postgres' ORDER BY —
 * view counts in a window, or a per-user recommendation score. `queryPlans` routes
 * these through the same intersect-and-paginate path the keyword search uses.
 *
 * Exported so the routing lives in one place: a new sort added to SORT_OPTIONS and
 * forgotten here would silently fall through to the Prisma `orderBy` switch and sort
 * by *nothing in particular*, which looks like it works.
 */
export const ID_ORDERED_SORTS = ['trending', 'viewed', 'recommended'] as const;

export function isIdOrderedSort(sort: SortOption): boolean {
  return (ID_ORDERED_SORTS as readonly string[]).includes(sort);
}
