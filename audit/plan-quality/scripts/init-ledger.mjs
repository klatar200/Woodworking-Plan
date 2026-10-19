// init-ledger.mjs — write audit/plan-quality/ledger.json with every published slug (stage "pending")
// and a stub record per slug in audit/plan-quality/plans/.
// Read-only against content/. Refuses to overwrite an existing ledger unless --force.
//   node audit/plan-quality/scripts/init-ledger.mjs [--force]
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PLANS = 'content/plans';
const LEDGER = 'audit/plan-quality/ledger.json';
const RECORDS = 'audit/plan-quality/plans';

if (existsSync(LEDGER) && !process.argv.includes('--force')) {
  console.error(`${LEDGER} exists; pass --force to rebuild it.`);
  process.exit(1);
}

const entries = [];
for (const f of readdirSync(PLANS).filter((n) => n.endsWith('.json')).sort()) {
  const p = JSON.parse(readFileSync(join(PLANS, f), 'utf8'));
  if (p.published === false) continue; // schema default is true
  entries.push({ slug: p.slug, stage: 'pending', tags: [], verdict: null, rubric: 'R-1', batch: null });
}
writeFileSync(LEDGER, JSON.stringify(entries, null, 1) + '\n');
console.log(`ledger: ${entries.length} published slugs`);

// One stub record per plan (§7 shape); existing records are never overwritten.
mkdirSync(RECORDS, { recursive: true });
let stubs = 0;
for (const { slug } of entries) {
  const rec = join(RECORDS, `${slug}.json`);
  if (existsSync(rec)) continue;
  const stub = { slug, rubric: 'R-1', batch: null, importAffected: null, importDiffs: [], checks: {}, verdict: null, verifier: { ran: false, upheld: [], refuted: [] } };
  writeFileSync(rec, JSON.stringify(stub, null, 2) + '\n');
  stubs++;
}
console.log(`records: ${stubs} stubs written`);
