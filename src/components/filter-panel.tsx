import {
  DIFFICULTIES,
  COST_TIERS,
  TIME_BUCKETS,
  activeFilterCount,
  type PlanFilters,
} from '@/lib/filters';
import { costTierSymbol, difficultyLabel } from '@/lib/format';
import { FilterDisclosure } from '@/components/filter-disclosure';

interface Props {
  query: string;
  filters: PlanFilters;
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
      <form className="filters-form" action="/" method="get">
        {/* Keep the active search alive across a filter submit. */}
        {query && <input type="hidden" name="q" value={query} />}

        <fieldset className="filter-group">
          <legend>Category</legend>
          <select name="category" defaultValue={filters.category ?? ''}>
            <option value="">Any category</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="filter-group">
          <legend>Difficulty</legend>
          <div className="checkbox-row">
            {DIFFICULTIES.map((d) => (
              <label key={d} className="checkbox">
                <input
                  type="checkbox"
                  name="difficulty"
                  value={d}
                  defaultChecked={filters.difficulty.includes(d)}
                />
                <span>{difficultyLabel(d)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="filter-group">
          <legend>Cost</legend>
          <div className="checkbox-row">
            {COST_TIERS.map((tier) => (
              <label key={tier} className="checkbox">
                <input
                  type="checkbox"
                  name="cost"
                  value={tier}
                  defaultChecked={filters.costTier.includes(tier)}
                />
                <span>{costTierSymbol(tier)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="filter-group">
          <legend>Time available</legend>
          <select name="time" defaultValue={filters.maxMinutes ?? ''}>
            <option value="">Any amount of time</option>
            {TIME_BUCKETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="filter-group">
          <legend>Tools you own</legend>
          <p className="filter-hint">
            Tick what you have. You&rsquo;ll only see plans you can actually build
            &mdash; optional tools are ignored.
            {showingPrefill ? (
              <>
                {' '}
                <strong>Pre-filled from your workshop</strong> &mdash; press Apply to use
                them.
              </>
            ) : null}
          </p>

          {[...grouped.entries()].map(([group, groupTools]) => (
            <div key={group} className="tool-group">
              <span className="tool-group-name">{group}</span>
              <div className="checkbox-row">
                {groupTools.map((tool) => (
                  <label key={tool.slug} className="checkbox">
                    <input
                      type="checkbox"
                      name="tools"
                      value={tool.slug}
                      defaultChecked={checkedTools.has(tool.slug)}
                    />
                    <span>{tool.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        <div className="filters-actions">
          <button type="submit" className="btn btn-primary">
            Apply filters
          </button>
          {/* A link, not a reset button: reset would restore the last SUBMITTED
              state, not clear the filters. Different thing, and confusing. */}
          <a href={query ? `/?q=${encodeURIComponent(query)}` : '/'} className="btn btn-ghost">
            Clear filters
          </a>
        </div>
      </form>
    </FilterDisclosure>
  );
}
