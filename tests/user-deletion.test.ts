import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Clerk user-deletion cleanup — the data-retention half of identity sync.
 *
 * Lazy sync (src/lib/auth.ts) creates the mirror row; it cannot react to DELETION.
 * This module does. The properties that matter:
 *
 *   1. Build-photo BLOBS are deleted BEFORE the row — the DB cascade removes the
 *      BuildPhoto rows but cannot reach object storage, so a cascade alone would
 *      orphan the files on Vercel Blob forever.
 *   2. It is IDEMPOTENT — Svix retries deliveries, so a second delete of the same
 *      user must be a clean no-op, not an error.
 *   3. It keys on clerkId and deletes only our mirror row; the cascade does the rest.
 */

const buildPhoto = { findMany: vi.fn() };
const user = { deleteMany: vi.fn() };
const deleteImages = vi.fn();

vi.mock('@/lib/db', () => ({ prisma: { buildPhoto, user } }));
vi.mock('@/lib/storage', () => ({ deleteImages }));

beforeEach(() => {
  vi.resetModules();
  buildPhoto.findMany.mockReset();
  user.deleteMany.mockReset();
  deleteImages.mockReset();

  buildPhoto.findMany.mockResolvedValue([]);
  user.deleteMany.mockResolvedValue({ count: 1 });
  deleteImages.mockResolvedValue(undefined);
});

describe('deleteUserByClerkId', () => {
  it('deletes the mirror row keyed by clerkId — the cascade removes saves/likes/reviews', async () => {
    const { deleteUserByClerkId } = await import('@/lib/user-deletion');
    await deleteUserByClerkId('user_clerk_123');

    expect(user.deleteMany).toHaveBeenCalledWith({ where: { clerkId: 'user_clerk_123' } });
  });

  it('gathers build photos via the review relation, selecting only the blob path', async () => {
    const { deleteUserByClerkId } = await import('@/lib/user-deletion');
    await deleteUserByClerkId('user_clerk_123');

    expect(buildPhoto.findMany).toHaveBeenCalledWith({
      where: { review: { user: { clerkId: 'user_clerk_123' } } },
      select: { blobPath: true },
    });
  });

  it('deletes blobs BEFORE the rows — a DB cascade cannot reach object storage', async () => {
    buildPhoto.findMany.mockResolvedValue([
      { blobPath: 'build-photos/a/1.webp' },
      { blobPath: 'build-photos/b/2.webp' },
    ]);

    const order: string[] = [];
    deleteImages.mockImplementation(async () => {
      order.push('blobs');
    });
    user.deleteMany.mockImplementation(async () => {
      order.push('rows');
      return { count: 1 };
    });

    const { deleteUserByClerkId } = await import('@/lib/user-deletion');
    const result = await deleteUserByClerkId('user_clerk_123');

    expect(deleteImages).toHaveBeenCalledWith([
      'build-photos/a/1.webp',
      'build-photos/b/2.webp',
    ]);
    expect(order).toEqual(['blobs', 'rows']); // blobs first, always
    expect(result.blobsDeleted).toBe(2);
  });

  it('is idempotent — a re-delivered deletion finds no rows and no-ops cleanly', async () => {
    buildPhoto.findMany.mockResolvedValue([]);
    user.deleteMany.mockResolvedValue({ count: 0 });

    const { deleteUserByClerkId } = await import('@/lib/user-deletion');
    const result = await deleteUserByClerkId('user_already_gone');

    expect(result).toEqual({ usersDeleted: 0, blobsDeleted: 0 });
    expect(deleteImages).toHaveBeenCalledWith([]); // nothing to delete
  });

  it('still deletes the row when the user has no photos', async () => {
    const { deleteUserByClerkId } = await import('@/lib/user-deletion');
    await deleteUserByClerkId('user_clerk_123');

    expect(user.deleteMany).toHaveBeenCalledOnce();
  });
});
