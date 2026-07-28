# Sprint 78 — ACCEPTANCE

Bar author: Claude Code. Written before implementation. Grader: Cursor.
Locked by `ACCEPTANCE.sha256`.

Grade = PASS ÷ **23** — the `A` and `R` ids only (A1–A17 + R1–R6). Gate = **≥95%** (22/23). Any
`R` FAIL voids the sprint regardless of grade.

`M` ids are **excluded from the denominator**. They are graded, not scored: grade every one of them
like any other id, and if you cannot run it here, mark it `FAIL` with evidence `not run — Keagan`.
This is a pure-library sprint, so `M1` is the only manual check and you can almost certainly run it.

Evidence format: `verify.txt:<line>` or `<file>:<line>` for every `A`/`R` id. For an id whose
ACCEPTANCE line says `evidence: manual`, cite what you actually did — the command you ran and its
result, or the file:line you inspected. "Manual" names how the check is confirmed, never a licence
to assert PASS without saying what confirmed it.

Baseline for every "before" comparison: the merge-base of this branch and `main` —
`git show $(git merge-base main HEAD):<file>`. Do not use `main` alone; it moves.

---

## Module shape (T1)

- [ ] A1 | `designBuildSteps(config, metrics)` is exported from `src/lib/board-designer/build-steps.ts` and returns `BuildStep[]` | evidence: file:line
- [ ] A2 | The module imports nothing from `react`, `next`, `@prisma/client`, or any component/route path | evidence: file:line
- [ ] A3 | Every step has a non-empty `id`, `title`, `detail`, and an array `quantities` (never `undefined`) | evidence: verify.txt
- [ ] A4 | Ids are unique within a result and are stable slugs — not index-derived, not random | evidence: file:line
- [ ] A5 | Two calls with the same `(config, metrics)` produce deeply equal output | evidence: verify.txt

## Edge grain (T2)

- [ ] A6 | Edge grain emits exactly, in order: `mill-stock`, `rip-strips`, `crosscut-strips`, `dry-fit`, `glue-up-panel`, `flatten`, `trim-ends`, `sand-finish` | evidence: verify.txt
- [ ] A7 | Edge grain emits no slicing step and no second glue-up | evidence: verify.txt
- [ ] A8 | For an edge-grain design, `formatInches(planeBufferIn(config))` appears in exactly ONE step's `detail` — the `flatten` step | evidence: verify.txt

## End grain (T3)

- [ ] A9 | End grain emits exactly, in order: `mill-stock`, `rip-strips`, `crosscut-strips`, `dry-fit`, `glue-up-panel`, `flatten-panel`, `crosscut-slices`, `arrange-rows`, `glue-up-board`, `flatten-board`, `trim-ends`, `sand-finish` | evidence: verify.txt
- [ ] A10 | For an end-grain design, `formatInches(planeBufferIn(config))` appears in exactly TWO steps' `detail` — `flatten-panel` and `flatten-board` | evidence: verify.txt
- [ ] A11 | The slice count stated in `crosscut-slices` equals `metrics.sliceCount`; `config.rowCount` and `panelPlan[].rows` are not used for that number | evidence: file:line
- [ ] A12 | `arrange-rows` `detail` states the `rowPattern` length and names every distinct `transform` present in it | evidence: verify.txt

## Shared correctness

- [ ] A13 | Strip counts derive from `expandStripPieces`, so a strip with `repeat: 3` contributes 3 | evidence: verify.txt
- [ ] A14 | `config.wasteFactor` is not read anywhere in `build-steps.ts` | evidence: file:line
- [ ] A15 | No `detail` string matches `/\d+\.\d+/` — every dimension goes through `formatInches` | evidence: verify.txt
- [ ] A16 | Stock-related steps enumerate `metrics.panelPlan`, not `config.panels`, so an unused panel contributes no stock | evidence: file:line
- [ ] A17 | `tests/board-designer-build-steps.test.ts` exists and covers A5–A16 | evidence: verify.txt

---

## Regression gate — any FAIL voids the sprint

- [ ] R1 | `npm run verify` reports all four steps PASS and `=== EXIT: 0 ===` | evidence: verify.txt
- [ ] R2 | No change under `prisma/`, `content/`, or `src/lib/cut-optimizer.ts`; no migration added | evidence: file:line
- [ ] R3 | No file under `src/components/` or `src/app/` is modified — this sprint ships no UI | evidence: file:line
- [ ] R4 | No schema change: `serialize.ts` and the `BoardDesignConfig` shape in `types.ts` are unchanged | evidence: file:line
- [ ] R5 | No safety guidance anywhere in the new module (D7 gated) and no dollar figure anywhere (D2) | evidence: file:line
- [ ] R6 | No new dependency in `package.json` | evidence: file:line

## Manual — graded, not scored (outside the 23)

- [ ] M1 | `npm run build` succeeds | evidence: manual
