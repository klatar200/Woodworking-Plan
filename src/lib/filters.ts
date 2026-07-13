import type { CostTier } from '@prisma/client';

/**
 * Filter parsing — Sprint 5.
 *
 * Every filter arrives as a URL query string, which means it is untrusted input.
 * This module is the single place it gets validated and normalized, so the query
 * layer and the UI can both work with a clean, typed object and neither has to
 * remember to be suspicious.
 *
 * Anything unrecognized is DROPPED, not rejected. A stale bookmark with a
 * deleted category slug, or a hand-edited `?difficulty=99`, should quietly show
 * unfiltered results — not a 500 and not an error page. Search UIs get shared,
 * bookmarked, and mangled; they have to survive it.
 */

export const DIFFICULTIES = [1, 2, 3, 4, 5] as const;

export const COST_TIERS: CostTier[] = [
  'TIER_1',
  'TIER_2',
  'TIER_3',
  'TIER_4',
  'TIER_5',
];

/**
 * Time buckets, in minutes.
 *
 * These are the questions woodworkers actually ask — "can I finish this today?",
 * "is this a weekend?" — not arbitrary hour counts. BUSINESS_PLAN.md §9 frames
 * the whole product around "what can I build this weekend".
 *
 * A "shop day" is 8 hours, not 24. Nobody works on a bed frame for 24 hours.
 */
export const TIME_BUCKETS = [
  { value: 240, label: 'An afternoon (≤ 4 hrs)' },
  { value: 480, label: 'A day (≤ 8 hrs)' },
  { value: 960, label: 'A weekend (≤ 16 hrs)' },
  { value: 2880, label: 'A few weekends (≤ 48 hrs)' },
] as const;

export interface PlanFilters {
  /** Category slug. */
  category?: string;
  /** Difficulty levels to include. Empty = all. */
  difficulty: number[];
  /** Cost tiers to include. Empty = all. */
  costTier: CostTier[];
  /** Only plans finishable within this many minutes. */
  maxMinutes?: number;
  /**
   * Tool slugs the user owns.
   *
   * SEMANTICS — this is the subtle one. Selecting tools does NOT mean "show me
   * plans that use these tools". It means "show me plans I can BUILD with these
   * tools" — i.e. plans whose ESSENTIAL tools are a subset of what's selected.
   *
   * BUSINESS_PLAN.md §4.6 words it exactly that way: "only show plans I can build
   * with tools I own". Getting this backwards would produce a filter that returns
   * plans requiring a lathe you don't have, which is worse than no filter at all.
   */
  ownedTools: string[];
}

/** True when no filter is active — i.e. this is plain browse. */
export function hasActiveFilters(f: PlanFilters): boolean {
  return Boolean(
    f.category ||
      f.difficulty.length > 0 ||
      f.costTier.length > 0 ||
      f.maxMinutes ||
      f.ownedTools.length > 0,
  );
}

/** How many distinct filters are on. Used for the "Filters (3)" badge. */
export function activeFilterCount(f: PlanFilters): number {
  return (
    (f.category ? 1 : 0) +
    (f.difficulty.length > 0 ? 1 : 0) +
    (f.costTier.length > 0 ? 1 : 0) +
    (f.maxMinutes ? 1 : 0) +
    (f.ownedTools.length > 0 ? 1 : 0)
  );
}

/** Next.js gives repeated params as string[], single ones as string. */
type RawParam = string | string[] | undefined;

function toArray(value: RawParam): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Strict integer parse. Returns undefined for anything that is not *entirely*
 * digits.
 *
 * `Number.parseInt` is far too forgiving for untrusted input: it happily reads
 * `parseInt("3'; DROP TABLE Plan;--")` as **3**, silently discarding the rest.
 * Not exploitable on its own — the result is the number 3, and Prisma
 * parameterizes regardless — but a hostile string quietly becoming a valid filter
 * is exactly the kind of leniency that becomes a vulnerability the day someone
 * downstream assumes the input was clean. Reject it outright instead.
 */
function strictInt(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : undefined;
}

/**
 * Parses raw search params into validated filters.
 *
 * `validCategorySlugs` and `validToolSlugs` are passed in rather than queried
 * here: it keeps this module pure and instantly testable, and it means an
 * unknown slug is dropped rather than sent to Postgres to match nothing.
 */
export function parseFilters(
  params: Record<string, RawParam>,
  {
    validCategorySlugs,
    validToolSlugs,
  }: { validCategorySlugs: string[]; validToolSlugs: string[] },
): PlanFilters {
  const categories = new Set(validCategorySlugs);
  const tools = new Set(validToolSlugs);

  const rawCategory = typeof params.category === 'string' ? params.category : undefined;

  const difficulty = toArray(params.difficulty)
    .map(strictInt)
    .filter((d): d is number =>
      d !== undefined && DIFFICULTIES.includes(d as (typeof DIFFICULTIES)[number]),
    );

  const costTier = toArray(params.cost).filter((c): c is CostTier =>
    COST_TIERS.includes(c as CostTier),
  );

  const rawTime = strictInt(typeof params.time === 'string' ? params.time : '');
  const maxMinutes =
    rawTime !== undefined && TIME_BUCKETS.some((b) => b.value === rawTime)
      ? rawTime
      : undefined;

  const ownedTools = toArray(params.tools).filter((t) => tools.has(t));

  return {
    category: rawCategory && categories.has(rawCategory) ? rawCategory : undefined,
    // Dedupe: `?difficulty=2&difficulty=2` is not a reason to widen the IN clause.
    difficulty: [...new Set(difficulty)],
    costTier: [...new Set(costTier)],
    maxMinutes,
    ownedTools: [...new Set(ownedTools)],
  };
}

/**
 * Rebuilds a query string from a search term + filters.
 * Used for pagination links and the "remove this filter" chips — losing the
 * active filters on "Next page" is the classic bug here.
 */
export function buildQueryString({
  query,
  filters,
  page,
}: {
  query: string;
  filters: PlanFilters;
  page?: number;
}): string {
  const params = new URLSearchParams();

  if (query) params.set('q', query);
  if (filters.category) params.set('category', filters.category);
  for (const d of filters.difficulty) params.append('difficulty', String(d));
  for (const c of filters.costTier) params.append('cost', c);
  if (filters.maxMinutes) params.set('time', String(filters.maxMinutes));
  for (const t of filters.ownedTools) params.append('tools', t);
  if (page && page > 1) params.set('page', String(page));

  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}
