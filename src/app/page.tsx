import Link from 'next/link';
import { searchPlans } from '@/lib/plans';
import { PlanCard } from '@/components/plan-card';
import { SearchBox } from '@/components/search-box';

/**
 * The catalog — browse (Sprint 3) and keyword search (Sprint 4) on one page.
 *
 * One page, not two. A separate /search route would mean two layouts, two card
 * grids, and two pagination implementations that drift apart. `searchPlans()`
 * with an empty query IS browse, so the page has a single code path.
 *
 * Deliberately absent: filter controls (Sprint 5), save/like buttons (6-7).
 */
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  // Never trust the query string. Garbage degrades to page 1 rather than handing
  // Postgres a negative OFFSET.
  const requested = Number.parseInt(params.page ?? '1', 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  const rawQuery = typeof params.q === 'string' ? params.q : '';

  const { plans, total, totalPages, page: currentPage, query } = await searchPlans({
    query: rawQuery,
    page,
  });

  const isSearching = query !== '';

  /** Preserves the active search across page links. */
  const hrefFor = (targetPage: number) => {
    const search = new URLSearchParams();
    if (isSearching) search.set('q', query);
    if (targetPage > 1) search.set('page', String(targetPage));
    const qs = search.toString();
    return qs ? `/?${qs}` : '/';
  };

  return (
    <main className="page page-wide">
      <h1>Plans</h1>

      <SearchBox query={query} />

      <p className="subtitle">
        {isSearching ? (
          <>
            {total} {total === 1 ? 'result' : 'results'} for{' '}
            <strong>&ldquo;{query}&rdquo;</strong>
            {' · '}
            <Link href="/">Clear</Link>
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
          {isSearching ? (
            <>
              Nothing matched <strong>&ldquo;{query}&rdquo;</strong>. Try a
              broader term — a tool (&ldquo;router&rdquo;), a wood
              (&ldquo;walnut&rdquo;), or a project (&ldquo;shelf&rdquo;).
            </>
          ) : (
            <>
              No plans yet. If you are seeing this on a fresh database, run{' '}
              <code>npm run db:seed</code>.
            </>
          )}
        </p>
      ) : (
        <ul className="plan-grid">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          {currentPage > 1 ? (
            <Link href={hrefFor(currentPage - 1)} className="btn btn-ghost" rel="prev">
              &larr; Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="pagination-status">
            Page {currentPage} of {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link href={hrefFor(currentPage + 1)} className="btn btn-ghost" rel="next">
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
