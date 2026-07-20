import Link from 'next/link';
import { page, btnPrimary, btnGhost, selectControl } from '@/lib/ui';
import type { Metadata } from 'next';
import { listPaths, parsePathFilters, buildPathQueryString } from '@/lib/paths';
import { listCategories } from '@/lib/plans';
import { difficultyLabel } from '@/lib/format';
import { DIFFICULTIES } from '@/lib/filters';

/**
 * Learning index — Sprint 16, retitled and given a taxonomy in QOL-E.
 *
 * PUBLIC (added to the allowlist in src/lib/public-routes.ts, deliberately): a path is
 * curated catalog content, and BUSINESS_PLAN.md §12 gates participation, not content.
 * Someone deciding whether this site is worth signing up for should be able to see that
 * it knows what order to teach things in.
 *
 * QOL-E — "Paths" is now called "Learning" in the nav and headings, but **the URL stays
 * `/paths`**. Renaming the route would mean rewriting `src/lib/offline-urls.ts` (every
 * saved library's download list), invalidating the service-worker caches already holding
 * those URLs, and breaking any link anyone has followed — for a display-name change.
 *
 * FILTERING IS URL-DRIVEN, exactly like the catalog: a plain GET form, no client state,
 * no JavaScript. A filtered view is shareable and survives the back button, and the
 * server-rendered document is the whole feature rather than an enhancement over it.
 *
 * GROUPING: results are grouped by experience level, because "where do I start" is the
 * question this page exists to answer and a flat list of five equally-weighted cards
 * does not answer it. Untagged paths (`experienceLevel: null`) get their own group at
 * the end — see the schema note: a migration creates a column, the seed populates it, so
 * in the window between deploy and seed every path is untagged and the page says so
 * rather than pretending they are all for beginners.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Learning',
  description: 'Ordered sequences of plans that teach a skill, one project at a time.',
  robots: { index: false, follow: false },
};

const UNRATED = 'unrated';

export default async function PathsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, categories] = await Promise.all([searchParams, listCategories()]);

  const filters = parsePathFilters(
    params,
    categories.map((c) => c.slug),
  );
  const paths = await listPaths(filters);
  const isFiltering = filters.level !== undefined || filters.category !== undefined;

  /**
   * Group by level, highest-numbered group last. `sortOrder` (the authored order) is
   * preserved inside each group because `listPaths` already returns them that way and
   * this only buckets — it never re-sorts within a bucket.
   */
  const groups = new Map<number | typeof UNRATED, typeof paths>();
  for (const path of paths) {
    const key = path.experienceLevel ?? UNRATED;
    const list = groups.get(key) ?? [];
    list.push(path);
    groups.set(key, list);
  }
  const orderedGroups = [...groups.entries()].sort((a, b) => {
    if (a[0] === UNRATED) return 1;
    if (b[0] === UNRATED) return -1;
    return a[0] - b[0];
  });

  return (
    <main id="main" className={`${page} page-wide`}>
      <h1>Learning</h1>
      <p className="subtitle">
        Ordered sequences, not collections. Each project is chosen to teach the thing the
        next one assumes you already know.
      </p>

      {/* A plain GET form. `sort-form` is not reused here — this is a filter, and the
          print stylesheet has no reason to hide a page nobody prints. */}
      <form
        method="get"
        action="/paths"
        className="flex flex-wrap items-end gap-[0.75rem] my-[1.5rem]"
      >
        <div className="flex flex-col gap-[0.25rem]">
          <label
            htmlFor="level"
            className="text-[0.75rem] uppercase tracking-[0.06em] text-muted"
          >
            Experience
          </label>
          <select
            id="level"
            name="level"
            defaultValue={filters.level ?? ''}
            className={selectControl}
          >
            <option value="">Any level</option>
            {/* The SAME 1–5 vocabulary as every plan card and the catalog filter
                (DECISIONS_LOG.md 2026-07-19) — one set of labels, one meaning. */}
            {DIFFICULTIES.map((level) => (
              <option key={level} value={level}>
                {difficultyLabel(level)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-[0.25rem]">
          <label
            htmlFor="path-category"
            className="text-[0.75rem] uppercase tracking-[0.06em] text-muted"
          >
            Category
          </label>
          <select
            id="path-category"
            name="category"
            defaultValue={filters.category ?? ''}
            className={selectControl}
          >
            <option value="">Any category</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className={btnPrimary}>
          Apply
        </button>
        {/* A link, not a reset button: reset restores the last SUBMITTED state, which is
            a different thing and a confusing one. Same call as the catalog's. */}
        {isFiltering ? (
          <Link href="/paths" className={btnGhost}>
            Clear
          </Link>
        ) : null}
      </form>

      {paths.length === 0 ? (
        <p className="empty-state">
          {isFiltering ? (
            <>
              No learning paths match that yet.{' '}
              <Link href={buildPathQueryString({})}>Show all paths</Link> &mdash; there are
              only a handful so far, and a path that spans several categories is filed
              under none of them.
            </>
          ) : (
            <>
              No paths yet. If you are seeing this on a fresh database, run{' '}
              <code>npm run db:seed</code>.
            </>
          )}
        </p>
      ) : (
        orderedGroups.map(([level, groupPaths]) => (
          <section key={String(level)}>
            <h2>
              {level === UNRATED ? 'Not yet rated' : difficultyLabel(level)}
            </h2>
            <ul className="path-list">
              {groupPaths.map((path) => (
                <li key={path.id} className="path-card">
                  <Link href={`/paths/${path.slug}`} className="path-card-link">
                    <h3>{path.title}</h3>
                    <p className="path-card-summary">{path.summary}</p>
                    <p className="muted small">
                      {/* "Spans several categories" is an authored value, not a gap —
                          see the schema. Saying "Mixed" is more useful than saying
                          nothing, and more honest than picking a majority category. */}
                      {path.category ? path.category.name : 'Mixed categories'}
                      {' · '}
                      {path._count.steps}{' '}
                      {path._count.steps === 1 ? 'project' : 'projects'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
