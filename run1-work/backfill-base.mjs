/**
 * Backfill `baseStepTitles` onto patches written before the field existed.
 *
 * This is only sound because the step arrays demonstrably have not moved since those
 * agents read them: the sole content change on this branch since the scaffold commit is
 * the `published` flag on 85 plans (verified — the whole `git diff content/` was that one
 * key), and no other writer has run.
 *
 * It is NOT a general-purpose tool. Backfilling from the current file is exactly the
 * assumption that invalidated the last batch; it is defensible here only because the
 * absence of intervening step edits was checked first, not assumed. Anything generated
 * after this point carries the field from the agent that actually read the plan.
 *
 *   node backfill-base.mjs <patch.json> [...]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPlan } from 'file:///C:/Users/latar/Desktop/Woodworking-Plan/scripts/plan-io.mjs';

for (const file of process.argv.slice(2)) {
  const patches = JSON.parse(readFileSync(file, 'utf8'));
  let n = 0;
  for (const p of patches) {
    if (p.action !== 'rewrite' || p.baseStepTitles) continue;
    const { plan } = readPlan(`${p.slug}.json`);
    p.baseStepTitles = (plan.steps ?? []).map((s) => s.title);
    n += 1;
  }
  writeFileSync(file, JSON.stringify(patches, null, 1));
  console.log(`${file}: backfilled ${n}`);
}
