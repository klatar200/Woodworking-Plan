# Sprint 77 — PLAN

Executor: **Cursor**. Tasks are ordered; do not reorder. No task depends on another's output this
sprint — they touch three different files — so a task that turns out harder than expected does not
block the next one. Finish all four before running verify.

**Model: `Auto`.** One small reducer change and two localised UI changes, all against a written
bar. Do not spend premium usage on this sprint.

Read `GOAL.md` first. Its "Out of scope" list is enforced by the `R` gates in `ACCEPTANCE.md`.
The designer is **desktop-only (`lg+`)**, permanently (D6); the narrow-viewport path stays untouched.

**Test risk is low this sprint and that is a measured claim, not an assumption.** No test asserts
`add-panel`'s output, the Collapse/Expand label, or the DOM order of the strip editor. The two
tests naming `Selected strip details` (`designer-shell.test.tsx:117`, `strip-drag.test.tsx:230`
and `:239`) match by label, not by position, so T2 does not move them. If something does go red,
the scope note at the bottom governs.

---

## T1 · `add-panel` puts the panel on the board

`src/lib/board-designer/history.ts:228`–`246`

Today `add-panel` clones a source panel into `config.panels` and stops. `rowPattern` is untouched,
so in end grain the new panel contributes **no rows** — `layout.ts:128` only emits cells for panels
named by a row step. The user sees "Panel 2" appear in the list and nothing change in the preview,
and has to discover the Row pattern editor in the dock to make it real.

Append one row step for the new panel as part of the same action:

- The appended step is `{ panelId: <new panel id>, transform: 'none' }`.
- Exactly one step per `add-panel`. Not one per existing row, not a rebuilt pattern.
- **Respect the 24-step cap** (`add-row` enforces it at line 259; `config-limits.ts:5` derives the
  byte budget from it). If `rowPattern.length >= 24`, still add the panel, append nothing.
- The existing 4-panel cap at line 229 is unchanged: at 4 panels the action returns `config`
  untouched — no panel **and** no step.
- One history entry. This stays a single `add-panel` action; do not dispatch a second action.

**Guardrail — the one that will get broken.** `delete-panel` (line 247) leaves dangling
`rowPattern` entries **on purpose**, so `panel-geometry.ts:73` can warn "Row pattern uses a panel
that was deleted." T1 makes add asymmetric with delete and that asymmetry is correct: adding
infers intent, deleting must not silently destroy a pattern the user built. Do not "finish the
job" by cleaning up on delete.

**Guardrail:** `serialize.ts:197`'s rule that a `rowPattern` naming an absent panel is **rejected**
stays. T1 only ever appends a step for a panel that exists in the same returned config.

---

## T2 · Selected-strip editor above the strip list

`src/components/designer/strip-list.tsx`

The `<section aria-label="Selected strip details for …">` currently renders at lines 315–412,
*after* the `<ol>` at 198–313. With more than a few strips the editor is below the fold, so
selecting a strip appears to do nothing. Move the section so it precedes the list.

- DOM order, not visual order.
- The `aria-label` stays byte-identical: `Selected strip details for ${stripDisplayName(...)}`.
  Two tests match on that string.
- The zero-strip branch (lines 189–195, `Add a strip to see your board.`) is unchanged — with no
  strips there is no editor to show.

**Guardrail:** a CSS-only swap (`order-*`, `flex-col-reverse`, `direction`) leaves the tab sequence
reading bottom-to-top. This is the same trap as Sprint 76 T7 — swap the JSX, not the styling.

---

## T3 · Collapse and Delete stop looking like the same button

`src/components/designer/panel-editor.tsx:148`–`169`

The header row is `Collapse | N rows | Delete`, with Collapse and Delete both `btnGhost` — two
identically-styled controls with a piece of text wedged between them, one of which destroys work.

- **Delete's accessible name must name the panel** — `Delete Panel 2`, not `Delete`. Use
  `aria-label`; visible text may stay short.
- **Delete must not carry the same class string as the Collapse toggle.** Distinguish it as
  destructive using existing tokens (`text-danger` is already in use at
  `board-settings.tsx:130`). No new hex literal, no new token.
- **Move the row count out from between them.** After this task the two controls are adjacent
  siblings; where the count goes is your call as long as it is still rendered and still reads
  `N row` / `N rows` (the singular/plural at line 159 is existing behaviour — keep it).
- `aria-expanded` on the toggle (line 153) keeps tracking `open`.
- Delete stays `disabled` when `canDelete` is false, i.e. `config.panels.length <= 1` (line 70).

**Guardrail — CLAUDE.md §8:** `--accent` and `--danger` are theme tokens; the `contrast` guard
tests WCAG AA in **both** themes and the `dark-theme` guard tests `:root`/`.dark` parity. A colour
that only works in light fails the suite. Do not add a `dark:` utility — this codebase flips
tokens, it does not branch utilities.

**Guardrail:** touch targets stay ≥44px (`min-h-[2.75rem]`) on both controls.

---

## T4 · Close the Sprint 76 coverage gap

`tests/` only — no source change.

Sprint 76 shipped `targetDriftWarning` (`board-settings.tsx:216`) exported and untested, and
graded "entering a target changes no panel/strip/material value" from a source read rather than an
assertion. Close both.

- Direct unit coverage of `targetDriftWarning`: empty fields ignored · non-numeric ignored · a
  difference inside 1/16″ does **not** warn (it rounds to the same tape mark, `sameTapeMeasure` at
  line 243) · a larger difference warns and names the drifted dimension(s).
- One test asserting that typing into the target fields leaves the serialized config byte-identical.

**Guardrail:** assert the behaviour the app needs, not the shape of the implementation. Do not
export new internals to make testing easier — `targetDriftWarning` is already exported.

---

## Scope note — tests

PLAN's file references name **source** paths; T4 is explicitly a tests-only task. A test that
asserts behaviour this PLAN deliberately changes must be updated in the same commit, and that is
in scope — `npm run verify` has to be green for R1. The limit: update a test **only** where this
PLAN authorises the underlying change, and the update must track the new expected behaviour.
Deleting a test, loosening an assertion, or skipping it to get green is an out-of-scope change and
an `R` FAIL. No such update is expected this sprint (see the test-risk note at the top); if you
find one, do it and list it in SCORECARD.

## Invariants this sprint must not break

- **`delete-panel` asymmetry is deliberate** — see T1. The metrics warning depends on it.
- **Row-pattern caps** — 24 steps, 4 panels. `MAX_CONFIG_BYTES` is derived from those numbers
  (`config-limits.ts:5`); raising either without re-measuring the byte budget is how a save starts
  failing in prod.
- **Dimensions are tape-measure fractions**, never decimals (CLAUDE.md §7). T4 touches the
  formatter's consumers.
- **Cost = tiers only.** No dollar figure anywhere; `format.test` asserts `formatCents` /
  `formatCostRange` remain absent.
- **Elevation** — `shadow-e1/e2/e3` only, never a `shadow-[…]` literal; a guard scans these files.
- **`@media print` classes must stay on their elements** (CLAUDE.md §8) — broken three times.
- **Desktop-only (`lg+`)** — WebGL never below `lg`; the unsaved draft survives resize.

## Verification

```
npm run verify -- --out sprints/77/verify.txt
```
Never a shell redirect — `>` writes UTF-16LE on Windows and breaks every downstream parser.
Grade every `ACCEPTANCE.md` id in `sprints/77/SCORECARD.md`, citing `verify.txt:<line>` or
`<file>:<line>`, and state the branch name at the top. Do not edit `ACCEPTANCE.md`. Commit to
`cursor/sprint-77-<slug>`; do not push or merge.
