/**
 * import-kreg-plans.mjs — DRAFT transform: kreg-plans.json → Notch plan files.
 *
 * DRY-RUN ONLY as wired here: reads the staged Kreg dump, writes candidate
 * plan files to content/plans-import/, and prints a feasibility report. It does
 * NOT touch content/plans/. Nothing is applied until a human reviews the report.
 *
 *   node scripts/import-kreg-plans.mjs <kreg-json> <out-dir>
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import * as M from './kreg-mapping.config.mjs';

const [, , KREG = 'kreg-plans.json', OUT = 'content/plans-import'] = process.argv;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'plan';

function parseNum(s) {
  s = String(s).replace(/["']/g, '').replace(/in(ches)?\.?/i, '').trim();
  let m;
  if ((m = s.match(/^(\d+)-(\d+)\/(\d+)$/))) return +m[1] + +m[2] / +m[3];
  if ((m = s.match(/^(\d+)\/(\d+)$/))) return +m[1] / +m[2];
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Return {thicknessIn,widthIn,lengthIn} or null. */
function parseCutDetail(detail) {
  if (!detail) return null;
  const d = String(detail).trim();
  const parts = d.split(/\s*[x×]\s*/i).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 3) {
    const nums = parts.map(parseNum);
    if (nums.every((n) => Number.isFinite(n) && n > 0)) {
      const s = [...nums].sort((a, b) => a - b);
      return { thicknessIn: s[0], widthIn: s[1], lengthIn: s[2] };
    }
  }
  const nom = d.match(/\b([12468])\s*x\s*(\d+)\b/i);
  if (nom) {
    const tw = M.NOMINAL_LUMBER[`${nom[1]}x${nom[2]}`.toLowerCase()];
    if (tw) {
      const rest = d.replace(nom[0], ' ');
      const lm = rest.match(/(\d+(?:-\d+\/\d+)?(?:\.\d+)?)\s*(?:"|in\b|inch|foot|ft|')/i) || rest.match(/\b(\d{2,}(?:-\d+\/\d+)?)\b/);
      if (lm) { const L = parseNum(lm[1]); if (Number.isFinite(L) && L > 0) return { thicknessIn: tw[0], widthIn: tw[1], lengthIn: L }; }
    }
  }
  return null;
}

function mapCategory(cats, title) {
  for (const c of cats || []) if (M.CATEGORY_MAP[c]) return M.CATEGORY_MAP[c];
  const hay = `${(cats || []).join(' ')} ${title}`;
  for (const [re, slug] of M.CATEGORY_KEYWORDS) if (re.test(hay)) return slug;
  return M.CATEGORY_DEFAULT;
}

function mapTool(name) {
  const n = String(name).toLowerCase().replace(/\s+/g, ' ').trim();
  if (M.TOOL_EXACT[n]) return M.TOOL_EXACT[n];
  for (const [re, slug] of M.TOOL_KEYWORDS) if (re.test(name)) return slug;
  return null;
}

function toHours(min, max) {
  const fmt = (m) => (m % 60 === 0 ? `${m / 60}` : (m / 60).toFixed(1).replace(/\.0$/, ''));
  if (max < 60) return `${min}–${max} min`;
  return `${fmt(min)}–${fmt(max)} hours`;
}

const kreg = JSON.parse(readFileSync(KREG, 'utf8'));
try { rmSync(OUT, { recursive: true, force: true }); } catch {}
mkdirSync(OUT, { recursive: true });

const report = {
  total: kreg.length, written: 0, failed: 0,
  cut: { complete: 0, partial: 0, empty: 0 },
  gaps: { zeroTools: 0, zeroMaterials: 0, badSlug: 0, timeAssumed: 0, costAssumed: 0 },
  unmappedTools: {}, failReasons: {}, categoryDist: {}, costTierDist: {}, samples: [],
};
const seen = new Set();

for (const e of kreg) {
  const problems = [];
  // slug
  let slug = SLUG_RE.test(e.slug || '') ? e.slug : slugify(e.slug || e.title);
  if (!SLUG_RE.test(e.slug || '')) report.gaps.badSlug++;
  while (seen.has(slug)) slug = slug.replace(/(-\d+)?$/, (m) => `-${(+((m || '').slice(1)) || 1) + 1}`);
  seen.add(slug);

  // difficulty / time / cost
  const difficulty = M.DIFFICULTY_MAP[String(e.difficulty).toLowerCase()] || M.DIFFICULTY_DEFAULT;
  const steps0 = (e.steps || []).filter((s) => (s.body || s.title));
  const t = M.estimateTimeFromProcess(difficulty, steps0.length, (e.cut_list || []).length); report.gaps.timeAssumed++;
  const c = M.estimateCostFromMaterials(e.wood_products, e.hardware); report.gaps.costAssumed++;
  report.costTierDist[c.tier] = (report.costTierDist[c.tier] || 0) + 1;

  // tools
  const toolSlugs = new Set();
  for (const raw of (e.other_tools || [])) { const s = mapTool(raw); if (s) toolSlugs.add(s); else report.unmappedTools[String(raw).toLowerCase()] = (report.unmappedTools[String(raw).toLowerCase()] || 0) + 1; }
  for (const kt of (e.kreg_tools || [])) { const s = mapTool(kt.name || ''); if (s) toolSlugs.add(s); }
  const tools = [...toolSlugs].map((s) => ({ slug: s, essential: !M.NON_ESSENTIAL.has(s) }));
  if (tools.length && !tools.some((x) => x.essential)) tools[0].essential = true;
  if (!tools.length) { report.gaps.zeroTools++; problems.push('no tools mapped'); }

  // materials
  const materials = [];
  for (const w of (e.wood_products || [])) materials.push({ name: `${w.name}${w.detail ? ', ' + w.detail : ''}`.trim() || 'Board', unit: M.MATERIAL_UNIT.wood, quantity: parseNum(w.quantity) > 0 ? parseNum(w.quantity) : 1 });
  for (const h of (e.hardware || [])) materials.push({ name: `${h.name}${h.detail ? ', ' + h.detail : ''}`.trim() || 'Hardware', unit: M.MATERIAL_UNIT.hardware, quantity: parseNum(h.quantity) > 0 ? parseNum(h.quantity) : 1 });
  if (!materials.length) { report.gaps.zeroMaterials++; problems.push('no materials'); }

  // images (union of primary + images[] + step images), dedup, one primary
  const primary = (typeof e.image === 'string' && e.image) || (e.images || [])[0] || null;
  const urls = [];
  const push = (u) => { if (typeof u === 'string' && /^https?:\/\//.test(u) && !urls.includes(u)) urls.push(u); };
  push(primary);
  for (const u of (e.images || [])) push(u);
  for (const s of (e.steps || [])) push(s.image);
  const images = urls.map((u, i) => ({ url: u, alt: i === 0 ? e.title : `${e.title} — step photo ${i}`, isPrimary: i === 0 }));

  // steps
  const imgSet = new Set(urls);
  const steps = steps0.map((s, i) => {
    let body = String(s.body || s.title || '').trim();
    if (Array.isArray(s.tips) && s.tips.length) body += `\n\n**Tip:** ${s.tips.join(' ')}`;
    const step = { title: String(s.title || `Step ${s.step || i + 1}`).trim() || `Step ${i + 1}`, body: body || `Step ${i + 1}` };
    if (typeof s.image === 'string' && imgSet.has(s.image)) step.image = s.image;
    return step;
  });
  if (!steps.length) { steps.push({ title: 'Build', body: String(e.description || 'See plan.').slice(0, 500) }); }

  // cutList — ALL-OR-NOTHING (Keagan 2026-07-23): only emit a cut list when EVERY
  // row parses to full T×W×L. A partial cut list is a trust bug (a builder reads it
  // as the whole list). Partial/empty → [] for now; a later pass can lift more rows.
  const rawCut = e.cut_list || [];
  const parsedRows = [];
  for (const row of rawCut) {
    const dims = parseCutDetail(row.detail);
    if (dims) parsedRows.push({ part: String(row.name || 'Part').trim() || 'Part', quantity: Math.max(1, parseInt(row.quantity, 10) || 1), ...dims });
  }
  let cutList = [];
  if (rawCut.length > 0 && parsedRows.length === rawCut.length) { cutList = parsedRows; report.cut.complete++; }
  else if (rawCut.length === 0) report.cut.empty++;
  else if (parsedRows.length > 0) report.cut.partial++; // dropped to [] — only full lists emitted
  else report.cut.empty++;

  // tags / summary / category
  const tags = ((e.categories || []).map((x) => String(x)).filter(Boolean));
  if (M.DIFFICULTY_LABEL[difficulty]) tags.push(M.DIFFICULTY_LABEL[difficulty]);
  const category = mapCategory(e.categories, e.title || '');
  if (!tags.length) tags.push(category);
  let summary = String(e.description || e.title || '').replace(/\s+/g, ' ').trim();
  summary = (summary.split(/(?<=[.!?])\s/)[0] || summary).slice(0, 200) || e.title || 'A woodworking plan.';

  const plan = {
    slug, title: String(e.title || slug), summary, description: String(e.description || e.title || summary),
    category, difficulty,
    timeMinMinutes: t.min, timeMaxMinutes: t.max, timeLabel: toHours(t.min, t.max),
    costTier: c.tier, costMinCents: c.min, costMaxCents: c.max,
    tags: [...new Set(tags)], tools, materials, cutList, steps, images, published: true,
  };

  if (problems.length) { report.failed++; for (const pr of problems) report.failReasons[pr] = (report.failReasons[pr] || 0) + 1; continue; }
  writeFileSync(join(OUT, `${slug}.json`), JSON.stringify(plan, null, 2) + '\n');
  report.categoryDist[category] = (report.categoryDist[category] || 0) + 1;
  if (report.samples.length < 8) report.samples.push({ slug, difficulty, steps: steps.length, cutRows: rawCut.length, time: plan.timeLabel, tier: c.tier, costMaxUSD: (c.max / 100) });
  report.written++;
}

const topUnmapped = Object.entries(report.unmappedTools).sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log(JSON.stringify({ ...report, unmappedTools: undefined, topUnmappedTools: topUnmapped }, null, 2));
