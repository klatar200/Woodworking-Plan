# Sprint 78 — SCORECARD

Grader: Cursor. Branch: `cursor/sprint-78-build-steps`.
Verify: full `npm run verify` → `sprints/78/verify.txt` (raw).

Grade = PASS ÷ 23 (A+R only). Gate ≥95% (22/23). Any R FAIL voids.

---

## Module shape (T1)

- A1 | PASS | `src/lib/board-designer/build-steps.ts:284` — `export function designBuildSteps`
- A2 | PASS | imports only `@/lib/format` + `@/lib/board-designer/*`; `tests/board-designer-build-steps.test.ts` source guard; `verify.txt:141`
- A3 | PASS | `verify.txt:141` — shape test asserts non-empty fields + `quantities` array
- A4 | PASS | literal slug ids in `build-steps.ts` (`'mill-stock'`, …); source guard rejects `randomUUID` / index templates
- A5 | PASS | `verify.txt:141` — deep-equal determinism test

## Edge grain (T2)

- A6 | PASS | `verify.txt:141` — exact `EDGE_IDS` sequence
- A7 | PASS | `verify.txt:141` — no `crosscut-slices` / `glue-up-board` / second flatten
- A8 | PASS | `verify.txt:141` — `formatInches(planeBufferIn(config))` only in `flatten` detail

## End grain (T3)

- A9 | PASS | `verify.txt:141` — exact `END_IDS` sequence
- A10 | PASS | `verify.txt:141` — buffer string only in `flatten-panel` + `flatten-board`
- A11 | PASS | `build-steps.ts:216` + `:258` — `metrics.sliceCount`; no `config.rowCount` for that number
- A12 | PASS | `verify.txt:141` — `arrange-rows` detail includes `2-step`, `none`, `rot180`

## Shared correctness

- A13 | PASS | `verify.txt:141` — walnut `repeat: 3` → count 3 in `rip-strips`
- A14 | PASS | `build-steps.ts` — no `wasteFactor` (source guard)
- A15 | PASS | `verify.txt:141` — no `detail` matches `/\d+\.\d+/`
- A16 | PASS | `build-steps.ts:59–66` — iterates `metrics.panelPlan`, skips `rows === 0`; unused Purpleheart absent from stock (`verify.txt:141`)
- A17 | PASS | `verify.txt:141` — `tests/board-designer-build-steps.test.ts` (17 tests)

## Regression gate

- R1 | PASS | `verify.txt:215–220` — all four PASS, `=== EXIT: 0 ===`
- R2 | PASS | Diff only adds `build-steps.ts` + its test (+ pack grade files); no `prisma/` / `content/` / `cut-optimizer.ts`
- R3 | PASS | No `src/components/` or `src/app/` in diff
- R4 | PASS | `serialize.ts` and `types.ts` BoardDesignConfig unchanged (not in diff)
- R5 | PASS | No PPE/safety sentences in step copy; no `$` / price text in module
- R6 | PASS | `package.json` not in diff

## Manual (graded, not scored)

- M1 | PASS | `npm run build` → exit 0

---

## Score

A+R: 23 PASS / 0 FAIL = **100%** (≥95%). No R FAIL.
M: 1 PASS / 0 FAIL (excluded from denominator).
