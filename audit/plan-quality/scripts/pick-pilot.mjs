// pick-pilot.mjs — Stage 4: choose 30 pilot plans (15 worst by sweep flags, 15 clean), spread
// across categories, deterministically. Prints three batches of 10 and marks them in the ledger
// (batch "pilot-1".."pilot-3").
//   node audit/plan-quality/scripts/pick-pilot.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'audit/plan-quality/ledger.json';
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const cat = (slug) => JSON.parse(readFileSync(`content/plans/${slug}.json`, 'utf8')).category;
const score = (e) => (e.flagCount || 0) + 5 * e.tags.filter((t) => t.endsWith(':fail')).length;

/** Round-robin over categories, taking the next-best plan of each, until n are chosen. */
function spread(entries, n, better) {
  const byCat = {};
  for (const e of [...entries].sort(better)) (byCat[cat(e.slug)] ||= []).push(e);
  const cats = Object.keys(byCat).sort();
  const out = [];
  while (out.length < n && cats.some((c) => byCat[c].length)) for (const c of cats) if (byCat[c].length && out.length < n) out.push(byCat[c].shift());
  return out;
}
const worst = spread(ledger.filter((e) => score(e) > 0), 15, (a, b) => score(b) - score(a) || a.slug.localeCompare(b.slug));
const clean = spread(ledger.filter((e) => score(e) === 0), 15, (a, b) => a.slug.localeCompare(b.slug));
// Interleave so each batch has both kinds.
const pilot = [];
for (let i = 0; i < 15; i++) pilot.push(worst[i], clean[i]);
const batches = [pilot.slice(0, 10), pilot.slice(10, 20), pilot.slice(20, 30)];
batches.forEach((b, i) => console.log(`pilot-${i + 1}: ${b.map((e) => `${e.slug}(${score(e) ? 'worst ' + score(e) : 'clean'}, ${cat(e.slug)})`).join(' ')}`));
if (process.argv.includes('--write')) {
  batches.forEach((b, i) => b.forEach((e) => { e.batch = `pilot-${i + 1}`; }));
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
}
