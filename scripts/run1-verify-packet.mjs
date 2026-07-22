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

const frac = (v) => {
  const whole = Math.floor(v);
  const f = v - whole;
  if (f < 0.001) return `${whole}`;
  const n = Math.round(f * 16);
  const g = (a, b) => (b === 0 ? a : g(b, a % b));
  const d = g(n, 16);
  return whole > 0 ? `${whole} ${n / d}/${16 / d}` : `${n / d}/${16 / d}`;
};

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
    groups.set(k, (groups.get(k) ?? 0) + c.quantity * c.lengthIn);
  }
  for (const [k, total] of groups) out.push(`- parts at ${k}: ${frac(total)}" of length required`);
  out.push(`- ALL parts: ${frac([...groups.values()].reduce((a, b) => a + b, 0))}" total`);

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
