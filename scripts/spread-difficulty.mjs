// @ts-check
/**
 * spread-difficulty.mjs — widen difficulty from Kreg's 3 tiers to the full 1–5 scale,
 * IN PLACE on content/plans/*.json. Pure/deterministic, native, no tokens, no re-import.
 *
 * Kreg only classifies easy/moderate/advanced (→ difficulty 2/3/4), so the difficulty
 * filter only ever offered three options. This nudges the ENDS of the scale by build
 * complexity (index = steps + cut-list rows + materials), which the plan already carries:
 *   - an EASY plan that is genuinely trivial (low complexity) → 1
 *   - an ADVANCED plan that is genuinely involved (high complexity) → 5
 *   - everything else keeps its tier (2 / 3 / 4)
 * It does NOT invent granularity from nothing — it refines a coarse real signal with a
 * real complexity measure. Idempotent (1/3/5 are fixed points; safe to re-run).
 *
 * SAFETY: dry-run by DEFAULT (prints the before/after spread). --write to apply.
 * After applying, re-seed so the DB picks it up:  npm run db:seed
 *
 * RUN (PowerShell, repo root):
 *   node scripts/spread-difficulty.mjs             # preview
 *   node scripts/spread-difficulty.mjs --write     # apply, then: npm run db:seed
 */
import { readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const DIR = join(ROOT, argv.find((a) => !a.startsWith('--')) || 'content/plans');

// Split points on the complexity index (tuned to the catalog's distribution: easy p25≈14,
// advanced runs high). Only the ends move — the middle tier stays put.
const LOW = 14;   // easy AND ≤ this → 1
const HIGH = 40;  // advanced AND ≥ this → 5

const complexity = (p) => (p.steps?.length || 0) + (p.cutList?.length || 0) + (p.materials?.length || 0);

/** base ∈ {2,3,4} (or already 1/5) → spread 1..5. Fixed points at 1/3/5 make it idempotent. */
function spread(base, c) {
  if (base === 2 && c <= LOW) return 1;
  if (base === 4 && c >= HIGH) return 5;
  return base;
}

if (!existsSync(DIR)) { console.error(`✗ ${DIR} does not exist.`); process.exit(1); }

const files = (await readdir(DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const before = {}, after = {};
let changed = 0;

for (const f of files) {
  const p = join(DIR, f);
  let plan;
  try { plan = JSON.parse(await readFile(p, 'utf8')); } catch { console.error(`✗ ${f}: invalid JSON, skipped`); continue; }
  const base = plan.difficulty;
  const next = spread(base, complexity(plan));
  before[base] = (before[base] || 0) + 1;
  after[next] = (after[next] || 0) + 1;
  if (next !== base) {
    changed++;
    if (WRITE) { plan.difficulty = next; const tmp = `${p}.tmp`; await writeFile(tmp, JSON.stringify(plan, null, 2) + '\n', 'utf8'); await rename(tmp, p); }
  }
}

const fmt = (o) => [1, 2, 3, 4, 5].map((k) => `${k}:${o[k] || 0}`).join('  ');
console.log(`files: ${files.length}`);
console.log(`before  ${fmt(before)}`);
console.log(`after   ${fmt(after)}   (${changed} changed)`);
console.log(WRITE ? '\n✓ Written. Now re-seed:  npm run db:seed' : '\n[dry-run] nothing written. Re-run with --write to apply.');
