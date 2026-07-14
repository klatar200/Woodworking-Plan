import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Data-layer reads that aren't the filter/search query itself — plan detail,
 * slug listing, and the card projection. (queryPlans has its own file.)
 *
 * The thread running through all of it: `published: true` is on every read. It is
 * the only thing standing between staged, half-finished content and the public
 * internet, and it lives in this layer precisely so no page can forget it.
 */

const findMany = vi.fn();
const findFirst = vi.fn();
const count = vi.fn();
const categoryFindMany = vi.fn();
const toolFindMany = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    plan = { findMany, findFirst, count };
    category = { findMany: categoryFindMany };
    tool = { findMany: toolFindMany };
    user = { upsert: vi.fn() };
    $queryRaw = vi.fn().mockResolvedValue([]);
    $executeRaw = vi.fn();
  },
  // Sprint 19: src/lib/views.ts composes its ranking SQL with Prisma.sql/Prisma.empty.
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
    empty: null,
  },
}));

// Sprint 19: the card-projection tests pin `sort: 'newest'` — the new default
// ('trending') ranks through raw SQL and an id list, which is a different path and is
// tested in tests/views.test.ts. These tests are about the SELECT, not the ORDER BY.

beforeEach(() => {
  vi.resetModules();
  findMany.mockReset().mockResolvedValue([]);
  findFirst.mockReset().mockResolvedValue(null);
  count.mockReset().mockResolvedValue(0);
  categoryFindMany.mockReset().mockResolvedValue([]);
  toolFindMany.mockReset().mockResolvedValue([]);
});

describe('getPlanBySlug', () => {
  it('SECURITY: an unpublished plan is not reachable by guessing its slug', async () => {
    const { getPlanBySlug } = await import('@/lib/plans');
    await getPlanBySlug('a-staged-draft');

    expect(findFirst.mock.calls[0]![0].where).toEqual({
      slug: 'a-staged-draft',
      published: true,
    });
  });

  it('returns null for an unknown slug — indistinguishable from unpublished', async () => {
    // Both cases return null, so a 404 cannot be used to probe whether an
    // unreleased plan exists.
    const { getPlanBySlug } = await import('@/lib/plans');
    expect(await getPlanBySlug('does-not-exist')).toBeNull();
  });

  it('orders steps by step number — steps out of order are WRONG INSTRUCTIONS', async () => {
    const { getPlanBySlug } = await import('@/lib/plans');
    await getPlanBySlug('edge-grain-maple-cutting-board');

    const include = findFirst.mock.calls[0]![0].include;
    expect(include.steps.orderBy).toEqual({ stepNumber: 'asc' });
    expect(include.cutList.orderBy).toEqual({ sortOrder: 'asc' });
    expect(include.materials.orderBy).toEqual({ sortOrder: 'asc' });
  });

  it('puts essential tools first — that is the question a maker is actually asking', async () => {
    const { getPlanBySlug } = await import('@/lib/plans');
    await getPlanBySlug('any-plan');

    expect(findFirst.mock.calls[0]![0].include.tools.orderBy).toEqual([
      { essential: 'desc' },
      { tool: { name: 'asc' } },
    ]);
  });
});

describe('queryPlans — the card projection', () => {
  it('does not pull steps, cut lists or materials into a LIST view', async () => {
    const { queryPlans } = await import('@/lib/plans');
    await queryPlans({ sort: 'newest' });

    const select = findMany.mock.calls[0]![0].select;
    expect(select.steps).toBeUndefined();
    expect(select.cutList).toBeUndefined();
    expect(select.materials).toBeUndefined();
    expect(select.description).toBeUndefined();

    // But it does need what a card renders.
    expect(select.title).toBe(true);
    expect(select.difficulty).toBe(true);
    expect(select.costTier).toBe(true);
  });

  it('reports at least one page even for an empty catalog', async () => {
    count.mockResolvedValue(0);
    const { queryPlans } = await import('@/lib/plans');
    expect((await queryPlans({ sort: 'newest' })).totalPages).toBe(1);
  });

  it('reports total pages so the UI knows when to stop', async () => {
    count.mockResolvedValue(25);
    const { queryPlans, PLANS_PER_PAGE } = await import('@/lib/plans');
    const result = await queryPlans({ sort: 'newest' });

    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(Math.ceil(25 / PLANS_PER_PAGE));
  });
});

describe('listFilterableTools', () => {
  it('only offers tools that some PUBLISHED plan actually requires', async () => {
    // A filter option that returns nothing no matter what is just noise — and it
    // would also leak the existence of tools used only by unpublished plans.
    const { listFilterableTools } = await import('@/lib/plans');
    await listFilterableTools();

    expect(toolFindMany.mock.calls[0]![0].where).toEqual({
      plans: { some: { plan: { published: true } } },
    });
  });
});

describe('listPublishedSlugs', () => {
  it('SECURITY: never exposes an unpublished slug', async () => {
    const { listPublishedSlugs } = await import('@/lib/plans');
    await listPublishedSlugs();

    expect(findMany.mock.calls[0]![0].where).toEqual({ published: true });
  });
});
