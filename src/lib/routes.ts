/**
 * Shared route destinations — QOL-J.
 *
 * The catalog is reachable from many places (the header search, the brand logo, the
 * category menu, the filter/sort/search forms). Rather than hardcode its path at each
 * site, name it ONCE here so a later move is a one-line change, not a codebase-wide grep.
 *
 * QOL-M (Step 1, 2026-07-20): the catalog now lives at `/browse`; `/` is the marketing
 * landing page. This constant is the single source everything catalog-bound routes through
 * — the forms, the header search, the category links, and `buildQueryString`'s base — so
 * the move was (mostly) this one line plus the one-off content links.
 */
export const CATALOG_PATH = '/browse';
