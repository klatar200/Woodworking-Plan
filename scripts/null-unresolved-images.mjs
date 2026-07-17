// @ts-check
/**
 * Null out plan images whose ORIGINAL source URL is dead (404), PRESERVING the
 * source URL for later recovery. DECISIONS_LOG 2026-07-17.
 *
 * Run this AFTER `images:migrate`. By then the only `www.ana-white.com` URLs left
 * in content/plans/*.json are the ones the migration could not fetch. For each such
 * image this script:
 *   - re-verifies the URL really is dead (HEAD, then GET fallback) — so running it
 *     out of order can NEVER null an image that still resolves; only genuine 404s
 *     are touched;
 *   - moves the image object (url + alt + isPrimary, UNCHANGED) from `images` into
 *     a new `unresolvedImages` array — the source URL is kept so the correct image
 *     can be looked up later;
 *   - empties `images`, so the plan renders the honest placeholder (PlanImageSlot)
 *     instead of a broken image.
 *
 * FORMAT-PRESERVING: it edits only the `images` array region of each file (via a
 * brace/bracket matcher), so the git diff shows just the image change, not a
 * whole-file reformat. Idempotent: an already-nulled plan has no ana-white URL left
 * and is skipped.
 *
 * RUN (PowerShell, repo root):
 *   npm run images:null-unresolved -- --dry-run   # report only, writes nothing
 *   npm run images:null-unresolved                # apply
 */

import { readFile, writeFile, readdir, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLANS_DIR = join(__dirname, '..', 'content', 'plans');

const DRY_RUN = process.argv.includes('--dry-run');
const SOURCE_HOST = 'www.ana-white.com';
const CONCURRENCY = 8;

/** True if the URL is genuinely gone (404/410) — NOT merely a transient error. */
async function isDead(url) {
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (res.status === 405 || res.status === 501) {
      // Server doesn't support HEAD — confirm with a GET.
      res = await fetch(url, { method: 'GET', redirect: 'follow' });
    }
    if (res.status === 404 || res.status === 410) return { dead: true };
    if (res.ok) return { dead: false };
    return { dead: false, uncertain: res.status }; // 5xx/403/etc → don't touch, report
  } catch (err) {
    return { dead: false, uncertain: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Find the exact substring of the `"images": [ ... ]` VALUE (the array, brackets
 * included) in raw JSON text, string- and escape-aware. Returns { start, end, indent }
 * where [start,end) spans the array text, or null.
 */
function locateImagesArray(text) {
  const keyIdx = text.indexOf('"images"');
  if (keyIdx === -1) return null;
  // indentation of the line the key sits on (to align the inserted sibling key)
  const lineStart = text.lastIndexOf('\n', keyIdx) + 1;
  const indent = text.slice(lineStart, keyIdx).match(/^\s*/)?.[0] ?? '';
  // first '[' after the key
  let i = text.indexOf('[', keyIdx);
  if (i === -1) return null;
  const start = i;
  let depth = 0;
  let inStr = false;
  for (; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') i++; // skip escaped char
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return { start, end: i + 1, indent };
    }
  }
  return null;
}

async function pool(items, size, fn) {
  let i = 0;
  const out = [];
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

async function main() {
  const files = (await readdir(PLANS_DIR)).filter((f) => f.endsWith('.json'));

  // Collect every candidate: a plan file with at least one image still on the
  // source host. Verify each distinct URL once.
  /** @type {{file:string, url:string}[]} */
  const candidates = [];
  const urlSet = new Set();
  for (const f of files) {
    const text = await readFile(join(PLANS_DIR, f), 'utf8');
    if (!text.includes(SOURCE_HOST)) continue;
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error(`✗ ${f}: invalid JSON, skipped — ${e.message}`);
      continue;
    }
    for (const img of json.images ?? []) {
      if (typeof img.url === 'string' && img.url.includes(`//${SOURCE_HOST}/`)) {
        candidates.push({ file: f, url: img.url });
        urlSet.add(img.url);
      }
    }
  }

  if (candidates.length === 0) {
    console.log(`No ${SOURCE_HOST} images remain — nothing to do.`);
    return;
  }

  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}Verifying ${urlSet.size} source URLs across ${candidates.length} plan images…`
  );
  const urls = [...urlSet];
  let checked = 0;
  const verdicts = new Map();
  const results = await pool(urls, CONCURRENCY, async (u) => {
    const r = await isDead(u);
    process.stdout.write(`\r  ${++checked}/${urls.length}   `);
    return [u, r];
  });
  process.stdout.write('\n');
  for (const [u, r] of results) verdicts.set(u, r);

  // Files that have at least one confirmed-dead image.
  const dead = new Set();
  const uncertain = [];
  for (const { file, url } of candidates) {
    const v = verdicts.get(url);
    if (v.dead) dead.add(file);
    else if (v.uncertain !== undefined) uncertain.push({ file, url, why: v.uncertain });
  }

  let changed = 0;
  for (const f of [...dead].sort()) {
    const p = join(PLANS_DIR, f);
    const text = await readFile(p, 'utf8');
    const json = JSON.parse(text);

    const deadImgs = (json.images ?? []).filter((i) => verdicts.get(i.url)?.dead);
    const keptImgs = (json.images ?? []).filter((i) => !verdicts.get(i.url)?.dead);
    if (deadImgs.length === 0) continue;

    // DEFENSIVE: this project has ≤1 image per plan, so a dead image means images
    // becomes empty. If a plan ever mixed a good + a dead image, the format-preserving
    // path can't cleanly reserialize the kept one — flag it for manual handling
    // rather than risk a bad edit.
    if (keptImgs.length > 0) {
      console.error(`⚠ ${f}: has both live and dead images — skipped, handle manually.`);
      continue;
    }

    const loc = locateImagesArray(text);
    if (!loc) {
      console.error(`⚠ ${f}: could not locate images array — skipped.`);
      continue;
    }
    const arrayText = text.slice(loc.start, loc.end); // original, formatting intact
    const replacement =
      `[]` + `,\n${loc.indent}"unresolvedImages": ${arrayText}`;
    const newText =
      text.slice(0, loc.start) + replacement + text.slice(loc.end);

    // Sanity: result must still be valid JSON and preserve the URL under the new key.
    const reparsed = JSON.parse(newText);
    if (
      reparsed.images.length !== 0 ||
      !Array.isArray(reparsed.unresolvedImages) ||
      reparsed.unresolvedImages.length !== deadImgs.length
    ) {
      console.error(`✗ ${f}: post-edit sanity check failed — skipped.`);
      continue;
    }

    if (!DRY_RUN) {
      const tmp = `${p}.tmp`;
      await writeFile(tmp, newText, 'utf8');
      await rename(tmp, p);
    }
    changed++;
  }

  console.log(
    `\n${DRY_RUN ? '[dry-run] would null' : 'Nulled'} images in ${changed} plans ` +
      `(source URL preserved under "unresolvedImages").`
  );
  if (uncertain.length) {
    console.warn(
      `\n⚠ ${uncertain.length} URLs were NOT confirmed dead (transient error / blocked) ` +
        `and were left untouched — re-run later if you expect them to resolve:`
    );
    for (const { file, why } of uncertain.slice(0, 30))
      console.warn(`   ${file}: ${why}`);
    if (uncertain.length > 30) console.warn(`   …and ${uncertain.length - 30} more.`);
  }
  if (!DRY_RUN && changed > 0) {
    console.log('\n✓ Done. Review `git diff content/plans`, then re-seed.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
