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

/**
 * Did the plan move under this patch between writing it and applying it?
 *
 * THE INCIDENT. 34 patches were written at 16:06 against the plans as they then stood.
 * At 21:10 `run1-cut-step.mjs` scaffolded a "Cut all the parts" step into 311 plans —
 * including most of those 34. Every `replace` index in those patches was now off by one,
 * so each one silently overwrote the step AFTER its target and left the target's content
 * duplicated further down. Four independent verifiers reported it as "a step was
 * destroyed" and charged it to the rewrite agents. It was neither theirs nor the
 * applier's: `applyOps` did exactly what the patch said, to a different array than the
 * patch was written for.
 *
 * An index is only meaningful against the array it was computed from. So a patch has to
 * carry enough of that array to prove it is still looking at it — a step count is not
 * enough (a delete plus an insert nets to zero), hence the titles.
 *
 * Patches predating this field are ACCEPTED with a warning rather than blocked: the field
 * cannot be retrofitted onto a patch that has already been written, and refusing them
 * outright would discard work that may be perfectly valid. The warning is what routes a
 * human to check.
 */
export function checkPatchBase(plan, patch) {
  const expected = patch.baseStepTitles;
  if (!Array.isArray(expected)) {
    return [`⚠ patch carries no baseStepTitles — cannot prove its indices match this plan`];
  }
  const actual = (plan.steps ?? []).map((s) => s.title);
  if (expected.length !== actual.length) {
    return [
      `🛑 plan has ${actual.length} steps, patch was written against ${expected.length} — ` +
        `every index in it is suspect (did a scaffold run in between?)`,
    ];
  }
  const moved = actual.map((t, i) => (t === expected[i] ? null : i)).filter((i) => i !== null);
  if (moved.length) {
    return [`🛑 steps ${moved.map((i) => i + 1).join(', ')} are not the steps this patch was written against`];
  }
  return [];
}

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

/**
 * A numeric step cross-reference in a plan whose steps have been RENUMBERED.
 *
 * x-desk-with-drawer was returned by all three verifiers for this alone: the rewrite
 * inserted the missing cut step, every later step shifted by one, and an untouched step
 * went on saying "before step 7" — now pointing at the wrong step. The prose was fine;
 * the numbering underneath it moved.
 *
 * Inserting a cut step is the single most common op in this run, so this is a defect
 * class, not an incident. It is also perfectly deterministic, so per §6.2 item 1 it
 * belongs in a script rather than in three verifiers' attention budget.
 *
 * The fix is to ban the brittle form outright in any plan an insert has renumbered:
 * "before you attach the aprons" cannot go stale, and reads better than "before step 7"
 * regardless. Plans with no insert keep their existing references untouched — this is a
 * renumbering guard, not a style rule.
 */
function staleStepRefs(nextPlan) {
  const out = [];
  for (const [n, s] of (nextPlan.steps ?? []).entries()) {
    /**
     * A trailing measurement means this is a PART, not a cross-reference.
     * `triple-bunk-staggered-beds` enumerates "four hanging mid-bunk steps 29\"" in its
     * cut step — bunk ladder steps, with their length. Reading that as a pointer to step
     * 29 rejects a correct patch, and a guard that cries wolf is how the next real stale
     * reference gets waved through.
     */
    for (const m of `${s.title} ${s.body}`.matchAll(
      // The `[\d…]` class must lead: without it `\d+` backtracks a digit to satisfy the
      // lookahead, so `steps 29"` matches as `steps 2` and the exclusion never fires.
      /\bsteps?\s+\d+(?![\d"″\-/]|\s*(?:in\b|inch|ft\b|feet\b))/gi,
    )) {
      out.push(
        `step ${n + 1}: "${m[0]}" — an insert renumbered this plan's steps, so a numeric ` +
          `cross-reference is stale. Name the step instead.`,
      );
    }
  }
  return out;
}

/** Returns [] when the candidate is shippable, else the reasons it is not. */
export function checkPatched(originalPlan, nextPlan, changedFields, renumbered = false) {
  const errors = renumbered ? staleStepRefs(nextPlan) : [];
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

  /**
   * A patch must not leave two steps saying the same thing.
   *
   * `simple-adirondack-side-table` was returned for shipping TWO identical finishing
   * steps: the agent replaced the original step 5 and then also emitted it as an insert,
   * so the applied plan ended "Finish: apply exterior stain or paint" twice. That is not
   * a judgement call and no verifier should have to spend a vote on it — identical bodies
   * are a mechanical fact about the array.
   */
  const bodies = new Map();
  for (const [n, s] of (nextPlan.steps ?? []).entries()) {
    const key = (s.body ?? '').trim().toLowerCase();
    if (!key) continue;
    if (bodies.has(key)) {
      errors.push(`step ${n + 1}: body is identical to step ${bodies.get(key) + 1}`);
    } else {
      bodies.set(key, n);
    }
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
  /\b(short(?:fall|s)?\b|not enough|falls? short|won'?t (?:be )?enough|cannot yield|can'?t yield|need (?:a|an|another|one more|a fifth|a fourth)\b|a second board|buy (?:more|another|an extra))/i;

/**
 * A CLEARED shortfall is the opposite of a claim, and the words look identical.
 *
 * Batch 2 routed 18 of 20 patches to the full panel because the agent had diligently
 * written "verified 2x4 and 2x6 both pack comfortably — no shortfall in either", and a
 * bare keyword match read that as an assertion. Tiering that fires on the negation of
 * its own trigger is not tiering.
 */
const CLEARED = /\b(no|not|isn'?t|without|never|rather than)\b[^.]{0,40}$|(comfortabl|plenty|clears|packs? (?:in|into|comfortabl)|fits? (?:in|into|comfortabl)|no shortfall|not a shortfall)/i;

/** Sentences that ASSERT a shortfall, ignoring ones that rule one out. */
function assertsShortfall(text) {
  return String(text)
    .split(/(?<=[.!?])\s+/)
    .some((sentence) => {
      if (!SHORTFALL_CLAIM.test(sentence)) return false;
      // Look only at the clause around the match, so a later clearance elsewhere in a
      // long sentence cannot mask a real claim earlier in it.
      const idx = sentence.search(SHORTFALL_CLAIM);
      const clause = sentence.slice(Math.max(0, idx - 60), idx + 60);
      return !CLEARED.test(clause);
    });
}

/**
 * Which verification tier this patch needs (PLAN_AUDIT_BRIEF.md §6.2 item 3, tiered per
 * Keagan's 2026-07-22 call). Tiering may only ADD scrutiny relative to the lint, never
 * remove it: 'auto' requires that EVERY number traced exactly.
 */
export function verificationTier({ untraceable }, patch, nextPlan) {
  const prose = (nextPlan.steps ?? []).map((s) => `${s.title} ${s.body}`).join('\n');
  /**
   * Frame geometry asserted where the solver could not settle it.
   *
   * `scripts/run1-box-geometry.mjs` answers "which pair runs full length" only when one
   * of the plan's own panels closes on exactly one reading. Its SILENCE is a real result:
   * the cut list does not determine the assembly, and the brief says to describe the joint
   * without asserting which piece is captured.
   *
   * Both plans in the batch-4 held-over set ignored that. `simple-adirondack-side-table`
   * declared "two 15\" long sides parallel, two 14-1/2\" short sides fitted between them"
   * on a cut list that supports neither reading cleanly, then invented a lap joint to
   * absorb the 1-1/2" that didn't fit. The solver was silent for it; the prose was not.
   *
   * This does not reject — an assertion can still be right, and the plan's `description`
   * may carry a footprint the cut list alone doesn't. It buys the extra votes.
   */
  const assertsGeometry =
    /\b(?:fit(?:ted|s)?|sit(?:s|ting)?|captur\w+|nest(?:ed|s)?|inset)\s+(?:in\s+)?between\b|\bruns?\s+the\s+full\b|\bbetween\s+(?:the\s+)?two\b/i.test(
      prose,
    );
  if (assertsGeometry && !geometryNotes(nextPlan).length) return 'triple';
  // A structural declaration beats inferring intent from prose. When the agent states
  // it, that is the answer; the text scan is only the fallback for patches written
  // before the field existed.
  const claimsShortfall =
    typeof patch.shortfallClaim === 'boolean'
      ? patch.shortfallClaim
      : assertsShortfall(prose) || (patch.flags ?? []).some((f) => assertsShortfall(f));

  if (untraceable.length || claimsShortfall) return 'triple';

  /**
   * A prose rewrite NEVER auto-applies. §6.2 item 2 exempts "a mechanical change that
   * passes lint + validator" from model review — a cost-tier recomputation or a unit
   * spelling, where the lint is the whole question. A step rewrite is not that: it is a
   * judgment change, and the brief routes judgment to verifiers.
   *
   * The gap this closes is specific. Tracing every number proves no dimension was
   * invented; it proves nothing about what the sentence does with them. Two returned
   * plans had perfect number traceability and were still wrong — 11-1/4" side trims
   * placed on the 26-1/2" front/back edges, and a frame described as 69-1/2" x 17" that
   * its own rails make 66-1/2" x 20". Both would have shipped unread under an 'auto'
   * tier, because every figure in them was real.
   */
  return 'single';
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
      // Before trusting a single index in this patch, prove it still describes this plan.
      const baseProblems = checkPatchBase(plan, patch);
      if (baseProblems.some((p) => p.startsWith('🛑'))) {
        rejected += 1;
        results.push({ slug: patch.slug, status: 'rejected', errors: baseProblems });
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

      const renumbered = patch.ops.some((o) => o.op === 'insert');
      const { errors, derived, untraceable } = checkPatched(plan, next, changed, renumbered);
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
