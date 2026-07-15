import Link from 'next/link';
import { page } from '@/lib/ui'; // Sprint 29: page-shell utilities (retains `page` class)
import type { Metadata } from 'next';
import { listPaths } from '@/lib/paths';

/**
 * Learning paths index — Sprint 16.
 *
 * PUBLIC (added to the allowlist in src/lib/public-routes.ts, deliberately): a path is
 * curated catalog content, and BUSINESS_PLAN.md §12 gates participation, not content.
 * Someone deciding whether this site is worth signing up for should be able to see that
 * it knows what order to teach things in.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Learning paths',
  description: 'Ordered sequences of plans that teach a skill, one project at a time.',
  robots: { index: false, follow: false },
};

export default async function PathsPage() {
  const paths = await listPaths();

  return (
    <main id="main" className={page}>
      <h1>Learning paths</h1>
      <p className="subtitle">
        Ordered sequences, not collections. Each project is chosen to teach the thing the
        next one assumes you already know.
      </p>

      {paths.length === 0 ? (
        <p className="muted">No paths yet.</p>
      ) : (
        <ul className="path-list">
          {paths.map((path) => (
            <li key={path.id} className="path-card">
              <Link href={`/paths/${path.slug}`} className="path-card-link">
                <h2>{path.title}</h2>
                <p className="path-card-summary">{path.summary}</p>
                <p className="muted small">
                  {path._count.steps} {path._count.steps === 1 ? 'project' : 'projects'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
