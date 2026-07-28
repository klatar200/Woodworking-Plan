# Sprint 78 — PLAN

Executor: **Cursor**. Tasks are ordered; do not reorder. **T1 before T2/T3** is binding — T1 defines
the step model both sequences emit. T4 is the test pass and comes last.

**Model: `Auto`.** One new pure module and its tests, against a written bar. Do not spend premium
usage on this sprint.

Read `GOAL.md` first. Its "Out of scope" list is enforced by the `R` gates in `ACCEPTANCE.md`.
This sprint touches **no** component and **no** route.

**This is a pure-library sprint.** Per BUILD_PLAN §6, category 6 (mobile/offline) has nothing to
score, so its 10 points move into category 2 (correctness) at close. Noted here so the self-score
is not argued about later.

---

## T1 · The step model

**Create** `src/lib/board-designer/build-steps.ts`

```ts
export interface BuildStepQuantity {
  label: string;            // e.g. "Hard Maple strips"
  count: number;
  lengthIn?: number;        // numbers, not strings — callers may re-format
  widthIn?: number;
  thicknessIn?: number;
}

export interface BuildStep {
  id: string;               // stable slug: 'rip-strips', 'glue-up-panel', …
  title: string;
  detail: string;           // one or two sentences; dimensions as tape fractions
  quantities: BuildStepQuantity[];   // may be empty, never undefined
}

export function designBuildSteps(
  config: BoardDesignConfig,
  metrics: BoardMetrics,
): BuildStep[];
```

Requirements:
- **Pure.** No React, no Next, no Prisma, no I/O. Imports limited to `@/lib/board-designer/*`,
  `@/lib/format`, and types.
- **Deterministic.** Same `(config, metrics)` in, byte-identical array out. Ids are stable slugs,
  never index-derived or random — Sprint 79 will use them as anchors.
- `quantities` carries **numbers**; `detail` carries the human sentence.

**Guardrail — CLAUDE.md §7 dimensions.** Every dimension in `detail` is a tape-measure fraction —
`13/16"`, never `0.8125`. Use the existing `formatInches` from `@/lib/format`; do not write a
second formatter. A library returning a preformatted sentence is an established pattern here —
`closingThicknessHint` (`src/lib/board-designer/miter-geometry.ts:63`) already does exactly this.

**Guardrail:** `quantities[].count` must come from the existing expansion, not a fresh loop —
`expandStripPieces` (`src/lib/board-designer/lumber-allowance.ts:11`) already accounts for
`strip.repeat`. Counting `panel.strips.length` is wrong for any design using repeats.

**Guardrail — which panels the stock steps cover.** Enumerate **`metrics.panelPlan`**
(`src/lib/board-designer/types.ts:111`), not `config.panels`. `panelGeometry`
(`src/lib/board-designer/panel-geometry.ts:25`) builds that array from the row pattern, so it
already contains exactly the panels the board actually uses — one entry for edge grain, and for
end grain only the panels a row step names. Iterating `config.panels` would put stock on the list
for a panel that contributes nothing, and would disagree with the cut list and the shopping list,
which are built from the same geometry.

**Guardrail — no raw decimals.** A test will assert that no `detail` string matches `/\d+\.\d+/`.
That is the whole rule: run every dimension through `formatInches` and never interpolate a raw
number. `formatInches(0.175)` is fine; `${planeBufferIn(config)}` is not.

---

## T2 · Edge-grain sequence

Edge grain glues once: strips stand on edge and the panel *is* the board.

Emit exactly these ids, in this order:

| # | id | Substance |
|---|-----|-----------|
| 1 | `mill-stock` | Mill each species to the panel thickness |
| 2 | `rip-strips` | Rip strips to width, per species, with counts |
| 3 | `crosscut-strips` | Crosscut to the panel length (`config.sourceLengthIn`) |
| 4 | `dry-fit` | Lay strips out in the panel's strip order |
| 5 | `glue-up-panel` | Glue and clamp — **one** glue-up |
| 6 | `flatten` | Plane flat, consuming the plane buffer |
| 7 | `trim-ends` | Trim to the finished length |
| 8 | `sand-finish` | Sand and finish |

**Guardrail — Sprint 73 material maths are settled.** `planeBufferIn(config)`
(`src/lib/board-designer/lumber-allowance.ts:6`) is the allowance **per glue-up stage**. Edge grain
has exactly one stage, so the buffer is counted once. Do not multiply it, and do not apply
`config.wasteFactor` anywhere in this module — that is the defects/snipe estimate and it lives on
the metrics and shopping surfaces. Applying it here double-counts, which is the same trap
documented at `src/lib/board-designer/design-cut-plan.ts:10`–`17`.

---

## T3 · End-grain sequence

End grain glues twice: build a panel, slice it across the grain, turn the slices, glue again.

Emit exactly these ids, in this order:

| # | id | Substance |
|---|-----|-----------|
| 1 | `mill-stock` | as T2 |
| 2 | `rip-strips` | as T2 |
| 3 | `crosscut-strips` | as T2 |
| 4 | `dry-fit` | as T2 |
| 5 | `glue-up-panel` | First glue-up — the panel |
| 6 | `flatten-panel` | Plane the panel flat (stage 1 buffer) |
| 7 | `crosscut-slices` | Crosscut into slices at `config.sliceThicknessIn` |
| 8 | `arrange-rows` | Turn slices end-up; arrange per `config.rowPattern`, honouring each step's `transform` |
| 9 | `glue-up-board` | Second glue-up — the board |
| 10 | `flatten-board` | Plane flat (stage 2 buffer) |
| 11 | `trim-ends` | Trim to finished length |
| 12 | `sand-finish` | Sand and finish |

- **Slice count is not new maths, and it is not `panelPlan[].rows`.** Use
  **`metrics.sliceCount`** (`src/lib/board-designer/types.ts:110`) — that is the total number of
  slices, and it is `0` for edge grain. `panelPlan[].rows`
  (`src/lib/board-designer/types.ts:98`) is rows *per panel*, a different number that will look
  right on a single-panel design and be wrong the moment there are two. Do not derive it from
  `config.rowCount` either; the metric already exists.
- `arrange-rows` must reflect the actual `rowPattern`, including its length and each step's
  `transform` (`'none' | 'rot180' | 'mirrorX' | 'mirrorY'`, `types.ts:59`). Concretely, a
  two-step alternating pattern should produce a `detail` along the lines of:
  *"Repeat a 2-slice pattern: panel Course, then panel Course turned 180°."* Prose wording is
  yours; what A12 grades is that the pattern length and every distinct transform present are
  stated.

**Guardrail:** end grain has **two** glue-up stages, so `planeBufferIn` is consumed twice — once at
`flatten-panel`, once at `flatten-board`. This is the single most likely thing to get wrong in this
sprint and it collides directly with Sprint 73 if it is.

**Guardrail:** `config.grain === 'edge'` must emit **no** slicing and **no** second glue-up. Extra
panels are unused in edge grain (`src/lib/board-designer/panel-geometry.ts:61`) — the sequence
follows grain, not panel count.

---

## T4 · Tests

**Create** `tests/board-designer-build-steps.test.ts`.

Cover, at minimum: the exact edge id sequence · the exact end id sequence · edge emits no slicing
step · plane buffer counted once for edge and twice for end · `wasteFactor` never applied · strip
counts respect `repeat` · every `detail` free of raw decimals · determinism across two calls.

Use the existing fixtures (`tests/fixtures/board-design.ts` — `makeV2Config`, `makePanel`,
`makeStrip`), as the other designer suites do.

**Guardrail:** assert the behaviour the guide needs, not the shape of the implementation. Do not
export internals purely to make them testable.

---

## Scope note — tests

T4 is a tests-only task; T1–T3 create one source file. No existing test should need changing —
this module is new and nothing imports it yet. If something does go red, that is a signal worth
reporting in SCORECARD, not a licence to loosen an assertion. Deleting a test, weakening one, or
skipping it to get green is an out-of-scope change and an `R` FAIL.

## Invariants this sprint must not break

- **D7 safety guidance is GATED.** No safety sentence anywhere in the module. A build guide is
  exactly where this creeps in.
- **D2 cost = tiers only.** No dollar figure, no price. `formatCents`/`formatCostRange` stay
  deleted; `format.test` asserts their absence.
- **Dimensions are tape-measure fractions** (CLAUDE.md §7), never decimals.
- **Sprint 73 material maths** — `planeBuffer` per glue-up stage, `wasteFactor` = defects/snipe
  only, and packing never receives estimate waste (`design-cut-plan.ts:10`–`17`).
- **`src/lib/cut-optimizer.ts` is not modified.** If a cut list is needed, it comes through
  `designCutPlan` (`design-cut-plan.ts:27`), never by calling `optimize()` directly.
- **No schema change** — `serialize.ts` and the `BoardDesignConfig` shape in `types.ts` are
  untouched. New types live in the new file.

## Verification

```
npm run verify -- --out sprints/78/verify.txt
```
Never a shell redirect — `>` writes UTF-16LE on Windows and breaks every downstream parser.
Grade every `ACCEPTANCE.md` id in `sprints/78/SCORECARD.md`, citing `verify.txt:<line>` or
`<file>:<line>`, and state the branch name at the top. Do not edit `ACCEPTANCE.md`. Commit to
`cursor/sprint-78-<slug>`; do not push or merge.
