// verdict.mjs — compute each read record's verdict from its checks under rubric R-2
// (docs/PLAN_QUALITY_AUDIT.md §6). Only `cause: "plan"` findings count; R9 is recorded but never
// counted. An Unpublish that a verifier hasn't upheld is `Unpublish (pending verifier)`.
//   node audit/plan-quality/scripts/verdict.mjs [--write] [slug ...]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const DIR = 'audit/plan-quality/plans';
const NOT_COUNTED = new Set(['R9']);
const BLOCKS_SHIP = new Set(['R1', 'R2', 'R8']);

export function computeVerdict(rec) {
  const upheld = new Set(rec.verifier?.upheld || []);
  const checks = Object.entries(rec.checks || {}).filter(([id]) => !NOT_COUNTED.has(id));
  const fails = checks.filter(([, c]) => c.result === 'fail' && c.cause !== 'import');
  const unknowns = checks.filter(([, c]) => c.result === 'unknown').map(([id]) => id);
  const unpub = fails.filter(([, c]) => c.level === 'Unpublish' && c.confidence === 'certain');
  const certainFix = fails.filter(([, c]) => c.level === 'Fix' && c.confidence === 'certain');

  let base;
  let pending = false;
  if (unpub.length) {
    if (unpub.some(([id]) => upheld.has(id))) base = 'Unpublish';
    else pending = true;
  }
  if (!base && certainFix.length >= 4) {
    if (certainFix.every(([id]) => upheld.has(id))) base = 'Unpublish';
    else pending = true;
  }
  if (!base && pending) base = 'Unpublish (pending verifier)';
  if (!base && fails.length) base = 'Fix';
  if (!base) base = unknowns.length ? 'Ship (unverified)' : 'Ship';

  const human = rec.humanReview || unknowns.some((id) => BLOCKS_SHIP.has(id));
  return human ? `${base} + Human review` : base;
}

const write = process.argv.includes('--write');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const slugs = only.length ? only : readdirSync(DIR).map((f) => f.replace(/\.json$/, ''));
const counts = {};
for (const slug of slugs) {
  const path = `${DIR}/${slug}.json`;
  const rec = JSON.parse(readFileSync(path, 'utf8'));
  if (!rec.reader || rec.rubric !== 'R-2') continue;
  const v = computeVerdict(rec);
  counts[v] = (counts[v] || 0) + 1;
  if (v !== rec.verdict) {
    console.log(`${slug}: ${rec.verdict} -> ${v}`);
    if (write) writeFileSync(path, JSON.stringify({ ...rec, verdict: v }, null, 2) + '\n');
  }
}
console.log(JSON.stringify(counts, null, 1));
