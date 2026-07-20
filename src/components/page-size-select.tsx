import { selectControl } from '@/lib/ui';
import type { PlanFilters } from '@/lib/filters';
import { PAGE_SIZES, type PageSize } from '@/lib/page-size';
import { AutoSubmitSelect } from '@/components/auto-submit-select';
import { SoftGetForm } from '@/components/soft-get-form';
import { CatalogStateInputs } from '@/components/catalog-state-inputs';

interface Props {
  perPage: PageSize;
  query: string;
  filters: PlanFilters;
  /** Omitted when default — same convention as the chips. */
  sort?: string;
}

/**
 * Page-size control — QOL-I item 4.
 *
 * Same shape as SortSelect: a soft-navigating GET form that carries the rest of the
 * catalog state as hidden inputs (so changing the page size keeps the search, filters,
 * and sort), an AutoSubmitSelect that applies on a pointer/touch change, and a
 * visually-hidden Apply for the keyboard/no-JS path.
 *
 * Unlike the sort form, this renders DURING a keyword search too — search results are
 * paginated the same way, so "how many per page" still applies. (Sort is carried through
 * as a hidden input regardless; it's simply ignored by the query while a search is
 * active, exactly as it is everywhere else.)
 */
export function PageSizeSelect({ perPage, query, filters, sort }: Props) {
  return (
    <SoftGetForm className="sort-form flex items-center gap-[0.5rem] mb-[0.75rem]" action="/">
      {/* Everything except the page size itself, so changing it keeps the rest. */}
      <CatalogStateInputs query={query} filters={filters} sort={sort} />

      <label
        htmlFor="perPage"
        className="text-[0.75rem] uppercase tracking-[0.06em] text-muted"
      >
        Per page
      </label>
      <AutoSubmitSelect
        id="perPage"
        name="perPage"
        defaultValue={String(perPage)}
        className={`${selectControl} focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-1`}
      >
        {PAGE_SIZES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </AutoSubmitSelect>
      {/* KEPT, visually hidden — the no-JS submit path and the keyboard commit, same as
          the sort form's Apply. */}
      <button type="submit" className="visually-hidden">
        Show
      </button>
    </SoftGetForm>
  );
}
