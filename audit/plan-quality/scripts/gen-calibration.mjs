// gen-calibration.mjs — build the per-plan table of audit/plan-quality/calibration.md from the
// records of the pilot + calibration batches. Prints Markdown; the orchestrator pastes it under the
// hand-written header. Deterministic: grouped by agent verdict, then slug.
//   node audit/plan-quality/scripts/gen-calibration.mjs > (use --out <file>)
import { readFileSync, writeFileSync } from 'node:fs';

const ledger = JSON.parse(readFileSync('audit/plan-quality/ledger.json', 'utf8'));
const oi = process.argv.indexOf('--out');
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const group = (v) => (/^Unpublish/.test(v) ? 'Unpublish' : /^Fix/.test(v) ? 'Fix' : /^Ship/.test(v) ? 'Ship' : 'Human review');
const rows = { Ship: [], Fix: [], Unpublish: [], 'Human review': [] };

for (const e of ledger.filter((x) => /^(pilot|calib)-/.test(x.batch || '')).sort((a, b) => a.slug.localeCompare(b.slug))) {
  const rec = JSON.parse(readFileSync(`audit/plan-quality/plans/${e.slug}.json`, 'utf8'));
  if (!rec.reader) continue;
  const plan = JSON.parse(readFileSync(`content/plans/${e.slug}.json`, 'utf8'));
  const fails = Object.entries(rec.checks || {}).filter(([, c]) => c.result === 'fail' && c.cause !== 'import');
  const lines = fails.map(([id, c]) => {
    const ev = (c.evidence || [])[0];
    return `**${id}** ${c.level}/${c.confidence}: ${ev ? `\`${ev.path}\` "${esc(ev.quote).slice(0, 140)}"` : esc(c.reason || '')}`;
  });
  const unknown = Object.entries(rec.checks || {}).filter(([, c]) => c.result === 'unknown').map(([id]) => id);
  const gaps = (rec.gaps || []).map((g) => `gap: ${esc(g.what).slice(0, 100)}`);
  const detail = [...lines, ...(unknown.length ? [`unknown: ${unknown.join(', ')}`] : []), ...gaps, ...(rec.importAffected ? ['import-damaged (S-19 family, fixed in bulk)'] : [])].join('<br>');
  rows[group(rec.verdict)].push(`| [${e.slug}](https://notchplans.com/plans/${e.slug}) | ${plan.category} · ${plan.steps.length} steps | ${esc(rec.verdict)} | ${detail || '—'} | |`);
}
let md = '';
for (const [g, list] of Object.entries(rows)) {
  if (!list.length) continue;
  md += `\n### Agent verdict: ${g} (${list.length})\n\n| Plan | Kind | Agent verdict | Failed checks (first quote each) | Keagan's verdict |\n|---|---|---|---|---|\n${list.join('\n')}\n`;
}
if (oi !== -1) writeFileSync(process.argv[oi + 1], md); else console.log(md);
