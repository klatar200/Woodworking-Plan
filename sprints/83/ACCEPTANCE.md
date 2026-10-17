# Sprint 83 — ACCEPTANCE

Bar author: Claude Code. Written before implementation. Grader: a fresh-context subagent
(`AGENTS.md` `Grade sprint NN`) — never the implementing session.
Locked by `ACCEPTANCE.sha256`.

Grade = PASS ÷ **18** — the `A` and `R` ids only (A1–A12 + R1–R6). Gate = **≥95%** (18/18). Any
`R` FAIL voids the sprint regardless of grade.

`M` ids are **excluded from the denominator**. Grade them like any other id; if one cannot be run,
mark it `FAIL` with evidence `not run — Keagan`.

Evidence format: `verify.txt:<line>` or `<file>:<line>` for every `A`/`R` id. For `evidence: manual`,
cite what was actually done. For `evidence: verify.txt`, cite the line where the test file that
asserts the statement passed; a statement no test asserts is a FAIL.

Baseline for every "before" comparison: the commit that added this pack's `ACCEPTANCE.sha256`
(`git log --format=%H -1 -- sprints/83/ACCEPTANCE.sha256`) — `git show <lock-sha>:<file>`.
`changes.diff` is cut against the same SHA.

"Checkerboard" = `getTemplate('checkerboard').config`. "The templates" = `TEMPLATES` from
`src/lib/board-designer/templates.ts`.

---

## Template (T1)

- [ ] A1 | Checkerboard has exactly one panel, id `panel-1`, `thicknessIn` 1.5, with 8 strips, each `widthIn` 1.5 and `repeat` 1, whose `speciesId`s alternate `hard-maple`, `walnut`, starting with `hard-maple` | evidence: verify.txt
- [ ] A2 | Checkerboard's `grain` is `'end'`, `sourceLengthIn` 14, `sliceThicknessIn` 1.5, `kerfIn` 0.125, `wasteFactor` 0, `rowCount` 8, and `rowPattern` equals `[{ panelId: 'panel-1', transform: 'none' }, { panelId: 'panel-1', transform: 'rot180' }]` | evidence: verify.txt
- [ ] A3 | Checkerboard finishes 12 × 12 × 1.5 with `sliceCount` 8, and its `panelPlan` is one entry with `widthIn` 12 and `requiredLengthIn` 12.875 | evidence: verify.txt
- [ ] A4 | Checkerboard's warnings equal `[]`, and none of the templates' warnings contain `PLANER_WIDTH_WARNING` | evidence: verify.txt
- [ ] A5 | `layoutTopFace` gives Checkerboard 64 cells, 32 `hard-maple` and 32 `walnut`, and no cell has the same `speciesId` as the cell 1.5″ to its right or the cell 1.5″ below it | evidence: verify.txt
- [ ] A6 | `designCutPieces(checkerboard, metrics.panelPlan)` returns 8 pieces, each with `role` `strip`, `finishedWidthIn` 1.5, `ripWidthIn` 1.675 and `lengthIn` 14.275 (each to 9 decimal places) | evidence: verify.txt
- [ ] A7 | Checkerboard's board-feet total formats as `2.12`, `totalBoards(cutPlanGroupsForConfig(checkerboard))` is 2, and `defaultCutPlanStockWidthIn(checkerboard)` is 3.5 | evidence: verify.txt
- [ ] A8 | In Checkerboard's build guide, `mill-stock` quantities format as `Hard Maple stock · 1 1/2" thick — for 4 strips` and `Walnut stock · 1 1/2" thick — for 4 strips`; `crosscut-strips` detail is `Crosscut strips to 14 1/4".` with quantities `4× Hard Maple strips · 14 1/4" long × 1 11/16" wide` and `4× Walnut strips · 14 1/4" long × 1 11/16" wide`; `crosscut-slices` detail is `Crosscut the panel into 8 slices at 1 11/16" thick.`; and the `dry-fit` detail contains `Strip 8 (Walnut 1 1/2")` and not `Strip 9` | evidence: verify.txt
- [ ] A9 | `saveBlockers(checkerboard)` returns `[]`, and `parseConfig(JSON.parse(JSON.stringify(checkerboard)))` returns `ok: true` | evidence: verify.txt
- [ ] A10 | `thumbModelFromConfig(checkerboard)` returns `kind: 'ok'` with `approximate: false` and cells equal to `layoutTopFace` | evidence: verify.txt
- [ ] A11 | `templates.ts` contains the two comment lines given in PLAN T1, verbatim, directly above the line containing `mapleWalnutAlternating(8, 'cb')` | evidence: file:line

## Tests (T2)

- [ ] A12 | In `tests/board-designer-miter.test.ts`, baseline lines `:25`–`:44` (the `CHECKERBOARD_SOLID_ORACLE` declaration, `const` through `})();`) are byte-identical in the new file; the "frozen oracle" test lays out `SPRINT57_CHECKERBOARD` (12 strips) and does not call `getTemplate` | evidence: file:line

---

## Regression gate — any FAIL voids the sprint

- [ ] R1 | `npm run verify` reports all four steps PASS and `=== EXIT: 0 ===` | evidence: verify.txt
- [ ] R2 | Under `src/`, the diff touches only `src/lib/board-designer/templates.ts`, and every changed line in it lies inside the Checkerboard entry (baseline `templates.ts:96`–`111`) | evidence: file:line
- [ ] R3 | No change under `prisma/`, `content/`, or `public/`, or to `src/lib/public-routes.ts`; no migration added | evidence: file:line
- [ ] R4 | No existing test assertion is changed, deleted, or skipped except PLAN T2 "Authorised test changes" items 1–9 | evidence: file:line
- [ ] R5 | No new dependency in `package.json` | evidence: file:line
- [ ] R6 | In `TEMPLATES` order with Checkerboard left out, the other eight templates' board-feet totals still format as `['1.17', '2.27', '1.03', '1.76', '2.45', '2.70', '2.12', '2.84']` and their default cut plans still buy `[2, 2, 3, 5, 3, 4, 2, 4]` boards | evidence: verify.txt

## Manual — graded, not scored (outside the 18)

- [ ] M1 | `npm run build` succeeds | evidence: manual
- [ ] M2 | Signed in on notchplans.com, in a fresh tab, a new board at `/designer` loads Checkerboard, Metrics shows a 12″ × 12″ finished board, and no planer warning appears; nothing is saved | evidence: manual
