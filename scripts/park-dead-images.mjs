// @ts-check
/**
 * park-dead-images.mjs — move dead (404) source images out of content/plans so the
 * catalog never renders a broken <img>. Kreg-aware and MULTI-IMAGE safe (unlike
 * null-unresolved-images.mjs, which assumes <=1 image per plan).
 *
 * After images:migrate, any image still on a NON-R2 host is one the migration could not
 * re-host. This HEAD-verifies each such URL and, for the CONFIRMED dead ones (404/410
 * only, never a transient 5xx/timeout):
 *   - removes it from images[]
 *   - clears any steps[].image that pointed at it
 *   - appends it to unresolvedImages[] (url + alt preserved for later recovery)
 *   - promotes a new primary if the dead one was primary and others remain
 *   - if a plan ends up with NO images, sets published:false (the catalog never ships a
 *     published plan with an empty images array - tests/content.test.ts guards this)
 * Live images on the same plan are kept.
 *
 * Needs network (HEAD) -> run natively. Dry-run by default; --write to apply, then re-seed.
 *
 *   node scripts/park-dead-images.mjs                 # preview
 *   node scripts/park-dead-images.mjs --write         # apply
 */
import { readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const DIR = join(ROOT, argv.find((a) => !a.startsWith('--')) || 'content/plans');
const CONCURRENCY = 8;

// A "candidate" is an http(s) image URL that is NOT on our R2 host — i.e. a source URL
// the migration left behind. (Re-hosted images live on *.r2.dev.)
const isCandidate = (u) => typeof u === 'string' && /^https?:\/\//.test(u) && !/\.r2\.dev\//i.test(u);

/** True only for a genuinely gone URL (404/410) — never a transient error. */
async function isDead(url) {
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (res.status === 405 || res.status === 501) res = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (res.status === 404 || res.status === 410) return { dead: true };
    if (res.ok) return { dead: false };
    return { dead: false, uncertain: String(res.status) };
  } catch (e) {
    return { dead: false, uncertain: e instanceof Error ? e.message : String(e) };
  }
}

async function pool(items, size, fn) {
  let i = 0; const out = [];
  await Promise.all(Array.from({ length: size }, async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); } }));
  return out;
}

const files = (await readdir(DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));

// 1) gather distinct candidate URLs
const urlSet = new Set();
for (const f of files) {
  let json; try { json = JSON.parse(await readFile(join(DIR, f), 'utf8')); } catch { continue; }
  for (const img of json.images ?? []) if (isCandidate(img.url)) urlSet.add(img.url);
}
if (urlSet.size === 0) { console.log('No non-R2 images remain — nothing to park.'); process.exit(0); }

// 2) verify each once
console.log(`${WRITE ? '' : '[dry-run] '}Verifying ${urlSet.size} non-R2 image URL(s)...`);
const verdicts = new Map();
let n = 0;
for (const [u, r] of await pool([...urlSet], CONCURRENCY, async (u) => { const r = await isDead(u); process.stdout.write(`\r  ${++n}/${urlSet.size}  `); return [u, r]; })) verdicts.set(u, r);
process.stdout.write('\n');

// 3) rewrite plans that carry a confirmed-dead image
let parked = 0, filesChanged = 0, unpublished = 0;
const uncertain = [];
for (const f of files) {
  const p = join(DIR, f);
  let json; try { json = JSON.parse(await readFile(p, 'utf8')); } catch { continue; }
  for (const img of json.images ?? []) if (isCandidate(img.url) && verdicts.get(img.url)?.uncertain !== undefined) uncertain.push(img.url);

  const deadSet = new Set((json.images ?? []).map((i) => i.url).filter((u) => verdicts.get(u)?.dead));
  if (deadSet.size === 0) continue;

  const removed = (json.images ?? []).filter((i) => deadSet.has(i.url));
  json.images = (json.images ?? []).filter((i) => !deadSet.has(i.url));
  for (const s of json.steps ?? []) if (s.image && deadSet.has(s.image)) delete s.image;
  if (json.images.length && !json.images.some((i) => i.isPrimary)) json.images[0].isPrimary = true;
  json.unresolvedImages = [...(json.unresolvedImages ?? []), ...removed];
  if (json.images.length === 0 && json.published !== false) { json.published = false; unpublished++; }

  parked += removed.length; filesChanged++;
  if (WRITE) { const tmp = `${p}.tmp`; await writeFile(tmp, JSON.stringify(json, null, 2) + '\n', 'utf8'); await rename(tmp, p); }
}

console.log(`${WRITE ? 'Parked' : '[dry-run] would park'} ${parked} dead image(s) across ${filesChanged} plan(s)${unpublished ? `; ${unpublished} plan(s) unpublished (no images left)` : ''}.`);
if (uncertain.length) console.log(`  ${new Set(uncertain).size} non-R2 URL(s) were NOT confirmed dead (transient) - left as-is; a migrate re-run may recover them.`);
console.log(WRITE ? '\n✓ Done. Run scripts/validate-plans.mjs, then re-seed.' : '\n[dry-run] nothing written. Re-run with --write to apply.');
