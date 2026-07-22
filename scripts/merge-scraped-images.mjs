#!/usr/bin/env node
/**
 * scripts/merge-scraped-images.mjs
 *
 * Adds the EXTRA photos from a fresh scrape onto the EXISTING, already-authored
 * plans in content/plans/*.json — without touching a single authored field.
 *
 * WHY THIS EXISTS (and why it is NOT the importer):
 *   import-legacy-plans.mjs turns plans.json into brand-new DRAFT files
 *   (content/plans-import/), with TODO summaries and sentinel cost/time. Running
 *   it again would NOT enrich the live catalog — it would produce throwaway
 *   drafts and lose every hand-authored description/category/cost. This script is
 *   the opposite: it leaves the authored content alone and only APPENDS the newly
 *   scraped images (the ones the updated scraper.py now captures beyond the first)
 *   to each matching plan's `images[]`, so a later pass can assign them to steps.
 *
 * MATCHING a scraped page → an existing plan is the hard part, because authored
 * titles/slugs drift and the existing primary photo is an R2 URL, not the source.
 * Three signals, most-reliable first:
 *   1. IMAGE HASH — the migrator keyed each R2 object as sha256(sourceUrl)[:16]
 *      (migrate-images-to-r2.mjs). So a content image URL .../plans/<hash>.<ext>
 *      identifies its source. We hash each scraped image URL the same way; a match
 *      ties the scraped page to the plan REGARDLESS of any title/slug edits.
 *   2. UNRESOLVED URL — plans whose migration 404'd keep the original source URL
 *      in `unresolvedImages`; an exact URL match ties them too.
 *   3. SLUG — slugify(scraped title) == plan slug. Fallback only (drifts).
 *
 * DEDUPE is by identity, not string: a scraped image already represented (its hash
 * is one of the plan's R2 images, or its URL is already in images/unresolvedImages)
 * is skipped. Only genuinely-new photos are appended, as isPrimary:false — UNLESS
 * the plan currently has no primary at all, in which case the first added photo
 * becomes the primary (recovering an image-less plan).
 *
 * WRITE SAFETY: the ONLY thing that changes in a file is its `images` array, edited
 * by exact-string replacement of the reconstructed old block (minimal diff, like the
 * migrator). If the file's formatting doesn't match the canonical style the block is
 * reconstructed in, the file is SKIPPED and reported — never reformatted, never
 * corrupted. Re-running is idempotent (dedupe skips what's already there).
 *
 * DELIBERATELY OUT OF SCOPE: cost/time/category/description/steps — untouched.
 *
 * Usage (run AFTER a fresh scrape has produced an updated plans.json):
 *   node scripts/merge-scraped-images.mjs            # DRY RUN: preview + report only
 *   node scripts/merge-scraped-images.mjs --write     # actually edit content/plans/*.json
 *   node scripts/merge-scraped-images.mjs --source some/other/plans.json --write
 *
 * Reads:  plans.json (root, or --source), content/plans/*.json
 * Writes: content/plans/<slug>.json (images[] only), content/plans/_merge-images-report.json
 *
 * Zero dependencies — Node's fs + crypto only.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PLANS_DIR = join(ROOT, 'content', 'plans');

const WRITE = process.argv.includes('--write');
const sourceArgIdx = process.argv.indexOf('--source');
const SOURCE_FILE =
  sourceArgIdx !== -1 && process.argv[sourceArgIdx + 1]
    ? join(ROOT, process.argv[sourceArgIdx + 1])
    : join(ROOT, 'plans.json');

// --- identity helpers --------------------------------------------------------

/** The migrator's object key: sha256(sourceUrl) truncated to 16 hex chars. */
function hashUrl(url) {
  return createHash('sha256').update(url).digest('hex').slice(0, 16);
}

/** Extract the migrator hash from a content image URL like .../plans/<hash>.<ext>. */
function hashFromContentUrl(url) {
  const m = typeof url === 'string' && url.match(/\/plans\/([0-9a-f]{16})\./);
  return m ? m[1] : null;
}

/** Match import-legacy-plans.mjs's slug shape closely enough for a fallback. */
function slugify(str) {
  return String(str || '')
    .normalize('NFKD')
    .replace(/[‘’′]/g, "'")
    .replace(/[“”″]/g, '"')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Every image URL a scraped row exposes, in order (new + legacy shapes). */
function scrapedImageUrls(row) {
  const list = Array.isArray(row.images) && row.images.length
    ? row.images
    : row.image
      ? [row.image]
      : [];
  const seen = new Set();
  const out = [];
  for (const u of list) {
    const url = typeof u === 'string' ? u.trim() : '';
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

// --- canonical images-block (de)serialiser -----------------------------------
// Reproduces the exact on-disk style so we can exact-string-replace it:
//   "images": []                                            (empty)
//   "images": [\n    { "url": "..", "alt": "..", "isPrimary": .. },\n    ..\n  ]

function serializeImagesBlock(images, indent = '  ') {
  if (images.length === 0) return `${indent}"images": []`;
  const el = indent + '  ';
  const lines = images.map(
    (im) =>
      `${el}{ "url": ${JSON.stringify(im.url)}, "alt": ${JSON.stringify(im.alt)}, "isPrimary": ${im.isPrimary === true} }`,
  );
  return `${indent}"images": [\n${lines.join(',\n')}\n${indent}]`;
}

// --- load content ------------------------------------------------------------

function loadContent() {
  const files = readdirSync(PLANS_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const plans = [];
  for (const file of files) {
    const path = join(PLANS_DIR, file);
    let text;
    let json;
    try {
      text = readFileSync(path, 'utf8');
      json = JSON.parse(text);
    } catch (e) {
      plans.push({ file, path, parseError: e.message });
      continue;
    }
    const images = Array.isArray(json.images) ? json.images : [];
    const unresolved = Array.isArray(json.unresolvedImages) ? json.unresolvedImages : [];
    const imageHashes = new Set(images.map((im) => hashFromContentUrl(im.url)).filter(Boolean));
    const imageUrls = new Set(images.map((im) => im.url));
    const unresolvedUrls = new Set(unresolved.map((im) => im.url));
    const hasPrimary = images.some((im) => im.isPrimary === true);
    plans.push({
      file, path, text, json,
      slug: json.slug,
      title: json.title,
      images, imageHashes, imageUrls, unresolvedUrls, hasPrimary,
    });
  }
  return plans;
}

// --- match scraped rows to content plans -------------------------------------

function buildIndexes(content) {
  const byHash = new Map(); // content image hash -> plan
  const byUnresolved = new Map(); // unresolved source url -> plan
  const bySlug = new Map(); // slug -> plan
  for (const p of content) {
    if (p.parseError) continue;
    for (const h of p.imageHashes) if (!byHash.has(h)) byHash.set(h, p);
    for (const u of p.unresolvedUrls) if (!byUnresolved.has(u)) byUnresolved.set(u, p);
    if (p.slug && !bySlug.has(p.slug)) bySlug.set(p.slug, p);
  }
  return { byHash, byUnresolved, bySlug };
}

function matchPlan(row, urls, idx) {
  // 1. image hash (most reliable — survives title/slug edits)
  for (const u of urls) {
    const p = idx.byHash.get(hashUrl(u));
    if (p) return { plan: p, by: 'image-hash' };
  }
  // 2. unresolved (parked) source url
  for (const u of urls) {
    const p = idx.byUnresolved.get(u);
    if (p) return { plan: p, by: 'unresolved-url' };
  }
  // 3. slug fallback
  const p = idx.bySlug.get(slugify(row.title));
  if (p) return { plan: p, by: 'slug' };
  return null;
}

// --- main --------------------------------------------------------------------

function main() {
  let source;
  try {
    source = JSON.parse(readFileSync(SOURCE_FILE, 'utf8'));
  } catch (e) {
    console.error(`Cannot read/parse source ${SOURCE_FILE}: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(source)) {
    console.error(`Source ${SOURCE_FILE} is not a JSON array of scraped plans.`);
    process.exit(1);
  }

  const content = loadContent();
  const parseErrors = content.filter((p) => p.parseError);
  const idx = buildIndexes(content);

  const report = {
    mode: WRITE ? 'write' : 'dry-run',
    source: SOURCE_FILE,
    scrapedRows: source.length,
    contentPlans: content.length - parseErrors.length,
    parseErrors: parseErrors.map((p) => ({ file: p.file, error: p.parseError })),
    updated: [],
    formatSkips: [],
    unmatchedScraped: 0,
    unmatchedSamples: [],
    totals: { plansUpdated: 0, imagesAdded: 0, primariesRecovered: 0, formatSkipped: 0 },
  };

  const touched = new Set(); // guard: one content plan updated at most once

  for (const row of source) {
    const urls = scrapedImageUrls(row);
    if (urls.length === 0) continue;

    const match = matchPlan(row, urls, idx);
    if (!match) {
      report.unmatchedScraped += 1;
      if (report.unmatchedSamples.length < 25) {
        report.unmatchedSamples.push({ title: row.title, url: row.url });
      }
      continue;
    }
    const p = match.plan;
    if (touched.has(p.file)) continue; // already handled by an earlier scraped row

    // Which scraped images are genuinely new to this plan?
    const newUrls = urls.filter(
      (u) => !p.imageHashes.has(hashUrl(u)) && !p.imageUrls.has(u) && !p.unresolvedUrls.has(u),
    );
    if (newUrls.length === 0) continue; // nothing to add — idempotent no-op

    // Build the appended entries. First-photo-becomes-primary ONLY if the plan
    // has no primary today (image recovery); otherwise all additions are extras.
    let recoveredPrimary = false;
    let extraN = 0;
    const additions = newUrls.map((url) => {
      const makePrimary = !p.hasPrimary && !recoveredPrimary;
      if (makePrimary) {
        recoveredPrimary = true;
        return { url, alt: p.title || p.slug, isPrimary: true };
      }
      extraN += 1;
      return { url, alt: `${p.title || p.slug} — additional photo ${extraN}`, isPrimary: false };
    });

    // Reconstruct the current images block; it MUST appear verbatim exactly once,
    // or we refuse to touch the file (formatting we don't recognise).
    const oldBlock = serializeImagesBlock(p.images);
    const occurrences = p.text.split(oldBlock).length - 1;
    if (occurrences !== 1) {
      report.formatSkips.push({
        slug: p.slug,
        file: p.file,
        reason: `could not locate a unique canonical images block (found ${occurrences}); left untouched`,
        wouldAdd: newUrls.length,
      });
      report.totals.formatSkipped += 1;
      continue;
    }
    const newBlock = serializeImagesBlock([...p.images, ...additions]);
    const newText = p.text.replace(oldBlock, newBlock);

    if (WRITE) writeFileSync(p.path, newText, 'utf8');

    touched.add(p.file);
    report.updated.push({
      slug: p.slug,
      matchedBy: match.by,
      imagesAdded: additions.length,
      primaryRecovered: recoveredPrimary,
      newUrls,
    });
    report.totals.plansUpdated += 1;
    report.totals.imagesAdded += additions.length;
    if (recoveredPrimary) report.totals.primariesRecovered += 1;
  }

  if (WRITE) {
    writeFileSync(join(PLANS_DIR, '_merge-images-report.json'), JSON.stringify(report, null, 2), 'utf8');
  }

  console.log(`Mode:              ${report.mode}${WRITE ? '' : '  (no files written — pass --write to apply)'}`);
  console.log(`Scraped rows:      ${report.scrapedRows}`);
  console.log(`Content plans:     ${report.contentPlans}${parseErrors.length ? `  (${parseErrors.length} unparseable)` : ''}`);
  console.log(`Plans updated:     ${report.totals.plansUpdated}`);
  console.log(`Images added:      ${report.totals.imagesAdded}  (primaries recovered: ${report.totals.primariesRecovered})`);
  console.log(`Format-skipped:    ${report.totals.formatSkipped}  (recognised a match but not the formatting — review by hand)`);
  console.log(`Unmatched scraped: ${report.unmatchedScraped}`);
  if (!WRITE) {
    console.log('\nDry run — re-run with --write to apply. After writing, run the R2 migration');
    console.log('to re-host the new images, then re-seed. The validator must stay green throughout.');
  } else {
    console.log(`\nWrote ${report.totals.plansUpdated} files. Report: content/plans/_merge-images-report.json`);
    console.log('Next: node scripts/validate-plans.mjs  ->  images:migrate  ->  re-seed. Review the git diff first.');
  }
}

main();
