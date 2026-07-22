/**
 * Run 1 — batch selector. Prints the next slice of work for a rewrite agent.
 *
 * Order (PLAN_AUDIT_BRIEF.md §8): published (948) first, then unpublished (167).
 * Within that, worst-first — a plan missing its cut step AND carrying thin steps is
 * further from "buildable by reading" than one with a single short step, and the missing
 * cut step is the anchor's named highest-value single addition.
 *
 *   node scripts/run1-batch.mjs [--size 15] [--unpublished]
 */
import { loadLedger } from './run1-ledger.mjs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? dflt : process.argv[i + 1];
};
const SIZE = Number(arg('--size', 15));
const WANT_PUBLISHED = !process.argv.includes('--unpublished');

const ledger = loadLedger();

/** Higher = further from buildable-by-reading. */
function severity(r) {
  const s = r.signals;
  return (
    (s.missingCutStep ? 100 : 0) +
    (s.lowStepDensity ? 40 : 0) +
    s.untraceableNumbers.length * 15 +
    s.thinSteps.length * 10 +
    (s.stepsWithNoMeasurement === s.steps ? 25 : 0)
  );
}

const queue = Object.entries(ledger.plans)
  .filter(([, r]) => r.status === 'pending' && r.detFlagged && r.published === WANT_PUBLISHED)
  .sort((a, b) => severity(b[1]) - severity(a[1]) || a[0].localeCompare(b[0]))
  .slice(0, SIZE);

if (!queue.length) {
  console.log('NO WORK: every deterministically-flagged plan in this cohort is done.');
  process.exit(0);
}

console.log(`# batch of ${queue.length} (${WANT_PUBLISHED ? 'published' : 'unpublished'})\n`);
for (const [slug, r] of queue) {
  const s = r.signals;
  const why = [
    s.missingCutStep && 'NO CUT STEP',
    s.lowStepDensity && `low density (${s.steps} steps / ${s.distinctParts} parts)`,
    s.thinSteps.length && `thin steps: ${s.thinSteps.join(',')}`,
    s.untraceableNumbers.length && `untraceable: ${s.untraceableNumbers.join(', ')}`,
  ]
    .filter(Boolean)
    .join(' | ');
  console.log(`content/plans/${r.file}`);
  console.log(`    ${why}`);
}
console.log(`\n# slugs: ${queue.map(([s]) => s).join(',')}`);
