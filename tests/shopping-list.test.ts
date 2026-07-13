import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Shopping list — Sprint 12.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * THE MERGE RULE IS THE WHOLE SPRINT, AND ITS FAILURE MODE IS A SAFETY PROBLEM.
 *
 * A shopping list that OVER-merges sends someone to a hardware store to buy the
 * WRONG SCREWS, with a confident quantity printed next to it. That is worse than a
 * list that is merely long, because the user has no way to notice.
 *
 * So the tests here are mostly about what must NOT be merged, and about never
 * printing a total that is quietly missing items.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const savedPlan = { findMany: vi.fn() };
const collection = { findFirst: vi.fn() };
const requireUser = vi.fn();

vi.mock('@/lib/db', () => ({ prisma: { savedPlan, collection } }));
vi.mock('@/lib/auth', () => ({ requireUser }));

const ALICE = { id: 'user_alice' };

const PLAN_A = { slug: 'cedar-bed', title: 'Cedar Raised Bed' };
const PLAN_B = { slug: 'planter', title: 'Cedar Planter' };

const material = (over: Record<string, unknown> = {}) => ({
  name: 'Cedar, 1x6, 8 ft',
  unit: 'each',
  species: 'Western Red Cedar',
  quantity: 5,
  costCents: 1200,
  plan: PLAN_A,
  ...over,
});

beforeEach(() => {
  vi.resetModules();
  savedPlan.findMany.mockReset().mockResolvedValue([]);
  collection.findFirst.mockReset();
  requireUser.mockReset().mockResolvedValue(ALICE);
});

describe('SAFETY: what must NOT be merged', () => {
  it('does NOT merge two different screws just because both say "screws"', async () => {
    const { mergeMaterials } = await import('@/lib/shopping-list');

    // Both of these are real lines from the catalog. A "clever" aggregator merges
    // them. The result sends someone to buy the wrong hardware.
    const lines = mergeMaterials([
      material({
        name: 'Stainless steel screws, #8 x 1-1/4" and 2"',
        species: null,
        quantity: 60,
        costCents: 900,
      }),
      material({
        name: 'Exterior screws, stainless or coated, 1-5/8"',
        species: null,
        quantity: 30,
        costCents: 700,
        plan: PLAN_B,
      }),
    ]);

    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.quantity).sort()).toEqual([30, 60]);
  });

  it('NEVER merges across units — board feet and each do not add up', async () => {
    const { mergeMaterials } = await import('@/lib/shopping-list');

    const lines = mergeMaterials([
      material({ name: 'Walnut', unit: 'board feet', quantity: 6 }),
      material({ name: 'Walnut', unit: 'each', quantity: 2, plan: PLAN_B }),
    ]);

    // A merge key that ignored the unit would produce "8" — which is not a quantity
    // of anything that exists.
    expect(lines).toHaveLength(2);
  });

  it('does not merge the same name across different species', async () => {
    const { mergeMaterials } = await import('@/lib/shopping-list');

    const lines = mergeMaterials([
      material({ name: 'Board, 4/4', species: 'Walnut', quantity: 3 }),
      material({ name: 'Board, 4/4', species: 'Maple', quantity: 2, plan: PLAN_B }),
    ]);

    // Walnut and maple are not interchangeable, and the price difference is roughly
    // 4x. Merging them would be wrong in both quantity and cost.
    expect(lines).toHaveLength(2);
  });

  it('normalizes ONLY case and whitespace — not punctuation, not plurals', async () => {
    const { mergeKey } = await import('@/lib/shopping-list');

    const base = { name: 'Cedar, 1x6, 8 ft', unit: 'each', species: 'Cedar' };

    // These SHOULD collide: same thing, sloppier typing.
    expect(mergeKey(base)).toBe(
      mergeKey({ name: '  cedar,   1x6,  8 FT ', unit: 'Each', species: 'cedar' }),
    );

    // These must NOT: stripping punctuation or stemming is a step toward merging two
    // different screws, and there is no safe amount of that.
    expect(mergeKey(base)).not.toBe(
      mergeKey({ name: 'Cedar 1x6 8 ft', unit: 'each', species: 'Cedar' }),
    );
  });

  it('the merge key separator cannot be forged from field content', async () => {
    const { mergeKey } = await import('@/lib/shopping-list');

    // A separator that can appear in the data lets two DIFFERENT materials collide
    // into one key. The separator is a NUL byte for exactly this reason.
    const a = mergeKey({ name: 'Pine|each', unit: '', species: null });
    const b = mergeKey({ name: 'Pine', unit: 'each', species: null });

    expect(a).not.toBe(b);
  });
});

describe('what SHOULD merge', () => {
  it('sums identical materials across plans, and records both plans', async () => {
    const { mergeMaterials } = await import('@/lib/shopping-list');

    const lines = mergeMaterials([
      material({ quantity: 5, costCents: 1200, plan: PLAN_A }),
      material({ quantity: 3, costCents: 720, plan: PLAN_B }),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]!.quantity).toBe(8);
    expect(lines[0]!.costCents).toBe(1920);

    // The user asked for a consolidated list. They did not agree to lose track of WHY
    // each line is on it.
    expect(lines[0]!.plans.map((p) => p.slug)).toEqual(['cedar-bed', 'planter']);
  });

  it('does not list the same plan twice when it repeats a material', async () => {
    const { mergeMaterials } = await import('@/lib/shopping-list');

    const lines = mergeMaterials([
      material({ quantity: 2, plan: PLAN_A }),
      material({ quantity: 3, plan: PLAN_A }),
    ]);

    expect(lines[0]!.quantity).toBe(5);
    expect(lines[0]!.plans).toHaveLength(1);
  });
});

describe('MONEY: never print a total that is quietly missing items', () => {
  it('an unpriced line makes the MERGED line unpriced — null is contagious', async () => {
    const { mergeMaterials } = await import('@/lib/shopping-list');

    const lines = mergeMaterials([
      material({ quantity: 5, costCents: 1200 }),
      material({ quantity: 3, costCents: null, plan: PLAN_B }),
    ]);

    // The alternative is showing $12.00 as though it were the total: a number that is
    // WRONG in the direction of "cheaper than reality", with a dollar sign in front of
    // it, next to something a person is about to go and buy.
    expect(lines[0]!.costCents).toBeNull();
    expect(lines[0]!.quantity).toBe(8); // the QUANTITY is still known and still right
  });

  it('the LIST total is null when any line is unpriced', async () => {
    savedPlan.findMany.mockResolvedValue([
      {
        plan: {
          slug: 'p',
          title: 'P',
          published: true,
          materials: [
            { name: 'Cedar', unit: 'each', species: null, quantity: 2, costCents: 500 },
            { name: 'Scrap', unit: 'each', species: null, quantity: 1, costCents: null },
          ],
        },
      },
    ]);

    const { getShoppingList } = await import('@/lib/shopping-list');
    const list = await getShoppingList();

    expect(list.totalCents).toBeNull();
    expect(list.hasUnpricedLines).toBe(true);
  });

  it('the total is a real sum when everything IS priced', async () => {
    savedPlan.findMany.mockResolvedValue([
      {
        plan: {
          slug: 'p',
          title: 'P',
          published: true,
          materials: [
            { name: 'Cedar', unit: 'each', species: null, quantity: 2, costCents: 500 },
            { name: 'Glue', unit: 'oz', species: null, quantity: 4, costCents: 250 },
          ],
        },
      },
    ]);

    const { getShoppingList } = await import('@/lib/shopping-list');
    const list = await getShoppingList();

    // Integer cents throughout. Money is never a float.
    expect(list.totalCents).toBe(750);
    expect(list.hasUnpricedLines).toBe(false);
  });
});

describe('MULTI-TENANCY', () => {
  it('IDOR TRIPWIRE: getShoppingList takes exactly ONE param, and it is not an identity', async () => {
    const { getShoppingList } = await import('@/lib/shopping-list');

    // Exactly one: `collectionId`. The OWNER is never a parameter — it comes from the
    // verified session. If this ever becomes 2, someone added an identity argument,
    // and that is an IDOR: a caller would simply pass somebody else's id.
    //
    // (Note for anyone tempted to "fix" this to 0: an optional TS parameter still
    // counts toward Function.length. The number 1 is correct and load-bearing.)
    expect(getShoppingList.length).toBe(1);
  });

  it('scopes saved plans to the session user', async () => {
    const { getShoppingList } = await import('@/lib/shopping-list');
    await getShoppingList();

    expect(savedPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user_alice' }),
      }),
    );
  });

  it("SECURITY: someone else's collection id yields an EMPTY list, not their materials", async () => {
    // The collection lookup is scoped by userId, so Bob's id does not resolve.
    collection.findFirst.mockResolvedValue(null);

    const { getShoppingList } = await import('@/lib/shopping-list');
    const list = await getShoppingList('bobs_collection');

    expect(list.planCount).toBe(0);
    expect(list.groups).toEqual([]);

    // And it never went looking for the plans. Empty is indistinguishable from "that
    // collection is empty" — "exists but is not yours" is an existence oracle.
    expect(savedPlan.findMany).not.toHaveBeenCalled();
    expect(collection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bobs_collection', userId: 'user_alice' },
      }),
    );
  });

  it('scopes the collection filter by userId on the saved-plan query too', async () => {
    collection.findFirst.mockResolvedValue({ name: 'For the Cabin' });

    const { getShoppingList } = await import('@/lib/shopping-list');
    await getShoppingList('col_1');

    const where = savedPlan.findMany.mock.calls[0]![0].where;

    // Belt AND braces. Two independent scopes, because one forgotten filter is how a
    // multi-tenancy bug ships while still "working".
    expect(where.userId).toBe('user_alice');
    expect(where.collections.some.collection).toEqual({
      id: 'col_1',
      userId: 'user_alice',
    });
  });
});

describe('published: true is enforced', () => {
  it('an unpublished plan contributes NO materials, even if it was saved', async () => {
    savedPlan.findMany.mockResolvedValue([
      {
        plan: {
          slug: 'staged',
          title: 'Staged',
          published: false,
          materials: [
            { name: 'Secret', unit: 'each', species: null, quantity: 1, costCents: 100 },
          ],
        },
      },
      {
        plan: {
          slug: 'live',
          title: 'Live',
          published: true,
          materials: [
            { name: 'Cedar', unit: 'each', species: null, quantity: 2, costCents: 500 },
          ],
        },
      },
    ]);

    const { getShoppingList } = await import('@/lib/shopping-list');
    const list = await getShoppingList();

    // Leaking a staged plan's materials to whoever saved it before it was pulled is
    // still leaking it.
    expect(list.planCount).toBe(1);
    const names = list.groups.flatMap((g) => g.lines.map((l) => l.name));
    expect(names).toEqual(['Cedar']);
  });
});

describe('grouping and presentation', () => {
  it('groups by unit — you buy board feet and screws in different aisles', async () => {
    savedPlan.findMany.mockResolvedValue([
      {
        plan: {
          slug: 'p',
          title: 'P',
          published: true,
          materials: [
            { name: 'Walnut', unit: 'board feet', species: 'Walnut', quantity: 6, costCents: 4000 },
            { name: 'Screws', unit: 'each', species: null, quantity: 40, costCents: 600 },
            { name: 'Oil', unit: 'oz', species: null, quantity: 8, costCents: 500 },
          ],
        },
      },
    ]);

    const { getShoppingList } = await import('@/lib/shopping-list');
    const list = await getShoppingList();

    expect(list.groups.map((g) => g.unit)).toEqual(['board feet', 'each', 'oz']);
    expect(list.lineCount).toBe(3);
  });

  it('an empty library gives an empty list, not a crash', async () => {
    const { getShoppingList } = await import('@/lib/shopping-list');
    const list = await getShoppingList();

    expect(list.planCount).toBe(0);
    expect(list.lineCount).toBe(0);
    expect(list.groups).toEqual([]);
  });
});
