# Sprint 82 — ACCEPTANCE

Bar author: Claude Code. Written before implementation. Grader: a fresh-context subagent
(`AGENTS.md` `Grade sprint NN`) — never the implementing session.
Locked by `ACCEPTANCE.sha256`.

Grade = PASS ÷ **31** — the `A` and `R` ids only (A1–A24 + R1–R7). Gate = **≥95%** (30/31). Any
`R` FAIL voids the sprint regardless of grade.

`M` ids are **excluded from the denominator**. Grade them like any other id; if one cannot be run,
mark it `FAIL` with evidence `not run — Keagan`.

Evidence format: `verify.txt:<line>` or `<file>:<line>` for every `A`/`R` id. For `evidence: manual`,
cite what was actually done. For `evidence: verify.txt`, cite the line where the test file that
asserts the statement passed; a statement no test asserts is a FAIL.

Baseline for every "before" comparison: the commit that added this pack's `ACCEPTANCE.sha256`
(`git log --format=%H -1 -- sprints/82/ACCEPTANCE.sha256`) — `git show <lock-sha>:<file>`.
`changes.diff` is cut against the same SHA.

"The 9 templates" = `TEMPLATES` from `src/lib/board-designer/templates.ts`.

---

## Planer warning (T1)

- [ ] A1 | `PLANER_WIDTH_WARNING === 'Wider than a 13" benchtop planer — plan to hand-flatten.'` and `BENCHTOP_PLANER_WIDTH_IN === 13`, both exported from `panel-geometry.ts` | evidence: verify.txt
- [ ] A2 | Of the 9 templates, Checkerboard's warnings contain `PLANER_WIDTH_WARNING` exactly once, and no other template's warnings contain it | evidence: verify.txt
- [ ] A3 | An end-grain design with one 12″-wide panel and 20 rows of 1½″ (finished width 30″) has no `PLANER_WIDTH_WARNING`; the same design with a 14″-wide panel has it | evidence: verify.txt
- [ ] A4 | An edge-grain design 14″ wide has `PLANER_WIDTH_WARNING`; one exactly 13″ wide does not | evidence: verify.txt
- [ ] A5 | An end-grain design whose only panel wider than 13″ is used by no row has no `PLANER_WIDTH_WARNING` | evidence: verify.txt
- [ ] A6 | `panel-geometry.ts` contains neither `finishedWidthIn > 24` nor `Wider than most planers` | evidence: file:line

## Thumbnails (T2)

- [ ] A7 | For the Checkerboard template (96 cells), `thumbModelFromConfig` returns `kind: 'ok'`, `approximate: false`, and cells equal to `layoutTopFace` | evidence: verify.txt
- [ ] A8 | For the 20-strip × 26-row config in `tests/library-thumb.test.tsx` (520 cells), the model is `kind: 'ok'`, `approximate: true`, with at most 1024 cells whose rects span x from 0 to `widthIn` and y from 0 to `heightIn` | evidence: verify.txt
- [ ] A9 | For `buildSchemaMaxConfig()` (`tests/fixtures/board-design.ts`), the model is `approximate: true` with at most 1024 cells spanning the whole board | evidence: verify.txt
- [ ] A10 | For a 30-strip × 20-row design with every strip in Walnut (600 cells), every downsampled rect is Walnut's `colorHex` and there is exactly one rect per grid row | evidence: verify.txt
- [ ] A11 | `DesignThumbnail` for the A8 config renders an `<svg`, no `Too many pieces to preview`, and its `<rect` elements carry neither a `stroke` nor a `stroke-width` attribute | evidence: verify.txt
- [ ] A12 | `too-complex` appears in neither `library-thumb.ts` nor `design-thumbnail.tsx` | evidence: file:line
- [ ] A13 | `library-thumb.ts` no longer contains the phrase `must degrade` | evidence: file:line

## Library title (T3)

- [ ] A14 | The `metadata` exported by `src/app/designer/library/page.tsx`, read by importing the module, has `title === 'Saved Boards'` | evidence: verify.txt

## 3D fallback (T4)

- [ ] A15 | `previewFallbackReason` returns exactly `Too many pieces for the 3D preview — showing the flat view.`, `The 3D preview stopped — showing the flat view.`, and `3D preview isn't available on this device — showing the flat view.` for the three cases, `null` otherwise, with that precedence (cells over lost over unavailable) | evidence: verify.txt
- [ ] A16 | `BoardPreview` rendered in jsdom (no WebGL) shows `3D preview isn't available on this device — showing the flat view.` and no `Try 3D again` button | evidence: verify.txt
- [ ] A17 | When the 3D canvas reports a lost context, `BoardPreview` shows `The 3D preview stopped — showing the flat view.` and a `Try 3D again` button; clicking it removes that message | evidence: verify.txt
- [ ] A18 | `board-preview.tsx` contains none of `SVG preview`, `WebGL context lost`, `WebGL is unavailable` | evidence: file:line

## Harlequin (T5)

- [ ] A19 | The Harlequin template finishes 12.25 × 14 × 1.5 with warnings `[]` | evidence: verify.txt
- [ ] A20 | Harlequin has 14 strips alternating `tr`, `tl` starting with `tr`, panel thickness 1, `rowPattern` `[none, mirrorY]`, and `rowCount` 14 | evidence: verify.txt
- [ ] A21 | Harlequin's wedge web is continuous, its lattice closes, and its walnut component count is 56 at both 40 and 48 samples per inch | evidence: verify.txt
- [ ] A22 | Harlequin's board-feet total formats as `2.84` and its default cut plan buys 4 boards | evidence: verify.txt
- [ ] A23 | In `templates.ts`, the diff against baseline touches only the Harlequin entry and its comment | evidence: file:line

## Copy gate

- [ ] A24 | `PLANER_WIDTH_WARNING` and the three fallback messages contain no `\d+\.\d+`, no `$`, and none of `drum sander`, `router sled`, `tear-out`, `blowout` | evidence: verify.txt

---

## Regression gate — any FAIL voids the sprint

- [ ] R1 | `npm run verify` reports all four steps PASS and `=== EXIT: 0 ===` | evidence: verify.txt
- [ ] R2 | No change to `serialize.ts`, `types.ts`, `design-board-feet.ts`, `lumber-allowance.ts`, `cut-pieces.ts`, `build-steps.ts`, `src/lib/cut-optimizer.ts`, `src/app/actions/board-designs.ts`, or `src/lib/board-designs.ts` | evidence: file:line
- [ ] R3 | No change under `prisma/`, `content/`, or `public/`, or to `src/lib/public-routes.ts`; no migration added | evidence: file:line
- [ ] R4 | No existing test assertion is changed, deleted, or skipped except the six items in PLAN T6 "Authorised test changes" | evidence: file:line
- [ ] R5 | No new dependency in `package.json` | evidence: file:line
- [ ] R6 | No `shadow-[…]` literal is introduced, and `panel-geometry.ts` imports neither `./layout` nor `./miter-geometry` | evidence: file:line
- [ ] R7 | Board-feet totals for the eight non-Harlequin templates still format as `['1.17', '3.19', '2.27', '1.03', '1.76', '2.45', '2.70', '2.12']` | evidence: verify.txt

## Manual — graded, not scored (outside the 31)

- [ ] M1 | `npm run build` succeeds | evidence: manual
- [ ] M2 | Signed in on notchplans.com: the library tab title begins "Saved Boards" (the root layout appends " · Notch") and the "verify-65" board shows a picture instead of "Too many pieces to preview"; a new board (Checkerboard) shows the planer warning on Metrics; loading the Harlequin template shows a 12 1/4" × 14" board | evidence: manual
