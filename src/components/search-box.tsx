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
export function SearchBox({ query }: { query: string }) {
  return (
    <form className="search-box" action="/" method="get" role="search">
      <label htmlFor="q" className="visually-hidden">
        Search plans
      </label>
      <input
        id="q"
        name="q"
        type="search"
        className="search-input"
        placeholder="Search plans, tools, materials…"
        defaultValue={query}
        autoComplete="off"
      />
      <button type="submit" className="btn btn-primary">
        Search
      </button>
    </form>
  );
}
