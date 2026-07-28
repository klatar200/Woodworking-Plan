# Sprint 78 — Build-steps library (D5 track, 1 of 3)

## Objective
Derive an ordered, grain-correct build guide from a saved board design. Pure library only — no UI,
no route, no persistence.

## Why now
D5 build steps were ungated 2026-07-27 and BUILD_PLAN §4 lists the track as next now that 76 and 77
are closed. It is the flagship reason the designer exists: a design that cannot tell you how to
build it is a picture.

**The cut list already exists.** `designCutPlan` (`src/lib/board-designer/design-cut-plan.ts:27`)
packs parts per species through the shared optimizer, and the dock already renders it. This sprint
adds the thing that does not exist — the ordered sequence of operations — and reuses everything
else.

## Track shape (3 sprints, scoped at open per BUILD_PLAN §4)
1. **78 — this sprint.** Pure `designBuildSteps()` + tests. Nothing rendered.
2. **79.** Surface it: the Build Plan control in the header slot Sprint 76 reserved, a route, and
   print integration.
3. **80.** Polish from real use.

Logic before surface, the same order `cut-optimizer` was built in. A generated build guide that is
subtly wrong about glue-up stages is worse than none, and that is far cheaper to prove in a test
than through a page.

## Definition of done
`designBuildSteps(config, metrics)` returns an ordered `BuildStep[]` for any valid design. Edge
grain yields one glue-up; end grain yields a first glue-up, a crosscut into slices, and a second
glue-up. Quantities and dimensions come from the existing libraries, and every dimension reads as a
tape-measure fraction.

## In scope
- **New:** `src/lib/board-designer/build-steps.ts` — types + `designBuildSteps()`
- **New:** `tests/board-designer-build-steps.test.ts`

## Out of scope — do not touch
- **Any UI.** Nothing under `src/components/` or `src/app/` changes this sprint. The Build Plan
  control is Sprint 79; the header slot stays empty (Sprint 76 `RESERVED`, and "ship no disabled
  placeholder" still binds).
- **Safety guidance.** D7 is **still gated** (DECISIONS_LOG 2026-07-27). A build guide invites
  "wear eye protection" and similar — do not add any. Not one sentence.
- **Dollar figures.** D2, tiers only. No prices, no cost text.
- **New material maths.** Board feet, plane buffer, and packing already exist and are Sprint 73's
  settled output. Compose them; do not re-derive them.
- `src/lib/cut-optimizer.ts`, any schema change, any migration, D3 procedural textures.

## Non-goal
Not a woodworking course. Steps state what to do and with what dimensions, in order. Technique
coaching, tool recommendations, and finishing advice are not this sprint and mostly not this
product.
