// @ts-check
/**
 * Migrate plan photos onto Cloudflare R2 — HARDENED for a large (16k+) run.
 * DECISIONS_LOG 2026-07-17; large-run hardening 2026-07-23.
 *
 * For every `content/plans/*.json` (or a dir passed as the first arg), each image
 * whose URL is NOT already on our R2 host is downloaded, RE-ENCODED + EXIF-stripped
 * (a re-hosted phone photo carries GPS in EXIF — re-encoding via sharp drops all
 * metadata), uploaded to R2, and its URL rewritten in place. `steps[].image` is
 * rewritten too (it is always one of the plan's own `images[]`, so the same string
 * replace catches it).
 *
 * HARDENING FOR SCALE (why this survives a 16k run on a laptop):
 * - SAVE POINTS: a durable JSONL ledger (`.r2-migration-ledger.jsonl`) records every
 *   image the moment it finishes (done|failed + the R2 URL). A crash / Ctrl-C / dropped
 *   Wi-Fi loses at most the images in flight. Re-running SKIPS every done image with
 *   ZERO network — no re-download, no HEAD — and retries only the failures.
 * - TWO IDEMPOTENT PHASES: upload (fills the ledger) then rewrite (applies the ledger to
 *   the JSON). Either can be re-run alone (`--upload-only` / `--rewrite-only`); the
 *   rewrite is a no-op on already-rewritten files, so a mid-run crash never corrupts.
 * - REAL PARALLELISM, MATCHED TO THE WORK: the work is network-bound (fetch + PUT), so it
 *   runs many transfers concurrently in ONE process (an async pool — more OS processes
 *   would not speed network I/O and would fight over the ledger). The CPU step (sharp
 *   re-encode) is spread across ALL cores via `UV_THREADPOOL_SIZE` + `sharp.concurrency`,
 *   so it is never the bottleneck. Tune width with `MIGRATE_CONCURRENCY`.
 * - RETRY WITH BACKOFF on transient network errors (429 / 5xx / reset); 404s fail fast.
 * - QUALITY KEPT: photos → WebP q80; PNG/GIF (diagrams, line art, text) → LOSSLESS WebP.
 *   Optional `--max-dim N` downscales only oversized images (fit inside, never enlarge) —
 *   next/image serves responsive sizes anyway, so a 2000px cap is invisible but saves R2.
 *
 * RUN (on Keagan's machine — needs R2 secrets + network; NO tokens, pure Node):
 *   node scripts/migrate-images-to-r2.mjs content/plans-import --webp --max-dim 2000 --dry-run
 *   node scripts/migrate-images-to-r2.mjs content/plans-import --webp --max-dim 2000
 *   MIGRATE_CONCURRENCY=16 node scripts/migrate-images-to-r2.mjs content/plans-import --webp
 *   node scripts/migrate-images-to-r2.mjs content/plans-import --rewrite-only   # apply ledger only
 *
 * REQUIRED env (.env.local; the npm script loads it via dotenv-cli):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_HOST
 */

import os from 'node:os';
// Give libuv (sharp/libvips + fs) a thread per core BEFORE any threadpool work starts.
process.env.UV_THREADPOOL_SIZE ||= String(Math.max(4, os.cpus().length));

import { readFile, writeFile, readdir, rename, appendFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// One libvips thread per sharp op, so our N concurrent ops map to ~N cores (not N×cores).
sharp.concurrency(1);

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── args / flags ─────────────────────────────────────────────────────────────
const ARGV = process.argv.slice(2);
const flag = (name) => ARGV.includes(name);
const opt = (name, dflt) => { const i = ARGV.indexOf(name); return i >= 0 && ARGV[i + 1] ? ARGV[i + 1] : dflt; };

const DIR_ARG = ARGV.find((a) => !a.startsWith('--') && ARGV[ARGV.indexOf(a) - 1] !== '--max-dim');
const PLANS_DIR = DIR_ARG
  ? (isAbsolute(DIR_ARG) ? DIR_ARG : join(process.cwd(), DIR_ARG))
  : join(__dirname, '..', 'content', 'plans');

const DRY_RUN = flag('--dry-run');
const FORCE = flag('--force');
const TO_WEBP = flag('--webp');
const UPLOAD_ONLY = flag('--upload-only');
const REWRITE_ONLY = flag('--rewrite-only');
const MAX_DIM = Number(opt('--max-dim', '0')) || 0; // 0 = no resize
const CONCURRENCY = Number(process.env.MIGRATE_CONCURRENCY) || 8;
const LEDGER = join(PLANS_DIR, '..', '.r2-migration-ledger.jsonl');

const CONCURRENCY_MAX_BYTES = 15 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const RETRIES = 4;

// ── env ──────────────────────────────────────────────────────────────────────
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;

function normalisePublicHost(raw) {
  if (!raw) return raw;
  const host = raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (/\.r2\.cloudflarestorage\.com$/i.test(host)) {
    console.error(
      `✗ R2_PUBLIC_HOST is the S3 API endpoint (${host}).\n` +
        '  That endpoint only serves authenticated, signed requests — images will never\n' +
        '  load in a browser from it. Use the bucket PUBLIC host (pub-xxxx.r2.dev), no scheme.',
    );
    process.exit(1);
  }
  return host;
}
const R2_PUBLIC_HOST = normalisePublicHost(process.env.R2_PUBLIC_HOST);

const missing = Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_HOST })
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length && !DRY_RUN && !REWRITE_ONLY) {
  console.error(`✗ Missing required env: ${missing.join(', ')}\n  Set them in .env.local and run via \`npm run images:migrate\`.`);
  process.exit(1);
}

const s3 =
  (DRY_RUN || REWRITE_ONLY) && missing.length
    ? null
    : new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: /** @type {string} */ (R2_ACCESS_KEY_ID),
          secretAccessKey: /** @type {string} */ (R2_SECRET_ACCESS_KEY),
        },
      });

// ── helpers ──────────────────────────────────────────────────────────────────
function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { fmt: 'jpeg', ext: 'jpg', ct: 'image/jpeg' };
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { fmt: 'png', ext: 'png', ct: 'image/png' };
  if (buf.length > 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return { fmt: 'gif', ext: 'png', ct: 'image/png' };
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { fmt: 'webp', ext: 'webp', ct: 'image/webp' };
  return null;
}

/** Re-encode, strip metadata, optionally downscale. Quality preserved per source kind. */
async function reencode(buf, sniffed) {
  let img = sharp(buf, { limitInputPixels: MAX_PIXELS, animated: false }).rotate(); // bake+drop EXIF orientation
  if (MAX_DIM > 0) img = img.resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true });
  if (TO_WEBP) {
    const graphic = sniffed.fmt === 'png' || sniffed.fmt === 'gif';
    return img.webp(graphic ? { lossless: true, effort: 4 } : { quality: 80, effort: 4 }).toBuffer();
  }
  switch (sniffed.ext) {
    case 'jpg': return img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    case 'png': return img.png({ compressionLevel: 9 }).toBuffer();
    case 'webp': return img.webp({ quality: 82 }).toBuffer();
    default: throw new Error(`unhandled ext ${sniffed.ext}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.status === 404 || res.status === 410) throw new Error(`HTTP ${res.status}`); // permanent — no retry
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { transient: res.status === 429 || res.status >= 500 });
      const len = Number(res.headers.get('content-length') || 0);
      if (len && len > CONCURRENCY_MAX_BYTES) throw new Error(`too large (${len} bytes)`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > CONCURRENCY_MAX_BYTES) throw new Error(`too large (${buf.length} bytes)`);
      return buf;
    } catch (err) {
      lastErr = err;
      const transient = err?.transient || /network|fetch failed|ECONN|ETIMEDOUT|EAI_AGAIN|reset/i.test(String(err?.message));
      if (!transient || attempt === RETRIES) throw err;
      await sleep(300 * 2 ** (attempt - 1)); // 300ms, 600, 1200…
    }
  }
  throw lastErr;
}

async function objectExists(key) {
  if (!s3) return false;
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key })); return true; } catch { return false; }
}

/** Upload one source URL → R2, return the new public URL. Idempotent by key. */
async function migrateOne(sourceUrl) {
  const hash = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16);
  // Fast-path: with --webp the key is known before download → skip fetch for done images.
  if (TO_WEBP && !FORCE) {
    const key = `plans/${hash}.webp`;
    if (await objectExists(key)) return { publicUrl: `https://${R2_PUBLIC_HOST}/${key}`, skippedUpload: true };
  }
  const raw = await download(sourceUrl);
  const sniffed = sniff(raw);
  if (!sniffed) throw new Error('unrecognised image bytes');
  const ext = TO_WEBP ? 'webp' : sniffed.ext;
  const ct = TO_WEBP ? 'image/webp' : sniffed.ct;
  const key = `plans/${hash}.${ext}`;
  const publicUrl = `https://${R2_PUBLIC_HOST}/${key}`;
  if (!FORCE && (await objectExists(key))) return { publicUrl, skippedUpload: true };
  if (DRY_RUN) return { publicUrl, dryRun: true };
  const out = await reencode(raw, sniffed);
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: out, ContentType: ct,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return { publicUrl };
}

// ── ledger (save points) ──────────────────────────────────────────────────────
/** @returns {Map<string,{publicUrl?:string,status:string}>} */
function loadLedger() {
  const map = new Map();
  if (!existsSync(LEDGER)) return map;
  for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); map.set(r.url, r); } catch { /* skip a torn last line */ }
  }
  return map;
}
async function appendLedger(rec) {
  await appendFile(LEDGER, JSON.stringify(rec) + '\n', 'utf8');
}

// ── concurrency pool ───────────────────────────────────────────────────────────
async function pool(items, size, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length || 1) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx], idx); }
  });
  await Promise.all(workers);
}

// ── phases ─────────────────────────────────────────────────────────────────────
async function gatherSources(files) {
  const urls = new Set();
  const fileText = new Map();
  for (const f of files) {
    const text = await readFile(join(PLANS_DIR, f), 'utf8');
    fileText.set(f, text);
    let json;
    try { json = JSON.parse(text); } catch (e) { console.error(`✗ ${f}: invalid JSON, skipped — ${e.message}`); continue; }
    for (const img of json.images ?? []) {
      const u = img.url;
      if (!u || u.startsWith(`https://${R2_PUBLIC_HOST}/`)) continue;
      urls.add(u);
    }
  }
  return { urls: [...urls], fileText };
}

async function rewritePhase(files, fileText, ledger) {
  const rewrites = new Map();
  for (const [url, rec] of ledger) if (rec.status === 'done' && rec.publicUrl) rewrites.set(url, rec.publicUrl);
  let filesChanged = 0;
  for (const f of files) {
    let text = fileText.get(f) ?? (await readFile(join(PLANS_DIR, f), 'utf8'));
    let changed = false;
    for (const [oldUrl, newUrl] of rewrites) {
      if (text.includes(`"${oldUrl}"`)) { text = text.split(`"${oldUrl}"`).join(`"${newUrl}"`); changed = true; }
    }
    if (changed) {
      filesChanged++;
      if (!DRY_RUN) { const p = join(PLANS_DIR, f); const tmp = `${p}.tmp`; await writeFile(tmp, text, 'utf8'); await rename(tmp, p); }
    }
  }
  console.log(`${DRY_RUN ? '[dry-run] would rewrite' : 'Rewrote'} ${filesChanged} plan files from ${rewrites.size} mapped URLs.`);
}

// ── main ───────────────────────────────────────────────────────────────────────
async function main() {
  const files = (await readdir(PLANS_DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const ledger = loadLedger();

  if (REWRITE_ONLY) {
    console.log(`[rewrite-only] applying ${[...ledger.values()].filter((r) => r.status === 'done').length} ledger entries.`);
    await rewritePhase(files, new Map(), ledger);
    return;
  }

  const { urls, fileText } = await gatherSources(files);
  const todo = urls.filter((u) => ledger.get(u)?.status !== 'done'); // resume: skip done, instantly
  const alreadyDone = urls.length - todo.length;
  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}${urls.length} source images (${alreadyDone} already done in ledger, ${todo.length} to do) ` +
      `across ${files.length} files · concurrency ${CONCURRENCY} · ${MAX_DIM ? `max-dim ${MAX_DIM}` : 'no resize'}${TO_WEBP ? ' · webp' : ''}.`,
  );

  let done = 0, ok = 0, skipped = 0, failed = 0;
  await pool(todo, CONCURRENCY, async (url) => {
    try {
      const r = await migrateOne(url);
      if (r.skippedUpload) skipped++; else ok++;
      if (!DRY_RUN) await appendLedger({ url, publicUrl: r.publicUrl, status: 'done', at: Date.now() });
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      if (!DRY_RUN) await appendLedger({ url, status: 'failed', error: msg, at: Date.now() });
      process.stderr.write(`\n  ✗ ${msg}  ${url}`);
    } finally {
      if (++done % 50 === 0 || done === todo.length) process.stdout.write(`\r  ${done}/${todo.length}  (ok ${ok} · skipped ${skipped} · failed ${failed})   `);
    }
  });
  process.stdout.write('\n');

  if (!UPLOAD_ONLY) await rewritePhase(files, fileText, loadLedger());

  if (failed > 0) {
    console.error(`\n✗ ${failed} image(s) failed — recorded in the ledger. Fix/ignore, then re-run to retry ONLY those.`);
    process.exit(1);
  }
  console.log(
    DRY_RUN
      ? '\nDry run — nothing uploaded or written.'
      : '\n✓ Done. Review the git diff, then re-seed so production picks up the new URLs.',
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
