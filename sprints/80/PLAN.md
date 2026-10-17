# Sprint 80 — PLAN

Executor: **Claude Code** (implementing session, on `main`). Tasks are ordered; do not reorder.
T1–T3 are foundations that T4–T7 render. Grading is done by a fresh-context subagent
(`AGENTS.md` `Grade sprint NN`), never by the implementing session.

Read `GOAL.md` first — especially **"The model this sprint makes consistent"**. Every number this
sprint emits follows that one table. Its "Out of scope" list is enforced by the `R` gates.

**Sprint 78's lesson still governs:** the bar asserts what rendered sentences *say*. The exact
strings below are the contract, not suggestions.

Notation: `fi(x)` = `formatInches(x)` from `@/lib/format`. `buffer` = `planeBufferIn(config)`.
`Species` = `getSpecies(id)?.name ?? id`.

---

## T1 · One miter vocabulary

**Create** `src/lib/board-designer/miter-labels.ts`

- `export const MITER_CORNER_LABELS: Record<MiterCorner, string>` = `tl: 'Top left'`,
  `tr: 'Top right'`, `bl: 'Bottom left'`, `br: 'Bottom right'` — the strings that exist today, twice:
  `src/app/designer/[id]/print/page.tsx:16` and `src/components/designer/strip-list.tsx:23`.
- `export function formatMiterAngle(deg: number): string` — round to the nearest 0.5; a whole number
  renders `30°`; a half renders with `½`, e.g. `22.5` → `22½°`. Never a decimal point.
- `export const MITER_COMPOSITE_METHOD` = exactly
  `Mitered strips are ripped at an angle and glued to a contrasting wedge. One rip yields two composite strips (A-base/B-wedge and B-base/A-wedge).`
  — the first two sentences of the print note at `src/app/designer/[id]/print/page.tsx:258`.

Then:
- **print page** — delete its `CORNER_LABELS` (`designer/[id]/print/page.tsx:16`) and import the shared map. The miter
  column (`designer/[id]/print/page.tsx:143`) renders the angle through `formatMiterAngle`. The note at
  `designer/[id]/print/page.tsx:258` becomes `{MITER_COMPOSITE_METHOD}` followed by its existing third sentence,
  unchanged (`Board feet above count the area you keep if you use both offcuts; discarding the mates means buying roughly twice this.`).
- **strip-list** — `CORNER_OPTIONS` (`strip-list.tsx:23`) is derived from `MITER_CORNER_LABELS` in
  the order `tl, tr, bl, br`. No other change to that file.

**Guardrail:** after T1 there is exactly one corner map in `src/`. Do not add a third for the guide.

---

## T2 · One cut-length formula

`src/lib/board-designer/lumber-allowance.ts`

The end-grain strip length already exists inline at `lumber-allowance.ts:64`. Lift it out:

```ts
export function panelCutLengthIn(
  config: BoardDesignConfig,
  plan: Pick<PanelPlan, 'rows'>,
): number
```
- end grain → `(config.sliceThicknessIn + buffer) × plan.rows + max(0, plan.rows − 1) × config.kerfIn`
- edge grain → `config.sourceLengthIn`

`panelStockDims` uses it for `stockLengthIn`. Board feet must not move by a hair — R4 pins them.

**Guardrail:** `PanelPlan.requiredLengthIn` and `panel-geometry.ts`'s formula for it stay exactly as
they are (GOAL, Out of scope).

---

## T3 · Cut pieces — the one source of cut dimensions

**Create** `src/lib/board-designer/cut-pieces.ts`

```ts
export interface CutPiece {
  /** 'strip' = the strip itself. 'partner' = the wedge-species strip paired with a mitered strip. */
  role: 'strip' | 'partner';
  panelId: string;
  panelLabel: string;
  stripId: string;
  stripName: string;      // stripDisplayName(strip, indexInPanel)
  speciesId: string;      // strip.speciesId, or miter.speciesId for a partner
  count: number;          // strip.repeat
  thicknessIn: number;    // panel.thicknessIn
  ripWidthIn: number;     // strip.widthIn + buffer
  finishedWidthIn: number;// strip.widthIn
  lengthIn: number;       // panelCutLengthIn(config, plan)
  miter?: Miter;          // set on BOTH roles of a mitered strip
}
export function designCutPieces(config: BoardDesignConfig, panelPlan: PanelPlan[]): CutPiece[];
```

- Iterate `panelPlan` (not `config.panels`). Skip a plan whose panel is missing, and in end grain skip
  `rows === 0`. Edge grain's `panelPlan` already holds panel 0 only.
- Order: panel order, then strip order; a partner immediately follows its strip.
- Pure. It takes `panelPlan` so it never needs `calculateMetrics` or `layout.ts` (the Sprint 64 cheap
  path — `tests/board-designer-board-feet.test.ts:28`).
- Must not read `wasteFactor`. Waste is a board-feet concern only.

---

## T4 · Cut plan from cut pieces

**`src/lib/board-designer/to-parts.ts`** — `toParts(config)` becomes
`designCutPieces(config, panelGeometry(config).panelPlan)` mapped to `Part`:

| Part field | strip piece | partner piece |
|---|---|---|
| `id` | `stripId` | `${stripId}-partner` |
| `label` | `stripName` | `${stripName} partner` |
| `quantity` | `count` | `count` |
| `thicknessIn` / `widthIn` / `lengthIn` | `thicknessIn` / `ripWidthIn` / `lengthIn` | same |
| `material` | `Species` of `speciesId` | same |

When the cut pieces span **more than one used panel** (the same definition T5 uses — not
`config.panels.length`), labels keep today's `${panelLabel}: ${label}` prefix (`to-parts.ts:30`).
It no longer calls `calculateMetrics`.

**`src/lib/board-designer/design-cut-plan.ts`**
- Rewrite the header comment (`design-cut-plan.ts:10`): parts now carry `planeBuffer` in their width
  and end-grain length; `wasteFactor` is still forced to 0 and kerf is still charged per cut. A stale
  comment that argues against the code is worse than none (CLAUDE.md §7).
- `export function defaultCutPlanStockWidthIn(config: BoardDesignConfig): number | null` — the smallest
  value of `STOCK_WIDTHS_IN` that is ≥ the widest `Part.widthIn` from `toParts(config)`; `null` when
  there are no parts or none fits.

**The default must follow the design, not freeze at mount.** A new board opens as Checkerboard
(`src/app/designer/page.tsx:35`, default 3 1/2"); loading Plaid afterwards needs 11 1/4". A width
captured once at mount would report Plaid's parts as too wide. So the default is a *mode*, resolved
on every render, until the user picks a width.

**`src/components/designer/optimizer-panel.tsx`**
- `export type StockWidthChoice = number | null | 'auto'` — a number = rip from that width; `null` =
  "Buy each part's width"; `'auto'` = `defaultCutPlanStockWidthIn(config)` for the config being
  rendered, recomputed every time.
- `CutPlanStock.stockWidthIn` and the `stockWidthIn` prop become `StockWidthChoice`.
  `cutPlanGroupsForConfig` (`optimizer-panel.tsx:31`) treats a missing `stockWidthIn` as `'auto'` and
  resolves `'auto'` before calling `designCutPlan`.
- The internal width state (`optimizer-panel.tsx:69`) starts as `'auto'`. Keep the existing
  controlled/uncontrolled rule (`stockWidthProp !== undefined`) — `'auto'` is a value, not `undefined`.
- The width `<select>` shows the **resolved** width while `'auto'` (a number → that option; `null` →
  `rip-none`). Choosing an option stores that explicit number or `null`; nothing returns to `'auto'`.

**`src/components/designer/designer-dock.tsx:51`** — the controlled width state becomes
`useState<StockWidthChoice>('auto')`, so the tab badge and the panel resolve the same width.

**Guardrail:** `src/lib/cut-optimizer.ts` is untouched (R2). Everything here is designer-side.

---

## T5 · The guide says the same numbers

`src/lib/board-designer/build-steps.ts`

`BuildStepQuantity` (`build-steps.ts:23`) gains one optional field, `countNoun?: string` (singular).
Every quantity is derived from `designCutPieces(config, metrics.panelPlan)`. Delete
`ripQuantities`, `millQuantities` and `stripOrderLabels` as they stand (`build-steps.ts:68`, `:92`,
`:121`) — their replacements read cut pieces.

**Single vs multi.** "Used panels" = the distinct `panelId`s in the cut pieces. A step's *multi*
form applies when there is more than one used panel.

### Shared formatter (CARRY-2)
```ts
export function formatBuildQuantity(q: BuildStepQuantity): string
```
- `dims` = the present ones of `fi(lengthIn) + ' long'`, `fi(widthIn) + ' wide'`,
  `fi(thicknessIn) + ' thick'`, in that order, joined by `' × '`.
- With `countNoun`: `${label} · ${dims} — for ${count} ${noun}` where `noun` is `countNoun` when
  `count === 1`, else `countNoun + 's'`. Omit `' · ' + dims` when there are no dims.
- Without: `${count}× ${label}`, plus `' · ' + dims` when there are dims.

### Steps — ids and order
Edge: `mill-stock, rip-strips, crosscut-strips, [make-composite-strips], dry-fit, glue-up-panel, flatten, trim-ends, sand-finish`.
End: `mill-stock, rip-strips, crosscut-strips, [make-composite-strips], dry-fit, glue-up-panel, flatten-panel, crosscut-slices, arrange-rows, glue-up-board, flatten-board, trim-ends, sand-finish`.
`make-composite-strips` (title `Make composite strips`) appears **only** when a cut piece has a
`miter`. Without one, the id lists are exactly Sprint 78's.

### Steps — content
| id | detail | quantities |
|---|---|---|
| `mill-stock` | unchanged sentence logic, thicknesses from cut pieces | group by species + `thicknessIn`, first-seen order: `{ label: '<Species> stock', thicknessIn, count: Σ count, countNoun: 'strip' }` |
| `rip-strips` | `Rip each strip <fi(buffer)> over its finished width, then joint the glue edges down to finished width.` — when `buffer === 0`: `Rip strips to finished width.` | group by species + `ripWidthIn`: `{ label: '<Species> strips', count, widthIn: ripWidthIn }` |
| `crosscut-strips` | single: `Crosscut strips to <fi(len)>.` · multi: `Crosscut each panel's strips to its own length: <label> <fi(len)>; <label> <fi(len)>.` | group by panel + species + `ripWidthIn`: `{ label, count, lengthIn, widthIn: ripWidthIn }`, label `<Species> strips`, multi prefixed `<panelLabel>: ` |
| `make-composite-strips` | `MITER_COMPOSITE_METHOD + ' Pair each mitered strip with a partner strip of its wedge species, cut to the same size.'` | one per mitered strip: `{ label: '<stripName>: <Base> with <Wedge> wedge, <Corner> corner at <formatMiterAngle>', count }`, multi prefixed `<panelLabel>: ` |
| `dry-fit` | single: `Lay strips out in order: <entries>.` · multi: `Lay each panel's strips out in order — <label>: <entries>; <label>: <entries>.` Entry = `<stripName>[ ×<repeat> when > 1] (<Species> <fi(finishedWidthIn)>)`, joined `, `; a mitered strip's entry is `<stripName>[ ×<repeat>] (<Species> <fi(finishedWidthIn)>, <Wedge> wedge)`. Strip pieces only — partner pieces get no entry (they become composites) | — |
| `glue-up-panel` | unchanged | — |
| `flatten` (edge) | `Flatten the board to <fi(T)> thick.` | — |
| `flatten-panel` (end) | one distinct thickness: `Flatten the panel to <fi(T)> thick.` · several: `Flatten each panel to its thickness: <label> <fi(T)>; <label> <fi(T)>.` | — |
| `crosscut-slices` | single: `Crosscut the panel into <rows> slices at <fi(slice + buffer)> thick.` · multi: `Crosscut each panel into slices at <fi(slice + buffer)> thick: <label> <rows>; <label> <rows>.` — `rows` from that panel's `panelPlan` entry | — |
| `arrange-rows` | `Turn slices end-up and lay them out by repeating this <n>-step row pattern: <rows>.` where `<n>` = `config.rowPattern.length` and each row is `row <i> <TRANSFORM>` (single) or `row <i> <panelLabel> — <TRANSFORM>` (multi), joined `; `. `TRANSFORM` from `ROW_TRANSFORM_LABELS`. A step whose panel is missing uses the label `deleted panel`. | — |
| `glue-up-board` | unchanged | — |
| `flatten-board` | `Flatten the board to <fi(slice)> thick, removing about <fi(buffer)>.` — when `buffer === 0`: `Flatten the board to <fi(slice)> thick.` | — |
| `trim-ends` | `Square both ends.` (both grains) | — |
| `sand-finish` | unchanged | — |

Worked example — Checkerboard template, verbatim:
- `crosscut-strips`: `Crosscut strips to 14 1/4".`
- `crosscut-slices`: `Crosscut the panel into 8 slices at 1 11/16" thick.`
- `arrange-rows`: `Turn slices end-up and lay them out by repeating this 2-step row pattern: row 1 As cut; row 2 Turned end-for-end.`
- `flatten-board`: `Flatten the board to 1 1/2" thick, removing about 3/16".`
- `mill-stock` first quantity through the formatter: `Hard Maple stock · 1 1/2" thick — for 6 strips`
- `crosscut-strips` first quantity: `6× Hard Maple strips · 14 1/4" long × 1 11/16" wide`

**Guardrail — D7 is still gated.** Every new sentence above is a cut or a dimension. Add no reason,
warning, tool advice, or technique ("use a sled", "never…", eye/ear protection). If a step seems
to need one, it is out of scope — record it for Keagan in the sprint close.

**Guardrail:** `build-steps.ts` must still not mention `wasteFactor`, and still imports nothing from
react/next/prisma/components/app (`tests/board-designer-build-steps.test.ts:318`, `:333`).

---

## T6 · Say when a panel is unused

`src/lib/board-designer/panel-geometry.ts` — end grain only: for each panel whose row count is 0,
push exactly `"<label>" is not in the row pattern — it adds nothing to the board.` (straight double
quotes around the label). It does not change `complete`. Edge grain keeps its existing
`Extra panels are unused in edge grain.` and gets no new warning.

Add one witness for it to `WITNESSES` in `tests/board-designer-reachability.test.ts`, **and add that
witness's id to the `required` array** in the same file's "every static warnings.push literal has a
witness id" test — the Sprint 62 mechanism requires every user-facing warning to have one, and the
`required` list is what makes a missing witness fail.

---

## T7 · Every surface renders through the shared pieces

- **`src/app/designer/[id]/build/page.tsx`** — delete `quantityLine` (`designer/[id]/build/page.tsx:25`); render
  `formatBuildQuantity(q)` at `designer/[id]/build/page.tsx:70`.
- **`src/app/designer/[id]/print/page.tsx`**
  - The build-steps quantity cell (`designer/[id]/print/page.tsx:209`) renders `formatBuildQuantity` for each
    quantity, joined `'; '`. Delete the inline dims block.
  - The panel line (`designer/[id]/print/page.tsx:104`): `required length <fi(requiredLengthIn)>` →
    `cut length <fi(panelCutLengthIn(config, plan))>`.
  - The strip table column (`designer/[id]/print/page.tsx:121` header, `:146` cell): header `Cut length`,
    `data-label="Cut length"`, value `fi(panelCutLengthIn(config, plan))`.
- **`src/components/designer/metrics-panel.tsx`** — header `Required length` (`metrics-panel.tsx:47`) →
  `Cut length`; cell (`metrics-panel.tsx:58`) → `fi(panelCutLengthIn(config, plan))`. Add a `config`
  prop and pass it at `designer-dock.tsx:139`.

**Guardrail — CLAUDE.md §8, broken three times:** every class inside an `@media print` rule stays on
its element. Change text and values; do not rename, drop, or "modernise" `print-section`,
`print-table`, `numeric`, `mono`, `print-miter-note`, or any other retained class.

---

## T8 · Tests

New coverage (a new `tests/board-designer-cut-pieces.test.ts` plus additions to existing files):
- `designCutPieces` on Checkerboard, Plaid, Harlequin and a design with an unused end-grain panel:
  counts, `ripWidthIn`, `lengthIn`, partner pieces, unused panels absent.
- The worked-example strings in T5, asserted with `toBe` against the Checkerboard template.
- Plaid multi forms, verbatim:
  `Crosscut each panel's strips to its own length: Wide A 5 1/4"; Wide B 5 1/4"; Line 10 11/16".` and
  `Crosscut each panel into slices at 1 11/16" thick: Wide A 3; Wide B 3; Line 6.`
- Checkerboard with `rowCount: 20`: `Crosscut strips to 35 7/8".`
- Harlequin: the guide's `mill-stock`, `rip-strips` and `crosscut-strips` quantities include Walnut;
  `make-composite-strips` is present; `toParts` includes Walnut parts.
- `formatBuildQuantity` — the three shapes (countNoun, dims, neither), singular noun at count 1.
- `formatMiterAngle(30) === '30°'`, `formatMiterAngle(22.5) === '22½°'`.
- The pinned values R4 and A10 name — each needs a test, or it has no `verify.txt` evidence.
- The stale-default case A13 names: render `OptimizerPanel` uncontrolled with Checkerboard, re-render
  with Plaid.
- "Visible text" in any rendered-output assertion means `html.replace(/<[^>]+>/g, ' ')` then
  `&quot;` → `"` and `&amp;` → `&`, exactly as `tests/designer-build.test.tsx:126` does. Raw HTML
  carries Tailwind classes such as `py-[1.5rem]` and SVG attributes with decimals.

### Authorised test changes — exactly these nine, nothing else
1. `tests/board-designer-build-steps.test.ts:128`–`132` — edge: the buffer string appears on exactly `['rip-strips']`.
2. `tests/board-designer-build-steps.test.ts:143`–`150` — end: exactly `['rip-strips', 'flatten-board']`.
3. `tests/board-designer-build-steps.test.ts:172` title and `:198` comment — "count distinct widths (F2)" → "count strips". The asserted values (2 and 1) do not change.
4. `tests/board-designer-build-steps.test.ts:322`–`327` — replace that `it` with a behavioural one: on Plaid, `crosscut-slices` lists each used panel's rows and they sum to `metrics.sliceCount`.
5. `tests/designer-build.test.tsx:205`–`211` — assert every quantity of every step renders as `formatBuildQuantity(q)`. Define the same `asHtml` helper as `designer-build.test.tsx:103` inside this `it`; the existing one is scoped to another test.
6. `tests/designer-print.test.tsx:181` and `:202`–`206` — lengths come from `panelCutLengthIn(plaid, p)`; update the comment to say cut length.
7. `tests/lumber-allowance.test.ts:168` — the `it` title only: drop `; board counts ignore estimate stock`. Its assertions are unchanged.
8. `tests/board-designer-reachability.test.ts` — one added `WITNESSES` entry and its id appended to the `required` array (T6). Additions only.
9. `tests/board-designer-metrics.test.ts:115`–`116` — the golden `toParts` part's `widthIn: 1.5` and `lengthIn: 19.375` become `toBeCloseTo(1.675, 9)` and `toBeCloseTo(21.475, 9)` assertions (the fixture uses the default 0.175 buffer: 12 × 1.675 + 11 × 0.125). Every other field in that `toMatchObject` stays.

Any other red test is a signal to report, not to loosen. Deleting, skipping, or
weakening an assertion outside this list is an `R` FAIL.

---

## Invariants this sprint must not break

- **Dimensions are tape-measure fractions** (CLAUDE.md §7) — every new number goes through
  `formatInches`; angles through `formatMiterAngle`. No decimal in any rendered guide or print text.
- **Cost = tiers only (D2)** — no `$` anywhere.
- **D7 safety guidance gated** — no PPE, technique, or "never" copy.
- **`@media print` classes stay on their elements** (CLAUDE.md §8).
- **Cut-optimizer rules** (CLAUDE.md §7): kerf per cut, impossible parts reported loudly and never
  dropped, `totalBoards` counts physical boards. This sprint changes the parts fed in, never the packer.
- **Cheap path** — `design-board-feet.ts` and `panel-geometry.ts` must not import `layout.ts`
  (`tests/board-designer-board-feet.test.ts:28`–`30`); `cut-pieces.ts` follows the same rule.
- **Private routes stay private** — no change to `src/lib/public-routes.ts` or `public/sw-policy.js`.
- **Desktop-only designer (D6)** — the narrow path is untouched.

## Verification
```
npm run verify -- --out sprints/80/verify.txt
```
Never a shell redirect — `>` writes UTF-16LE on Windows and breaks every downstream parser.
Then `git diff <lock-sha> HEAD --output=sprints/80/changes.diff`, where `<lock-sha>` is the commit
that added `sprints/80/ACCEPTANCE.sha256`. A fresh-context grader subagent writes
`sprints/80/SCORECARD.md` from ACCEPTANCE + verify.txt + changes.diff. Do not edit `ACCEPTANCE.md`.
