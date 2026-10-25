// round2.mjs — second, independent full read of the published plans (Keagan 2026-10-25).
// Round-2 records live in audit/plan-quality/round2/plans/ (seeded from a fresh sweep, no round-1
// reader content); round 1 stays in audit/plan-quality/plans/.
//   node audit/plan-quality/scripts/round2.mjs init [--size 15]   batches → round2/ledger.json
//   node audit/plan-quality/scripts/round2.mjs status             counts per stage/verdict
//   node audit/plan-quality/scripts/round2.mjs compare [--write]  round 1 vs round 2 verdict buckets
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const R1 = 'audit/plan-quality/plans';
const R2 = 'audit/plan-quality/round2/plans';
const LEDGER = 'audit/plan-quality/round2/ledger.json';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const bucket = (v) => (!v ? null : v.startsWith('Unpublish') ? 'Unpublish' : v.startsWith('Fix') ? 'Fix' : 'Ship');
const flags = (r) => Object.values(r.checks).filter((c) => c.result === 'flagged').length;
const [cmd] = process.argv.slice(2);

if (cmd === 'init') {
  const si = process.argv.indexOf('--size');
  const size = si === -1 ? 15 : Number(process.argv[si + 1]);
  const recs = readdirSync(R2).map((f) => read(`${R2}/${f}`))
    .sort((a, b) => (flags(b) - flags(a)) || a.slug.localeCompare(b.slug));
  const ledger = recs.map((r, i) => ({ slug: r.slug, batch: `r2-${String(Math.floor(i / size) + 1).padStart(2, '0')}` }));
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
  const byBatch = {};
  for (const e of ledger) (byBatch[e.batch] ||= []).push(e.slug);
  for (const [b, s] of Object.entries(byBatch)) console.log(`${b}: ${s.join(' ')}`);
} else if (cmd === 'status') {
  const ledger = read(LEDGER);
  const out = { read: 0, pending: 0, verdicts: {} };
  for (const e of ledger) {
    const r = read(`${R2}/${e.slug}.json`);
    if (r.reader && r.verdict) { out.read++; out.verdicts[r.verdict] = (out.verdicts[r.verdict] || 0) + 1; } else out.pending++;
  }
  console.log(JSON.stringify(out, null, 1));
} else if (cmd === 'compare') {
  const ledger = read(LEDGER);
  const pairs = {}; const disagree = [];
  for (const e of ledger) {
    const r2 = read(`${R2}/${e.slug}.json`);
    if (!r2.verdict || !existsSync(`${R1}/${e.slug}.json`)) continue;
    const r1 = read(`${R1}/${e.slug}.json`);
    const key = `${bucket(r1.verdict)} -> ${bucket(r2.verdict)}`;
    pairs[key] = (pairs[key] || 0) + 1;
    if (bucket(r1.verdict) !== bucket(r2.verdict)) disagree.push({ slug: e.slug, r1: r1.verdict, r2: r2.verdict });
  }
  if (process.argv.includes('--write')) writeFileSync('audit/plan-quality/round2/disagreements.json', JSON.stringify(disagree, null, 1) + '\n');
  console.log(JSON.stringify({ pairs, disagreements: disagree.length }, null, 1));
} else {
  console.log('usage: round2.mjs init|status|compare');
}
