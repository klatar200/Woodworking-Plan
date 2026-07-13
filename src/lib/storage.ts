import { put, del } from '@vercel/blob';
import sharp from 'sharp';
import { env } from '@/env';

/**
 * Image storage and the upload hardening pipeline — Sprint 10.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * TREAT EVERY UPLOADED BYTE AS HOSTILE. It arrived over the internet from someone
 * we have never met, and file upload is one of the oldest holes in web software.
 *
 * The three things that actually matter here, in order:
 *
 *   1. EXIF IS STRIPPED. A phone photo of a workbench carries the GPS COORDINATES
 *      OF THE USER'S HOME. Publishing that is a privacy incident. Nobody who taps
 *      "share your build" is consenting to share their address, and they will never
 *      think to check. This is not a nice-to-have; it is the whole reason the bytes
 *      get re-encoded rather than stored as received.
 *
 *   2. THE FILE TYPE IS DECIDED BY MAGIC BYTES, NOT BY `Content-Type`. A browser's
 *      MIME type is a CLAIM MADE BY THE CLIENT. It is trivially forged. `image/png`
 *      on a `.php` payload is the oldest trick there is, and trusting the header is
 *      how people serve executables from their own CDN.
 *
 *   3. EVERY IMAGE IS FULLY RE-ENCODED. This is what kills POLYGLOTS — a file that
 *      is a valid JPEG *and* a valid script/archive at the same time, and so passes
 *      every "is this an image?" check while still being a payload. Decoding to raw
 *      pixels and re-encoding from scratch destroys everything that was not pixels:
 *      the appended payload, the EXIF, the malformed chunks. Validation says "this
 *      looks fine"; re-encoding MAKES it fine.
 *
 * Also enforced: a byte cap (before decode) and a pixel cap (a "decompression bomb"
 * — a 10 KB PNG can declare 50,000 × 50,000 pixels and exhaust the server's memory
 * on decode, long before any size check on the *output* would ever run).
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THE PROVIDER LIVES BEHIND THIS MODULE ON PURPOSE. Nothing else in the codebase
 * imports `@vercel/blob`. Vercel Blob was chosen because Cloudflare R2 requires a
 * card on file to activate (DECISIONS_LOG.md 2026-07-13) — if that changes, or the
 * 1 GB tier gets tight, swapping providers is this file and nothing else.
 */

/** Hard cap on the uploaded file, checked BEFORE we decode anything. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Cap on total pixels, checked from the header BEFORE full decode.
 *
 * This is the decompression-bomb guard. 50 MP is far beyond any phone camera and
 * far below what would hurt a serverless function's memory limit.
 */
export const MAX_INPUT_PIXELS = 50_000_000;

/** Longest edge of the stored image. Bigger than this is wasted bytes on a phone. */
export const MAX_STORED_EDGE = 1600;

/** What we accept. Determined by MAGIC BYTES — never by the client's MIME claim. */
export const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp', 'avif'] as const;
export type AcceptedFormat = (typeof ACCEPTED_FORMATS)[number];

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

/** True when a blob store is configured. Photo upload is disabled without it. */
export function isStorageConfigured(): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN);
}

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
  contentType: 'image/webp';
}

/**
 * Validates and re-encodes an uploaded image. The output is WebP with no metadata.
 *
 * Everything that makes this safe happens here, not at the call site — so a future
 * upload path cannot accidentally skip it by forgetting a helper.
 *
 * @throws UploadError — always with a message safe to show a user.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  // 1. Byte cap, BEFORE decode. Decoding is the expensive, attackable step; refusing
  //    an oversized file must not require decoding it first.
  if (input.byteLength > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `Image is too large. The limit is ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
    );
  }

  if (input.byteLength === 0) {
    throw new UploadError('That file is empty.');
  }

  // 2. What IS this, actually? sharp reads the container's magic bytes. The client's
  //    Content-Type is not consulted anywhere in this function, deliberately.
  let metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    // Unparseable as any image. This is where a renamed .exe lands.
    throw new UploadError('That file is not a readable image.');
  }

  const format = metadata.format as AcceptedFormat | undefined;
  if (!format || !ACCEPTED_FORMATS.includes(format)) {
    throw new UploadError('Photos must be JPEG, PNG, WebP, or AVIF.');
  }

  if (!metadata.width || !metadata.height) {
    throw new UploadError('That image has no readable dimensions.');
  }

  // 3. Decompression-bomb guard, from the HEADER, before the full decode.
  if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw new UploadError('That image has too many pixels.');
  }

  // 4. Re-encode from scratch.
  //
  //    `.rotate()` with no argument applies the EXIF orientation tag and then drops
  //    it — without this, stripping EXIF would leave every phone photo sideways, and
  //    the "fix" would be to keep the metadata we are here to remove.
  //
  //    sharp does not copy metadata into the output unless `.withMetadata()` is
  //    called. It is NOT called. That single omission is what strips the GPS.
  let output;
  try {
    output = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({
        width: MAX_STORED_EDGE,
        height: MAX_STORED_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new UploadError('That image could not be processed.');
  }

  return {
    data: output.data,
    width: output.info.width,
    height: output.info.height,
    contentType: 'image/webp',
  };
}

export interface StoredBlob {
  url: string;
  path: string;
}

/**
 * Uploads processed bytes to the blob store.
 *
 * `addRandomSuffix: true` is a SECURITY setting, not a cosmetic one. Without it, an
 * attacker who can guess a path can overwrite someone else's photo — and paths built
 * from user input are guessable by definition. It also means a filename can never
 * collide, so no upload silently replaces another.
 *
 * NOTE: the user's original filename is NEVER used in the path. It is attacker-
 * controlled (`../../etc/passwd`, a 4 KB name, a unicode RTL override that makes
 * `gpj.exe` render as `exe.jpg`) and it buys us nothing.
 */
export async function uploadImage(
  image: ProcessedImage,
  prefix: string,
): Promise<StoredBlob> {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new UploadError('Photo uploads are not configured.');
  }

  // Only [a-z0-9-] survives. The prefix is ours (a plan slug), but defence in depth
  // costs one line here and prevents a path-traversal bug if that ever changes.
  const safePrefix = prefix.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);

  const blob = await put(`build-photos/${safePrefix}/photo.webp`, image.data, {
    access: 'public',
    contentType: image.contentType,
    addRandomSuffix: true,
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  return { url: blob.url, path: blob.pathname };
}

/**
 * Deletes blobs. Called BEFORE the database rows go, because the DB cascade cannot
 * reach object storage — there are no foreign keys into a blob store.
 *
 * FAILS SOFT, deliberately. If the store is unreachable, we log and let the review
 * deletion proceed: refusing to delete a user's review because a CDN is down would
 * be a worse failure, and the cost of the alternative is an orphaned file. Orphans
 * are a slow leak of a 1 GB quota; a review you cannot delete is a privacy problem.
 */
export async function deleteImages(paths: string[]): Promise<void> {
  if (paths.length === 0 || !env.BLOB_READ_WRITE_TOKEN) return;

  try {
    await del(paths, { token: env.BLOB_READ_WRITE_TOKEN });
  } catch (error) {
    console.warn('[storage] failed to delete blobs (orphaned):', paths, error);
  }
}
