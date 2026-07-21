#!/usr/bin/env node
/**
 * scripts/validate-plans.mjs
 *
 * A zero-dependency re-implementation of src/content/plan-schema.ts's constraints,
 * so a plan-authoring pass (human or Claude) can self-check a batch of files
 * without needing a working TS/zod toolchain in a sandbox — the project's own
 * environment gotchas note that npm installs / TS execution are unreliable
 * there (see CLAUDE.md §6). This script has NO dependencies: just Node's fs.
 *
 * It is a MIRROR, not a replacement. The real gate is planSchema (used by
 * src/content/load.ts, and therefore by the app, the seed, and CI). If this
 * script and planSchema ever disagree, planSchema wins — update this file to
 * match it, not the other way round.
 *
 * Usage:
 *   node scripts/validate-plans.mjs                  # validates content/plans/
 *   node scripts/validate-plans.mjs content/plans-import
 *   node scripts/validate-plans.mjs content/plans/adirondack-chair.json
 *
 * Exits 0 if every file is clean, 1 if any file has a problem. Prints every
 * problem for every file — a half-reported batch is worse than a refused one.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COST_TIERS = ['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4', 'TIER_5'];
const COST_TIER_BOUNDS = {
  TIER_1: 5_000,
  TIER_2: 15_000,
  TIER_3: 35_000,
  TIER_4: 75_000,
  TIER_5: Number.MAX_SAFE_INTEGER,
};

function isNonEmptyString(v) {
  return typeof v === 'string' && v.length > 0;
}
function isInt(v) {
  return typeof v === 'number' && Number.isInteger(v);
}
function isPositiveNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}
function isNonNegativeInt(v) {
  return isInt(v) && v >= 0;
}

function loadVocab() {
  const categories = JSON.parse(readFileSync(join(ROOT, 'content', 'categories.json'), 'utf8'));
  const tools = JSON.parse(readFileSync(join(ROOT, 'content', 'tools.json'), 'utf8'));
  return {
    categorySlugs: new Set(categories.map((c) => c.slug)),
    toolSlugs: new Set(tools.map((t) => t.slug)),
  };
}

/** Returns an array of problem strings. Empty array = valid. */
function validatePlan(plan, vocab) {
  const problems = [];
  const p = (msg) => problems.push(msg);

  if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) {
    return ['top-level value is not an object'];
  }

  const ALLOWED_KEYS = new Set([
    'slug', 'title', 'summary', 'description', 'category', 'difficulty',
    'timeMinMinutes', 'timeMaxMinutes', 'timeLabel', 'costTier', 'costMinCents',
    'costMaxCents', 'tags', 'tools', 'materials', 'cutList', 'steps', 'images',
    // `unresolvedImages` is an OPTIONAL sibling of `images` (plan-schema.ts:143),
    // added by the 2026-07-17 R2 image migration for photos whose source URL 404'd.
    // The real Zod schema accepts it; this mirror must too, or it fails ~150 valid files.
    'unresolvedImages',
    'published',
  ]);
  for (const key of Object.keys(plan)) {
    if (!ALLOWED_KEYS.has(key)) p(`unexpected top-level key "${key}" (schema is .strict() — typo?)`);
  }

  if (!isNonEmptyString(plan.slug) || !SLUG_RE.test(plan.slug)) {
    p(`slug: must be a non-empty lowercase kebab-case string, got ${JSON.stringify(plan.slug)}`);
  }
  if (!isNonEmptyString(plan.title)) p('title: must be a non-empty string');
  if (!isNonEmptyString(plan.summary) || plan.summary.length > 200) {
    p(`summary: must be a non-empty string, max 200 chars (got ${plan.summary?.length ?? 'n/a'})`);
  }
  if (!isNonEmptyString(plan.description)) p('description: must be a non-empty string');

  if (!isNonEmptyString(plan.category) || !vocab.categorySlugs.has(plan.category)) {
    p(`category: "${plan.category}" is not one of the known category slugs (${[...vocab.categorySlugs].join(', ')})`);
  }

  if (!isInt(plan.difficulty) || plan.difficulty < 1 || plan.difficulty > 5) {
    p(`difficulty: must be an integer 1-5, got ${plan.difficulty}`);
  }

  if (!isInt(plan.timeMinMinutes) || plan.timeMinMinutes <= 0) p('timeMinMinutes: must be a positive integer');
  if (!isInt(plan.timeMaxMinutes) || plan.timeMaxMinutes <= 0) p('timeMaxMinutes: must be a positive integer');
  if (isInt(plan.timeMinMinutes) && isInt(plan.timeMaxMinutes) && plan.timeMaxMinutes < plan.timeMinMinutes) {
    p('timeMaxMinutes must be >= timeMinMinutes');
  }
  if (!isNonEmptyString(plan.timeLabel)) p('timeLabel: must be a non-empty string');

  if (!COST_TIERS.includes(plan.costTier)) p(`costTier: must be one of ${COST_TIERS.join(', ')}, got ${plan.costTier}`);
  if (!isNonNegativeInt(plan.costMinCents)) p('costMinCents: must be a non-negative integer (cents)');
  if (!isNonNegativeInt(plan.costMaxCents)) p('costMaxCents: must be a non-negative integer (cents)');
  if (isNonNegativeInt(plan.costMinCents) && isNonNegativeInt(plan.costMaxCents) && plan.costMaxCents < plan.costMinCents) {
    p('costMaxCents must be >= costMinCents');
  }
  if (COST_TIERS.includes(plan.costTier) && isNonNegativeInt(plan.costMaxCents)) {
    const bound = COST_TIER_BOUNDS[plan.costTier];
    if (plan.costMaxCents > bound) {
      p(`costTier "${plan.costTier}" contradicts costMaxCents ${plan.costMaxCents} (bound is ${bound}) — see COST_TIER_BOUNDS in plan-schema.ts`);
    }
  }

  if (!Array.isArray(plan.tags) || plan.tags.length < 1 || !plan.tags.every(isNonEmptyString)) {
    p('tags: must be a non-empty array of non-empty strings');
  }

  const toolSlugsOnPlan = new Set();
  if (!Array.isArray(plan.tools) || plan.tools.length < 1) {
    p('tools: must be a non-empty array');
  } else {
    let anyEssential = false;
    plan.tools.forEach((t, i) => {
      if (typeof t !== 'object' || t === null) return p(`tools[${i}]: must be an object`);
      if (!isNonEmptyString(t.slug)) p(`tools[${i}].slug: must be a non-empty string`);
      else {
        toolSlugsOnPlan.add(t.slug);
        if (!vocab.toolSlugs.has(t.slug)) p(`tools[${i}].slug "${t.slug}" is not in content/tools.json`);
      }
      if (typeof t.essential !== 'boolean') p(`tools[${i}].essential: must be a boolean`);
      else if (t.essential) anyEssential = true;
      if (t.note !== undefined && !isNonEmptyString(t.note)) p(`tools[${i}].note: if present, must be a non-empty string`);
      const allowed = new Set(['slug', 'essential', 'note']);
      for (const k of Object.keys(t)) if (!allowed.has(k)) p(`tools[${i}]: unexpected key "${k}"`);
    });
    if (!anyEssential) p('tools: at least one tool must have essential: true');
  }

  const materialNamesOnPlan = new Set();
  if (!Array.isArray(plan.materials) || plan.materials.length < 1) {
    p('materials: must be a non-empty array');
  } else {
    plan.materials.forEach((m, i) => {
      if (typeof m !== 'object' || m === null) return p(`materials[${i}]: must be an object`);
      if (!isNonEmptyString(m.name)) p(`materials[${i}].name: must be a non-empty string`);
      else materialNamesOnPlan.add(m.name);
      if (!isNonEmptyString(m.unit)) p(`materials[${i}].unit: must be a non-empty string`);
      if (!isPositiveNumber(m.quantity)) p(`materials[${i}].quantity: must be a positive number`);
      if (m.species !== undefined && !isNonEmptyString(m.species)) p(`materials[${i}].species: if present, must be a non-empty string`);
      if (m.costCents !== undefined && !isNonNegativeInt(m.costCents)) p(`materials[${i}].costCents: if present, must be a non-negative integer`);
      if (m.note !== undefined && !isNonEmptyString(m.note)) p(`materials[${i}].note: if present, must be a non-empty string`);
      const allowed = new Set(['name', 'unit', 'quantity', 'species', 'costCents', 'note']);
      for (const k of Object.keys(m)) if (!allowed.has(k)) p(`materials[${i}]: unexpected key "${k}"`);
    });
  }

  if (!Array.isArray(plan.cutList)) {
    p('cutList: must be an array (can be empty)');
  } else {
    plan.cutList.forEach((c, i) => {
      if (typeof c !== 'object' || c === null) return p(`cutList[${i}]: must be an object`);
      if (!isNonEmptyString(c.part)) p(`cutList[${i}].part: must be a non-empty string`);
      if (!isInt(c.quantity) || c.quantity <= 0) p(`cutList[${i}].quantity: must be a positive integer`);
      if (!isPositiveNumber(c.thicknessIn)) p(`cutList[${i}].thicknessIn: must be a positive number`);
      if (!isPositiveNumber(c.widthIn)) p(`cutList[${i}].widthIn: must be a positive number`);
      if (!isPositiveNumber(c.lengthIn)) p(`cutList[${i}].lengthIn: must be a positive number`);
      if (c.material !== undefined && !isNonEmptyString(c.material)) p(`cutList[${i}].material: if present, must be a non-empty string`);
      if (c.note !== undefined && !isNonEmptyString(c.note)) p(`cutList[${i}].note: if present, must be a non-empty string`);
      const allowed = new Set(['part', 'quantity', 'thicknessIn', 'widthIn', 'lengthIn', 'material', 'note']);
      for (const k of Object.keys(c)) if (!allowed.has(k)) p(`cutList[${i}]: unexpected key "${k}"`);
    });
  }

  if (!Array.isArray(plan.steps) || plan.steps.length < 1) {
    p('steps: must be a non-empty array');
  } else {
    plan.steps.forEach((s, i) => {
      if (typeof s !== 'object' || s === null) return p(`steps[${i}]: must be an object`);
      if (!isNonEmptyString(s.title)) p(`steps[${i}].title: must be a non-empty string`);
      if (!isNonEmptyString(s.body)) p(`steps[${i}].body: must be a non-empty string`);
      const stepTools = s.tools === undefined ? [] : s.tools;
      const stepMaterials = s.materials === undefined ? [] : s.materials;
      if (!Array.isArray(stepTools) || !stepTools.every(isNonEmptyString)) {
        p(`steps[${i}].tools: if present, must be an array of non-empty strings`);
      } else {
        stepTools.forEach((slug) => {
          if (!toolSlugsOnPlan.has(slug)) p(`steps[${i}].tools: "${slug}" is not one of this plan's own tools (must be a subset)`);
        });
      }
      if (!Array.isArray(stepMaterials) || !stepMaterials.every(isNonEmptyString)) {
        p(`steps[${i}].materials: if present, must be an array of non-empty strings`);
      } else {
        stepMaterials.forEach((name) => {
          if (!materialNamesOnPlan.has(name)) p(`steps[${i}].materials: "${name}" is not one of this plan's own material names (must be a subset)`);
        });
      }
      const allowed = new Set(['title', 'body', 'tools', 'materials']);
      for (const k of Object.keys(s)) if (!allowed.has(k)) p(`steps[${i}]: unexpected key "${k}"`);
    });
  }

  if (!Array.isArray(plan.images)) {
    p('images: must be an array (can be empty)');
  } else {
    let primaryCount = 0;
    plan.images.forEach((img, i) => {
      if (typeof img !== 'object' || img === null) return p(`images[${i}]: must be an object`);
      if (!isNonEmptyString(img.url) || !/^https?:\/\//.test(img.url)) p(`images[${i}].url: must be a non-empty http(s) URL`);
      if (!isNonEmptyString(img.alt)) p(`images[${i}].alt: must be a non-empty string`);
      if (typeof img.isPrimary !== 'boolean') p(`images[${i}].isPrimary: must be a boolean`);
      else if (img.isPrimary) primaryCount += 1;
      const allowed = new Set(['url', 'alt', 'isPrimary']);
      for (const k of Object.keys(img)) if (!allowed.has(k)) p(`images[${i}]: unexpected key "${k}"`);
    });
    if (primaryCount > 1) p('images: at most one image may have isPrimary: true');
  }

  // OPTIONAL. Same element shape as `images` (plan-schema.ts: `z.array(image).optional()`),
  // but no single-primary refinement — these are parked source URLs, not rendered.
  if (plan.unresolvedImages !== undefined) {
    if (!Array.isArray(plan.unresolvedImages)) {
      p('unresolvedImages: if present, must be an array');
    } else {
      plan.unresolvedImages.forEach((img, i) => {
        if (typeof img !== 'object' || img === null) return p(`unresolvedImages[${i}]: must be an object`);
        if (!isNonEmptyString(img.url) || !/^https?:\/\//.test(img.url)) p(`unresolvedImages[${i}].url: must be a non-empty http(s) URL`);
        if (!isNonEmptyString(img.alt)) p(`unresolvedImages[${i}].alt: must be a non-empty string`);
        if (typeof img.isPrimary !== 'boolean') p(`unresolvedImages[${i}].isPrimary: must be a boolean`);
        const allowed = new Set(['url', 'alt', 'isPrimary']);
        for (const k of Object.keys(img)) if (!allowed.has(k)) p(`unresolvedImages[${i}]: unexpected key "${k}"`);
      });
    }
  }

  if (typeof plan.published !== 'boolean') p('published: must be a boolean');

  return problems;
}

function collectFiles(target) {
  const full = join(ROOT, target);
  if (!existsSync(full)) {
    console.error(`Not found: ${full}`);
    process.exit(1);
  }
  if (statSync(full).isFile()) return [full];
  return readdirSync(full)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => join(full, f))
    .sort();
}

function main() {
  const target = process.argv[2] || 'content/plans';
  const vocab = loadVocab();
  const files = collectFiles(target);

  let totalProblems = 0;
  let filesWithProblems = 0;

  for (const file of files) {
    let plan;
    try {
      plan = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      console.log(`FAIL ${basename(file)}`);
      console.log(`  - could not parse JSON: ${err.message}`);
      totalProblems += 1;
      filesWithProblems += 1;
      continue;
    }
    const problems = validatePlan(plan, vocab);
    if (problems.length > 0) {
      filesWithProblems += 1;
      totalProblems += problems.length;
      console.log(`FAIL ${basename(file)}`);
      for (const problem of problems) console.log(`  - ${problem}`);
    }
  }

  console.log('');
  console.log(`Checked ${files.length} file(s). ${filesWithProblems} with problems, ${totalProblems} total problems.`);
  if (filesWithProblems > 0) process.exit(1);
  console.log('All clean.');
}

main();
