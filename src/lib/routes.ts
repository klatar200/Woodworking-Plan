/**
 * Shared route destinations — QOL-J.
 *
 * The catalog is reachable from many places (the header search, the brand logo, the
 * category menu, the filter/sort/search forms). Rather than hardcode its path at each
 * site, name it ONCE here so a later move is a one-line change, not a codebase-wide grep.
 *
 * Today the catalog IS the site root. QOL-M will move it to `/browse` and turn `/` into a
 * marketing landing page — at which point this constant is the single line that changes,
 * and everything routing through it follows. (QOL-M still has its own inventory of
 * literal `href="/"` sites to reconcile; this constant is what keeps the *forms* and the
 * header search from being three more of them.)
 */
export const CATALOG_PATH = '/';
