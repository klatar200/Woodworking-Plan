// pick-model-check.mjs — Stage 6 pre-check (Keagan 2026-10-19): 10 unread plans, 5 flagged by the
// sweep and 5 clean, spread over categories, to be read by a Sonnet reader (writes records) and an
// Opus reader (returns results only) for comparison. Marks batch "modelcheck" with --write.
//   node audit/plan-quality/scripts/pick-model-check.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'audit/plan-quality/ledger.json';
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const cat = (slug) => JSON.parse(readFileSync(`content/plans/${slug}.json`, 'utf8')).category;
const score = (e) => (e.flagCount || 0) + 5 * e.tags.filter((t) => t.endsWith(':fail')).length;
function spread(entries, n) {
  const byCat = {};
  for (const e of [...entries].sort((a, b) => a.slug.localeCompare(b.slug))) (byCat[cat(e.slug)] ||= []).push(e);
  const cats = Object.keys(byCat).sort();
  const out = [];
  // Take from the middle of each category's list so the pick is not alphabetically front-loaded.
  for (const c of cats) byCat[c] = [...byCat[c].slice(Math.floor(byCat[c].length / 2)), ...byCat[c].slice(0, Math.floor(byCat[c].length / 2))];
  while (out.length < n && cats.some((c) => byCat[c].length)) for (const c of cats) if (byCat[c].length && out.length < n) out.push(byCat[c].shift());
  return out;
}
const free = ledger.filter((e) => !e.batch);
const picks = [...spread(free.filter((e) => score(e) > 0), 5), ...spread(free.filter((e) => score(e) === 0), 5)];
console.log(`modelcheck: ${picks.map((e) => e.slug).join(', ')}`);
if (process.argv.includes('--write')) {
  for (const e of picks) e.batch = 'modelcheck';
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
}
