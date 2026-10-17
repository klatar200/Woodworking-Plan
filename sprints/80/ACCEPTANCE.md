# Sprint 80 — ACCEPTANCE

Bar author: Claude Code. Written before implementation. Grader: a fresh-context subagent
(`AGENTS.md` `Grade sprint NN`) — never the implementing session.
Locked by `ACCEPTANCE.sha256`. Re-locked 2026-10-16 when Keagan retired Cursor from the loop: the
executor and grader names changed, not one check.

Grade = PASS ÷ **40** — the `A` and `R` ids only (A1–A32 + R1–R8). Gate = **≥95%** (38/40). Any
`R` FAIL voids the sprint regardless of grade.

`M` ids are **excluded from the denominator**. Grade them like any other id; if you cannot run one
here, mark it `FAIL` with evidence `not run — Keagan`.

Evidence format: `verify.txt:<line>` or `<file>:<line>` for every `A`/`R` id. For `evidence: manual`,
cite what you actually did — the command and its result, or the file:line you inspected.

Baseline for every "before" comparison: the commit that added this pack's `ACCEPTANCE.sha256`
(`git log --format=%H -1 -- sprints/80/ACCEPTANCE.sha256`) — `git show <lock-sha>:<file>`.
`changes.diff` is cut against the same SHA. Do not use `main` alone; it moves.

"The 9 templates" = `TEMPLATES` from `src/lib/board-designer/templates.ts`, in array order:
classic-stripe, checkerboard, butcher-block, accent-stripe, plaid, brick, diagonal, thue-morse, harlequin.

**This bar grades what the guide says and that the three surfaces agree** — exact strings, exact
numbers. A check that passes on structure while the sentence is wrong is the Sprint 78 failure.

---

## One miter vocabulary (T1)

- [ ] A1 | `src/lib/board-designer/miter-labels.ts` exports `MITER_CORNER_LABELS`, `formatMiterAngle`, and `MITER_COMPOSITE_METHOD`, and the literal `'Top left'` appears in no other file under `src/` | evidence: file:line
- [ ] A2 | `formatMiterAngle(30)` returns `30°` and `formatMiterAngle(22.5)` returns `22½°` | evidence: verify.txt
- [ ] A3 | The Harlequin print sheet still contains `two composite strips` and matches `/discarding the mates means buying roughly twice/i`, and its miter note begins with `MITER_COMPOSITE_METHOD` | evidence: verify.txt

## One cut-length formula (T2)

- [ ] A4 | `panelCutLengthIn` is exported from `lumber-allowance.ts`, and `panelStockDims` obtains `stockLengthIn` by calling it — the end-grain formula appears once in that file | evidence: file:line

## Cut pieces (T3)

- [ ] A5 | For Checkerboard, `designCutPieces` returns 12 pieces, all `role: 'strip'`, each with `ripWidthIn` 1.675 and `lengthIn` 14.275 (to 1e-9) | evidence: verify.txt
- [ ] A6 | For Harlequin, each of the 8 Hard Maple strip pieces is immediately followed by a Walnut `partner` piece with identical `thicknessIn`, `ripWidthIn`, `lengthIn`, and `count` | evidence: verify.txt
- [ ] A7 | For an end-grain design with a panel at 0 rows, no cut piece carries that panel's id | evidence: verify.txt
- [ ] A8 | `cut-pieces.ts` imports nothing from `./layout`, contains no `calculateMetrics(` call, and matches no `/\.wasteFactor\b/` | evidence: file:line

## Cut plan (T4)

- [ ] A9 | `toParts` emits no part with `lengthIn <= 0` for (a) the Brick template switched to `grain: 'edge'` and (b) the Diagonal template with `rowPattern` reduced to its first panel's steps | evidence: verify.txt
- [ ] A10 | With the default stock (`cutPlanGroupsForConfig(config)`), `totalBoards` for the 9 templates in order is `[2, 2, 2, 3, 5, 3, 4, 2, 2]` | evidence: verify.txt
- [ ] A11 | `defaultCutPlanStockWidthIn` returns `3.5` for Checkerboard, `5.5` for Accent stripe, and `11.25` for Plaid | evidence: verify.txt
- [ ] A12 | `designer-dock.tsx` and `optimizer-panel.tsx` both start their stock-width state as `'auto'`; `'auto'` resolves through `defaultCutPlanStockWidthIn` for the config being rendered; an explicit `null` still maps to the `rip-none` option ("Buy each part's width") | evidence: file:line
- [ ] A13 | `OptimizerPanel` rendered uncontrolled with Checkerboard and then re-rendered with Plaid shows no `Wider than the` text, and its board-width select's value is `11.25` | evidence: verify.txt

## The guide (T5)

- [ ] A14 | Checkerboard `crosscut-strips` detail is exactly `Crosscut strips to 14 1/4".` | evidence: verify.txt
- [ ] A15 | Checkerboard with `rowCount: 20` has `crosscut-strips` detail exactly `Crosscut strips to 35 7/8".` | evidence: verify.txt
- [ ] A16 | Plaid `crosscut-strips` detail is exactly `Crosscut each panel's strips to its own length: Wide A 5 1/4"; Wide B 5 1/4"; Line 10 11/16".` | evidence: verify.txt
- [ ] A17 | Checkerboard `crosscut-slices` is exactly `Crosscut the panel into 8 slices at 1 11/16" thick.` and Plaid's is exactly `Crosscut each panel into slices at 1 11/16" thick: Wide A 3; Wide B 3; Line 6.` | evidence: verify.txt
- [ ] A18 | Checkerboard `arrange-rows` is exactly `Turn slices end-up and lay them out by repeating this 2-step row pattern: row 1 As cut; row 2 Turned end-for-end.` and Plaid's contains `row 2 Line — As cut` | evidence: verify.txt
- [ ] A19 | Checkerboard `flatten-panel` is exactly `Flatten the panel to 1 1/2" thick.`, `flatten-board` exactly `Flatten the board to 1 1/2" thick, removing about 3/16".`, and `trim-ends` exactly `Square both ends.` | evidence: verify.txt
- [ ] A20 | Checkerboard `rip-strips` detail is exactly `Rip each strip 3/16" over its finished width, then joint the glue edges down to finished width.`, and with `planeBuffer: 0` it is exactly `Rip strips to finished width.` | evidence: verify.txt
- [ ] A21 | For all 9 templates: every `rip-strips` quantity's `widthIn`, and every `crosscut-strips` quantity's `widthIn` and `lengthIn`, equals the `ripWidthIn` / `lengthIn` of a cut piece of the same species; and per species the `crosscut-strips` counts sum to the cut pieces' counts | evidence: verify.txt
- [ ] A22 | For all 9 templates, `toParts` parts correspond one-to-one with cut pieces: same `quantity`/`count`, `thicknessIn`, `widthIn` = `ripWidthIn`, and `lengthIn` | evidence: verify.txt
- [ ] A23 | Harlequin: `mill-stock`, `rip-strips` and `crosscut-strips` each have a Walnut quantity; `make-composite-strips` is present, its detail begins with `MITER_COMPOSITE_METHOD`, and one quantity label is exactly `Strip 1: Hard Maple with Walnut wedge, Top right corner at 30°` | evidence: verify.txt
- [ ] A24 | A design with no mitered strip has exactly Sprint 78's step ids — edge 8, end 12, same order, no `make-composite-strips` | evidence: verify.txt
- [ ] A25 | CARRY-1: Checkerboard's first `mill-stock` quantity renders through `formatBuildQuantity` as exactly `Hard Maple stock · 1 1/2" thick — for 6 strips` | evidence: verify.txt
- [ ] A26 | Checkerboard `dry-fit` begins exactly `Lay strips out in order: Strip 1 (Hard Maple 1 1/2"), Strip 2 (Walnut 1 1/2"),` and the explicit-label case still contains `Accent rail` and `Strip 2 ×2` | evidence: verify.txt
- [ ] A27 | `formatBuildQuantity` returns `6× Hard Maple strips · 1 11/16" wide` for `{ label: 'Hard Maple strips', count: 6, widthIn: 1.675 }`, ends `— for 1 strip` for a `countNoun: 'strip'` quantity with `count: 1`, and returns `3× X` for `{ label: 'X', count: 3 }` | evidence: verify.txt

## Unused panel warning (T6)

- [ ] A28 | Diagonal with `rowPattern` reduced to its first panel's steps warns exactly `"Course 2" is not in the row pattern — it adds nothing to the board.` (and the same for Course 3 and Course 4); Checkerboard has no such warning; a reachability witness exists for it | evidence: verify.txt

## Surfaces (T7, CARRY-2)

- [ ] A29 | `quantityLine` no longer exists in `src/app/designer/[id]/build/page.tsx`, the print page assembles no quantity dims inline, and both import `formatBuildQuantity` | evidence: file:line
- [ ] A30 | Every quantity on the `/build` route and in the print sheet's build-steps table renders as `formatBuildQuantity(q)` | evidence: verify.txt
- [ ] A31 | For Checkerboard, the metrics panel and the print sheet both label the panel length `Cut length` and show `14 1/4"`; neither renders the text `Required length` | evidence: verify.txt

## Copy gates

- [ ] A32 | For the 9 templates, taking visible text as `html.replace(/<[^>]+>/g, ' ')` with `&quot;` → `"` and `&amp;` → `&`: the `/build` text matches no `/\d+\.\d+/`; the print text matches no `/\d+\.\d+\s*["″°]/`; neither text contains `$` or matches `/\bPPE\b|safety glasses|ear protection/i` | evidence: verify.txt

---

## Regression gate — any FAIL voids the sprint

- [ ] R1 | `npm run verify` reports all four steps PASS and `=== EXIT: 0 ===` | evidence: verify.txt
- [ ] R2 | No change under `prisma/`, `content/`, or `public/`, to `src/lib/cut-optimizer.ts`, or to `src/lib/public-routes.ts`; no migration added | evidence: file:line
- [ ] R3 | `src/lib/board-designer/design-board-feet.ts` is byte-identical to baseline | evidence: file:line
- [ ] R4 | `formatBoardFeet(calculateMetrics(t.config).totalBoardFeet)` for the 9 templates in order is `['1.17', '3.19', '2.27', '1.03', '1.76', '2.45', '2.70', '2.12', '0.92']` | evidence: verify.txt
- [ ] R5 | `serialize.ts` and the `BoardDesignConfig` / `PanelPlan` types are unchanged, and `panel-geometry.ts` differs from baseline only by the T6 warning | evidence: file:line
- [ ] R6 | No existing test assertion is changed, deleted, or skipped except the nine listed in PLAN T8 "Authorised test changes" | evidence: file:line
- [ ] R7 | No new dependency in `package.json` | evidence: file:line
- [ ] R8 | Every class used inside an `@media print` rule still sits on an element, and no `shadow-[…]` literal is introduced | evidence: file:line

## Manual — graded, not scored (outside the 40)

- [ ] M1 | `npm run build` succeeds | evidence: manual
- [ ] M2 | Signed in at `lg`: start a new board (Checkerboard), Save, open the Cut plan tab — the width select reads "Rip from 3 1/2" stock" and says Buy 2 boards; press Build Plan — step 3 reads `Crosscut strips to 14 1/4".`; open the print sheet — the strip table's Cut length column reads `14 1/4"` | evidence: manual
