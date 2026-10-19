// pick-calibration-r1.mjs — Stage 5 top-up: 10 more unread plans whose R1 flags point at missing
// documents (Extras / PDF / full plans / download / attached / print), most such flags first,
// spread over categories. Marks them batch "calib-4" with --write.
//   node audit/plan-quality/scripts/pick-calibration-r1.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'audit/plan-quality/ledger.json';
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const DOC = /extras|pdf|full plans|download|attached|print/i;
const docFlags = (slug) => {
  const rec = JSON.parse(readFileSync(`audit/plan-quality/plans/${slug}.json`, 'utf8'));
  return (rec.checks?.R1?.flagged || []).filter((f) => DOC.test(f.why)).length;
};
const cat = (slug) => JSON.parse(readFileSync(`content/plans/${slug}.json`, 'utf8')).category;
const pool = ledger.filter((e) => !e.batch).map((e) => ({ e, n: docFlags(e.slug) })).filter((x) => x.n > 0)
  .sort((a, b) => b.n - a.n || a.e.slug.localeCompare(b.e.slug));
const byCat = {};
for (const x of pool) (byCat[cat(x.e.slug)] ||= []).push(x.e);
const cats = Object.keys(byCat).sort();
const out = [];
while (out.length < 10 && cats.some((c) => byCat[c].length)) for (const c of cats) if (byCat[c].length && out.length < 10) out.push(byCat[c].shift());
console.log(`pool ${pool.length}; calib-4: ${out.map((e) => e.slug).join(', ')}`);
if (process.argv.includes('--write')) {
  for (const e of out) e.batch = 'calib-4';
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
}
