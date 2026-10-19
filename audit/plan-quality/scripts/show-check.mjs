// show-check.mjs — print one check for every record whose result matches.
//   node audit/plan-quality/scripts/show-check.mjs <checkId> <result> [limit]
import { readFileSync, readdirSync } from 'node:fs';

const [, , id, result, limit = '50'] = process.argv;
const RECORDS = 'audit/plan-quality/plans';
let n = 0;
for (const f of readdirSync(RECORDS).sort()) {
  const rec = JSON.parse(readFileSync(`${RECORDS}/${f}`, 'utf8'));
  const c = rec.checks?.[id];
  if (!c || c.result !== result) continue;
  if (n++ < +limit) console.log(`${rec.slug}: ${c.arithmetic || c.reason || ''}`.slice(0, 400));
}
console.log(`-- ${n}`);
