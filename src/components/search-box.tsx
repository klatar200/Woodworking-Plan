/**
 * Search box — Sprint 4.
 *
 * A plain GET <form>. No JavaScript, no client component, no debounced fetch.
 *
 * That is a deliberate choice, not laziness:
 *   - It works before JS loads, and on a phone with one bar of signal in a
 *     hardware store — which BUSINESS_PLAN.md §5 says is the actual usage
 *     context, not a hypothetical one.
 *   - The query lands in the URL, so a search is shareable, bookmarkable, and
 *     survives a back button.
 *   - Server-rendered results mean no loading spinner and no client-side state.
 *
 * If search-as-you-type proves necessary later, it can be layered on top of a
 * thing that already works. The reverse is not true.
 */
import { btnPrimary, searchInput } from '@/lib/ui';
import { CATALOG_PATH } from '@/lib/routes';
// Sprint 29 (UI migration, wave 1). `search-box` class RETAINED — the print
// stylesheet hides it by class (out of scope this sprint); utilities added alongside.
// `search-input` is fully converted to utilities; the submit button uses the shared
// primary-button constant. `visually-hidden` (a11y) stays in globals.css for now.
const searchBox = 'search-box flex gap-[0.5rem] mt-[1rem] mb-[0.75rem] mx-0';

export function SearchBox({ query }: { query: string }) {
  return (
    <form className={searchBox} action={CATALOG_PATH} method="get" role="search">
      <label htmlFor="q" className="visually-hidden">
        Search plans
      </label>
      <input
        id="q"
        name="q"
        type="search"
        className={searchInput}
        placeholder="Search plans, tools, materials…"
        defaultValue={query}
        autoComplete="off"
      />
      <button type="submit" className={btnPrimary}>
        Search
      </button>
    </form>
  );
}
