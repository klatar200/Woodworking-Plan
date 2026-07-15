import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * My Workshop — Sprint 25. The owned-tools profile.
 *
 * Same threat model as saves/likes: user-owned rows, so IDOR is the risk. The tests pin
 * the two defences (no `userId` parameter; every write scoped by `userId` in its WHERE),
 * plus the two behaviours with real bug surface: replace-all semantics and validating
 * untrusted slugs against real tools.
 */

const userTool = { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() };
const tool = { findMany: vi.fn() };
const $transaction = vi.fn(async (ops: unknown[]) => ops);

const requireUser = vi.fn();
const getCurrentUser = vi.fn();

vi.mock('@/lib/db', () => ({ prisma: { userTool, tool, $transaction } }));
vi.mock('@/lib/auth', () => ({ requireUser, getCurrentUser }));

const ALICE = { id: 'user_alice' };

beforeEach(() => {
  vi.resetModules();
  userTool.findMany.mockReset().mockResolvedValue([]);
  userTool.deleteMany.mockReset().mockReturnValue({ op: 'delete' });
  userTool.createMany.mockReset().mockReturnValue({ op: 'create' });
  tool.findMany.mockReset().mockResolvedValue([]);
  $transaction.mockReset().mockResolvedValue([]);
  requireUser.mockReset().mockResolvedValue(ALICE);
  getCurrentUser.mockReset().mockResolvedValue(ALICE);
});

describe('SECURITY: no function takes a userId', () => {
  it('the owner is always the session — one argument each, and it is not an identity', async () => {
    const mod = await import('@/lib/workshop');
    expect(mod.getOwnedToolSlugs.length).toBe(0); // owner from session, no params
    expect(mod.setOwnedTools.length).toBe(1); // slugs only
  });
});

describe('getOwnedToolSlugs', () => {
  it('returns the session user’s tool slugs', async () => {
    userTool.findMany.mockResolvedValue([
      { tool: { slug: 'table-saw' } },
      { tool: { slug: 'router' } },
    ]);
    const { getOwnedToolSlugs } = await import('@/lib/workshop');
    expect(await getOwnedToolSlugs()).toEqual(['table-saw', 'router']);
    expect(userTool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_alice' } }),
    );
  });

  it('returns [] for an anonymous visitor and never queries — it runs on a public page', async () => {
    getCurrentUser.mockResolvedValue(null);
    const { getOwnedToolSlugs } = await import('@/lib/workshop');
    expect(await getOwnedToolSlugs()).toEqual([]);
    expect(userTool.findMany).not.toHaveBeenCalled();
  });
});

describe('setOwnedTools', () => {
  it('REPLACE-ALL: deletes the old set (scoped by userId) then creates the new one, in ONE transaction', async () => {
    tool.findMany.mockResolvedValue([{ id: 't_table' }, { id: 't_router' }]);
    const { setOwnedTools } = await import('@/lib/workshop');
    await setOwnedTools(['table-saw', 'router']);

    // Scoped delete — not a blanket wipe, not a delete-by-row-id.
    expect(userTool.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user_alice' } });
    expect(userTool.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          { userId: 'user_alice', toolId: 't_table' },
          { userId: 'user_alice', toolId: 't_router' },
        ],
      }),
    );
    // Both ops go through one transaction — the set is rewritten atomically.
    expect($transaction).toHaveBeenCalledTimes(1);
  });

  it('validates against real tools — a forged/unknown slug never becomes a row', async () => {
    // Only table-saw resolves; "not-a-tool" is dropped by the tool lookup.
    tool.findMany.mockResolvedValue([{ id: 't_table' }]);
    const { setOwnedTools } = await import('@/lib/workshop');
    await setOwnedTools(['table-saw', 'not-a-tool']);

    expect(tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: { in: ['table-saw', 'not-a-tool'] } } }),
    );
    expect(userTool.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: [{ userId: 'user_alice', toolId: 't_table' }] }),
    );
  });

  it('clearing the whole set deletes and creates nothing (no empty createMany)', async () => {
    const { setOwnedTools } = await import('@/lib/workshop');
    await setOwnedTools([]);

    expect(userTool.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user_alice' } });
    expect(userTool.createMany).not.toHaveBeenCalled();
    expect(tool.findMany).not.toHaveBeenCalled();
  });

  it('dedupes submitted slugs before resolving them', async () => {
    tool.findMany.mockResolvedValue([{ id: 't_table' }]);
    const { setOwnedTools } = await import('@/lib/workshop');
    await setOwnedTools(['table-saw', 'table-saw']);

    expect(tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: { in: ['table-saw'] } } }),
    );
  });
});
