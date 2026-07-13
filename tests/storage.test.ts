import { describe, it, expect, beforeEach, vi } from 'vitest';
import sharp from 'sharp';

/**
 * The image upload pipeline — Sprint 10.
 *
 * THIS IS A SECURITY TEST FILE. File upload is one of the oldest holes in web
 * software: the bytes arrive over the internet from someone we have never met.
 *
 * The properties asserted here, in order of how badly they matter:
 *
 *   1. EXIF IS STRIPPED. A phone photo carries the GPS COORDINATES OF THE USER'S
 *      HOME. "Share your build" must not mean "share your address", and the user
 *      will never think to check.
 *   2. The file type is decided by MAGIC BYTES, never by the client's Content-Type.
 *   3. Every image is RE-ENCODED, which is what kills polyglots.
 *   4. Size and pixel caps hold.
 */

const put = vi.fn();
const del = vi.fn();

vi.mock('@vercel/blob', () => ({
  put: (...args: unknown[]) => put(...args),
  del: (...args: unknown[]) => del(...args),
}));

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  put.mockReset().mockResolvedValue({
    url: 'https://store.public.blob.vercel-storage.com/build-photos/x/photo-abc.webp',
    pathname: 'build-photos/x/photo-abc.webp',
  });
  del.mockReset().mockResolvedValue(undefined);
});

/**
 * A real JPEG carrying an EXIF block — what a phone produces.
 *
 * GPS coordinates live INSIDE this same EXIF container. We drop the container
 * wholesale rather than surgically removing GPS tags, which is why asserting "no
 * EXIF survives" is the stronger claim and the one worth testing: there is no tag we
 * could have missed, because no tag survives.
 */
async function jpegWithExif(): Promise<Buffer> {
  return sharp({
    create: { width: 400, height: 300, channels: 3, background: '#8b5a2b' },
  })
    .withExifMerge({
      IFD0: { Make: 'ACME Phone', Model: 'X1', Copyright: 'Someone' },
    })
    .jpeg()
    .toBuffer();
}

describe('SECURITY: EXIF is stripped — the whole reason we re-encode', () => {
  it('the INPUT really does carry EXIF (proving the next test is not vacuous)', async () => {
    // A test that strips metadata from an image with no metadata proves nothing.
    // Assert the fixture first, or the assertion below is theatre.
    const meta = await sharp(await jpegWithExif()).metadata();

    expect(meta.exif).toBeDefined();
  });

  it('the OUTPUT carries no EXIF at all — and GPS lives in EXIF', async () => {
    const { processImage } = await import('@/lib/storage');

    const output = await processImage(await jpegWithExif());
    const meta = await sharp(output.data).metadata();

    // No EXIF block whatsoever. Not "no GPS tag" — NONE of it. A phone photo's GPS
    // coordinates are stored in this block, so dropping the block is what stops us
    // publishing the location of someone's home. The camera make and model are not
    // ours to publish either.
    expect(meta.exif).toBeUndefined();
  });
});

describe('SECURITY: the file type comes from MAGIC BYTES, not the client', () => {
  it('rejects a non-image, however it might have been labelled', async () => {
    const { processImage, UploadError } = await import('@/lib/storage');

    // An executable renamed photo.jpg and sent as image/jpeg. The Content-Type is a
    // CLAIM MADE BY THE CLIENT — it is never consulted anywhere in processImage.
    const notAnImage = Buffer.from('MZ\x90\x00\x03PE\x00\x00 this is a PE binary');

    await expect(processImage(notAnImage)).rejects.toBeInstanceOf(UploadError);
  });

  it('rejects an empty file', async () => {
    const { processImage, UploadError } = await import('@/lib/storage');
    await expect(processImage(Buffer.alloc(0))).rejects.toBeInstanceOf(UploadError);
  });

  it('rejects a format not on the allowlist even though it IS a real image', async () => {
    const { processImage, UploadError } = await import('@/lib/storage');

    // A genuine, valid TIFF. It is an image; it is not one we accept. The check is
    // an ALLOWLIST of formats, not a denylist of extensions.
    const tiff = await sharp({
      create: { width: 10, height: 10, channels: 3, background: '#fff' },
    })
      .tiff()
      .toBuffer();

    await expect(processImage(tiff)).rejects.toBeInstanceOf(UploadError);
  });

  it('accepts a real JPEG, PNG and WebP', async () => {
    const { processImage } = await import('@/lib/storage');

    for (const format of ['jpeg', 'png', 'webp'] as const) {
      const image = await sharp({
        create: { width: 60, height: 40, channels: 3, background: '#8b5a2b' },
      })
        [format]()
        .toBuffer();

      const output = await processImage(image);
      expect(output.contentType).toBe('image/webp');
    }
  });
});

describe('SECURITY: polyglots die on re-encode', () => {
  it('a valid PNG with a payload appended survives as PIXELS ONLY', async () => {
    const { processImage } = await import('@/lib/storage');

    const png = await sharp({
      create: { width: 50, height: 50, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer();

    // A file that is a valid PNG *and* carries a script payload. It passes every
    // "is this an image?" check ever written, because it genuinely is one.
    const polyglot = Buffer.concat([
      png,
      Buffer.from('<?php system($_GET["cmd"]); ?>'),
    ]);

    const output = await processImage(polyglot);

    // Validation says "this looks fine". RE-ENCODING MAKES it fine: we decoded to
    // raw pixels and wrote a new file from them. Everything that was not a pixel —
    // the payload, the EXIF, the malformed chunks — did not survive the trip.
    expect(output.data.includes('<?php')).toBe(false);
    expect(output.data.includes('system(')).toBe(false);
  });
});

describe('caps', () => {
  it('rejects a file over the byte cap BEFORE decoding it', async () => {
    const { processImage, UploadError, MAX_UPLOAD_BYTES } = await import('@/lib/storage');

    // Random bytes: not a decodable image at all. If the size check did not run
    // first, this would fail as "not an image" — a different error. The size check
    // must come first, because decoding is the expensive, attackable step.
    const huge = Buffer.alloc(MAX_UPLOAD_BYTES + 1, 7);

    await expect(processImage(huge)).rejects.toThrow(/too large/i);
    await expect(processImage(huge)).rejects.toBeInstanceOf(UploadError);
  });

  it('resizes down to the stored edge, and never enlarges a small image', async () => {
    const { processImage, MAX_STORED_EDGE } = await import('@/lib/storage');

    const big = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: '#8b5a2b' },
    })
      .jpeg()
      .toBuffer();

    const resized = await processImage(big);
    expect(resized.width).toBe(MAX_STORED_EDGE);

    const small = await sharp({
      create: { width: 80, height: 60, channels: 3, background: '#8b5a2b' },
    })
      .jpeg()
      .toBuffer();

    // withoutEnlargement — upscaling a small photo would add bytes and no detail.
    const kept = await processImage(small);
    expect(kept.width).toBe(80);
    expect(kept.height).toBe(60);
  });
});

describe('upload', () => {
  it('refuses to upload when no blob store is configured', async () => {
    const { processImage, uploadImage, UploadError, isStorageConfigured } = await import(
      '@/lib/storage'
    );

    expect(isStorageConfigured()).toBe(false);

    const image = await processImage(
      await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } })
        .png()
        .toBuffer(),
    );

    await expect(uploadImage(image, 'plan')).rejects.toBeInstanceOf(UploadError);
    expect(put).not.toHaveBeenCalled();
  });

  it('SECURITY: adds a random suffix, so a guessed path cannot overwrite a photo', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_fake');
    const { processImage, uploadImage } = await import('@/lib/storage');

    const image = await processImage(
      await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } })
        .png()
        .toBuffer(),
    );

    await uploadImage(image, 'cedar-raised-garden-bed');

    // Without addRandomSuffix, an attacker who can guess a path can OVERWRITE
    // someone else's photo — and a path built from a plan slug is guessable by
    // definition. This is a security setting, not a cosmetic one.
    expect(put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Buffer),
      expect.objectContaining({ addRandomSuffix: true, access: 'public' }),
    );
  });

  it('SECURITY: sanitizes the path prefix — no traversal', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_fake');
    const { processImage, uploadImage } = await import('@/lib/storage');

    const image = await processImage(
      await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } })
        .png()
        .toBuffer(),
    );

    await uploadImage(image, '../../etc/passwd');

    const path = put.mock.calls[0]?.[0] as string;
    expect(path).not.toContain('..');
    expect(path).not.toContain('/etc/');
  });
});

describe('delete FAILS SOFT — an unreachable CDN must not block a deletion', () => {
  it('does not throw when the store is unreachable', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_fake');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    del.mockRejectedValue(new Error('ECONNREFUSED'));

    const { deleteImages } = await import('@/lib/storage');

    // Refusing to delete a user's review because a CDN is down is a WORSE failure
    // than an orphaned file. The orphan is a slow leak of a 1 GB quota; a review you
    // cannot delete is a privacy problem.
    await expect(deleteImages(['build-photos/x/photo.webp'])).resolves.toBeUndefined();
  });

  it('does nothing at all for an empty list', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_fake');
    const { deleteImages } = await import('@/lib/storage');

    await deleteImages([]);
    expect(del).not.toHaveBeenCalled();
  });
});
