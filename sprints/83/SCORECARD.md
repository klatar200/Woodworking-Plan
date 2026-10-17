# Sprint 83 — SCORECARD

Grader: fresh-context subagent (`AGENTS.md` `Grade sprint NN`). Baseline = lock commit `f3aec03`;
graded HEAD = `0fa3981` (working tree clean). Evidence: `sprints/83/verify.txt` (full run, all four
steps, no subset marker, `=== EXIT: 0 ===`), `sprints/83/changes.diff` (byte-identical to
`git diff f3aec03 HEAD`, checked with `cmp`). Native spot re-run at HEAD of
`tests/designer-checkerboard-83.test.ts`, `tests/board-designer-cut-pieces.test.ts`,
`tests/board-designer-miter.test.ts`: 3/3 files, 30/30 tests pass.

## Template (T1)

- A1 | PASS | verify.txt:78 designer-checkerboard-83 (10 tests) passed; tests/designer-checkerboard-83.test.ts:22-34 asserts 1 panel, id panel-1, thicknessIn 1.5, 8 strips, each widthIn 1.5, repeat 1, speciesId hard-maple at even index / walnut at odd
- A2 | PASS | verify.txt:78; tests/designer-checkerboard-83.test.ts:36-48 asserts grain end, sourceLengthIn 14, sliceThicknessIn 1.5, kerfIn 0.125, wasteFactor 0, rowCount 8, rowPattern toEqual the two-step none/rot180 list
- A3 | PASS | verify.txt:78; tests/designer-checkerboard-83.test.ts:50-59 asserts finished 12/12/1.5, sliceCount 8, panelPlan length 1, widthIn 12, requiredLengthIn 12.875
- A4 | PASS | verify.txt:78; tests/designer-checkerboard-83.test.ts:62 warnings toEqual([]), :63-65 every TEMPLATES entry's warnings not.toContain(PLANER_WIDTH_WARNING); also verify.txt:30 tests/designer-polish-82.test.tsx:46-51 count toBe(0) for every template
- A5 | PASS | verify.txt:78; tests/designer-checkerboard-83.test.ts:68-88 asserts 64 cells, 32 hard-maple, 32 walnut, cells keyed by xIn,yIn, right (xIn+1.5) and below (yIn+1.5) neighbours never share speciesId, and 112 neighbour pairs checked
- A6 | PASS | verify.txt:78; tests/designer-checkerboard-83.test.ts:92-102 designCutPieces(config, metrics.panelPlan) length 8, each role strip, finishedWidthIn toBe 1.5, ripWidthIn toBeCloseTo(1.675, 9), lengthIn toBeCloseTo(14.275, 9)
- A7 | PASS | verify.txt:78; tests/designer-checkerboard-83.test.ts:104-109 formatBoardFeet toBe '2.12', totalBoards(cutPlanGroupsForConfig) toBe 2, defaultCutPlanStockWidthIn toBe 3.5
- A8 | PASS | verify.txt:78; tests/designer-checkerboard-83.test.ts:111-130 mill-stock quantities toEqual both "for 4 strips" strings, crosscut-strips detail toBe 'Crosscut strips to 14 1/4".' and quantities toEqual both 4x strings, crosscut-slices detail toBe the 8-slice string, dry-fit toContain 'Strip 8 (Walnut 1 1/2")' and not 'Strip 9'
- A9 | PASS | verify.txt:78; tests/designer-checkerboard-83.test.ts:132-136 saveBlockers toEqual([]), parseConfig(JSON round-trip).ok toBe(true)
- A10 | PASS | verify.txt:78; tests/designer-checkerboard-83.test.ts:138-145 kind toBe 'ok', approximate toBe(false), cells toEqual layoutTopFace(config, metrics)
- A11 | PASS | src/lib/board-designer/templates.ts:105-106 are the two comment lines, byte-identical to sprints/83/PLAN.md:17-18 (`cmp` clean), directly above templates.ts:107 `mapleWalnutAlternating(8, 'cb')`

## Tests (T2)

- A12 | PASS | tests/board-designer-miter.test.ts:24-43 byte-identical to baseline :25-44 (`cmp` vs `git show f3aec03:` clean; shifted one line by the removed import); :68 lays out SPRINT57_CHECKERBOARD (12 strips, :54), grep finds no getTemplate in the file; verify.txt:12 miter (8 tests) passed

## Regression gate

- R1 | PASS | verify.txt:2,4,6,149 all four steps ran, no SUBSET marker (grep count 0); verify.txt:253-258 typecheck/lint/test/content PASS and `=== EXIT: 0 ===`; verify.txt:184-185 134/134 files, 1556/1556 tests
- R2 | PASS | sprints/83/changes.diff:265-279 only src/ file is src/lib/board-designer/templates.ts; single hunk replaces baseline :105 and inserts two lines before it, inside the Checkerboard entry (baseline templates.ts:96-111, `git show f3aec03:` confirmed)
- R3 | PASS | sprints/83/changes.diff:1,265,280,302,327,344,374,402,455,471,502,654 are the 12 file headers (verify.txt, templates.ts, 10 test files); none under prisma/, content/, public/, nor public-routes.ts, no migration
- R4 | PASS | sprints/83/changes.diff:280-501,654-669 every hunk in the 9 existing test files matches PLAN T2 items 1-9 line for line (baseline lines checked via `git show f3aec03:`: 3d :26,:32-33; cut-pieces :44,:46,:144 index 1 only; guide :70,:73, :197 untouched; layout :9,:17,:22-23; metrics :227,:232,:244; miter :17,:22, oracle block, :48-51 body; v2 comment above :99, :101; diagram :18,:29,:43; polish :46,:49); no skip/only added; changes.diff:502-653 is the new file only
- R5 | PASS | sprints/83/changes.diff:1-669 has no package.json header (12 files listed under R3)
- R6 | PASS | verify.txt:15 cut-pieces (12 tests) passed; tests/board-designer-cut-pieces.test.ts:117-127 pins TEMPLATES order with checkerboard at index 1, :128-130 boards [2, 2, 2, 3, 5, 3, 4, 2, 4] (minus index 1 = [2, 2, 3, 5, 3, 4, 2, 4]), :144 board feet list minus index 1 = ['1.17', '2.27', '1.03', '1.76', '2.45', '2.70', '2.12', '2.84']

## Manual (not scored)

- M1 | FAIL | not run — Keagan (npm run build writes .next; grader may write only SCORECARD.md)
- M2 | FAIL | not run — Keagan (signed-in browser check on notchplans.com not possible here)

---

PASS ÷ 18 = 18 ÷ 18 = 100% (A and R ids only). Gate ≥95% (18/18) met. No R id failed.
