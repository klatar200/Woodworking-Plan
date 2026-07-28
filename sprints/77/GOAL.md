# Sprint 77 — Designer panels workflow

## Objective
Make the panels column do what it looks like it does: adding a panel should put that panel on the
board, editing a strip should happen where you are looking, and Collapse/Delete should not read as
the same control.

## Why now
Keagan change list 2026-07-27, second half. Sprint 76 fixed the shell around the panels column;
this fixes the column itself. Everything here is behaviour and legibility inside three files — no
new capability, no schema change.

## Definition of done
On `lg+`, in end grain: pressing **Add a panel** produces a panel that is immediately visible in
the preview without touching the Row pattern editor. Selecting a strip shows its editor **above**
the strip list, not below it. A panel's Collapse and Delete controls are distinguishable at a
glance and Delete says which panel it deletes.

## In scope
- `src/lib/board-designer/history.ts` — `add-panel` appends a row-pattern step for the new panel
- `src/components/designer/strip-list.tsx` — selected-strip editor moves above the strip list
- `src/components/designer/panel-editor.tsx` — panel header Collapse/Delete legibility
- `tests/` — coverage for the above, plus the Sprint 76 carry (`targetDriftWarning`)

## Out of scope — do not touch
- **`delete-panel` symmetry.** It leaves dangling `rowPattern` entries **deliberately** so
  `panel-geometry.ts` can raise "Row pattern uses a panel that was deleted." Do not make delete
  "clean up after itself" — that silently discards a row pattern the user built.
- **Header, preview card, pane order** — Sprint 76 owns those; `designer-shell.tsx` and
  `board-preview.tsx` are untouched this sprint.
- **Sticky-preview pinning on tall docks.** Known and recorded (BUILD_PLAN Sprint 76 `CARRY`,
  DECISIONS_LOG 2026-07-28). Revisit when the D5 track changes dock height, not here.
- **Compacting the strip row.** Not in the BUILD_PLAN objective for 77; raising it is a new change
  list item, not this sprint.
- Any schema change, any migration, `src/lib/cut-optimizer.ts`, D3/D5/D7, new board styles.

## Non-goal
Not a visual redesign. Spacing scale, tokens, and component styling stay as they are except where
T3 explicitly requires two controls to stop looking identical.
