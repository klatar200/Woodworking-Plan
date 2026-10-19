// sweep.mjs — Stage 3: the scripted sweep of every published plan (rubric R-1).
//
// Read-only against content/. Decides what a script can decide for R1–R6, R10 and R11 and writes
// `flagged` candidates (path + verbatim quote) for the readers. Measurements are scored on Kreg's
// corrected dimensions (Keagan 2026-10-18): each cut row's `correctRow` from the record's
// importDiffs (written by import-fidelity.mjs) replaces the live import-damaged value.
//
// Result values: pass | fail | unknown | n/a, plus two interim ones the readers resolve:
//   "flagged" — the script found candidates (see `flagged`); "to-read" — reader-scored, nothing
//   flagged. Also writes ledger stage "swept" + tags, and audit/plan-quality/sweep-summary.json.
//
//   node audit/plan-quality/scripts/sweep.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PLANS = 'content/plans';
const RECORDS = 'audit/plan-quality/plans';
const LEDGER = 'audit/plan-quality/ledger.json';
const TOL = 1 / 32;
const KERF = 1 / 8;
const MAX_FLAGS = 12; // per check per plan; the count beyond is recorded

// §9 — the only nominal sizes we may use.
const NOMINAL = {
  '1x2': [0.75, 1.5], '1x3': [0.75, 2.5], '1x4': [0.75, 3.5], '1x6': [0.75, 5.5], '1x8': [0.75, 7.25],
  '1x10': [0.75, 9.25], '1x12': [0.75, 11.25], '2x2': [1.5, 1.5], '2x3': [1.5, 2.5], '2x4': [1.5, 3.5],
  '2x6': [1.5, 5.5], '2x8': [1.5, 7.25], '2x10': [1.5, 9.25], '2x12': [1.5, 11.25], '4x4': [3.5, 3.5],
};

// ── Text helpers ─────────────────────────────────────────────────────────────────────────────
const UNI = { '½': '1/2', '¼': '1/4', '¾': '3/4', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8', '⅓': '1/3', '⅔': '2/3', '⅙': '1/6', '⅚': '5/6' };
function normalize(s) {
  let t = String(s ?? '');
  for (const [k, v] of Object.entries(UNI)) t = t.split(k).join(` ${v}`);
  return t.replace(/⁄/g, '/').replace(/[”“″]/g, '"').replace(/''/g, '"').replace(/[’‘′]/g, "'").replace(/×/g, 'x').replace(/[ \t]+/g, ' ');
}
const MEAS = /(\d+)[ -]+(\d+)\/(\d+)|(\d+)\/(\d+)|(\d*\.\d+|\d+)/g;
function tokens(s) {
  const out = [];
  for (const m of s.matchAll(MEAS)) {
    const v = m[1] !== undefined ? +m[1] + +m[2] / +m[3] : m[4] !== undefined ? +m[4] / +m[5] : +m[6];
    out.push({ v, text: m[0], index: m.index, end: m.index + m[0].length });
  }
  return out;
}
/** Measurements followed by an inch mark (", in, inch) — the dimensions a step states. */
function inchValues(s) {
  return tokens(s).filter((t) => /^\s*("|in\b|inch)/i.test(s.slice(t.end))).map((t) => ({ ...t, after: s.slice(t.end, t.end + 30) }));
}
const near = (a, b) => Math.abs(a - b) <= TOL;
const quote = (s, i = 0, len = 200) => {
  const str = String(s);
  if (str.length <= len) return str;
  const start = Math.max(0, Math.min(i - 60, str.length - len));
  return str.slice(start, start + len);
};
/** Split text into sentences, keeping each sentence's start offset (for verbatim quotes). */
function sentences(text) {
  const out = [];
  const re = /[^.!?\n]+[.!?]?/g;
  let m;
  while ((m = re.exec(text))) if (m[0].trim()) out.push({ s: m[0].trim(), at: m.index });
  return out;
}

// ── Materials → stock ────────────────────────────────────────────────────────────────────────
const SHEET_RE = /plywood|\bply\b|\bmdf\b|\bsheet\b|hardboard|\bosb\b|particle ?board|melamine|baltic|luan|lauan|beadboard|pegboard/i;
/** Parse one material into stock, or { unknown: reason }. Only `board` lines are stock. */
function parseStock(m) {
  const n = normalize(m.name);
  const isSheet = SHEET_RE.test(n);
  const nom = n.match(/\b(\d+)\s*x\s*(\d+)\b/i);
  if (!isSheet && nom && NOMINAL[`${nom[1]}x${nom[2]}`]) {
    const [t, w] = NOMINAL[`${nom[1]}x${nom[2]}`];
    const rest = n.slice(nom.index + nom[0].length);
    let len = null; let assumption = null;
    // Feet win ("3/4" x 3 1/2" x 8'"); otherwise the last inch value longer than the board's
    // width ("1x6 36""), so actual-size notes like "(3/4" x 1 1/2")" are not read as a length.
    const marked = tokens(rest).map((tk) => ({ tk, unit: (rest.slice(tk.end).match(/^\s*("|in\b|inch|'|ft\b|foot|feet)/i) || [])[1] })).filter((x) => x.unit);
    const feet = marked.find((x) => /^('|ft|foot|feet)$/i.test(x.unit));
    const inches = marked.filter((x) => !/^('|ft|foot|feet)$/i.test(x.unit) && x.tk.v > w);
    if (feet) len = feet.tk.v * 12;
    else if (inches.length) len = Math.max(...inches.map((x) => x.tk.v));
    else if (marked.length) len = null;
    else {
      const xl = rest.match(/^\s*x\s*(\d+)\b(?!\s*\/)/i);
      if (xl && +xl[1] <= 16) { len = +xl[1] * 12; assumption = `"x${xl[1]}" read as ${xl[1]} ft (§9: no unit, L ≤ 16)`; }
    }
    return { kind: 'lumber', key: `${nom[1]}x${nom[2]}`, t, w, len, assumption };
  }
  if (isSheet) {
    const thick = tokens(n).find((tk) => /^\s*("|in\b|inch|thick)/i.test(n.slice(tk.end)) && tk.v <= 1.5);
    let size = null;
    const ft = n.match(/(\d+)\s*'\s*x\s*(\d+)\s*'/);
    const inch = n.match(/(\d+)\s*"?\s*x\s*(\d+)\s*"/);
    if (ft) size = [+ft[1] * 12, +ft[2] * 12];
    else if (inch && +inch[1] >= 12 && +inch[2] >= 12) size = [+inch[1], +inch[2]];
    else if (/quarter sheet/i.test(n)) size = [24, 48];
    else if (/half sheet/i.test(n)) size = [48, 48];
    else if (/full sheet|4\s*x\s*8\b/i.test(n)) size = [48, 96];
    if (!thick) return { unknown: 'sheet with no thickness in name', kind: 'sheet' };
    return { kind: 'sheet', key: `sheet-${thick.v}`, t: thick.v, size: size && size.sort((a, b) => a - b) };
  }
  // Explicit actual dimensions, e.g. "Poplar, 1/2" X 5 1/2" 48"".
  const dims = inchValues(n).map((x) => x.v);
  if (dims.length >= 2) {
    const s = [...dims.slice(0, 3)].sort((a, b) => a - b);
    return { kind: 'lumber', key: `${s[0]}x${s[1]}`, t: s[0], w: s[1], len: s[2] ?? null, assumption: null };
  }
  return { unknown: nom ? `nominal ${nom[0]} not in §9` : 'no size in name' };
}

// ── Main ─────────────────────────────────────────────────────────────────────────────────────
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const S = {
  plans: 0, results: {}, flagsPerCheck: {}, plansFlaggedPerCheck: {}, gateUnpublishPlanCause: 0,
  measure: {
    files: 0, published: 0, steps: 0, cutRows: 0, materials: 0, tools: 0, images: 0, stepsWithImage: 0,
    unattachedImages: 0, plansWithUnattached: 0, unattachedNonPrimary: 0, plansWithUnattachedNonPrimary: 0, plansStepTextFullPlans: 0, plansAnyFieldFullPlans: 0,
    stepsAsShownNoImage: 0, plansAsShownNoImage: 0, plansWithHttp: 0, imagesNonGenericAlt: 0,
    cutRowsWithMaterial: 0, materialQty1: 0, categories: {},
  },
};
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

const files = readdirSync(PLANS).filter((n) => n.endsWith('.json')).sort();
S.measure.files = files.length;
for (const f of files) {
  const plan = JSON.parse(readFileSync(join(PLANS, f), 'utf8'));
  if (plan.published === false) continue;
  S.plans++;
  const recPath = join(RECORDS, `${plan.slug}.json`);
  const rec = JSON.parse(readFileSync(recPath, 'utf8'));
  const M = S.measure;
  // A record a reader has scored is never re-swept (it would overwrite the reader's results).
  const keep = !!rec.reader && !process.argv.includes('--force');

  // §3 re-measure.
  M.published++; M.steps += plan.steps.length; M.cutRows += plan.cutList.length; M.materials += plan.materials.length;
  M.tools += plan.tools.length; M.images += plan.images.length; bump(M.categories, plan.category);
  M.stepsWithImage += plan.steps.filter((s) => s.image).length;
  const stepImgs = new Set(plan.steps.map((s) => s.image).filter(Boolean));
  const unattached = plan.images.filter((im) => !stepImgs.has(im.url));
  M.unattachedImages += unattached.length; if (unattached.length) M.plansWithUnattached++;
  const FULL = /full plans?|\bextras\b|\bpdf\b/i;
  if (plan.steps.some((s) => FULL.test(`${s.title} ${s.body}`))) M.plansStepTextFullPlans++;
  if (FULL.test(JSON.stringify(plan))) M.plansAnyFieldFullPlans++;
  const asShown = plan.steps.filter((s) => !s.image && /as shown|cutting diagram/i.test(s.body));
  M.stepsAsShownNoImage += asShown.length; if (asShown.length) M.plansAsShownNoImage++;
  if (/http/i.test(JSON.stringify({ ...plan, images: [], steps: plan.steps.map((s) => [s.title, s.body]) }))) M.plansWithHttp++;
  M.unattachedNonPrimary += unattached.filter((im) => !im.isPrimary).length;
  if (unattached.some((im) => !im.isPrimary)) M.plansWithUnattachedNonPrimary++;
  M.imagesNonGenericAlt += plan.images.filter((im) => im.alt !== plan.title && !/ — step photo \d+$/.test(im.alt)).length;
  M.cutRowsWithMaterial += plan.cutList.filter((c) => c.material).length;
  M.materialQty1 += plan.materials.filter((m) => m.quantity === 1).length;

  // Corrected cut rows (Kreg's numbers).
  const diffs = rec.importDiffs || [];
  const rows = plan.cutList.map((c, i) => {
    const d = diffs.find((x) => x.path.startsWith(`cutList[${i}].`) && x.correctRow);
    const unchecked = diffs.some((x) => x.path === `cutList[${i}]` && (x.kind === 'unchecked' || x.kind === 'importer-unparsed'));
    const [t, w, l] = d ? d.correctRow : [c.thicknessIn, c.widthIn, c.lengthIn];
    return { i, part: c.part, qty: c.quantity, t, w, l, corrected: !!d, unchecked };
  });
  const rowQuote = (r) => `${r.part} — qty ${r.qty}, ${r.t} x ${r.w} x ${r.l}${r.corrected ? ' (Kreg-corrected)' : ''}`;
  const defaulted = new Set(diffs.filter((x) => x.kind === 'qty-unreadable-defaulted').map((x) => x.path.replace('.quantity', '')));

  const checks = {};
  const flag = (id, item) => {
    if ((checks[id].flagged ||= []).length < MAX_FLAGS) checks[id].flagged.push(item);
    else checks[id].flagsOmitted = (checks[id].flagsOmitted || 0) + 1;
  };
  const fields = [
    ['summary', plan.summary], ['description', plan.description],
    ...plan.steps.flatMap((s, i) => [[`steps[${i}].title`, s.title], [`steps[${i}].body`, s.body]]),
    ...plan.materials.flatMap((m, i) => [[`materials[${i}].name`, m.name], ...(m.note ? [[`materials[${i}].note`, m.note]] : [])]),
    ...plan.cutList.flatMap((c, i) => [[`cutList[${i}].part`, c.part], ...(c.note ? [[`cutList[${i}].note`, c.note]] : [])]),
  ];
  const stepText = plan.steps.map((s) => `${s.title}\n${s.body}`).join('\n').toLowerCase();

  // ── R1: depends on content we don't have ──
  checks.R1 = { result: 'pass', search: 'all fields vs /full plans?|extras?|pdf|download|printable|template|pattern|http|purchase|buy .*plan|my (blog|website|site|shop)|attached/i' };
  // "Extras" is Kreg's downloads section — case-sensitive so "extra glue" does not match.
  const R1RE = [/\bExtras\b/g, /full plans?|\bpdf\b|download|printable|https?:\/\/|purchase (the |my )?plans?|buy (the |my )?plans?|(my|our) (blog|website|web site|site)\b|\b(have|see|the|my) attached\b|\battached (plans?|diagrams?|drawings?|files?|pdfs?|templates?|patterns?|sheets?|cut ?lists?)\b|\b(print(ed)?|free|full[- ]size) (the )?(templates?|patterns?)\b|\b(templates?|patterns?) (is |are )?(available|included|attached|linked|below|here)\b/gi];
  for (const [path, text] of fields) for (const re of R1RE) for (const m of String(text).matchAll(re)) flag('R1', { path, quote: quote(text, m.index), why: `matches "${m[0]}"` });
  if (checks.R1.flagged) checks.R1.result = 'flagged';

  // ── R2: parts used in steps exist in the cut list ──
  checks.R2 = { result: 'to-read' };
  const letters = new Map();
  for (const r of rows) { const m = r.part.match(/^\(?([A-Z]{1,2})[.)\-:\s]/); if (m) letters.set(m[1], r.i); }
  if (letters.size >= 3) {
    plan.steps.forEach((s, si) => {
      for (const m of s.body.matchAll(/\(([A-Z]{1,2})\)|\b[Pp]arts? ([A-Z]{1,2})\b/g)) {
        const L = m[1] || m[2];
        if (!letters.has(L)) flag('R2', { path: `steps[${si}].body`, quote: quote(s.body, m.index), why: `references part ${L}; cut-list labels are ${[...letters.keys()].join(',')}` });
      }
    });
  }
  // Dimensions stated in cut/rip sentences that match nothing in the (corrected) cut list or materials.
  const traceable = [];
  for (const r of rows) traceable.push(r.t, r.w, r.l);
  for (const m of plan.materials) { for (const t of tokens(normalize(m.name))) traceable.push(t.v, t.v * 12); const s = parseStock(m); if (s.t) traceable.push(s.t, s.w ?? s.t); }
  for (const t of tokens(normalize(`${plan.description} ${plan.summary}`))) traceable.push(t.v);
  plan.steps.forEach((s, si) => {
    const body = normalize(s.body);
    for (const { s: sent, at } of sentences(body)) {
      if (!/\b(cut|rip|crosscut|trim|miter|mitre)\w*/i.test(sent)) continue;
      for (const v of inchValues(sent)) {
        if (/^\s*("|in\b|inch)\s*(pocket|screw|nail|brad|bolt|bit|drill|hole|forstner|dowel|staple|kreg|x\s*\d)/i.test(v.after)) continue;
        if (/\b(screw|nail|brad|bolt|bit|drill|hole|dowel|staple|kerf|blade|radius|overhang|from|apart|reveal|deep|depth|spacing|space)\b/i.test(sent.slice(Math.max(0, v.index - 25), v.end + 25))) continue;
        if (/^\s*("|in\b|inch)\s*(degree|deg\b|°|angle|bevel)/i.test(v.after) || /\b(saw|blade|miter|mitre|bevel) (set )?(at|to)\s*$/i.test(sent.slice(Math.max(0, v.index - 20), v.index))) continue; // an angle written with "
        if (!traceable.some((x) => near(x, v.v))) flag('R2', { path: `steps[${si}].body`, quote: quote(s.body, at + v.index), why: `cut sentence states ${v.text}" — no cut-list dimension or material size matches (corrected values)` });
      }
    }
  });
  if (checks.R2.flagged) checks.R2.result = 'flagged';

  // ── R3: every cut row is a real part the steps use ──
  checks.R3 = { result: 'to-read' };
  const STOP = new Set(['left', 'right', 'top', 'bottom', 'front', 'back', 'side', 'sides', 'long', 'short', 'small', 'large', 'inner', 'outer', 'upper', 'lower', 'middle', 'center', 'end', 'ends', 'piece', 'pieces', 'part', 'parts', 'and', 'the', 'for', 'with', 'cut', 'board', 'boards']);
  for (const r of rows) {
    const c = plan.cutList[r.i];
    if (/\bsee\b|full plans?|\bextras\b|\bkit\b|\btbd\b|\bn\/a\b|^parts?$|^drawers?$|^cabinet$|assembl/i.test(c.part)) flag('R3', { path: `cutList[${r.i}].part`, quote: c.part, why: 'looks like a placeholder or an assembly, not a part' });
    const label = c.part.match(/^\(?([A-Z]{1,2})[.)\-:\s]/) || c.part.match(/\(([A-Z]{1,2})\)\s*$/) || c.part.match(/^part ([A-Z]{1,2})\b/i);
    const words = c.part.toLowerCase().replace(/^\(?[a-z]{1,2}[.)\-:\s]+/, '').replace(/\([a-z]{1,2}\)\s*$/, '').match(/[a-z]{3,}/g) || [];
    const content = words.filter((w) => !STOP.has(w));
    // A part named only by position words ("Top", "Sides") is searched by those words.
    const keys = (content.length ? content : words.filter((w) => !['and', 'the', 'for', 'with', 'part', 'parts'].includes(w))).map((w) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, ''));
    const byName = keys.some((k) => stepText.includes(k));
    const byLabel = label && new RegExp(`\\(${label[1]}\\)|\\bparts? ${label[1]}\\b`).test(plan.steps.map((s) => s.body).join('\n'));
    if (!byName && !byLabel) flag('R3', { path: `cutList[${r.i}].part`, quote: c.part, why: `no step mentions it (searched steps for ${keys.length ? keys.join('/') : 'its words'}${label ? ` and label ${label[1]}` : ''})` });
  }
  if (checks.R3.flagged) checks.R3.result = 'flagged';

  // ── R4 / R5: parts vs materials (corrected dimensions) ──
  const stock = plan.materials.map((m, i) => ({ i, m, s: m.unit === 'board' ? parseStock(m) : null })).filter((x) => x.s);
  const known = stock.filter((x) => !x.s.unknown);
  const unknownStock = stock.filter((x) => x.s.unknown);
  checks.R4 = { result: 'pass', basis: 'Kreg-corrected cut rows vs board materials (§9)' };
  const r4fails = []; const r4unknown = [];
  if (!rows.length) checks.R4 = { result: 'n/a', reason: 'no cut list' };
  for (const r of rows) {
    if (r.unchecked) { r4unknown.push(`cutList[${r.i}] Kreg text not parseable`); continue; }
    const ok = known.some(({ s }) => (s.kind === 'lumber' ? near(r.t, s.t) && r.w <= s.w + TOL : near(r.t, s.t) && r.w <= 48 + TOL && r.l <= 96 + TOL));
    if (ok) continue;
    // Kreg wrote the nominal size as the dimensions ("2" x 4" x 48""): compare by §9 nominal key.
    if (known.some(({ s }) => s.kind === 'lumber' && s.key === `${r.t}x${r.w}`)) { (checks.R4.nominalRows ||= []).push(`cutList[${r.i}]`); continue; }
    if (unknownStock.length) { r4unknown.push(`cutList[${r.i}] no match among parsed stock; unparsed stock present (${unknownStock.map((x) => `materials[${x.i}]`).join(', ')})`); continue; }
    if (!known.length) { r4unknown.push(`cutList[${r.i}] no board materials listed`); continue; }
    if (known.some(({ s }) => s.t > r.t + TOL)) { r4unknown.push(`cutList[${r.i}] thinner than stock — would need planing/resawing, not judged`); continue; }
    r4fails.push(r);
  }
  if (r4fails.length) {
    checks.R4 = {
      result: 'fail', level: 'Fix', confidence: 'likely', cause: 'plan', basis: checks.R4.basis,
      evidence: [...r4fails.slice(0, 6).map((r) => ({ path: `cutList[${r.i}]`, quote: rowQuote(r) })), ...known.slice(0, 6).map(({ i, m }) => ({ path: `materials[${i}].name`, quote: m.name }))],
      arithmetic: r4fails.slice(0, 6).map((r) => `cutList[${r.i}] ${r.t}×${r.w}: no listed stock has thickness ${r.t} (±1/32) with width ≥ ${r.w}; stock = ${known.map(({ s }) => (s.kind === 'sheet' ? `sheet ${s.t}` : `${s.t}×${s.w}`)).join(', ')}`).join('; '),
      note: 'likely: a glue-up or lamination the steps describe would resolve it — reader confirms',
    };
    for (const r of r4fails) flag('R4', { path: `cutList[${r.i}]`, quote: rowQuote(r), why: 'no listed material gives this thickness and width' });
  } else if (r4unknown.length && checks.R4.result === 'pass') checks.R4 = { result: 'unknown', reason: r4unknown.slice(0, 4).join('; ') + (r4unknown.length > 4 ? `; +${r4unknown.length - 4} more` : '') };

  // R5.
  const types = new Set(known.map(({ s }) => s.key));
  if (!rows.length) checks.R5 = { result: 'n/a', reason: 'no cut list' };
  else if (unknownStock.length) checks.R5 = { result: 'unknown', reason: `R5 precondition not met: unparseable stock ${unknownStock.map((x) => `materials[${x.i}]`).join(', ')}` };
  else if (types.size !== 1) checks.R5 = { result: 'unknown', reason: `R5 precondition not met: ${types.size} stock types (${[...types].join(', ')}); steps not checked for per-part stock` };
  else if (rows.some((r) => r.unchecked)) checks.R5 = { result: 'unknown', reason: 'a cut row\'s Kreg text is not parseable' };
  else if (known.some(({ i }) => defaulted.has(`materials[${i}]`))) checks.R5 = { result: 'unknown', reason: 'material quantity defaulted to 1 by the importer (source "--")' };
  else {
    const s0 = known[0].s;
    const across = (r) => (r.l <= s0.w + TOL ? r.l : r.w);
    const evid = known.map(({ i, m }) => ({ path: `materials[${i}]`, quote: `${m.name} — qty ${m.quantity}` }));
    const partsEvid = { path: `cutList[0..${rows.length - 1}]`, quote: rows.map(rowQuote).join('; ').slice(0, 200) };
    if (s0.kind === 'lumber') {
      const foreign = rows.filter((r) => !near(r.t, s0.t) && !(s0.key === `${r.t}x${r.w}`));
      if (known.some(({ s }) => s.len == null)) checks.R5 = { result: 'unknown', reason: 'stock length not written (§9)' };
      else if (foreign.length) checks.R5 = { result: 'unknown', reason: `R5 precondition not met: ${foreign.map((r) => `cutList[${r.i}]`).join(', ')} not ${s0.t}″ thick, so not all parts come from the one listed stock` };
      else if (rows.some((r) => across(r) <= (s0.w - KERF) / 2 + TOL)) checks.R5 = { result: 'unknown', reason: `parts ≤ half the ${s0.w}″ stock width can be ripped side by side; length-only total does not apply (rubric note 1)` };
      else {
        // The importer sorted T≤W≤L (:36), so a part shorter than the board is wide may run
        // across it: then the length it uses along the board is its width.
        const along = (r) => (r.l <= s0.w + TOL ? r.w : r.l);
        const nParts = rows.reduce((a, r) => a + r.qty, 0);
        const nBoards = known.reduce((a, { m }) => a + m.quantity, 0);
        const cuts = Math.max(0, nParts - nBoards); // fewest cuts possible: each board's last part can use its end
        const need = rows.reduce((a, r) => a + r.qty * along(r), 0) + KERF * cuts;
        const have = known.reduce((a, { m, s }) => a + m.quantity * s.len, 0);
        const maxLen = Math.max(...known.map(({ s }) => s.len));
        const tooLong = rows.filter((r) => along(r) > maxLen + TOL);
        const arith = `parts: ${rows.map((r) => `${r.qty}×${along(r)}`).join(' + ')} + kerf ${cuts} cuts (${nParts} parts − ${nBoards} boards, the fewest possible)×1/8 = ${need.toFixed(3)}″; bought: ${known.map(({ m, s }) => `${m.quantity}×${s.len}`).join(' + ')} = ${have}″${known.some(({ s }) => s.assumption) ? `; assumption: ${known.find(({ s }) => s.assumption).s.assumption}` : ''}`;
        if (tooLong.length) checks.R5 = { result: 'fail', level: 'Fix', confidence: 'certain', cause: 'plan', evidence: [...evid, ...tooLong.map((r) => ({ path: `cutList[${r.i}]`, quote: rowQuote(r) }))], arithmetic: `${tooLong.map((r) => `cutList[${r.i}] length ${along(r)}″`).join(', ')} > longest stock ${maxLen}″` };
        else if (need > have + TOL) checks.R5 = { result: 'fail', level: 'Fix', confidence: 'certain', cause: 'plan', evidence: [...evid, partsEvid], arithmetic: `${arith}; ${need.toFixed(3)} > ${have}` };
        else checks.R5 = { result: 'pass', arithmetic: `${arith}; ${need.toFixed(3)} ≤ ${have}` };
      }
    } else {
      const sized = known.every(({ s }) => s.size);
      const need = rows.reduce((a, r) => a + r.qty * r.w * r.l, 0);
      if (!sized) checks.R5 = { result: 'unknown', reason: 'sheet size not written in material name' };
      else {
        const have = known.reduce((a, { m, s }) => a + m.quantity * s.size[0] * s.size[1], 0);
        const arith = `part area ${rows.map((r) => `${r.qty}×${r.w}×${r.l}`).join(' + ')} = ${need.toFixed(1)} sq in; bought ${known.map(({ m, s }) => `${m.quantity}×${s.size[0]}×${s.size[1]}`).join(' + ')} = ${have} sq in`;
        checks.R5 = need > have ? { result: 'fail', level: 'Fix', confidence: 'certain', cause: 'plan', evidence: [...evid, partsEvid], arithmetic: `${arith}; ${need.toFixed(1)} > ${have}` } : { result: 'unknown', reason: `sheet layout not judged (area fits: ${arith})` };
      }
    }
  }

  // ── R6: fastener sizes in steps appear in materials ──
  checks.R6 = { result: 'to-read' };
  const matNorm = plan.materials.map((m) => normalize(`${m.name} ${m.note || ''}`));
  plan.steps.forEach((s, si) => {
    const body = normalize(s.body);
    for (const m of body.matchAll(/\b(screws?|nails?|brads?|bolts?|staples?|lag)\b/gi)) {
      const before = body.slice(Math.max(0, m.index - 45), m.index);
      const sizes = inchValues(before);
      if (!sizes.length) continue;
      const v = sizes[sizes.length - 1];
      if (/\b(from|apart|deep|long holes?|thick)\b/i.test(before.slice(v.end))) continue;
      const kind = m[1].toLowerCase().replace(/s$/, '');
      const inMats = matNorm.some((n) => inchValues(n).some((t) => near(t.v, v.v)) && /screw|nail|brad|bolt|staple|lag|fastener/i.test(n));
      if (!inMats) flag('R6', { path: `steps[${si}].body`, quote: quote(s.body, m.index), why: `${v.text}" ${kind} — no material line lists a ${v.text}" fastener` });
    }
  });
  if (checks.R6.flagged) checks.R6.result = 'flagged';

  // ── R10: a measured position the step implies but does not give ──
  checks.R10 = { result: 'pass', search: 'step sentences with a placement trigger and no inch measurement' };
  const PLACE = /\b(measure (up|down|in|over|from|and mark)|mark (the )?(location|position|placement|height|center|centre)|from the (top|bottom|edge|end|front|back|floor|ground|wall)|(up|down|in|over|back) from the|spaced|apart|inset|set back|overhang|reveal|at a height|height of)\b/i;
  const RELATIONAL = /\b(center|centre|centered|centred|middle|flush|even(ly)?|equal(ly)?|as desired|desired|preferred|to taste|against|your (choice|preference))\b/i;
  plan.steps.forEach((s, si) => {
    const body = normalize(s.body);
    for (const { s: sent, at } of sentences(body)) {
      if (!PLACE.test(sent) || inchValues(sent).length || RELATIONAL.test(sent)) continue;
      flag('R10', { path: `steps[${si}].body`, quote: quote(s.body, at), why: `placement with no measurement${s.image ? ' (step has an image — view to settle)' : ' (no step image)'}`, image: s.image || null });
    }
  });
  if (checks.R10.flagged) checks.R10.result = 'flagged';

  // ── R11: "as shown" / "see diagram" has an image ──
  checks.R11 = { result: 'pass', search: 'steps vs /as shown|shown (in|below|above|on|here)|see (the )?(diagram|drawing|…)|diagram|drawing|pictured|attached/i' };
  const SHOWN = /\bas shown\b|\bshown (in|below|above|on|here)\b|\bsee (the )?(diagram|drawing|illustration|image|picture|photo|figure|sketch|plans?)s?\b|\bdiagrams?\b|\bdrawings?\b|\bpictured\b|\b(photo|image|picture)s? (below|above)\b|\battached\b/gi;
  let r11pass = 0;
  plan.steps.forEach((s, si) => {
    for (const m of s.body.matchAll(SHOWN)) {
      if (s.image) { r11pass++; continue; }
      flag('R11', { path: `steps[${si}].body`, quote: quote(s.body, m.index), why: `"${m[0]}" with no step image; ${unattached.length} unattached image(s) in images[] to view`, unattachedImages: unattached.length });
    }
  });
  if (checks.R11.flagged) checks.R11.result = 'flagged';
  else if (r11pass) checks.R11.note = `${r11pass} reference(s), each in a step with its own image`;

  if (keep) { S.keptRead = (S.keptRead || 0) + 1; continue; }

  // Record + ledger.
  rec.rubric = 'R-1';
  rec.measurementsScoredOn = 'kreg-corrected';
  rec.checks = { ...rec.checks, ...checks };
  writeFileSync(recPath, JSON.stringify(rec, null, 2) + '\n');
  const entry = ledger.find((x) => x.slug === plan.slug);
  entry.stage = 'swept';
  entry.tags = [
    ...Object.entries(checks).filter(([, c]) => c.result === 'flagged' || c.result === 'fail').map(([id, c]) => `${id}:${c.result}`),
    ...(rec.importAffected ? ['import'] : []),
  ];
  entry.flagCount = Object.values(checks).reduce((a, c) => a + (c.flagged?.length || 0) + (c.flagsOmitted || 0), 0);

  for (const [id, c] of Object.entries(checks)) {
    bump((S.results[id] ||= {}), c.result);
    if (c.flagged) { bump(S.flagsPerCheck, id, c.flagged.length + (c.flagsOmitted || 0)); bump(S.plansFlaggedPerCheck, id); }
  }
  if (Object.values(checks).some((c) => c.result === 'fail' && c.cause === 'plan' && c.level === 'Unpublish')) S.gateUnpublishPlanCause++;
}

writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
const m = S.measure;
S.measure.avg = { steps: +(m.steps / m.published).toFixed(1), cutRows: +(m.cutRows / m.published).toFixed(1), materials: +(m.materials / m.published).toFixed(1), tools: +(m.tools / m.published).toFixed(1), images: +(m.images / m.published).toFixed(1) };
// The Stage 3 summary describes a sweep of all 610; a partial re-run (read records kept) only prints.
if (!S.keptRead) writeFileSync('audit/plan-quality/sweep-summary.json', JSON.stringify(S, null, 2) + '\n');
console.log(JSON.stringify(S, null, 1));
