import { SORT_OPTIONS, type SortOption } from '@/lib/sort';
import { btnGhost, selectControl } from '@/lib/ui'; // Sprint 29/30b
// `sort-form` class RETAINED (print hides it); the rest is inline utilities.
import type { PlanFilters } from '@/lib/filters';

interface Props {
  sort: SortOption;
  query: string;
  filters: PlanFilters;
}

/**
 * Sort control — Sprint 7. Delivers the "Popular" sort from BUSINESS_PLAN.md §4.7.
 *
 * A GET form with a submit button, like everything else here: no JS, and the sort
 * lands in the URL so a sorted view is shareable.
 *
 * The active search and filters ride along as hidden inputs. Changing the sort
 * must not silently discard the filters someone just spent time setting — that is
 * the single most annoying bug in any faceted catalog.
 *
 * HIDDEN DURING A KEYWORD SEARCH: when you search, relevance IS the sort (see
 * queryPlans). Offering a dropdown that would be ignored is worse than not
 * offering it — it implies a control the app does not honour.
 */
export function SortSelect({ sort, query, filters }: Props) {
  if (query !== '') return null;

  return (
    <form className="sort-form flex items-center gap-[0.5rem] mb-[0.75rem]" action="/" method="get">
      {/* Carry the active filters through, or changing the sort would clear them. */}
      {filters.category && (
        <input type="hidden" name="category" value={filters.category} />
      )}
      {filters.difficulty.map((d) => (
        <input key={d} type="hidden" name="difficulty" value={d} />
      ))}
      {filters.costTier.map((c) => (
        <input key={c} type="hidden" name="cost" value={c} />
      ))}
      {filters.maxMinutes && (
        <input type="hidden" name="time" value={filters.maxMinutes} />
      )}
      {filters.ownedTools.map((t) => (
        <input key={t} type="hidden" name="tools" value={t} />
      ))}

      <label htmlFor="sort" className="text-[0.75rem] uppercase tracking-[0.06em] text-muted">
        Sort
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={sort}
        className={`${selectControl} focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-1`}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button type="submit" className={btnGhost}>
        Apply
      </button>
    </form>
  );
}
