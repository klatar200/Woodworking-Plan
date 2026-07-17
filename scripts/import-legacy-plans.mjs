#!/usr/bin/env node
/**
 * scripts/import-legacy-plans.mjs
 *
 * Transforms the raw scraped catalog at plans.json (root) into DRAFT files shaped
 * like content/plans/*.json — one JSON file per plan, written to
 * content/plans-import/ (NOT content/plans/).
 *
 * WHY A STAGING DIRECTORY AND NOT content/plans/ DIRECTLY:
 *   1. src/content/load.ts only reads content/plans/*.json, so nothing here is
 *      live, seeded, or test-covered until a human moves files over. That's
 *      deliberate — see point 2.
 *   2. The source data has NO category, difficulty, cost, or time-estimate
 *      fields, and its "description" field is junk (empty or "Pin For Later!"
 *      in 90%+ of rows — see the review report). Those are exactly the fields
 *      BUSINESS_PLAN.md §12 and plan-schema.ts treat as trust-critical. This
 *      script does NOT invent plausible-looking values for them. It writes
 *      obvious sentinels (costMinCents/costMaxCents: 0, timeMinMinutes/Max: 1)
 *      and literal "TODO" placeholders for summary/description, then logs every
 *      one in _review-report.json. A plausible-looking wrong guess is more
 *      dangerous than an obviously-fake one — this project's own cost-tier rule
 *      makes the same call.
 *   3. Same reason the existing 61-plan batch is gated on provenance/branding
 *      sign-off before a production seed (AUDIT_2026-07-16) — this is scraped
 *      third-party content at 14x that batch's size. That gate applies here too.
 *
 * WHAT IS DERIVED WITH REAL CONFIDENCE (mechanical, not guessed):
 *   - slug, title, tools (mapped from a 21-entry free-text tool vocabulary),
 *     steps (title/body copy straight across), images.
 *
 * WHAT IS BEST-EFFORT / LOW CONFIDENCE (flagged per-plan in the report):
 *   - category (keyword match against the 6 known categories)
 *   - difficulty (heuristic from step/tool count)
 *   - tags (tokenized from the title)
 *   - materials / cutList line parsing (free text is very heterogeneous; lines
 *     that don't match a recognizable "qty - dims @ length" shape fall back to
 *     quantity 1 / unit "each" / the raw line as the name, and are counted in
 *     the report so a reviewer can triage the worst plans first)
 *
 * WHAT IS SKIPPED ENTIRELY:
 *   - Any source plan missing steps, tools, or a shopping list (236 of 1241 —
 *     the schema requires at least one of each, and inventing content to hit
 *     that minimum would be worse than not importing the plan). Listed in the
 *     report under "skipped".
 *
 * Usage:
 *   node scripts/import-legacy-plans.mjs
 *
 * Reads:  plans.json, content/tools.json, content/plans/*.json (for slugs)
 * Writes: content/plans-import/<slug>.json (one per imported plan)
 *         content/plans-import/_review-report.json
 *
 * Requires the 10 new tool slugs already added to content/tools.json:
 * safety-glasses, pencil, speed-square, hearing-protection, drill-bit-set,
 * level, hammer, edge-banding-iron, hole-saw, scroll-saw.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SOURCE_FILE = join(ROOT, 'plans.json');
const TOOLS_FILE = join(ROOT, 'content', 'tools.json');
const EXISTING_PLANS_DIR = join(ROOT, 'content', 'plans');
const OUT_DIR = join(ROOT, 'content', 'plans-import');

function normalize(str) {
  return str
    .replace(/ /g, ' ')
    .replace(/[‘’′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/[×]/g, 'x')
    .replace(/\s+/g, ' ')
    .trim();
}

// "20 3/4" (space-separated mixed number, no hyphen) -> "20-3/4" so the
// cut-list length parser (which expects the hyphenated form) can read it.
function joinMixedFractions(str) {
  return str.replace(/(\d+)\s+(\d+\/\d+)/g, '$1-$2');
}

function slugify(str) {
  return normalize(str)
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// ---------------------------------------------------------------------------
// Tool name mapping — 21 distinct free-text names appear in the source data.
// Anything not in this map falls back to a slugified guess and is logged in
// the review report's unknownTools section instead of silently mismatched.
// ---------------------------------------------------------------------------
const TOOL_NAME_MAP = {
  'tape measure': 'tape-measure',
  'safety glasses': 'safety-glasses',
  pencil: 'pencil',
  'speed square': 'speed-square',
  drill: 'drill-driver',
  'power sander': 'random-orbit-sander',
  'hearing protection': 'hearing-protection',
  'circular saw': 'circular-saw',
  'brad nailer': 'brad-nailer',
  'kreg jig': 'pocket-hole-jig',
  'miter saw': 'miter-saw',
  'drill bit set': 'drill-bit-set',
  jigsaw: 'jigsaw',
  level: 'level',
  hammer: 'hammer',
  'table saw': 'table-saw',
  'staple gun': 'staple-gun',
  'iron for edge banding': 'edge-banding-iron',
  'hole saw kit': 'hole-saw',
  'scroll saw': 'scroll-saw',
  router: 'router',
};

// New slugs this map introduces, added to content/tools.json separately (this
// script does not write tools.json itself).
const NEW_TOOL_SLUGS_NEEDED = [
  'safety-glasses',
  'pencil',
  'speed-square',
  'hearing-protection',
  'drill-bit-set',
  'level',
  'hammer',
  'edge-banding-iron',
  'hole-saw',
  'scroll-saw',
];

// ---------------------------------------------------------------------------
// Category keyword scoring — best-effort only. Flagged in the report.
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORDS = {
  'cutting-boards': ['cutting board', 'charcuterie', 'serving board', 'serving tray'],
  storage: [
    'shelf', 'shelves', 'shelving', 'storage', 'cabinet', 'organizer', 'organiser',
    'rack', 'bin', 'closet', 'armoire', 'bookcase', 'toolbox', 'tool box',
  ],
  outdoor: [
    'outdoor', 'garden', 'planter', 'patio', 'deck', 'shed', 'fence', 'porch',
    'adirondack', 'picnic', 'pergola', 'trellis', 'raised bed', 'birdhouse',
    'bird house', 'coop',
  ],
  'shop-projects': [
    'workbench', 'work bench', 'jig', 'router table', 'sled', 'saw stand',
    'clamp rack', 'miter station', 'assembly table', 'sawhorse',
  ],
  'gifts-and-small-projects': [
    'coaster', 'gift', 'toy', 'ornament', 'small', 'jewelry box', 'phone stand',
    'key holder',
  ],
  furniture: [
    'table', 'bench', 'chair', 'bed', 'desk', 'dresser', 'nightstand',
    'headboard', 'sofa', 'ottoman', 'stool', 'wardrobe', 'console',
  ],
};
const CATEGORY_PRIORITY = [
  'cutting-boards',
  'outdoor',
  'shop-projects',
  'gifts-and-small-projects',
  'storage',
  'furniture',
];

function guessCategory(title) {
  const t = title.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const cat of CATEGORY_PRIORITY) {
    const keywords = CATEGORY_KEYWORDS[cat];
    const score = keywords.reduce((acc, kw) => (t.includes(kw) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return { category: best || 'furniture', confident: bestScore > 0 };
}

// ---------------------------------------------------------------------------
// Difficulty heuristic — bounded 1-5, flagged as a guess in every case.
// ---------------------------------------------------------------------------
function guessDifficulty(stepCount, toolCount) {
  const raw = 1 + stepCount / 5 + toolCount / 8;
  return Math.max(1, Math.min(5, Math.round(raw)));
}

// ---------------------------------------------------------------------------
// Tags — tokenize the title, drop stopwords, dedupe.
// ---------------------------------------------------------------------------
const STOPWORDS = new Set([
  'the', 'a', 'an', 'with', 'for', 'and', 'in', 'of', 'to', 'diy', 'build',
  'plans', 'plan', 'how', 'make',
]);
function guessTags(title) {
  const words = normalize(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return [...new Set(words)].slice(0, 12);
}

// ---------------------------------------------------------------------------
// Materials parsing — best effort. Every line becomes a schema-valid material
// (quantity + unit + name), but only lines matching a recognizable
// "qty - description" or "qty description" shape get a real quantity; anything
// else falls back to quantity 1 / unit "each" and is counted as unparsed.
// ---------------------------------------------------------------------------
function parseMaterialLine(rawLine) {
  const line = normalize(rawLine).replace(/^[•*]\s*/, '');
  let m = line.match(/^(\d+(?:\.\d+)?)\s*-\s*(.+)$/);
  if (m) {
    const qty = parseFloat(m[1]);
    const rest = m[2].trim();
    const unit = /sheet/i.test(rest) ? 'sheet' : /\boz\b/i.test(rest) ? 'oz' : 'each';
    return { name: rest, unit, quantity: qty, parsed: true };
  }
  m = line.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (m) {
    const qty = parseFloat(m[1]);
    const rest = m[2].trim();
    const unit = /sheet/i.test(rest) ? 'sheet' : /\boz\b/i.test(rest) ? 'oz' : 'each';
    return { name: rest, unit, quantity: qty, parsed: true };
  }
  return { name: line, unit: 'each', quantity: 1, parsed: false };
}

// ---------------------------------------------------------------------------
// Cut-list parsing — only lines that match "N - WxH @ length" become
// structured cutList rows (schema requires numeric thickness/width/length for
// every row, so anything else literally cannot be represented). Everything
// else is dropped from cutList and its raw text preserved in the review
// report — never silently invented.
// ---------------------------------------------------------------------------
const NOMINAL_LUMBER = {
  '1x2': [0.75, 1.5], '1x3': [0.75, 2.5], '1x4': [0.75, 3.5], '1x6': [0.75, 5.5],
  '1x8': [0.75, 7.25], '1x10': [0.75, 9.25], '1x12': [0.75, 11.25],
  '2x2': [1.5, 1.5], '2x4': [1.5, 3.5], '2x6': [1.5, 5.5], '2x8': [1.5, 7.25],
  '2x10': [1.5, 9.25], '2x12': [1.5, 11.25], '4x4': [3.5, 3.5], '6x6': [5.5, 5.5],
};

function parseInches(str) {
  const s = str.trim().replace(/"/g, '');
  // mixed number like 42-1/2
  let m = s.match(/^(\d+)-(\d+)\/(\d+)$/);
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10);
  // plain fraction like 1/2
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return parseInt(m[1], 10) / parseInt(m[2], 10);
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parseCutListLine(rawLine) {
  const line = joinMixedFractions(normalize(rawLine).replace(/^[•*]\s*/, ''));
  const m = line.match(
    /^(\d+(?:\.\d+)?)\s*-\s*(\d+)x(\d+)\s*@\s*([\d.\-/]+)"?\s*(?:\((?:[^)]*)\))?\s*(?:-\s*(.*))?$/i,
  );
  if (!m) return null;

  const quantity = parseInt(m[1], 10);
  const key = `${m[2]}x${m[3]}`;
  const dims = NOMINAL_LUMBER[key];
  if (!dims) return null;
  const lengthIn = parseInches(m[4]);
  if (lengthIn === null || lengthIn <= 0) return null;

  const [thicknessIn, widthIn] = dims;
  const note = m[5] ? m[5].trim() : undefined;
  const item = { part: note || `${key} @ ${m[4]}"`, quantity, thicknessIn, widthIn, lengthIn };
  if (note) item.note = note;
  return item;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  if (!existsSync(SOURCE_FILE)) {
    console.error(`Cannot find ${SOURCE_FILE}`);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(SOURCE_FILE, 'utf8'));
  if (!Array.isArray(raw) || raw.length < 100) {
    // Sanity check against a corrupt/truncated read of the source file.
    console.error(
      `plans.json parsed to ${Array.isArray(raw) ? raw.length : typeof raw} entries — expected 1000+. Refusing to continue (possible truncated read).`,
    );
    process.exit(1);
  }

  const existingTools = JSON.parse(readFileSync(TOOLS_FILE, 'utf8'));
  const knownToolSlugs = new Set(existingTools.map((t) => t.slug));
  const missingFromToolsJson = NEW_TOOL_SLUGS_NEEDED.filter((s) => !knownToolSlugs.has(s));
  if (missingFromToolsJson.length > 0) {
    console.warn(
      `WARNING: content/tools.json is missing: ${missingFromToolsJson.join(', ')} — plans using them will fail planSchema validation until added.`,
    );
  }

  const existingSlugs = new Set(
    readdirSync(EXISTING_PLANS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, '')),
  );

  mkdirSync(OUT_DIR, { recursive: true });

  const report = { generatedAt: new Date().toISOString(), sourceCount: raw.length, skipped: [], imported: [], unknownTools: {} };

  let importedCount = 0;

  for (const [index, p] of raw.entries()) {
    const title = normalize(p.title || '').trim();

    if (!p.steps?.length || !p.tools?.length || !p.shopping_list?.length) {
      report.skipped.push({
        index,
        title,
        url: p.url,
        reason: [
          !p.steps?.length && 'no steps',
          !p.tools?.length && 'no tools',
          !p.shopping_list?.length && 'no shopping list',
        ]
          .filter(Boolean)
          .join(', '),
      });
      continue;
    }

    // --- slug (deduped against existing catalog + this batch) ---
    let base = slugify(title) || `imported-plan-${index}`;
    let slug = base;
    let n = 2;
    while (existingSlugs.has(slug)) {
      slug = `${base}-${n}`;
      n += 1;
    }
    existingSlugs.add(slug);

    // --- tools ---
    const flags = [];
    const toolSlugSet = new Set();
    for (const rawToolName of p.tools) {
      const key = normalize(rawToolName).toLowerCase().trim();
      let mapped = TOOL_NAME_MAP[key];
      if (!mapped) {
        mapped = slugify(rawToolName);
        report.unknownTools[rawToolName] = (report.unknownTools[rawToolName] || 0) + 1;
        flags.push(`tool:"${rawToolName}" not in TOOL_NAME_MAP, fell back to slug "${mapped}"`);
      }
      toolSlugSet.add(mapped);
    }
    const tools = [...toolSlugSet].map((s) => ({ slug: s, essential: true }));

    // --- materials (from shopping_list) ---
    let unparsedMaterials = 0;
    const materials = p.shopping_list.map((line) => {
      const r = parseMaterialLine(line);
      if (!r.parsed) unparsedMaterials += 1;
      return { name: r.name.slice(0, 300) || '(blank line)', unit: r.unit, quantity: r.quantity };
    });
    if (unparsedMaterials > 0) {
      flags.push(`materials: ${unparsedMaterials}/${materials.length} lines did not match a "qty - description" shape (fell back to qty 1 / "each")`);
    }

    // --- cutList (from cut_list; unparseable lines are dropped, not invented) ---
    const cutList = [];
    let droppedCutLines = [];
    for (const line of p.cut_list || []) {
      const item = parseCutListLine(line);
      if (item) cutList.push(item);
      else droppedCutLines.push(line);
    }
    if (droppedCutLines.length > 0) {
      flags.push(`cutList: ${droppedCutLines.length}/${(p.cut_list || []).length} lines dropped (didn't match "qty - WxH @ length"; not invented)`);
    }

    // --- steps ---
    const steps = p.steps.map((s) => ({
      title: normalize(s.step || 'Step').trim() || 'Step',
      body: (s.body || '').trim() || '(no instructions in source)',
      tools: [],
      materials: [],
    }));

    // --- images ---
    const images = p.image
      ? [{ url: p.image, alt: title, isPrimary: true }]
      : [];

    // --- category / difficulty / tags (guessed) ---
    const { category, confident } = guessCategory(title);
    flags.push(`category: guessed "${category}"${confident ? '' : ' (no keyword match — defaulted)'}, verify`);
    const difficulty = guessDifficulty(steps.length, tools.length);
    flags.push(`difficulty: guessed ${difficulty} from step/tool counts, verify`);
    const tags = guessTags(title);
    if (tags.length === 0) tags.push(slug);
    flags.push('tags: auto-generated from title, verify');

    // --- fields with NO source data at all: obvious sentinels, never guesses ---
    flags.push('summary/description: TODO placeholders — source description field is not usable content');
    flags.push('cost: NOT PRICED — costMinCents/costMaxCents sentinel 0, costTier sentinel TIER_1');
    flags.push('time: NOT ESTIMATED — timeMinMinutes/timeMaxMinutes sentinel 1, review before publishing');

    const plan = {
      slug,
      title,
      summary: `TODO: write a summary for "${title}".`.slice(0, 200),
      description: `TODO: write a real description for "${title}". Imported from ${p.url} — verify all content against the source before publishing.`,
      category,
      difficulty,
      timeMinMinutes: 1,
      timeMaxMinutes: 1,
      timeLabel: 'NOT ESTIMATED — needs review',
      costTier: 'TIER_1',
      costMinCents: 0,
      costMaxCents: 0,
      tags,
      tools,
      materials,
      cutList,
      steps,
      images,
      published: false,
    };

    writeFileSync(join(OUT_DIR, `${slug}.json`), JSON.stringify(plan, null, 2) + '\n', 'utf8');
    report.imported.push({ slug, title, url: p.url, flags, droppedCutLines: droppedCutLines.length ? droppedCutLines : undefined });
    importedCount += 1;
  }

  writeFileSync(join(OUT_DIR, '_review-report.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log(`Source plans:      ${raw.length}`);
  console.log(`Imported (draft):  ${importedCount} -> ${OUT_DIR}`);
  console.log(`Skipped (no steps/tools/shopping_list): ${report.skipped.length}`);
  console.log(`Unknown tool names encountered: ${Object.keys(report.unknownTools).length}`);
  console.log(`Review report: ${join(OUT_DIR, '_review-report.json')}`);
  console.log('All imported plans are published: false and every non-mechanical field is flagged. Nothing here is seed-ready.');
}

main();
