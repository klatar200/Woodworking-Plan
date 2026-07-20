import { CATALOG_PATH } from '@/lib/routes';

/**
 * Compact search in the desktop header — QOL-J.
 *
 * A plain GET `<form>`, the same no-JS philosophy as the catalog's SearchBox
 * (search-box.tsx): it works before hydration, the query lands in the URL (shareable,
 * back-button-safe), and it targets `CATALOG_PATH` so a search started from ANY page — a
 * plan, the FAQ, a 404 — lands on the catalog with `?q=`. That's the whole point of a
 * header search over the catalog-only box: reach is everywhere the header is.
 *
 * Desktop only (`hidden lg:flex`). Below `lg` the header stays uncluttered and search is
 * reached through the catalog page's own full-width box; the mobile drawer owns that
 * width. The catalog keeps its inline SearchBox too — its page-level placeholder carries
 * context ("Search plans, tools, materials…") this compact version can't.
 *
 * `id="header-q"` (not `q`) so it never collides with the catalog SearchBox's `id="q"`
 * when both render on the catalog page; the `name` stays `q` — that's the query param.
 */
export function HeaderSearch() {
  return (
    <form
      action={CATALOG_PATH}
      method="get"
      role="search"
      className="hidden lg:flex items-center gap-[0.375rem]"
    >
      <label htmlFor="header-q" className="visually-hidden">
        Search plans
      </label>
      <input
        id="header-q"
        name="q"
        type="search"
        placeholder="Search plans…"
        autoComplete="off"
        className="min-h-[2.25rem] w-[13rem] px-[0.75rem] py-0 text-[0.9375rem] text-fg bg-bg border border-border rounded-[0.375rem] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-1"
      />
      {/* A TEXT button, not an icon (Keagan 2026-07-20): this control is desktop-only, and
          a labelled "Search" reads clearer than a glyph at desktop density. Outlined, not
          filled — "Sign up" stays the header's single primary CTA. */}
      <button
        type="submit"
        className="inline-flex items-center min-h-[2.25rem] px-[0.875rem] rounded-[0.375rem] border border-border bg-transparent text-fg text-[0.9375rem] font-medium whitespace-nowrap cursor-pointer hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
      >
        Search
      </button>
    </form>
  );
}
