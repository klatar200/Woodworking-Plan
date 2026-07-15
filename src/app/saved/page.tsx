import Link from 'next/link';
import { page, btn, btnGhost, searchInput } from '@/lib/ui'; // Sprint 29: shell + button + input
import { listSavedPlans, listCollections } from '@/lib/saves';
import { listPaths } from '@/lib/paths';
import { hasRateLimitNotice } from '@/lib/rate-limit-feedback';
import { PlanCard } from '@/components/plan-card';
import { OfflineDownload } from '@/components/offline-download';
import { RateLimitNotice } from '@/components/rate-limit-notice';
import {
  createCollectionAction,
  deleteCollectionAction,
  addToCollectionAction,
  removeFromCollectionAction,
} from '@/app/actions/saves';

/**
 * The user's saved plans and folders — Sprint 6.
 *
 * SECURITY: this route is private by default (it is NOT on the allowlist in
 * src/lib/public-routes.ts, and that allowlist fails closed). Beyond that,
 * `listSavedPlans()` and `listCollections()` derive the owner from the verified
 * session and take no userId — so even if the middleware were mis-edited, this
 * page cannot render someone else's data. There is no `/saved/[userId]` route,
 * and there never should be.
 *
 * NO LIMITS on saves or folders — see DECISIONS_LOG.md (2026-07-13). Pricing is
 * unconfirmed, there is no billing, and a cap with no upgrade path would be a
 * wall with no door.
 */
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ collection?: string; notice?: string }>;

export default async function SavedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { collection: collectionId, notice } = await searchParams;

  const [collections, savedPlans, allSavedPlans, paths] = await Promise.all([
    listCollections(),
    // A collection id from the URL is untrusted — listSavedPlans scopes the
    // collection filter by userId too, so a stranger's id returns nothing rather
    // than their contents.
    listSavedPlans({ collectionId }),
    /**
     * Sprint 14. The offline download covers the WHOLE library, not just whatever
     * collection is being viewed — so it needs the unfiltered list.
     *
     * When no collection is selected these are the same query and Prisma will run it
     * twice; at a personal library's scale that is free, and the alternative (deriving
     * one from the other with a conditional) is the kind of cleverness that ends with
     * the download quietly covering only the active collection.
     */
    listSavedPlans(),
    // Sprint 16 paths, for the offline download. Public content — no user scoping.
    listPaths(),
  ]);

  const activeCollection = collections.find((c) => c.id === collectionId);

  /** This page's own URL — denial bounce-back and the notice's Dismiss target. */
  const currentUrl = activeCollection
    ? `/saved?collection=${activeCollection.id}`
    : '/saved';

  return (
    <main id="main" className={`${page} page-wide`}>
      <h1>Saved plans</h1>

      <RateLimitNotice
        show={hasRateLimitNotice(notice)}
        dismissHref={currentUrl}
      />

      {/* ---------------- folders ---------------- */}
      <section aria-label="Your collections">
        <h2>Collections</h2>

        <nav className="collection-tabs">
          <Link
            href="/saved"
            className={`chip ${!collectionId ? 'chip-active' : ''}`}
            aria-current={!collectionId ? 'page' : undefined}
          >
            All saved
          </Link>

          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/saved?collection=${c.id}`}
              className={`chip ${collectionId === c.id ? 'chip-active' : ''}`}
              aria-current={collectionId === c.id ? 'page' : undefined}
            >
              {c.name} <span className="muted">({c._count.plans})</span>
            </Link>
          ))}
        </nav>

        <form action={createCollectionAction} className="inline-form">
          <input type="hidden" name="returnTo" value={currentUrl} />
          <label htmlFor="new-collection" className="visually-hidden">
            New collection name
          </label>
          <input
            id="new-collection"
            name="name"
            type="text"
            className={searchInput}
            placeholder="New collection — e.g. “Gifts”, “For the cabin”"
            maxLength={60}
            required
          />
          <button type="submit" className={btnGhost}>
            Create
          </button>
        </form>

        {activeCollection && (
          <form action={deleteCollectionAction} className="inline-form">
            <input type="hidden" name="returnTo" value={currentUrl} />
            <input type="hidden" name="collectionId" value={activeCollection.id} />
            <button type="submit" className={btnGhost}>
              Delete “{activeCollection.name}”
            </button>
            {/* Deleting a folder does NOT unsave its plans — only the grouping
                goes. A folder delete that silently unsaved twelve plans would be
                a destructive surprise, and nobody would trust folders again. */}
            <span className="filter-hint">
              The plans stay saved &mdash; only the collection is removed.
            </span>
          </form>
        )}
      </section>

      {/* ---------------- saved plans ---------------- */}
      <section aria-label="Saved plans">
        <h2>
          {activeCollection ? activeCollection.name : 'All saved'}{' '}
          <span className="muted">({savedPlans.length})</span>
        </h2>

        {/* Sprint 22. The shopping list is now its own explicit set, decoupled from
            saves (DECISIONS_LOG.md 2026-07-14) — so this is a plain link to it, no
            longer scoped by collection. Shown whenever the user has saves, as a
            pointer to where the shopping list lives; plans get ONTO it from each plan
            page's "Add to shopping list", not from being saved. */}
        {savedPlans.length > 0 && (
          <p className="shopping-list-cta">
            <Link href="/shopping-list" className={btn}>
              Shopping list
            </Link>
          </p>
        )}

        {/* Sprint 14 — the consented offline download.
            Deliberately scoped to the WHOLE library, not the active collection: someone
            heading to a hardware store wants everything they might need, and asking them
            to remember to download each collection separately is how they end up in an
            aisle missing the one list they wanted. */}
        {allSavedPlans.length > 0 && (
          <OfflineDownload
            slugs={allSavedPlans.map((saved) => saved.plan.slug)}
            collectionIds={collections.map((collection) => collection.id)}
            pathSlugs={paths.map((path) => path.slug)}
          />
        )}

        {savedPlans.length === 0 ? (
          <p className="empty-state">
            {activeCollection ? (
              <>Nothing in this collection yet.</>
            ) : (
              <>
                You haven&rsquo;t saved anything yet.{' '}
                <Link href="/">Browse the plans</Link> and hit{' '}
                <strong>Save this plan</strong> on anything you like.
              </>
            )}
          </p>
        ) : (
          <ul className="plan-grid">
            {savedPlans.map((saved) => (
              <li key={saved.id} className="saved-item">
                <ul className="plan-grid-inner">
                  {/* Everything on this page is already saved — passing `saved`
                      renders the bookmark overlay filled, and tapping it
                      unsaves (see save-toggle.tsx), matching the mockup's
                      quick-remove-from-the-grid affordance. */}
                  <PlanCard plan={saved.plan} saved returnTo={currentUrl} />
                </ul>

                <div className="saved-item-actions">
                  {/* Which folders is it already in? */}
                  {saved.collections.length > 0 && (
                    <ul className="badges">
                      {saved.collections.map(({ collection }) => (
                        <li key={collection.id} className="badge">
                          {collection.name}
                          <form action={removeFromCollectionAction} className="chip-form">
                            <input type="hidden" name="returnTo" value={currentUrl} />
                            <input type="hidden" name="planId" value={saved.plan.id} />
                            <input
                              type="hidden"
                              name="collectionId"
                              value={collection.id}
                            />
                            <button
                              type="submit"
                              className="chip-remove"
                              aria-label={`Remove from ${collection.name}`}
                            >
                              ×
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}

                  {collections.length > 0 && (
                    <form action={addToCollectionAction} className="inline-form">
                      <input type="hidden" name="returnTo" value={currentUrl} />
                      <input type="hidden" name="planId" value={saved.plan.id} />
                      <label
                        htmlFor={`add-${saved.id}`}
                        className="visually-hidden"
                      >
                        Add to collection
                      </label>
                      <select id={`add-${saved.id}`} name="collectionId" required>
                        <option value="">Add to collection…</option>
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className={btnGhost}>
                        Add
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
