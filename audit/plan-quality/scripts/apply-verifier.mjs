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
  for (const [id, conf] of Object.entries(d.confidence || {})) rec.checks[id].confidence = conf;
  for (const [id, level] of Object.entries(d.level || {})) rec.checks[id].level = level;
  // A note on something that is not a check (e.g. "override") goes on the record itself.
  for (const [id, note] of Object.entries(d.notes || {})) {
    if (rec.checks[id]) rec.checks[id].verifierNote = note;
    else rec.verifierNotes = { ...rec.verifierNotes, [id]: note };
  }
  // Later runs add to earlier ones (R-2 re-verification keeps the R-1 results).
  const prev = rec.verifier?.ran ? rec.verifier : { upheld: [], refuted: [], runs: [] };
  const runs = [...new Set([...(prev.runs || (prev.run ? [prev.run] : [])), run.run])];
  const upheld = [...new Set([...(prev.upheld || []), ...d.upheld])].filter((id) => !d.refuted.includes(id));
  const refuted = [...new Set([...(prev.refuted || []), ...d.refuted])].filter((id) => !d.upheld.includes(id));
  rec.verifier = { ran: true, runs, upheld, refuted };
  // R-1 runs carried the orchestrator's verdict; under R-2 verdict.mjs computes it.
  if (d.verdict) rec.verdict = d.verdict;
  writeFileSync(path, JSON.stringify(rec, null, 2) + '\n');
  console.log(`${slug}: upheld ${upheld.join(',')} refuted ${refuted.join(',')}`);
}
