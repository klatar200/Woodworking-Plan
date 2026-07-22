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

  const untraceable = lintPlan(plan).filter((f) => f.status === 'untraceable');

  return {
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
  for (const st of ['pending', 'audited', 'rewritten', 'verified', 'passed', 'flagged']) {
    const n = by((r) => r.status === st);
    if (n) console.log(`${st.padEnd(12)} ${n}`);
  }
}
