import Link from 'next/link';
import { buildQueryString, type PlanFilters } from '@/lib/filters';

// Sprint 30a (UI migration, wave 2): the desktop rail moves to Tailwind. `catalog-nav`
// class is RETAINED (the print stylesheet hides it by class); the rail's display/grid/
// sticky behaviour is on it as `lg:` utilities. `catalog-nav-heading` stays a CSS class
// for now — it overrides the global `h2` rule, which converts in the later typography pass.
// Link states avoid a base border-COLOR (source-order gotcha, see src/lib/ui.ts): border
// width in the base, color per state.
const navBase =
  'block px-[0.75rem] py-[0.5rem] rounded-[0.375rem] text-fg no-underline text-[0.9375rem] border focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-1';
const navLink = `${navBase} border-transparent hover:bg-surface hover:border-border`;
const navLinkActive = `${navBase} bg-accent-tint border-accent-tint-border font-semibold hover:bg-surface hover:border-border`;

interface Props {
  query: string;
  filters: PlanFilters;
  /** Omitted when it's the default — same convention as the chips and pagination. */
  sort?: string;
  /** QOL-I: carried so switching category doesn't reset the chosen page size. */
  perPage?: number;
  categories: Array<{ slug: string; name: string }>;
}

/**
 * Flat category nav — Sprint 18, desktop catalog's left rail.
 *
 * Same architecture as every other catalog control: plain GET links built by
 * `buildQueryString`, no client state, no JS. Clicking a category REPLACES the
 * category filter (it is single-valued) and carries the search term, the sort,
 * and every other filter along untouched — dropping someone's query because they
 * clicked "Outdoor" is the classic bug here, and it is the one filter-chips.tsx
 * already guards against in the other direction.
 *
 * Resetting to page 1 is automatic: `buildQueryString` is called without a page.
 * A category change with `?page=4` still attached would land on an empty page.
 *
 * This nav is a DUPLICATE affordance, not a new capability — the category
 * <select> in the filter panel does the same job and stays the only one on
 * mobile (CSS hides this rail below the desktop breakpoint; see
 * `.catalog-nav` in globals.css). That is deliberate: Sprint 18's scope is
 * "desktop layout, mobile unchanged", and stacking a second category control
 * above the plans on a phone is exactly what the Sprint 5 <details> collapse
 * exists to prevent.
 */
export function CategoryNav({ query, filters, sort, perPage, categories }: Props) {
  const href = (category: string | undefined) =>
    buildQueryString({ query, filters: { ...filters, category }, sort, perPage });

  const active = filters.category;

  return (
    <nav
      className="catalog-nav hidden lg:block"
      aria-label="Categories"
    >
      <h2 className="catalog-nav-heading">Categories</h2>
      <ul className="list-none m-0 p-0 flex flex-col gap-[0.125rem]">
        <li>
          <Link
            href={href(undefined)}
            className={active ? navLink : navLinkActive}
            aria-current={active ? undefined : 'page'}
          >
            All plans
          </Link>
        </li>
        {categories.map((category) => {
          const isActive = active === category.slug;
          return (
            <li key={category.slug}>
              <Link
                href={href(category.slug)}
                className={isActive ? navLinkActive : navLink}
                aria-current={isActive ? 'page' : undefined}
              >
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
