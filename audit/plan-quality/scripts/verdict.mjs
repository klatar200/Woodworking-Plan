// verdict.mjs — compute each record's verdict from its checks under rubric R-2
// (audit/plan-quality/rubric-R2.md). Records with rubric "R-2" only; prints changes.
//   node audit/plan-quality/scripts/verdict.mjs [--write] [slug...]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const RECORDS = 'audit/plan-quality/plans';
const NOT_COUNTED = new Set(['R9']);

export function verdictR2(rec) {
  const checks = Object.entries(rec.checks || {}).filter(([id]) => !NOT_COUNTED.has(id));
  const upheld = new Set(rec.verifier?.ran ? rec.verifier.upheld || [] : []);
  const fails = checks.filter(([, c]) => c.result === 'fail' && c.cause !== 'import');
  const unpub = fails.filter(([, c]) => c.level === 'Unpublish');
  const fix = fails.filter(([, c]) => c.level !== 'Unpublish');
  const certainUnpub = unpub.filter(([, c]) => c.confidence === 'certain');
  const allFixCertain = fix.length >= 4 && fix.every(([, c]) => c.confidence === 'certain');
  let v;
  if (certainUnpub.some(([id]) => upheld.has(id)) || (allFixCertain && fix.every(([id]) => upheld.has(id)))) v = 'Unpublish';
  else if (certainUnpub.length || allFixCertain) v = 'Unpublish (pending verifier)';
  else if (fails.length) v = 'Fix';
  else if (checks.some(([id, c]) => ['R1', 'R2', 'R8'].includes(id) && c.result === 'unknown')) v = 'Human review';
  else if (checks.some(([, c]) => c.result === 'unknown')) v = 'Ship (unverified)';
  else v = 'Ship';
  const unresolved = checks.filter(([, c]) => ['flagged', 'to-read'].includes(c.result)).map(([id]) => id);
  if (unresolved.length) return { verdict: null, unresolved };
  const openStructural = checks.some(([id, c]) => ['R1', 'R2', 'R8'].includes(id) && c.result === 'unknown');
  if ((rec.humanReview?.value || openStructural) && v !== 'Human review') v += ' + Human review';
  return { verdict: v };
}

if (process.argv[1] && process.argv[1].endsWith('verdict.mjs')) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const files = only.length ? only.map((s) => `${s}.json`) : readdirSync(RECORDS);
  for (const f of files) {
    const path = `${RECORDS}/${f}`;
    const rec = JSON.parse(readFileSync(path, 'utf8'));
    if (rec.rubric !== 'R-2') continue;
    const { verdict, unresolved } = verdictR2(rec);
    if (unresolved) { console.log(`${rec.slug}: unresolved ${unresolved.join(',')}`); continue; }
    if (verdict !== rec.verdict) console.log(`${rec.slug}: ${rec.verdict} -> ${verdict}`);
    if (process.argv.includes('--write')) { rec.verdict = verdict; writeFileSync(path, JSON.stringify(rec, null, 2) + '\n'); }
  }
}
