import categories from '../../content/categories.json';

/**
 * The category list for SITE-WIDE navigation — QOL-D (2026-07-19).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT A DATABASE QUERY, and why that is the important part.
 *
 * The Browse menu and the footer live in the SiteHeader/SiteFooter, which the root
 * layout renders on EVERY page. A `listCategories()` call there would mean:
 *
 *   1. A Postgres round-trip on every request to every route — `/about`, `/faq`,
 *      `/sign-in`, the offline page — none of which have anything to do with the
 *      catalog. The catalog already fetches categories for its rail and filters;
 *      this would be a second, unrelated read on pages that need none.
 *   2. The database becoming a hard dependency of the SHELL. Today a database
 *      outage breaks the catalog and the plan pages; it must not also break the
 *      404 page, the FAQ and the offline fallback.
 *   3. A build-time trap: `next build` statically prerenders `/_not-found`, which
 *      renders the root layout. A Prisma call in that path needs a reachable
 *      database at BUILD time — the same class of failure that kept CI red for ten
 *      commits when `/_not-found` started needing a Clerk key.
 *
 * `content/categories.json` is the SEED'S OWN SOURCE OF TRUTH: the seed is the only
 * writer of the `Category` table, so this file cannot be "stale" relative to the
 * database in any direction that matters — a category that exists in one and not the
 * other would be a seeding failure, not a drift in this module. Importing it is a
 * build-time constant: no query, no I/O, no failure mode.
 *
 * And if a slug here ever did go stale, it degrades safely: `parseFilters` validates
 * `?category=` against the real category slugs and silently drops an unknown one, so
 * the worst case is a link that lands on the unfiltered catalog.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Sorted by `sortOrder` then name — the same ordering `listCategories()` uses, so the
 * nav menu and the catalog rail list the categories in the same sequence.
 */
export interface NavCategory {
  slug: string;
  name: string;
}

export const NAV_CATEGORIES: NavCategory[] = [...categories]
  .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  .map(({ slug, name }) => ({ slug, name }));
