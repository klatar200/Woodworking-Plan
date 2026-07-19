import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { PLAN_CARD_SELECT } from '@/lib/plans';

/**
 * Learning paths — Sprint 16. BUSINESS_PLAN.md §10 (Phase 3).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROGRESS IS DERIVED, NOT STORED. There is no `PathProgress` table.
 *
 * A step is complete when the user has REVIEWED that plan. You reviewed it ⇒ you built
 * it. The `Review` table (Sprint 10) already exists and is already the truth, so there is
 * nothing here to backfill, nothing to keep in sync, and nothing that can silently
 * disagree with reality.
 *
 * This is the derived-data rule (CLAUDE.md), and it is the third feature in a row that
 * has been offered an obvious denormalized table and refused it. Sprints 4 and 6 both
 * broke production by creating derived columns a migration could not populate.
 *
 * The accepted cost: someone who builds a plan and never reviews it reads as incomplete.
 * A real gap, and a fair price for having no drift. If it annoys real users, an explicit
 * "mark as built" table is a clean follow-on — and switching to it needs no data
 * migration, precisely because nothing was stored.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SECURITY: `published: true` on EVERY read, enforced here in the data layer rather than
 * in the pages — the standing rule since Sprint 3. And no function takes a `userId`: the
 * "which plans have I built" lookup derives its owner from the verified session.
 */

const PATH_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  sortOrder: true,
  // QOL-E — the taxonomy. Both nullable: an untagged path is one the seed has not run
  // for yet (see prisma/schema.prisma), and a null category means "spans several".
  experienceLevel: true,
  category: { select: { slug: true, name: true } },
  _count: { select: { steps: true } },
} as const;

export type PathListItem = Awaited<ReturnType<typeof listPaths>>[number];

/**
 * QOL-E — the /paths filters, validated the same way the catalog's are.
 *
 * NEVER TRUST THE QUERY STRING: an unknown category slug or a hand-edited
 * `?level=99` degrades to "no filter" rather than being handed to Postgres to match
 * nothing (or worse, to `NaN`). Exactly the posture `parseFilters` takes for the
 * catalog — see src/lib/filters.ts, which this deliberately mirrors rather than
 * extends: the two surfaces filter different models on different fields, and one
 * shared "filters" type covering both would be a type that is half-wrong everywhere.
 */
export interface PathFilters {
  level?: number;
  category?: string;
}

export function parsePathFilters(
  params: Record<string, string | string[] | undefined>,
  validCategorySlugs: string[],
): PathFilters {
  const rawLevel = typeof params.level === 'string' ? Number.parseInt(params.level, 10) : NaN;
  const level = Number.isInteger(rawLevel) && rawLevel >= 1 && rawLevel <= 5 ? rawLevel : undefined;

  const rawCategory = typeof params.category === 'string' ? params.category : undefined;
  const category =
    rawCategory && validCategorySlugs.includes(rawCategory) ? rawCategory : undefined;

  return { level, category };
}

/** The /paths URL for a given filter state — omitted keys mean "no filter". */
export function buildPathQueryString(filters: PathFilters): string {
  const params = new URLSearchParams();
  if (filters.level !== undefined) params.set('level', String(filters.level));
  if (filters.category !== undefined) params.set('category', filters.category);
  const query = params.toString();
  return query === '' ? '/paths' : `/paths?${query}`;
}

/**
 * Every published path, in authored order, optionally narrowed by the QOL-E taxonomy.
 *
 * ONE function serves the unfiltered index and every filtered view — the same rule the
 * catalog follows with `queryPlans()`. A second query for "the filtered case" is how
 * `published: true` goes missing on one path while everything still appears to work.
 */
export async function listPaths(filters: PathFilters = {}) {
  return prisma.path.findMany({
    where: {
      published: true,
      ...(filters.level !== undefined ? { experienceLevel: filters.level } : {}),
      ...(filters.category !== undefined
        ? { category: { slug: filters.category } }
        : {}),
    },
    select: PATH_LIST_SELECT,
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
}

/**
 * One path, with its ordered steps and each step's plan.
 *
 * Returns null for an unknown slug AND for an unpublished path alike — so a 404 here
 * cannot be used to probe for staged content. Same shape as `getPlanBySlug()`.
 *
 * The nested plan filter also applies `published: true`: a path must not surface an
 * unpublished plan just because a step points at it. Two independent gates, because one
 * forgotten filter is how staged content ships while everything still "works".
 */
export async function getPathBySlug(slug: string) {
  return prisma.path.findFirst({
    where: { slug, published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      description: true,
      steps: {
        where: { plan: { published: true } },
        select: {
          id: true,
          stepNumber: true,
          reason: true,
          plan: { select: PLAN_CARD_SELECT },
        },
        orderBy: { stepNumber: 'asc' },
      },
    },
  });
}

export type PathDetail = NonNullable<Awaited<ReturnType<typeof getPathBySlug>>>;

/**
 * The plan ids the signed-in user has BUILT — i.e. reviewed.
 *
 * Takes no arguments. The owner is the verified session, and an anonymous visitor gets an
 * empty set rather than an exception (the paths pages are public — §12 gates
 * participation, not content).
 *
 * A `Set`, not an array: the caller checks membership once per step, and an array turns
 * that into a scan. Trivial at five steps; free to get right.
 */
export async function getBuiltPlanIds(): Promise<Set<string>> {
  const user = await getCurrentUser();
  if (!user) return new Set();

  const reviews = await prisma.review.findMany({
    where: { userId: user.id },
    select: { planId: true },
  });

  return new Set(reviews.map((review) => review.planId));
}

export interface PathProgress {
  completed: number;
  total: number;
  /** The step the user should do next — the first one they have not built. */
  nextStepNumber: number | null;
}

/**
 * Where the user is in a path. PURE — takes the data, returns the summary.
 *
 * Separated from the queries so it can be tested directly. The rule that decides what
 * "next" means is the one a user actually feels, and it should not require a database to
 * check.
 */
export function summarizeProgress(
  steps: { stepNumber: number; plan: { id: string } }[],
  builtPlanIds: Set<string>,
): PathProgress {
  const completed = steps.filter((step) => builtPlanIds.has(step.plan.id)).length;

  /**
   * "Next" is the first UNBUILT step, in order — NOT `completed + 1`.
   *
   * Those differ the moment someone builds out of order, which people do: they see the
   * dovetail box, build it first, and come back. `completed + 1` would then point at a
   * step they have already finished, and the path would tell them to do it again.
   */
  const next = steps.find((step) => !builtPlanIds.has(step.plan.id));

  return {
    completed,
    total: steps.length,
    nextStepNumber: next?.stepNumber ?? null,
  };
}
