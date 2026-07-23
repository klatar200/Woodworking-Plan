// @ts-check
/**
 * swap-catalog.mjs — replace the live plan catalog with an import dir, and remove the
 * learning paths that reference the outgoing plans. FILE-SYSTEM ONLY, native, no tokens.
 *
 * The full-swap apply step (Kreg import → live catalog). It:
 *   1. deletes every content/plans/*.json (the outgoing catalog),
 *   2. moves content/plans-import/*.json → content/plans/,
 *   3. deletes content/paths/*.json — REQUIRED: load.ts throws on a path whose plan no
 *      longer exists, so leaving them breaks validate / seed / build.
 *
 * It does NOT touch git or the database — you commit the diff yourself (recommended: on a
 * branch; git history is the backup), then reset+seed separately (reset-plans-db.mjs).
 *
 * SAFETY: dry-run by DEFAULT. Requires --yes to change anything. Refuses if the import dir
 * has fewer than --min files (so it can never wipe the catalog with an empty import). If
 * R2_PUBLIC_HOST is in the environment it also warns about any images not yet re-hosted.
 *
 * RUN (PowerShell, repo root):
 *   node scripts/swap-catalog.mjs                 # preview (dry-run)
 *   node scripts/swap-catalog.mjs --yes           # execute
 *   node scripts/swap-catalog.mjs --from content/plans-import --min 500 --yes
 */
import { readdir, readFile, rm, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const YES = argv.includes('--yes');
const FROM_REL = opt('--from', 'content/plans-import');
const FROM = join(ROOT, FROM_REL);
const PLANS = join(ROOT, 'content', 'plans');
const PATHS = join(ROOT, 'content', 'paths');
const MIN_IMPORT = Number(opt('--min', '500'));

async function jsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return (await readdir(dir)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
}

const importFiles = await jsonFiles(FROM);
const currentPlans = await jsonFiles(PLANS);
const pathFiles = await jsonFiles(PATHS);

if (importFiles.length < MIN_IMPORT) {
  console.error(
    `✗ REFUSING: ${FROM_REL} has ${importFiles.length} plan files (< --min ${MIN_IMPORT}).\n` +
      '  Run `node scripts/import-kreg-plans.mjs` first, or lower --min if this is intentional.',
  );
  process.exit(1);
}

// Optional pre-flight: warn about images that were not re-hosted (would render broken).
const host = (process.env.R2_PUBLIC_HOST || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
if (host) {
  let plansWithNonR2 = 0, badImgs = 0;
  for (const f of importFiles) {
    let json; try { json = JSON.parse(await readFile(join(FROM, f), 'utf8')); } catch { continue; }
    const urls = [...(json.images || []).map((i) => i.url), ...(json.steps || []).map((s) => s.image).filter(Boolean)];
    const bad = urls.filter((u) => u && !u.includes(`//${host}/`));
    if (bad.length) { plansWithNonR2++; badImgs += bad.length; }
  }
  if (plansWithNonR2) {
    console.warn(`⚠ ${plansWithNonR2} plans still reference ${badImgs} image(s) NOT on R2 (${host}).`);
    console.warn('  Re-run images:migrate to completion (0 failed) — and park any 404s — BEFORE swapping,');
    console.warn('  or those images will render broken. (Warning only; not blocking.)\n');
  } else {
    console.log(`✓ All images in ${FROM_REL} are on R2 (${host}).\n`);
  }
}

console.log('Swap plan:');
console.log(`  content/plans:  replace ${currentPlans.length}  →  ${importFiles.length}  (from ${FROM_REL})`);
console.log(`  content/paths:  delete  ${pathFiles.length}  (they reference the outgoing plans)`);

if (!YES) {
  console.log('\n[dry-run] nothing changed. Re-run with --yes to execute.');
  console.log('Be on a branch first — git history is your backup.');
  process.exit(0);
}

for (const f of currentPlans) await rm(join(PLANS, f));
for (const f of importFiles) await rename(join(FROM, f), join(PLANS, f));
try { await rm(FROM, { recursive: true, force: true }); } catch { /* leave a non-empty import dir */ }
for (const f of pathFiles) await rm(join(PATHS, f));

const now = (await jsonFiles(PLANS)).length;
console.log(`\n✓ Swapped. content/plans now has ${now} plans; ${pathFiles.length} learning paths removed.`);
console.log('Next: node scripts/validate-plans.mjs  →  review `git status` / `git diff` →  commit on your branch.');
console.log('Then reset+seed: reset-plans-db.mjs (below) then `npm run db:seed`.');
