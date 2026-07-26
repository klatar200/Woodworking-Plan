# DESIGNER UPGRADE SPEC — source: cuttingboarddesigner.com

FORMAT: agent-execution spec. Not a report. No narrative.
CONSUMERS: Claude Code / Cursor agents implementing changes to `src/lib/board-designer/**` and `src/components/designer/**`.
AUTHORISATION: owner of cuttingboarddesigner.com granted Keagan permission to use observed data. Scope = behaviour, algorithms, constants. NOT their image assets (see ESC-5).
SOURCE FIDELITY: all facts in §2–§3 read from their published source maps (`/static/js/main.d2b0a985.js.map`, 92 TS files) or verified live. All facts in §1 read from this repo.

---

## §0 GUARD RAILS — READ BEFORE ANY EDIT

### G0.1 Objective
Upgrade our board designer. Adopt proven mechanics from the reference site; exceed it where cheap. Do not clone it.

### G0.2 Hard stops — halt and escalate to Keagan, do not proceed
- Any item marked `BLOCKED:ESC-n`.
- Any change that displays a dollar figure on a public surface.
- Any change adding a route to `src/lib/public-routes.ts`.
- Any change to `wasteFactor` semantics that alters already-saved designs' output without a migration.
- Any third-party asset (image, font, data set) entering the repo.
- Discovery that an item in §4 is already implemented → mark REDUNDANT, do not build, report.

### G0.3 Prohibited actions
- Do not copy image files or image URLs from the reference site (ESC-5).
- Do not delete or weaken an existing guard test to make new work pass. Extend it.
- Do not remove `formatInches` fraction output or reintroduce `formatCents`/`formatCostRange`.
- Do not invert `src/lib/public-routes.ts` to a denylist.
- Do not rebuild anything in §1.2.
- Do not implement more than one sprint's items per commit block (CLAUDE.md §4).
- **Do not add a difficulty or effort rating to designer output.** `difficulty` (1–5) is a *catalog* concept only — it lets a browse user judge workload without opening a plan. A design the user authored carries no equivalent uncertainty. It appears in 19 catalog files and **zero** designer files; keep it that way. This applies to generated designs, build steps (E1), print sheets, and the library list. H7 outputs concrete counts (clamps, glue-up splits), never a score.

### G0.4 Per-item completion protocol
1. Confirm every path in `FILES` exists before editing.
2. Implement `CHANGE`.
3. Run the suites in `GUARD` — all must pass unchanged.
4. Verify every line of `ACCEPT`.
5. If `ACCEPT` cannot be met, stop and report. Do not partially land.

### G0.5 Test execution constraint
Repo `node_modules` is Windows-native. Run tests from a `/tmp` clone: `git clone` → `npm ci` → `npx prisma generate` → `npx vitest run <file>`. Never `git` against this repo from the sandbox.

---

## §1 CURRENT STATE — this repo

### §1.1 Model (`src/lib/board-designer/types.ts`)
```
BoardDesignConfig v2 {
  schemaVersion: 2, name, grain: 'edge'|'end',
  sourceLengthIn,      // EDGE only
  sliceThicknessIn,    // END only
  kerfIn, wasteFactor,
  panels: Panel[],     // {id,label,thicknessIn,strips[]}
  rowPattern: RowStep[],  // {panelId, transform: none|rot180|mirrorX|mirrorY}
  rowCount
}
Strip { id, speciesId, widthIn, repeat, miter?: {speciesId, angleDeg, corner} }
```
CAPS: 4 panels × 40 strips (≤80 total), 24 rowPattern steps, rowCount 60, name 80ch, `MAX_CONFIG_BYTES` 32 KiB (measured max 14,893 B).

### §1.2 REDUNDANCY REGISTRY — EXISTS. DO NOT REBUILD.
| Capability | Location | Note |
|---|---|---|
| Undo/redo + coalescing | `board-designer/history.ts` | 14 config actions, `HISTORY_CAP` 50, `coalesceKeyFor` |
| Strip add/duplicate/delete/move±1 | `history.ts` ConfigAction | drag-reorder extends `move-strip`, is not new |
| Panel add/delete/update | `history.ts` | |
| Row add/delete/update | `history.ts` | |
| 3D preview + orbit controls | `components/designer/r3f-*.tsx` | supersedes their ±90° rotate |
| WebGL fallback → SVG | `board-preview.tsx`, `board-diagram.tsx` | |
| Export PNG (named file) | `board-preview.tsx` | better than their hardcoded filename |
| Print sheet | `app/designer/[id]/print/page.tsx` | diagram, per-panel tables, row order, bd-ft, miter offcut note |
| Cut optimizer | `optimizer-panel.tsx` → `design-cut-plan.ts` → `lib/cut-optimizer.ts` | supersedes their single-rectangle model |
| Shopping list | `design-board-feet.ts`, unit `"board feet"` | |
| Warnings engine | `panel-geometry.ts` + `metrics.ts` | panel-width mismatch, deleted panel, empty, >24″ planer, miter closure ×2 |
| Miter geometry + closure | `miter-geometry.ts`, `hexagon-criteria.ts` | they have none |
| Templates (9) | `templates.ts` | incl. Plaid, Brick, Diagonal, Thue-Morse, Harlequin |
| Species (15) | `species.ts` | ids permanent, append-only |
| Design CRUD + authz | `lib/board-designs.ts`, `app/actions/board-designs.ts` | create/update/delete; **no duplicate action** |
| Library list + delete | `app/designer/library/page.tsx` | **no thumbnails, no duplicate** |
| Tape fractions | `lib/format.ts` `formatInches` | |

### §1.3 CONFLICT REGISTRY — existing decisions that specific items would break
| Item | Conflict | Required action |
|---|---|---|
| I3 | `designer-narrow.tsx` read-only below `lg` is a **logged decision** (DECISIONS_LOG 2026-07-26, Sprint 54) with byte-exact notice strings exported as constants | Reversing requires a new DECISIONS_LOG entry. ESC-6. |
| C19 | CLAUDE.md invariant: dimensions are tape fractions, never decimals. mm has no fractional form | Needs an explicit rule before implementation. ESC-7. |
| D1 | `kerfIn`/`wasteFactor` are read by `design-cut-plan.ts`, `optimizer-panel.tsx`, `panel-geometry.ts`, `serialize.ts` | schemaVersion 3 + migration + defaulting rule for existing rows |
| E3e | Plaid already exists as a template (§1.2) | Item is a *parametric generator*, not new geometry. Same for Brick, DNA. |
| ESC-1 | `format.test` asserts `formatCents`/`formatCostRange` absent | Scope the assertion; do not delete it |
| B3/B9 | Raising strip/panel caps re-opens `MAX_CONFIG_BYTES` | Re-measure; `board-designer-config-budget.test.ts` guards |

### §1.4 INVARIANT REGISTRY — must remain true; guard test named
| Invariant | Guard |
|---|---|
| `layoutTopFace` output stable for existing configs | `board-designer-layout.test.ts`, `board-3d-layout.test.ts`, `board-diagram.test.tsx` |
| Miter closure detection | `board-designer-miter.test.ts`, `board-designer-wedge-closure.test.ts`, `board-designer-harlequin.test.ts` |
| Metrics + board feet | `board-designer-metrics.test.ts`, `board-designer-board-feet.test.ts` |
| v1→v2 config migration | `board-designer-v2-migration.test.ts` |
| Config byte budget | `board-designer-config-budget.test.ts` |
| Design authz (user-scoped) | `board-designs-authz.test.ts` |
| Print sheet content | `designer-print.test.tsx` |
| Serialisation schema | `board-designer-serialize.test.ts` |
| Species ids | `board-designer-species.test.ts` |
| No dollar formatters | `format.test.ts` |
| Private routes uncached | `offline.test.ts` "covers every private surface" |
| Token/contrast/theme | `contrast.test.ts`, `dark-theme.test.ts` |

---

### §1.5 BUILD_PLAN ALIGNMENT — items already known to the roadmap
Several spec items are **not new proposals**; BUILD_PLAN already records them as deferred with a stated blocker. Cite the existing entry when scoping; do not present as discovery.

| Spec item | BUILD_PLAN record | Implication |
|---|---|---|
| E3a Chevron | §4 line 66 — deferred: "closed hex needs a richer primitive (e.g. two miters/strip — **contract change**). Each needs its own visual verification" | Confirms B4 is the prerequisite they already anticipated. Sequencing in §6 is correct |
| E3b ZigZag | §4 line 67 — deferred: "still need a **Cell or Strip contract change** beyond optional `wedge`" | Same. B4 unblocks both |
| C7 drag reorder · C15 thumbnails · B9 share links | §4 line 50 — "Remaining U7 items (share links, custom species, drag reorder, thumbnails) **stay deferred**, not a bundled unit" | Already-known deferrals. Each needs its own §4 row |
| C-group interactive editing | §4 line 68 — "wider 'Canva-like' editing/export set (item 5b) — open-ended; **needs a concrete behaviour list** before it can be scoped" | **§4 group C of this spec IS that behaviour list.** Cite it to unblock 5b scoping |
| A6, C19 metric | §4 line 72 ⛔ + FUTURE_IDEAS line 11 | DO-NOT-BUILD |
| D2 dollar prices | §4 line 73 do-NOT-build + BUSINESS_PLAN line 30 | See §5.1 CONFLICT |

### §1.6 PROCESS PRECONDITIONS — before any sprint starts
1. **BUILD_PLAN §4 has no Sprint 65 row.** §4 is the authoritative status table (BUILD_PLAN header). A row must exist before implementation begins.
2. **Scorecard category 6 = Mobile/offline /10 (PWA-first)** on every sprint. The C group is desktop-only authoring chrome (Sprint 54 gate at `lg`). Either budget the cat-6 loss explicitly or pair each C sprint with a mobile-visible deliverable. Sprint 54 set the precedent; it scored 98 by shipping the read-only narrow surface alongside. **A1–A4 is unaffected** — pure math, visible on every surface including print.
3. **Test-count line** (BUILD_PLAN line 48, currently `1228/1228 across 107 files`) must be updated at each sprint close. A1–A4 changes board-feet expectations in at least 4 suites.
4. **DoD §5: "no feature outside listed deliverables."** Group headings in §4 of this spec are not deliverables — enumerate the specific items in the sprint's §4 row.

---

## §2 REFERENCE MECHANICS — verified, copyable

### §2.1 Generator interface (their `BoardBase`)
```
getRenderables(): Renderable[]          // ALL output derives from this
getDimensions()                          // derived, not stored
getIsRenderableHighlighted(r, sel)
getBoardDetails(settings): {idealStartingStock: [{label?, stock:[{material,dimensions}]}]}
handleSelectedSizeChange(r, size, dim) -> new instance
handleSelectedMaterialChange(r, material) -> new instance
previewSelectionToParamsPanelSelection(sel)
paramsPanelSelectionToPreviewSelection(sel)
scaleParams(params, factor)
static createRandom(materials, size)
static isDevOnly: boolean
getHash() = btoa(JSON.stringify({type,id,name,params,units}))

Renderable {
  rect{top,left,width,height},   // inches
  material: Material|null,
  rotate?: number,                // applied as SHEAR
  selectionSizeProp: 'height'|'width'|'both',
  metadata: <discriminated union per board type>
}
```
All mutators return NEW instances.

### §2.2 Pattern DSL
Grammar: `<size><KEY>[^]` space-separated. `^` = flip.
Three branded string types: `MaterialPatternString`, `SubBoardPatternString` (keys = A,B,C,D), `SizeOnlyPatternString`.
Parser NEVER throws: `parseFloat(x) || 0`, unknown key → `null`. No validation error state exists in their product.

Functions: `splitPatternString`, `parsePatternString`, `toPatternString`, `changePatternSize(p,i,size)`, `changePatternMaterial(p,i,mat)`, `scalePatternString(p,factor)`, `reversePatternString`, `spacePattern(p,0.25)`, `sumPattern`, `getMaterialsInPattern`, `swapMaterialInPatternString(p,from,to)`, `subpatternIndexToKey` (`charCode+'A'`), `getSubBoardThicknessesByKey`, `getMaxPatternFragmentSize`, `createRandomMaterialPattern(min,max,total,mats,prev?)`, `bumpSelection`, `getPatternInputSelection`.

Bump: `bumpNumberUp(n,b) = n + b − n%b` (snap to next multiple). IN `{bump:0.125, shiftBump:1}`; MM `{bump:1, shiftBump:10}`.
Caret→fragment: walk to whitespace both directions, count tokens before.

### §2.3 Stock formula
```
stockLength = (size + planeBuffer) × count + (count − 1) × kerf
```
Defaults: `kerf 0.125`, `planeBuffer 0.175`, `waste 0.20`, `pxPerInch 24`.
Verified vs their UI (Checkerboard walnut): `(1.5+0.175)×16 + 15×0.125 = 28.675"`; width `6×(1+0.175)+5×0.125 = 7.675"`; thickness `1.175"`; `fbm 1.796`.
Chevron trig: `thickness = rowHeight/cos θ`; `width = 2·tanθ·rowHeight + Σ(cosθ·size + planeBuffer + kerf) − kerf`.

### §2.4 Rendering
Canvas 2D. Content canvas + separate highlight-overlay canvas.
- Tile species image into rect; never stretch (`targetW = sourceW`).
- Texture origin randomised per piece, memoized on `(material, metadata, rect.h×px, rect.w×px)`.
- Mirror-flip alternate tiles (`ctx.scale(±1,±1)`) to hide seams.
- Angle = shear: `ctx.setTransform(1, 0, tanθ, 1, offset, 0)`. Not rotation.
- Highlight: `setLineDash([2,2])`, `lineWidth 2`, white.
- Hit-test: `rotateCoord` → `descaleCoord` → `findRenderableFromCoord`. No per-piece DOM.

### §2.5 Popular board params — verbatim
Species codes: A Ash · B Beech · BL Bloodwood · BU Bubinga · BY Birch(Y) · C Cherry · CH Chechen · J Jatoba · M Maple · P Padauk · PH PurpleHeart · S Sapele · W Walnut · WE Wenge · YH YellowHeart · Z Zebrawood

```
Checkerboard  Strips          {numRows:16,rowHeight:1,thickness:1.5,flip:true,
                               pattern:"1W 1M 1W 1M 1W 1M 1W 1M 1W 1M 1W 1M"}
Fade          Strips          {numRows:16,rowHeight:1,thickness:1.5,flip:true,
                               pattern:"1W 0.5M 0.5W 1.5M 0.5W 1.5M 1.5M 1.5M 0.5W 1M 1W 0.5M"}
Mr. Bobby     Strips          {numRows:16,rowHeight:1,thickness:1.5,flip:true,
                               pattern:"1.8M .6W 1.2M .6W 1.2M .6W 1.2M .6W 1.2M .6W 1.2M .6W 1.2M"}
Shelby        Strips          {numRows:16,rowHeight:1,thickness:1.5,flip:true,
                               pattern:"1.3M 2.6M 2W .3M 2W 1.3M 2.6M"}
DNA           StripsAdvanced  {thickness:1.5,
                               pattern:".5D .5C .5A .5C^ .5D^ .5D^ .5C^ .5B .5C .5D" ×3.5,
                               subpatterns:[4 × 25-fragment .5M/accent strings]}
Brick         StripsAdvanced  {thickness:1.5,pattern:"1A .25B 1A^ .25B …",
                               subpatterns:["1.5W .25M ×9 .75W","8.25M 8.25M"]}
Chevron       Chevron         {numRows:16,rowHeight:1,thickness:1.5,rotate:30,
                               pattern:"1M 1W 1M 1W 1M 1W 1M 1W 1M 1W 1M 1W 1M"}
Pinwheel      Pinwheel        {numVertical:8,numHorizontal:6,thickness:1.5,
                               pattern:".75M .5W .25M .5W"}
Zig Zag       ZigZag          {numVertical:8,numHorizontal:6,thickness:1.5,
                               pattern:"1M .25W .25M .5W"}
Bubble        QuarterSquare   {wood1:M,wood2:W,thickness:1.5,
                               pattern:".2 .28 .36 .5 .6 .76 .96 1.16 1.32"}
Weave         Weave           {pattern:".25W 1M .25W",horizontalSize:3,verticalSize:5,
                               thickness:1.5,background:"1.5C"}
Plaid         Plaid           isDevOnly=true — HIDDEN IN PROD
```
KEY FACT: Checkerboard/Fade/Mr.Bobby/Shelby are ONE generator, different width strings. DNA/Brick are ONE generator = our `panels[] + rowPattern[]`. Genuinely new geometry = Chevron, Pinwheel/ZigZag, QuarterSquare, Weave only.

### §2.6 Geometry per generator
- Strips: `flip` reverses pattern on odd rows.
- StripsAdvanced: pattern = row list; each row → subpattern letter + row height; `^` reverses slice.
- Chevron: rectangles; shear ±θ alternating per row.
- Pinwheel/ZigZag: grid `numH × numV`; orientation + reversal from `(row%4, col%2)`.
- QuarterSquare: ring widths only; mirror `[...r, ...r.slice(0,-1).reverse()]`; alt rows swap wood1/wood2; always square.
- Weave: unit tiled h×v in background lattice; `dim = n×patternTotal + bg×(n+1)`.

### §2.7 Build steps
Each step illustration = a synthetic board config through the same renderer. Zero bespoke diagram code.
Strips: cut strips (per-species widths @ computed length) → first glue-up + plane to row height → cut cross strips @ `thickness + planeBuffer` → rotate 90° → flip alternate (only if `flip`) → final glue-up + plane.
StripsAdvanced: Overview → ×3 per sub-board (cut/glue/crosscut) → arrange (`spacePattern`) → final glue-up.
NOT IMPLEMENTED by them: Weave, Chevron, QuarterSquare, Plaid.

### §2.8 Their defects — DO NOT PORT
- Weave stock length `(u − 1*kerf)`; correct is `(u−1)*kerf`.
- `drawRenderables` uses `return` where `continue` is meant; one null aborts the draw.
- `deleteBoard` deletes locally only; no cloud delete.
- No CSP, no service worker, published source maps, dead Universal Analytics.
- Decimal inches, not fractions.

---

## §3 CORRECTED ANALYSIS — group A

Our model computes **finished volume × (1 + wasteFactor)**. Theirs computes **stock to buy**. We are not missing a term; `wasteFactor` (default 0.15) is intended to absorb kerf + planing.

Defect: a flat percentage cannot scale with cut count.
```
12" panel, kerf .125, buffer .175
 12 × 1" strips : 11 rips × .125 = 1.375" (11.5%) + 12 × .175 = 2.1" (17.5%) = ~29%
  5 wide strips :  4 rips × .125 =   0.5" ( 5.0%) +  5 × .175 = .875" ( 8.8%) = ~14%
```
Adequate on coarse designs, ~15pts short on fine-stripe designs.
THEREFORE: A1–A4 = replace flat percentage with a computed allowance; retain `wasteFactor` for defects/snipe only. Update the `wasteFactor` field label in `board-settings.tsx`. This is a rework, not a patch.

---

## §4 WORK ITEMS

Schema: `STATUS` · `DEP` · `GOAL` · `FILES` · `CHANGE` · `DO NOT` · `ACCEPT` · `GUARD`

### GROUP A — material math

**A1–A4 · Computed cut allowance**
- STATUS: READY
- GOAL: replace flat waste% with computed kerf+planing allowance.
- FILES: `src/lib/board-designer/panel-geometry.ts`, `design-board-feet.ts`, `types.ts`, `components/designer/board-settings.tsx`
- CHANGE: add `planeBuffer` (default 0.175). Per panel: `stockWidth = Σ(widthIn×repeat + planeBuffer) + (stripCount−1)×kerf`; `requiredLength = (sliceThicknessIn + planeBuffer)×rows + (rows−1)×kerf` (end) / `sourceLengthIn + planeBuffer` (edge); `stockThickness = panel.thicknessIn + planeBuffer`. Board feet from stock dims, then `× (1 + wasteFactor)`.
- DO NOT: double-count — `design-cut-plan.ts` already passes `wasteFactor: 0`; keep it. Do not change `formatInches`.
- ACCEPT: 12×1″ maple/walnut panel yields ≥28% over finished volume; 5-strip panel yields ~14%; `wasteFactor` label reads "defects and snipe"; edge and end grain both covered.
- GUARD: `board-designer-board-feet`, `board-designer-metrics`, `cut-optimizer`, `designer-print`

**A5 · Angled-stock allowance** — STATUS: READY · DEP: A1 · GOAL: widen stock for mitered strips by `2·tanθ·thickness`. FILES: `design-board-feet.ts`, `miter-geometry.ts`. GUARD: `board-designer-miter`, `board-designer-harlequin`, `board-designer-wedge-closure`.

**A6 · mm board feet** — STATUS: BLOCKED:ESC-7

### GROUP B — architecture

**B1–B3, B13, B14 · Pattern DSL**
- STATUS: READY
- GOAL: add DSL as a second representation of `Strip[]` / `rowPattern[]`.
- FILES: NEW `src/lib/board-designer/pattern.ts`; `species.ts`
- CHANGE: implement §2.2 functions. Add permanent short code per species (`M`,`W`,`C`,`PH`…). Branded types. Parser never throws.
- DO NOT: replace `Strip[]` as the stored format — DSL is additive. Do not change species ids.
- OPEN (decide before landing, then record in this file): `Strip.repeat` has no analogue in their grammar. Either expand on serialise (loses authoring intent) or extend grammar (`3x1.5M`). Their model also has no `grain` concept; ours must keep `grain`/`sourceLengthIn`/`sliceThicknessIn`.
- ACCEPT: round-trip `Strip[] → string → Strip[]` is lossless for all 9 templates; garbage input returns size 0 / null species without throwing; ≥95% branch coverage on `pattern.ts`.
- GUARD: `board-designer-serialize`, `board-designer-species`, `board-designer-config-budget`

**B4, B6, B10, B11, B12, B15 · Generator interface**
- STATUS: READY · DEP: B1
- GOAL: make new board styles additive.
- FILES: NEW `src/lib/board-designer/generators/*`; `layout.ts`
- CHANGE: define interface per §2.1, superset with our `grain`. Attach `metadata` (panel, strip, row, cell index) + `selectionSizeProp` to every laid-out cell. Keep `layoutTopFace` as a thin adapter over `getRenderables()`.
- DO NOT: delete `layoutTopFace`. Do not add a generator in the same commit — pure refactor first.
- ACCEPT: all 12 suites in §1.4 pass unchanged; `layoutTopFace` output byte-identical for all 9 templates.
- GUARD: all of §1.4 rows 1–3, plus `designer-print`

**B5, B8 · Immutable board ops + scaleParams** — STATUS: READY · DEP: B4 · GOAL: `updateParams`/`rename`/`duplicate`/`scaleParams` return new instances. NOTE: `history.ts` already clones; integrate, do not duplicate.

**B7 · Labelled stock groups** — STATUS: READY · GOAL: metrics returns `[{label?, stock[]}]` not flat. FILES: `metrics.ts`, `metrics-panel.tsx`, print page. GUARD: `board-designer-metrics`, `designer-print`.

**B9 · Compact share serialisation** — STATUS: BLOCKED:ESC-2

### GROUP C — interaction

**C1, C2, C10, C11, C12 + I1, I2 · Interactive preview**
- STATUS: READY · DEP: B4, B6
- GOAL: click a piece → edit species/width; highlight siblings.
- FILES: `board-preview.tsx`, `board-diagram.tsx`, NEW selection-overlay component
- CHANGE: overlay layer; geometric hit-test (§2.4); anchored popover with size input `step=1/8` + species select; Escape clears; outside-click dismisses with opt-out class; highlight all cells matching `getIsRenderableHighlighted`.
- DO NOT: make canvas the only path. Their implementation is keyboard-inaccessible and screen-reader invisible; ours must not regress. Form stays source of truth.
- ACCEPT: piece selectable by keyboard; selection announced via ARIA live region; selection state expressible without canvas (SVG fallback + print); all edits route through existing `history.ts` actions so undo works.
- GUARD: `designer-shell`, `board-diagram`, `contrast`, `designer-history`

**C3, C4, C5, C6, C8, C9, C21 · Pattern field**
- STATUS: READY · DEP: B1
- GOAL: DSL text input with bump, caret-selection, swap-all, inline preview.
- FILES: NEW `components/designer/pattern-input.tsx`
- CHANGE: ArrowUp/Down = snap to next/prev ⅛″ multiple, Shift = 1″, multi-fragment, restore+expand selection. `selectionchange` listener maps caret → fragment → preview selection. "Swap All" popover. ⓘ tooltip listing every species code. Live mini-board under the field. Remove-subpattern button.
- ACCEPT: caret in `1W` + 2×ArrowUp → `1.25W`, selection `[0,5]`; bump dispatches one coalesced history entry per burst, not per keypress.
- GUARD: `designer-history`, `designer-shell`

**C7 · Drag to reorder** — STATUS: READY · DEP: C3 · NOTE: extends existing `move-strip` action; do not add a parallel reorder path.

**C13 · REDUNDANT** — we have r3f orbit controls, superior to ±90° rotate. DO NOT BUILD.

**C14 · Finished size on preview header** — STATUS: READY · S · FILES: `board-preview.tsx`.

**C15 · Library thumbnails + style label** — STATUS: READY · FILES: `app/designer/library/page.tsx`. NOTE: list+delete exist; add thumbnails only.

**C16 · New-design modal with template preview** — STATUS: READY · NOTE: `template-picker.tsx` exists as a flat button row; upgrade it, do not replace.

**C17 · Duplicate design** — STATUS: READY · GOAL: add `duplicateBoardDesignAction`. FILES: `app/actions/board-designs.ts`, `lib/board-designs.ts`, library page. GUARD: `board-designs-authz`.

**C18 · Random design** — STATUS: READY · DEP: B1, D3.

**C19 · Metric units** — STATUS: BLOCKED:ESC-7

**C20 · Persisted panel collapse state** — STATUS: READY · DEP: D1.

### GROUP D — global settings

**D1, D6–D9 · Settings split (schemaVersion 3)**
- STATUS: READY · DEP: A1
- GOAL: move machine settings out of per-design config.
- FILES: `types.ts`, `serialize.ts`, NEW `lib/user-settings.ts`, NEW settings page, `prisma/schema.prisma`
- CHANGE: `UserSettings { kerfIn, planeBuffer, wasteFactor, units, pxPerInch, planerWidthIn, theme }`. Persist as diff-vs-defaults. `schemaVersion: 3` drops `kerfIn`/`wasteFactor` from config.
- DO NOT: break v1→v2. Existing rows need a defaulting rule.
- ACCEPT: NEW `board-designer-v3-migration.test.ts` proves v1 and v2 configs both load; `design-cut-plan.ts`, `optimizer-panel.tsx`, `panel-geometry.ts` all read from the new source; `MAX_CONFIG_BYTES` re-measured.
- GUARD: `board-designer-v2-migration`, `board-designer-serialize`, `board-designer-config-budget`, `board-designs-authz`

**D2 · Per-species cost table** — STATUS: BLOCKED:ESC-1
**D3, D4, D5 · Random config, reset, zoom** — STATUS: READY · DEP: D1.

### GROUP E — features

**E1 · Build steps** — STATUS: READY · DEP: B4 · GOAL: per-style procedure, each step illustrated by a synthetic config through our renderer (§2.7). FILES: NEW `lib/board-designer/build-steps.ts`, NEW route. DO NOT: build a server PDF endpoint (CLAUDE.md invariant); reuse the print pattern. ACCEPT: covers edge and end grain; flip step emitted only when a row transform is present; every step diagram renders through `layoutTopFace`.

**E2 · Constrained random generator** — STATUS: READY · DEP: B1 · CHANGE: sizes on ⅛″, no adjacent repeats, truncate final fragment to fit target width.

**E3a Chevron / E3b Pinwheel+ZigZag / E3c QuarterSquare / E3d Weave** — STATUS: READY · DEP: B4 · Order as listed. Each behind `isDevOnly` until ACCEPT met.
**E3e Plaid** — STATUS: READY · NOTE: template exists (§1.3); this is parameterisation only.

**E4, E6 · Wood textures** — STATUS: BLOCKED:ESC-5
**E5 · +5 species** (Bubinga, Chechen, Jatoba, Wenge, Zebrawood) — STATUS: READY · DEP: B2 (assign codes in the same commit) · GUARD: `board-designer-species`.
**E7 · Anonymous local designs** — STATUS: BLOCKED:ESC-2
**E8 · Ephemeral random via hash URL** — STATUS: BLOCKED:ESC-2
**E9 · `spacePattern` exploded diagrams** — STATUS: READY · DEP: B1, E1.
**E10 · Preserve query string on redirect** — STATUS: READY · S.

### GROUP F — rendering
**F1–F6** — STATUS: BLOCKED:ESC-5. If ESC-5 resolves to procedural generation, F5 (sprite sheet) becomes unnecessary; F1–F4 stand as written.

### GROUP G — strategic
**G1 · Per-style SEO landing pages** — STATUS: READY · DEP: E3a · NOTE: their SPA is unindexable; our SSR is the advantage. Not permanent — they could add prerendering.
**G2 · Indexable shared designs** — STATUS: BLOCKED:ESC-2
**G3 · Designer ↔ plan catalogue cross-links** — STATUS: READY.

### GROUP H — domain intelligence (no equivalent on their side)

**H0 · Species data expansion**
- STATUS: BLOCKED:ESC-8 (needs a citable source before shipping as guidance)
- GOAL: add `densityLbFt3`, `jankaLbf`, `tangentialShrinkPct`, `dustSensitiser: boolean`, `openPore: boolean` to `species.ts`.
- BLOCKS: H1, H2, H3, H4, H8, H10, H12.
- DO NOT: invent values.

**H1 · Workshop dust/sensitisation note** — STATUS: BLOCKED:H0 · SCOPE: milling-dust hazard to the maker. NOT a food-safety claim — a cured, finished board of these species is not a consumer hazard. Do not word it as one.
**H2 · Wood-movement advisory** — STATUS: BLOCKED:H0 · SCOPE: advisory only ("acclimate, check MC"). Never a predicted-failure warning; moisture content dominates and we cannot know it.
**H3 · Board weight** — STATUS: BLOCKED:H0
**H4 · Janka / knife-friendliness** — STATUS: BLOCKED:H0
**H5 · End-grain planing warning** — STATUS: READY · no data dependency.
**H6 · Trim/squaring allowance** — STATUS: READY · DEP: A1.
**H7 · Glue-up practicality (clamp count, split suggestion)** — STATUS: READY · DEP: A1.
**H8 · Thickness sanity gates** — STATUS: BLOCKED:H0
**H9 · Machine capacity vs user's stated widths** — STATUS: READY · DEP: D1 · NOTE: replaces the hardcoded 24″ warning in `panel-geometry.ts`; do not add a second warning.
**H10 · Design value-contrast advisory** — STATUS: BLOCKED:H0 · DO NOT wire into `contrast.test`; that guards UI tokens for WCAG, this is design advice.
**H11 · Juice groove / feet / chamfer** — STATUS: READY · DEP: B4 · affects finished dims + material.
**H12 · Finish quantity from surface area** — STATUS: BLOCKED:H0
**H13 · Standard size presets** — STATUS: READY · S.
**H14 · Symmetry helpers (mirror, palindrome)** — STATUS: READY · DEP: B1.

### GROUP I — accessibility & mobile
**I1, I2** — folded into C1 block above.
**I3 · Editable narrow surface** — STATUS: BLOCKED:ESC-6
**I4 · `prefers-reduced-motion` on new transitions** — STATUS: READY.
**I5 · Tab order + ≥44px targets on all new controls** — STATUS: READY · applies to every C item.

---

## §5 ESCALATIONS — Keagan decides; agents must not proceed

### RESOLVED — DECISIONS_LOG 2026-07-26. Treat as binding.

| ID | Resolution | Unblocks |
|---|---|---|
| ESC-1 | ✅ **CLOSED — NO lumber pricing, estimated or otherwise** (Keagan 2026-07-26, after being shown the conflict). Tiers-only stands on every surface. **D2 → DO-NOT-BUILD.** `format.test` keeps its absence assertion unmodified — no scoping, no exception. The reference site's $/fbm table in §5.1 is competitive record only; never seed it | — |
| ESC-2 | **Deferred** until DSL + generator refactor land | — (B9, E7, E8, G2 stay BLOCKED) |
| ESC-5 | **Procedural generation** from species colour + noise. Do not copy their image files or URLs. F5 sprite sheet now unnecessary | F1–F4, E4, E6 |
| ESC-8 | **Dissolved.** Source = USDA Wood Handbook (public domain) | H0 → H1–H4, H8, H10, H12 |
| B1-OPEN | **Resolved:** extend grammar to `3x1.5M`. Do not expand to repeated tokens — fails lossless round-trip | B1 |

### STILL BLOCKED — do not proceed on dependents

| ID | Question | Recommendation | Blocks |
|---|---|---|---|
| ESC-3 | Build steps, new styles, settings page absent from BUSINESS_PLAN | Add before starting these | E1, E3*, D1-settings |
| ESC-6 | Reverse the Sprint 54 read-only narrow surface? Byte-exact notices logged DECISIONS_LOG 2026-07-26 | Touch-first editing is a real differentiator, but this is a logged reversal | I3 |

### ESC-7 — CLOSED, was never open
Metric was already decided against, twice: BUILD_PLAN §4 line 72 `metric/regional pricing ⛔ (2x4 doesn't convert honestly)` and FUTURE_IDEAS line 11 `convert-to-metric (a "2x4" doesn't convert honestly)`.
**A6 and C19 are now DO-NOT-BUILD, not BLOCKED.** Removed from the actionable count. Reopening requires Keagan adding metric to BUSINESS_PLAN.

## §5.1 ESC-1 — RESOLVED: no lumber pricing. Record of why.

Keagan 2026-07-26, after review: **"let's not include lumber pricing - even estimated."** D2 is DO-NOT-BUILD. Retained below so the reasoning is not re-litigated in a later session.

An earlier answer ("offer our estimation, user overwrites via settings") was given against an incompletely framed question — it cited only `format.test`, not the four documents below. Two were unknown to this spec at the time. Lesson for future escalations: **grep BUSINESS_PLAN, BUILD_PLAN and FUTURE_IDEAS for the feature before putting a question to Keagan.**

| Source | Text |
|---|---|
| **BUSINESS_PLAN line 30** (Cutting Board Designer entry, Keagan, 2026-07-24) | "Not a freemium clone; **no PRO paywall / dollar lumber UI**." — designer-specific, and the exact feature under discussion |
| **BUILD_PLAN §4 line 73** | "Do-NOT-build (decided out): **dollar figures/per-material prices** (`formatCents` deleted)" |
| **FUTURE_IDEAS line 8** | Local-lumber-price estimator parked — "no free perpetual licensed price source … scraping = legal + fragile + **confidently-wrong prices**. Superseded by cost-tiers-only" |
| **CLAUDE.md §7** | "Cost display: TIERS ONLY, no dollar figures anywhere public … `formatCents`/`formatCostRange` DELETED (structural); `format.test` asserts absence" |

The FUTURE_IDEAS entry independently anticipated the staleness objection raised when D2 was logged ("confidently-wrong prices") and rejected the feature on that basis. Shipping our own defaults is the strongest form of the thing that was rejected — we would be the source of the wrong price, not a scraped vendor.

**Cost estimator does appear in BUSINESS_PLAN line 28's Phase 3 roadmap** — but it shipped as `$`–`$$$$$` cost tiers, which is what line 30 and line 73 then locked in. "Cost estimator" in the roadmap is not authority for dollar figures.

**Required before D2 can proceed:** Keagan reverses BUSINESS_PLAN line 30 and BUILD_PLAN line 73 explicitly, in those files, with a changed reason. A DECISIONS_LOG entry alone is insufficient — BUILD_PLAN §4 is the authoritative status table and it currently forbids this.

**DECISIONS_LOG 2026-07-26 entry D2 is marked provisional pending that reversal.**

### D2 IMPLEMENTATION CONSTRAINTS (ESC-1 resolved form)
- Default $/bf table ships **with** the settings override path, not before it. Defaults without overrides = an unmaintained pricing claim.
- Every cost surface carries a dated estimate disclaimer.
- Add a documented price-refresh procedure to DEPLOYMENT.md.
- Reference-site defaults ($/fbm) for calibration only — re-derive against current US retail before shipping: Ash 6 · Beech 6 · Bloodwood 20 · Bubinga 10 · Birch 6 · Cherry 7 · Chechen 20 · Jatoba 7 · Maple 6.5 · Padauk 10.35 · PurpleHeart 10 · Sapele 6.5 · Walnut 11.4 · Wenge 16.65 · YellowHeart 10 · Zebrawood 20.
- Money stays integer cents (CLAUDE.md invariant).

---

## §6 AUTHORISATION REGISTRY — DECISIONS_LOG 2026-07-26 (D5–D8)

Only three things are buildable. Everything else needs a BUSINESS_PLAN addition by Keagan first.

| Status | Items | Basis |
|---|---|---|
| ✅ **AUTHORISED** | **E1** build steps (+ H1, H2, H5 safety content folded in) | D5, D7 |
| ✅ **AUTHORISED** | **D1, D3–D6, D9, C20, H9** global settings page (schemaVersion 3) | D5 |
| ✅ **NO BP NEEDED** | **A1–A4, A5, H6** material math | Defect fix in an existing shipped feature, not a new feature |
| ⛔ **NOT AUTHORISED** | E3a–e new board styles · H3, H4, H8, H10, H11, H13, H14 standalone domain items · C-group interactive editing (BUILD_PLAN line 68: item 5b needs Keagan to scope it) · B1–B3/C3–C9 DSL + pattern field (user-facing; rides with 5b) · F1–F6 textures · E2, E5, E7, E8, G1–G3 | D5; absent from BUSINESS_PLAN |
| ⛔ **DO-NOT-BUILD** | **D2** lumber pricing (D2/ESC-1) · **A6, C19** metric (ESC-7) · **I3** mobile editing (D6) · **C13** rotate preview (redundant) | Decided out |

### B4 — DEFERRED, no consumer
The generator-interface refactor existed solely to make new board styles additive. New styles are unauthorised, so nothing calls it. **Build steps do not need it:** step diagrams are synthetic `BoardDesignConfig`s through the existing `layoutTopFace` + `BoardDiagram`, which already serves our single style. This removes the highest-risk item in the spec from the near-term plan. Revive only if E3* is authorised.

## §6.1 EXECUTION ORDER — authorised work only

```
Sprint 65  A1–A4, H6          material math. No deps. Corrects a live defect.
Sprint 66  E1, E9, H1, H2, H5 build steps + safety content, via layoutTopFace
Sprint 67  D1, D3–D6, D9,     global settings, schemaVersion 3 + migration
           C20, H9
```
Sprint 67 is the higher-risk of the three (production data, migration). Do not combine it with another sprint's items.

**Every sprint in this programme:** budget the scorecard cat-6 (Mobile/offline /10) loss explicitly per D6, or pair with a mobile-visible deliverable. A1–A4 is unaffected — the numbers surface on the narrow read-only view and the print sheet.

---

## §7 ITEM COUNT
A 6 · B 15 · C 21 (1 REDUNDANT) · D 9 · E 14 · F 6 · G 3 · H 15 · I 5 = 94 items; 1 redundant, 20 blocked, 73 actionable. 7 escalations.

## §8 CHANGE LOG OF THIS SPEC
- v5 — ESC-1/2/5/8 and B1-OPEN resolved (DECISIONS_LOG 2026-07-26). ESC-1 resolved in a MODIFIED form: we ship default prices. Sprint 65 = A1–A4. Blocked count 20 → 12.
- v4.1 — added §0.3 rule: no difficulty/effort rating on designer output (catalog-only concept). Confirmed `difficulty` is absent from all designer source.
- v4 — converted from prose report to agent spec. Added §0 guard rails, §1.2 redundancy registry, §1.3 conflict registry, §1.4 invariant registry, per-item ACCEPT/GUARD/DO NOT. Added ESC-6/7/8. Marked C13 REDUNDANT. Verified all `FILES` paths against the repo.
- v3 — corrected group A severity (flat-% defect, not missing term); reframed H1 as dust not food safety; downgraded H2 to advisory; added ESC-5 texture licensing; added H0.
- v2 — added baseline, groups H and I, risk section.
- v1 — competitive report.
