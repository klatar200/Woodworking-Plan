import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Sprint 3 data-layer tests.
 *
 * The thing that matters here is not "does it return rows". It is: **can an
 * unpublished plan ever escape?** The `published` flag is the only thing standing
 * between staged, half-finished content and the public internet, and the filter
 * lives in this layer precisely so no page can forget it.
 */

const findMany = vi.fn();
const count = vi.fn();
const findFirst = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    plan = { findMany, count, findFirst };
    user = { upsert: vi.fn() };
    $queryRaw = vi.fn();
  },
}));

beforeEach(() => {
  vi.resetModules();
  findMany.mockReset().mockResolvedValue([]);
  count.mockReset().mockResolvedValue(0);
  findFirst.mockReset().mockResolvedValue(null);
});

describe('listPlans', () => {
  it('SECURITY: only ever queries published plans', async () => {
    const { listPlans } = await import('@/lib/plans');
    await listPlans();

    expect(findMany.mock.calls[0]![0].where).toEqual({ published: true });
    // The count must be filtered too — otherwise pagination advertises pages of
    // unpublished plans that render empty.
    expect(count.mock.calls[0]![0].where).toEqual({ published: true });
  });

  it('paginates — a 500-plan catalog must not be shipped to a phone at once', async () => {
    const { listPlans, PLANS_PER_PAGE } = await import('@/lib/plans');
    await listPlans({ page: 3 });

    const args = findMany.mock.calls[0]![0];
    expect(args.take).toBe(PLANS_PER_PAGE);
    expect(args.skip).toBe(2 * PLANS_PER_PAGE);
  });

  it('defaults to page 1', async () => {
    const { listPlans } = await import('@/lib/plans');
    await listPlans();
    expect(findMany.mock.calls[0]![0].skip).toBe(0);
  });

  it('clamps a garbage page number instead of handing Postgres a negative skip', async () => {
    const { listPlans } = await import('@/lib/plans');
    await listPlans({ page: -5 });

    expect(findMany.mock.calls[0]![0].skip).toBe(0);
  });

  it('reports total pages so the UI knows when to stop', async () => {
    count.mockResolvedValue(25);
    const { listPlans, PLANS_PER_PAGE } = await import('@/lib/plans');
    const result = await listPlans();

    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(Math.ceil(25 / PLANS_PER_PAGE));
  });

  it('reports at least one page even for an empty catalog', async () => {
    count.mockResolvedValue(0);
    const { listPlans } = await import('@/lib/plans');
    expect((await listPlans()).totalPages).toBe(1);
  });

  it('does not pull steps or cut lists into a list view', async () => {
    const { listPlans } = await import('@/lib/plans');
    await listPlans();

    const select = findMany.mock.calls[0]![0].select;
    expect(select.steps).toBeUndefined();
    expect(select.cutList).toBeUndefined();
    expect(select.materials).toBeUndefined();
    // But it does need what a card actually renders.
    expect(select.title).toBe(true);
    expect(select.difficulty).toBe(true);
    expect(select.costTier).toBe(true);
  });
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
    findFirst.mockResolvedValue(null);
    const { getPlanBySlug } = await import('@/lib/plans');

    // Both cases return null, so a 404 cannot be used to probe whether an
    // unreleased plan exists.
    expect(await getPlanBySlug('does-not-exist')).toBeNull();
  });

  it('orders steps by step number — steps out of order are wrong instructions', async () => {
    const { getPlanBySlug } = await import('@/lib/plans');
    await getPlanBySlug('edge-grain-maple-cutting-board');

    const include = findFirst.mock.calls[0]![0].include;
    expect(include.steps.orderBy).toEqual({ stepNumber: 'asc' });
    expect(include.cutList.orderBy).toEqual({ sortOrder: 'asc' });
    expect(include.materials.orderBy).toEqual({ sortOrder: 'asc' });
  });

  it('puts essential tools first — that is the question a maker is asking', async () => {
    const { getPlanBySlug } = await import('@/lib/plans');
    await getPlanBySlug('any-plan');

    expect(findFirst.mock.calls[0]![0].include.tools.orderBy).toEqual([
      { essential: 'desc' },
      { tool: { name: 'asc' } },
    ]);
  });
});

describe('listPublishedSlugs', () => {
  it('SECURITY: never exposes an unpublished slug', async () => {
    const { listPublishedSlugs } = await import('@/lib/plans');
    await listPublishedSlugs();

    expect(findMany.mock.calls[0]![0].where).toEqual({ published: true });
  });
});
