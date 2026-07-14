import Link from 'next/link';
import { buildQueryString, type PlanFilters } from '@/lib/filters';

interface Props {
  query: string;
  filters: PlanFilters;
  /** Omitted when it's the default — same convention as the chips and pagination. */
  sort?: string;
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
export function CategoryNav({ query, filters, sort, categories }: Props) {
  const href = (category: string | undefined) =>
    buildQueryString({ query, filters: { ...filters, category }, sort });

  const active = filters.category;

  return (
    <nav className="catalog-nav" aria-label="Categories">
      <h2 className="catalog-nav-heading">Categories</h2>
      <ul className="catalog-nav-list">
        <li>
          <Link
            href={href(undefined)}
            className={`catalog-nav-link${active ? '' : ' catalog-nav-link-active'}`}
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
                className={`catalog-nav-link${isActive ? ' catalog-nav-link-active' : ''}`}
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
