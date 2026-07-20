import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * QOL-L — GET /api/workshop, the data the AccountModal fetches.
 *
 * It is a PRIVATE route (off the allowlist → middleware `auth.protect()`s it). This test
 * pins the second, independent gate: the handler itself 401s an anonymous caller and does
 * NOT query, and returns the tool list + the session's owned slugs otherwise. No `userId`
 * is ever read from the request.
 */

const getCurrentUser = vi.fn();
const listFilterableTools = vi.fn();
const getOwnedToolSlugs = vi.fn();

vi.mock('@/lib/auth', () => ({ getCurrentUser }));
vi.mock('@/lib/plans', () => ({ listFilterableTools }));
vi.mock('@/lib/workshop', () => ({ getOwnedToolSlugs }));

beforeEach(() => {
  vi.resetModules();
  getCurrentUser.mockReset();
  listFilterableTools.mockReset().mockResolvedValue([]);
  getOwnedToolSlugs.mockReset().mockResolvedValue([]);
});

describe('GET /api/workshop', () => {
  it('401s an anonymous request WITHOUT querying', async () => {
    getCurrentUser.mockResolvedValue(null);
    const { GET } = await import('@/app/api/workshop/route');
    const res = await GET();

    expect(res.status).toBe(401);
    expect(listFilterableTools).not.toHaveBeenCalled();
    expect(getOwnedToolSlugs).not.toHaveBeenCalled();
  });

  it('returns the tool list and the session user’s owned slugs', async () => {
    getCurrentUser.mockResolvedValue({ id: 'user_alice' });
    listFilterableTools.mockResolvedValue([
      { slug: 'table-saw', name: 'Table Saw', category: 'Power Saw' },
    ]);
    getOwnedToolSlugs.mockResolvedValue(['table-saw']);

    const { GET } = await import('@/app/api/workshop/route');
    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      tools: [{ slug: 'table-saw', name: 'Table Saw', category: 'Power Saw' }],
      owned: ['table-saw'],
    });
  });
});
