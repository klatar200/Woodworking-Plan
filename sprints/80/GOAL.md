# Sprint 80 — Build guide correctness (D5 track, 3 of 3)

## Objective
A builder who follows the build guide, the cut plan, and the print sheet for any template gets
the board the designer shows. Today they cannot: the guide's strip length comes from a hidden
edge-grain field, mitered boards never mention the second species, every cut is at finished size
and is then planed undersize, and unused panels add phantom boards to the buy list.

## Why now
BUILD_PLAN §4 D5 track, Sprint 80. Re-scoped by Keagan 2026-10-16 after the designer
consumer-readiness audit: this sprint takes the **build-guide correctness** findings
(audit #3, #4, #5, #7, #8, #12, dry-fit) plus CARRY-1 and CARRY-2. Save safety and controls
are Sprint 81. CARRY-3 (strip-row compacting) is dropped from this sprint.

## Definition of done
For every one of the nine templates, every length/width/thickness the guide tells you to cut is
the same number the cut plan packs and the board-feet estimate buys for; finishing steps name
the finished dimension they bring the board to; and a design's unused panels contribute nothing
to any of the three. **One documented exception:** for mitered strips the board-feet estimate keeps
its area split — it counts the wood kept when both composite mates are used, as the print note
says — while the guide and cut plan list full partner strips. Board feet are pinned (R4); this
sprint does not reconcile that.

## The model this sprint makes consistent — read before the PLAN
One rule, applied everywhere: **cut where the Sprint 73 material maths budgets an allowance;
finish to the design's dimension.** Sprint 73's maths (`lumber-allowance.ts`) budgets exactly two
allowances, and this sprint invents no third:

| Axis | Sprint 73 budgets | So the guide says |
|---|---|---|
| Strip width (strip-stack axis) | `planeBuffer` per strip | rip at width + buffer, joint to width |
| End-grain slice (board thickness) | `planeBuffer` per slice | crosscut slices at slice + buffer, flatten the board to slice |
| End-grain strip length | `rows × (slice + buffer) + (rows − 1) × kerf` | crosscut strips to that, per panel |
| Panel thickness | none — finished | mill to thickness, flatten the panel to thickness |
| Edge-grain length | none — `sourceLengthIn` | crosscut to `sourceLengthIn`; "square both ends" promises no length |

Mitered strips follow the composite method the print sheet already documents
(`src/app/designer/[id]/print/page.tsx:258`): each mitered strip is paired with a partner strip
of its wedge species, cut at the same size; one rip yields the strip and its mate.

## In scope
- **New** `src/lib/board-designer/cut-pieces.ts` — the one source of cut dimensions
- **New** `src/lib/board-designer/miter-labels.ts` — the corner/angle vocabulary and composite method text
- `src/lib/board-designer/lumber-allowance.ts` — expose the cut-length formula it already contains
- `src/lib/board-designer/build-steps.ts` — guide content and the shared quantity formatter
- `src/lib/board-designer/to-parts.ts`, `src/lib/board-designer/design-cut-plan.ts` — cut plan from cut pieces
- `src/lib/board-designer/panel-geometry.ts` — one new warning (unused end-grain panel)
- `src/components/designer/optimizer-panel.tsx`, `src/components/designer/designer-dock.tsx` — default stock width
- `src/components/designer/metrics-panel.tsx` — cut length label/value
- `src/components/designer/strip-list.tsx` — corner labels from the shared map (no behaviour change)
- `src/app/designer/[id]/build/page.tsx`, `src/app/designer/[id]/print/page.tsx` — render through the shared formatter and vocabulary
- `tests/` — new coverage plus the exact assertion changes listed in PLAN "Authorised test changes"

## Out of scope — do not touch
- **Board-feet maths.** `src/lib/board-designer/design-board-feet.ts` is byte-identical, and every
  template's board-feet total is unchanged (R4 pins all nine). The miter area split stays as
  documented on the print sheet.
- **A new allowance.** No thickness allowance, no trim allowance, no change to `planeBuffer`'s
  meaning. If the model looks wrong, report it in SCORECARD — that is a D1 decision for Keagan.
- **`PanelPlan.requiredLengthIn`** — its formula and its tests stay exactly as they are. It stops
  being *displayed*; it is not redefined.
- **Safety or technique coaching (D7, still gated).** No PPE, no "never run end grain through a
  planer", no blade-tilt instructions. The guide states what to cut and to what size.
- **Dollar figures (D2).** Tiers only.
- Sprint 81 items: save validation, draft persistence, number-input clamping, panel delete, library
  delete confirm, unsaved-changes guard, Collapse, edge-grain miter visibility, mobile Build Plan link.
- `src/lib/cut-optimizer.ts`, `prisma/`, `content/`, `serialize.ts`, the `BoardDesignConfig` shape.
- The planer-width warning (audit P2, not in this sprint).

## Non-goal
Not a woodworking course and not a new material model. It makes the three surfaces that already
exist tell the builder the same numbers.
