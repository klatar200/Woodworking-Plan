import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Reviews, ratings and build photos — Sprint 10.
 *
 * THE PROPERTIES THAT MATTER, and they are the same three as every other write in
 * this codebase, because the whole point is that they never vary:
 *
 *   1. NO FUNCTION TAKES A `userId`. The author is the verified session, always.
 *      Asserted by ARITY — if a signature ever grows a userId parameter, this test
 *      goes red. That is the tripwire; a comment saying "don't do this" is not.
 *   2. EVERY WRITE IS SCOPED BY THE OWNER IN THE `WHERE` CLAUSE. Not by an `if`
 *      above the query — a `delete({ where: { id }})` guarded by an if is one
 *      refactor away from being an IDOR.
 *   3. ADMIN FAILS CLOSED. Unset config means NOBODY is an admin.
 */

const review = {
  upsert: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  aggregate: vi.fn(),
  groupBy: vi.fn(),
};
const buildPhoto = { findFirst: vi.fn(), deleteMany: vi.fn() };
const plan = { findFirst: vi.fn() };
const user = { findUnique: vi.fn() };

const requireUser = vi.fn();
const getCurrentUser = vi.fn();
const processImage = vi.fn();
const uploadImage = vi.fn();
const deleteImages = vi.fn();
const isStorageConfigured = vi.fn();

vi.mock('@/lib/db', () => ({ prisma: { review, buildPhoto, plan, user } }));
vi.mock('@/lib/auth', () => ({ requireUser, getCurrentUser }));
vi.mock('@/lib/storage', () => ({
  processImage,
  uploadImage,
  deleteImages,
  isStorageConfigured,
}));

const ALICE = { id: 'user_alice' };
const BOB = { id: 'user_bob' };

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();

  for (const fn of [
    review.upsert,
    review.findFirst,
    review.findUnique,
    review.findMany,
    review.deleteMany,
    review.aggregate,
    review.groupBy,
    buildPhoto.findFirst,
    buildPhoto.deleteMany,
    plan.findFirst,
    user.findUnique,
    requireUser,
    getCurrentUser,
    processImage,
    uploadImage,
    deleteImages,
    isStorageConfigured,
  ]) {
    fn.mockReset();
  }

  requireUser.mockResolvedValue(ALICE);
  getCurrentUser.mockResolvedValue(ALICE);
  plan.findFirst.mockResolvedValue({ id: 'plan_1', slug: 'cedar-bed' });
  review.upsert.mockResolvedValue({ id: 'review_1' });
  review.deleteMany.mockResolvedValue({ count: 1 });
  isStorageConfigured.mockReturnValue(true);
  deleteImages.mockResolvedValue(undefined);
  user.findUnique.mockResolvedValue({ clerkId: 'clerk_alice' });
});

describe('IDOR TRIPWIRE: no function accepts a userId', () => {
  it('the write functions take exactly the arguments they should', async () => {
    const { upsertReview, deleteReview, deleteBuildPhoto } = await import('@/lib/reviews');

    // upsertReview(input), deleteReview(reviewId), deleteBuildPhoto(photoId).
    // The owner is NEVER an argument — it is derived from the verified session. An
    // extra parameter here is an attacker passing somebody else's id.
    expect(upsertReview.length).toBe(1);
    expect(deleteReview.length).toBe(1);
    expect(deleteBuildPhoto.length).toBe(1);
  });
});

describe('MULTI-TENANCY: a user cannot touch another user’s review', () => {
  it('a non-admin delete is scoped by userId IN THE WHERE CLAUSE', async () => {
    vi.stubEnv('ADMIN_USER_IDS', ''); // nobody is an admin
    review.findFirst.mockResolvedValue({ id: 'review_1', photos: [] });

    const { deleteReview } = await import('@/lib/reviews');
    await deleteReview('review_1');

    // The authorization IS the query. A stranger who guesses a cuid matches zero
    // rows — silently, and correctly.
    expect(review.deleteMany).toHaveBeenCalledWith({
      where: { id: 'review_1', userId: 'user_alice' },
    });
  });

  it("deleting someone else's review is a silent no-op, not an error", async () => {
    vi.stubEnv('ADMIN_USER_IDS', '');
    // Bob's review: the scoped findFirst returns nothing for Alice.
    review.findFirst.mockResolvedValue(null);

    const { deleteReview } = await import('@/lib/reviews');
    await deleteReview('bobs_review');

    // No error message that distinguishes "does not exist" from "not yours".
    // Telling a stranger which is an EXISTENCE ORACLE.
    expect(review.deleteMany).not.toHaveBeenCalled();
    expect(deleteImages).not.toHaveBeenCalled();
  });

  it('a photo delete is scoped through the REVIEW’s owner', async () => {
    vi.stubEnv('ADMIN_USER_IDS', '');
    buildPhoto.findFirst.mockResolvedValue(null);

    const { deleteBuildPhoto } = await import('@/lib/reviews');
    await deleteBuildPhoto('photo_1');

    expect(buildPhoto.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'photo_1', review: { userId: 'user_alice' } },
      }),
    );
  });
});

describe('ADMIN FAILS CLOSED', () => {
  it('nobody is an admin when ADMIN_USER_IDS is unset', async () => {
    const { isAdmin } = await import('@/lib/admin');

    // NOT "everyone", NOT "the first user", NOT "anyone in dev". An admin check that
    // grants power on a missing env var is worse than no admin check at all.
    expect(await isAdmin()).toBe(false);
  });

  it('an anonymous visitor is never an admin', async () => {
    vi.stubEnv('ADMIN_USER_IDS', 'clerk_alice');
    getCurrentUser.mockResolvedValue(null);

    const { isAdmin } = await import('@/lib/admin');
    expect(await isAdmin()).toBe(false);
  });

  it('matches on the CLERK ID, not the email', async () => {
    vi.stubEnv('ADMIN_USER_IDS', 'clerk_alice');

    const { isAdmin } = await import('@/lib/admin');
    expect(await isAdmin()).toBe(true);

    // An email is mutable and only as trustworthy as its verification. A Clerk user
    // id is immutable and server-issued — it cannot be claimed by registering a
    // lookalike address.
    user.findUnique.mockResolvedValue({ clerkId: 'clerk_bob' });
    vi.resetModules();
    const { isAdmin: isAdminAgain } = await import('@/lib/admin');
    expect(await isAdminAgain()).toBe(false);
  });

  it('an admin CAN delete any review — unscoped where', async () => {
    vi.stubEnv('ADMIN_USER_IDS', 'clerk_alice');
    review.findFirst.mockResolvedValue({ id: 'bobs_review', photos: [] });

    const { deleteReview } = await import('@/lib/reviews');
    await deleteReview('bobs_review');

    expect(review.deleteMany).toHaveBeenCalledWith({ where: { id: 'bobs_review' } });
  });
});

describe('ratings', () => {
  it('rejects a rating outside 1–5', async () => {
    const { upsertReview } = await import('@/lib/reviews');

    for (const rating of [0, 6, -1, 99]) {
      await expect(
        upsertReview({ planId: 'plan_1', rating }),
      ).rejects.toThrow(/between 1 and 5/i);
    }

    // Also enforced by a CHECK constraint in the migration. Both, deliberately: this
    // one gives a usable message, that one makes the invalid state unrepresentable
    // even to a raw query or a stray seed script.
    expect(review.upsert).not.toHaveBeenCalled();
  });

  it('refuses to review an UNPUBLISHED plan', async () => {
    plan.findFirst.mockResolvedValue(null);

    const { upsertReview } = await import('@/lib/reviews');

    // Same reasoning as savePlan/likePlan: reviewing staged content would confirm
    // its existence to someone not supposed to know it exists.
    await expect(upsertReview({ planId: 'secret', rating: 5 })).rejects.toThrow(
      /not found/i,
    );
  });

  it('an unreviewed plan has NO rating — null, not zero', async () => {
    review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { rating: 0 } });

    const { getRatingSummary } = await import('@/lib/reviews');
    const summary = await getRatingSummary('plan_1');

    // Zero would libel the plan: it would render as zero stars, which is a claim
    // that people reviewed it badly. "No reviews" is a different thing entirely.
    expect(summary.average).toBeNull();
    expect(summary.count).toBe(0);
  });

  it('summarizes many plans in ONE groupBy, not one query per card', async () => {
    review.groupBy.mockResolvedValue([
      { planId: 'plan_1', _avg: { rating: 4.5 }, _count: { rating: 2 } },
    ]);

    const { getRatingSummaries } = await import('@/lib/reviews');
    const summaries = await getRatingSummaries(['plan_1', 'plan_2']);

    expect(review.groupBy).toHaveBeenCalledOnce();
    expect(summaries.get('plan_1')).toEqual({ average: 4.5, count: 2 });
    // A plan with no reviews is simply absent — the card renders no stars.
    expect(summaries.get('plan_2')).toBeUndefined();
  });

  it('does not query at all for an empty page', async () => {
    const { getRatingSummaries } = await import('@/lib/reviews');
    await getRatingSummaries([]);
    expect(review.groupBy).not.toHaveBeenCalled();
  });
});

describe('photos', () => {
  it('EVERY uploaded byte goes through processImage — never stored as received', async () => {
    processImage.mockResolvedValue({
      data: Buffer.from('webp'),
      width: 800,
      height: 600,
      contentType: 'image/webp',
    });
    uploadImage.mockResolvedValue({ url: 'https://blob/x.webp', path: 'x.webp' });

    const { upsertReview } = await import('@/lib/reviews');

    await upsertReview({
      planId: 'plan_1',
      rating: 5,
      photos: [{ buffer: Buffer.from('raw jpeg bytes'), alt: 'My board' }],
    });

    // This is where EXIF/GPS stripping and magic-byte validation actually happen.
    // Bypassing it would mean publishing the coordinates of someone's home.
    expect(processImage).toHaveBeenCalledOnce();
    expect(uploadImage).toHaveBeenCalledOnce();
  });

  it('uploads BEFORE the database write, so a failed upload writes no review', async () => {
    processImage.mockRejectedValue(new Error('not an image'));

    const { upsertReview } = await import('@/lib/reviews');

    await expect(
      upsertReview({
        planId: 'plan_1',
        rating: 5,
        photos: [{ buffer: Buffer.from('junk'), alt: 'x' }],
      }),
    ).rejects.toThrow();

    // Nothing half-written. The user retries and the world is unchanged. The other
    // ordering leaves a review claiming photos it does not have.
    expect(review.upsert).not.toHaveBeenCalled();
  });

  it('caps the number of photos per review', async () => {
    const { upsertReview, MAX_PHOTOS_PER_REVIEW } = await import('@/lib/reviews');

    const tooMany = Array.from({ length: MAX_PHOTOS_PER_REVIEW + 1 }, () => ({
      buffer: Buffer.from('x'),
      alt: 'x',
    }));

    await expect(
      upsertReview({ planId: 'plan_1', rating: 5, photos: tooMany }),
    ).rejects.toThrow(/up to/i);

    expect(processImage).not.toHaveBeenCalled();
  });

  it('caps the TOTAL photos across edits, counting ones already attached', async () => {
    const { upsertReview, MAX_PHOTOS_PER_REVIEW } = await import('@/lib/reviews');

    // The review already has MAX-1 photos; adding 2 more would exceed the cap. This is
    // the edit-again-and-again leak the per-submission check cannot see.
    review.findUnique.mockResolvedValue({
      _count: { photos: MAX_PHOTOS_PER_REVIEW - 1 },
    });

    await expect(
      upsertReview({
        planId: 'plan_1',
        rating: 5,
        photos: [
          { buffer: Buffer.from('x'), alt: 'x' },
          { buffer: Buffer.from('y'), alt: 'y' },
        ],
      }),
    ).rejects.toThrow(/up to/i);

    // Rejected BEFORE any upload — the existing photos already fill the quota.
    expect(processImage).not.toHaveBeenCalled();
    expect(review.upsert).not.toHaveBeenCalled();
  });

  it('deletes the BLOBS before the rows — the DB cascade cannot reach object storage', async () => {
    vi.stubEnv('ADMIN_USER_IDS', '');
    review.findFirst.mockResolvedValue({
      id: 'review_1',
      photos: [{ blobPath: 'a.webp' }, { blobPath: 'b.webp' }],
    });

    const { deleteReview } = await import('@/lib/reviews');
    await deleteReview('review_1');

    // There are no foreign keys into a blob store. A row deleted without a
    // corresponding blob delete is a file that lives forever, silently eating a 1 GB
    // free tier.
    expect(deleteImages).toHaveBeenCalledWith(['a.webp', 'b.webp']);
  });

  it('refuses photos when no blob store is configured', async () => {
    isStorageConfigured.mockReturnValue(false);

    const { upsertReview } = await import('@/lib/reviews');

    await expect(
      upsertReview({
        planId: 'plan_1',
        rating: 5,
        photos: [{ buffer: Buffer.from('x'), alt: 'x' }],
      }),
    ).rejects.toThrow(/not configured/i);
  });

  it('a review with no photos still works with no blob store — photos are optional', async () => {
    isStorageConfigured.mockReturnValue(false);

    const { upsertReview } = await import('@/lib/reviews');

    // A missing storage token should cost you the PHOTO feature, not the site.
    await expect(upsertReview({ planId: 'plan_1', rating: 4 })).resolves.toBe('review_1');
  });
});

describe('one review per user per plan', () => {
  it('upserts on the [userId, planId] unique index rather than inserting', async () => {
    const { upsertReview } = await import('@/lib/reviews');
    await upsertReview({ planId: 'plan_1', rating: 4, body: '  Solid build.  ' });

    const call = review.upsert.mock.calls[0]![0];

    // A double-submitted form cannot produce two reviews, whatever the application
    // layer believes. Enforced by the DATABASE.
    expect(call.where).toEqual({
      userId_planId: { userId: 'user_alice', planId: 'plan_1' },
    });
    expect(call.create.body).toBe('Solid build.'); // trimmed
  });

  it('editing a review does not destroy the photos already on it', async () => {
    const { upsertReview } = await import('@/lib/reviews');
    await upsertReview({ planId: 'plan_1', rating: 2, body: 'Changed my mind.' });

    const call = review.upsert.mock.calls[0]![0];

    // `create`, not `set`/`deleteMany`. Editing the TEXT of a review must not
    // silently delete the photos attached to it — that is destroying user data as a
    // side effect of an unrelated edit.
    expect(call.update.photos).toEqual({ create: [] });
  });

  it('never selects a user id, email or clerkId into a PUBLIC review list', async () => {
    review.findMany.mockResolvedValue([]);

    const { listReviews } = await import('@/lib/reviews');
    await listReviews('plan_1');

    const select = review.findMany.mock.calls[0]![0].select;

    // A public list has no business shipping identifiers the rest of the app treats
    // as keys. "We only render displayName" is not a reason to send the rest.
    expect(select.userId).toBeUndefined();
    expect(select.user.select.email).toBeUndefined();
    expect(select.user.select.clerkId).toBeUndefined();
    expect(select.user.select.displayName).toBe(true);
  });
});

describe('BOB CANNOT ACT AS ALICE', () => {
  it('the author written is always the SESSION user', async () => {
    requireUser.mockResolvedValue(BOB);

    const { upsertReview } = await import('@/lib/reviews');
    await upsertReview({ planId: 'plan_1', rating: 5 });

    const call = review.upsert.mock.calls[0]![0];
    expect(call.create.userId).toBe('user_bob');

    // There is no input through which Bob could have written 'user_alice' here.
    // That is the design, and it is the reason there is no userId parameter.
  });
});
