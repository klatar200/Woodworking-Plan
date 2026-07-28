# Sprint 78 — FIXES

## Round 1

Self-score against BUILD_PLAN §6 came in at 93/100, below the 95 gate. ACCEPTANCE passed 23/23 —
these are defects the bar failed to grade, not checks you missed. Four deltas, all inside
`src/lib/board-designer/build-steps.ts` and its test file. Change nothing else.

**F1 — `millQuantities` reports the wrong thickness for a species used at two thicknesses.**
It keeps the first `panel.thicknessIn` it sees per species and drops every later one, so a
multi-panel end-grain design silently understates what has to be milled. Key the map by
**species + thickness**, not species alone, and emit one quantity per distinct pair. A design with
Hard Maple in a 3/4" panel and a 1 1/2" panel must produce two Hard Maple mill entries.

**F2 — `millQuantities` counts strips, so "Mill stock" repeats the rip-strips number.**
Strips are ripped *from* boards; a count of strips is not a count of stock. Drop `count` from the
mill quantities and express the step as species + thickness only — `BuildStepQuantity.count` is
required by the type, so set it to the number of **distinct rip widths** for that species and
thickness, which is the number of different boards a builder actually has to mill to. If that
reads wrong to you, say so in SCORECARD rather than inventing a third meaning.

**F3 — `arrange-rows` prints raw enum values.** `Transforms used: none, rot180` is machine
jargon in the most important instruction of an end-grain build. Fill `TRANSFORM_NAME`
(currently an identity map, `build-steps.ts:37`) with builder-facing text:

| key | text |
|---|---|
| `none` | `as designed` |
| `rot180` | `turned 180°` |
| `mirrorX` | `mirrored left-to-right` |
| `mirrorY` | `mirrored top-to-bottom` |

Keep the sentence's existing shape — pattern length first, then the transforms — so the current
A12 assertions on `2-step` still hold. Update the test's `toContain('rot180')` to the new text.

**F4 — `dry-fit` ignores user strip labels.** It builds names from `speciesLabel` alone, so a
builder who named their strips sees species names instead. Use `stripDisplayName`
(`src/lib/board-designer/strip-display.ts:3`) — the app's existing strip-naming function, already
used by `strip-list.tsx` — and keep the `×N` repeat suffix.

**Tests to add** (same file):
- F1: two panels, same species, different `thicknessIn` → two distinct mill quantities.
- F3: `arrange-rows` detail contains `turned 180°` and does **not** match `/rot180|mirrorX|mirrorY/`.
- F4: a strip with an explicit `label` appears by that label in the `dry-fit` detail.

**Unchanged and still graded:** every existing ACCEPTANCE id. `wasteFactor` stays absent, the
`/\d+\.\d+/` rule still holds on every `detail` (`180°` contains no decimal), plane-buffer counts
stay once/twice, and the id sequences do not change.

## Round 2

One item — the tail of F1, and my miss for not seeing it when I wrote Round 1. Round 1 fixed the
mill **quantities** but not the mill **sentence**, so the two now contradict each other.

**F5 — `mill-stock` detail asserts a single thickness in `endSteps`.**
`build-steps.ts:219` still reads `const thickness = panels[0]?.thicknessIn ?? 0`, and the detail
says `Mill each species to <thickness> thick.` After F1 a multi-panel end-grain design lists two
thicknesses in `quantities` while the sentence above it names only the first — prose disagreeing
with data in the same step, which is worse than the original bug because it reads as authoritative.

In **`endSteps` only**, derive the distinct panel thicknesses from the same `used` entries the
quantities come from:
- exactly one distinct thickness → keep the current sentence unchanged.
- more than one → state them all, e.g. `Mill each species to its panel thickness: 3/4", 1 1/2".`
  Every value through `formatInches`; A15's `/\d+\.\d+/` rule still applies.

**Leave `edgeSteps` alone.** `panelGeometry` emits exactly one `panelPlan` entry for edge grain
(`src/lib/board-designer/panel-geometry.ts:48`), so `panels[0]` is the only panel there and the
existing sentence is correct.

**Test to add:** the two-panel mixed-thickness config from F1's test — assert `mill-stock` detail
names both thicknesses, and that a single-thickness design's sentence is unchanged.
