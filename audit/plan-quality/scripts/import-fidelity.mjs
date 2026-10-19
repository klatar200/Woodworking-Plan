// import-fidelity.mjs — Stage 2: compare every published plan with the Kreg source it came from.
//
// Read-only against content/. For each published slug it:
//   1. re-runs the importer's own parsing (copied verbatim from scripts/import-kreg-plans.mjs,
//      line numbers cited) on the source entry and checks it reproduces the current file — so we
//      know the file is still the import output and every diff below is the importer's doing;
//   2. parses the same source text with a careful parser (mixed fractions, unicode fractions,
//      feet) and classifies every disagreement by importer defect;
//   3. writes `importDiffs` + `importAffected` into audit/plan-quality/plans/<slug>.json and a
//      machine summary to audit/plan-quality/import-fidelity.json.
//
//   node audit/plan-quality/scripts/import-fidelity.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadKregSource, SOURCE_REV } from './kreg-source.mjs';
import { NOMINAL_LUMBER } from '../../../scripts/kreg-mapping.config.mjs';

const PLANS = 'content/plans';
const RECORDS = 'audit/plan-quality/plans';
const EPS = 1e-6;
const GROSS = new Set(['numerator-kept', 'denominator-as-length', 'nominal-size-taken-as-actual', 'feet-inches-misread', 'feet-read-as-inches', 'stray-number-as-length']);

// ── The importer's parsing, verbatim (scripts/import-kreg-plans.mjs) ─────────────────────────
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; // :16
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'plan'; // :17

function impParseNum(s) { // :19-26
  s = String(s).replace(/["']/g, '').replace(/in(ches)?\.?/i, '').trim();
  let m;
  if ((m = s.match(/^(\d+)-(\d+)\/(\d+)$/))) return +m[1] + +m[2] / +m[3];
  if ((m = s.match(/^(\d+)\/(\d+)$/))) return +m[1] / +m[2];
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function impParseCutDetail(detail) { // :29-50 — returns dims plus which branch produced them
  if (!detail) return null;
  const d = String(detail).trim();
  const parts = d.split(/\s*[x×]\s*/i).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 3) {
    const nums = parts.map(impParseNum);
    if (nums.every((n) => Number.isFinite(n) && n > 0)) {
      const s = [...nums].sort((a, b) => a - b);
      return { branch: 'three-part', thicknessIn: s[0], widthIn: s[1], lengthIn: s[2], parts: nums };
    }
  }
  const nom = d.match(/\b([12468])\s*x\s*(\d+)\b/i);
  if (nom) {
    const tw = NOMINAL_LUMBER[`${nom[1]}x${nom[2]}`.toLowerCase()];
    if (tw) {
      const rest = d.replace(nom[0], ' ');
      const lm = rest.match(/(\d+(?:-\d+\/\d+)?(?:\.\d+)?)\s*(?:"|in\b|inch|foot|ft|')/i) || rest.match(/\b(\d{2,}(?:-\d+\/\d+)?)\b/);
      if (lm) { const L = impParseNum(lm[1]); if (Number.isFinite(L) && L > 0) return { branch: 'nominal', thicknessIn: tw[0], widthIn: tw[1], lengthIn: L }; }
    }
  }
  return null;
}

// ── A careful parser for the same text ───────────────────────────────────────────────────────
const UNI = { '½': '1/2', '¼': '1/4', '¾': '3/4', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8', '⅓': '1/3', '⅔': '2/3', '⅙': '1/6', '⅚': '5/6', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5' };
function normalize(s) {
  let t = String(s ?? '');
  for (const [k, v] of Object.entries(UNI)) t = t.split(k).join(` ${v}`);
  return t.replace(/⁄/g, '/').replace(/[”“″]/g, '"').replace(/[’‘′]/g, "'").replace(/×/g, 'x').replace(/\s+/g, ' ').trim();
}
// mixed number | simple fraction | decimal/integer — in that priority.
const MEAS = /(\d+)[ -]+(\d+)\/(\d+)|(\d+)\/(\d+)|(\d*\.\d+|\d+)/g;
function tokens(s) {
  const out = [];
  for (const m of s.matchAll(MEAS)) {
    let v;
    if (m[1] !== undefined) v = +m[1] + +m[2] / +m[3];
    else if (m[4] !== undefined) v = +m[4] / +m[5];
    else v = +m[6];
    out.push({ v, text: m[0], index: m.index, end: m.index + m[0].length });
  }
  return out;
}

/** Correct dims for a source detail, or { ambiguous: reason }. */
function goodParseCutDetail(detail) {
  const d = normalize(detail);
  if (!d) return { ambiguous: 'empty detail' };
  const parts = d.split(/\s*x\s*/i).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 3) {
    const vals = [];
    for (const p of parts) {
      // Feet-and-inches, e.g. 1'-1 5/16".
      const fi = p.match(/^(\d+)'\s*-?\s*((?:\d+ )?\d+\/\d+|\d+(?:\.\d+)?)"?/);
      if (fi) { vals.push(+fi[1] * 12 + tokens(fi[2])[0].v); continue; }
      const t = tokens(p);
      // A part must START with its measurement; trailing notes ("with 30 degree cuts",
      // "oak", "(45 deg miter)") are allowed after a unit mark or a space.
      if (!t.length || t[0].index !== 0) return { ambiguous: `part "${p}" does not start with a number` };
      const tail = p.slice(t[0].end);
      if (t.length > 1 && !/^\s*("|''|in\b|\s)/i.test(tail)) return { ambiguous: `part "${p}" has ${t.length} numbers` };
      vals.push(t[0].v);
    }
    // "1x4x36" style: the first two are a nominal lumber size, not actual inches.
    const nomKey = `${parts[0]}x${parts[1]}`.replace(/\s/g, '').toLowerCase();
    const nominalLike = NOMINAL_LUMBER[nomKey] && !/["']|in\b/i.test(parts[0] + parts[1]);
    if (nominalLike) return { nominalAsActual: true, dims: [NOMINAL_LUMBER[nomKey][0], NOMINAL_LUMBER[nomKey][1], vals[2]], source: vals };
    return { dims: vals, sorted: [...vals].sort((a, b) => a - b) };
  }
  const nom = d.match(/\b(\d+)\s*x\s*(\d+)\b/i);
  if (!nom) return { ambiguous: `${parts.length} parts, no nominal size` };
  const tw = NOMINAL_LUMBER[`${nom[1]}x${nom[2]}`.toLowerCase()];
  if (!tw) return { ambiguous: `nominal ${nom[1]}x${nom[2]} not in table` };
  const rest = d.slice(0, nom.index) + ' '.repeat(nom[0].length) + d.slice(nom.index + nom[0].length);
  const cands = [];
  for (const t of tokens(rest)) {
    const after = rest.slice(t.end);
    const unit = after.match(/^\s*("|in\b|inch|inches|'|ft\b|foot|feet)/i);
    if (unit) cands.push({ v: /^\s*('|ft|foot|feet)/i.test(unit[0]) ? t.v * 12 : t.v, feet: /^\s*('|ft|foot|feet)/i.test(unit[0]), text: t.text });
  }
  if (cands.length === 1) return { dims: [tw[0], tw[1], cands[0].v], feet: cands[0].feet, lengthText: cands[0].text };
  if (cands.length > 1) return { ambiguous: `${cands.length} unit-marked lengths` };
  const bare = tokens(rest);
  if (bare.length === 1) return { dims: [tw[0], tw[1], bare[0].v], noUnit: true, lengthText: bare[0].text };
  return { ambiguous: `${bare.length} unmarked numbers` };
}

/** Correct quantity, or null if the text has no single number. */
function goodQty(raw) {
  const t = tokens(normalize(raw));
  return t.length === 1 ? t[0].v : null;
}

const fmt = (n) => (Number.isFinite(n) ? +n.toFixed(4) : n);
const hasFraction = (n) => Math.abs(n - Math.round(n)) > EPS;
/** Smallest denominator (≤ 64) that makes n a whole number — e.g. 0.75 → 4. */
const fracDen = (n) => { for (let d = 1; d <= 64; d++) if (Math.abs(n * d - Math.round(n * d)) < EPS) return d; return NaN; };

// ── Main ─────────────────────────────────────────────────────────────────────────────────────
const source = loadKregSource();
// Importer slug assignment, in source order (:79-83), so renamed/deduped slugs map back.
const bySlug = new Map();
{
  const seen = new Set();
  for (const e of source) {
    let slug = SLUG_RE.test(e.slug || '') ? e.slug : slugify(e.slug || e.title);
    while (seen.has(slug)) slug = slug.replace(/(-\d+)?$/, (m) => `-${(+((m || '').slice(1)) || 1) + 1}`);
    seen.add(slug);
    bySlug.set(slug, e);
  }
}

const summary = {
  sourceRev: SOURCE_REV, sourceEntries: source.length, published: 0, noSource: [],
  reproduction: { cutListExact: 0, cutListMismatch: [], materialsExact: 0, materialsMismatch: [], stepsExact: 0, stepsMismatch: [] },
  cutRows: 0, cutKinds: {}, plansByKind: {}, rowsReordered: 0, rowsReorderedPlans: 0,
  cutQtyKinds: {}, matKinds: {}, matLines: 0,
  emptyStepsDropped: 0,
  plansAffected: 0, plansGross: [], rowsAffected: 0, examples: {},
};
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const example = (kind, ex) => { (summary.examples[kind] ||= []).length < 6 && summary.examples[kind].push(ex); };

for (const f of readdirSync(PLANS).filter((n) => n.endsWith('.json')).sort()) {
  const plan = JSON.parse(readFileSync(join(PLANS, f), 'utf8'));
  if (plan.published === false) continue;
  summary.published++;
  const e = bySlug.get(plan.slug);
  const recPath = join(RECORDS, `${plan.slug}.json`);
  const rec = JSON.parse(readFileSync(recPath, 'utf8'));
  if (!e) { summary.noSource.push(plan.slug); rec.importDiffs = [{ kind: 'no-source-entry' }]; rec.importAffected = null; writeFileSync(recPath, JSON.stringify(rec, null, 2) + '\n'); continue; }

  const diffs = [];
  const planKinds = new Set();

  // 1. Reproduction check — cut list.
  const raw = e.cut_list || [];
  const imp = raw.map((r) => impParseCutDetail(r.detail));
  const reproCut = imp.length === plan.cutList.length && imp.every((d, i) => {
    const c = plan.cutList[i];
    return d && Math.abs(d.thicknessIn - c.thicknessIn) < EPS && Math.abs(d.widthIn - c.widthIn) < EPS && Math.abs(d.lengthIn - c.lengthIn) < EPS
      && c.quantity === Math.max(1, parseInt(raw[i].quantity, 10) || 1) && c.part === (String(raw[i].name || 'Part').trim() || 'Part');
  });
  if (reproCut) summary.reproduction.cutListExact++; else summary.reproduction.cutListMismatch.push(plan.slug);

  // 2. Cut rows: careful parse vs what the importer produced.
  raw.forEach((r, i) => {
    summary.cutRows++;
    const got = imp[i];
    const good = goodParseCutDetail(r.detail);
    const base = { path: `cutList[${i}]`, source: String(r.detail) };
    const kinds = [];
    if (!got) kinds.push('importer-unparsed');
    else if (good.ambiguous) kinds.push('unchecked');
    else {
      const names = ['thicknessIn', 'widthIn', 'lengthIn'];
      // Pairs of (imported value, correct value, field the importer stored it in).
      let pairs;
      if (got.branch === 'three-part' && !good.nominalAsActual && good.sorted) {
        // Compare part by part, before the importer's sort (:36), so a dropped fraction that
        // changes the sort order is still attributed to the right number.
        const order = got.parts.map((v, k) => [v, k]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
        pairs = got.parts.map((v, k) => [v, good.dims[k], names[order.indexOf(k)]]);
      } else {
        pairs = [got.thicknessIn, got.widthIn, got.lengthIn].map((v, k) => [v, good.dims[k], names[k]]);
      }
      if (good.nominalAsActual && got.branch === 'three-part') kinds.push('nominal-size-taken-as-actual');
      const correctRow = (good.nominalAsActual || got.branch === 'nominal' ? good.dims : good.sorted).map(fmt);
      pairs.forEach(([v, want, field], k) => {
        if (Math.abs(v - want) < EPS) return;
        let kind = 'other-mismatch';
        if (good.nominalAsActual) kind = 'nominal-size-taken-as-actual';
        else if (hasFraction(want) && want > 1 && Math.abs(v - Math.trunc(want)) < EPS) kind = 'fraction-dropped';
        else if (want < 1 && Number.isInteger(v) && Math.abs(want * fracDen(want) - v) < EPS) kind = 'numerator-kept';
        else if (got.branch === 'nominal' && good.feet && Math.abs(v * 12 - want) < EPS) kind = 'feet-read-as-inches';
        else if (got.branch === 'nominal' && k === 2 && /\/\s*(\d+)/.test(good.lengthText || '') && Math.abs(v - +good.lengthText.match(/\/\s*(\d+)/)[1]) < EPS) kind = 'denominator-as-length';
        else if (/\d\s*'/.test(normalize(r.detail))) kind = 'feet-inches-misread';
        else if (got.branch === 'nominal') kind = 'stray-number-as-length';
        if (!kinds.includes(kind)) kinds.push(kind);
        diffs.push({ ...base, path: `cutList[${i}].${field}`, kind, imported: fmt(v), correct: fmt(want), correctRow });
      });
      if (got.branch === 'three-part' && !good.nominalAsActual && good.dims.some((v, k) => Math.abs(v - good.sorted[k]) > EPS)) {
        summary.rowsReordered++;
        planKinds.add('reordered');
      }
    }
    if (kinds.includes('importer-unparsed') || kinds.includes('unchecked')) diffs.push({ ...base, kind: kinds[0], reason: good.ambiguous || 'importer returned null' });
    if (!kinds.length) kinds.push('match');
    else if (!kinds.includes('unchecked')) summary.rowsAffected++;
    for (const k of kinds) { bump(summary.cutKinds, k); if (k !== 'match') { planKinds.add(k); example(k, { slug: plan.slug, ...base, imported: got && [got.thicknessIn, got.widthIn, got.lengthIn].map(fmt), correct: good.dims?.map(fmt), reason: good.ambiguous }); } }
    // Row quantity (:140).
    const q = goodQty(r.quantity);
    const impQ = Math.max(1, parseInt(r.quantity, 10) || 1);
    let qk = 'match';
    if (q === null) qk = String(r.quantity ?? '').trim() ? 'qty-unreadable-defaulted' : 'qty-empty-defaulted';
    else if (Math.abs(q - impQ) > EPS) qk = 'qty-lossy';
    bump(summary.cutQtyKinds, qk);
    if (qk !== 'match') { diffs.push({ path: `cutList[${i}].quantity`, kind: qk, source: String(r.quantity ?? ''), imported: impQ, correct: q === null ? 'unknown' : fmt(q) }); planKinds.add(qk); }
  });

  // 3. Materials (:108-110): wood_products then hardware.
  const srcMats = [...(e.wood_products || []), ...(e.hardware || [])];
  const reproMat = srcMats.length === plan.materials.length && srcMats.every((m, i) => plan.materials[i].quantity === (impParseNum(m.quantity) > 0 ? impParseNum(m.quantity) : 1));
  if (reproMat) summary.reproduction.materialsExact++; else summary.reproduction.materialsMismatch.push(plan.slug);
  srcMats.forEach((m, i) => {
    summary.matLines++;
    const impQ = impParseNum(m.quantity) > 0 ? impParseNum(m.quantity) : 1;
    const q = goodQty(m.quantity);
    const rawQ = String(m.quantity ?? '').trim();
    let k = 'match';
    if (!(impParseNum(m.quantity) > 0)) k = rawQ ? 'qty-unreadable-defaulted' : 'qty-empty-defaulted';
    else if (q === null) k = 'qty-ambiguous';
    else if (Math.abs(q - impQ) > EPS) k = 'qty-lossy';
    bump(summary.matKinds, k);
    if (k !== 'match') {
      planKinds.add(`mat-${k}`);
      diffs.push({ path: `materials[${i}].quantity`, kind: k, source: rawQ, imported: impQ, correct: q === null ? 'unknown' : fmt(q) });
      example(`mat-${k}`, { slug: plan.slug, path: `materials[${i}]`, name: m.name, source: rawQ, imported: impQ });
    }
  });

  // 4. Steps (:85, :94). Tools are out of scope (§1) and not compared.
  const kept = (e.steps || []).filter((s) => s.body || s.title).length;
  summary.emptyStepsDropped += (e.steps || []).length - kept;
  if (kept === plan.steps.length) summary.reproduction.stepsExact++; else summary.reproduction.stepsMismatch.push(plan.slug);

  for (const k of planKinds) bump(summary.plansByKind, k);
  const measurementKinds = [...planKinds].filter((k) => k !== 'reordered');
  rec.importDiffs = diffs;
  rec.importAffected = measurementKinds.length > 0;
  if (rec.importAffected) summary.plansAffected++;
  // "Gross" = the imported number is not the source number with its fraction trimmed off; it
  // is a different number (3/4 → 3, 36 1/8 → 8, 1x4 → 1 × 4, 2' 8" → 2).
  if ([...planKinds].some((k) => GROSS.has(k))) summary.plansGross.push(plan.slug);
  if (planKinds.has('reordered')) summary.rowsReorderedPlans++;
  writeFileSync(recPath, JSON.stringify(rec, null, 2) + '\n');
}

writeFileSync('audit/plan-quality/import-fidelity.json', JSON.stringify(summary, null, 2) + '\n');
const { examples, ...brief } = summary;
void examples;
console.log(JSON.stringify({ ...brief, reproduction: { ...brief.reproduction, cutListMismatch: brief.reproduction.cutListMismatch.length, materialsMismatch: brief.reproduction.materialsMismatch.length, stepsMismatch: brief.reproduction.stepsMismatch.length } }, null, 1));
