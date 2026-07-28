# Sprint 79 — SCORECARD

Grader: Cursor. Branch: `cursor/sprint-79-build-guide`.
Verify: full `npm run verify` → `sprints/79/verify.txt` (raw).

Grade = PASS ÷ 26 (A+R only). Gate ≥95% (25/26). Any R FAIL voids.

---

## One vocabulary (T1)

- A1 | PASS | `src/lib/board-designer/build-steps.ts:14` — imports `ROW_TRANSFORM_LABELS`; no `TRANSFORM_NAME`
- A2 | PASS | `verify.txt:72` — `board-designer-build-steps` arrange-rows asserts `Turned end-for-end`
- A3 | PASS | `verify.txt:82` — guide + print tests assert no `rot180|mirrorX|mirrorY`
- A4 | PASS | `verify.txt:82` — same-wording test; both surfaces contain `As cut` / `Turned end-for-end`

## The route (T2)

- A5 | PASS | `src/app/designer/[id]/build/page.tsx:14` `force-dynamic`; `:18` robots noindex
- A6 | PASS | `build/page.tsx:35–38` — `requireUser()` → `getDesign(id)` → `notFound()`; no userId from params
- A7 | PASS | `src/lib/public-routes.ts` — no `/designer`/`/build` entry; `verify.txt:82` allowlist test
- A8 | PASS | `public/sw-policy.js:70` still `/designer` only; `verify.txt:110` — `offline.test.ts` PASS
- A9 | PASS | `verify.txt:82` — titles in `designBuildSteps` order
- A10 | PASS | `verify.txt:82` — every `detail` string present (HTML-escaped inch marks)
- A11 | PASS | `verify.txt:82` — numbered `1. `…`n. ` in document order
- A12 | PASS | `verify.txt:82` — quantities test: count, label, `formatInches` dims; `build/page.tsx:27–29`
- A13 | PASS | `verify.txt:82` — guide text has no `/\d+\.\d+/`

## The control (T3)

- A14 | PASS | `designer-shell.tsx:189–195` — `{shoppingListControl}` then Build Plan inside `ml-auto` group
- A15 | PASS | `verify.txt:82` — `href="/designer/design-saved/build"`
- A16 | PASS | `verify.txt:82` — with `designId === null` no `Build Plan`
- A17 | PASS | `designer-shell.tsx:189` — `ml-auto flex flex-wrap items-center gap-[0.5rem]` byte-identical to merge-base

## Print (T4)

- A18 | PASS | `print/page.tsx:42` + `:189–233` — `designBuildSteps` Build plan section; `verify.txt:82`
- A19 | PASS | `print/page.tsx:189` `print-section`; `:191` `print-table` retained (not utilities)

## Copy gates

- A20 | PASS | `verify.txt:82` — no PPE/safety sentence; no `$` on guide or print build steps

## Regression gate

- R1 | PASS | `verify.txt:231–236` — all four PASS, `=== EXIT: 0 ===`
- R2 | PASS | no diff under `prisma/`, `content/`, `src/lib/cut-optimizer.ts`; no migration
- R3 | PASS | `build-steps.ts` diff = import `ROW_TRANSFORM_LABELS` + delete `TRANSFORM_NAME` + use in `arrangeRowsDetail` only
- R4 | PASS | `serialize.ts` / `types.ts` `BoardDesignConfig` not in branch diff
- R5 | PASS | no `shadow-[…]` in new/changed designer surfaces
- R6 | PASS | `package.json` not in branch diff

## Manual (graded, not scored)

- M1 | PASS | `npm run build` exit 0 — route list includes `/designer/[id]/build`
- M2 | FAIL | not run — Keagan

---

## Score

A+R: 26 PASS / 0 FAIL = **100%** (≥95%). No R FAIL.
M: 1 PASS, 1 FAIL (excluded from denominator).
