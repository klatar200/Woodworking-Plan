# Sprint 76 — Designer header/nav + layout

## Objective
Turn the `/designer` header from a horizontal list of buttons into a real navigation bar, stop the
preview card from scrolling its own render, and swap the two panes so work reads left-to-right.

## Why now
Keagan change list 2026-07-27. Sprints 67–72 relaid out the designer shell; this is the round-2
correction from using it. Everything here is layout, copy, and placement — no new capability.

## Definition of done
A signed-in user on `lg+` sees: a header that reads Board Settings → board name → Undo/Redo/Reset
on the left and shopping-list action on the right; panels on the left, preview on the right; a
preview card tall enough for its own render; and a Save control in the preview card header.

## In scope
- `designer-shell.tsx` — header layout, grid column order, Save relocation
- `board-preview.tsx` — card sizing, Save in card header, remove the degree readout
- `board-settings.tsx` — Edge/End designation + overall-size **display and validation**
- `Your boards` → **Saved Boards**: six occurrences across five files (`designer-narrow.tsx` has
  two), plus the one test that asserts the old string

## Out of scope — do not touch
- **The Build Plan generator.** D5 build steps are authorised but run as their own track after
  Sprint 77. This sprint only reserves layout space — see below.
- **Any size solver.** DECISIONS_LOG 2026-07-27 authorises display+validate ONLY. Typing a target
  size must never resize or re-solve panels/strips.
- Panels workflow — Add Panel, the Label/Thickness form, strip table density: **Sprint 77**.
- D3 procedural textures, D7 safety guidance — still gated.
- Any schema change, any migration, `src/lib/cut-optimizer.ts`, material math from Sprint 73.
- The dark palette. Re-palette is a separate unopened sprint (CLAUDE.md §6).

## Non-goal
This is not a visual redesign. Token usage, spacing scale, and component styling stay as they are;
what changes is what sits where.

## Reserved, not built
The header's right-hand action group must be structured to hold **two** controls so the D5 track
does not force a second relayout. Until that track lands, only the shopping-list action renders.
**Ship no disabled Build Plan button** — a dead control on a reachable page is worse than an
absent one.
