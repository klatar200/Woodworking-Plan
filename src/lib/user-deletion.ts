import { prisma } from '@/lib/db';
import { deleteImages } from '@/lib/storage';

/**
 * The cleanup that runs when a user is DELETED in Clerk — Sprint 2 follow-up.
 *
 * WHY THIS IS THE ONE THING LAZY SYNC CANNOT DO:
 *
 * src/lib/auth.ts CREATES our mirror `User` row on first authenticated request, so
 * creation never needs a webhook and can never drift — if the user is here, the row
 * exists. Deletion is the exact opposite: a user deleted in Clerk never signs in
 * again, so nothing would ever remove their row. Without this, their `User` row —
 * and its cached email, saves, collections, likes, reviews, and build photos —
 * would live in our database forever. That is a data-retention / GDPR problem the
 * moment there are real users.
 *
 * WHAT THE DATABASE HANDLES, AND WHAT IT CANNOT:
 *
 * Every relation on `User` in schema.prisma is `onDelete: Cascade` — saves,
 * collections, likes, reviews, and (through Review) build-photo ROWS all vanish
 * when the `User` row goes. So the cascade does almost all of the work.
 *
 * The one thing it CANNOT reach is object storage: the build-photo BLOBS live on
 * Vercel Blob, and there are no foreign keys into a blob store. A plain cascade
 * would delete the `BuildPhoto` rows and orphan the files — a silent, permanent
 * leak of the 1 GB free tier. So the blob paths are gathered and deleted FIRST,
 * before the row that names them is gone.
 */

export interface UserDeletionResult {
  /** How many mirror rows were removed (0 if the user never existed here). */
  usersDeleted: number;
  /** How many build-photo blobs were sent for deletion. */
  blobsDeleted: number;
}

/**
 * Deletes our mirror of a Clerk user and everything they own.
 *
 * Keyed on `clerkId` from the (already signature-verified) webhook payload — never
 * on a client-supplied id. IDEMPOTENT: Svix retries deliveries, so a second call for
 * the same user must find nothing and no-op cleanly rather than throw.
 */
export async function deleteUserByClerkId(clerkId: string): Promise<UserDeletionResult> {
  // Gather blob paths BEFORE the rows go — the DB cascade removes BuildPhoto rows but
  // cannot reach the files those rows point at. Order is the whole correctness story.
  const photos = await prisma.buildPhoto.findMany({
    where: { review: { user: { clerkId } } },
    select: { blobPath: true },
  });

  // Fails soft (see storage.ts): a blob store being unreachable must not block the
  // user's data from being deleted. An orphaned file is a slow quota leak; a user
  // whose data we refused to delete is a privacy problem.
  await deleteImages(photos.map((photo) => photo.blobPath));

  // `deleteMany`, not `delete`: a re-delivered webhook (or a user who signed up in
  // Clerk but never triggered lazy creation here) matches zero rows and no-ops,
  // instead of throwing on a missing record. The cascade does the rest.
  const result = await prisma.user.deleteMany({ where: { clerkId } });

  return { usersDeleted: result.count, blobsDeleted: photos.length };
}
