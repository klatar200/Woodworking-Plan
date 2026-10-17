# Sprint 82 — PLAN

Executor: **Claude Code** (implementing session, on `main`). Tasks are independent; do them in
order. Grading is done by a fresh-context subagent (`AGENTS.md` `Grade sprint NN`), never by the
implementing session.

Read `GOAL.md` first — its "Out of scope" list is enforced by the `R` gates. Every user-facing
string below is exact. Strings containing `'` or `"` go in JSX as JavaScript string expressions,
never literal JSX text (`react/no-unescaped-entities`; Sprint 81's guardrail).

---

## T1 · The planer warning checks the panel that gets planed

`src/lib/board-designer/panel-geometry.ts:129`–`130` warns when `finishedWidthIn > 24`. Both the
number and the axis are wrong:
- 24″ is industrial; a benchtop planer is 12½–13″.
- In end grain `finishedWidthIn` is the stack of rows. The thing that goes through a planer is
  each glued **panel**, whose width is the strip stack — `PanelPlan.widthIn`.

Replace it:
- `export const BENCHTOP_PLANER_WIDTH_IN = 13;` with a one-line comment (common benchtop planers,
  e.g. 13″ models; the guide's "Flatten the panel" step is where it bites).
- `export const PLANER_WIDTH_WARNING = 'Wider than a 13" benchtop planer — plan to hand-flatten.';`
  written as that literal string. Do not build it from `formatInches`; the test pins the text.
- Replace the block at `panel-geometry.ts:129`–`131` — it runs after the edge/end `if/else`, so
  `panelPlan` exists for both grains (edge builds it at `:48`, end at `:107`). Consider the panels
  that are used (edge grain: the one panel in `panelPlan`; end grain: plans with `rows > 0`). If the
  widest used panel's `widthIn` is greater than `BENCHTOP_PLANER_WIDTH_IN`, push
  `PLANER_WIDTH_WARNING` once.
- Delete the `finishedWidthIn > 24` check.

**Guardrail — D7 (still gated):** the message keeps "plan to hand-flatten" and adds nothing about
tools or technique.

**Guardrail:** `panel-geometry.ts` must still not import `./layout` or `./miter-geometry`
(`tests/board-designer-board-feet.test.ts:30`).

---

## T2 · Every saved board gets a thumbnail

`src/lib/board-designer/library-thumb.ts:43`–`45` gives up above `MAX_THUMB_CELLS` (500) and shows
"Too many pieces to preview" — any end-grain board past about 22 × 22 cells.

- Keep `MAX_THUMB_CELLS = 500` (`tests/library-thumb.test.tsx:17` pins it). At or under it, the
  model is exactly what it is today, with `approximate: false`.
- Above it, **downsample** instead of giving up. Add `export const THUMB_GRID = 32;` and
  `export const THUMB_SUPERSAMPLE = 3;`.
  - Grid: `THUMB_GRID` squares along the board's longer side, and
    `max(1, round(THUMB_GRID × shorter/longer))` along the shorter one.
  - Each grid square's colour is the average RGB of a `THUMB_SUPERSAMPLE × THUMB_SUPERSAMPLE` set
    of evenly spaced sample points in it, written as **uppercase `#RRGGBB`** — species colours are
    uppercase (`species.ts:10`), so a uniform area keeps exactly its species' `colorHex`. A sample's
    colour is the colour of the layout cell that contains it: the wedge's `colorHex` when
    `inWedge(cell, x, y)` (`miter-geometry.ts`), otherwise the cell's `colorHex`. A sample no cell
    covers (unequal panel widths leave gaps) takes `UNKNOWN_SPECIES_COLOR` (`species.ts:33`).
  - Each downsampled rect is a `Cell` with `speciesId: ''` and no `wedge`.
  - Find a sample's cell by binary search over row bands, then over x within the band — never a
    scan of every cell for every sample.
  - Merge horizontally adjacent squares of identical hex in a grid row into one rect.
  - The model is `{ kind: 'ok', cells, widthIn, heightIn, approximate: true }`. Its rects tile the
    whole board, and there are at most `THUMB_GRID × THUMB_GRID` of them.
- `ThumbModel`'s `'ok'` branch gains `approximate: boolean`. The placeholder reasons become
  `'invalid' | 'empty'`, and `placeholderLabel` loses its `'too-complex'` case — it is unreachable.
- `src/components/designer/design-thumbnail.tsx` — when `approximate`, draw the rects with no
  `stroke` and no `strokeWidth`. The grid lines would otherwise read as strips that are not in the
  design.

**Why downsampling and not a bigger cap:** the comment at `library-thumb.ts:12` rules out drawing a
*partial* board, and that still holds: the downsampled picture covers the whole board. A higher cap
would put tens of thousands of `<rect>`s into the library HTML. Rewrite that comment block
(`library-thumb.ts:6`–`14`) to describe the new behaviour: exact up to the cap, a whole-board
downsample above it, never a partial board. A stale comment that argues against the code is worse
than none (CLAUDE.md §7).

---

## T3 · The library tab says what it is

`src/app/designer/library/page.tsx:12` — `metadata.title` becomes `'Saved Boards'`.

---

## T4 · The 3D fallback speaks plainly and can retry

`src/components/designer/board-preview.tsx`
- Export the reason function (`board-preview.tsx:269`) as `previewFallbackReason`, with the same
  inputs, returning exactly:
  - too many cells: `Too many pieces for the 3D preview — showing the flat view.`
  - context lost: `The 3D preview stopped — showing the flat view.`
  - WebGL unavailable: `3D preview isn't available on this device — showing the flat view.`
  - otherwise `null`. Keep the current precedence: cells, then lost, then unavailable.
- Where the reason renders (`board-preview.tsx:179`): when the reason is the context-lost one, also
  render a `btnGhost` button `Try 3D again`. Clicking it re-runs `hasWebGL()`: if WebGL is still
  unavailable it sets `webglAvailable` to `false` (the "isn't available" message), so a GPU that is
  still gone never remounts a canvas that could throw into the error boundary; otherwise it sets
  `contextLost` to `false`, which remounts the canvas with a new context. No button for the other
  two reasons.
- Keep the identifiers `hasWebGL` and `webglAvailable` as they are.

---

## T5 · Harlequin is a cutting board

`src/lib/board-designer/templates.ts` — the Harlequin template goes from 8 strips × 8 rows to
**14 strips × 14 rows**. Change the `Array.from({ length: 8 }` to 14 (`templates.ts:375`) and
`rowCount: 8` to 14 (`templates.ts:388`). The strips keep their `tr`/`tl` alternation, and
everything else is unchanged. Update the comment block: `templates.ts:349` ("8 strips × 0.875″" →
14 strips) and `templates.ts:358`–`360` (finished 12¼ × 14 × 1½ = 14 × 0.875 · 14 × 1 · slice 1.5;
walnut is 42 full rhombi plus 14 edge-halves).

Why 14 × 14 and not 14 × 16: at 14 × 16 the walnut component count depends on the sampling
resolution (63 vs 53 at 40 and 48 samples/inch). That breaks the "identical at two resolutions"
invariant (`tests/board-designer-harlequin.test.ts:33`). 14 × 14 is stable at 56, still closes,
has no warnings, and stays under the 13″ planer limit (panel 12¼″).

---

## T6 · Tests

New coverage for every check in ACCEPTANCE. Two test recipes the pre-flight proved:
- **A17 (lost context in jsdom):** `vi.mock('next/dynamic', () => ({ default: () => Stub }))`, where
  the stub records the `onContextLost` prop; `vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
  .mockReturnValue({} as never)` so `hasWebGL()` is true; then call the recorded `onContextLost`
  inside `act()`. Do not fire it on mount — the retry would immediately re-lose.
- **A14:** import `src/app/designer/library/page.tsx` and read its exported `metadata`, mocking
  `@/lib/board-designs` and `@/app/actions/board-designs` as other route tests do — not a source regex.

### Authorised test changes — exactly these, nothing else
1. `tests/board-designer-reachability.test.ts:119` — the `wider-than-planer` witness's `needle`
   becomes `'Wider than a 13" benchtop planer — plan to hand-flatten.'`. Its config is unchanged:
   its 25″ edge-grain panel still triggers the rule.
2. `tests/library-thumb.test.tsx:53`–`74` — "over-budget designs degrade to a placeholder" becomes
   "over-budget designs render a downsampled whole board". On the same 20 × 26 config:
   - the model is `kind: 'ok'` with `approximate: true` and at most 1024 cells;
   - its rects span x from 0 to `widthIn` and y from 0 to `heightIn`;
   - the HTML has an `<svg` and no `Too many pieces to preview`.
3. `tests/board-designer-harlequin.test.ts`:
   - `:16` title → `finished 12¼ × 14 × 1½`
   - `:22` `toBe(7)` → `toBe(12.25)`; `:23` `toBe(8)` → `toBe(14)`
   - `:38` comment → `42 full + 14 half = 56`
   - `:49` `toBe(20)` → `toBe(56)`
   - `:52` `slice(0, 8)` → `slice(0, 14)`; `:53` `slice(8)` → `slice(14)`; `:54` `toHaveLength(12)` → `toHaveLength(42)`
4. `tests/board-designer-metrics.test.ts:252`–`253` — Harlequin `length: 7` → `12.25`, `width: 8` → `14`.
5. `tests/board-designer-cut-pieces.test.ts`:
   - `:57` `toHaveLength(16)` → `toHaveLength(28)`
   - `:116` title and `:129` — the last board count `2` → `4`
   - `:144` — Harlequin's pinned total `'0.92'` → `'2.84'`; the other eight stay
6. `tests/board-3d-layout.test.ts:75` — `/too many pieces for 3D preview|WebGL/i` becomes
   `/Too many pieces for the 3D preview/`. It would otherwise stay green only because the
   identifier `hasWebGL` contains "WebGL"; assert the copy itself.

Verified before locking: applying T5 alone turns exactly the six assertions in items 3–5 red and
nothing else, and Harlequin's area-tolerance assertions (`board-designer-harlequin.test.ts:55`–`65`)
still hold.

---

## Invariants this sprint must not break

- **Cost = tiers only; dimensions = tape fractions** (CLAUDE.md §7) — thumbnails and messages add no
  decimal inches.
- **D7 gated** — no tool or technique advice in the planer message.
- **Cheap path** — `panel-geometry.ts` imports neither `./layout` nor `./miter-geometry`.
- **Library page must not 500 on one bad row** (`library-thumb.ts:28`) — downsampling stays inside
  the existing never-throws path.

## Verification
```
npm run verify -- --out sprints/82/verify.txt
```
Then `git diff <lock-sha> HEAD --output=sprints/82/changes.diff`, where `<lock-sha>` is the commit
that added `sprints/82/ACCEPTANCE.sha256`. A fresh-context grader subagent writes
`sprints/82/SCORECARD.md`. Do not edit `ACCEPTANCE.md`.
