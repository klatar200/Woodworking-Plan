// Sprint 21 — apply per-step tool/material tags to content/plans/*.json.
//
// WHAT THIS IS: the content half of Sprint 21, delivered as a script rather than as
// 24 hand-edited files. The TAGS table below IS the content — each entry says which of
// a plan's already-declared tools/materials a given step uses. Review the table, run the
// script, review the resulting `git diff`, then re-seed (npm run db:seed) so the tags
// reach the database.
//
// SAFE TO RE-RUN. It rewrites only each plan's `steps` array (nothing else in the file),
// normalising every step object to a single line, so a second run is a no-op. It throws
// if a tag isn't one the plan declares — the same subset rule src/content/load.ts
// enforces, checked here before anything is written.
//
// Run:  node scripts/apply-step-tags.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLANS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'plans');

// slug -> { stepIndex(0-based): { tools: [toolSlug...], materials: [materialName...] } }
const TAGS = {
  "adirondack-chair": {
    0: { tools: ["jigsaw", "random-orbit-sander", "combination-square", "tape-measure"], materials: ["Hardboard for template"] },
    1: { tools: ["jigsaw", "random-orbit-sander", "router"], materials: ["Cedar, 2x4, 8 ft"] },
    2: { tools: ["drill-driver", "combination-square"], materials: ["Cedar, 2x4, 8 ft", "Stainless steel screws, #8 x 1-1/4\" and 2\""] },
    3: { tools: ["drill-driver"], materials: ["Cedar, 1x4, 6 ft", "Stainless steel screws, #8 x 1-1/4\" and 2\""] },
    4: { tools: ["jigsaw", "drill-driver", "router"], materials: ["Cedar, 1x4, 6 ft", "Stainless steel screws, #8 x 1-1/4\" and 2\""] },
    5: { tools: ["drill-driver", "router"], materials: ["Cedar, 1x6, 8 ft", "Stainless steel screws, #8 x 1-1/4\" and 2\""] },
    6: { tools: ["random-orbit-sander"], materials: ["Exterior finish or leave raw"] },
  },
  "cedar-planter-box": {
    0: { tools: ["table-saw", "combination-square"], materials: ["Cedar, 1x6, 8 ft"] },
    1: { tools: ["table-saw", "miter-saw"], materials: ["Cedar, 1x6, 8 ft"] },
    2: { tools: ["drill-driver"], materials: ["Cedar, 2x2, for feet and cleats", "Exterior screws, stainless or coated, 1-5/8\""] },
    3: { tools: ["drill-driver", "clamps-spring"], materials: ["Exterior screws, stainless or coated, 1-5/8\""] },
    4: { tools: ["drill-driver"], materials: ["Cedar, 2x2, for feet and cleats", "Exterior screws, stainless or coated, 1-5/8\""] },
    5: { tools: ["drill-driver"], materials: ["Cedar, 2x2, for feet and cleats", "Exterior screws, stainless or coated, 1-5/8\"", "Landscape fabric"] },
  },
  "cedar-raised-garden-bed": {
    0: { tools: ["miter-saw", "circular-saw", "tape-measure"], materials: ["Cedar, 2x8, 8 ft", "Cedar 4x4 post, 8 ft"] },
    1: { tools: ["tape-measure", "combination-square"], materials: [] },
    2: { tools: ["drill-driver", "impact-driver", "combination-square"], materials: ["Cedar 4x4 post, 8 ft", "Exterior structural screws, 3\", coated"] },
    3: { tools: ["combination-square"], materials: ["Exterior structural screws, 3\", coated"] },
    4: { tools: ["drill-driver"], materials: ["Hardware cloth, 1/2\" mesh (optional)"] },
  },
  "cherry-serving-board-with-juice-groove": {
    0: { tools: ["combination-square"], materials: ["Cherry board, 4/4, 10\" wide, surfaced"] },
    1: { tools: ["miter-saw", "combination-square", "random-orbit-sander"], materials: ["Cherry board, 4/4, 10\" wide, surfaced"] },
    2: { tools: ["combination-square", "tape-measure"], materials: [] },
    3: { tools: ["router", "straight-edge", "clamps-spring"], materials: [] },
    4: { tools: ["jigsaw", "random-orbit-sander"], materials: ["Sandpaper, assorted grits"] },
    5: { tools: ["random-orbit-sander"], materials: ["Sandpaper, assorted grits"] },
    6: { tools: ["random-orbit-sander"], materials: ["Food-safe mineral oil", "Beeswax / mineral oil paste"] },
  },
  "classic-picnic-table": {
    0: { tools: ["circular-saw", "miter-saw", "combination-square"], materials: ["Cedar or PT 2x4, 8 ft (legs, braces)"] },
    1: { tools: ["drill-driver", "clamps-bar"], materials: ["Cedar or PT 2x4, 8 ft (legs, braces)", "Carriage bolts, 3/8\" x 3-1/2\", with nuts and washers"] },
    2: { tools: ["drill-driver", "combination-square"], materials: ["Cedar or PT 2x6, 8 ft (top and seats)", "Exterior screws, 2-1/2\", coated or stainless"] },
    3: { tools: ["drill-driver"], materials: ["Cedar or PT 2x6, 8 ft (top and seats)", "Exterior screws, 2-1/2\", coated or stainless"] },
    4: { tools: ["drill-driver"], materials: ["Cedar or PT 2x4, 8 ft (legs, braces)", "Carriage bolts, 3/8\" x 3-1/2\", with nuts and washers"] },
    5: { tools: ["random-orbit-sander"], materials: ["Exterior stain/sealer (optional)"] },
  },
  "crosscut-sled": {
    0: { tools: ["table-saw"], materials: ["Hardwood or UHMW for runners"] },
    1: { tools: ["clamps-spring", "combination-square"], materials: ["Baltic birch plywood, 1/2\", for the base", "Wood screws, #8 x 1-1/4\""] },
    2: { tools: ["drill-driver"], materials: ["Hardwood, 3/4\", for the fences", "Wood screws, #8 x 1-1/4\""] },
    3: { tools: ["table-saw"], materials: [] },
    4: { tools: ["drill-driver", "combination-square"], materials: ["Hardwood, 3/4\", for the fences", "Wood screws, #8 x 1-1/4\""] },
    5: { tools: ["table-saw"], materials: [] },
    6: { tools: ["table-saw", "drill-driver", "random-orbit-sander"], materials: ["Paste wax"] },
  },
  "dovetailed-keepsake-box": {
    0: { tools: ["table-saw", "hand-plane", "combination-square"], materials: ["Walnut, 4/4, resawn to 1/2\""] },
    1: { tools: ["marking-gauge"], materials: [] },
    2: { tools: ["hand-saw"], materials: [] },
    3: { tools: ["marking-gauge"], materials: [] },
    4: { tools: ["hand-saw", "chisels", "mallet"], materials: [] },
    5: { tools: [], materials: [] },
    6: { tools: ["table-saw", "clamps-spring"], materials: ["Cedar or maple, 1/4\", for the bottom", "Wood glue"] },
    7: { tools: ["hand-plane", "chisels"], materials: ["Small brass hinges", "Clear interior finish (hardwax oil or wipe-on poly)", "Sandpaper, assorted grits"] },
  },
  "edge-grain-maple-cutting-board": {
    0: { tools: ["jointer", "table-saw", "combination-square"], materials: ["Hard maple, 4/4 (13/16\" surfaced)"] },
    1: { tools: ["table-saw"], materials: ["Hard maple, 4/4 (13/16\" surfaced)"] },
    2: { tools: [], materials: [] },
    3: { tools: ["clamps-parallel"], materials: [] },
    4: { tools: ["clamps-parallel"], materials: ["Waterproof wood glue"] },
    5: { tools: ["planer"], materials: [] },
    6: { tools: ["router"], materials: ["Sandpaper, assorted grits"] },
    7: { tools: ["random-orbit-sander"], materials: ["Sandpaper, assorted grits"] },
    8: { tools: [], materials: ["Food-safe mineral oil", "Beeswax / mineral oil paste"] },
  },
  "end-grain-walnut-maple-butcher-block": {
    0: { tools: ["jointer", "planer", "table-saw"], materials: ["Hard maple, 8/4 (1-3/4\" surfaced)", "Black walnut, 8/4"] },
    1: { tools: ["table-saw", "clamps-parallel"], materials: ["Hard maple, 8/4 (1-3/4\" surfaced)", "Black walnut, 8/4", "Waterproof wood glue"] },
    2: { tools: ["planer", "random-orbit-sander"], materials: [] },
    3: { tools: ["table-saw"], materials: [] },
    4: { tools: [], materials: [] },
    5: { tools: ["clamps-parallel"], materials: ["Waterproof wood glue"] },
    6: { tools: ["planer"], materials: [] },
    7: { tools: ["router", "random-orbit-sander"], materials: ["Sandpaper, assorted grits"] },
    8: { tools: [], materials: ["Food-safe mineral oil", "Beeswax / mineral oil paste"] },
  },
  "entryway-storage-bench": {
    0: { tools: ["circular-saw"], materials: ["Birch plywood, 3/4\", 4x8"] },
    1: { tools: ["pocket-hole-jig", "drill-driver"], materials: ["Pocket hole screws, 1-1/4\"", "Wood glue"] },
    2: { tools: ["clamps-bar"], materials: ["Poplar, 8/4, for the seat", "Wood glue"] },
    3: { tools: ["pocket-hole-jig", "clamps-bar"], materials: ["Poplar, 4/4, for the face frame", "Wood glue"] },
    4: { tools: ["drill-driver"], materials: ["Poplar, 8/4, for the seat"] },
    5: { tools: ["random-orbit-sander"], materials: ["Wood filler", "Primer + latex enamel paint", "Sandpaper, assorted grits"] },
  },
  "farmhouse-dining-table": {
    0: { tools: [], materials: ["White oak, 8/4, for the top"] },
    1: { tools: ["jointer", "planer", "combination-square"], materials: ["White oak, 8/4, for the top"] },
    2: { tools: ["clamps-parallel"], materials: ["Wood glue"] },
    3: { tools: ["router", "random-orbit-sander"], materials: [] },
    4: { tools: ["chisels", "router"], materials: ["White oak or ash, 8/4, for the trestle base"] },
    5: { tools: ["chisels"], materials: ["White oak or ash, 8/4, for the trestle base"] },
    6: { tools: ["router", "drill-driver"], materials: ["Figure-8 tabletop fasteners"] },
    7: { tools: ["random-orbit-sander"], materials: ["Clear interior finish (hardwax oil or wipe-on poly)", "Sandpaper, assorted grits"] },
    8: { tools: ["drill-driver"], materials: ["Figure-8 tabletop fasteners"] },
  },
  "floating-walnut-shelves": {
    0: { tools: ["tape-measure", "combination-square"], materials: [] },
    1: { tools: ["planer", "table-saw"], materials: ["Walnut, 8/4, surfaced"] },
    2: { tools: ["drill-press"], materials: ["Steel rod, 1/2\" diameter, threaded one end"] },
    3: { tools: ["random-orbit-sander"], materials: ["Clear interior finish (hardwax oil or wipe-on poly)", "Sandpaper, assorted grits"] },
    4: { tools: ["drill-driver"], materials: ["Steel rod, 1/2\" diameter, threaded one end"] },
    5: { tools: [], materials: ["Epoxy (2-part, slow set)"] },
  },
  "garden-storage-shed": {
    0: { tools: [], materials: [] },
    1: { tools: ["post-hole-digger", "tape-measure"], materials: ["Pressure-treated 4x4, 8 ft (skids)", "Gravel for the pad"] },
    2: { tools: ["circular-saw", "drill-driver", "impact-driver", "combination-square"], materials: ["Pressure-treated 2x6, 10 ft (floor joists)", "Plywood, 3/4\" T&G, 4x8 (floor)", "Framing screws / nails, exterior rated"] },
    3: { tools: ["circular-saw", "miter-saw", "impact-driver"], materials: ["SPF 2x4, 8 ft (wall framing)", "Framing screws / nails, exterior rated"] },
    4: { tools: ["circular-saw", "miter-saw", "jigsaw", "combination-square"], materials: ["SPF 2x6, 10 ft (rafters)", "Framing screws / nails, exterior rated"] },
    5: { tools: ["circular-saw", "impact-driver"], materials: ["Plywood/OSB, 1/2\", 4x8 (wall + roof sheathing)", "Roofing felt + asphalt shingles", "Drip edge, flashing, ridge cap"] },
    6: { tools: ["circular-saw", "jigsaw", "drill-driver"], materials: ["Exterior siding (T1-11 or lap)", "Door hardware (hinges, hasp, handle)"] },
    7: { tools: [], materials: [] },
  },
  "live-edge-coffee-table": {
    0: { tools: [], materials: ["Kiln-dried walnut slab, ~48\" x 20\" x 2\""] },
    1: { tools: ["router"], materials: [] },
    2: { tools: [], materials: ["Clear casting epoxy"] },
    3: { tools: ["chisels", "router"], materials: ["Walnut offcut for butterfly keys"] },
    4: { tools: ["circular-saw", "straight-edge", "card-scraper"], materials: [] },
    5: { tools: ["random-orbit-sander", "card-scraper"], materials: ["Clear interior finish (hardwax oil or wipe-on poly)", "Sandpaper, assorted grits"] },
    6: { tools: ["drill-driver"], materials: ["Steel hairpin or flat-bar legs, 16\"", "Lag screws + washers for legs"] },
  },
  "magnetic-knife-block": {
    0: { tools: ["table-saw"], materials: ["Walnut, 4/4", "Maple, 4/4"] },
    1: { tools: ["drill-press"], materials: ["Walnut, 4/4", "Neodymium disc magnets, N42, 3/4\" x 1/8\""] },
    2: { tools: [], materials: ["Neodymium disc magnets, N42, 3/4\" x 1/8\""] },
    3: { tools: [], materials: ["Neodymium disc magnets, N42, 3/4\" x 1/8\"", "Epoxy (to seat the magnets)"] },
    4: { tools: ["clamps-parallel"], materials: ["Maple, 4/4", "Wood glue"] },
    5: { tools: ["table-saw"], materials: [] },
    6: { tools: ["router", "random-orbit-sander"], materials: ["Food-safe mineral oil"] },
  },
  "nightstand-with-drawer": {
    0: { tools: ["table-saw", "planer", "jointer"], materials: ["Cherry, 8/4, for legs"] },
    1: { tools: ["chisels", "marking-gauge", "combination-square"], materials: ["Cherry, 4/4, for case, top and drawer front"] },
    2: { tools: ["hand-saw", "chisels"], materials: [] },
    3: { tools: ["clamps-bar"], materials: ["Wood glue"] },
    4: { tools: [], materials: ["Poplar or maple, 4/4, for drawer sides and back"] },
    5: { tools: ["hand-saw", "chisels"], materials: ["Poplar or maple, 4/4, for drawer sides and back", "Plywood, 1/4\", drawer bottom and case back"] },
    6: { tools: ["hand-plane"], materials: [] },
    7: { tools: ["random-orbit-sander"], materials: ["Drawer pull (brass or turned wood)", "Clear interior finish (hardwax oil or wipe-on poly)", "Paste wax"] },
  },
  "oak-coat-rack": {
    0: { tools: ["tape-measure", "combination-square"], materials: [] },
    1: { tools: ["table-saw", "random-orbit-sander"], materials: ["White oak, 4/4, 5\" wide"] },
    2: { tools: ["drill-press", "drill-driver"], materials: ["Shaker pegs, 3-1/2\""] },
    3: { tools: ["router"], materials: [] },
    4: { tools: ["drill-driver"], materials: ["Wood screws, #10 x 3\"", "Wood plugs or buttons"] },
    5: { tools: ["random-orbit-sander", "lathe"], materials: ["Shaker pegs, 3-1/2\"", "Wood glue", "Clear interior finish (hardwax oil or wipe-on poly)"] },
    6: { tools: ["drill-driver"], materials: ["Wood screws, #10 x 3\"", "Wood plugs or buttons"] },
  },
  "pine-bookcase": {
    0: { tools: ["combination-square", "tape-measure", "clamps-bar"], materials: ["Pine boards, 1x10 (3/4\" x 9-1/4\" actual)"] },
    1: { tools: ["table-saw", "router"], materials: ["Pine boards, 1x10 (3/4\" x 9-1/4\" actual)"] },
    2: { tools: ["router"], materials: ["Plywood, 1/4\", for the back"] },
    3: { tools: ["clamps-bar"], materials: ["Wood glue"] },
    4: { tools: ["drill-driver"], materials: ["Plywood, 1/4\", for the back", "Brad nails, 1\""] },
    5: { tools: ["drill-driver", "random-orbit-sander"], materials: ["Wood screws, #8 x 1-1/4\"", "Paint or clear interior finish", "Sandpaper, assorted grits"] },
  },
  "platform-bed-frame-queen": {
    0: { tools: ["planer", "jointer"], materials: ["Ash, 8/4, for legs and rails"] },
    1: { tools: ["clamps-bar"], materials: ["Ash, 8/4, for legs and rails", "Wood glue"] },
    2: { tools: ["table-saw"], materials: [] },
    3: { tools: ["router", "drill-press", "chisels", "marking-gauge"], materials: [] },
    4: { tools: ["drill-press", "drill-driver"], materials: ["Bed bolt / barrel nut hardware kit"] },
    5: { tools: ["table-saw"], materials: ["Ash, 4/4, for headboard panel and slat ledgers"] },
    6: { tools: ["drill-driver"], materials: ["Ash, 4/4, for headboard panel and slat ledgers"] },
    7: { tools: ["random-orbit-sander"], materials: ["Clear interior finish (hardwax oil or wipe-on poly)", "Sandpaper, assorted grits"] },
    8: { tools: ["drill-driver"], materials: ["Bed bolt / barrel nut hardware kit", "Poplar or pine, 4/4, for slats"] },
  },
  "rolling-shop-cart": {
    0: { tools: ["tape-measure"], materials: [] },
    1: { tools: ["circular-saw", "table-saw"], materials: ["Birch or shop-grade plywood, 3/4\", 4x8"] },
    2: { tools: ["pocket-hole-jig", "drill-driver", "clamps-bar"], materials: ["Pocket hole screws, 1-1/4\"", "Wood glue"] },
    3: { tools: ["drill-driver"], materials: ["Pocket hole screws, 1-1/4\""] },
    4: { tools: ["drill-driver", "impact-driver"], materials: ["Locking swivel casters, 3\""] },
    5: { tools: ["combination-square"], materials: ["Clear interior finish (hardwax oil or wipe-on poly)"] },
  },
  "shaker-step-stool": {
    0: { tools: ["clamps-bar", "combination-square"], materials: ["Hard maple, 4/4"] },
    1: { tools: ["table-saw", "router"], materials: ["Hard maple, 4/4"] },
    2: { tools: ["jigsaw", "band-saw", "random-orbit-sander"], materials: [] },
    3: { tools: ["combination-square"], materials: [] },
    4: { tools: ["clamps-bar", "drill-driver"], materials: ["Wood glue", "Wood screws, #8 x 1-1/4\""] },
    5: { tools: ["router", "random-orbit-sander"], materials: ["Paint or clear interior finish", "Sandpaper, assorted grits"] },
  },
  "turned-pepper-mill": {
    0: { tools: [], materials: ["Pepper mill mechanism kit (10\")"] },
    1: { tools: ["table-saw"], materials: ["Turning blank, 3\" x 3\" x 10\""] },
    2: { tools: ["drill-press"], materials: [] },
    3: { tools: ["lathe"], materials: [] },
    4: { tools: ["lathe"], materials: [] },
    5: { tools: ["lathe", "sandpaper"], materials: ["Sandpaper, assorted grits"] },
    6: { tools: ["lathe"], materials: ["Pepper mill mechanism kit (10\")", "Food-safe mineral oil"] },
  },
  "wall-mounted-tool-cabinet": {
    0: { tools: ["router", "drill-driver", "combination-square"], materials: ["Birch plywood, 3/4\", 4x8", "Plywood, 1/2\", for the back", "Wood screws, assorted"] },
    1: { tools: ["table-saw"], materials: ["Hardwood, 3/4\", for the French cleat"] },
    2: { tools: ["drill-driver"], materials: ["Hardwood, 3/4\", for the French cleat", "Wood screws, assorted"] },
    3: { tools: ["table-saw", "circular-saw"], materials: ["Birch plywood, 3/4\", 4x8"] },
    4: { tools: ["drill-driver"], materials: ["Piano hinge or butt hinges", "Magnetic catches"] },
    5: { tools: ["drill-driver"], materials: ["Lag screws, 3\", for mounting into studs"] },
    6: { tools: ["random-orbit-sander"], materials: ["Clear interior finish (hardwax oil or wipe-on poly)"] },
  },
  "workbench-with-vise": {
    0: { tools: [], materials: [] },
    1: { tools: ["table-saw", "jointer"], materials: ["Hard maple, 8/4, for the top"] },
    2: { tools: ["clamps-parallel", "hand-plane"], materials: ["Waterproof wood glue"] },
    3: { tools: ["hand-plane", "straight-edge"], materials: [] },
    4: { tools: ["chisels", "drill-driver"], materials: ["Hard maple or ash, 8/4, for the base", "Bench bolts / barrel nuts"] },
    5: { tools: ["drill-press"], materials: ["Bench dogs, 3/4\""] },
    6: { tools: ["chisels", "drill-driver"], materials: ["Front vise (quick-release, 9-10\")"] },
    7: { tools: ["random-orbit-sander"], materials: ["Boiled linseed oil / wax finish"] },
  },
};

const arr = (xs) => '[' + xs.map((x) => JSON.stringify(x)).join(', ') + ']';

function emitStep(step, tag) {
  const tools = (tag?.tools ?? []).filter((t) => t);
  const mats = (tag?.materials ?? []).filter((m) => m);
  let s = '{ "title": ' + JSON.stringify(step.title) + ', "body": ' + JSON.stringify(step.body);
  if (tools.length) s += ', "tools": ' + arr(tools);
  if (mats.length) s += ', "materials": ' + arr(mats);
  return s + ' }';
}

function stepsArraySpan(text) {
  const key = text.indexOf('"steps"');
  if (key < 0) throw new Error('no steps key');
  const start = text.indexOf('[', key);
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return [start, i]; }
  }
  throw new Error('unterminated steps array');
}

let files = 0;
for (const file of readdirSync(PLANS_DIR).filter((f) => f.endsWith('.json')).sort()) {
  const path = join(PLANS_DIR, file);
  const text = readFileSync(path, 'utf8');
  const data = JSON.parse(text);
  const slug = data.slug;
  const map = TAGS[slug] ?? {};

  const toolSlugs = new Set(data.tools.map((t) => t.slug));
  const matNames = new Set(data.materials.map((m) => m.name));

  data.steps.forEach((step, i) => {
    for (const t of map[i]?.tools ?? []) {
      if (!toolSlugs.has(t)) throw new Error(`${slug} step ${i + 1}: tool "${t}" is not declared by the plan`);
    }
    for (const m of map[i]?.materials ?? []) {
      if (!matNames.has(m)) throw new Error(`${slug} step ${i + 1}: material "${m}" is not declared by the plan`);
    }
  });

  const items = data.steps.map((step, i) => '    ' + emitStep(step, map[i])).join(',\n');
  const [s0, s1] = stepsArraySpan(text);
  const next = text.slice(0, s0) + '[\n' + items + '\n  ]' + text.slice(s1 + 1);

  if (next !== text) writeFileSync(path, next);
  files++;
}
console.log(`apply-step-tags: processed ${files} plans.`);
