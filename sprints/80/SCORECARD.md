# Sprint 80 — SCORECARD

Grader: fresh-context subagent (`AGENTS.md` `Grade sprint NN`). Baseline = lock commit `2cb7dfc`;
graded HEAD = `2d2f405` (working tree clean). Evidence: `sprints/80/verify.txt` (full run, all four
steps, `=== EXIT: 0 ===`), `sprints/80/changes.diff`, a native re-run at HEAD of the 11
sprint-relevant test files (11/11 files, 152/152 tests pass), and one read-only `tsx` probe of
`cutPlanGroupsForConfig` (see A12).

## One miter vocabulary (T1)

- A1 | PASS | src/lib/board-designer/miter-labels.ts:10 MITER_CORNER_LABELS, :21 formatMiterAngle, :31 MITER_COMPOSITE_METHOD exported; grep of src/ finds the literal 'Top left' only at miter-labels.ts:11; guard tests/board-designer-cut-pieces.test.ts:166 passes (verify.txt:63)
- A2 | PASS | verify.txt:63 tests/board-designer-cut-pieces.test.ts:37-38 toBe('30°') and toBe('22½°')
- A3 | PASS | verify.txt:39 tests/designer-cut-length-surfaces.test.tsx:95-100 Harlequin print-miter-note startsWith asHtml(MITER_COMPOSITE_METHOD), contains 'two composite strips', matches /discarding the mates means buying roughly twice/i

## One cut-length formula (T2)

- A4 | PASS | src/lib/board-designer/lumber-allowance.ts:46 export panelCutLengthIn; :84 panelStockDims sets stockLengthIn = panelCutLengthIn(config, plan); end-grain formula only at :51-54 (sliceThicknessIn appears nowhere else in the file)

## Cut pieces (T3)

- A5 | PASS | verify.txt:63 tests/board-designer-cut-pieces.test.ts:44-53 Checkerboard 12 pieces, role 'strip', ripWidthIn toBeCloseTo(1.675, 9), lengthIn toBeCloseTo(14.275, 9)
- A6 | PASS | verify.txt:63 tests/board-designer-cut-pieces.test.ts:55-70 Harlequin 16 pieces alternating hard-maple strip then walnut partner with equal thicknessIn/ripWidthIn/lengthIn/count (8 strips)
- A7 | PASS | verify.txt:63 tests/board-designer-cut-pieces.test.ts:72-78 Diagonal first-panel-only: no piece carries an unused panel id
- A8 | PASS | src/lib/board-designer/cut-pieces.ts:1-3 imports only ./lumber-allowance, ./strip-display, ./types; no calculateMetrics( and no .wasteFactor in file (grep); source guard tests/board-designer-cut-pieces.test.ts:80-88 passes (verify.txt:63)

## Cut plan (T4)

- A9 | PASS | verify.txt:63 tests/board-designer-cut-pieces.test.ts:92-99 Brick with grain 'edge' and Diagonal first-panel-only: every toParts lengthIn > 0
- A10 | PASS | verify.txt:63 tests/board-designer-cut-pieces.test.ts:116-131 TEMPLATES order pinned, totalBoards(cutPlanGroupsForConfig(config)) equals [2, 2, 2, 3, 5, 3, 4, 2, 2]
- A11 | PASS | verify.txt:63 tests/board-designer-cut-pieces.test.ts:133-137 checkerboard 3.5, accent-stripe 5.5, plaid 11.25
- A12 | FAIL | src/components/designer/optimizer-panel.tsx:56 cutPlanGroupsForConfig turns an explicit null into 'auto' (`stock.stockWidthIn ?? 'auto'`; baseline was `?? null`). So a null choice shows rip-none in the select (:131) but packs from the auto width. tsx probe: cutPlanGroupsForConfig(checkerboard, {stockWidthIn: null}) returns the same groups as 3.5 (stockWidthIn 3.5, 2 rips per board). The 'auto' start (:88, designer-dock.tsx:55) and per-render resolution (:46, :93) are correct, but null no longer means "Buy each part's width".
- A13 | PASS | verify.txt:160 tests/optimizer-panel-default-width.test.tsx:16-27 uncontrolled Checkerboard select value 3.5, re-render with Plaid select value 11.25, no 'Wider than the'

## The guide (T5)

- A14 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:30 toBe('Crosscut strips to 14 1/4".')
- A15 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:34-36 rowCount 20 toBe('Crosscut strips to 35 7/8".')
- A16 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:90-92 Plaid crosscut-strips exact multi string
- A17 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:40-42 Checkerboard and :96-98 Plaid crosscut-slices exact strings
- A18 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:51-53 Checkerboard arrange-rows exact; :102 Plaid contains 'row 2 Line — As cut'
- A19 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:43-47 flatten-board, flatten-panel and trim-ends exact strings
- A20 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:57-62 rip-strips exact with default buffer and 'Rip strips to finished width.' at planeBuffer 0
- A21 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:152-191 all TEMPLATES: rip widthIn and crosscut widthIn/lengthIn match a same-species cut piece; per-species crosscut counts equal cut-piece counts
- A22 | PASS | verify.txt:63 tests/board-designer-cut-pieces.test.ts:101-114 all TEMPLATES: parts length equals pieces, quantity=count, thicknessIn, widthIn=ripWidthIn, lengthIn per index
- A23 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:109-120 Walnut quantity in mill-stock/rip-strips/crosscut-strips; make-composite-strips detail startsWith MITER_COMPOSITE_METHOD; labels contain exact 'Strip 1: Hard Maple with Walnut wedge, Top right corner at 30°'
- A24 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:124-149 classic-stripe 8 ids and checkerboard 12 ids equal baseline EDGE_IDS/END_IDS (git show 2cb7dfc:tests/board-designer-build-steps.test.ts:14-38), no make-composite-strips
- A25 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:69-71 formatBuildQuantity(mill.quantities[0]) toBe('Hard Maple stock · 1 1/2" thick — for 6 strips')
- A26 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:78-82 dry-fit startsWith exact prefix; :225-227 explicit-label case contains 'Accent rail' and 'Strip 2 ×2' (the unchanged baseline case also still passes, verify.txt:108)
- A27 | PASS | verify.txt:100 tests/board-designer-guide-strings.test.ts:196-207 exact '6× Hard Maple strips · 1 11/16" wide', 'Walnut stock · 3/4" thick — for 1 strip', '3× X'

## Unused panel warning (T6)

- A28 | PASS | verify.txt:63 tests/board-designer-cut-pieces.test.ts:149-161 exact warning for Course 2, 3 and 4, none for Course 1 or Checkerboard; witness 'unused-end-grain-panel' at tests/board-designer-reachability.test.ts:86 and in required at :220 (verify.txt:23)

## Surfaces (T7, CARRY-2)

- A29 | PASS | src/app/designer/[id]/build/page.tsx:8 imports formatBuildQuantity, :60 renders it, no quantityLine (grep); src/app/designer/[id]/print/page.tsx:8 imports it, :212 step.quantities.map(formatBuildQuantity).join('; '), no inline q.lengthIn/widthIn/thicknessIn (grep)
- A30 | PASS | verify.txt:78 tests/designer-build.test.tsx:205-211 every quantity of every step on /build contains asHtml(formatBuildQuantity(q)); verify.txt:39 tests/designer-cut-length-surfaces.test.tsx:81-90 same for the print sheet (checkerboard, plaid, harlequin)
- A31 | PASS | verify.txt:39 tests/designer-cut-length-surfaces.test.tsx:65-76 MetricsPanel and print sheet both contain 'Cut length' and '14 1/4&quot;', neither 'Required length'

## Copy gates

- A32 | PASS | verify.txt:39 tests/designer-cut-length-surfaces.test.tsx:104-116 all TEMPLATES, visibleText per the stated rule: build no /\d+\.\d+/, print no /\d+\.\d+\s*["″°]/, neither '$' nor PPE/safety glasses/ear protection

## Regression gate

- R1 | PASS | verify.txt:216-221 typecheck, lint, test, content all PASS and EXIT 0; full run (steps at :2, :4, :6, :211; 127 files, 1466 tests at :175-176; no SUBSET marker)
- R2 | PASS | sprints/80/changes.diff:1-2087 file headers touch no prisma/, content/, public/, src/lib/cut-optimizer.ts or src/lib/public-routes.ts; git diff --stat 2cb7dfc HEAD on those paths is empty; no migration
- R3 | PASS | src/lib/board-designer/design-board-feet.ts:1 git hash-object at HEAD equals git rev-parse 2cb7dfc:src/lib/board-designer/design-board-feet.ts (4db1cecf...)
- R4 | PASS | verify.txt:63 tests/board-designer-cut-pieces.test.ts:141-145 formatBoardFeet totals equal ['1.17', '3.19', '2.27', '1.03', '1.76', '2.45', '2.70', '2.12', '0.92']
- R5 | PASS | src/lib/board-designer/panel-geometry.ts:100-105 is the only change (changes.diff:1266-1282, +6 lines, T6 warning; complete untouched); serialize.ts and types.ts absent from the diff
- R6 | PASS | sprints/80/changes.diff:1354-2087 every removed test line maps to PLAN T8 items 1-9 (build-steps 128-132, 143-150, 172/198, 322-327; designer-build 205-211; designer-print 181/202; lumber-allowance 168 title; reachability additions only; metrics 115-116); no skip/only/todo added. The reachability id was inserted mid-array, not at the end: additions only, no existing assertion changed
- R7 | PASS | package.json:1 unchanged (absent from changes.diff; git diff 2cb7dfc HEAD -- package.json package-lock.json is empty)
- R8 | PASS | src/app/designer/[id]/print/page.tsx:108, :136, :147, :243 print-table, numeric mono and print-miter-note classes still on their elements; every className line removed in changes.diff:333/437/446 is re-added with the same classes at :335/438/447; no shadow-[ added; no CSS file changed

## Manual — graded, not scored

- M1 | FAIL | not run — Keagan (npm run build not run by the grader)
- M2 | FAIL | not run — Keagan (signed-in browser walkthrough not possible here)

---

PASS ÷ total = 39 ÷ 40 = 97.5% (A and R ids only). Gate ≥95% (38/40) met. No R id failed.
