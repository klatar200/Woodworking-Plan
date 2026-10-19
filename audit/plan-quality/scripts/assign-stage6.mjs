// assign-stage6.mjs — Stage 6: give every swept (unread) ledger entry a batch, worst-first
// (most sweep flags first, then slug), N plans per batch (default 15). Idempotent: entries that
// already have a batch keep it.
//   node audit/plan-quality/scripts/assign-stage6.mjs [--size 15] [--write]
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'audit/plan-quality/ledger.json';
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const si = process.argv.indexOf('--size');
const size = si === -1 ? 15 : Number(process.argv[si + 1]);
const todo = ledger
  .filter((e) => e.stage === 'swept' && !e.batch)
  .sort((a, b) => (b.flagCount - a.flagCount) || a.slug.localeCompare(b.slug));
const taken = new Set(ledger.map((e) => e.batch).filter((b) => /^s6-\d+$/.test(b || '')));
let n = taken.size;
for (let i = 0; i < todo.length; i += size) {
  n++;
  const name = `s6-${String(n).padStart(2, '0')}`;
  for (const e of todo.slice(i, i + size)) e.batch = name;
}
if (process.argv.includes('--write')) writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
const byBatch = {};
for (const e of ledger) if (/^s6-/.test(e.batch || '')) (byBatch[e.batch] ||= []).push(e.slug);
for (const [b, s] of Object.entries(byBatch)) console.log(`${b} ${s.join(' ')}`);
