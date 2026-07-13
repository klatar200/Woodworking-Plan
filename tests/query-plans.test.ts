import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PlanFilters } from '@/lib/filters';

/**
 * Sprint 5 — the filter query layer.
 *
 * The single most important test in this file is the owned-tools SUBSET check.
 * Getting it backwards produces a filter that cheerfully returns a plan needing a
 * lathe you don't own — and a filter that lies is worse than no filter at all.
 */

const findMany = vi.fn();
const count = vi.fn();
const queryRaw = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    plan = { findMany, count, findFirst: vi.fn() };
    category = { findMany: vi.fn() };
    tool = { findMany: vi.fn() };
    user = { upsert: vi.fn() };
    $queryRaw = queryRaw;
    $executeRaw = vi.fn();
  },
}));

const filters = (over: Partial<PlanFilters> = {}): PlanFilters => ({
  difficulty: [],
  costTier: [],
  ownedTools: [],
  ...over,
});

beforeEach(() => {
  vi.resetModules();
  findMany.mockReset().mockResolvedValue([]);
  count.mockReset().mockResolvedValue(0);
  queryRaw.mockReset().mockResolvedValue([]);
});

const whereOf = (callIndex = 0) => findMany.mock.calls[callIndex]![0].where;

describe('owned-tools filter — the subset check', () => {
  it('SEMANTICS: matches plans with NO essential tool outside the owned set', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ filters: filters({ ownedTools: ['table-saw', 'router'] }) });

    // "none" is the whole point. `some` would mean "plans that use ANY tool I
    // own" — which returns plans needing a lathe you don't have.
    expect(whereOf().tools).toEqual({
      none: {
        essential: true,
        tool: { slug: { notIn: ['table-saw', 'router'] } },
      },
    });
  });

  it('SEMANTICS: OPTIONAL tools are ignored — that is what the essential flag is for', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ filters: filters({ ownedTools: ['table-saw'] }) });

    // A plan that merely *suggests* a router must not be excluded for someone who
    // doesn't own one. `essential: true` inside the `none` is what guarantees it.
    expect(whereOf().tools.none.essential).toBe(true);
  });

  it('applies no tool constraint at all when nothing is ticked', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ filters: filters() });

    expect(whereOf().tools).toBeUndefined();
  });
});

describe('time filter — honest under-promising', () => {
  it('filters on the MAXIMUM estimate, not the minimum', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ filters: filters({ maxMinutes: 240 }) });

    // Asking for "an afternoon (<=4 hrs)" must NOT return a plan estimated at
    // "3-7 hrs". Filtering on timeMinMinutes would return exactly that plan and
    // make the filter a liar.
    expect(whereOf().timeMaxMinutes).toEqual({ lte: 240 });
    expect(whereOf().timeMinMinutes).toBeUndefined();
  });
});

describe('filters', () => {
  it('SECURITY: published:true is always in the where clause', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ filters: filters() });

    expect(whereOf().published).toBe(true);
  });

  it('SECURITY: published:true survives even with every filter applied', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({
      filters: filters({
        category: 'furniture',
        difficulty: [1, 2],
        costTier: ['TIER_1'],
        maxMinutes: 480,
        ownedTools: ['router'],
      }),
    });

    expect(whereOf().published).toBe(true);
  });

  it('filters by category slug', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ filters: filters({ category: 'outdoor' }) });

    expect(whereOf().category).toEqual({ slug: 'outdoor' });
  });

  it('difficulty and cost are OR within a group (IN), AND across groups', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({
      filters: filters({ difficulty: [1, 2], costTier: ['TIER_1', 'TIER_2'] }),
    });

    // Ticking "Beginner" and "Easy" means beginner OR easy, not both at once
    // (impossible). But difficulty AND cost must both hold.
    expect(whereOf().difficulty).toEqual({ in: [1, 2] });
    expect(whereOf().costTier).toEqual({ in: ['TIER_1', 'TIER_2'] });
  });

  it('counts with the SAME where clause it lists with', async () => {
    // If the count ignored a filter, pagination would advertise pages that then
    // render empty.
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ filters: filters({ category: 'furniture' }) });

    expect(count.mock.calls[0]![0].where).toEqual(findMany.mock.calls[0]![0].where);
  });
});

describe('search + filters combined — the product promise', () => {
  it('applies filters to keyword results, preserving relevance order', async () => {
    // "walnut, tools I own" — BUSINESS_PLAN.md §9's whole pitch.
    queryRaw.mockResolvedValue([{ id: 'p3' }, { id: 'p1' }, { id: 'p2' }]);

    const { queryPlans } = await import('@/lib/plans');

    // First findMany = the filter pass (ids only). p2 is filtered out.
    findMany
      .mockResolvedValueOnce([{ id: 'p3' }, { id: 'p1' }])
      .mockResolvedValueOnce([
        { id: 'p1', title: 'One' },
        { id: 'p3', title: 'Three' },
      ]);

    const result = await queryPlans({
      query: 'walnut',
      filters: filters({ ownedTools: ['table-saw'] }),
    });

    // Rank order (p3 before p1) survives the filter pass and the hydration.
    expect(result.plans.map((p) => p.id)).toEqual(['p3', 'p1']);
    expect(result.total).toBe(2);
  });

  it('SECURITY: the filter pass re-applies published:true, not trusting the raw ids', async () => {
    queryRaw.mockResolvedValue([{ id: 'p1' }]);
    findMany.mockResolvedValueOnce([{ id: 'p1' }]).mockResolvedValueOnce([{ id: 'p1' }]);

    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ query: 'walnut', filters: filters() });

    const where = findMany.mock.calls[0]![0].where;
    expect(where.AND[0].published).toBe(true);
  });

  it('SECURITY: the keyword query is a bound parameter, never concatenated', async () => {
    queryRaw.mockResolvedValue([]);
    const { queryPlans } = await import('@/lib/plans');

    const evil = "walnut'; DROP TABLE \"Plan\"; --";
    await queryPlans({ query: evil });

    const call = queryRaw.mock.calls[0]!;
    const sql = (call[0] as string[]).join('?');
    const params = call.slice(1);

    expect(params).toContain(evil);
    expect(sql).not.toContain('DROP TABLE');
  });

  it('returns nothing when the keyword matches but the filters exclude everything', async () => {
    queryRaw.mockResolvedValue([{ id: 'p1' }]);
    findMany.mockResolvedValueOnce([]); // filters excluded it

    const { queryPlans } = await import('@/lib/plans');
    const result = await queryPlans({
      query: 'walnut',
      filters: filters({ ownedTools: ['drill-driver'] }),
    });

    expect(result.plans).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('short-circuits when the keyword matches nothing — no pointless filter query', async () => {
    queryRaw.mockResolvedValue([]);

    const { queryPlans } = await import('@/lib/plans');
    const result = await queryPlans({ query: 'zzzznothing' });

    expect(result.total).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('keyword search — inherited Sprint 4 guarantees', () => {
  it('uses websearch_to_tsquery, which cannot throw on human input', async () => {
    // to_tsquery() raises a syntax error on an unbalanced quote or a stray '&',
    // turning a typo into a 500. websearch_to_tsquery parses Google-style input
    // and never throws. Users type strange things into search boxes.
    queryRaw.mockResolvedValue([]);
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ query: 'walnut' });

    const sql = (queryRaw.mock.calls[0]![0] as string[]).join('?');
    expect(sql).toContain('websearch_to_tsquery');
    expect(sql).not.toMatch(/[^_]to_tsquery/);
  });

  it('SECURITY: the raw query filters on published = true', async () => {
    queryRaw.mockResolvedValue([]);
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ query: 'walnut' });

    const sql = (queryRaw.mock.calls[0]![0] as string[]).join('?');
    expect(sql).toMatch(/published\s*=\s*true/);
  });

  it('survives the strange things people actually type', async () => {
    for (const nasty of [
      "it's a trap",
      'walnut & oak | maple',
      '((((',
      '"unclosed quote',
      '<script>alert(1)</script>',
      '%%%',
    ]) {
      vi.resetModules();
      queryRaw.mockReset().mockResolvedValue([]);
      const { queryPlans } = await import('@/lib/plans');

      await expect(queryPlans({ query: nasty })).resolves.toBeDefined();
    }
  });

  it('an empty or whitespace query is not a search — it is browse', async () => {
    const { queryPlans } = await import('@/lib/plans');

    const result = await queryPlans({ query: '   ' });

    // No raw SQL at all: it used the ordinary catalog query.
    expect(queryRaw).not.toHaveBeenCalled();
    expect(result.query).toBe('');
  });

  it('trims the query before searching', async () => {
    queryRaw.mockResolvedValue([]);
    const { queryPlans } = await import('@/lib/plans');

    const result = await queryPlans({ query: '  walnut  ' });

    expect(queryRaw.mock.calls[0]!.slice(1)).toContain('walnut');
    expect(result.query).toBe('walnut');
  });
});

describe('pagination', () => {
  it('clamps a negative page rather than sending a negative skip to Postgres', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ page: -5 });

    expect(findMany.mock.calls[0]![0].skip).toBe(0);
  });

  it('paginates the filtered+ranked list, not the raw match list', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}` }));
    queryRaw.mockResolvedValue(ids);
    findMany
      .mockResolvedValueOnce(ids) // all survive the filter
      .mockResolvedValueOnce([{ id: 'p12' }]);

    const { queryPlans } = await import('@/lib/plans');
    const result = await queryPlans({ query: 'wood', page: 2 });

    // 20 matches, 12 per page -> page 2 holds 8, and totalPages is 2.
    expect(result.total).toBe(20);
    expect(result.totalPages).toBe(2);

    // The hydration query asked for the SECOND page's ids (p12 onward).
    expect(findMany.mock.calls[1]![0].where.id.in).toContain('p12');
    expect(findMany.mock.calls[1]![0].where.id.in).not.toContain('p0');
  });
});
