# Sprint 77 — ACCEPTANCE

Bar author: Claude Code. Written before implementation. Grader: Cursor.
Locked by `ACCEPTANCE.sha256`.

Grade = PASS ÷ **29** — the `A` and `R` ids only (A1–A23 + R1–R6). Gate = **≥95%** (28/29). Any
`R` FAIL voids the sprint regardless of grade.

`M` ids are **excluded from the denominator**. They are graded, not scored: grade every one of them
like any other id, and if you cannot run it here, mark it `FAIL` with evidence `not run — Keagan`.
That costs you nothing. (`M1` is a plain `npm run build` — run it if you can; only `M2` needs a
human at a browser.)

Evidence format: `verify.txt:<line>` or `<file>:<line>` for every `A`/`R` id. For an id whose
ACCEPTANCE line says `evidence: manual`, cite what you actually did — the command you ran and its
result, or the file:line you inspected. "Manual" names how the check is confirmed, never a licence
to assert PASS without saying what confirmed it.

Baseline for every "before" comparison: the merge-base of this branch and `main` —
`git show $(git merge-base main HEAD):<file>`. Do not use `main` alone; it moves.

---

## add-panel (T1)

- [ ] A1 | `add-panel` appends exactly one `RowStep` to `rowPattern`, whose `panelId` is the newly created panel's id | evidence: file:line
- [ ] A2 | That step's `transform` is `'none'` | evidence: file:line
- [ ] A3 | With `rowPattern.length === 24`, `add-panel` adds the panel and appends **no** step | evidence: verify.txt
- [ ] A4 | With `panels.length === 4`, `add-panel` returns the config unchanged — no panel and no step | evidence: verify.txt
- [ ] A5 | `delete-panel` is unchanged and still leaves dangling `rowPattern` entries | evidence: file:line
- [ ] A6 | `panel-geometry` still raises `Row pattern uses a panel that was deleted.` for a dangling step | evidence: verify.txt
- [ ] A7 | `add-panel` remains ONE history entry — no second dispatch, no extra past state | evidence: verify.txt
- [ ] A8 | Unit coverage for A1–A4 exists in a named test file | evidence: verify.txt

## Strip editor placement (T2)

- [ ] A9 | In `strip-list.tsx`, the `Selected strip details` section appears **before** the strips `<ol>` in source order | evidence: file:line
- [ ] A10 | Rendered DOM order matches: the section's node precedes the `<ol>` node | evidence: verify.txt
- [ ] A11 | The swap uses no `order-*`, `flex-col-reverse`, or `direction` utility | evidence: file:line
- [ ] A12 | The label string is byte-identical to baseline: `Selected strip details for ` + display name | evidence: file:line
- [ ] A13 | With zero strips, the empty state still renders `Add a strip to see your board.` and no editor section | evidence: verify.txt

## Panel header legibility (T3)

- [ ] A14 | Delete's accessible name includes the panel's label (e.g. `Delete Panel 2`), not the bare string `Delete` | evidence: file:line
- [ ] A15 | Delete's `className` is not the same string as the Collapse/Expand toggle's | evidence: file:line
- [ ] A16 | Delete's distinction uses an existing token (e.g. `text-danger`) — no new hex literal and no new token added | evidence: file:line
- [ ] A17 | Collapse/Expand still sets `aria-expanded` from the panel's open state | evidence: file:line
- [ ] A18 | The row-count text is no longer rendered between the Collapse and Delete controls; the two are adjacent siblings | evidence: file:line
- [ ] A19 | Row count still renders and still reads `1 row` / `N rows` | evidence: verify.txt
- [ ] A20 | Delete is still `disabled` when the design has one panel | evidence: file:line
- [ ] A21 | Both controls keep a ≥44px target (`min-h-[2.75rem]`) | evidence: file:line

## Sprint 76 carry (T4)

- [ ] A22 | `targetDriftWarning` has direct unit coverage: empty ignored · non-numeric ignored · sub-1/16″ difference does not warn · larger difference warns and names the drifted dimension | evidence: verify.txt
- [ ] A23 | A test asserts that entering a target size leaves the serialized config byte-identical | evidence: verify.txt

---

## Regression gate — any FAIL voids the sprint

- [ ] R1 | `npm run verify` reports all four steps PASS and `=== EXIT: 0 ===` | evidence: verify.txt
- [ ] R2 | No change under `prisma/`, `content/`, or `src/lib/cut-optimizer.ts`; no migration added | evidence: file:line
- [ ] R3 | No schema change: `schemaVersion`, the 4-panel / 24-step / 40-strip caps, and `MAX_CONFIG_BYTES` are all unchanged | evidence: file:line
- [ ] R4 | `designer-shell.tsx` and `board-preview.tsx` are byte-identical to baseline — Sprint 76 territory untouched | evidence: file:line
- [ ] R5 | No `shadow-[…]` literal introduced; no class removed from an element targeted by an `@media print` rule | evidence: file:line
- [ ] R6 | No new dependency in `package.json` | evidence: file:line

## Manual — graded, not scored (outside the 29)

- [ ] M1 | `npm run build` succeeds | evidence: manual
- [ ] M2 | Signed-in walkthrough at `lg`, end grain: Add a panel → the new panel is visible in the preview without opening the Row pattern editor; select a strip → its editor sits above the list | evidence: manual
