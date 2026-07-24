/**
 * Catalog page-size — QOL-I item 4; Sprint 48 raised the default.
 *
 * How many cards per page, chosen by the user via a `?perPage=` query param. Kept in its
 * own module (like `sort.ts`) so the allowlist and the untrusted-input clamp live in one
 * place, and so `buildQueryString` can stay free of the values.
 *
 * A FIXED ALLOWLIST, not a free number. `?perPage=100000` is an easy way to ask the
 * server to build a 100k-card page; the clamp below makes that impossible by
 * construction — anything not in the list degrades SILENTLY to the default, the same
 * doctrine as every other catalog param (`parseFilters`, `parseSort`, the `page` clamp).
 *
 * The values are multiples of 12 (24 / 48 / 96), which lands on whole rows across the
 * catalog's 3/4/5-column responsive grid at every breakpoint without a ragged last row
 * on the common widths. 12 was removed in Sprint 48 — too small once the catalog grew
 * past a few hundred plans; weak-wifi visitors still get a modest 24 by default.
 */
export const PAGE_SIZES = [24, 48, 96] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

/** The default — modest on purpose (phones, weak workshop wifi); Sprint 48: was 12. */
export const DEFAULT_PAGE_SIZE: PageSize = 24;

/**
 * Parses an untrusted `?perPage=` value, hard-clamped to {@link PAGE_SIZES}.
 *
 * `Number()`, not `parseInt` — `parseInt("48; DROP…")` would read `48`, and while the
 * allowlist check would still catch a value that isn't exactly one of ours, refusing the
 * lenient parse outright is one less thing to reason about. Anything else → the default.
 */
export function parsePageSize(raw: string | string[] | undefined): PageSize {
  const value = typeof raw === 'string' ? Number(raw) : Number.NaN;
  return (PAGE_SIZES as readonly number[]).includes(value)
    ? (value as PageSize)
    : DEFAULT_PAGE_SIZE;
}
