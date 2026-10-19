// list-diffs.mjs — print every importDiffs entry of one kind across all records (for review).
//   node audit/plan-quality/scripts/list-diffs.mjs <kind> [limit]
import { readFileSync, readdirSync } from 'node:fs';

const [, , kind, limit = '100000'] = process.argv;
const RECORDS = 'audit/plan-quality/plans';
let n = 0;
const seen = new Set();
for (const f of readdirSync(RECORDS).sort()) {
  const rec = JSON.parse(readFileSync(`${RECORDS}/${f}`, 'utf8'));
  for (const d of rec.importDiffs || []) {
    if (d.kind !== kind) continue;
    const row = d.path.replace(/\.\w+$/, '');
    const key = `${rec.slug}|${row}`;
    if (seen.has(key)) continue; // one line per row
    seen.add(key);
    if (n++ >= +limit) continue;
    console.log(`${rec.slug} ${d.path} | src: ${d.source} | imp: ${d.imported ?? ''} | correct: ${d.correct ?? ''}${d.reason ? ' | ' + d.reason : ''}`);
  }
}
console.log(`-- ${n} rows`);
