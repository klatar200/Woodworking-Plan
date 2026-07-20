import {
  DIFFICULTIES,
  COST_TIERS,
  TIME_BUCKETS,
  activeFilterCount,
  type PlanFilters,
} from '@/lib/filters';
import { costTierSymbol, difficultyLabel } from '@/lib/format';
import { FilterDisclosure } from '@/components/filter-disclosure';
import { SoftGetForm } from '@/components/soft-get-form';
import { AutoSubmitSelect } from '@/components/auto-submit-select';
import {
  checkbox,
  checkboxInput,
  selectControl,
} from '@/lib/ui'; // Sprint 29/30b: shared classes

// Sprint 30b: filter-panel styling → Tailwind. `filters-form` layout, the fieldset
// reset, legend eyebrow, the checkbox pills (shared `checkbox`), selects (shared
// `selectControl`), hints and tool groups all inline below. The `.filters` / summary
// chrome lives in filter-disclosure.tsx.
const legendClass =
  'p-0 text-[0.75rem] uppercase tracking-[0.06em] text-muted mb-[0.5rem]';

interface Props {
  query: string;
  filters: PlanFilters;
  /**
   * QOL-I: carried as a hidden input so auto-applying a filter (which now happens on
   * every checkbox/select change, not a deliberate Apply click) does NOT silently reset
   * the sort or the page size. Omitted when default — same convention as the chips.
   */
  sort?: string;
  perPage?: number;
  categories: Array<{ slug: string; name: string }>;
  tools: Array<{ slug: string; name: string; category: string | null }>;
  /**
   * Sprint 25 — the signed-in user's owned-tools profile (empty for anonymous).
   *
   * Used ONLY to pre-tick the "tools you own" checkboxes when the URL carries no tools
   * filter, so a returning user can hit Apply once. It does NOT drive results — the URL
   * does — so a shared link renders the same catalog for everyone. When the URL already
   * has `?tools=`, that wins and the prefill is ignored.
   */
  prefillTools?: string[];
}

/**
 * Filter panel — Sprint 5.
 *
 * Same philosophy as the Sprint 4 search box: a plain GET <form>, no JavaScript,
 * no client component, no state. Submitting puts every active filter in the URL,
 * so a filtered view is shareable and survives the back button — which matters
 * when the whole point is "here's the shelf I'm going to build, look."
 *
 * Collapsed by default on mobile via <details>. Five filter groups and 30 tool
 * checkboxes above the results would bury the plans on a phone, and the plans are
 * what people came for. <details> gives us that for free, with no JS and correct
 * keyboard/screen-reader behaviour — a hand-rolled accordion would give us less
 * for more. Sprint 18 moved the panel into a desktop right rail, where nothing is
 * buried and it opens by itself — see filter-disclosure.tsx.
 *
 * The keyword query rides along as a hidden input so filtering does not silently
 * discard an active search.
 */
export function FilterPanel({
  query,
  filters,
  sort,
  perPage,
  categories,
  tools,
  prefillTools = [],
}: Props) {
  const count = activeFilterCount(filters);

  // The URL wins. Only when it carries NO tools filter do we fall back to the profile
  // to pre-tick the boxes — never to change what's shown, only what's pre-checked.
  const toolsFromUrl = filters.ownedTools.length > 0;
  const checkedTools = new Set(toolsFromUrl ? filters.ownedTools : prefillTools);
  const showingPrefill = !toolsFromUrl && prefillTools.length > 0;

  // Group tools by their category ("Power Saw", "Hand Tool"...) — a flat list of
  // 30 checkboxes is a wall, and nobody reads a wall.
  const grouped = new Map<string, typeof tools>();
  for (const tool of tools) {
    const key = tool.category ?? 'Other';
    const list = grouped.get(key) ?? [];
    list.push(tool);
    grouped.set(key, list);
  }

  return (
    <FilterDisclosure count={count}>
      {/* QOL-I: a soft-navigating GET form. Checkboxes auto-apply on change (debounced);
          the two <select>s auto-apply on a pointer/touch change via AutoSubmitSelect. With
          JS off it is still a plain GET form and the visually-hidden Apply button submits
          it. */}
      <SoftGetForm
        className="pt-0 px-[1rem] pb-[1rem] grid gap-[1.25rem]"
        action="/"
        autoSubmitOnChange="input[type=checkbox]"
      >
        {/* Keep the active search alive across a filter submit. */}
        {query && <input type="hidden" name="q" value={query} />}
        {/* Preserve sort + page size across an auto-applied filter change. */}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {perPage && <input type="hidden" name="perPage" value={perPage} />}

        <fieldset className="border-none p-0 m-0 min-w-0">
          <legend className={legendClass}>Category</legend>
          <AutoSubmitSelect
            name="category"
            defaultValue={filters.category ?? ''}
            className={`w-full ${selectControl}`}
          >
            <option value="">Any category</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </AutoSubmitSelect>
        </fieldset>

        <fieldset className="border-none p-0 m-0 min-w-0">
          <legend className={legendClass}>Difficulty</legend>
          <div className="flex flex-wrap gap-[0.375rem]">
            {DIFFICULTIES.map((d) => (
              <label key={d} className={checkbox}>
                <input
                  type="checkbox"
                  name="difficulty"
                  value={d}
                  defaultChecked={filters.difficulty.includes(d)}
                  className={checkboxInput}
                />
                <span>{difficultyLabel(d)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-none p-0 m-0 min-w-0">
          <legend className={legendClass}>Cost</legend>
          <div className="flex flex-wrap gap-[0.375rem]">
            {COST_TIERS.map((tier) => (
              <label key={tier} className={checkbox}>
                <input
                  type="checkbox"
                  name="cost"
                  value={tier}
                  defaultChecked={filters.costTier.includes(tier)}
                  className={checkboxInput}
                />
                <span>{costTierSymbol(tier)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-none p-0 m-0 min-w-0">
          <legend className={legendClass}>Time available</legend>
          <AutoSubmitSelect
            name="time"
            defaultValue={filters.maxMinutes ?? ''}
            className={`w-full ${selectControl}`}
          >
            <option value="">Any amount of time</option>
            {TIME_BUCKETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </AutoSubmitSelect>
        </fieldset>

        <fieldset className="border-none p-0 m-0 min-w-0">
          <legend className={legendClass}>Tools you own</legend>
          <p className="mt-[-0.25rem] mx-0 mb-[0.625rem] text-[0.875rem] text-muted">
            Tick what you have. You&rsquo;ll only see plans you can actually build
            &mdash; optional tools are ignored.
            {showingPrefill ? (
              <>
                {' '}
                <strong>Pre-filled from your workshop</strong> &mdash; adjust any filter to
                apply them, or use &ldquo;Show plans I can build&rdquo; above the results.
              </>
            ) : null}
          </p>

          {[...grouped.entries()].map(([group, groupTools]) => (
            <div key={group} className="mb-[0.75rem]">
              <span className="block text-[0.8125rem] text-muted mb-[0.375rem]">{group}</span>
              <div className="flex flex-wrap gap-[0.375rem]">
                {groupTools.map((tool) => (
                  <label key={tool.slug} className={checkbox}>
                    <input
                      type="checkbox"
                      name="tools"
                      value={tool.slug}
                      defaultChecked={checkedTools.has(tool.slug)}
                      className={checkboxInput}
                    />
                    <span>{tool.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        {/* QOL-I: every field now auto-applies, so an explicit Apply is visually
            redundant — but it stays in the document (visually hidden, not removed) as the
            no-JS submit path and the keyboard's commit action, exactly like the sort
            form's. The old "Clear filters" link is GONE from here: it duplicated
            FilterChips' "Clear all filters" (which renders only when a filter is actually
            active), so there were two identical controls on one page. FilterChips owns it
            now. */}
        <button type="submit" className="visually-hidden">
          Apply filters
        </button>
      </SoftGetForm>
    </FilterDisclosure>
  );
}
