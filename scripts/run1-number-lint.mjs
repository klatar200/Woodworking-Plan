/**
 * Run 1 — the deterministic no-invented-number lint (PLAN_AUDIT_BRIEF.md §6.2 item 2).
 *
 * "Every part-dimension in the new prose must trace to the cutList/materials." This is
 * the primary guard against the worst defect the brief names — an invented dimension —
 * and it is EXACT rather than probabilistic, so it runs before any model verifier and
 * decides which numbers even need one.
 *
 * Design notes that matter:
 *
 *  - Fractions are NORMALISED before comparison. `23 1/2"`, `23-1/2"` and `23.5` are the
 *    same measurement written three ways; comparing them as strings would flag correct
 *    prose and, worse, pass incorrect prose that happened to match a string somewhere.
 *
 *  - A number is traceable if it appears in the plan's own cutList (thickness/width/
 *    length), in a material name or note, in the description the rewrite was derived
 *    from, or is a SHOP CONSTANT the plan's own materials justify (a 1-1/4" screw is
 *    traceable when the materials list 1-1/4" screws, and not otherwise).
 *
 *  - DERIVED values are the interesting case: a rewrite may legitimately say two 8 ft
 *    strips yield a 72" rail with a 24" offcut. 96 - 72 = 24 is sound arithmetic on the
 *    plan's own numbers, so the lint accepts sums and differences of traceable values
 *    (one level deep) and reports them as `derived` rather than `ok` — they are exactly
 *    the class §6.2(3) routes to the 3-vote verifiers.
 *
 * Exit code is non-zero when any untraceable number survives, so it works as a gate.
 */
import { planFiles, readPlan } from './plan-io.mjs';

/** "23 1/2" | "23-1/2" | "3/4" | "0.75" -> 23.5 | 23.5 | 0.75 | 0.75 */
export function toNumber(text) {
  const s = String(text).trim();
  let m = /^(\d+)[\s-](\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = /^(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[1]) / Number(m[2]);
  m = /^\d+(?:\.\d+)?$/.exec(s);
  if (m) return Number(s);
  return null;
}

/**
 * Every measurement-looking token in a prose string, as {raw, value}.
 * Requires an inch/foot/degree marker — a bare "two" or "four screws" is a count, not a
 * dimension, and flagging counts would drown the real signal.
 */
export function extractMeasurements(text) {
  const out = [];
  const re =
    /\b(\d+(?:[\s-]\d+\/\d+)?|\d+\/\d+|\d+(?:\.\d+)?)\s*(?:(")|(″)|(in\b|inch(?:es)?\b)|(ft\b|feet\b|foot\b)|(°|deg(?:rees)?\b))/gi;
  let m;
  while ((m = re.exec(text))) {
    const value = toNumber(m[1]);
    if (value === null) continue;
    const unit = m[5] ? 'ft' : m[6] ? 'deg' : 'in';
    out.push({ raw: m[0].trim(), value, unit, index: m.index });
  }
  return out;
}

const near = (a, b) => Math.abs(a - b) < 1e-6;

/**
 * Values that are properties of the SHOP, not claims about this project's parts, so no
 * plan's data could ever justify them and flagging them is pure noise.
 *
 * Kept deliberately tiny. Every entry has to be a number that cannot express a part
 * dimension. 3/4" is NOT here on purpose: "3/4-inch plywood" is a claim about the stock
 * you must buy, so when a plan's own materials never mention 3/4 stock that is a real
 * material-sufficiency defect — exactly the class the audit found most of — and the lint
 * has to keep surfacing it. Widening this list to silence noise would blind the guard.
 */
const SHOP_CONSTANTS = {
  in: [0.125, 0.0625], // saw kerf; tape-measure resolution
  deg: [45, 90], // miter and square
  ft: [],
};

/** The set of numbers a plan's own data justifies, by unit. */
export function traceableUniverse(plan) {
  const inches = new Set();
  const degrees = new Set();
  const feet = new Set();

  /**
   * The plan's own DESCRIPTION is a source, per §4.4: "Ground every added detail in the
   * plan's `cutList`, `materials`, and existing `description`."
   *
   * Omitting it produced a real false positive that three independent verifiers had to
   * overturn by hand: welly-boot-rack's description already says "taping the spade bit
   * 3/4\" up from its tip … a clean 3/4\"-deep dowel socket", so the rewrite repeating
   * 3/4" was quoting the plan, not inventing. A guard that flags authored values trains
   * everyone downstream to wave flags through, which is worse than not flagging.
   */
  for (const t of extractMeasurements(plan.description ?? '')) {
    (t.unit === 'deg' ? degrees : t.unit === 'ft' ? feet : inches).add(t.value);
    if (t.unit === 'ft') inches.add(t.value * 12);
  }

  for (const c of plan.cutList ?? []) {
    for (const v of [c.thicknessIn, c.widthIn, c.lengthIn]) inches.add(v);
    for (const t of extractMeasurements(`${c.part} ${c.material ?? ''} ${c.note ?? ''}`)) {
      (t.unit === 'deg' ? degrees : t.unit === 'ft' ? feet : inches).add(t.value);
    }
  }

  for (const mat of plan.materials ?? []) {
    const text = `${mat.name} ${mat.note ?? ''} ${mat.species ?? ''}`;
    for (const t of extractMeasurements(text)) {
      (t.unit === 'deg' ? degrees : t.unit === 'ft' ? feet : inches).add(t.value);
      // A material sold as "8 ft" justifies discussing it as 96" — the same board.
      if (t.unit === 'ft') inches.add(t.value * 12);
    }
    // Nominal lumber ("1x4", "2x6") justifies talking about a 1x4 and its members.
    for (const nm of text.matchAll(/\b(\d+)\s*x\s*(\d+)\b/gi)) {
      inches.add(Number(nm[1]));
      inches.add(Number(nm[2]));
    }
    // A material sold BY LENGTH carries its quantity in that unit: moulding with
    // { unit: "ft", quantity: 12 } is twelve feet of stock, so "12 ft supplied" is a
    // direct read of the plan's data even though no name or note spells it out.
    const unit = (mat.unit ?? '').trim().toLowerCase();
    if (unit === 'ft' || unit === 'feet' || unit === 'foot') {
      feet.add(mat.quantity);
      inches.add(mat.quantity * 12);
    } else if (unit === 'in' || unit === 'inches' || unit === 'inch') {
      inches.add(mat.quantity);
    }
  }

  /**
   * MATERIAL-YIELD AGGREGATES.
   *
   * §4.6 requires a rewrite to state when the declared lumber falls short of the cut
   * list — which means writing sentences like "the cut list needs 123 1/2\" but one 10 ft
   * board gives you 120\"". That total is arithmetic on the plan's OWN data, so it must
   * be traceable, but it is not any single cutList value and pairwise derivation cannot
   * reach it.
   *
   * Only three shapes are admitted, all of them the sums a builder actually computes:
   * per-row (quantity x length), per-STOCK-GROUP (rows sharing a thickness x width
   * signature — i.e. parts cut from the same board), and the grand total. This is
   * deliberately not "any subset sum": that would be so permissive it would justify
   * almost any number and the guard would stop guarding.
   */
  const groups = new Map();
  let grandTotal = 0;
  for (const c of plan.cutList ?? []) {
    const run = c.quantity * c.lengthIn;
    inches.add(run);
    grandTotal += run;
    const key = `${c.thicknessIn}x${c.widthIn}`;
    groups.set(key, (groups.get(key) ?? 0) + run);
  }
  for (const total of groups.values()) inches.add(total);
  if (grandTotal > 0) inches.add(grandTotal);

  return { in: inches, deg: degrees, ft: feet };
}

/** Sums and differences of two traceable values — one level, no chaining. */
function derivable(value, pool) {
  const vals = [...pool];
  for (let i = 0; i < vals.length; i += 1) {
    for (let j = i; j < vals.length; j += 1) {
      if (near(value, vals[i] + vals[j]) || near(value, Math.abs(vals[i] - vals[j]))) return true;
    }
    // integer multiples cover "five rungs at 16 inches = 80 inches of stock"
    for (let k = 2; k <= 12; k += 1) if (near(value, vals[i] * k)) return true;
  }
  return false;
}

/**
 * Lint one plan's prose against its own data.
 * `fields` limits the check to changed text; omit it to lint the whole plan.
 */
export function lintPlan(plan, fields = null) {
  const universe = traceableUniverse(plan);
  const texts =
    fields ??
    [
      ['description', plan.description],
      ...(plan.steps ?? []).flatMap((s, n) => [
        [`step${n + 1}.title`, s.title],
        [`step${n + 1}.body`, s.body],
      ]),
    ];

  const findings = [];
  for (const [where, text] of texts) {
    for (const tok of extractMeasurements(text ?? '')) {
      const pool = universe[tok.unit] ?? new Set();
      if ((SHOP_CONSTANTS[tok.unit] ?? []).some((v) => near(v, tok.value))) continue;
      if ([...pool].some((v) => near(v, tok.value))) continue;
      // A foot value stated in a plan whose data is in inches is fine if it converts.
      if (tok.unit === 'ft' && [...universe.in].some((v) => near(v, tok.value * 12))) continue;
      if (tok.unit === 'in' && [...universe.ft].some((v) => near(v * 12, tok.value))) continue;
      const status = derivable(tok.value, tok.unit === 'in' ? universe.in : pool)
        ? 'derived'
        : 'untraceable';
      findings.push({ where, raw: tok.raw, value: tok.value, unit: tok.unit, status });
    }
  }
  return findings;
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith('run1-number-lint.mjs')) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const showDerived = process.argv.includes('--derived');
  let untraceable = 0;
  let derivedCount = 0;
  const perPlan = [];

  for (const file of planFiles()) {
    const { plan } = readPlan(file);
    if (only.length && !only.includes(plan.slug)) continue;
    const findings = lintPlan(plan);
    const bad = findings.filter((f) => f.status === 'untraceable');
    derivedCount += findings.length - bad.length;
    if (bad.length) {
      untraceable += bad.length;
      perPlan.push({ slug: plan.slug, published: plan.published !== false, bad });
    }
    if (showDerived) {
      for (const f of findings.filter((x) => x.status === 'derived')) {
        console.log(`derived    ${plan.slug} ${f.where} ${f.raw}`);
      }
    }
  }

  perPlan.sort((a, b) => b.bad.length - a.bad.length);
  for (const p of perPlan.slice(0, 25)) {
    console.log(`${String(p.bad.length).padStart(3)}  ${p.slug}${p.published ? '' : ' (unpublished)'}`);
    for (const f of p.bad.slice(0, 4)) console.log(`       ${f.where}: ${f.raw}`);
  }
  console.log(`\nplans with untraceable numbers: ${perPlan.length}`);
  console.log(`untraceable tokens: ${untraceable} | derived (need a verifier): ${derivedCount}`);
  process.exit(untraceable ? 1 : 0);
}
