import type { PlanFilters } from '@/lib/filters';

interface Props {
  /** Only carried where it applies — the sort form is hidden during a keyword search. */
  query?: string;
  filters: PlanFilters;
  sort?: string;
  perPage?: number;
}

/**
 * The active catalog state as hidden `<input>`s — QOL-I.
 *
 * Both the sort form and the page-size form must carry every OTHER piece of catalog
 * state so changing one control doesn't discard the rest (change the sort, keep the
 * filters; change the page size, keep the sort and the search). Two hand-maintained
 * copies of that block would be two things to keep in step, and the day they drift one
 * form silently drops a filter — the same reason PLAN_CARD_SELECT is shared, not copied.
 * One component, one source of truth.
 *
 * Each form renders whichever fields it is NOT itself the control for: the sort form
 * passes `filters` (+ `perPage`) but not `sort`; the page-size form passes `query`,
 * `filters`, and `sort` but not `perPage`.
 */
export function CatalogStateInputs({ query, filters, sort, perPage }: Props) {
  return (
    <>
      {query ? <input type="hidden" name="q" value={query} /> : null}
      {filters.category ? (
        <input type="hidden" name="category" value={filters.category} />
      ) : null}
      {filters.difficulty.map((d) => (
        <input key={d} type="hidden" name="difficulty" value={d} />
      ))}
      {filters.costTier.map((c) => (
        <input key={c} type="hidden" name="cost" value={c} />
      ))}
      {filters.maxMinutes ? (
        <input type="hidden" name="time" value={filters.maxMinutes} />
      ) : null}
      {filters.ownedTools.map((t) => (
        <input key={t} type="hidden" name="tools" value={t} />
      ))}
      {sort ? <input type="hidden" name="sort" value={sort} /> : null}
      {perPage ? <input type="hidden" name="perPage" value={perPage} /> : null}
    </>
  );
}
