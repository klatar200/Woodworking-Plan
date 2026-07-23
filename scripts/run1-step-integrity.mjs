/**
 * Run 1 — did any rewrite DESTROY a step?
 *
 * THE DEFECT. `storage-bed-12-drawers` and `toddler-farmhouse-bed-crib-mattress` each
 * came back from verification missing an original step. Not thinned — gone. The bed plan
 * lost "Hang the drawers and attach faces" entirely, so twelve drawer faces and twelve
 * knobs were cut and bought by a plan that never mounts them; the toddler bed lost "Build
 * the headboard panel" while a later step still said "exactly as you built the headboard
 * panel". In both, the vacated slot held a rewrite of the NEXT step, which then also
 * appeared in its own slot — the signature of an agent that mis-indexed a `replace` by one
 * and wrote step N+1's content over step N.
 *
 * `applyOps` is not at fault: replaces resolve against the unshifted array before any
 * insert moves anything. The applier did exactly what the patch said. That is the point —
 * a destroyed step is indistinguishable from a deliberate rewrite unless something checks
 * the ORIGINAL titles are all still accounted for, and no verifier should have to spend a
 * vote noticing that a step went missing.
 *
 * WHAT THIS CHECKS. For every plan changed on this branch, each original step title must
 * still be findable in the rewritten plan, and no two steps may share a title. A rewrite
 * legitimately rewords a title, so an unmatched title is reported for review rather than
 * asserted as a defect — but a duplicate title alongside a missing one is the off-by-one,
 * and it is worth saying so loudly.
 *
 *   node scripts/run1-step-integrity.mjs [baseRef]
 */
import { execFileSync } from 'node:child_process';
import { planFiles, readPlan } from './plan-io.mjs';

const BASE = process.argv[2] ?? '7ee6d4f756218be981f4cdf7d6357845bef05746';

/** Loose title match — a rewrite may reword, so compare on content words. */
const key = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['the', 'and', 'with', 'your', 'this', 'from', 'into'].includes(w))
    .sort()
    .join(' ');

/** Two titles are "the same step" if they share most of their content words. */
function overlaps(a, b) {
  const A = new Set(key(a).split(' ').filter(Boolean));
  const B = new Set(key(b).split(' ').filter(Boolean));
  if (!A.size || !B.size) return false;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit += 1;
  return hit / Math.min(A.size, B.size) >= 0.5;
}

let checked = 0;
const problems = [];

for (const file of planFiles()) {
  let before;
  try {
    before = JSON.parse(
      execFileSync('git', ['show', `${BASE}:content/plans/${file}`], {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      }),
    );
  } catch {
    continue; // new file on this branch — nothing to have destroyed
  }
  const { plan } = readPlan(file);
  const oldSteps = before.steps ?? [];
  const newSteps = plan.steps ?? [];
  if (JSON.stringify(oldSteps) === JSON.stringify(newSteps)) continue;
  checked += 1;

  const missing = oldSteps
    .map((s) => s.title)
    .filter((t) => !newSteps.some((n) => n.title === t || overlaps(n.title, t)));

  const titles = new Map();
  const dupes = [];
  for (const s of newSteps) {
    const k = String(s.title).trim().toLowerCase();
    if (titles.has(k)) dupes.push(s.title);
    else titles.set(k, true);
  }

  const dupeBodies = [];
  const bodies = new Set();
  for (const s of newSteps) {
    const k = String(s.body).trim().toLowerCase();
    if (bodies.has(k)) dupeBodies.push(s.title);
    else bodies.add(k);
  }

  if (missing.length || dupes.length || dupeBodies.length) {
    problems.push({ slug: plan.slug, missing, dupes, dupeBodies });
  }
}

for (const p of problems) {
  const severe = p.missing.length && (p.dupes.length || p.dupeBodies.length);
  console.log(`\n${severe ? '🛑' : '⚠ '} ${p.slug}`);
  if (p.missing.length) console.log(`   original steps with no counterpart: ${p.missing.map((m) => `"${m}"`).join(', ')}`);
  if (p.dupes.length) console.log(`   duplicate titles: ${p.dupes.map((d) => `"${d}"`).join(', ')}`);
  if (p.dupeBodies.length) console.log(`   duplicate BODIES: ${p.dupeBodies.map((d) => `"${d}"`).join(', ')}`);
  if (severe) console.log('   ^ missing + duplicate together is the off-by-one replace signature');
}
console.log(`\nchanged plans checked: ${checked} | flagged: ${problems.length}`);
