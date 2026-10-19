// pick-calibration.mjs — Stage 5: choose 30 more plans to read so calibration.md can show ~15
// Ship, ~15 Fix, ~10 Unpublish candidates. Deterministic. Not in any earlier batch.
//   20 sweep-clean plans spread over categories, half of them the longest / most sheet-heavy;
//   10 plans with R1 or R11 flags (the Unpublish-level script candidates), most flags first.
// Marks them batch "calib-1".."calib-3" with --write.
//   node audit/plan-quality/scripts/pick-calibration.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'audit/plan-quality/ledger.json';
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const plan = (slug) => JSON.parse(readFileSync(`content/plans/${slug}.json`, 'utf8'));
const free = ledger.filter((e) => !e.batch);
const score = (e) => (e.flagCount || 0) + 5 * e.tags.filter((t) => t.endsWith(':fail')).length;
const sheetHeavy = (slug) => plan(slug).materials.filter((m) => /plywood|\bply\b|mdf|sheet/i.test(m.name)).length;

function spread(entries, n, better) {
  const byCat = {};
  for (const e of [...entries].sort(better)) (byCat[plan(e.slug).category] ||= []).push(e);
  const cats = Object.keys(byCat).sort();
  const out = [];
  while (out.length < n && cats.some((c) => byCat[c].length)) for (const c of cats) if (byCat[c].length && out.length < n) out.push(byCat[c].shift());
  return out;
}
const clean = free.filter((e) => score(e) === 0);
const longOrSheet = spread(clean, 10, (a, b) => (plan(b.slug).steps.length + 5 * sheetHeavy(b.slug)) - (plan(a.slug).steps.length + 5 * sheetHeavy(a.slug)) || a.slug.localeCompare(b.slug));
const rest = spread(clean.filter((e) => !longOrSheet.includes(e)), 10, (a, b) => a.slug.localeCompare(b.slug));
const unpub = spread(free.filter((e) => e.tags.some((t) => /^R1:|^R11:/.test(t))), 10, (a, b) => score(b) - score(a) || a.slug.localeCompare(b.slug));

const all = [...longOrSheet, ...rest, ...unpub];
const batches = [0, 1, 2].map((k) => all.filter((_, i) => i % 3 === k));
batches.forEach((b, i) => console.log(`calib-${i + 1}: ${b.map((e) => e.slug).join(', ')}`));
if (process.argv.includes('--write')) {
  batches.forEach((b, i) => b.forEach((e) => { e.batch = `calib-${i + 1}`; }));
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
}
