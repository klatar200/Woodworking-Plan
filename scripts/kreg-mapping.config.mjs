/**
 * kreg-mapping.config.mjs — DRAFT mapping rules for importing kreg-plans.json
 * into the Notch plan schema (src/content/plan-schema.ts).
 *
 * Everything a human should be able to tune lives HERE, not in the transform.
 * Each block flags whether it is DIRECT (Kreg has the data) or a GAP-FILL
 * (Kreg has NO source data — the value is a documented assumption to review).
 */

/* ─────────────────────────── CATEGORY MAP ───────────────────────────
 * Kreg has ~98 granular categories; Notch has 6. A plan can carry several
 * Kreg categories — the transform takes the first that maps by PRIORITY order
 * below (most specific wins), else the keyword fallback, else DEFAULT.
 * DIRECT-ish: derived from Kreg's own categories[].
 */
export const CATEGORY_DEFAULT = 'furniture';

// Checked in priority order; first hit wins. Exact Kreg-category name → Notch slug.
export const CATEGORY_MAP = {
  'DIY Cutting Boards': 'cutting-boards',
  // shop-projects (jigs/fixtures/shop furniture) — before furniture so a "Workbench" isn't "furniture"
  'Workbenches': 'shop-projects', 'Workshop': 'shop-projects', 'Miter Saw Stations': 'shop-projects',
  'Clamp Racks': 'shop-projects', 'Dust Collection': 'shop-projects', 'Outfeed Tables': 'shop-projects',
  'Tool Storage': 'shop-projects', '2x4 Project Plans': 'shop-projects',
  // outdoor — before furniture so "Outdoor Furniture" isn't "furniture"
  'Outdoor Living': 'outdoor', 'Outdoor Furniture': 'outdoor', 'Planters': 'outdoor', 'Arbor': 'outdoor',
  'Compost Bins': 'outdoor', 'Cornhole Boards': 'outdoor', 'Outdoor Games': 'outdoor',
  'Bird Feeders': 'outdoor', 'Bird Houses': 'outdoor', 'Bike Stands': 'outdoor', 'Dog Houses': 'outdoor',
  'Grilling': 'outdoor', 'Adirondack Chairs': 'outdoor', 'Garden': 'outdoor',
  // storage
  'Storage and Organizing': 'storage', 'Built Ins and Cabinets': 'storage', 'Floating Shelves': 'storage',
  'Shelves': 'storage', 'Closet': 'storage', 'Garage Storage': 'storage', 'Garage Shelves': 'storage',
  'Storage Shelves': 'storage', 'Plant Shelves': 'storage', 'Ladder Shelves': 'storage',
  'Bathroom Shelves': 'storage', 'Coat Rack': 'storage', 'Hampers': 'storage', 'Drop Zone': 'storage',
  'Mudroom': 'storage', 'Kitchen Organization': 'storage', 'Spice Racks': 'storage', 'Garage': 'storage',
  'Bookcases': 'storage', 'Bookshelves': 'storage', 'Book Holders': 'storage', 'Closet ': 'storage',
  'Media Cabinets': 'storage', 'Vanities': 'storage', 'Bathroom': 'storage',
  // gifts & small projects
  'Gifts': 'gifts-and-small-projects', 'Holiday': 'gifts-and-small-projects', 'Decor': 'gifts-and-small-projects',
  'Serving Trays': 'gifts-and-small-projects', 'Candle Holders': 'gifts-and-small-projects',
  'Frames': 'gifts-and-small-projects', 'Clocks': 'gifts-and-small-projects', 'Centerpieces': 'gifts-and-small-projects',
  "Mother's Day Gifts": 'gifts-and-small-projects', "Father's Day Gifts": 'gifts-and-small-projects',
  'Building Blocks': 'gifts-and-small-projects', 'Arts and Crafts': 'gifts-and-small-projects',
  'Craft Area': 'gifts-and-small-projects', 'Hobby': 'gifts-and-small-projects', 'Gaming': 'gifts-and-small-projects',
  'Doll Houses': 'gifts-and-small-projects', 'Halloween': 'gifts-and-small-projects', 'Beverage': 'gifts-and-small-projects',
  'Pets': 'gifts-and-small-projects', 'Desk Accessories': 'gifts-and-small-projects', 'Drying Rack': 'gifts-and-small-projects',
  'Desk Organizers': 'gifts-and-small-projects', 'Kitchen': 'gifts-and-small-projects', 'Decor ': 'gifts-and-small-projects',
  'Candle Holders ': 'gifts-and-small-projects', 'Clocks ': 'gifts-and-small-projects', 'Book': 'gifts-and-small-projects',
  // furniture (broadest — last)
  'Bedroom': 'furniture', 'Living Room': 'furniture', 'Coffee Tables': 'furniture', 'End Tables': 'furniture',
  'Bed Frames': 'furniture', 'Dressers': 'furniture', 'Nightstands': 'furniture', 'Tables': 'furniture',
  'Seating': 'furniture', 'Sofa Tables': 'furniture', 'Desks': 'furniture', 'Office': 'furniture',
  'Benches and Chests': 'furniture', 'Buffet, Hutch, & Sideboards': 'furniture', 'Bars': 'furniture',
  'Bar Carts': 'furniture', 'Kitchen and Dining Tables': 'furniture', 'Entryway Table': 'furniture',
  'Entryway': 'furniture', 'Kid Spaces and Play Room': 'furniture', 'Furniture': 'furniture',
  'Farmhouse': 'furniture', 'Fireplace': 'furniture', 'Doors': 'furniture', 'Seating ': 'furniture',
};

// Keyword fallback when no exact Kreg category matched (checked in order).
export const CATEGORY_KEYWORDS = [
  [/cutting board/i, 'cutting-boards'],
  [/workbench|workshop|jig|clamp rack|outfeed|miter saw station|dust collection|tool storage/i, 'shop-projects'],
  [/outdoor|planter|garden|adirondack|arbor|cornhole|bird|dog house|compost|patio|deck/i, 'outdoor'],
  [/shelf|shelves|storage|cabinet|closet|organiz|rack|hutch|bookcase|pantry/i, 'storage'],
  [/gift|holiday|decor|tray|candle|frame|clock|toy|ornament|sign/i, 'gifts-and-small-projects'],
  [/table|chair|bed|dresser|desk|bench|nightstand|sofa|stool|couch/i, 'furniture'],
];

/* ─────────────────────────── DIFFICULTY MAP ─────────────────────────
 * DIRECT: Kreg difficulty (easy 522 / moderate 485 / advanced 126 / "x" 1).
 * Notch is 1–5; Kreg only spans 3 levels, mapped to the middle of the scale.
 */
export const DIFFICULTY_MAP = { easy: 2, moderate: 3, advanced: 4, x: 3 };
export const DIFFICULTY_DEFAULT = 3;
export const DIFFICULTY_LABEL = { 2: 'Beginner', 3: 'Intermediate', 4: 'Advanced' };

/* ─────────────────────────── TIME (ESTIMATED FROM PROCESS) ───────────
 * 🛑 Kreg has NO time data. G3 (Keagan 2026-07-23): estimate from the plan's
 * actual PROCESS — step count (assembly work) + cut-list rows (measuring &
 * cutting) — scaled by difficulty. Still an estimate, but grounded in the
 * plan's own shape, not a flat difficulty band. Returns {min,max} minutes.
 * NOTE: active bench time, not wall-clock — glue/finish drying is passive and
 * deliberately not added (it would make a simple table read as an all-day job).
 */
const TIME_DIFF_FACTOR = { 2: 0.85, 3: 1, 4: 1.3 };
export function estimateTimeFromProcess(difficulty, stepCount, cutRows) {
  const f = TIME_DIFF_FACTOR[difficulty] || 1;
  let min = Math.round((30 + stepCount * 18 + cutRows * 4) * f);
  let max = Math.round((45 + stepCount * 35 + cutRows * 9) * f);
  min = Math.max(30, Math.round(min / 15) * 15);        // floor + round to 15 min
  max = Math.max(min + 30, Math.round(max / 15) * 15);
  return { min, max };
}

/* ─────────────────────────── COST (ESTIMATED FROM MATERIALS) ─────────
 * 🛑 Kreg has NO cost data. G3: estimate MAX material cost from the plan's
 * actual wood_products + hardware, priced off the table below, then map to the
 * tier whose bound (plan-schema COST_TIER_BOUNDS) contains it. Notch shows
 * only the tier, so the cents just need to be self-consistent and grounded.
 * Prices are ballpark US retail per unit-as-sold (~8 ft board / full sheet),
 * 2026 — a documented ASSUMPTION table, tune freely.
 */
export const LUMBER_PRICE_CENTS = {
  '1x2': 350, '1x3': 500, '1x4': 650, '1x5': 800, '1x6': 900, '1x8': 1300, '1x10': 1600, '1x12': 2000,
  '2x2': 400, '2x3': 500, '2x4': 550, '2x6': 900, '2x8': 1300, '2x10': 1700, '2x12': 2100,
  '4x4': 1200, '4x6': 2000, '6x6': 3500,
};
export const SHEET_PRICE_CENTS = { '1/4': 3000, '3/8': 3800, '1/2': 4500, '5/8': 5000, '3/4': 6000, '1': 9000 };
const DEFAULT_BOARD_CENTS = 800;
const DEFAULT_SHEET_CENTS = 5000;
const HARDWARE_PER_ITEM_CENTS = 500; // glue, screws, pulls, hinges — flat per line

function qtyOf(s) { const n = parseInt(String(s), 10); return Number.isFinite(n) && n > 0 ? n : 1; }
function unitPriceCents(name, detail) {
  const hay = `${name} ${detail || ''}`.toLowerCase();
  if (/plywood|mdf|particle|osb|hardboard|melamine|panel/.test(hay)) {
    const th = hay.match(/(1\/4|3\/8|1\/2|5\/8|3\/4|1)\s*"/); return (th && SHEET_PRICE_CENTS[th[1]]) || DEFAULT_SHEET_CENTS;
  }
  const nom = hay.match(/\b([12468])\s*x\s*(\d+)\b/);
  if (nom) { const p = LUMBER_PRICE_CENTS[`${nom[1]}x${nom[2]}`]; if (p) return p; }
  return DEFAULT_BOARD_CENTS;
}
export function estimateCostFromMaterials(woodProducts, hardware) {
  let cents = 0;
  for (const w of woodProducts || []) cents += unitPriceCents(w.name, w.detail) * qtyOf(w.quantity);
  for (const h of hardware || []) cents += HARDWARE_PER_ITEM_CENTS * Math.min(qtyOf(h.quantity), 4);
  const max = Math.max(1500, Math.round(cents / 100) * 100); // floor $15, round to the dollar
  const min = Math.round((max * 0.6) / 100) * 100;
  // smallest tier whose max-bound contains this cost
  const tier = (max <= 5000 ? 'TIER_1' : max <= 15000 ? 'TIER_2' : max <= 35000 ? 'TIER_3' : max <= 75000 ? 'TIER_4' : 'TIER_5');
  return { tier, min, max };
}

/* ─────────────────────────── TOOL MAP ───────────────────────────────
 * Normalize a Kreg tool string (other_tools[] plain strings, or a branded
 * kreg_tools[].name) to a Notch tool SLUG (content/tools.json). Unmapped
 * tools are DROPPED and reported (candidates to add to tools.json).
 * Normalization: lowercase, collapse whitespace — Kreg is full of case
 * variants ("Miter Saw" / "Miter saw" / "miter saw").
 */
export const TOOL_EXACT = {
  'tape measure': 'tape-measure', 'measuring tape': 'tape-measure',
  'miter saw': 'miter-saw', 'table saw': 'table-saw', 'circular saw': 'circular-saw',
  'track saw': 'track-saw', 'band saw': 'band-saw', 'jigsaw': 'jigsaw', 'jig saw': 'jigsaw',
  'scroll saw': 'scroll-saw', 'hand saw': 'hand-saw', 'saw': 'hand-saw',
  'square': 'combination-square', 'combination square': 'combination-square', 'speed square': 'speed-square',
  'nail gun': 'brad-nailer', 'brad nailer': 'brad-nailer', 'finish nailer': 'brad-nailer',
  'stapler': 'staple-gun', 'staple gun': 'staple-gun',
  'clamps': 'clamps-bar', 'clamp': 'clamps-bar', 'bar clamps': 'clamps-bar', 'pipe clamps': 'clamps-bar',
  'parallel clamps': 'clamps-parallel', 'spring clamps': 'clamps-spring',
  'thickness planer': 'planer', 'planer': 'planer', 'jointer': 'jointer',
  'router': 'router', 'router table': 'router-table',
  'drill': 'drill-driver', 'drill/driver': 'drill-driver', 'driver': 'drill-driver', 'drill driver': 'drill-driver',
  'impact driver': 'impact-driver', 'drill press': 'drill-press',
  'pocket hole jig': 'pocket-hole-jig', 'pocket-hole jig': 'pocket-hole-jig', 'kreg jig': 'pocket-hole-jig',
  'doweling jig': 'doweling-jig', 'biscuit joiner': 'domino-biscuit-joiner', 'domino': 'domino-biscuit-joiner',
  'random orbit sander': 'random-orbit-sander', 'orbital sander': 'random-orbit-sander',
  'sander': 'random-orbit-sander', 'belt sander': 'belt-sander', 'sandpaper': 'sandpaper',
  'chisel': 'chisels', 'chisels': 'chisels', 'hand plane': 'hand-plane', 'block plane': 'block-plane',
  'card scraper': 'card-scraper', 'mallet': 'mallet', 'hammer': 'hammer',
  'level': 'level', 'straight edge': 'straight-edge', 'marking gauge': 'marking-gauge',
  'pencil': 'pencil', 'lathe': 'lathe', 'post hole digger': 'post-hole-digger',
  'safety glasses': 'safety-glasses', 'hearing protection': 'hearing-protection',
  'forstner bits': 'forstner-bits', 'forstner bit': 'forstner-bits', 'hole saw': 'hole-saw',
  'drill bit set': 'drill-bit-set', 'iron': 'edge-banding-iron', 'edge banding iron': 'edge-banding-iron',
  // spelling / variant catches found in the dry-run
  'mitre saw': 'miter-saw', 'rubber mallet': 'mallet', 'hacksaw': 'hand-saw', 'coping saw': 'hand-saw',
  'wood chisel': 'chisels', 'framing square': 'combination-square', 'carpenter square': 'combination-square',
  'palm sander': 'random-orbit-sander', 'cordless drill': 'drill-driver', 'hand drill': 'drill-driver',
  'orbital sander': 'random-orbit-sander', 'jig saw': 'jigsaw',
};
// Substring fallback for branded kreg_tools names ("Kreg 20V ... Trim Router" → router).
export const TOOL_KEYWORDS = [
  [/pocket[- ]?hole|kreg jig|k[45] master|foreman/i, 'pocket-hole-jig'],
  [/router table/i, 'router-table'], [/trim router|\brouter\b/i, 'router'],
  [/random orbit|orbital|\bsander\b/i, 'random-orbit-sander'], [/belt sander/i, 'belt-sander'],
  [/impact driver/i, 'impact-driver'], [/drill press/i, 'drill-press'], [/\bdrill\b|driver/i, 'drill-driver'],
  [/track saw/i, 'track-saw'], [/circular saw/i, 'circular-saw'], [/miter saw/i, 'miter-saw'],
  [/table saw/i, 'table-saw'], [/band saw/i, 'band-saw'], [/jig ?saw/i, 'jigsaw'], [/scroll saw/i, 'scroll-saw'],
  [/planer/i, 'planer'], [/jointer/i, 'jointer'], [/brad nailer|nail gun|nailer/i, 'brad-nailer'],
  [/stapler|staple/i, 'staple-gun'], [/\bclamp/i, 'clamps-bar'], [/\bjig\b/i, 'pocket-hole-jig'],
  [/mitre saw/i, 'miter-saw'], [/hacksaw|coping saw/i, 'hand-saw'], [/\bmallet\b/i, 'mallet'],
];
// Tools that are non-essential when present (layout / measuring / safety / consumable).
export const NON_ESSENTIAL = new Set([
  'tape-measure', 'combination-square', 'speed-square', 'straight-edge', 'marking-gauge',
  'pencil', 'level', 'safety-glasses', 'hearing-protection', 'sandpaper', 'clamps-bar',
  'clamps-parallel', 'clamps-spring', 'mallet',
]);
// Common Kreg tool strings with NO Notch equivalent — dropped, listed for review.
export const KNOWN_UNMAPPED = ['shop vacuum', 'air compressor', 'workbench', 'sawhorse', 'utility knife', 'compass', 'iron'];

/* ─────────────────────── NOMINAL LUMBER (cut list) ──────────────────
 * Nominal "1x3" → actual thickness × width (inches). Used to parse cut-list
 * `detail` where a row gives nominal + length ("1x3 96\"") rather than 3 dims.
 */
export const NOMINAL_LUMBER = {
  '1x2': [0.75, 1.5], '1x3': [0.75, 2.5], '1x4': [0.75, 3.5], '1x5': [0.75, 4.5], '1x6': [0.75, 5.5],
  '1x8': [0.75, 7.25], '1x10': [0.75, 9.25], '1x12': [0.75, 11.25],
  '2x2': [1.5, 1.5], '2x3': [1.5, 2.5], '2x4': [1.5, 3.5], '2x6': [1.5, 5.5], '2x8': [1.5, 7.25],
  '2x10': [1.5, 9.25], '2x12': [1.5, 11.25], '4x4': [3.5, 3.5], '4x6': [3.5, 5.5], '6x6': [5.5, 5.5],
};
export const SHEET_THICKNESS = { '1/4': 0.25, '3/8': 0.375, '1/2': 0.5, '5/8': 0.625, '3/4': 0.75, '1': 1 };

/* ───────────────────────────── MATERIALS ────────────────────────────
 * wood_products → unit "board"; hardware → unit "each" (Kreg gives no unit).
 */
export const MATERIAL_UNIT = { wood: 'board', hardware: 'each' };
