# Sprint 76 — PLAN

Executor: **Cursor**. Tasks are ordered; do not reorder — T2 moves the element T3 re-parents.

Read `GOAL.md` first. Its "Out of scope" list is enforced by the `R` gates in `ACCEPTANCE.md`.
The designer is **desktop-only (`lg+`)**, permanently (D6). Every task below is inside that gate;
the narrow-viewport notice path must keep working untouched.

---

## T1 · Rename "Your boards" → "Saved Boards"

Five call sites, all currently the string `Your boards`:

| File | Line | Context |
|------|------|---------|
| `src/app/designer/library/page.tsx` | 24 | `<h1>` |
| `src/app/designer/page.tsx` | 52 | header link |
| `src/app/designer/[id]/page.tsx` | 54 | header link |
| `src/app/shopping-list/page.tsx` | 136 | inline prose link |
| `src/components/designer/designer-narrow.tsx` | 40 | narrow-viewport link |

**Guardrail:** the shopping-list one sits inside a sentence — re-read that sentence after editing
so it still parses. Designer copy is settled in DECISIONS_LOG 2026-07-24; this entry amends only
this string, so leave `Designer`, `Design a board →`, `Board designer`, and the empty-library copy
exactly as they are.

---

## T2 · Preview card sizes to its render

`src/components/designer/board-preview.tsx`

The 2026-07-26 shell decision capped the preview at ~50–55vh with per-card scroll. **That cap is
retired for this card** (DECISIONS_LOG 2026-07-27 amendment): the card grows to contain its render
instead of scrolling it.

- Remove the viewport-height cap and the inner scroll on the preview card.
- The 3D canvas and the 2D view must both be fully visible without an inner scrollbar at `lg`
  and at `2xl`.
- Dock min-height ≥ ~12rem is **unchanged** — do not touch the dock's sizing.

**Guardrail:** sticky positioning of preview + dock is part of the shell decision and stays.
Removing a height cap from a sticky element can make it taller than the viewport — if that
happens, the page scrolls, the card does not.

---

## T3 · Save moves into the preview card header

`board-preview.tsx` + `designer-shell.tsx:176`

Move the existing `Save` control out of the shell header and into the **preview card header, far
right of that card's controls**. Behaviour, disabled states, and the `Save a copy` variant
(`designer-shell.tsx:121`/`126`) are unchanged — this is relocation only.

**Guardrail:** `Save a copy` is dirty-config → new id (Sprint 72). Do not merge it into `Save`,
do not change either one's disabled logic, and keep the "Save the design first" title on the
disabled variant.

---

## T4 · Remove the 2D degree readout

`board-preview.tsx:132` — the `{rotation}°` readout beside Rotate right.

Delete the readout. Rotation itself stays: the rotate controls, the 90°/270° axis-swap box sizing
at line ~153, and 2D export all keep working.

**Guardrail:** rotation is **view-only** (shell decision) — it must not become persisted state.
Deleting a readout must not change what `rotation` does.

---

## T5 · Header becomes a navigation bar

`src/components/designer/designer-shell.tsx`

Left to right:

1. **Board Settings** (existing disclosure — keep it a disclosure)
2. **Board name** — a text input showing the current design name, editable in place. **This value
   is what Save uses as the design name.** Wire it to the same name Save/`Save a copy` already
   consume; do not introduce a second name field or a parallel piece of state.
3. **Undo / Redo / Reset** — existing controls, grouped

Right edge:

4. **Add to shopping list** (existing, `designer-shell.tsx:103`–`108`)
5. **A reserved slot for Build Plan that renders nothing this sprint.** Structure the group for
   two controls. Do **not** ship a disabled button.

**Guardrail:** data parity — the 67–72 shell decision forbids retiring fields during relayout.
Every control currently in that header must still exist and still work afterwards. If something
has no obvious home in the new bar, say so in SCORECARD rather than dropping it.

---

## T6 · Board Settings: Edge/End + overall size

`src/components/designer/board-settings.tsx`

- Surface the existing **Edge/End grain** designation here (it exists — relocate/expose, do not
  reimplement; `grain → edge switches tab to Templates` behaviour from the shell decision stays).
- Show the design's **computed overall size** (L × W × T).
- Accept a **target** size the user can type, and warn when the computed size drifts from it.

**Guardrail — this is the one that will get broken.** DECISIONS_LOG 2026-07-27 authorises
**display + validation only**. The target must NOT resize panels, re-solve strips, or feed the
material math. It is a stated intent plus a warning, nothing more. A solver is explicitly not
authorised and would collide with Sprint 73.

**Guardrail — CLAUDE.md §7:** dimensions are tape-measure fractions, never decimals. A computed
overall size will produce values like `18.8125` — it must render as `18 13/16"`. Use the existing
dimension formatter (see `tests/board-designer-dimension-display.test.tsx`); do not write a new one
and do not print a raw float. **No dollar figures anywhere** (D2 — cost tiers only).

---

## T7 · Swap the two panes

`designer-shell.tsx:214`

```
lg:grid-cols-[minmax(0,1200px)_minmax(20rem,1fr)]
```

Preview is currently the left/first column and the dock the right/second. **Swap them** so the
dock (panels) is on the left and the preview on the right — verify which child is which before
reordering rather than assuming from the track sizes.

**Guardrail:** swap the DOM order too, not just the visual order. A CSS-only swap (`order`,
`direction`) leaves the tab sequence reading right-to-left, which breaks keyboard navigation.

---

## Invariants this sprint must not break

- **CLAUDE.md §7 dimensions** — tape-measure fractions, never decimals. T6 is the exposure.
- **Cost = tiers only.** `formatCents`/`formatCostRange` are deleted structurally and `format.test`
  asserts their absence. Do not reintroduce a dollar figure in Board Settings.
- **`@media print` classes must stay on their elements** (CLAUDE.md §8) — this has broken three
  times. T2/T3 move elements that the print sheet may target.
- **Elevation** — `shadow-e1/e2/e3` only, never a `shadow-[…]` literal; a guard test scans
  floating components.
- **Tailwind source order** — `py-*` fights `pb-*`; put `border` + colour on each variant; two
  `shadow-*` do not compose. Header/nav work is exactly where these bite.
- **Desktop-only (`lg+`)** — WebGL is never created below `lg`; the unsaved draft stays mounted
  across resize. Do not touch that path.

## Verification

```
npm run verify > sprints/76/verify.txt 2>&1
```
Grade every `ACCEPTANCE.md` id in `sprints/76/SCORECARD.md`, citing `verify.txt:<line>` or
`<file>:<line>`. Do not edit `ACCEPTANCE.md`. Commit and push the pack files with the code.
