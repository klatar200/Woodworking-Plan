import Link from 'next/link';
import { page, btnGhost, categoryLabel } from '@/lib/ui'; // Sprint 29: page-shell + button + category
import Image from 'next/image';
import { listMyBuilds } from '@/lib/builds';
import { StarRating } from '@/components/star-rating';

/**
 * "My builds" — the user's build log (Sprint 27). BUSINESS_PLAN.md §10 (Phase 4,
 * build logs — deliberately cut down: no forums, no comments, no user-to-user surface).
 *
 * SECURITY: this route is private by default — it is NOT on the allowlist in
 * src/lib/public-routes.ts, and that allowlist fails closed. Beyond the middleware,
 * `listMyBuilds()` derives the owner from the verified session and takes no `userId`, so
 * even a mis-edited matcher cannot render one user's builds to another. There is no
 * `/builds/[userId]` route, and there must never be one — a build log is a per-person
 * timeline, unlike the per-plan review list which is public content.
 *
 * DERIVED, NOT STORED: every row here is a `Review` (Sprint 10). Reviewed ⇒ built (the
 * Sprint 16 rule). No new table, nothing to backfill. See src/lib/builds.ts.
 */
export const dynamic = 'force-dynamic';

export default async function BuildsPage() {
  const builds = await listMyBuilds();

  return (
    <main id="main" className={`${page} page-wide`}>
      <h1>Your builds</h1>
      <p className="subtitle">
        Every plan you&rsquo;ve reviewed, newest first. Reviewing a plan adds it here.
      </p>

      {builds.length === 0 ? (
        <p className="empty-state">
          You haven&rsquo;t logged a build yet. <Link href="/browse">Browse the plans</Link>,
          make something, then leave a review with your photos &mdash; it&rsquo;ll show up
          here.
        </p>
      ) : (
        <>
          <p className="muted">
            {builds.length} {builds.length === 1 ? 'build' : 'builds'} logged.
          </p>

          <ul className="list-none p-0 mt-[1.5rem] mx-0 mb-0 flex flex-col gap-[1rem]">
            {builds.map((build) => (
              <li
                key={build.id}
                className="bg-surface px-[1.25rem] py-[1rem] border border-border rounded-[0.5rem]"
              >
                <div className="flex flex-wrap justify-between items-baseline gap-[0.5rem]">
                  <div>
                    <span className={categoryLabel}>{build.plan.category.name}</span>
                    <h2 className="build-log-title">
                      <Link href={`/plans/${build.plan.slug}`}>{build.plan.title}</Link>
                    </h2>
                  </div>
                  <time
                    dateTime={build.createdAt.toISOString()}
                    className="muted text-[0.9rem] whitespace-nowrap"
                  >
                    Built{' '}
                    {build.createdAt.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </div>

                {/* Your own star rating for this build. `count={1}` — it's a single
                    person's rating, not an aggregate; StarRating renders the value. */}
                <p className="mt-[0.5rem] mx-0 mb-0">
                  <StarRating average={build.rating} count={1} />
                </p>

                {build.body ? (
                  <p className="my-[0.5rem] mx-0 [overflow-wrap:anywhere]">{build.body}</p>
                ) : null}

                {build.photos.length > 0 ? (
                  <ul className="list-none p-0 mt-[0.75rem] mx-0 mb-0 flex flex-wrap gap-[0.5rem]">
                    {build.photos.map((photo) => (
                      <li key={photo.id} className="flex flex-col gap-[0.25rem]">
                        {/* next/image needs the blob host allowlisted in next.config.ts
                            AND in the CSP img-src — the same two gates the reviews
                            section already relies on. */}
                        <Image
                          src={photo.url}
                          alt={photo.alt}
                          width={photo.width}
                          height={photo.height}
                          sizes="(max-width: 640px) 50vw, 240px"
                          className="w-auto h-auto max-w-[240px] rounded-[0.375rem] object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}

                {/* Edits and photo removal live on the plan page's review form — the one
                    place that owns writing a review — so a build log never grows a second,
                    divergent editing surface. This view is read-only by design. */}
                <p className="mt-[0.75rem] mx-0 mb-0">
                  <Link
                    href={`/plans/${build.plan.slug}#reviews-heading`}
                    className={btnGhost}
                  >
                    View / edit on the plan
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
