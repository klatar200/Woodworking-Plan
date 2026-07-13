import Link from 'next/link';
import { listPlans } from '@/lib/plans';
import { PlanCard } from '@/components/plan-card';

/**
 * The catalog — Sprint 3's "catalog listing" deliverable.
 *
 * This REPLACES the Sprint 0 status page, which was scaffolding and has served
 * its purpose. `/api/health` remains for uptime checks.
 *
 * Deliberately absent, and not by oversight:
 *   - a search box     → Sprint 4
 *   - filter controls  → Sprint 5
 *   - save/like buttons → Sprints 6-7
 * Stubbing them out now would mean designing them before their sprints, which is
 * how you get UI that has to be rebuilt.
 */
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ page?: string }>;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  // Never trust the query string. A non-numeric, negative, or absurd `page` must
  // degrade to page 1, not throw or hand a garbage `skip` to Postgres.
  const requested = Number.parseInt(params.page ?? '1', 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  const { plans, total, totalPages, page: currentPage } = await listPlans({ page });

  return (
    <main className="page page-wide">
      <h1>Plans</h1>
      <p className="subtitle">
        {total} {total === 1 ? 'plan' : 'plans'} — every one with a full cut list,
        material list, and cost estimate.
      </p>

      {plans.length === 0 ? (
        <p className="empty-state">
          No plans yet. If you are seeing this on a fresh database, run{' '}
          <code>npm run db:seed</code>.
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
            <Link
              href={currentPage === 2 ? '/' : `/?page=${currentPage - 1}`}
              className="btn btn-ghost"
              rel="prev"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="pagination-status" aria-current="page">
            Page {currentPage} of {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link href={`/?page=${currentPage + 1}`} className="btn btn-ghost" rel="next">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
