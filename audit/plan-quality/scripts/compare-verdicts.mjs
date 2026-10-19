// compare-verdicts.mjs — for every plan in calibration.md's tables, print its R-1 agent verdict (as
// written in calibration.md) next to its current R-2 verdict and counted failures (from the record).
// Markdown to stdout, or --out <file>.
//   node audit/plan-quality/scripts/compare-verdicts.mjs [--out <file>]
import { readFileSync, writeFileSync } from 'node:fs';

const md = readFileSync('audit/plan-quality/calibration.md', 'utf8');
const rows = [];
for (const line of md.split('\n')) {
  const m = line.match(/^\| \[([a-z0-9-]+)\]\(https:\/\/notchplans\.com\/plans\/[a-z0-9-]+\) \| [^|]+ \| ([^|]+) \|/);
  if (!m) continue;
  const rec = JSON.parse(readFileSync(`audit/plan-quality/plans/${m[1]}.json`, 'utf8'));
  const counted = Object.entries(rec.checks || {}).filter(([id, c]) => id !== 'R9' && c.result === 'fail' && c.cause !== 'import').map(([id, c]) => `${id}${c.level === 'Unpublish' ? '(U)' : ''}`);
  const r1 = m[2].trim();
  rows.push(`| ${m[1]} | ${r1} | ${rec.verdict}${r1 === rec.verdict ? '' : ' ◀'} | ${counted.join(', ') || '—'} | ${rec.rubric} |`);
}
const out = `| Plan | R-1 agent verdict | R-2 agent verdict (◀ = changed) | Counted failures (R9 excluded; (U) = Unpublish-level) | Rubric |\n|---|---|---|---|---|\n${rows.join('\n')}\n`;
const oi = process.argv.indexOf('--out');
if (oi !== -1) writeFileSync(process.argv[oi + 1], out); else console.log(out);
