/**
 * Run 1 — the ONLY write path for step rewrites.
 *
 * Agents never touch plan files. They return a structured patch (§4.5: "return
 * structured findings, not prose") and this applies it, so every constraint in §3 is
 * enforced in one place instead of trusted to ~60 agents independently:
 *
 *   - schema shape + `.strict()` key set              (mirrors plan-schema.ts)
 *   - step.tools ⊆ plan tools, step.materials ⊆ plan materials   (load.ts's rule)
 *   - no dollar figures                                (DECISIONS_LOG 2026-07-13)
 *   - no decimal inches — tape-measure fractions only
 *   - every measurement traceable to the plan's own data (run1-number-lint)
 *   - byte-faithful write, no reformatting             (plan-io)
 *
 * A patch that fails ANY check is rejected whole — never partially applied. The plan is
 * left untouched and the reason is reported, which is what makes a bad batch a no-op
 * rather than a mess to unpick.
 *
 *   node scripts/run1-apply-patch.mjs <patch.json> [--write]
 *
 * Patch shape:
 *   { "slug": "...", "score": 1-5, "action": "rewrite"|"pass",
 *     "flags": ["correctness defect surfaced, NOT fixed here"],
 *     "ops": [ { "op":"replace", "index":0, "title":"...", "body":"...",
 *                "tools":[...], "materials":[...] },
 *              { "op":"insert",  "index":0, "step":{...} } ] }
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPlan, writePlanIfFaithful } from './plan-io.mjs';
import { lintPlan } from './run1-number-lint.mjs';

const STEP_KEYS = new Set(['title', 'body', 'tools', 'materials', 'image']);

export function applyOps(plan, ops) {
  const steps = structuredClone(plan.steps ?? []);
  // Inserts are applied by descending index so earlier ops don't shift later ones.
  const replaces = ops.filter((o) => o.op === 'replace');
  const inserts = ops.filter((o) => o.op === 'insert').sort((a, b) => b.index - a.index);

  for (const op of replaces) {
    if (!steps[op.index]) throw new Error(`replace index ${op.index} out of range`);
    for (const k of ['title', 'body', 'tools', 'materials']) {
      if (op[k] !== undefined) steps[op.index][k] = op[k];
    }
  }
  for (const op of inserts) {
    if (op.index < 0 || op.index > steps.length) throw new Error(`insert index ${op.index} out of range`);
    steps.splice(op.index, 0, op.step);
  }
  return { ...plan, steps };
}

/** Returns [] when the candidate is shippable, else the reasons it is not. */
export function checkPatched(originalPlan, nextPlan, changedFields) {
  const errors = [];
  const toolSlugs = new Set((nextPlan.tools ?? []).map((t) => t.slug));
  const matNames = new Set((nextPlan.materials ?? []).map((m) => m.name));

  for (const [n, s] of (nextPlan.steps ?? []).entries()) {
    const at = `step ${n + 1}`;
    for (const k of Object.keys(s)) {
      if (!STEP_KEYS.has(k)) errors.push(`${at}: unknown key "${k}" (schema is .strict())`);
    }
    if (typeof s.title !== 'string' || !s.title.trim()) errors.push(`${at}: empty title`);
    if (typeof s.body !== 'string' || !s.body.trim()) errors.push(`${at}: empty body`);
    for (const t of s.tools ?? []) {
      if (!toolSlugs.has(t)) errors.push(`${at}: tool "${t}" is not one of the plan's tools`);
    }
    for (const m of s.materials ?? []) {
      if (!matNames.has(m)) errors.push(`${at}: material "${m}" is not one of the plan's materials`);
    }
    const text = `${s.title} ${s.body}`;
    if (/\$\s?\d/.test(text)) errors.push(`${at}: contains a dollar figure`);
    if (/\b\d+\.\d+\s*(?:"|″|\s?in\b|\s?inch)/i.test(text)) {
      errors.push(`${at}: decimal inches — use tape-measure fractions`);
    }
    if (/<[a-z/][^>]*>/i.test(text)) errors.push(`${at}: contains HTML`);
  }

  // Nothing outside `steps` may move in a step rewrite (§4.4).
  for (const key of Object.keys(originalPlan)) {
    if (key === 'steps') continue;
    if (JSON.stringify(originalPlan[key]) !== JSON.stringify(nextPlan[key])) {
      errors.push(`a step rewrite must not change "${key}"`);
    }
  }

  /**
   * Numbers are ROUTED, not judged, here. §6.2 item 2: "Only numbers it can't trace
   * reach a model verifier." An untraceable number is therefore not an automatic
   * rejection — it is the trigger for the 3-vote adversarial verify (§4.5), which is the
   * mechanism the brief actually assigns to judgment.
   *
   * Treating untraceable as auto-reject was stricter than the contract and rejected
   * CORRECT work: three-term arithmetic on the plan's own values ("32 3/4\" stiles less a
   * 2 1/2\" header and footer leaves 27 3/4\"") is sound, is exactly what §4.6 asks a
   * rewrite to do when surfacing a defect, and no pairwise tracer can reach it.
   *
   * Nothing ships unchecked either way: a patch with unresolved numbers cannot
   * auto-apply, it can only be applied after verifiers confirm it.
   *
   * Only the CHANGED text is linted — a pre-existing untraceable number in an untouched
   * step is a defect of the plan, not of this patch, and is reported separately.
   */
  const findings = lintPlan(nextPlan, changedFields);
  return {
    errors,
    derived: findings.filter((x) => x.status === 'derived'),
    untraceable: findings.filter((x) => x.status === 'untraceable'),
  };
}

/**
 * Language that asserts the plan's own lumber does not cover its cut list.
 *
 * This is the single highest-risk claim a rewrite can make, in BOTH directions: a missed
 * shortfall sends someone to the lumberyard twice, and an INVENTED one sends them home
 * with a board they didn't need and quietly discredits the plan. Batch 1 produced one of
 * each — cubby-dresser invented a 2x2 shortfall while omitting the real 1x10 one — so any
 * patch making this claim takes the full 3-vote regardless of how cleanly its numbers trace.
 */
const SHORTFALL_CLAIM =
  /\b(short(?:fall|s)?\b|not enough|falls? short|won'?t (?:be )?enough|cannot yield|can'?t yield|need (?:a|an|another|one more|a fifth|a fourth)\b|a second board|more \w+ than|buy (?:more|another|an extra))/i;

/**
 * Which verification tier this patch needs (PLAN_AUDIT_BRIEF.md §6.2 item 3, tiered per
 * Keagan's 2026-07-22 call). Tiering may only ADD scrutiny relative to the lint, never
 * remove it: 'auto' requires that EVERY number traced exactly.
 */
export function verificationTier({ derived, untraceable }, patch, nextPlan) {
  const prose = (nextPlan.steps ?? []).map((s) => `${s.title} ${s.body}`).join('\n');
  const claimsShortfall =
    SHORTFALL_CLAIM.test(prose) || (patch.flags ?? []).some((f) => SHORTFALL_CLAIM.test(f));

  if (untraceable.length || claimsShortfall) return 'triple';
  if (derived.length) return 'single';
  return 'auto';
}

if (process.argv[1]?.endsWith('run1-apply-patch.mjs')) {
  const patchPath = process.argv[2];
  const WRITE = process.argv.includes('--write');
  // --verified: the 3-vote stage has majority-confirmed this batch's judgment numbers,
  // so routing is satisfied and the patches may apply. Structural checks still run.
  const FORCE = process.argv.includes('--verified');
  const patches = JSON.parse(readFileSync(patchPath, 'utf8'));
  const list = Array.isArray(patches) ? patches : [patches];

  let applied = 0;
  let rejected = 0;
  const results = [];

  for (const patch of list) {
    const file = `${patch.slug}.json`;
    let record;
    try {
      const { raw, plan, layout } = readPlan(file);
      if (patch.action !== 'rewrite' || !(patch.ops ?? []).length) {
        results.push({ slug: patch.slug, status: 'pass', score: patch.score, flags: patch.flags ?? [] });
        continue;
      }
      const next = applyOps(plan, patch.ops);

      // Which fields this patch actually changed — the lint scope.
      const changed = [];
      for (const [n, s] of next.steps.entries()) {
        const before = plan.steps[n];
        if (!before || before.title !== s.title) changed.push([`step${n + 1}.title`, s.title]);
        if (!before || before.body !== s.body) changed.push([`step${n + 1}.body`, s.body]);
      }

      const { errors, derived, untraceable } = checkPatched(plan, next, changed);
      const tier = verificationTier({ derived, untraceable }, patch, next);
      if (errors.length) {
        rejected += 1;
        record = { slug: patch.slug, status: 'rejected', errors };
      } else if (tier !== 'auto' && !FORCE) {
        // Not a failure — the routing decision.
        record = {
          slug: patch.slug,
          status: 'needs-verify',
          tier,
          derived: derived.length,
          untraceable: untraceable.map((f) => `${f.where}: ${f.raw}`),
          flags: patch.flags ?? [],
        };
      } else {
        if (WRITE) {
          const mode = writePlanIfFaithful(file, raw, plan, layout, next);
          if (mode === null) {
            rejected += 1;
            record = { slug: patch.slug, status: 'rejected', errors: ['unrecognised file formatting'] };
          } else {
            applied += 1;
            record = { slug: patch.slug, status: 'applied', mode, derived: derived.length, flags: patch.flags ?? [] };
          }
        } else {
          applied += 1;
          record = { slug: patch.slug, status: 'would-apply', derived: derived.length, flags: patch.flags ?? [] };
        }
      }
    } catch (err) {
      rejected += 1;
      record = { slug: patch.slug, status: 'rejected', errors: [err.message] };
    }
    results.push(record);
  }

  let toVerify = 0;
  for (const r of results) {
    if (r.status === 'rejected') {
      console.log(`REJECT       ${r.slug}`);
      for (const e of r.errors) console.log(`               ${e}`);
    } else if (r.status === 'needs-verify') {
      toVerify += 1;
      console.log(`${r.tier === 'triple' ? '3-VOTE' : '1-vote'}       ${r.slug}  (${r.derived} derived, ${r.untraceable.length} untraced)`);
      for (const u of r.untraceable) console.log(`               ${u}`);
    } else {
      console.log(`${r.status.padEnd(12)} ${r.slug}`);
    }
  }
  writeFileSync('run1-batch-report.json', JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n${applied} applied/ok, ${toVerify} need verification, ${rejected} rejected.`);
  process.exit(rejected ? 1 : 0);
}
