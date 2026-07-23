/**
 * Run 1 — the scripted cut-step scaffold (PLAN_AUDIT_BRIEF.md §6.2 item 1, "zero LLM").
 *
 * The brief lists "cut-step scaffold from the cutList" alongside tiers and unit spellings
 * as a MECHANICAL fix, and batch 3 wrote all 78 of them with a model instead — about 16k
 * tokens per plan to restate a table the plan already contains. 135 pending plans need
 * nothing else.
 *
 * The quality argument is stronger than the cost one. Every plan in batch 3 was missing a
 * step telling you to cut the parts, and enumerating that list by hand is exactly where
 * the model kept slipping: a cut step that claimed "all eleven of those pieces" against a
 * nine-row list, another that never used ten of the plan's battens. A script cannot
 * miscount its own input.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: technique, order-of-operations, or joinery. It
 * states what to cut, from what, and how the parts fall onto the boards. Anything that
 * needs judgement stays with the strong model, per the brief's hard rule.
 *
 *   node scripts/run1-cut-step.mjs [--write] [--only slug,slug]
 */
import { writeFileSync } from 'node:fs';
import { planFiles, readPlan, writePlanIfFaithful } from './plan-io.mjs';
import { packBoards } from './run1-verify-packet.mjs';
/** Matches src/lib/format.ts formatInches — tape-measure fractions, never decimals. */
import { inches } from './run1-inches.mjs';

export { inches };

const COUNT = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n) => COUNT[n] ?? String(n);

/**
 * Sheet goods, which are never packed by board length.
 *
 * WARNING: this literal was first written through a shell -> `node -e` -> JS-string
 * chain, which turned each \b into an actual BACKSPACE byte (0x08). The regex then
 * demanded an unprintable character either side of "plywood", silently matched nothing,
 * and every plywood group fell through into the board tally. `cat -A` showed it as ^H;
 * nothing else did — not grep, not the Read tool, not eslint. Same family as the
 * \s-collapses-to-s trap in CLAUDE.md. Source edits go through the editor, never
 * through a shell-escaped rewrite.
 */
const SHEET_GOODS = /\b(plywood|mdf|osb|hardboard|melamine|particle board|project panel)\b/i;

/** Tools from the plan's OWN list that plausibly make a cut. Subset rule is absolute. */

const CUTTING = /^(circular-saw|miter-saw|mitre-saw|table-saw|jigsaw|hand-saw|saw|tape-measure|speed-square|square|pencil|clamps)$/;

/**
 * Cut-list part names are authored Title Case ("Rails", "Seat Slat") because they head a
 * table column. Dropped into a sentence they read as proper nouns, so lowercase the lead
 * capital — but leave genuine acronyms and nominal sizes alone ("X Brace", "2x4 Cleat").
 */
const partName = (s) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/**
 * "1x3 furring strips, 8 ft" -> "1x3 furring strips". The length qualifier belongs to the
 * purchase, not to the sentence "cut these from the ___", where it reads as if the part
 * itself were 8 ft. Board counts are stated separately and exactly.
 */
const stockName = (s) => {
  const stripped = s
    .replace(/,\s*\d+(?:\.\d+|-\d+\/\d+|\s+\d+\/\d+)?\s*(?:ft|feet|foot|in|inch(?:es)?|")\.?\s*$/i, '')
    .trim();
  /**
   * Some material names are authored with a DECIMAL inch — "1x6, 16.25 in". The plan's own
   * data is not this script's to rewrite (a material name is a shopping-list merge key, so
   * renaming it silently splits a merged line), but a decimal must never reach builder-
   * facing prose. If a qualifier survives stripping and still carries one, drop back to
   * the bare nominal rather than quoting it.
   */
  if (/\d+\.\d+/.test(stripped)) return /^[^,]*/.exec(stripped)[0].trim();
  return stripped;
};

const list = (items) =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * Nominal stock length declared in the materials, in inches — "1x3, 8 ft" -> 96.
 * Returns null when the plan does not say, in which case the scaffold stays silent about
 * board counts rather than assuming 8 ft.
 */
function stockLengthFor(plan, signature) {
  /**
   * The match key must be SPECIFIC or there is no match at all.
   *
   * Keying on `signature.nominal` alone meant a material with no nominal name — "1/4\"
   * hobby stock" — searched for the empty string, which every row contains, and so
   * inherited the stock length of whatever material happened to be listed first. That
   * produced "five 7 ft 1/4\" hobby stock" out of a 4x4's length. A board count nobody
   * can trace is worse than no board count, so an unmatched group stays silent.
   */
  const key = (signature.nominal || stockName(signature.material)).toLowerCase();
  if (!key) return null;

  for (const m of plan.materials ?? []) {
    const text = `${m.name} ${m.note ?? ''}`;
    if (!text.toLowerCase().includes(key)) continue;
    const unit = (m.unit ?? '').toLowerCase();
    // Sold by the running foot: the buyer picks the length, so no board count applies.
    if (['ft', 'feet', 'foot'].includes(unit) && m.quantity) return null;
    const ft = /(\d+)\s*(?:ft\b|feet\b|foot\b)/i.exec(text);
    if (ft) return Number(ft[1]) * 12;
  }
  return null;
}

/** Group cut-list rows by the stock they come from (thickness x width). */
function stockGroups(plan) {
  const groups = new Map();
  for (const c of plan.cutList ?? []) {
    const key = `${c.thicknessIn}x${c.widthIn}`;
    if (!groups.has(key)) {
      groups.set(key, {
        thicknessIn: c.thicknessIn,
        widthIn: c.widthIn,
        // Nominal name as the plan itself writes it, for matching the materials row.
        nominal: /\b\d+\s*x\s*\d+\b/i.exec(c.material ?? '')?.[0]?.replace(/\s+/g, '') ?? '',
        material: c.material ?? '',
        rows: [],
      });
    }
    groups.get(key).rows.push(c);
  }
  return [...groups.values()];
}

/** The scaffold step, or null when the plan has no cut list to enumerate. */
export function buildCutStep(plan) {
  const groups = stockGroups(plan);
  if (!groups.length) return null;

  /**
   * One sentence per stock group, then ONE consolidated board-count sentence.
   *
   * The first version repeated "All of these come off the same X stock" and "Those pieces
   * take N boards once you allow 1/8" for each saw cut" once per group — seven times over
   * on a storage bed. Correct, and unreadable. A builder skims this step at the saw.
   */
  const sentences = [];
  const tally = [];
  const warnings = [];

  for (const g of groups) {
    const parts = g.rows.map((c) => `${count(c.quantity)} ${partName(c.part)} at ${inches(c.lengthIn)}`);
    const from = g.material ? ` from the ${stockName(g.material)}` : '';
    sentences.push(`Cut ${list(parts)}${from}.`);

    /**
     * Sheet goods are NOT packed by length. Plywood is a 2D sheet, so "these take two 8 ft
     * boards" is both the wrong noun and the wrong question — what matters is how the
     * parts nest on a 4x8 sheet, which is a different problem this script does not solve
     * and must not pretend to.
     */
    if (SHEET_GOODS.test(g.material)) continue;

    const stock = stockLengthFor(plan, g);
    if (!stock) continue;
    const lengths = g.rows.flatMap((c) => Array(c.quantity).fill(c.lengthIn));
    const packed = packBoards(lengths, stock);
    const label = stockName(g.material) || `${inches(g.thicknessIn)} x ${inches(g.widthIn)} stock`;
    if (packed) {
      tally.push(`${count(packed.boards)} ${stock / 12} ft ${label}`);
    } else {
      // A part longer than the stock is a real defect; state it, never round it away.
      warnings.push(
        `the longest ${label} piece is ${inches(Math.max(...lengths))}, which will not come off the ${stock / 12} ft length this plan lists`,
      );
    }
  }

  if (tally.length) {
    sentences.push(
      `Allowing about 1/8" for each saw cut, that comes to ${list(tally)}.`,
    );
  }
  if (warnings.length) {
    sentences.push(
      `Check your lumber before cutting: ${list(warnings)} — buy a longer length or adjust the cut list to suit.`,
    );
  }

  const all = (plan.cutList ?? []).flatMap((c) => Array(c.quantity).fill(c.lengthIn));
  const close = all.some((a, i) => all.some((b, j) => i !== j && Math.abs(a - b) > 0 && Math.abs(a - b) <= 0.5));
  sentences.push(
    close
      ? 'Square every cut and label each piece as it comes off the saw — several parts here are within half an inch of each other and are easy to mix up later.'
      : 'Square every cut and label each piece as it comes off the saw.',
  );

  const toolSlugs = (plan.tools ?? []).map((t) => t.slug).filter((s) => CUTTING.test(s));
  /**
   * Tag the plan's OWN material rows that this step consumes.
   *
   * An exact string match almost never fires — the cut list says "Pine 1x12" while the
   * materials row is "Pine, 1x12, 8 ft" — so the first version tagged nothing on most
   * plans. Matching on the nominal instead, and returning EVERY row that carries it,
   * keeps the result honest where a plan buys the same nominal in two lengths: the cut
   * step really does draw on both, so naming one and hiding the other would be a guess.
   *
   * The returned strings are always verbatim plan material names, so the subset rule
   * holds by construction; `checkPatched` re-verifies it regardless.
   */
  const materials = [];
  for (const g of groups) {
    const key = (g.nominal || stockName(g.material)).toLowerCase();
    if (!key) continue;
    for (const m of plan.materials ?? []) {
      if (m.name.toLowerCase().includes(key) && !materials.includes(m.name)) materials.push(m.name);
    }
  }

  return {
    title: 'Cut all the parts',
    body: sentences.join(' '),
    tools: toolSlugs,
    materials,
  };
}

const CUT_WORDS = /\b(cut|rip|crosscut|miter|mitre|saw|trim to length|cut to length|break down)\b/i;

/**
 * A plan whose existing steps cite each other BY NUMBER cannot take a scripted insert:
 * prepending a cut step shifts every reference by one, and rewording them is a judgement
 * the scaffold has no business making. Two plans are affected; both already sit on the
 * model path, so this costs nothing and keeps the mechanical path provably safe.
 */
const STALE_REF = /\bsteps?\s+\d+(?![\d"″\-/]|\s*(?:in\b|inch|ft\b|feet\b))/i;

export const needsCutStep = (plan) =>
  (plan.cutList ?? []).length > 0 &&
  !(plan.steps ?? []).some((s) => CUT_WORDS.test(`${s.title} ${s.body}`)) &&
  !(plan.steps ?? []).some((s) => STALE_REF.test(`${s.title} ${s.body}`));

if (process.argv[1]?.endsWith('run1-cut-step.mjs')) {
  const WRITE = process.argv.includes('--write');
  const oi = process.argv.indexOf('--only');
  const only = oi === -1 ? null : new Set(process.argv[oi + 1].split(','));

  let done = 0;
  const preview = [];
  for (const file of planFiles()) {
    const { raw, plan, layout } = readPlan(file);
    if (only && !only.has(plan.slug)) continue;
    if (!needsCutStep(plan)) continue;
    const step = buildCutStep(plan);
    if (!step) continue;

    const next = { ...plan, steps: [step, ...(plan.steps ?? [])] };
    if (WRITE) {
      if (writePlanIfFaithful(file, raw, plan, layout, next) === null) {
        console.log(`SKIP (formatting) ${plan.slug}`);
        continue;
      }
    }
    done += 1;
    if (preview.length < 3) preview.push(`--- ${plan.slug}\n${step.body}\n    tools: [${step.tools}]  materials: [${step.materials.join(' | ')}]`);
  }
  console.log(preview.join('\n\n'));
  console.log(`\n${WRITE ? 'wrote' : 'would write'} a cut step into ${done} plan(s).`);
  if (!WRITE) writeFileSync('run1-cut-step-preview.txt', preview.join('\n\n'), 'utf8');
}
