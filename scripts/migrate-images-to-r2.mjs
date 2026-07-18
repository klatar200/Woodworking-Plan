// @ts-check
/**
 * Migrate plan photos off hotlinked source URLs onto Cloudflare R2.
 * DECISIONS_LOG 2026-07-17.
 *
 * For every `content/plans/*.json`, each image whose URL is NOT already on our
 * R2 host is: downloaded, RE-ENCODED + EXIF-stripped (Sprint 10 upload rule —
 * a re-hosted phone photo still carries GPS in EXIF; sanitise it), uploaded to
 * R2, and its `images[].url` rewritten in place to the R2 public URL.
 *
 * WHY these choices:
 * - Key = hash of the SOURCE url  → identical source image dedupes to one object,
 *   and re-running is idempotent (same source → same key → skipped).
 * - Type comes from MAGIC BYTES, never the response Content-Type (a client claim).
 * - Every image is fully re-encoded via sharp, which drops metadata by default —
 *   this is what kills EXIF/GPS and image polyglots. Validation says "looks fine";
 *   re-encoding MAKES it fine.
 * - JSON is edited by exact-string replacement of the old URL, so the diff is only
 *   the changed URLs — not a full reformat of 1,000+ files.
 * - Failures are reported LOUDLY and never silently drop a plan's image; the run
 *   exits non-zero if anything failed, so it can't "look done" while it isn't.
 *
 * RUN (on Keagan's machine — needs R2 secrets + network; see DEPLOYMENT.md):
 *   npm run images:migrate -- --dry-run   # preview, no upload, no write
 *   npm run images:migrate                # do it
 *   npm run images:migrate -- --force     # re-upload even if the object exists
 *
 * REQUIRED env (in .env.local; the npm script loads it via dotenv-cli):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_HOST
 */

import { readFile, writeFile, readdir, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLANS_DIR = join(__dirname, '..', 'content', 'plans');

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const CONCURRENCY = 6;
const MAX_BYTES = 15 * 1024 * 1024; // reject before decode; a huge file is not a plan photo
const MAX_PIXELS = 40_000_000; // ~ decode bomb guard (sharp limitInputPixels)

// --- env ---------------------------------------------------------------------
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
} = process.env;

/**
 * Normalise R2_PUBLIC_HOST to a BARE hostname.
 *
 * Learned the hard way (2026-07-17): a value pasted WITH the scheme produced
 * `https://https://…` in 876 plan files, and the value pasted was the S3 API
 * endpoint, which only answers SIGNED requests — it can never serve a browser
 * <img>. Both mistakes are silent: the upload succeeds and the JSON looks
 * plausible. So both are rejected here, loudly, before anything is written.
 */
function normalisePublicHost(raw) {
  if (!raw) return raw;
  const host = raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  if (/\.r2\.cloudflarestorage\.com$/i.test(host)) {
    console.error(
      `✗ R2_PUBLIC_HOST is the S3 API endpoint (${host}).\n` +
        '  That endpoint only serves authenticated, signed requests — images will\n' +
        '  never load in a browser from it.\n' +
        '  Use the bucket PUBLIC host instead: R2 → your bucket → Settings →\n' +
        '  Public access → r2.dev subdomain (looks like pub-xxxxxxxx.r2.dev),\n' +
        '  with no https:// prefix.'
    );
    process.exit(1);
  }
  return host;
}

const R2_PUBLIC_HOST = normalisePublicHost(process.env.R2_PUBLIC_HOST);

const missing = Object.entries({
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_HOST,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length && !DRY_RUN) {
  console.error(`✗ Missing required env: ${missing.join(', ')}`);
  console.error('  Set them in .env.local and run via `npm run images:migrate`.');
  process.exit(1);
}

const s3 =
  DRY_RUN && missing.length
    ? null
    : new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: /** @type {string} */ (R2_ACCESS_KEY_ID),
          secretAccessKey: /** @type {string} */ (R2_SECRET_ACCESS_KEY),
        },
      });

// --- helpers -----------------------------------------------------------------

/** Detect image type from magic bytes — NEVER trust the response Content-Type. */
function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return { fmt: 'jpeg', ext: 'jpg', ct: 'image/jpeg' };
  if (
    buf.length > 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return { fmt: 'png', ext: 'png', ct: 'image/png' };
  if (buf.length > 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46)
    return { fmt: 'gif', ext: 'png', ct: 'image/png' }; // gif → png (first frame)
  if (
    buf.length > 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  )
    return { fmt: 'webp', ext: 'webp', ct: 'image/webp' };
  return null;
}

/** Re-encode to the target format, stripping ALL metadata (default sharp behaviour). */
async function reencode(buf, sniffed) {
  const img = sharp(buf, { limitInputPixels: MAX_PIXELS, animated: false }).rotate(); // bake EXIF orientation, then drop it
  switch (sniffed.ext) {
    case 'jpg':
      return img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    case 'png':
      return img.png({ compressionLevel: 9 }).toBuffer();
    case 'webp':
      return img.webp({ quality: 82 }).toBuffer();
    default:
      throw new Error(`unhandled ext ${sniffed.ext}`);
  }
}

async function download(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len && len > MAX_BYTES) throw new Error(`too large (${len} bytes)`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error(`too large (${buf.length} bytes)`);
  return buf;
}

async function objectExists(key) {
  if (!s3) return false;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Upload one source URL → R2, return the new public URL. Idempotent by key. */
async function migrateOne(sourceUrl) {
  const hash = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16);

  // Determine ext without a download when the object already exists: try known
  // exts. Cheaper path is just to download once; keep it simple and download.
  const raw = await download(sourceUrl);
  if (raw.length > MAX_BYTES) throw new Error(`too large (${raw.length} bytes)`);
  const sniffed = sniff(raw);
  if (!sniffed) throw new Error('unrecognised image bytes');

  const key = `plans/${hash}.${sniffed.ext}`;
  const publicUrl = `https://${R2_PUBLIC_HOST}/${key}`;

  if (!FORCE && (await objectExists(key))) return { publicUrl, skippedUpload: true };
  if (DRY_RUN) return { publicUrl, dryRun: true };

  const out = await reencode(raw, sniffed);
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: out,
      ContentType: sniffed.ct,
      CacheControl: 'public, max-age=31536000, immutable', // content-addressed → immutable
    })
  );
  return { publicUrl };
}

// simple concurrency pool
async function pool(items, size, fn) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]).catch((err) => ({ __error: err }));
    }
  });
  await Promise.all(workers);
  return results;
}

// --- main --------------------------------------------------------------------
async function main() {
  const files = (await readdir(PLANS_DIR)).filter((f) => f.endsWith('.json'));

  // Gather every distinct source URL across all plans (dedupe network work).
  /** @type {Map<string, {files:Set<string>}>} */
  const urls = new Map();
  const fileText = new Map();
  for (const f of files) {
    const p = join(PLANS_DIR, f);
    const text = await readFile(p, 'utf8');
    fileText.set(f, text);
    /** @type {any} */
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error(`✗ ${f}: invalid JSON, skipped — ${e.message}`);
      continue;
    }
    for (const img of json.images ?? []) {
      const u = img.url;
      if (!u || u.startsWith(`https://${R2_PUBLIC_HOST}/`)) continue; // already migrated
      if (!urls.has(u)) urls.set(u, { files: new Set() });
      urls.get(u).files.add(f);
    }
  }

  const sources = [...urls.keys()];
  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}${sources.length} source images to migrate ` +
      `across ${files.length} plan files${FORCE ? ' (force re-upload)' : ''}.`
  );
  if (sources.length === 0) {
    console.log('Nothing to do — every image is already on R2.');
    return;
  }

  // Upload (concurrent), build old→new URL map. The callback catches its own
  // error and attaches the url, so a failure is never anonymous.
  const rewrites = new Map(); // oldUrl -> newUrl
  const failures = []; // {url, error}
  let done = 0;
  const outcomes = await pool(sources, CONCURRENCY, async (url) => {
    try {
      const r = await migrateOne(url);
      return { url, publicUrl: r.publicUrl };
    } catch (err) {
      return { url, error: err instanceof Error ? err.message : String(err) };
    } finally {
      process.stdout.write(`\r  ${++done}/${sources.length}   `);
    }
  });
  process.stdout.write('\n');

  for (const o of outcomes) {
    if (o.error) failures.push({ url: o.url, error: o.error });
    else rewrites.set(o.url, o.publicUrl);
  }

  // Rewrite JSON files by exact-string URL replacement (minimal diff).
  let filesChanged = 0;
  for (const f of files) {
    let text = fileText.get(f);
    let changed = false;
    for (const [oldUrl, newUrl] of rewrites) {
      if (text.includes(`"${oldUrl}"`)) {
        text = text.split(`"${oldUrl}"`).join(`"${newUrl}"`);
        changed = true;
      }
    }
    if (changed && !DRY_RUN) {
      const p = join(PLANS_DIR, f);
      const tmp = `${p}.tmp`;
      await writeFile(tmp, text, 'utf8');
      await rename(tmp, p); // atomic swap
      filesChanged++;
    } else if (changed) {
      filesChanged++;
    }
  }

  // Summary.
  console.log(`\n${DRY_RUN ? '[dry-run] would rewrite' : 'Rewrote'} ${filesChanged} plan files.`);
  console.log(`Uploaded/mapped: ${rewrites.size} images.`);
  if (failures.length) {
    console.error(`\n✗ ${failures.length} FAILURES (left untouched — fix and re-run):`);
    for (const { url, error } of failures) console.error(`   ${error}  ${url}`);
    process.exit(1);
  }
  console.log(
    DRY_RUN
      ? '\nDry run only — nothing uploaded or written. Re-run without --dry-run.'
      : '\n✓ Done. Review the git diff, then re-seed so production picks up the new URLs.'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
