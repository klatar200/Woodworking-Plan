# Sprint 82 — SCORECARD

Grader: fresh-context subagent (`AGENTS.md` `Grade sprint NN`). Baseline = lock commit `bf6f10b`;
graded HEAD = `1da2d2b` (working tree clean). Evidence: `sprints/82/verify.txt` (full run, all four
steps, `=== EXIT: 0 ===`), `sprints/82/changes.diff` (byte-identical to `git diff bf6f10b HEAD`, checked
with `cmp`), and a native re-run of `node scripts/verify.mjs` at HEAD (no `--out`): 133/133 files,
1540/1540 tests, all four steps PASS, `=== EXIT: 0 ===`.

## Planer warning (T1)

- A1 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:41-44 imports both from panel-geometry and asserts BENCHTOP_PLANER_WIDTH_IN toBe(13) and PLANER_WIDTH_WARNING toBe the exact string; source panel-geometry.ts:11,13
- A2 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:46-51 loops all TEMPLATES, count of PLANER_WIDTH_WARNING toBe(1) for checkerboard and toBe(0) for every other id (9 ids pinned at board-designer-cut-pieces.test.ts:117-127)
- A3 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:53-66 8x1.5in panel, rowCount 20, finishedWidthIn toBe(30), not.toContain warning; 7x2in (14in) panel, rowCount 20, toContain warning (fixture default grain end, rowPattern uses panels[0])
- A4 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:68-77 grain edge, edge(14) toContain warning, edge(13) not.toContain
- A5 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:79-88 end grain, 14in 'spare' panel absent from rowPattern, not.toContain warning; source filters plan.rows > 0 at panel-geometry.ts:139-141
- A6 | PASS | src/lib/board-designer/panel-geometry.ts:137-144 rule now on used panel widths vs BENCHTOP_PLANER_WIDTH_IN; grep for `finishedWidthIn > 24` and `Wider than most planers` in the file = 0 hits

## Thumbnails (T2)

- A7 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:103-112 checkerboard kind 'ok', approximate false, cells toEqual layoutTopFace (checkerboard = 12 strips x 8 rows, templates.ts:105,109)
- A8 | PASS | verify.txt:74 tests/library-thumb.test.tsx:53-84 same 20x26 config: kind 'ok', approximate true, length <= 1024, minX/minY toBe(0), maxX/maxY toBeCloseTo widthIn/heightIn; also designer-polish-82.test.tsx:129-136 (verify.txt:69)
- A9 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:138-145 buildSchemaMaxConfig: approximate true, length <= 1024, spansBoard (min 0, max = widthIn/heightIn)
- A10 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:147-159 30 walnut strips x 20 rows, layout length toBe(600), every colorHex === getSpecies('walnut').colorHex, cells length === distinct yIn count
- A11 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:161-173 renders the A8 config (identical to library-thumb.test.tsx:56-63): contains '<svg', no 'Too many pieces to preview', every <rect> fails /\sstroke=/ and /\sstroke-width=/; source design-thumbnail.tsx:37-43,61
- A12 | PASS | src/lib/board-designer/library-thumb.ts:31 placeholder reason is 'invalid' or 'empty'; grep `too-complex` in library-thumb.ts and design-thumbnail.tsx = 0 hits
- A13 | PASS | src/lib/board-designer/library-thumb.ts:8-17 comment rewritten (exact to cap, whole-board downsample above); grep `must degrade` = 0 hits

## Library title (T3)

- A14 | PASS | verify.txt:70 tests/designer-polish-82.test.tsx:177-180 dynamic import of '@/app/designer/library/page', metadata.title toBe('Saved Boards') (deps mocked at :31-32); source page.tsx:12

## 3D fallback (T4)

- A15 | PASS | verify.txt:173 tests/board-preview-fallback.test.tsx:38-44 exact TOO_MANY/LOST/UNAVAILABLE strings (:28-30), precedence cells>lost>unavailable via combined inputs, null for webglAvailable true and null; source board-preview.tsx:285-307
- A16 | PASS | verify.txt:173 tests/board-preview-fallback.test.tsx:48-52 jsdom (no getContext), getByText(UNAVAILABLE), queryByRole button 'Try 3D again' toBeNull
- A17 | PASS | verify.txt:173 tests/board-preview-fallback.test.tsx:54-66 stub records onContextLost, act() fires it, getByText(LOST), click getByRole button 'Try 3D again', queryByText(LOST) toBeNull; source board-preview.tsx:182-196
- A18 | PASS | src/components/designer/board-preview.tsx:285-287 new constants; grep `SVG preview`, `WebGL context lost`, `WebGL is unavailable` in the file = 0 hits

## Harlequin (T5)

- A19 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:186-190 [length, width, thickness] toEqual([12.25, 14, 1.5]), warnings toEqual([]); also board-designer-harlequin.test.ts:16-25 (verify.txt:57)
- A20 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:192-202 strips length 14, corners toEqual tr/tl alternation from tr, thicknessIn toBe(1), transforms toEqual(['none','mirrorY']), rowCount toBe(14)
- A21 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:204-211 wedgeWebContinuous true, miterLatticeCloses true, walnut count toBe(56) at spi 40 and at spi 48
- A22 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:213-216 formatBoardFeet toBe('2.84'), totalBoards(cutPlanGroupsForConfig) toBe(4)
- A23 | PASS | src/lib/board-designer/templates.ts:342-392 Harlequin entry bounds at HEAD; all 4 hunks of `git diff -U0 bf6f10b HEAD` (HEAD lines 349-350, 359-362, 377, 390) fall inside it: comment block, Array.from length 14, rowCount 14

## Copy gate

- A24 | PASS | verify.txt:69 tests/designer-polish-82.test.tsx:220-229 extracts the 3 PREVIEW_ constants from source (length toBe 3) plus PLANER_WIDTH_WARNING; each not.toMatch /\d+\.\d+/, not.toContain '$', not.toMatch drum sander/router sled/tear-out/blowout

## Regression gate

- R1 | PASS | verify.txt:2-6,254 all four steps ran (full run, no subset marker); verify.txt:259-264 typecheck/lint/test/content PASS and `=== EXIT: 0 ===`; reproduced natively at HEAD
- R2 | PASS | sprints/82/changes.diff:1-1142 diff headers list 15 files, none of the nine named; `git diff --stat bf6f10b HEAD` on those nine paths = empty
- R3 | PASS | sprints/82/changes.diff:1-1142 no path under prisma/, content/, public/, nor src/lib/public-routes.ts; `git diff --name-only bf6f10b HEAD -- prisma content public src/lib/public-routes.ts` = empty
- R4 | PASS | sprints/82/changes.diff:663-791,1101-1142 every removed test line maps to PLAN T6 items 1-6 (3d-layout :75; cut-pieces :57,:116,:129,:144 with first eight totals unchanged; harlequin :16,:22-23,:38,:49,:52-54; metrics :252-253; reachability :119; library-thumb :53,:66,:71-73); no .skip/.only/x-prefixed tests added, no test file deleted or renamed
- R5 | PASS | sprints/82/changes.diff:1-1142 package.json and package-lock.json absent; `git diff --name-only bf6f10b HEAD -- package.json package-lock.json` = empty
- R6 | PASS | src/lib/board-designer/panel-geometry.ts:1-5 only import is type-only from './types'; no added `shadow-[` line in sprints/82/changes.diff (grep of + lines = 0 hits)
- R7 | PASS | verify.txt:60 tests/board-designer-cut-pieces.test.ts:144 toEqual(['1.17','3.19','2.27','1.03','1.76','2.45','2.70','2.12','2.84']), first eight identical to baseline

## Manual — graded, not scored

- M1 | FAIL | not run — Keagan (npm run build writes .next; grader may create no file)
- M2 | FAIL | not run — Keagan (signed-in browser walkthrough on notchplans.com not possible here)

---

PASS ÷ 31 = 31 ÷ 31 = 100% (A and R ids only). Gate ≥95% (30/31) met. No R id failed.
