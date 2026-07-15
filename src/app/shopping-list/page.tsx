import Link from 'next/link';
import { page, chip, chipActive } from '@/lib/ui'; // Sprint 29/30b
import type { Metadata } from 'next';
import { getShoppingList } from '@/lib/shopping-list';
import { costTierSymbol, costTierForCents } from '@/lib/format';

/**
 * Shopping list — Sprint 12, redesigned in Sprint 22.
 *
 * One consolidated, buyable list of materials across the plans a user has EXPLICITLY
 * added to their shopping list (Sprint 22 — decoupled from saves; see
 * `src/lib/shopping-list.ts`). Two views of the same list:
 *
 *   - MERGED (default): everything combined and grouped by unit — the "one buyable list".
 *   - BY PLAN: each project's own materials, unmerged — shop for one build at a time.
 *
 * The view is a `?view=` GET param, no JavaScript — a switch that survives the back
 * button and a bookmark, like every other control in this app.
 *
 * NO AFFILIATE LINKS (Vercel Hobby prohibits commercial use — DECISIONS_LOG.md
 * 2026-07-13). PRINTABLE: this is the screen most likely to be used on paper in a
 * lumberyard; `globals.css` hides the nav and controls at print.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shopping list',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ view?: string }>;

function CostNotice({ unpricedCount }: { unpricedCount: number }) {
  return (
    <p className="px-[1rem] py-[0.75rem] my-[1rem] mx-0 border-l-[3px] border-border bg-surface text-[0.9rem]">
      Cost is shown as a band, not a price — lumber varies too much by region, species,
      and season for a figure to be honest.
      {unpricedCount > 0 ? (
        <>
          {' '}
          <strong>
            {unpricedCount} {unpricedCount === 1 ? 'item has' : 'items have'} no estimate
          </strong>
          , so the real cost may land above this band.
        </>
      ) : null}
    </p>
  );
}

function Line({
  line,
  keyPrefix,
}: {
  line: { name: string; unit: string; species: string | null; quantity: number };
  keyPrefix: string;
}) {
  const id = `have-${keyPrefix}-${line.name}`;
  return (
    <li className="shopping-line py-[0.6rem] px-0 border-b border-border">
      <div className="shopping-line-main flex items-baseline gap-[0.6rem]">
        {/* A real checkbox to tick items off on paper. It does NOT persist — the whole
            point is a printable list, and paper is the interaction model in a store. */}
        <input
          type="checkbox"
          id={id}
          aria-label={`Mark ${line.name} as bought`}
          className="w-[1.15rem] h-[1.15rem] min-w-[1.15rem] m-0 shrink-0 accent-[var(--fg)]"
        />
        <label htmlFor={id} className="flex-1 cursor-pointer">
          <strong>
            {line.quantity} {line.unit}
          </strong>{' '}
          &mdash; {line.name}
          {line.species ? <span className="muted"> ({line.species})</span> : null}
        </label>
        {/* NO PER-LINE PRICE — the least defensible number we could print. The band at
            the top is the honest version. */}
      </div>
    </li>
  );
}

export default async function ShoppingListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const view = params.view === 'by-plan' ? 'by-plan' : 'merged';

  const list = await getShoppingList();

  return (
    <main id="main" className={page}>
      <p className="breadcrumb no-print">
        <Link href="/saved">← Saved plans</Link>
      </p>

      <h1>Shopping list</h1>

      {list.planCount === 0 ? (
        <p className="muted">
          Your shopping list is empty. Open a plan and choose{' '}
          <strong>Add to shopping list</strong> — saving a plan no longer adds it here, so
          this stays the list of what you&rsquo;re actually building.{' '}
          <Link href="/">Browse plans</Link>.
        </p>
      ) : (
        <>
          <p className="subtitle">
            {list.lineCount} {list.lineCount === 1 ? 'item' : 'items'} across{' '}
            {list.planCount} {list.planCount === 1 ? 'plan' : 'plans'} &middot;{' '}
            {/* A TIER, not a figure (DECISIONS_LOG.md 2026-07-13 — no dollar amounts in
                the public UI). Still does the "don't expect a butcher block for $10" job,
                without printing a number we'd only be pretending to know. */}
            <strong>{costTierSymbol(costTierForCents(list.totalCents))}</strong>
          </p>

          <CostNotice unpricedCount={list.unpricedCount} />

          {/* View switcher. GET links, no JS. */}
          <nav
            className="flex flex-wrap gap-[0.5rem] mt-[1rem] mx-0 mb-[1.5rem] no-print"
            aria-label="List view"
          >
            <Link
              href="/shopping-list"
              className={view === 'merged' ? chipActive : chip}
              aria-current={view === 'merged' ? 'page' : undefined}
            >
              Combined list
            </Link>
            <Link
              href="/shopping-list?view=by-plan"
              className={view === 'by-plan' ? chipActive : chip}
              aria-current={view === 'by-plan' ? 'page' : undefined}
            >
              By plan
            </Link>
          </nav>

          {view === 'merged' ? (
            list.groups.map((group) => (
              <section key={group.unit} aria-labelledby={`unit-${group.unit}`}>
                {/* Grouped by unit: board feet at the lumberyard, screws by the box,
                    finish by the can. Sorting by name alone means walking the store
                    three times. */}
                <h2 id={`unit-${group.unit}`} className="sub-heading">
                  {group.unit}
                </h2>
                <ul className="list-none p-0 mt-0 mx-0 mb-[1.5rem]">
                  {group.lines.map((line) => (
                    <li
                      key={`${line.name}-${line.species ?? ''}`}
                      className="shopping-line py-[0.6rem] px-0 border-b border-border"
                    >
                      <div className="shopping-line-main flex items-baseline gap-[0.6rem]">
                        <input
                          type="checkbox"
                          id={`have-${line.name}`}
                          aria-label={`Mark ${line.name} as bought`}
                          className="w-[1.15rem] h-[1.15rem] min-w-[1.15rem] m-0 shrink-0 accent-[var(--fg)]"
                        />
                        <label
                          htmlFor={`have-${line.name}`}
                          className="flex-1 cursor-pointer"
                        >
                          <strong>
                            {line.quantity} {line.unit}
                          </strong>{' '}
                          &mdash; {line.name}
                          {line.species ? (
                            <span className="muted"> ({line.species})</span>
                          ) : null}
                        </label>
                      </div>
                      {/* WHICH PLANS NEED THIS — the user asked to consolidate, not to
                          lose track of why each line is on the list. */}
                      <p className="mt-[0.2rem] mr-0 mb-0 ml-[1.75rem] muted small">
                        {line.plans.map((plan) => plan.title).join(', ')}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <>
              {list.byPlan.map((plan) => (
                <section key={plan.slug} aria-labelledby={`plan-${plan.slug}`}>
                  <h2 id={`plan-${plan.slug}`} className="sub-heading">
                    <Link href={`/plans/${plan.slug}`}>{plan.title}</Link>
                  </h2>
                  <ul className="list-none p-0 mt-0 mx-0 mb-[1.5rem]">
                    {plan.lines.map((line) => (
                      <Line key={line.name} line={line} keyPrefix={plan.slug} />
                    ))}
                  </ul>
                </section>
              ))}
              <p className="footnote">
                By-plan view lists each project&rsquo;s materials on their own &mdash; the
                same item can appear under more than one plan. Switch to{' '}
                <Link href="/shopping-list">Combined list</Link> to merge quantities into
                one buyable list.
              </p>
            </>
          )}

          {view === 'merged' ? (
            <p className="footnote">
              Quantities are summed across plans. Consumables like glue, sandpaper and
              finish are listed generically &mdash; buy the brand you like. Fasteners are
              listed by exact size and are never combined, because a 1-1/4&Prime; screw is
              not a 1-5/8&Prime; screw.
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
