import Link from 'next/link';
import { queryPlans, listCategories, listFilterableTools } from '@/lib/plans';
import { parseFilters, buildQueryString, hasActiveFilters } from '@/lib/filters';
import { parseSort, DEFAULT_SORT } from '@/lib/sort';
import { getRatingSummaries } from '@/lib/reviews';
import { getRecommendations } from '@/lib/recommendations';
import { getCurrentUser } from '@/lib/auth';
import { listSavedPlans } from '@/lib/saves';
import { paginationWindow } from '@/lib/pagination';
import { hasRateLimitNotice } from '@/lib/rate-limit-feedback';
import { PlanCard } from '@/components/plan-card';
import { InstallPrompt } from '@/components/install-prompt';
import { RateLimitNotice } from '@/components/rate-limit-notice';
import { Recommendations } from '@/components/recommendations';
import { SearchBox } from '@/components/search-box';
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

  /**
   * The catalog's per-card bookmark overlay (see save-toggle.tsx) needs to know
   * which plans are ALREADY saved. Fetched once for the whole page, not once per
   * card — and `null` (not an empty Set) for an anonymous visitor, so PlanCard
   * can tell "signed out" apart from "signed in, nothing saved" and render no
   * overlay at all in the former case.
   */
  const savedIds = user
    ? new Set((await listSavedPlans()).map((saved) => saved.plan.id))
    : null;

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

  const { plans, total, totalPages, page: currentPage, query } = await queryPlans({
    query: rawQuery,
    filters,
    sort,
    page,
  });

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
   * Sprint 11 — recommendations.
   *
   * Only on the UNNARROWED first page. Someone who has typed a query or set a filter
   * has told us exactly what they want RIGHT NOW; a "Recommended for you" row above
   * their results is us talking over them. Same on page 4 of a paginated browse —
   * they are deep in a task, not looking for suggestions.
   *
   * Returns [] for anonymous visitors and for users with no saves or likes, so this
   * costs one cheap query and renders nothing in the common cold case.
   */
  const recommendations =
    !isNarrowed && page === 1 ? await getRecommendations() : [];

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
   * Covers the recommended plans too, in the SAME query. Two groupBys would be two
   * round-trips for one page.
   */
  const ratings = await getRatingSummaries([
    ...plans.map((plan) => plan.id),
    ...recommendations.map(({ plan }) => plan.id),
  ]);

  return (
    // id="main" is the skip link's target (WCAG 2.4.1).
    <main id="main" className="page page-wide">
      <h1>Plans</h1>

      <RateLimitNotice
        show={hasRateLimitNotice(params.notice)}
        dismissHref={currentUrl}
      />

      <InstallPrompt />

      {/* Renders NOTHING for an anonymous visitor or a user with no saves/likes —
          not an empty shell, and deliberately not a fallback row of popular plans
          under a personalized heading. See src/components/recommendations.tsx. */}
      <Recommendations
        recommendations={recommendations}
        ratings={ratings}
        savedIds={savedIds}
      />

      <SearchBox query={query} />

      <FilterPanel
        query={query}
        filters={filters}
        categories={categories}
        tools={tools}
      />

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
            {isFiltering && (isSearching ? ' with your filters' : ' match your filters')}
            {' · '}
            <Link href="/">Clear all</Link>
          </>
        ) : (
          <>
            {total} {total === 1 ? 'plan' : 'plans'} &mdash; every one with a full
            cut list, material list, and cost estimate.
          </>
        )}
      </p>

      {plans.length === 0 ? (
        <p className="empty-state">
          {isNarrowed ? (
            <>
              Nothing matched. Try loosening a filter &mdash; the{' '}
              <strong>tools you own</strong> filter is the strictest one, since it
              hides any plan needing a tool you didn&rsquo;t tick.
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
              className="btn btn-ghost"
              rel="prev"
            >
              &larr; Prev
            </Link>
          ) : (
            <span className="btn btn-ghost pagination-disabled" aria-hidden="true">
              &larr; Prev
            </span>
          )}

          <span className="pagination-numbers">
            {paginationWindow(currentPage, totalPages).map((token, i) =>
              token === '…' ? (
                <span key={`gap-${i}`} className="pagination-gap" aria-hidden="true">
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
              className="btn btn-ghost"
              rel="next"
            >
              Next &rarr;
            </Link>
          ) : (
            <span className="btn btn-ghost pagination-disabled" aria-hidden="true">
              Next &rarr;
            </span>
          )}
        </nav>
      )}
    </main>
  );
}
