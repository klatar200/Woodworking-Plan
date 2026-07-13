import Link from 'next/link';
import type { Metadata } from 'next';
import { getShoppingList } from '@/lib/shopping-list';
import { listCollections } from '@/lib/saves';
import { formatCents } from '@/lib/format';

/**
 * Shopping list — Sprint 12. BUSINESS_PLAN.md §10.
 *
 * One consolidated, buyable list of the materials across a user's saved plans, for a
 * collection ("For the Cabin") or for everything they've saved.
 *
 * NO AFFILIATE LINKS, and that is a constraint rather than an omission: Vercel's Hobby
 * tier prohibits commercial use (DECISIONS_LOG.md 2026-07-13). The aggregation is the
 * useful half regardless.
 *
 * PRINTABLE. This is the one screen in the app most likely to be used on paper — a
 * phone in a lumberyard with sawdust on your hands is not a great input device, and
 * hardware stores are famously bad for signal. `globals.css` hides the nav and the
 * controls at print.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shopping list',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ collection?: string }>;

export default async function ShoppingListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  // Never trust the query string. An unknown or someone else's collection id resolves
  // to an empty list — getShoppingList() scopes the lookup by the session user.
  const collectionId =
    typeof params.collection === 'string' && params.collection !== ''
      ? params.collection
      : undefined;

  const [list, collections] = await Promise.all([
    getShoppingList(collectionId),
    listCollections(),
  ]);

  const heading = list.collectionName
    ? `Shopping list — ${list.collectionName}`
    : 'Shopping list';

  return (
    <main id="main" className="page">
      <p className="breadcrumb no-print">
        <Link href="/saved">← Saved plans</Link>
      </p>

      <h1>{heading}</h1>

      {list.planCount === 0 ? (
        <p className="muted">
          {collectionId
            ? 'Nothing saved in this collection yet.'
            : 'You have not saved any plans yet.'}{' '}
          <Link href="/">Browse plans</Link> and save the ones you want to build.
        </p>
      ) : (
        <>
          <p className="subtitle">
            {list.lineCount} {list.lineCount === 1 ? 'item' : 'items'} across{' '}
            {list.planCount} {list.planCount === 1 ? 'plan' : 'plans'}
            {list.totalCents !== null ? (
              <>
                {' '}
                &middot; <strong>{formatCents(list.totalCents)}</strong> estimated
              </>
            ) : null}
          </p>

          {/* Say this OUT LOUD rather than quietly summing the priced items and
              printing a total that is wrong in the cheaper direction. Some materials
              genuinely have no price ("scrap you already have"). */}
          {list.hasUnpricedLines ? (
            <p className="notice">
              Some materials have no estimated price, so there is no total. The prices
              shown are estimates only — lumber varies by region, species, and season.
            </p>
          ) : null}

          {/* Scope switcher. A GET form, no JavaScript. */}
          {collections.length > 0 ? (
            <form method="get" className="scope-form no-print">
              <label htmlFor="collection">List for</label>
              <select id="collection" name="collection" defaultValue={collectionId ?? ''}>
                <option value="">Everything I&apos;ve saved</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn">
                Show
              </button>
            </form>
          ) : null}

          {list.groups.map((group) => (
            <section key={group.unit} aria-labelledby={`unit-${group.unit}`}>
              {/* Grouped by unit: you buy board feet at a lumberyard, screws by the
                  box, and finish by the can. Sorting by name alone means walking the
                  store three times. */}
              <h2 id={`unit-${group.unit}`} className="sub-heading">
                {group.unit}
              </h2>

              <ul className="shopping-list">
                {group.lines.map((line) => (
                  <li key={`${line.name}-${line.species ?? ''}`} className="shopping-line">
                    <div className="shopping-line-main">
                      {/* A real checkbox, unchecked. It does NOT persist — this sprint
                          is stateless by decision. It is here because a paper list you
                          can tick is the entire point of printing one. */}
                      <input
                        type="checkbox"
                        id={`have-${line.name}`}
                        aria-label={`Mark ${line.name} as bought`}
                      />
                      <label htmlFor={`have-${line.name}`} className="shopping-line-name">
                        <strong>
                          {line.quantity} {line.unit}
                        </strong>{' '}
                        &mdash; {line.name}
                        {line.species ? (
                          <span className="muted"> ({line.species})</span>
                        ) : null}
                      </label>

                      <span className="shopping-line-cost">
                        {line.costCents !== null ? (
                          formatCents(line.costCents)
                        ) : (
                          <span className="muted">&mdash;</span>
                        )}
                      </span>
                    </div>

                    {/* WHICH PLANS NEED THIS. The user asked for a consolidated list;
                        they did not agree to lose track of why each line is on it. */}
                    <p className="shopping-line-plans muted small">
                      {line.plans.map((plan) => plan.title).join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="footnote">
            Estimates only. Quantities are summed across plans; identical materials are
            combined, similar-but-different ones are deliberately kept separate so you
            do not buy the wrong hardware.
          </p>
        </>
      )}
    </main>
  );
}
