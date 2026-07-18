// @ts-check
/**
 * Repair plan image URLs that were written with the WRONG HOST or a doubled scheme.
 *
 * WHY THIS EXISTS (2026-07-17): the first migration run wrote 876 URLs shaped like
 *   https://https://<account>.r2.cloudflarestorage.com/plans/<key>.jpg
 * — two defects at once: the env value carried its own `https://`, and it was the
 * S3 API endpoint (signed requests only) rather than the bucket's PUBLIC r2.dev
 * host. The uploaded OBJECTS were fine; only the URLs were wrong, so this is a
 * pure text repair — nothing is re-downloaded or re-uploaded.
 *
 * WHAT IT DOES: any image URL whose path is `/plans/<something>` is rewritten to
 *   https://<R2_PUBLIC_HOST>/plans/<something>
 * keeping the object key untouched. Source-host URLs (still-unmigrated images) and
 * anything under `unresolvedImages` are left completely alone.
 *
 * Idempotent: a URL already on the correct host is unchanged.
 *
 * RUN (PowerShell, repo root):
 *   npm run images:fix-host -- --dry-run
 *   npm run images:fix-host
 */

import { readFile, writeFile, readdir, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLANS_DIR = join(__dirname, '..', 'content', 'plans');
const DRY_RUN = process.argv.includes('--dry-run');

function normalisePublicHost(raw) {
  if (!raw) return raw;
  const host = raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  if (/\.r2\.cloudflarestorage\.com$/i.test(host)) {
    console.error(
      `✗ R2_PUBLIC_HOST is the S3 API endpoint (${host}) — it only serves signed\n` +
        '  requests and can never load an image in a browser.\n' +
        '  Use the bucket PUBLIC host: R2 → bucket → Settings → Public access →\n' +
        '  r2.dev subdomain (pub-xxxxxxxx.r2.dev), with no https:// prefix.'
    );
    process.exit(1);
  }
  return host;
}

const HOST = normalisePublicHost(process.env.R2_PUBLIC_HOST);
if (!HOST) {
  console.error('✗ R2_PUBLIC_HOST is not set. Add it to .env.local and re-run.');
  process.exit(1);
}

// Matches any URL (however mangled the scheme/host) ending in /plans/<key>.
// The capture is the object key path we must preserve.
const URL_RE = /"url":\s*"[^"]*?(\/plans\/[A-Za-z0-9._-]+)"/g;

async function main() {
  const files = (await readdir(PLANS_DIR)).filter((f) => f.endsWith('.json'));
  let filesChanged = 0;
  let urlsChanged = 0;

  for (const f of files) {
    const p = join(PLANS_DIR, f);
    const text = await readFile(p, 'utf8');
    if (!text.includes('/plans/')) continue;

    let changedHere = 0;
    const newText = text.replace(URL_RE, (match, keyPath) => {
      const correct = `"url": "https://${HOST}${keyPath}"`;
      if (match === correct) return match; // already right — idempotent
      changedHere++;
      return correct;
    });

    if (changedHere === 0) continue;

    // Sanity: must still be valid JSON, and every image URL must now be absolute
    // and on the correct host.
    let reparsed;
    try {
      reparsed = JSON.parse(newText);
    } catch (e) {
      console.error(`✗ ${f}: repair produced invalid JSON — skipped (${e.message}).`);
      continue;
    }
    const bad = (reparsed.images ?? []).filter(
      (i) => !String(i.url).startsWith(`https://${HOST}/`)
    );
    if (bad.length) {
      console.error(`✗ ${f}: still has ${bad.length} off-host image URL(s) — skipped.`);
      continue;
    }

    if (!DRY_RUN) {
      const tmp = `${p}.tmp`;
      await writeFile(tmp, newText, 'utf8');
      await rename(tmp, p);
    }
    filesChanged++;
    urlsChanged += changedHere;
  }

  console.log(
    `${DRY_RUN ? '[dry-run] would repair' : 'Repaired'} ${urlsChanged} URLs ` +
      `across ${filesChanged} plan files → https://${HOST}/plans/…`
  );
  if (!DRY_RUN && filesChanged > 0) {
    console.log('\n✓ Done. Verify one URL loads in a browser, then re-seed.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
