import Link from 'next/link';
import { listSavedPlans, listCollections } from '@/lib/saves';
import { PlanCard } from '@/components/plan-card';
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

type SearchParams = Promise<{ collection?: string }>;

export default async function SavedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { collection: collectionId } = await searchParams;

  const [collections, savedPlans] = await Promise.all([
    listCollections(),
    // A collection id from the URL is untrusted — listSavedPlans scopes the
    // collection filter by userId too, so a stranger's id returns nothing rather
    // than their contents.
    listSavedPlans({ collectionId }),
  ]);

  const activeCollection = collections.find((c) => c.id === collectionId);

  return (
    <main id="main" className="page page-wide">
      <h1>Saved plans</h1>

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
          <label htmlFor="new-collection" className="visually-hidden">
            New collection name
          </label>
          <input
            id="new-collection"
            name="name"
            type="text"
            className="search-input"
            placeholder="New collection — e.g. “Gifts”, “For the cabin”"
            maxLength={60}
            required
          />
          <button type="submit" className="btn btn-ghost">
            Create
          </button>
        </form>

        {activeCollection && (
          <form action={deleteCollectionAction} className="inline-form">
            <input type="hidden" name="collectionId" value={activeCollection.id} />
            <button type="submit" className="btn btn-ghost">
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
                  <PlanCard plan={saved.plan} />
                </ul>

                <div className="saved-item-actions">
                  {/* Which folders is it already in? */}
                  {saved.collections.length > 0 && (
                    <ul className="badges">
                      {saved.collections.map(({ collection }) => (
                        <li key={collection.id} className="badge">
                          {collection.name}
                          <form action={removeFromCollectionAction} className="chip-form">
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
                      <button type="submit" className="btn btn-ghost">
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
