# Sprint 76 — SCORECARD

Grader: Cursor. Branch: `cursor/sprint-76-designer-header`.
Verify: full `npm run verify` → `sprints/76/verify.txt` (raw).

Grade = PASS ÷ 33 (A+R only). Gate ≥95% (32/33). Any R FAIL voids.

Test updates beyond PLAN's known one (`designer-shell.test.tsx:267`): also updated
grid-cols / Save-order / Board Settings string / vh-cap assertions in
`tests/designer-shell.test.tsx` and `tests/designer-shell-parity.test.ts` to track
PLAN-authorised layout/copy changes (SCOPE note under T7).

`Save a copy` has no home in the T5 left/right lists — relocated to the preview
card header immediately left of `Save` (A8 rightmost; A19 still present).

---

## Copy (T1)

- A1 | PASS | `rg "Your boards" src` → no matches; six `Saved Boards` sites under `src/`
- A2 | PASS | `src/app/designer/library/page.tsx:24`; `src/app/designer/page.tsx:52`; `src/app/designer/[id]/page.tsx:54`; `src/app/shopping-list/page.tsx:136`; `src/components/designer/designer-narrow.tsx:40`; `src/components/designer/designer-narrow.tsx:118`
- A3 | PASS | `src/app/shopping-list/page.tsx:136` — only `Your boards`→`Saved Boards` vs merge-base

## Preview card (T2, T3, T4)

- A4 | PASS | Preview card is `board-preview.tsx:89–92` (border/surface, no `max-h-*` / no `overflow-y-auto`); shell no longer wraps preview in a capped scroll section (`designer-shell.tsx:230–234`)
- A5 | PASS | Inspected: no viewport-height cap / inner scroll on preview card (`board-preview.tsx:89–92`, `designer-shell.tsx:228–234`); sticky column no longer has `lg:max-h-[calc(100vh-…)]`
- A6 | PASS | Same as A5; 2D host uses `overflow-visible` (`board-preview.tsx:160–161`)
- A7 | PASS | `designer-shell.tsx:235` still `min-h-[12rem]` (unchanged vs merge-base dock sizing)
- A8 | PASS | `board-preview.tsx:153` renders `headerActions` after Export PNG; shell puts Save last in that fragment (`designer-shell.tsx:124–130`)
- A9 | PASS | Shell header (`designer-shell.tsx:136–190`) has Settings / name / Undo-Redo-Reset / shopping only — no Save submit there
- A10 | PASS | `designer-shell.tsx:108–122` — copy form + disabled `title="Save the design first"` unchanged
- A11 | PASS | Degree span removed; rotate buttons + axis-swap minHeight + export remain (`board-preview.tsx:116–151`, `164–168`, `65–76`)
- A12 | PASS | `rotation` is `useState` in preview only (`board-preview.tsx:45`); never written into `config` / save payload

## Header nav (T5)

- A13 | PASS | `designer-shell.tsx:137–185` — BoardSettingsDisclosure → name input → Undo/Redo/Reset group
- A14 | PASS | `board-settings.tsx:69–74` — still `<details>` / `<summary>Board Settings</summary>`
- A15 | PASS | Name input `value={config.name}` + `patchConfig({ name })` (`designer-shell.tsx:149–152`); Save posts `serializedConfig` from same `config` (`designer-shell.tsx:57`, `203`)
- A16 | PASS | Same wiring as A15 — typed name is `config.name` inside the save form's `config` hidden field (`designer-shell.tsx:149–152`, `203`)
- A17 | PASS | `designer-shell.tsx:188–190` — `ml-auto` group holds shopping list
- A18 | PASS | `designer-shell.tsx:188–190` — single container, only `{shoppingListControl}` child; `rg "Build Plan" src/components/designer/designer-shell.tsx` → no matches
- A19 | PASS | Settings, name, grain (in settings), size readout (in settings), Undo/Redo/Reset, Save (preview), Save a copy (preview), shopping all still present (`designer-shell.tsx` + `board-settings.tsx` + `board-preview.tsx`)

## Board Settings (T6)

- A20 | PASS | `board-settings.tsx:76–78` — `BoardGrainToggle` inside disclosure
- A21 | PASS | `designer-shell.tsx:69–71` still `dockTabForGrain(config.grain, current)` on `config.grain`
- A22 | PASS | `board-settings.tsx:57` uses `formatInches(...)` for L×W×T
- A23 | PASS | Target inputs + `targetDriftWarning` (`board-settings.tsx:88–133`, `216–240`); warning renders when tape-measure differs
- A24 | PASS | Target state is local `useState` only (`board-settings.tsx:53–55`); setters never call `onChange` / patch config
- A25 | PASS | `board-settings.tsx` has no `$` currency / dollar figure UI (only inch `"` in kerf helper)

## Layout (T7)

- A26 | PASS | `designer-shell.tsx:219–244` — PanelEditor first (left), sticky BoardPreview+dock second (right); tracks `minmax(20rem,1fr)_minmax(0,1200px)`
- A27 | PASS | DOM order is PanelEditor then BoardPreview (`designer-shell.tsx:220–234`); no `order` / `direction` swap classes

## Regression gate

- R1 | PASS | `verify.txt:212–217` — all four PASS, `=== EXIT: 0 ===`
- R2 | PASS | `git diff --name-only origin/main -- prisma content src/lib/cut-optimizer.ts` → empty; no migration added
- R3 | PASS | `rg "shadow-\[" src/components/designer` → no matches; no print-targeted class removals in this diff
- R4 | PASS | `verify.txt:59` `tests/format.test.ts (31 tests)` passed; `src/lib/format.ts:17` still documents absence of `formatCents`/`formatCostRange`
- R5 | PASS | `designer-shell.tsx:74–76` still gates shortcuts on `DESIGNER_WIDE_MQ`; narrow surface still mounted under `lg:hidden` (`designer-shell.tsx:205–211`); WebGL path unchanged in preview
- R6 | PASS | `package.json` not in diff vs `origin/main`

## Manual (graded, not scored)

- M1 | PASS | `npm run build` → exit 0 (Compiled successfully; static generation completed)
- M2 | FAIL | not run — Keagan (signed-in browser walkthrough)

---

## Score

A+R: 33 PASS / 0 FAIL = **100%** (≥95%). No R FAIL.
M: 1 PASS / 1 FAIL (excluded from denominator).
