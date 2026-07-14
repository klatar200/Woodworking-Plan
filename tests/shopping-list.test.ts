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

// Sprint 22: the list is built from ShoppingListEntry (explicit adds), not SavedPlan.
const shoppingListEntry = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
};
const requireUser = vi.fn();
const getCurrentUser = vi.fn();

vi.mock('@/lib/db', () => ({ prisma: { shoppingListEntry } }));
vi.mock('@/lib/auth', () => ({ requireUser, getCurrentUser }));

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
  shoppingListEntry.findMany.mockReset().mockResolvedValue([]);
  shoppingListEntry.findUnique.mockReset().mockResolvedValue(null);
  shoppingListEntry.upsert.mockReset().mockResolvedValue({});
  shoppingListEntry.deleteMany.mockReset().mockResolvedValue({ count: 0 });
  requireUser.mockReset().mockResolvedValue(ALICE);
  getCurrentUser.mockReset().mockResolvedValue(ALICE);
});

/** Shape a ShoppingListEntry row the way getShoppingList selects it. */
const entry = (plan: {
  slug: string;
  title: string;
  published?: boolean;
  materials: unknown[];
}) => ({ plan: { published: true, ...plan } });

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

describe('CONSUMABLES are generic, so they merge on their own', () => {
  it('two plans that both need wood glue produce ONE line', async () => {
    const { mergeMaterials } = await import('@/lib/shopping-list');

    // This is the fix for `Titebond II glue` vs `Titebond II wood glue`, and note
    // WHERE the fix lives: in the CONTENT, not in a fuzzy matcher. Once both plans say
    // "Wood glue", exact merging combines them by itself. The code did not need to get
    // cleverer — the data needed to stop being over-specified.
    const lines = mergeMaterials([
      material({ name: 'Wood glue', unit: 'oz', species: null, quantity: 4, costCents: 400 }),
      material({
        name: 'Wood glue',
        unit: 'oz',
        species: null,
        quantity: 6,
        costCents: 600,
        plan: PLAN_B,
      }),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]!.quantity).toBe(10);
  });

  it('but waterproof glue stays SEPARATE from ordinary wood glue', async () => {
    const { mergeMaterials } = await import('@/lib/shopping-list');

    // Generic is right for brand. It is NOT right for a property that changes what you
    // must buy: a cutting board or an outdoor chair needs a waterproof (Type I) glue,
    // and handing someone interior PVA for a planter box is a ruined project.
    const lines = mergeMaterials([
      material({ name: 'Wood glue', unit: 'oz', species: null, quantity: 4 }),
      material({
        name: 'Waterproof wood glue',
        unit: 'oz',
        species: null,
        quantity: 4,
        plan: PLAN_B,
      }),
    ]);

    expect(lines).toHaveLength(2);
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

describe('MONEY: a ballpark, marked as one — not silence', () => {
  it('sums what it knows and COUNTS what it does not', async () => {
    const { mergeMaterials } = await import('@/lib/shopping-list');

    const lines = mergeMaterials([
      material({ quantity: 5, costCents: 1200 }),
      material({ quantity: 3, costCents: null, plan: PLAN_B }),
    ]);

    // An earlier version made null CONTAGIOUS: one unpriced contributor and the whole
    // line went to null, on the grounds that a partial sum is "a lie". That threw away
    // a useful number to avoid a precision nobody asked for, and left the user with
    // nothing. The honesty belongs in the "≈" and the count — not in refusing to answer.
    expect(lines[0]!.costCents).toBe(1200);
    expect(lines[0]!.unpricedCount).toBe(1);
    expect(lines[0]!.quantity).toBe(8);
  });

  it('the LIST total is always a number, with a count of what is missing', async () => {
    shoppingListEntry.findMany.mockResolvedValue([
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

    // The number's JOB is to stop someone expecting an end-grain butcher block for
    // $10. A blank does not do that job; "≈ $5.00, 1 item has no estimate" does.
    expect(list.totalCents).toBe(500);
    expect(list.unpricedCount).toBe(1);
  });

  it('the total is exact when everything IS priced', async () => {
    shoppingListEntry.findMany.mockResolvedValue([
      {
        plan: {
          slug: 'p',
          title: 'P',
          published: true,
          materials: [
            { name: 'Cedar', unit: 'each', species: null, quantity: 2, costCents: 500 },
            { name: 'Wood glue', unit: 'oz', species: null, quantity: 4, costCents: 250 },
          ],
        },
      },
    ]);

    const { getShoppingList } = await import('@/lib/shopping-list');
    const list = await getShoppingList();

    // Integer cents throughout. Money is never a float.
    expect(list.totalCents).toBe(750);
    expect(list.unpricedCount).toBe(0);
  });
});

describe('MULTI-TENANCY', () => {
  it('IDOR TRIPWIRE: getShoppingList takes NO parameters — the owner is the session', async () => {
    const { getShoppingList } = await import('@/lib/shopping-list');

    // Sprint 22 dropped the `collectionId` argument. The owner has never been a
    // parameter and now nothing is. If this ever becomes > 0, someone added an argument;
    // if that argument is an identity, it is an IDOR — a caller would pass someone
    // else's id. Zero is correct and load-bearing.
    expect(getShoppingList.length).toBe(0);
  });

  it('scopes the entry query to the session user', async () => {
    const { getShoppingList } = await import('@/lib/shopping-list');
    await getShoppingList();

    expect(shoppingListEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user_alice' }),
      }),
    );
  });

  it('add/remove/isOn never take a userId — the owner is the session', async () => {
    const mod = await import('@/lib/shopping-list');
    // One argument each: the planId. Never an identity.
    expect(mod.addToShoppingList.length).toBe(1);
    expect(mod.removeFromShoppingList.length).toBe(1);
    expect(mod.isOnShoppingList.length).toBe(1);
  });

  it('add is idempotent and scoped by userId (upsert on the composite key)', async () => {
    const { addToShoppingList } = await import('@/lib/shopping-list');
    await addToShoppingList('plan_1');

    expect(shoppingListEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_planId: { userId: 'user_alice', planId: 'plan_1' } },
        create: { userId: 'user_alice', planId: 'plan_1' },
      }),
    );
  });

  it('remove is scoped by userId in the WHERE — a guessed row id affects zero rows', async () => {
    const { removeFromShoppingList } = await import('@/lib/shopping-list');
    await removeFromShoppingList('plan_1');

    // deleteMany({ where: { userId, planId } }) — NOT delete({ where: { id } }).
    expect(shoppingListEntry.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user_alice', planId: 'plan_1' },
    });
  });

  it('isOnShoppingList is false for an anonymous visitor and never queries', async () => {
    getCurrentUser.mockResolvedValue(null);
    const { isOnShoppingList } = await import('@/lib/shopping-list');

    expect(await isOnShoppingList('plan_1')).toBe(false);
    expect(shoppingListEntry.findUnique).not.toHaveBeenCalled();
  });
});

describe('the two views (Sprint 22)', () => {
  const twoPlans = [
    entry({
      slug: 'a',
      title: 'Plan A',
      materials: [
        { name: 'Wood glue', unit: 'oz', species: null, quantity: 4, costCents: 400 },
        { name: 'Cedar', unit: 'board feet', species: 'Cedar', quantity: 6, costCents: 3000 },
      ],
    }),
    entry({
      slug: 'b',
      title: 'Plan B',
      materials: [
        { name: 'Wood glue', unit: 'oz', species: null, quantity: 6, costCents: 600 },
      ],
    }),
  ];

  it('MERGED view combines the shared item across plans', async () => {
    shoppingListEntry.findMany.mockResolvedValue(twoPlans);
    const { getShoppingList } = await import('@/lib/shopping-list');
    const list = await getShoppingList();

    const glue = list.groups
      .flatMap((g) => g.lines)
      .find((l) => l.name === 'Wood glue');
    expect(glue!.quantity).toBe(10); // 4 + 6
    expect(glue!.plans.map((p) => p.slug).sort()).toEqual(['a', 'b']);
  });

  it('BY-PLAN view keeps each plan separate and UNMERGED', async () => {
    shoppingListEntry.findMany.mockResolvedValue(twoPlans);
    const { getShoppingList } = await import('@/lib/shopping-list');
    const list = await getShoppingList();

    expect(list.byPlan.map((p) => p.slug)).toEqual(['a', 'b']);
    // Plan A keeps its own two lines; the glue is NOT merged with Plan B's here.
    expect(list.byPlan[0]!.lines.map((l) => l.name)).toEqual(['Wood glue', 'Cedar']);
    const bGlue = list.byPlan[1]!.lines.find((l) => l.name === 'Wood glue');
    expect(bGlue!.quantity).toBe(6); // NOT 10 — by-plan is unmerged
  });

  it('the whole-list total is the same regardless of view', async () => {
    shoppingListEntry.findMany.mockResolvedValue(twoPlans);
    const { getShoppingList } = await import('@/lib/shopping-list');
    const list = await getShoppingList();
    expect(list.totalCents).toBe(4000); // 400 + 3000 + 600
  });
});

describe('published: true is enforced', () => {
  it('an unpublished plan contributes NO materials, even if it was saved', async () => {
    shoppingListEntry.findMany.mockResolvedValue([
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
    shoppingListEntry.findMany.mockResolvedValue([
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
