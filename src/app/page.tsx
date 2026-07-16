import Link from 'next/link';
// `page` is aliased to `pageShell` — this module already has a local `const page`
// (the pagination page number) that would otherwise shadow the import.
import { page as pageShell, btnGhost, btnPrimary } from '@/lib/ui'; // Sprint 29
import { queryPlans, listCategories, listFilterableTools } from '@/lib/plans';
import { parseFilters, buildQueryString, hasActiveFilters } from '@/lib/filters';
import { parseSort, DEFAULT_SORT } from '@/lib/sort';
import { getRatingSummaries } from '@/lib/reviews';
import { getOwnedToolSlugs } from '@/lib/workshop';
import { getCurrentUser } from '@/lib/auth';
import { listSavedPlans } from '@/lib/saves';
import { paginationWindow } from '@/lib/pagination';
import { hasRateLimitNotice } from '@/lib/rate-limit-feedback';
import { PlanCard } from '@/components/plan-card';
import { RateLimitNotice } from '@/components/rate-limit-notice';
import { SearchBox } from '@/components/search-box';
import { CategoryNav } from '@/components/category-nav';
import { FilterPanel } from '@/components/filter-panel';
import { FilterChips } from '@/components/filter-chips';
import { SortSelect } from '@/components/sort-select';

/**
 * The catalog — browse (Sprint 3), keyword search (Sprint 4), and filters
 * (Sprint 5), on ONE page.
 *
 * One page, not three. `queryPlans()` with no query and no filters IS browse, so
 * there is a single code path. Separate /search and /filter routes would mean
 * three card grids and three paginations drifting apart, and would make the
 * combination — "walnut, under $150, tools I own" — awkward, when that
 * combination is precisely the product promise in BUSINESS_PLAN.md §9.
 *
 * Deliberately absent: save/like buttons (Sprints 6-7).
 */
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  // Categories and tools are needed both to RENDER the filter UI and to VALIDATE
  // the incoming filters — an unknown slug gets dropped rather than sent to
  // Postgres to match nothing.
  const [categories, tools, user] = await Promise.all([
    listCategories(),
    listFilterableTools(),
    getCurrentUser(),
  ]);

  const filters = parseFilters(params, {
    validCategorySlugs: categories.map((c) => c.slug),
    validToolSlugs: tools.map((t) => t.slug),
  });

  // Never trust the query string. Garbage degrades to page 1.
  const rawPage = Number.parseInt(
    typeof params.page === 'string' ? params.page : '1',
    10,
  );
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawQuery = typeof params.q === 'string' ? params.q : '';
  const sort = parseSort(params.sort);

  /**
   * Perf (2026-07-16): these three are INDEPENDENT once the filters are parsed,
   * so they run concurrently — they used to run as three serial awaits, which
   * added two full DB round-trips of latency to every signed-in catalog render.
   *
   * - `savedList`: the per-card bookmark overlay (save-toggle.tsx) needs to know
   *   which plans are already saved. Fetched once for the whole page, and `null`
   *   (not an empty Set) for an anonymous visitor, so PlanCard can tell "signed
   *   out" apart from "signed in, nothing saved". Gated on `user` because
   *   listSavedPlans requires a session.
   * - `ownedTools` (Sprint 25): ONLY pre-ticks the filter panel's boxes. It does
   *   NOT touch `filters` or `queryPlans` — results stay URL-driven so a shared
   *   link renders the same catalog for everyone.
   */
  const [
    { plans, total, totalPages, page: currentPage, query },
    savedList,
    ownedTools,
  ] = await Promise.all([
    queryPlans({ query: rawQuery, filters, sort, page }),
    user ? listSavedPlans() : null,
    user ? getOwnedToolSlugs() : ([] as string[]),
  ]);

  const savedIds = savedList
    ? new Set(savedList.map((saved) => saved.plan.id))
    : null;

  /**
   * Sprint 10. ONE groupBy for the whole page, scoped to the plans actually on it —
   * not one aggregate per card (N+1), and not "select every review row and average
   * it in JS" (O(total reviews): a plan with 800 reviews would ship 800 rows to
   * render one number).
   */
  const isSearching = query !== '';
  const isFiltering = hasActiveFilters(filters);
  const isNarrowed = isSearching || isFiltering;

  /**
   * The page's own URL, filters and all — where a rate-limited card action
   * bounces back to (via the returnTo input on each SaveToggle), and where
   * the notice banner's Dismiss goes. buildQueryString never includes the
   * notice param, so Dismiss is simply "this URL again".
   */
  const currentUrl = buildQueryString({
    query,
    filters,
    sort: sort === DEFAULT_SORT ? undefined : sort,
    page: currentPage > 1 ? currentPage : undefined,
  });

  /**
   * Sprint 10. ONE groupBy for the whole page — not one aggregate per card (N+1), and
   * not "select every review row and average it in JS" (O(total reviews): a plan with
   * 800 reviews would ship 800 rows to render one number).
   *
   * Sprint 19: just the plans on the page now. The recommended plans used to ride
   * along in this same query for the standalone "Recommended for you" row; that row is
   * retired — recommendations are a SORT of the catalog, so its plans ARE the page's
   * plans.
   */
  const ratings = await getRatingSummaries(plans.map((plan) => plan.id));

  return (
    // id="main" is the skip link's target (WCAG 2.4.1).
    // 2026-07-16 (Keagan): the catalog goes full-width on desktop — a browse
    // grid with its own auto-fill card columns reads better using the whole
    // window than centered in a 96rem cap with dead margins either side.
    <main id="main" className={`${pageShell} lg:max-w-none`}>
      <h1>Plans</h1>

      <RateLimitNotice
        show={hasRateLimitNotice(params.notice)}
        dismissHref={currentUrl}
      />

      {/* The install BANNER is gone (2026-07-16, Keagan) — install now lives in
          the profile dropdown and the mobile drawer, captured app-wide from the
          root layout. See src/lib/install-store.ts. */}

      {/*
        Sprint 19: the standalone "Recommended for you" section is GONE — deleted, not
        hidden. Recommendations are now a sort option (`?sort=recommended`), which is
        where people look for ordering, and one control beats two. `recommendations.tsx`
        is deleted with it: a component nobody renders is a component that rots.
      */}

      {/*
        Sprint 18 — the desktop catalog is a three-column grid: category rail,
        results, filter rail. It is ONE DOM in ONE order, placed by
        `grid-template-areas` at ≥64rem (see .catalog in globals.css) — not a
        desktop tree and a mobile tree.

        Which is why the source order below is exactly the mobile order it has
        always been (search → filters → sort → chips → results): on a phone the
        grid is not applied, the rail is display:none, and the page flows in DOM
        order, unchanged. Reordering the DOM to suit the desktop columns would
        have silently reordered the phone.
      */}
      {/* Sprint 30a: the desktop three-column grid moved to Tailwind. Below 64rem
          there is no grid (plain block, DOM order = mobile order); at lg the
          grid-template-areas place the rail/results/filter columns. */}
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)_18rem] lg:[grid-template-areas:'nav_search_filters'_'nav_results_filters'] lg:gap-x-[2.5rem] lg:gap-y-0 lg:items-start">
        {/* Desktop-only (hidden below 64rem): a second way to reach the category
            filter the panel's <select> already offers, not a second capability. */}
        <CategoryNav
          query={query}
          filters={filters}
          sort={sort === DEFAULT_SORT ? undefined : sort}
          categories={categories}
        />

        <div className="lg:[grid-area:search]">
          <SearchBox query={query} />
        </div>

        <aside
          className="lg:[grid-area:filters] lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
          aria-label="Filters"
        >
          <FilterPanel
            query={query}
            filters={filters}
            categories={categories}
            tools={tools}
            prefillTools={ownedTools}
          />
        </aside>

        <div className="lg:[grid-area:results] lg:min-w-0">
          <SortSelect sort={sort} query={query} filters={filters} />

          {/* Removable chips for each active filter — renders nothing when browsing
              unfiltered. Each chip is a GET link; see filter-chips.tsx. */}
          <FilterChips
            query={query}
            filters={filters}
            sort={sort === DEFAULT_SORT ? undefined : sort}
            categories={categories}
            tools={tools}
          />

          {/* Sprint 26 — one-tap "plans I can build". Shown to a signed-in user who has a
              workshop but isn't already filtering by tools. It's a plain GET link that
              expands the profile into ?tools= params — URL-driven and shareable, and it
              flows through the SAME queryPlans path as any tools filter (no second query).
              Preserves an active search/category/sort. */}
          {ownedTools.length > 0 && filters.ownedTools.length === 0 ? (
            <p className="build-it-cta">
              <Link
                href={buildQueryString({
                  query,
                  filters: { ...filters, ownedTools },
                  sort: sort === DEFAULT_SORT ? undefined : sort,
                })}
                className={btnPrimary}
              >
                🧰 Show plans I can build
              </Link>
            </p>
          ) : null}

          <p className="subtitle">
            {isNarrowed ? (
              <>
                {total} {total === 1 ? 'plan' : 'plans'}
                {isSearching && (
                  <>
                    {' '}
                    matching <strong>&ldquo;{query}&rdquo;</strong>
                  </>
                )}
                {isFiltering &&
                  (isSearching ? ' with your filters' : ' match your filters')}
                {' · '}
                <Link href="/">Clear all</Link>
              </>
            ) : (
              <>
                {total} {total === 1 ? 'plan' : 'plans'} &mdash; every one with a
                full cut list, material list, and cost estimate.
              </>
            )}
          </p>

          {plans.length === 0 ? (
            <p className="empty-state">
              {isNarrowed ? (
                <>
                  Nothing matched. Try loosening a filter &mdash; the{' '}
                  <strong>tools you own</strong> filter is the strictest one, since
                  it hides any plan needing a tool you didn&rsquo;t tick.
                </>
              ) : (
                <>
                  No plans yet. If you are seeing this on a fresh database, run{' '}
                  <code>npm run db:seed</code>.
                </>
              )}
            </p>
          ) : (
            <>
              {/*
                Heading order (WCAG 1.3.1 / 2.4.6): the cards render <h3> titles, and
                without this the page jumped h1 → h3. A screen-reader user navigating
                by heading would hear a level skipped and assume they had missed a
                section. Visually hidden — sighted users get the same information from
                the layout.
              */}
              <h2 className="visually-hidden">Results</h2>
              <ul className="plan-grid">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    rating={ratings.get(plan.id)}
                    saved={savedIds ? savedIds.has(plan.id) : undefined}
                    returnTo={currentUrl}
                  />
                ))}
              </ul>
            </>
          )}

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              {currentPage > 1 ? (
                <Link
                  href={buildQueryString({
                    query,
                    filters,
                    sort: sort === DEFAULT_SORT ? undefined : sort,
                    page: currentPage - 1,
                  })}
                  className={btnGhost}
                  rel="prev"
                >
                  &larr; Prev
                </Link>
              ) : (
                <span
                  className={`${btnGhost} pagination-disabled`}
                  aria-hidden="true"
                >
                  &larr; Prev
                </span>
              )}

              <span className="pagination-numbers">
                {paginationWindow(currentPage, totalPages).map((token, i) =>
                  token === '…' ? (
                    <span
                      key={`gap-${i}`}
                      className="pagination-gap"
                      aria-hidden="true"
                    >
                      &hellip;
                    </span>
                  ) : (
                    <Link
                      key={token}
                      href={buildQueryString({
                        query,
                        filters,
                        sort: sort === DEFAULT_SORT ? undefined : sort,
                        page: token,
                      })}
                      className={`pagination-number ${token === currentPage ? 'pagination-number-active' : ''}`}
                      aria-current={token === currentPage ? 'page' : undefined}
                    >
                      {token}
                    </Link>
                  ),
                )}
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={buildQueryString({
                    query,
                    filters,
                    sort: sort === DEFAULT_SORT ? undefined : sort,
                    page: currentPage + 1,
                  })}
                  className={btnGhost}
                  rel="next"
                >
                  Next &rarr;
                </Link>
              ) : (
                <span
                  className={`${btnGhost} pagination-disabled`}
                  aria-hidden="true"
                >
                  Next &rarr;
                </span>
              )}
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}
