# Sprint 77 — SCORECARD

Grader: Cursor. Branch: `cursor/sprint-77-panels-workflow`.
Verify: full `npm run verify` → `sprints/77/verify.txt` (raw).

Grade = PASS ÷ 29 (A+R only). Gate ≥95% (28/29). Any R FAIL voids.

**Pack defect (not implementation):** `ACCEPTANCE.md` was edited in
`a28db9f` (pre-flight fixes) without re-locking `ACCEPTANCE.sha256`. That alone
fails `sprint-pack.test.ts` and voids R1. Needs
`node scripts/verify.mjs lock sprints/77` then re-verify — Cursor must not edit
the bar or its hash.

---

## add-panel (T1)

- A1 | PASS | `src/lib/board-designer/history.ts:255–257`; `tests/designer-history.test.ts:472–481`
- A2 | PASS | `src/lib/board-designer/history.ts:257`; `tests/designer-history.test.ts:479–481`
- A3 | PASS | `src/lib/board-designer/history.ts:249–250`; `tests/designer-history.test.ts:486–501`; suite green at `verify.txt:54`
- A4 | PASS | `src/lib/board-designer/history.ts:229`; `tests/designer-history.test.ts:504–519`; `verify.txt:54`
- A5 | PASS | `src/lib/board-designer/history.ts:261–268` (filter panels only; dangling comment); `tests/designer-history.test.ts:522–533`
- A6 | PASS | `verify.txt:35` — `tests/board-designer-metrics.test.ts` (includes dangling-panel warning case)
- A7 | PASS | `tests/designer-history.test.ts:483` — one `add-panel` → `past.length === 1`; `verify.txt:54`
- A8 | PASS | `tests/designer-history.test.ts` describe `add-panel — appends one row step (Sprint 77)`; `verify.txt:54`

## Strip editor placement (T2)

- A9 | PASS | `src/components/designer/strip-list.tsx:198–295` (section) before `:297–412` (`<ol>`)
- A10 | PASS | `tests/strip-drag.test.tsx:242–250`; `verify.txt:194`
- A11 | PASS | `strip-list.tsx` — JSX reorder only; no `order-*` / `flex-col-reverse` / `direction` utility on the swap
- A12 | PASS | `strip-list.tsx:200` byte-identical to merge-base template ``Selected strip details for ${stripDisplayName(...)}``
- A13 | PASS | `tests/strip-drag.test.tsx:253–258`; `verify.txt:194`

## Panel header legibility (T3)

- A14 | PASS | `src/components/designer/panel-editor.tsx:165` — `aria-label={`Delete ${panel.label}`}`; `tests/panel-editor-header.test.tsx:23–47`; `verify.txt:193`
- A15 | PASS | `panel-editor.tsx:164` `className={btnDanger}`; Collapse stays `btnGhost` (`:156`); `verify.txt:193`
- A16 | PASS | Diff does not touch `src/lib/ui.ts` or `globals.css`; `btnDanger` pre-existed (`text-err`); `tests/panel-editor-header.test.tsx:85–89`
- A17 | PASS | `panel-editor.tsx:157` — `aria-expanded={open}`
- A18 | PASS | `panel-editor.tsx:153–171` — Collapse+Delete sole children of one wrapper; row count is sibling outside (`:150–152`)
- A19 | PASS | `panel-editor.tsx:151`; `tests/panel-editor-header.test.tsx:56–57`, `:82` (`1 row` / `N rows`); `verify.txt:193`
- A20 | PASS | `panel-editor.tsx:166` `disabled={!canDelete}` with `canDelete={config.panels.length > 1}` at `:70`; `tests/panel-editor-header.test.tsx:65–81`
- A21 | PASS | Both use `btnGhost`/`btnDanger` → `btnBase` includes `min-h-[2.75rem]`; asserted in `tests/panel-editor-header.test.tsx:50–54`

## Sprint 76 carry (T4)

- A22 | PASS | `tests/board-settings-target.test.tsx:18–76`; `verify.txt:192`
- A23 | PASS | `tests/board-settings-target.test.tsx:81–111`; `verify.txt:192`

## Regression gate

- R1 | FAIL | `verify.txt:260–265` — test FAIL / `=== EXIT: 1 ===` solely from stale `ACCEPTANCE.sha256` (`verify.txt:239`); typecheck/lint/content PASS. Not a code defect.
- R2 | PASS | No diff under `prisma/`, `content/`, or `src/lib/cut-optimizer.ts`; no migration added (merge-base diff)
- R3 | PASS | Caps untouched; `config-limits.ts` / schema caps not in diff; `history.ts` still enforces 4 panels / 24 steps
- R4 | PASS | `designer-shell.tsx` and `board-preview.tsx` byte-identical to merge-base (empty diff)
- R5 | PASS | No `shadow-[…]` in touched designer files; no `@media print` class removals in this diff
- R6 | PASS | `package.json` not in diff vs merge-base

## Manual (graded, not scored)

- M1 | PASS | `npm run build` → exit 0 (Compiled successfully; routes listed)
- M2 | FAIL | not run — Keagan

---

## Score

A+R: 28 PASS / 1 FAIL = **96.6%** (≥95%) but **R1 FAIL voids the sprint**.
M: 1 PASS / 1 FAIL (excluded).

Next: re-lock `sprints/77/ACCEPTANCE.sha256`, re-run verify, update R1.
