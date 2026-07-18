// @ts-check
/**
 * Flip `"published": false` → `true` across content/plans/*.json.
 *
 * WHY A SCRIPT: publishing is a CONTENT decision, and the catalog is 1,000+ files.
 * Doing it by hand is error-prone; doing it in the DB would be wrong (the JSON is
 * the source of truth — a hand-edited DB is overwritten by the next seed).
 *
 * Format-preserving: a single-token text replacement, so `git diff` shows one
 * changed line per plan and nothing else. Idempotent.
 *
 * QUALITY GATES (opt-in) — a plan can be held back rather than shipped thin:
 *   --skip-empty-cutlist   leave plans whose cutList is [] unpublished
 *   --skip-empty-images    leave plans whose images is [] unpublished
 *
 * RUN (PowerShell, repo root):
 *   npm run plans:publish -- --dry-run                      # report only
 *   npm run plans:publish                                   # publish everything
 *   npm run plans:publish -- --skip-empty-cutlist           # hold thin plans back
 *   npm run plans:publish -- --unpublish                    # reverse it
 *
 * Remember: content does NOT reach production on deploy. Re-seed afterwards.
 */

import { readFile, writeFile, readdir, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLANS_DIR = join(__dirname, '..', 'content', 'plans');

const DRY_RUN = process.argv.includes('--dry-run');
const UNPUBLISH = process.argv.includes('--unpublish');
const SKIP_EMPTY_CUTLIST = process.argv.includes('--skip-empty-cutlist');
const SKIP_EMPTY_IMAGES = process.argv.includes('--skip-empty-images');

const FROM = UNPUBLISH ? 'true' : 'false';
const TO = UNPUBLISH ? 'false' : 'true';

async function main() {
  const files = (await readdir(PLANS_DIR)).filter((f) => f.endsWith('.json'));

  let changed = 0;
  let already = 0;
  const held = { cutList: [], images: [] };

  for (const f of files) {
    const p = join(PLANS_DIR, f);
    const text = await readFile(p, 'utf8');

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error(`✗ ${f}: invalid JSON, skipped — ${e.message}`);
      continue;
    }

    // Already in the desired state (or key omitted, which schema-defaults to true).
    if (json.published === (TO === 'true')) {
      already++;
      continue;
    }

    if (!UNPUBLISH) {
      if (SKIP_EMPTY_CUTLIST && (json.cutList ?? []).length === 0) {
        held.cutList.push(json.slug ?? f);
        continue;
      }
      if (SKIP_EMPTY_IMAGES && (json.images ?? []).length === 0) {
        held.images.push(json.slug ?? f);
        continue;
      }
    }

    const needle = `"published": ${FROM}`;
    if (!text.includes(needle)) {
      console.error(`⚠ ${f}: expected ${needle} in the text but did not find it — skipped.`);
      continue;
    }
    const newText = text.replace(needle, `"published": ${TO}`);

    // Sanity: still valid JSON, and the flag actually flipped.
    const reparsed = JSON.parse(newText);
    if (reparsed.published !== (TO === 'true')) {
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

  const verb = UNPUBLISH ? 'unpublish' : 'publish';
  console.log(
    `${DRY_RUN ? `[dry-run] would ${verb}` : `${verb === 'publish' ? 'Published' : 'Unpublished'}`} ` +
      `${changed} plans. (${already} already in that state.)`
  );
  if (held.cutList.length)
    console.log(`  held back — empty cutList: ${held.cutList.length}`);
  if (held.images.length)
    console.log(`  held back — empty images:  ${held.images.length}`);
  if (!DRY_RUN && changed > 0)
    console.log('\n✓ Done. Run `npm test`, review the diff, then re-seed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
