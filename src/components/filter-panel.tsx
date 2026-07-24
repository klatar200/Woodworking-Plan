import {
  DIFFICULTIES,
  COST_TIERS,
  TIME_BUCKETS,
  activeFilterCount,
  type PlanFilters,
} from '@/lib/filters';
import { COST_TIER_ANCHOR, costTierSymbol, difficultyLabel } from '@/lib/format';
import { FilterDisclosure } from '@/components/filter-disclosure';
import { SoftGetForm } from '@/components/soft-get-form';
import { AutoSubmitSelect } from '@/components/auto-submit-select';
import { CATALOG_PATH } from '@/lib/routes';
import {
  checkbox,
  checkboxInput,
  selectControl,
} from '@/lib/ui'; // Sprint 29/30b: shared classes

// Sprint 30b: filter-panel styling → Tailwind. `filters-form` layout, the fieldset
// reset, the checkbox pills (shared `checkbox`), selects (shared `selectControl`), hints
// and tool groups all inline below. The `.filters` / summary chrome lives in
// filter-disclosure.tsx.

/**
 * Sprint 46 (Workstream E) — each filter group is its own collapsed disclosure.
 *
 * A native `<details>`, so it opens and closes with NO JavaScript — the panel stays the
 * plain GET form it has always been. Collapsed by default keeps the rail short (five groups
 * + 30 tool checkboxes was a tall wall); a section AUTO-OPENS when the URL already carries a
 * filter for it (`active`), so a ticked control is never hidden behind a closed summary —
 * control state matching system state, the same rule 39.1 fought for. The group's real
 * label lives on the `<summary>`; the inner `<legend>` stays for the fieldset's a11y grouping
 * but is visually hidden so it isn't shown twice.
 */
function FilterSection({
  label,
  active,
  className,
  children,
}: {
  label: string;
  active: boolean;
  /** Optional extras — Sprint 50: Category gets `lg:hidden` (desktop uses CategoryNav). */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      className={`filter-section border-t border-border${className ? ` ${className}` : ''}`}
      open={active}
    >
      <summary className="filter-section-summary list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-[0.5rem] min-h-[2.75rem] text-[0.75rem] uppercase tracking-[0.06em] font-medium text-muted cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-[-2px]">
        <span>{label}</span>
        <svg
          className="filter-section-chevron flex-none"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </summary>
      <div className="pb-[1.25rem]">{children}</div>
    </details>
  );
}

const legendHidden = 'visually-hidden';

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
   * Does this visitor have a saved workshop? — Sprint 39.1 (audit H5).
   *
   * A BOOLEAN, and deliberately not the tool slugs it replaced. Sprint 25 passed the
   * owned-tool list here and pre-ticked those checkboxes without applying them, so the
   * panel showed six ticked boxes over an unfiltered catalog: control state that did not
   * match system state, which is the one thing a checkbox is for. ⚖️ Keagan chose to stop
   * pre-ticking (2026-07-21) — the "Show plans I can build" CTA above the results already
   * does this job, URL-driven and therefore identical for whoever you share the link with.
   *
   * The rejected alternative was to tick AND apply on load via a redirect. It is honest
   * about state, but it breaks the standing rule that results come from the URL: a clean
   * `/browse` link would render a different catalog for each viewer.
   *
   * Passing a boolean instead of the slugs makes the fix STRUCTURAL — the component no
   * longer knows which tools you own, so it cannot pre-tick them again by accident. It
   * needs only enough to know whether the tip is worth showing.
   */
  hasWorkshop?: boolean;
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
  hasWorkshop = false,
}: Props) {
  const count = activeFilterCount(filters);

  // The URL is the only thing that ticks a box (39.1). What is checked here is exactly
  // what is filtering the results — nothing else.
  const checkedTools = new Set(filters.ownedTools);
  // The tip points at the CTA, so it is worth showing only when that CTA is on the page:
  // you have a workshop and you are not already filtering by tools.
  const showWorkshopTip = hasWorkshop && filters.ownedTools.length === 0;

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
        className="pt-0 px-[1rem] pb-[1rem]"
        action={CATALOG_PATH}
        autoSubmitOnChange="input[type=checkbox]"
      >
        {/* Keep the active search alive across a filter submit. */}
        {query && <input type="hidden" name="q" value={query} />}
        {/* Preserve sort + page size across an auto-applied filter change. */}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {perPage && <input type="hidden" name="perPage" value={perPage} />}

        <FilterSection
          label="Category"
          active={filters.category != null}
          className="lg:hidden"
        >
          <fieldset className="border-none p-0 m-0 min-w-0">
            <legend className={legendHidden}>Category</legend>
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
        </FilterSection>

        <FilterSection label="Difficulty" active={filters.difficulty.length > 0}>
          <fieldset className="border-none p-0 m-0 min-w-0">
            <legend className={legendHidden}>Difficulty</legend>
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
        </FilterSection>

        <FilterSection label="Cost" active={filters.costTier.length > 0}>
          <fieldset className="border-none p-0 m-0 min-w-0">
            <legend className={legendHidden}>Cost</legend>
            {/* Sprint 41.3 (audit C3): the anchor is VISIBLE TEXT here, not only a
                tooltip — this is where someone is deciding which boxes to tick, and a
                `title` is unreachable on a touch screen and to a keyboard. The badge
                tooltips elsewhere are the extra, not the affordance. */}
            <p className="mt-0 mb-[0.5rem] text-[0.8125rem] text-muted">
              {COST_TIER_ANCHOR}
            </p>
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
        </FilterSection>

        <FilterSection label="Time available" active={filters.maxMinutes != null}>
          <fieldset className="border-none p-0 m-0 min-w-0">
            <legend className={legendHidden}>Time available</legend>
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
        </FilterSection>

        <FilterSection label="Tools you own" active={filters.ownedTools.length > 0}>
          <fieldset className="border-none p-0 m-0 min-w-0">
            <legend className={legendHidden}>Tools you own</legend>
            <p className="mt-0 mx-0 mb-[0.625rem] text-[0.875rem] text-muted">
              Tick what you have. You&rsquo;ll only see plans you can actually build
              &mdash; optional tools are ignored.
              {/* DRAFT copy — public wording is Keagan's to approve. */}
              {showWorkshopTip ? (
                <>
                  {' '}
                  Tip: &ldquo;Show plans I can build&rdquo; above the results ticks these from
                  your workshop.
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
        </FilterSection>

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
