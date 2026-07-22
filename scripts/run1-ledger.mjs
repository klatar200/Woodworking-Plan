/**
 * Run 1 — the resumable progress ledger (PLAN_AUDIT_BRIEF.md §6 Run 1 item 1).
 *
 * "Keep a progress ledger (per plan: audited / fixed / rewritten / verified) so any
 * interruption resumes from the last committed batch — it never restarts."
 *
 * The ledger is COMMITTED with each batch, so the branch itself carries the resume
 * point: whatever the last commit says is done, is done. It also carries the
 * deterministic signals for every plan, computed once here, so a per-plan agent is
 * never spent re-deriving something a script already knows (§6.2 item 1).
 *
 *   node scripts/run1-ledger.mjs --init     build it (idempotent; preserves statuses)
 *   node scripts/run1-ledger.mjs            print progress
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { planFiles, readPlan } from './plan-io.mjs';
import { lintPlan } from './run1-number-lint.mjs';

const LEDGER = 'run1-ledger.json';
const THIN_STEP_CHARS = 90;
const CUT_WORDS = /\b(cut|rip|crosscut|miter|mitre|saw|trim to length|cut to length|break down)\b/i;

export function loadLedger() {
  if (!existsSync(LEDGER)) return { version: 1, plans: {} };
  return JSON.parse(readFileSync(LEDGER, 'utf8'));
}

export function saveLedger(ledger) {
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
}

/**
 * The deterministic under-detail signals. §6.2 item 4 (union flagging): a plan is queued
 * for rewrite if the model triage OR these signals flag it, so a cheap triage can only
 * ADD rewrites and can never silently skip a class of plans.
 */
const NOMINAL = /\b(\d+)\s*x\s*(\d+)\b/i;
const SHEET_GOODS = /\b(plywood|mdf|particle board|osb|hardboard|melamine)\b/i;

/**
 * Structural stock the plan tells you to BUY and never tells you what to do with.
 *
 * `farmhouse-storage-bed-with-drawers` was rejected 3-0 for exactly this: nine 1x3 and
 * three 2x2 sat in the materials list, in no cut-list row and in no step, so the mattress
 * support was never placed by any instruction. Someone follows the plan to the end and
 * has boards left over and nothing holding the mattress up.
 *
 * Restricted to boards and sheet goods ON PURPOSE. A first cut checked every material and
 * flagged 45 plans, almost all of them glue, sandpaper and screws — consumables that
 * legitimately appear in no cut list and are often not named in prose. Catching those
 * would bury the twenty plans where the defect is real.
 */
function unplacedStock(plan) {
  const steps = plan.steps ?? [];
  const cutList = plan.cutList ?? [];
  if (!steps.length || !cutList.length) return [];
  const hay = (
    cutList.map((c) => `${c.part} ${c.material ?? ''} ${c.note ?? ''}`).join(' ') +
    ' ' +
    steps.map((s) => `${s.title} ${s.body} ${(s.materials ?? []).join(' ')}`).join(' ')
  ).toLowerCase();

  return (plan.materials ?? [])
    .filter((m) => {
      // Sheet goods first — "Plywood, 3/4 in, half sheet (2x8)" is a sheet, and the
      // parenthesised 2x8 is its size, not a nominal board.
      const sheet = SHEET_GOODS.exec(m.name);
      if (sheet) return !hay.includes(sheet[1].toLowerCase());
      const nm = NOMINAL.exec(m.name);
      if (!nm) return false;
      return !hay.includes(`${nm[1]}x${nm[2]}`) && !hay.includes(`${nm[1]} x ${nm[2]}`);
    })
    .map((m) => m.name);
}

export function signalsFor(plan) {
  const steps = plan.steps ?? [];
  const cutList = plan.cutList ?? [];
  const distinctParts = new Set(cutList.map((c) => c.part)).size;

  const thinSteps = steps
    .map((s, n) => ({ n: n + 1, len: (s.body ?? '').length }))
    .filter((s) => s.len < THIN_STEP_CHARS);

  const stepsWithNoMeasurement = steps.filter(
    (s) => !/\d/.test(`${s.title} ${s.body}`),
  ).length;

  const findings = lintPlan(plan);
  const untraceable = findings.filter((f) => f.status === 'untraceable');

  return {
    // Broken out of `untraceableNumbers` because it is a different KIND of defect: not a
    // number nobody can source, but one the plan's own materials contradict. It is also
    // the one signal here that names a fix rather than a doubt — either the prose adopts
    // the size sold, or the material row is wrong.
    fastenerContradiction: findings.filter((f) => f.note).map((f) => `${f.where}:${f.raw}`),
    unplacedStock: unplacedStock(plan),
    steps: steps.length,
    cutListRows: cutList.length,
    distinctParts,
    thinSteps: thinSteps.map((s) => s.n),
    stepsWithNoMeasurement,
    missingCutStep: cutList.length > 0 && !steps.some((s) => CUT_WORDS.test(`${s.title} ${s.body}`)),
    lowStepDensity: distinctParts >= 5 && steps.length < Math.ceil(distinctParts / 2),
    untraceableNumbers: untraceable.map((f) => `${f.where}:${f.raw}`),
  };
}

/** Does the deterministic side alone demand a rewrite? */
export function deterministicallyFlagged(s) {
  return (
    s.missingCutStep ||
    s.lowStepDensity ||
    s.thinSteps.length > 0 ||
    s.untraceableNumbers.length > 0 ||
    s.unplacedStock?.length > 0 ||
    s.stepsWithNoMeasurement === s.steps
  );
}

if (process.argv.includes('--init')) {
  const ledger = loadLedger();
  let added = 0;
  for (const file of planFiles()) {
    const { plan } = readPlan(file);
    const signals = signalsFor(plan);
    const prior = ledger.plans[plan.slug];
    ledger.plans[plan.slug] = {
      file,
      published: plan.published !== false,
      // Statuses survive a re-init so the ledger can be rebuilt without losing progress.
      status: prior?.status ?? 'pending',
      score: prior?.score ?? null,
      batch: prior?.batch ?? null,
      flags: prior?.flags ?? [],
      signals,
      detFlagged: deterministicallyFlagged(signals),
    };
    if (!prior) added += 1;
  }
  saveLedger(ledger);
  console.log(`ledger: ${Object.keys(ledger.plans).length} plans (${added} new)`);
}

const ledger = loadLedger();
const rows = Object.values(ledger.plans);
if (rows.length) {
  const by = (f) => rows.filter(f).length;
  const pub = rows.filter((r) => r.published);
  console.log(`\nplans            ${rows.length}  (published ${pub.length} / unpublished ${rows.length - pub.length})`);
  console.log(`deterministically flagged  ${by((r) => r.detFlagged)}  (published ${by((r) => r.detFlagged && r.published)})`);
  console.log('\n-- signal breakdown (published) --');
  console.log(`missing cut step        ${by((r) => r.published && r.signals.missingCutStep)}`);
  console.log(`thin steps              ${by((r) => r.published && r.signals.thinSteps.length)}`);
  console.log(`low step density        ${by((r) => r.published && r.signals.lowStepDensity)}`);
  console.log(`untraceable numbers     ${by((r) => r.published && r.signals.untraceableNumbers.length)}`);
  console.log('\n-- status --');
  console.log(`fastener contradiction  ${by((r) => r.published && r.signals.fastenerContradiction?.length)}`);
  console.log(`unplaced structural stock ${by((r) => r.published && r.signals.unplacedStock?.length)}`);
  for (const st of ['pending', 'audited', 'rewritten', 'verified', 'passed', 'returned', 'flagged']) {
    const n = by((r) => r.status === st);
    if (n) console.log(`${st.padEnd(12)} ${n}`);
  }
}
