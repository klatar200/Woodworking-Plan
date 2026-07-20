'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CATALOG_PATH } from '@/lib/routes';
import { upsertReview, deleteReview, deleteBuildPhoto, MAX_PHOTOS_PER_REVIEW } from '@/lib/reviews';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  denialTarget,
  bounceTarget,
  noticeUrl,
  RATING_NOTICE_VALUE,
  UPLOAD_NOTICE_VALUE,
} from '@/lib/rate-limit-feedback';
import { formString, formInt } from '@/lib/form-fields';
import { guardAction } from '@/lib/action-guard';

/**
 * Review server actions — Sprint 10.
 *
 * SECURITY: a server action is a PUBLIC HTTP ENDPOINT. Next generates an id and
 * anyone can POST to it; that no button in the UI calls it means nothing. So:
 *
 *   - No user id is read from the form. `upsertReview()` / `deleteReview()` derive
 *     the author from the verified Clerk session and take no `userId`.
 *   - Admin power is re-checked INSIDE the data layer, not by hiding a button. A
 *     hidden button is not authorization.
 *   - Files are read into memory and handed to the storage pipeline, which decides
 *     the file type by MAGIC BYTES and re-encodes every byte. The browser's
 *     Content-Type is never trusted.
 *
 * RATE LIMITING: the 'create' bucket (10/min) — a review is a row that persists and
 * that a human has to look at if it turns out to be spam, and an upload also costs
 * CPU and storage quota. A denied request does NO WORK and never throws a real
 * error (an uncaught throw out of a server action is an HTTP 500 and a crashed
 * page). It `redirect()`s back with `?notice=slow-down` — a framework-handled 303,
 * not an exception. See src/lib/rate-limit-feedback.ts.
 */

/**
 * MALFORMED INPUT IS DROPPED, NOT THROWN (fixed 2026-07-19).
 *
 * This file's local `requiredString` threw, so **a POST to this public endpoint without
 * a `rating` returned an HTTP 500** and a client "Application error" boundary. Exactly
 * the failure the rate limiter caused before it was fixed — and the fix is the same one:
 * a request is DROPPED and redirected, never thrown out of an action.
 *
 * The rating also gets a RANGE check it never had. `Number.parseInt` alone accepts
 * `"5abc"` as 5 and `"1e9"` as 1, and nothing downstream re-validated it, so a crafted
 * POST could store a rating of 0, -3 or 900 — silently poisoning every average on the
 * catalog, which is computed on read from these rows. See src/lib/form-fields.ts.
 */
export async function submitReviewAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, '/'));

  const planId = formString(formData, 'planId');
  if (planId === null) redirect(bounceTarget(formData, '/'));

  const slug = formData.get('slug');

  /**
   * A missing rating is the ONE malformed case a real person can reach: the star input
   * is a set of `visually-hidden` radios, and a browser that failed to enforce their
   * `required` attribute would submit this form empty. So this bail carries a notice —
   * they pressed "Post review" and deserve to know why nothing happened — while the
   * structural ids above bounce silently, since only a hand-built request can omit them.
   */
  const rating = formInt(formData, 'rating', 1, 5);
  if (rating === null) {
    redirect(noticeUrl(bounceTarget(formData, '/'), RATING_NOTICE_VALUE));
  }

  const body = formData.get('body');

  /**
   * Read the uploaded files.
   *
   * The count is capped HERE as well as in the data layer, because the loop below
   * buffers each file into memory — a caller who POSTs 500 files should be refused
   * before we allocate for them, not after.
   */
  const files = formData
    .getAll('photos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .slice(0, MAX_PHOTOS_PER_REVIEW);

  const altText = formData.get('photoAlt');
  const alt = typeof altText === 'string' ? altText : '';

  /**
   * AUDIT FIX 2026-07-19 — the data layer's throws are caught at the boundary.
   *
   * `upsertReview()` throws on a failed photo (UploadError), a forged planId, an
   * over-length body, and — via `requireUser()` — any expired session; the file
   * buffering itself can throw on a broken stream. All of that used to escape as an
   * HTTP 500 with the review text lost. `guardAction` turns it into: expired session
   * → sign-in; a refused PHOTO → bounce with the upload-failed notice (the one case a
   * real person reaches — matched by error NAME so this file needn't import the sharp/
   * blob chain in src/lib/storage.ts); anything else → a silent, logged bounce.
   */
  await guardAction(
    (async () => {
      const photos = await Promise.all(
        files.map(async (file) => ({
          buffer: Buffer.from(await file.arrayBuffer()),
          alt,
        })),
      );

      await upsertReview({
        planId,
        rating,
        body: typeof body === 'string' ? body : undefined,
        photos,
      });
    })(),
    formData,
    '/',
    (error) =>
      error instanceof Error && error.name === 'UploadError'
        ? UPLOAD_NOTICE_VALUE
        : null,
  );

  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  // The catalog shows ratings on cards — now stale.
  revalidatePath('/');
  revalidatePath(CATALOG_PATH);
}

export async function deleteReviewAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, '/'));

  const reviewId = formString(formData, 'reviewId');
  if (reviewId === null) redirect(bounceTarget(formData, '/'));

  const slug = formData.get('slug');

  await guardAction(deleteReview(reviewId), formData, '/');

  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  revalidatePath('/');
  revalidatePath(CATALOG_PATH);
}

export async function deletePhotoAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, '/'));

  const photoId = formString(formData, 'photoId');
  if (photoId === null) redirect(bounceTarget(formData, '/'));

  const slug = formData.get('slug');

  await guardAction(deleteBuildPhoto(photoId), formData, '/');

  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
}
