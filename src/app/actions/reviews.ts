'use server';

import { revalidatePath } from 'next/cache';
import { upsertReview, deleteReview, deleteBuildPhoto, MAX_PHOTOS_PER_REVIEW } from '@/lib/reviews';
import { checkRateLimit } from '@/lib/rate-limit';

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
 * CPU and storage quota. A denied request is a SILENT NO-OP, never a throw: an
 * uncaught throw out of a server action is an HTTP 500 and a crashed page.
 */

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== 'string' || value === '') {
    throw new Error(`Missing ${key}`);
  }
  return value;
}

export async function submitReviewAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) return;

  const planId = requiredString(formData, 'planId');
  const slug = formData.get('slug');

  const rating = Number.parseInt(requiredString(formData, 'rating'), 10);
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

  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  // The catalog shows ratings on cards — now stale.
  revalidatePath('/');
}

export async function deleteReviewAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) return;

  const reviewId = requiredString(formData, 'reviewId');
  const slug = formData.get('slug');

  await deleteReview(reviewId);

  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  revalidatePath('/');
}

export async function deletePhotoAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) return;

  const photoId = requiredString(formData, 'photoId');
  const slug = formData.get('slug');

  await deleteBuildPhoto(photoId);

  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
}
