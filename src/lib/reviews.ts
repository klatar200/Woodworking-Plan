import { prisma } from '@/lib/db';
import { requireUser, getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { processImage, uploadImage, deleteImages, isStorageConfigured } from '@/lib/storage';

/**
 * Reviews, ratings and build photos — Sprint 10. BUSINESS_PLAN.md §10.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE SAME SECURITY RULE AS saves.ts AND likes.ts, AND FOR THE SAME REASON:
 *
 *   NO FUNCTION HERE TAKES A `userId`.
 *
 * The author of a review is the verified Clerk session, always. There is no
 * parameter through which a caller could write, edit, or delete a review as
 * somebody else. If a signature in this file ever grows a `userId`, that is an
 * IDOR bug — and the tests assert the arity of these functions precisely so that
 * change cannot land quietly.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ON AVERAGES: there is deliberately no `avgRating` column on Plan. It is computed
 * on read. See prisma/schema.prisma — short version: a derived column is a thing
 * that can be created empty in production and then silently lie about itself, which
 * has already happened twice on this project (Sprint 4, Sprint 6).
 */

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_BODY_LENGTH = 4000;
export const MAX_PHOTOS_PER_REVIEW = 4;

export interface ReviewInput {
  planId: string;
  rating: number;
  body?: string;
  /** Raw uploaded files. Every byte is re-encoded before it is stored. */
  photos?: { buffer: Buffer; alt: string }[];
}

/**
 * Creates or updates the signed-in user's review of a plan.
 *
 * Upsert on the `[userId, planId]` unique index: one review per person per plan, and
 * a double-submitted form cannot produce two. Editing your review is the same call.
 *
 * Refuses unpublished plans — same reasoning as `savePlan()`/`likePlan()`. Reviewing
 * staged content would confirm its existence to someone who is not supposed to know
 * it exists.
 */
export async function upsertReview(input: ReviewInput): Promise<string> {
  const user = await requireUser();

  const rating = Math.trunc(input.rating);
  if (!Number.isFinite(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    // Also enforced by a CHECK constraint in the migration. Both, on purpose: this
    // one gives a usable message, that one makes the invalid state unrepresentable.
    throw new Error('A rating must be between 1 and 5 stars.');
  }

  const body = input.body?.trim() ?? '';
  if (body.length > MAX_BODY_LENGTH) {
    throw new Error(`A review can be at most ${MAX_BODY_LENGTH} characters.`);
  }

  const plan = await prisma.plan.findFirst({
    where: { id: input.planId, published: true },
    select: { id: true, slug: true },
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  const photos = input.photos ?? [];
  if (photos.length > MAX_PHOTOS_PER_REVIEW) {
    throw new Error(`You can attach up to ${MAX_PHOTOS_PER_REVIEW} photos.`);
  }
  if (photos.length > 0 && !isStorageConfigured()) {
    throw new Error('Photo uploads are not configured.');
  }

  /**
   * AUDIT FIX 2026-07-21 — the cap is enforced against the TOTAL, not just this batch.
   *
   * On an EDIT, new photos are APPENDED (see the upsert `update` below:
   * `photos: { create: uploaded }`). Checking only `photos.length` let a user re-edit
   * their own review and grow past MAX_PHOTOS_PER_REVIEW four at a time — an unbounded
   * blob-quota leak that the per-submission check above cannot see. Count what is
   * already attached and refuse before uploading anything. Runs ONLY when photos are
   * actually being added, so a text-only edit still pays no extra query.
   */
  if (photos.length > 0) {
    const existing = await prisma.review.findUnique({
      where: { userId_planId: { userId: user.id, planId: plan.id } },
      select: { _count: { select: { photos: true } } },
    });
    const alreadyAttached = existing?._count?.photos ?? 0;
    if (alreadyAttached + photos.length > MAX_PHOTOS_PER_REVIEW) {
      throw new Error(
        `You can attach up to ${MAX_PHOTOS_PER_REVIEW} photos to a review.`,
      );
    }
  }

  /**
   * Photos are processed and uploaded BEFORE the database write.
   *
   * Ordering matters. If an upload fails, we throw and no review row is touched —
   * the user retries and nothing is half-written. Do it the other way round and a
   * failed upload leaves a review claiming photos it does not have.
   *
   * The cost of this ordering is a possible ORPHANED BLOB if the DB write fails
   * after a successful upload. That is the right way round to fail: a stray file is
   * a slow leak of a 1 GB quota, whereas a review whose photos silently vanished is
   * a bug the user sees.
   */
  const uploaded = [] as { url: string; blobPath: string; alt: string; width: number; height: number }[];

  for (const photo of photos) {
    // Validates by magic bytes, caps pixels, re-encodes, strips EXIF/GPS.
    const processed = await processImage(photo.buffer);
    const stored = await uploadImage(processed, plan.slug);

    uploaded.push({
      url: stored.url,
      blobPath: stored.path,
      alt: photo.alt.trim().slice(0, 300) || `A build of ${plan.slug}`,
      width: processed.width,
      height: processed.height,
    });
  }

  const review = await prisma.review.upsert({
    where: { userId_planId: { userId: user.id, planId: plan.id } },
    create: {
      userId: user.id,
      planId: plan.id,
      rating,
      body: body || null,
      photos: { create: uploaded },
    },
    update: {
      rating,
      body: body || null,
      // New photos are ADDED, not replaced. Editing a review's text must not silently
      // destroy the photos already attached to it.
      photos: { create: uploaded },
    },
    select: { id: true },
  });

  return review.id;
}

/**
 * Deletes a review. The author may delete their own; an admin may delete any.
 *
 * The authorization is expressed IN THE WHERE CLAUSE, not in an `if` above the query.
 * A non-admin's delete is scoped by `userId`, so a stranger who guesses a cuid
 * matches zero rows — silently, and correctly. `delete({ where: { id }})` would have
 * removed it.
 */
export async function deleteReview(reviewId: string): Promise<void> {
  const user = await requireUser();
  const admin = await isAdmin();

  const where = admin ? { id: reviewId } : { id: reviewId, userId: user.id };

  // Read the blob paths BEFORE the rows go. The DB cascade removes BuildPhoto rows
  // but cannot reach object storage — there are no foreign keys into a blob store,
  // and a deleted row we never uploaded a delete for is a file that lives forever.
  const review = await prisma.review.findFirst({
    where,
    select: { id: true, photos: { select: { blobPath: true } } },
  });

  // Not found, or not yours. Indistinguishable on purpose — telling a stranger "that
  // review exists but is not yours" is an existence oracle.
  if (!review) return;

  await deleteImages(review.photos.map((photo) => photo.blobPath));

  await prisma.review.deleteMany({ where });
}

/**
 * Deletes a single photo from a review. Author or admin.
 *
 * Scoped through the review's owner, so a user cannot delete a photo hanging off
 * someone else's review by guessing its id.
 */
export async function deleteBuildPhoto(photoId: string): Promise<void> {
  const user = await requireUser();
  const admin = await isAdmin();

  const photo = await prisma.buildPhoto.findFirst({
    where: admin ? { id: photoId } : { id: photoId, review: { userId: user.id } },
    select: { id: true, blobPath: true },
  });

  if (!photo) return;

  await deleteImages([photo.blobPath]);
  await prisma.buildPhoto.deleteMany({ where: { id: photo.id } });
}

const REVIEW_SELECT = {
  id: true,
  rating: true,
  body: true,
  createdAt: true,
  user: { select: { displayName: true, imageUrl: true } },
  photos: { select: { id: true, url: true, alt: true, width: true, height: true } },
} as const;

export type PlanReview = Awaited<ReturnType<typeof listReviews>>[number];

/**
 * Reviews for a plan, newest first. PUBLIC — reviews are published content.
 *
 * Note what is NOT selected: no user id, no email, no clerkId. A public list has no
 * business shipping an identifier that other parts of the app treat as a key, and
 * "we only render displayName" is not a reason to send the rest to the browser.
 */
export async function listReviews(planId: string) {
  return prisma.review.findMany({
    where: { planId },
    select: REVIEW_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

/**
 * The plan's rating, COMPUTED — never read from a denormalized column.
 *
 * Returns `null` for the average when there are no reviews. Not 0: an unreviewed
 * plan has *no* rating, and rendering it as zero stars would libel it.
 */
export async function getRatingSummary(planId: string): Promise<RatingSummary> {
  const result = await prisma.review.aggregate({
    where: { planId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    average: result._avg.rating,
    count: result._count.rating,
  };
}

/**
 * Rating summaries for MANY plans at once — the catalog cards.
 *
 * ONE `groupBy`, not one aggregate per card, and NOT by selecting every review row
 * onto each card and averaging in JavaScript. That last option is the tempting one
 * and it is O(total reviews): a popular plan with 800 reviews would ship 800 rows to
 * render one number on a card. This ships one row per plan, computed in Postgres.
 *
 * Still no denormalized column. Bounded work beats a column that can silently drift.
 */
export async function getRatingSummaries(
  planIds: string[],
): Promise<Map<string, RatingSummary>> {
  const summaries = new Map<string, RatingSummary>();
  if (planIds.length === 0) return summaries;

  const rows = await prisma.review.groupBy({
    by: ['planId'],
    where: { planId: { in: planIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  for (const row of rows) {
    summaries.set(row.planId, {
      average: row._avg.rating,
      count: row._count.rating,
    });
  }

  return summaries;
}

/**
 * The signed-in user's own review of a plan, if any — so the form can prefill.
 *
 * `getCurrentUser`, not `requireUser`: the plan page is public, and an anonymous
 * visitor gets `null` rather than an exception.
 */
export async function getMyReview(planId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  return prisma.review.findUnique({
    where: { userId_planId: { userId: user.id, planId } },
    select: REVIEW_SELECT,
  });
}
