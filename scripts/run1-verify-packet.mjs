/**
 * Run 1 — the compact verifier packet (PLAN_AUDIT_BRIEF.md §6.2 item 5).
 *
 * "Verifiers get the full plan for coherence/ordering/description checks, but only the
 * compact cutList+materials packet for number-traceability — never thin the context for
 * a judgment check."
 *
 * Batch 1 ignored this and had all three verifiers read whole plan files: ~217k tokens
 * each, ~900k for the batch, ~75k per plan. At that rate the 622 flagged published plans
 * cost tens of millions of tokens. This emits exactly what a NUMBER check needs — the cut
 * list, the materials with units, the derived stock totals, and the changed prose — so
 * the expensive full-context read is spent only where coherence is genuinely at stake.
 *
 * It also pre-computes the arithmetic each verifier would otherwise redo by hand
 * (per-stock-group totals vs supplied stock), because that is a script's job, not a
 * model's.
 *
 *   node scripts/run1-verify-packet.mjs <patch.json> > packet.md
 */
import { readFileSync } from 'node:fs';
import { readPlan } from './plan-io.mjs';
import { applyOps } from './run1-apply-patch.mjs';
import { lintPlan } from './run1-number-lint.mjs';

/**
 * Saw kerf, matching src/lib/cut-optimizer.ts. Every cut eats about 1/8", which is why
 * six 16" parts do NOT fit on a 96" board.
 */
export const KERF = 0.125;

/**
 * First-Fit-Decreasing board packing — the same algorithm and kerf rule as
 * `src/lib/cut-optimizer.ts`, reimplemented here because that module is TypeScript and
 * this is a plain-node script.
 *
 * WHY THIS IS IN THE PACKET: batch 2's three worst defects were all the same mistake —
 * the rewrite agent claimed a lumber shortfall after binning each part LENGTH separately
 * instead of cross-pairing different lengths on one board. A 58 1/4" rafter and a 37 1/2"
 * one share a 96" board; totalling by part type never sees that. Three separate false
 * "buy another board" claims reached the verifiers, who each had to re-pack by hand.
 *
 * Bin-packing has one correct answer, so per §6.2 item 1 it belongs in a script. Handing
 * the true board count to both the writer and the verifier removes the whole defect class
 * rather than catching it downstream.
 */
export function packBoards(lengths, stockLengthIn) {
  const parts = [...lengths].sort((a, b) => b - a);
  if (parts.some((p) => p > stockLengthIn)) return null; // impossible on this stock
  const bins = [];
  for (const p of parts) {
    // A part needs its own length plus a kerf for the cut that frees it, except when it
    // finishes the board exactly.
    const bin = bins.find((b) => b.remaining >= p + (b.used > 0 ? KERF : 0));
    if (bin) {
      bin.remaining -= p + (bin.used > 0 ? KERF : 0);
      bin.used += 1;
    } else {
      bins.push({ remaining: stockLengthIn - p, used: 1 });
    }
  }
  return {
    boards: bins.length,
    worstSlack: bins.length ? Math.min(...bins.map((b) => b.remaining)) : 0,
  };
}

const frac = (v) => {
  const whole = Math.floor(v);
  const f = v - whole;
  if (f < 0.001) return `${whole}`;
  const n = Math.round(f * 16);
  const g = (a, b) => (b === 0 ? a : g(b, a % b));
  const d = g(n, 16);
  return whole > 0 ? `${whole} ${n / d}/${16 / d}` : `${n / d}/${16 / d}`;
};

if (!process.argv[1]?.endsWith('run1-verify-packet.mjs')) {
  // Imported for `packBoards`/`KERF` — do not run the CLI.
} else {
buildPacket();
}

function buildPacket() {
const patches = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = [];

for (const patch of Array.isArray(patches) ? patches : [patches]) {
  if (patch.action !== 'rewrite' || !(patch.ops ?? []).length) continue;
  const { plan } = readPlan(`${patch.slug}.json`);
  const next = applyOps(plan, patch.ops);

  out.push(`\n## ${patch.slug}  (claimed buildability before rewrite: ${patch.score}/5)`);

  out.push('\n### CUT LIST (the only dimensions that exist)');
  for (const c of plan.cutList ?? []) {
    out.push(
      `- ${c.quantity}x ${c.part}: ${frac(c.thicknessIn)}" x ${frac(c.widthIn)}" x ${frac(c.lengthIn)}"` +
        `${c.material ? ` [${c.material}]` : ''}${c.note ? ` — ${c.note}` : ''}` +
        `   (run: ${frac(c.quantity * c.lengthIn)}")`,
    );
  }

  out.push('\n### MATERIALS (names are exact; step.materials must match verbatim)');
  for (const m of plan.materials ?? []) {
    out.push(`- "${m.name}" — ${m.quantity} ${m.unit}${m.note ? ` — ${m.note}` : ''}`);
  }

  out.push('\n### STOCK ARITHMETIC (precomputed — check the claims against this)');
  const groups = new Map();
  for (const c of plan.cutList ?? []) {
    const k = `${frac(c.thicknessIn)}" x ${frac(c.widthIn)}"`;
    if (!groups.has(k)) groups.set(k, { total: 0, lengths: [] });
    const g = groups.get(k);
    g.total += c.quantity * c.lengthIn;
    for (let i = 0; i < c.quantity; i += 1) g.lengths.push(c.lengthIn);
  }
  for (const [k, g] of groups) {
    out.push(`- parts at ${k}: ${frac(g.total)}" of length required`);
    for (const stock of [96, 120, 144]) {
      const packed = packBoards(g.lengths, stock);
      if (packed) out.push(`    at ${stock / 12} ft stock: ${packed.boards} boards (kerf ${frac(KERF)}"), worst offcut ${frac(packed.worstSlack)}"`);
    }
  }
  out.push(`- ALL parts: ${frac([...groups.values()].reduce((a, b) => a + b.total, 0))}" total`);

  out.push('\n### TOOLS AVAILABLE (slugs)');
  out.push((plan.tools ?? []).map((t) => t.slug).join(', '));

  out.push('\n### CHANGED PROSE (verify every number in here)');
  for (const [n, s] of next.steps.entries()) {
    const before = plan.steps[n];
    if (before && before.title === s.title && before.body === s.body) continue;
    out.push(`\n**step ${n + 1}${before ? '' : ' (NEW)'} — ${s.title}**`);
    out.push(s.body);
    out.push(`tools: [${(s.tools ?? []).join(', ')}]  materials: [${(s.materials ?? []).map((x) => `"${x}"`).join(', ')}]`);
  }

  const untraced = lintPlan(next, null).filter((f) => f.status === 'untraceable');
  if (untraced.length) {
    out.push('\n### MACHINE-FLAGGED — adjudicate each explicitly');
    for (const f of untraced) out.push(`- ${f.where}: ${f.raw}`);
  }

  if ((patch.flags ?? []).length) {
    out.push('\n### THE AGENT\'S OWN FLAGS (are these TRUE? a false shortfall is as bad as a missed one)');
    for (const f of patch.flags) out.push(`- ${f}`);
  }
}

console.log(out.join('\n'));
}
