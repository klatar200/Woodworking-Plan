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
  for (const [id, note] of Object.entries(d.notes || {})) rec.checks[id].verifierNote = note;
  rec.verifier = { ran: true, run: run.run, upheld: d.upheld, refuted: d.refuted };
  rec.verdict = d.verdict;
  writeFileSync(path, JSON.stringify(rec, null, 2) + '\n');
  console.log(`${slug}: ${d.verdict}`);
}
