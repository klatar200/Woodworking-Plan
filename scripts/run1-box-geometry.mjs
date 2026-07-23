/**
 * Run 1 — the box-geometry solver.
 *
 * THE PROBLEM IT REMOVES. Nine of the eighteen rewrites rejected in batch 3 failed on one
 * question: when four members make a rectangle, which pair runs the full length and which
 * pair sits between them? Get it backwards and every downstream number inverts —
 * `mini-farmhouse-bedside-table` built a 12" drawer box for a 10-3/4" opening,
 * `printers-console-table` told the builder two correct shelves were 3/4" too long and to
 * cut them shorter, `2x4-frame-panel-chest-of-drawers` computed its slide clearance off a
 * box it had assembled inside-out.
 *
 * Every verifier resolved it the same way, by hand, every time: find the panel — a back,
 * a bottom — and see which reading its dimensions close on. That is arithmetic, not
 * judgement, so per the brief's token rules it belongs in a script and the answer should
 * be handed to the writer rather than rediscovered by three readers afterwards.
 *
 * THE GEOMETRY. Four members of thickness t make a box X by Y. Either the X-members span
 * the full width (and the Y-members are cut to fit between them), or the reverse. With
 * member lengths A and B that gives exactly four candidate panel sizes:
 *
 *     A-full, outer panel  ->  A            x (B + 2t)
 *     A-full, inner panel  ->  (A - 2t)     x B
 *     B-full, outer panel  ->  (A + 2t)     x B
 *     B-full, inner panel  ->  A            x (B - 2t)
 *
 * A panel matching either of the first two proves A runs full; either of the last two
 * proves B runs full. When both readings match, or neither does, the solver says so and
 * claims nothing — an ambiguous answer stated confidently is the defect it exists to stop.
 *
 *   node scripts/run1-box-geometry.mjs [slug ...]
 */
import { planFiles, readPlan } from './plan-io.mjs';
import { inches } from './run1-cut-step.mjs';

/** A sixteenth is the finest mark on a tape; anything closer is the same measurement. */
const TOL = 0.0313;
const near = (a, b) => Math.abs(a - b) < TOL;

/** Unordered comparison — a panel's width and length may be listed either way round. */
const sameRect = (w1, l1, w2, l2) =>
  (near(w1, w2) && near(l1, l2)) || (near(w1, l2) && near(l1, w2));

/**
 * Resolve one plan's box assemblies.
 *
 * Returns a finding per (member-pair, panel) that lands decisively, plus the ambiguous
 * ones flagged as such, so a rewrite can say "the data does not settle this" instead of
 * picking a side.
 */
export function solveBoxes(plan) {
  const rows = (plan.cutList ?? []).filter((c) => c.lengthIn > 0 && c.widthIn > 0);
  const pairs = rows.filter((c) => c.quantity >= 2);
  const findings = [];

  for (let i = 0; i < pairs.length; i += 1) {
    for (let j = i + 1; j < pairs.length; j += 1) {
      const A = pairs[i];
      const B = pairs[j];
      // Members of a single frame share a thickness; different stock is a different box.
      if (!near(A.thicknessIn, B.thicknessIn)) continue;
      if (near(A.lengthIn, B.lengthIn)) continue; // a square frame settles nothing
      const t = A.thicknessIn;

      for (const panel of rows) {
        if (panel === A || panel === B) continue;
        /**
         * The proving panel must actually be a PANEL.
         *
         * A plan holding two cabinets (a play kitchen with a sink and a stove) will
         * happily "prove" a sink side against a stove toekick using another pair of sides
         * as the panel — three parts from two different boxes, arithmetic that closes by
         * coincidence. A real back or bottom is either a singleton or cut from different
         * stock than the frame; a second pair of same-thickness members is neither.
         */
        if (panel.quantity > 1 && near(panel.thicknessIn, t)) continue;
        const aFull =
          sameRect(panel.widthIn, panel.lengthIn, A.lengthIn, B.lengthIn + 2 * t) ||
          sameRect(panel.widthIn, panel.lengthIn, A.lengthIn - 2 * t, B.lengthIn);
        const bFull =
          sameRect(panel.widthIn, panel.lengthIn, A.lengthIn + 2 * t, B.lengthIn) ||
          sameRect(panel.widthIn, panel.lengthIn, A.lengthIn, B.lengthIn - 2 * t);
        if (!aFull && !bFull) continue;

        findings.push({
          panel: panel.part,
          panelDims: [panel.widthIn, panel.lengthIn],
          full: aFull && !bFull ? A : bFull && !aFull ? B : null,
          between: aFull && !bFull ? B : bFull && !aFull ? A : null,
          ambiguous: aFull && bFull,
          thicknessIn: t,
          a: A,
          b: B,
        });
      }
    }
  }
  return findings;
}

/** One-line statements for the rewrite prompt and the verifier packet. */
export function geometryNotes(plan) {
  const all = solveBoxes(plan);

  /**
   * A member pair that two different panels answer DIFFERENTLY is not a determination —
   * it is a contradiction, and the loudest thing the solver can do with one is stay quiet.
   *
   * These arise where a pairing is coincidental (two unrelated parts that happen to share
   * a length) or where the plan's own panels genuinely disagree. 9 pairs of 582 across the
   * corpus. Emitting the first answer found would hand the writer a confident wrong
   * reading, which is precisely the defect this solver exists to prevent.
   */
  const answers = new Map();
  for (const f of all) {
    if (f.ambiguous || !f.full) continue;
    const k = [f.a.part, f.b.part].sort().join('|');
    if (!answers.has(k)) answers.set(k, new Set());
    answers.get(k).add(f.full.part);
  }

  const out = [];
  const seen = new Set();
  for (const f of all) {
    const pairKey = [f.a.part, f.b.part].sort().join('|');
    if ((answers.get(pairKey)?.size ?? 0) > 1) {
      if (!seen.has(pairKey)) {
        seen.add(pairKey);
        out.push(
          `"${f.a.part}" and "${f.b.part}": this plan's own panels support OPPOSITE readings — ` +
            `the cut list contradicts itself here. State the ambiguity; do not resolve it.`,
        );
      }
      continue;
    }
    /**
     * One proof per member pair, not one per panel that happens to confirm it.
     *
     * A plan with a back AND a floor of the same size proves the same reading twice, and
     * the dollhouse emitted the identical 15-1/2" sentence six times. Extra copies of a
     * settled fact are packet weight, and a wall of near-identical lines is read less
     * carefully than one line — which is the opposite of what this section is for.
     */
    const key = pairKey;
    if (seen.has(key)) continue;
    seen.add(key);

    const dims = `${inches(f.panelDims[0])} x ${inches(f.panelDims[1])}`;
    if (f.ambiguous) {
      out.push(
        `"${f.a.part}" and "${f.b.part}": the "${f.panel}" (${dims}) fits BOTH readings — ` +
          `the cut list does not settle which pair runs full length. Do not assert one.`,
      );
      continue;
    }
    /**
     * State the OUTER DIMENSION the reading implies, not just the reading.
     *
     * `modular-stackable-dollhouse` obeyed this section for its deck ("the two 14" pieces
     * fitted between them, since 14" plus a 3/4" end at each side is 15-1/2"") and
     * contradicted it for its roof, from an identical 14" member — asserting the roof
     * "does NOT share the 15-1/2" footprint" and so changing the footprint of every
     * stacking module. The determination was right there; the number it implies was not,
     * so the writer re-derived it once and guessed it once.
     *
     * A number is harder to contradict by accident than a relationship, and it gives the
     * verifier a single value to check rather than a sentence to interpret.
     */
    const outer = f.between.lengthIn + 2 * f.thicknessIn;
    out.push(
      `"${f.full.part}" (${inches(f.full.lengthIn)}) runs the FULL length and ` +
        `"${f.between.part}" (${inches(f.between.lengthIn)}) sits BETWEEN them — ` +
        `proved by the "${f.panel}" at ${dims}, which closes only on that reading ` +
        `(${inches(f.thicknessIn)} stock at each end). ` +
        `The assembly's OUTSIDE dimension across that axis is therefore ` +
        `${inches(outer)} (${inches(f.between.lengthIn)} + two ${inches(f.thicknessIn)} ends); ` +
        `use that figure and do not contradict it elsewhere.`,
    );
  }
  return out;
}

if (process.argv[1]?.endsWith('run1-box-geometry.mjs')) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  let solved = 0;
  let ambiguous = 0;
  let plans = 0;
  for (const file of planFiles()) {
    const { plan } = readPlan(file);
    if (only.length && !only.includes(plan.slug)) continue;
    const notes = geometryNotes(plan);
    if (!notes.length) continue;
    plans += 1;
    solved += notes.filter((n) => !n.includes('BOTH readings')).length;
    ambiguous += notes.filter((n) => n.includes('BOTH readings')).length;
    if (only.length || plans <= 6) {
      console.log(`\n### ${plan.slug}`);
      for (const n of notes) console.log(`  - ${n}`);
    }
  }
  console.log(`\nplans with a resolvable box: ${plans} | determinations: ${solved} | ambiguous: ${ambiguous}`);
}
