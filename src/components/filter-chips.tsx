import Link from 'next/link';
import {
  TIME_BUCKETS,
  buildQueryString,
  hasActiveFilters,
  type PlanFilters,
} from '@/lib/filters';
import { costTierSymbol, difficultyLabel } from '@/lib/format';

interface Props {
  query: string;
  filters: PlanFilters;
  /** Omitted when it's the default — same convention as pagination links. */
  sort?: string;
  categories: Array<{ slug: string; name: string }>;
  tools: Array<{ slug: string; name: string }>;
}

/**
 * Active-filter chips — the mockup's removable "Outdoor ✕ / Beginner ✕" row.
 *
 * Same architecture rule as everything else on the catalog: each chip is a
 * plain LINK to the current URL minus that one filter — no client state, no
 * JS. Removing a filter this way survives the back button, is shareable, and
 * resets to page 1 automatically because buildQueryString omits the page.
 *
 * The search term and sort ride along on every chip. Removing one filter must
 * not silently discard the query someone typed or the sort they picked — the
 * same rule sort-select.tsx already enforces in the other direction.
 *
 * "Clear all filters" clears FILTERS ONLY, keeping the search term — it sits
 * in the filter row, so it must scope to filters. The subtitle's "Clear all"
 * (which clears everything, search included) is a different control doing a
 * different job.
 */
export function FilterChips({ query, filters, sort, categories, tools }: Props) {
  if (!hasActiveFilters(filters)) return null;

  const categoryName = new Map(categories.map((c) => [c.slug, c.name]));
  const toolName = new Map(tools.map((t) => [t.slug, t.name]));

  // Each chip's href = the current state with exactly one value taken out.
  const without = (patch: Partial<PlanFilters>): string =>
    buildQueryString({ query, filters: { ...filters, ...patch }, sort });

  const chips: Array<{ key: string; label: string; href: string }> = [];

  if (filters.category) {
    chips.push({
      key: `category-${filters.category}`,
      label: categoryName.get(filters.category) ?? filters.category,
      href: without({ category: undefined }),
    });
  }

  for (const d of filters.difficulty) {
    chips.push({
      key: `difficulty-${d}`,
      label: difficultyLabel(d),
      href: without({ difficulty: filters.difficulty.filter((x) => x !== d) }),
    });
  }

  for (const c of filters.costTier) {
    chips.push({
      key: `cost-${c}`,
      label: costTierSymbol(c),
      href: without({ costTier: filters.costTier.filter((x) => x !== c) }),
    });
  }

  if (filters.maxMinutes) {
    const bucket = TIME_BUCKETS.find((b) => b.value === filters.maxMinutes);
    chips.push({
      key: 'time',
      label: bucket?.label ?? 'Time limit',
      href: without({ maxMinutes: undefined }),
    });
  }

  for (const t of filters.ownedTools) {
    chips.push({
      key: `tool-${t}`,
      label: toolName.get(t) ?? t,
      href: without({ ownedTools: filters.ownedTools.filter((x) => x !== t) }),
    });
  }

  return (
    <ul className="filter-chips" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={chip.href}
            className="chip chip-active"
            aria-label={`Remove filter: ${chip.label}`}
          >
            {chip.label} <span aria-hidden="true">✕</span>
          </Link>
        </li>
      ))}
      <li>
        <Link
          href={buildQueryString({
            query,
            filters: {
              category: undefined,
              difficulty: [],
              costTier: [],
              maxMinutes: undefined,
              ownedTools: [],
            },
            sort,
          })}
          className="filter-chips-clear"
        >
          Clear all filters
        </Link>
      </li>
    </ul>
  );
}
