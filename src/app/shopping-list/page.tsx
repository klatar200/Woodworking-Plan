import Link from 'next/link';
import type { Metadata } from 'next';
import { getShoppingList } from '@/lib/shopping-list';
import { listCollections } from '@/lib/saves';
import { costTierSymbol, costTierForCents } from '@/lib/format';

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
            {list.planCount} {list.planCount === 1 ? 'plan' : 'plans'} &middot;{' '}
            {/*
              A TIER, not a figure (DECISIONS_LOG.md 2026-07-13 — no dollar amounts
              anywhere in the public UI).

              This still does the job the old "≈ $84" was there for: stop someone
              expecting to build an end-grain butcher block for $10. It does it without
              printing a number we would only be pretending to know — every underlying
              figure is a hand-authored ballpark for a commodity that moves with region,
              species and season.
            */}
            <strong>{costTierSymbol(costTierForCents(list.totalCents))}</strong>{' '}
            <span className="muted">of $$$$$</span>
          </p>

          <p className="notice">
            Cost is shown as a band, not a price — lumber varies too much by region,
            species, and season for a figure to be honest.
            {list.unpricedCount > 0 ? (
              <>
                {' '}
                <strong>
                  {list.unpricedCount}{' '}
                  {list.unpricedCount === 1 ? 'item has' : 'items have'} no estimate
                </strong>
                , so the real cost may land above this band.
              </>
            ) : null}
          </p>

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

                      {/* NO PER-LINE PRICE. A price against a single line item is the
                          least defensible number we could print: it implies we know what
                          a board costs at your lumberyard this week. We do not. The
                          band at the top of the list is the honest version. */}
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
            Quantities are summed across plans. Consumables like glue, sandpaper and
            finish are listed generically — buy the brand you like. Fasteners are listed
            by exact size and are never combined, because a 1-1/4&Prime; screw is not a
            1-5/8&Prime; screw.
          </p>
        </>
      )}
    </main>
  );
}
