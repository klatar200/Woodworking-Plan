# Sprint 78 — SCORECARD

Grader: Cursor. Branch: `cursor/sprint-78-build-steps`.
Verify: full `npm run verify` → `sprints/78/verify.txt` (raw).

Grade = PASS ÷ 23 (A+R only). Gate ≥95% (22/23). Any R FAIL voids.

**Round 1** (`FIXES.md`): F1 mill keyed by species+thickness; F2 mill `count` =
distinct rip widths; F3 human transform names; F4 `stripDisplayName` in dry-fit.
F2 meaning accepted as written (distinct rip widths = boards to mill to).

**Round 2:** F5 — `endSteps` mill-stock detail lists all distinct panel thicknesses
when >1; `edgeSteps` unchanged.

---

## Module shape (T1)

- A1 | PASS | `src/lib/board-designer/build-steps.ts:291` — `export function designBuildSteps`
- A2 | PASS | imports only `@/lib/format` + `@/lib/board-designer/*`; source guard; `verify.txt:131`
- A3 | PASS | `verify.txt:131` — shape test asserts non-empty fields + `quantities` array
- A4 | PASS | literal slug ids in `build-steps.ts`; source guard rejects `randomUUID` / index templates
- A5 | PASS | `verify.txt:131` — deep-equal determinism test

## Edge grain (T2)

- A6 | PASS | `verify.txt:131` — exact `EDGE_IDS` sequence
- A7 | PASS | `verify.txt:131` — no slicing / second glue-up
- A8 | PASS | `verify.txt:131` — buffer string only in `flatten` detail

## End grain (T3)

- A9 | PASS | `verify.txt:131` — exact `END_IDS` sequence
- A10 | PASS | `verify.txt:131` — buffer in `flatten-panel` + `flatten-board` only
- A11 | PASS | `build-steps.ts` — `metrics.sliceCount` in `endSteps` / `crosscut-slices`
- A12 | PASS | `verify.txt:131` — `2-step`, `as designed`, `turned 180°`; no raw enum slugs

## Shared correctness

- A13 | PASS | `verify.txt:131` — walnut `repeat: 3` → rip count 3
- A14 | PASS | no `wasteFactor` in `build-steps.ts`
- A15 | PASS | `verify.txt:131` — no `detail` matches `/\d+\.\d+/`
- A16 | PASS | `build-steps.ts:60–67` — `metrics.panelPlan`, skip `rows === 0`
- A17 | PASS | `verify.txt:131` — `tests/board-designer-build-steps.test.ts` (20 tests)

## Regression gate

- R1 | PASS | `verify.txt:215–220` — all four PASS, `=== EXIT: 0 ===`
- R2 | PASS | No `prisma/` / `content/` / `cut-optimizer.ts` in diff
- R3 | PASS | No `src/components/` or `src/app/` in diff
- R4 | PASS | `serialize.ts` / `BoardDesignConfig` unchanged
- R5 | PASS | No safety coaching in step copy; no `$`
- R6 | PASS | `package.json` not in diff

## Manual (graded, not scored)

- M1 | PASS | `npm run build` → exit 0 (prior run; Round 1 is pure lib + tests)

---

## Score

A+R: 23 PASS / 0 FAIL = **100%** (≥95%). No R FAIL.
M: 1 PASS (excluded). Round 2 deltas applied.
