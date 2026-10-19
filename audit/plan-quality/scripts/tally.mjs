// tally.mjs — sync record verdicts into the ledger and print counts (verdicts, failed checks,
// unknowns). Records are the source of truth; only the orchestrator runs this.
//   node audit/plan-quality/scripts/tally.mjs [--write] [--batch <prefix>]
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'audit/plan-quality/ledger.json';
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const bi = process.argv.indexOf('--batch');
const prefix = bi === -1 ? null : process.argv[bi + 1];
const verdicts = {}; const fails = {}; const unknowns = {}; const failLevels = {};
let bad = 0; let n = 0;
const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };

for (const e of ledger) {
  if (prefix && !String(e.batch || '').startsWith(prefix)) continue;
  let rec;
  try { rec = JSON.parse(readFileSync(`audit/plan-quality/plans/${e.slug}.json`, 'utf8')); } catch { bad++; console.log(`unparseable: ${e.slug}`); continue; }
  // A record counts once verdict.mjs has set its verdict (a reader may still be mid-batch).
  if (!rec.reader || !rec.verdict) continue;
  n++;
  e.stage = rec.verifier?.ran ? 'verified' : 'read';
  e.verdict = rec.verdict;
  e.rubric = rec.rubric;
  bump(verdicts, rec.verdict);
  for (const [id, c] of Object.entries(rec.checks || {})) {
    if (['flagged', 'to-read'].includes(c.result)) console.log(`unresolved: ${e.slug} ${id} ${c.result}`);
    if (c.result === 'fail' && c.cause !== 'import') { bump(fails, id); bump(failLevels, `${id} ${c.level}/${c.confidence}`); }
    if (c.result === 'unknown') bump(unknowns, id);
  }
}
if (process.argv.includes('--write')) writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
console.log(JSON.stringify({ read: n, unparseable: bad, verdicts, fails, failLevels, unknowns }, null, 1));
