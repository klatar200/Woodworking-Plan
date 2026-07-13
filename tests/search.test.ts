import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Sprint 4 — keyword search.
 *
 * This is the only place in the codebase that drops to raw SQL, so it gets the
 * most paranoid tests. Two properties matter above all:
 *
 *   1. The user's query is a BOUND PARAMETER, never concatenated into SQL.
 *   2. `published = true` is in the SQL. Search must not be a back door into
 *      staged content that browse refuses to show.
 */

const queryRaw = vi.fn();
const findMany = vi.fn();
const count = vi.fn();
const findFirst = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    plan = { findMany, count, findFirst };
    user = { upsert: vi.fn() };
    $queryRaw = queryRaw;
    $executeRaw = vi.fn();
  },
}));

/**
 * `$queryRaw` is a tagged template. Prisma receives the static SQL fragments as
 * an array and the interpolated values SEPARATELY — that separation IS the
 * injection defence. These helpers let us assert on each half independently.
 */
const sqlOf = (call: unknown[]): string => (call[0] as string[]).join('?');
const paramsOf = (call: unknown[]): unknown[] => call.slice(1);

beforeEach(() => {
  vi.resetModules();
  queryRaw.mockReset();
  findMany.mockReset().mockResolvedValue([]);
  count.mockReset().mockResolvedValue(0);
  findFirst.mockReset();
});

/** ranked-ids query, then the count query. */
const mockSearch = (ids: string[], total: number) => {
  queryRaw
    .mockResolvedValueOnce(ids.map((id, i) => ({ id, rank: 1 - i * 0.1 })))
    .mockResolvedValueOnce([{ count: BigInt(total) }]);
};

describe('searchPlans — security', () => {
  it('SECURITY: passes the user query as a BOUND PARAMETER, never concatenated into SQL', async () => {
    mockSearch([], 0);
    const { searchPlans } = await import('@/lib/plans');

    const evil = "walnut'; DROP TABLE \"Plan\"; --";
    await searchPlans({ query: evil });

    const call = queryRaw.mock.calls[0]!;

    // The attack string must appear in the PARAMETERS...
    expect(paramsOf(call)).toContain(evil);
    // ...and must NOT appear anywhere in the SQL text itself.
    expect(sqlOf(call)).not.toContain('DROP TABLE');
    expect(sqlOf(call)).not.toContain(evil);
  });

  it('SECURITY: the ranked query filters on published = true', async () => {
    mockSearch([], 0);
    const { searchPlans } = await import('@/lib/plans');
    await searchPlans({ query: 'walnut' });

    expect(sqlOf(queryRaw.mock.calls[0]!)).toMatch(/published\s*=\s*true/);
  });

  it('SECURITY: the COUNT query filters on published = true too', async () => {
    // If the count ignored `published`, pagination would advertise pages of
    // staged plans that then render empty — leaking their existence.
    mockSearch([], 0);
    const { searchPlans } = await import('@/lib/plans');
    await searchPlans({ query: 'walnut' });

    expect(sqlOf(queryRaw.mock.calls[1]!)).toMatch(/published\s*=\s*true/);
  });

  it('SECURITY: re-applies published:true when hydrating, not trusting the id list', async () => {
    mockSearch(['p1'], 1);
    findMany.mockResolvedValue([{ id: 'p1', title: 'Walnut Board' }]);

    const { searchPlans } = await import('@/lib/plans');
    await searchPlans({ query: 'walnut' });

    expect(findMany.mock.calls[0]![0].where).toEqual({
      id: { in: ['p1'] },
      published: true,
    });
  });

  it('uses websearch_to_tsquery, which cannot throw on human input', async () => {
    // to_tsquery() raises a syntax error on an unbalanced quote or a stray '&',
    // turning a typo into a 500. websearch_to_tsquery parses Google-style input
    // and never throws. Users type strange things into search boxes.
    mockSearch([], 0);
    const { searchPlans } = await import('@/lib/plans');
    await searchPlans({ query: 'walnut' });

    const sql = sqlOf(queryRaw.mock.calls[0]!);
    expect(sql).toContain('websearch_to_tsquery');
    expect(sql).not.toMatch(/[^_]to_tsquery/);
  });

  it('survives the strange things people actually type', async () => {
    for (const nasty of [
      "it's a trap",
      'walnut & oak | maple',
      '((((',
      '"unclosed quote',
      '<script>alert(1)</script>',
      '   ',
      '%%%',
    ]) {
      vi.resetModules();
      queryRaw.mockReset();
      mockSearch([], 0);
      const mod = await import('@/lib/plans');

      await expect(mod.searchPlans({ query: nasty })).resolves.toBeDefined();
    }
  });
});

describe('searchPlans — behaviour', () => {
  it('an empty query is not a search — it falls through to browse', async () => {
    count.mockResolvedValue(24);
    const { searchPlans } = await import('@/lib/plans');

    const result = await searchPlans({ query: '' });

    // No raw SQL at all: it used the ordinary catalog query.
    expect(queryRaw).not.toHaveBeenCalled();
    expect(findMany.mock.calls[0]![0].where).toEqual({ published: true });
    expect(result.query).toBe('');
    expect(result.total).toBe(24);
  });

  it('a whitespace-only query is also just browse', async () => {
    count.mockResolvedValue(24);
    const { searchPlans } = await import('@/lib/plans');

    const result = await searchPlans({ query: '   ' });

    expect(queryRaw).not.toHaveBeenCalled();
    expect(result.query).toBe('');
  });

  it('trims the query before searching', async () => {
    mockSearch([], 0);
    const { searchPlans } = await import('@/lib/plans');

    const result = await searchPlans({ query: '  walnut  ' });

    expect(paramsOf(queryRaw.mock.calls[0]!)).toContain('walnut');
    expect(result.query).toBe('walnut');
  });

  it('returns results in RELEVANCE order, not whatever order Postgres hands back', async () => {
    // The ranked query returns p3, p1, p2. findMany will return them in some
    // arbitrary order. The result must follow the ranking — an unranked list of
    // search results is just a list.
    mockSearch(['p3', 'p1', 'p2'], 3);
    findMany.mockResolvedValue([
      { id: 'p1', title: 'One' },
      { id: 'p2', title: 'Two' },
      { id: 'p3', title: 'Three' },
    ]);

    const { searchPlans } = await import('@/lib/plans');
    const result = await searchPlans({ query: 'walnut' });

    expect(result.plans.map((p) => p.id)).toEqual(['p3', 'p1', 'p2']);
  });

  it('orders by rank DESC in the SQL', async () => {
    mockSearch([], 0);
    const { searchPlans } = await import('@/lib/plans');
    await searchPlans({ query: 'walnut' });

    expect(sqlOf(queryRaw.mock.calls[0]!)).toMatch(/ORDER BY\s+rank\s+DESC/i);
  });

  it('paginates search results', async () => {
    mockSearch([], 0);
    const { searchPlans, PLANS_PER_PAGE } = await import('@/lib/plans');
    await searchPlans({ query: 'walnut', page: 3 });

    expect(paramsOf(queryRaw.mock.calls[0]!)).toContain(2 * PLANS_PER_PAGE);
  });

  it('clamps a negative page instead of sending a negative OFFSET to Postgres', async () => {
    mockSearch([], 0);
    const { searchPlans } = await import('@/lib/plans');
    await searchPlans({ query: 'walnut', page: -3 });

    expect(paramsOf(queryRaw.mock.calls[0]!)).toContain(0);
  });

  it('returns zero results cleanly rather than querying for an empty id list', async () => {
    mockSearch([], 0);
    const { searchPlans } = await import('@/lib/plans');

    const result = await searchPlans({ query: 'nonexistentwood' });

    expect(result.plans).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
    // No point asking Prisma for `id IN ()`.
    expect(findMany).not.toHaveBeenCalled();
  });

  it('converts the bigint count Postgres returns into a number', async () => {
    // count(*) comes back as BigInt. Leaking that into the UI would throw on
    // JSON serialization ("Do not know how to serialize a BigInt").
    mockSearch(['p1'], 42);
    findMany.mockResolvedValue([{ id: 'p1' }]);

    const { searchPlans } = await import('@/lib/plans');
    const result = await searchPlans({ query: 'walnut' });

    expect(typeof result.total).toBe('number');
    expect(result.total).toBe(42);
  });
});
