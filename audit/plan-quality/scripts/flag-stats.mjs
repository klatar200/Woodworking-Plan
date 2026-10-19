// flag-stats.mjs — count sweep flags by check and by the trigger in `why` (for tuning + summary).
//   node audit/plan-quality/scripts/flag-stats.mjs [checkId] [sample]
import { readFileSync, readdirSync } from 'node:fs';

const [, , only, sample = '0'] = process.argv;
const RECORDS = 'audit/plan-quality/plans';
const byWhy = {};
const samples = [];
for (const f of readdirSync(RECORDS).sort()) {
  const rec = JSON.parse(readFileSync(`${RECORDS}/${f}`, 'utf8'));
  for (const [id, c] of Object.entries(rec.checks || {})) {
    if (only && id !== only) continue;
    for (const fl of c.flagged || []) {
      const key = `${id} ${fl.why.replace(/\d[\d ./"]*/g, 'N').replace(/\(searched.*\)/, '(searched …)').replace(/labels are .*/, 'labels are …').replace(/matches ".*"/, (m) => m.toLowerCase())}`;
      byWhy[key] = (byWhy[key] || 0) + 1;
      if (samples.length < +sample) samples.push(`${rec.slug} ${fl.path} | ${fl.why} | ${fl.quote.slice(0, 140)}`);
    }
  }
}
for (const [k, n] of Object.entries(byWhy).sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(String(n).padStart(5), k);
for (const s of samples) console.log(s);
