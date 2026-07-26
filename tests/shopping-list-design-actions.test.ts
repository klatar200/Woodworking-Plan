import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Sprint 64 — shopping-list actions for board designs.
 * Actions never throw; both planId+designId → bounce before DB.
 */

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const revalidatePath = vi.fn();
const checkRateLimit = vi.fn();
const addToShoppingList = vi.fn();
const addBoardDesignToShoppingList = vi.fn();
const removeFromShoppingList = vi.fn();
const removeBoardDesignFromShoppingList = vi.fn();
const guardAction = vi.fn(async (work: Promise<unknown>) => {
  await work;
});

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit }));
vi.mock('@/lib/shopping-list', () => ({
  addToShoppingList,
  addBoardDesignToShoppingList,
  removeFromShoppingList,
  removeBoardDesignFromShoppingList,
}));
vi.mock('@/lib/action-guard', () => ({ guardAction }));

function fd(entries: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(entries)) form.set(k, v);
  return form;
}

beforeEach(() => {
  vi.resetModules();
  redirect.mockClear();
  revalidatePath.mockClear();
  checkRateLimit.mockReset().mockResolvedValue(true);
  addToShoppingList.mockReset().mockResolvedValue(undefined);
  addBoardDesignToShoppingList.mockReset().mockResolvedValue(undefined);
  removeFromShoppingList.mockReset().mockResolvedValue(undefined);
  removeBoardDesignFromShoppingList.mockReset().mockResolvedValue(undefined);
  guardAction.mockClear().mockImplementation(async (work: Promise<unknown>) => {
    await work;
  });
});

describe('addBoardDesignToShoppingListAction', () => {
  it('creates via lib with session ownership; forged userId ignored', async () => {
    const { addBoardDesignToShoppingListAction } = await import(
      '@/app/actions/shopping-list'
    );
    await expect(
      addBoardDesignToShoppingListAction(
        fd({ designId: 'des_1', userId: 'forged_evil', returnTo: '/designer/des_1' }),
      ),
    ).rejects.toThrow(/NEXT_REDIRECT:\/shopping-list/);

    expect(addBoardDesignToShoppingList).toHaveBeenCalledWith('des_1');
    expect(addBoardDesignToShoppingList).not.toHaveBeenCalledWith(
      expect.anything(),
      'forged_evil',
    );
  });

  it('rejects both planId and designId without calling the lib (no throw to client)', async () => {
    const { addBoardDesignToShoppingListAction } = await import(
      '@/app/actions/shopping-list'
    );
    await expect(
      addBoardDesignToShoppingListAction(
        fd({ designId: 'des_1', planId: 'plan_1', returnTo: '/designer/des_1' }),
      ),
    ).rejects.toThrow(/NEXT_REDIRECT/);

    expect(addBoardDesignToShoppingList).not.toHaveBeenCalled();
    expect(addToShoppingList).not.toHaveBeenCalled();
  });

  it('rate-limit denial no-ops with feedback and creates nothing', async () => {
    checkRateLimit.mockResolvedValue(false);
    const { addBoardDesignToShoppingListAction } = await import(
      '@/app/actions/shopping-list'
    );
    await expect(
      addBoardDesignToShoppingListAction(fd({ designId: 'des_1', returnTo: '/designer/des_1' })),
    ).rejects.toThrow(/notice=slow-down/);

    expect(addBoardDesignToShoppingList).not.toHaveBeenCalled();
  });

  it('malformed input bounces without throwing an HTTP 500', async () => {
    const { addBoardDesignToShoppingListAction } = await import(
      '@/app/actions/shopping-list'
    );
    await expect(
      addBoardDesignToShoppingListAction(fd({ returnTo: '/designer' })),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(addBoardDesignToShoppingList).not.toHaveBeenCalled();
  });
});

describe('addToShoppingListAction — exactly-one', () => {
  it('rejects both planId and boardDesignId before the DB', async () => {
    const { addToShoppingListAction } = await import('@/app/actions/shopping-list');
    await expect(
      addToShoppingListAction(
        fd({ planId: 'plan_1', boardDesignId: 'des_1', returnTo: '/' }),
      ),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(addToShoppingList).not.toHaveBeenCalled();
  });
});

describe('removeFromShoppingListAction — design', () => {
  it('removes by designId without requiring planId', async () => {
    const { removeFromShoppingListAction } = await import(
      '@/app/actions/shopping-list'
    );
    await removeFromShoppingListAction(
      fd({ designId: 'des_1', returnTo: '/shopping-list' }),
    );
    expect(removeBoardDesignFromShoppingList).toHaveBeenCalledWith('des_1');
    expect(removeFromShoppingList).not.toHaveBeenCalled();
  });

  it('rejects both ids', async () => {
    const { removeFromShoppingListAction } = await import(
      '@/app/actions/shopping-list'
    );
    await expect(
      removeFromShoppingListAction(
        fd({ planId: 'plan_1', designId: 'des_1', returnTo: '/shopping-list' }),
      ),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(removeBoardDesignFromShoppingList).not.toHaveBeenCalled();
    expect(removeFromShoppingList).not.toHaveBeenCalled();
  });
});

describe('schema — cascade + xor', () => {
  it('migration cascades boardDesign delete and enforces xor CHECK', async () => {
    const fs = await import('node:fs');
    const sql = fs.readFileSync(
      'prisma/migrations/20260726160000_shopping_list_board_design/migration.sql',
      'utf8',
    );
    expect(sql).toMatch(/ON DELETE CASCADE/);
    expect(sql).toMatch(/ShoppingListEntry_plan_xor_design_check/);
    expect(sql).toMatch(/ShoppingListEntry_userId_boardDesignId_key/);
    // Documented: Postgres UNIQUE allows multiple NULL planId / boardDesignId rows.
    expect(sql).toMatch(/Postgres treats NULLs as distinct/);
  });
});
