// apply-verifier.mjs — apply a verifier run (audit/plan-quality/verifier/<run>.json) to records:
// refuted checks become pass/unknown (refutedTo), confidence downgrades are applied, `verifier`
// is filled and the verdict set from the run (decided by the orchestrator per §6).
//   node audit/plan-quality/scripts/apply-verifier.mjs audit/plan-quality/verifier/<run>.json
import { readFileSync, writeFileSync } from 'node:fs';

const run = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const [slug, d] of Object.entries(run.plans)) {
  const path = `audit/plan-quality/plans/${slug}.json`;
  const rec = JSON.parse(readFileSync(path, 'utf8'));
  for (const id of d.refuted) {
    const prev = rec.checks[id];
    rec.checks[id] = { ...(d.refutedTo?.[id] || { result: 'unknown', reason: 'verifier refuted; not settled' }), refutedFinding: prev };
  }
  // A check the reader mis-set (e.g. n/a where it could be scored), re-scored from the verifier's evidence.
  for (const [id, c] of Object.entries(d.rescore || {})) rec.checks[id] = { ...c, previous: rec.checks[id] };
  // Facts upheld but the level refuted (e.g. Unpublish → Fix).
  for (const [id, { level, note }] of Object.entries(d.rescoreLevel || {})) Object.assign(rec.checks[id], { level, verifierNote: note });
  for (const [id, conf] of Object.entries(d.confidence || {})) rec.checks[id].confidence = conf;
  for (const [id, note] of Object.entries(d.notes || {})) rec.checks[id].verifierNote = note;
  // Merge with earlier runs: a finding upheld by an earlier verifier stays upheld.
  const prev = rec.verifier?.ran ? rec.verifier : { upheld: [], refuted: [], runs: [] };
  const runs = [...(prev.runs || (prev.run ? [prev.run] : [])), run.run];
  rec.verifier = { ran: true, runs, upheld: [...new Set([...(prev.upheld || []), ...d.upheld])].filter((id) => !d.refuted.includes(id)), refuted: [...new Set([...(prev.refuted || []), ...d.refuted])] };
  if (d.verdict) rec.verdict = d.verdict; // R-2 records: verdict.mjs computes it afterwards
  writeFileSync(path, JSON.stringify(rec, null, 2) + '\n');
  console.log(`${slug}: verifier applied`);
}
