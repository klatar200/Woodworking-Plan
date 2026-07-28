# Sprint 76 — ACCEPTANCE

Bar author: Claude Code. Written before implementation. Grader: Cursor.
Locked by `ACCEPTANCE.sha256`.

Grade = PASS ÷ **33** — the `A` and `R` ids only. Gate = **≥95%** (32/33). Any `R` FAIL voids the
sprint regardless of grade.

`M` ids are **excluded from the denominator**. They are graded, not scored: grade every one of them
like any other id, and if you cannot run it here, mark it `FAIL` with evidence `not run — Keagan`.
That costs you nothing. (`M1` is a plain `npm run build` — run it if your VM can; only `M2` needs a
human at a browser.)

Evidence format: `verify.txt:<line>` or `<file>:<line>` for every `A`/`R` id. For an id whose
ACCEPTANCE line says `evidence: manual`, cite what you actually did — the command you ran and its
result, or the file:line you inspected. "Manual" names how the check is confirmed, never a licence
to assert PASS without saying what confirmed it.

Baseline for every "before" comparison: the merge-base of this branch and `main` —
`git show $(git merge-base origin/main HEAD):<file>`. Do not use `origin/main` alone; it moves.

---

## Copy (T1)

- [ ] A1 | The string `Your boards` appears nowhere under `src/` | evidence: file:line
- [ ] A2 | All **six** occurrences across five files now read `Saved Boards` (`designer-narrow.tsx` has two: ~40 and ~118) | evidence: file:line
- [ ] A3 | The `shopping-list/page.tsx` sentence differs from baseline by the substring `Your boards`→`Saved Boards` and by nothing else | evidence: file:line

## Preview card (T2, T3, T4)

- [ ] A4 | The preview card has no viewport-height cap and no inner scroll container | evidence: file:line
- [ ] A5 | 3D render is fully visible with no inner scrollbar at `lg` and at `2xl` | evidence: manual
- [ ] A6 | 2D view is fully visible with no inner scrollbar at `lg` and at `2xl` | evidence: manual
- [ ] A7 | Dock min-height is unchanged from baseline | evidence: file:line
- [ ] A8 | `Save` renders in the preview card header, rightmost among that card's controls | evidence: file:line
- [ ] A9 | `Save` is absent from the shell header | evidence: file:line
- [ ] A10 | `Save a copy` behaviour, disabled state, and its "Save the design first" title are unchanged | evidence: file:line
- [ ] A11 | The `{rotation}°` readout is gone; rotate controls, axis-swap sizing, and 2D export still work | evidence: file:line
- [ ] A12 | `rotation` is still view-only — not written to the saved config | evidence: file:line

## Header nav (T5)

- [ ] A13 | Header order left-to-right is Board Settings, board-name input, Undo/Redo/Reset | evidence: file:line
- [ ] A14 | Board Settings is still a disclosure, not a always-open block | evidence: file:line
- [ ] A15 | The board-name input is bound to the same design name Save consumes — no second name field, no parallel state | evidence: file:line
- [ ] A16 | Editing the name then saving persists the typed name | evidence: manual
- [ ] A17 | `Add to shopping list` sits at the header's right edge | evidence: file:line
- [ ] A18 | The header's right-hand group is a single container element whose only rendered child is the shopping-list action, and the string `Build Plan` appears nowhere in the header subtree | evidence: file:line
- [ ] A19 | Every control in the baseline header still exists **somewhere in the designer UI** and still functions — relocated is fine (Save's new home is the preview card header, A8), dropped is not | evidence: file:line

## Board Settings (T6)

- [ ] A20 | Edge/End grain designation is reachable from Board Settings | evidence: file:line
- [ ] A21 | `grain → edge switches tab to Templates` still behaves as before | evidence: manual
- [ ] A22 | Computed overall size renders as tape-measure fractions (e.g. `18 13/16"`), never a raw decimal | evidence: file:line
- [ ] A23 | A target size can be entered and a drift warning appears when computed ≠ target | evidence: manual
- [ ] A24 | **Entering a target changes no panel, strip, or material value** — verified by comparing the serialized config before and after | evidence: manual
- [ ] A25 | No dollar figure appears anywhere in Board Settings | evidence: file:line

## Layout (T7)

- [ ] A26 | The dock/panels column renders left, preview right, at `lg+` | evidence: file:line
- [ ] A27 | The swap is a DOM reorder, not `order`/`direction` — keyboard tab sequence runs left-to-right | evidence: manual

---

## Regression gate — any FAIL voids the sprint

- [ ] R1 | `npm run verify` reports all four steps PASS and `=== EXIT: 0 ===` | evidence: verify.txt
- [ ] R2 | No change under `prisma/`, `content/`, or `src/lib/cut-optimizer.ts`; no migration added | evidence: file:line
- [ ] R3 | No `shadow-[…]` literal introduced; no class removed from an element targeted by an `@media print` rule | evidence: file:line
- [ ] R4 | `format.test` still passes and `formatCents`/`formatCostRange` remain absent | evidence: verify.txt
- [ ] R5 | Desktop-only path intact: no WebGL below `lg`, unsaved draft survives resize | evidence: manual
- [ ] R6 | No new dependency in `package.json` | evidence: file:line

## Manual — graded, not scored (outside the 33)

- [ ] M1 | `npm run build` succeeds | evidence: manual
- [ ] M2 | Signed-in walkthrough at `lg`: create a board, rename in the header, save, reopen — name persisted | evidence: manual
