import Link from 'next/link';
import { queryPlans, listCategories, listFilterableTools } from '@/lib/plans';
import { parseFilters, buildQueryString, hasActiveFilters } from '@/lib/filters';
import { parseSort, DEFAULT_SORT } from '@/lib/sort';
import { getRatingSummaries } from '@/lib/reviews';
import { getRecommendations } from '@/lib/recommendations';
import { PlanCard } from '@/components/plan-card';
import { Recommendations } from '@/components/recommendations';
import { SearchBox } from '@/components/search-box';
import { FilterPanel } from '@/components/filter-panel';
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
  const [categories, tools] = await Promise.all([
    listCategories(),
    listFilterableTools(),
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

      {/* Renders NOTHING for an anonymous visitor or a user with no saves/likes —
          not an empty shell, and deliberately not a fallback row of popular plans
          under a personalized heading. See src/components/recommendations.tsx. */}
      <Recommendations recommendations={recommendations} ratings={ratings} />

      <SearchBox query={query} />

      <FilterPanel
        query={query}
        filters={filters}
        categories={categories}
        tools={tools}
      />

      <SortSelect sort={sort} query={query} filters={filters} />

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
              <PlanCard key={plan.id} plan={plan} rating={ratings.get(plan.id)} />
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
              &larr; Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="pagination-status">
            Page {currentPage} of {totalPages}
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
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
