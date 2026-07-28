# Sprint 79 — Build guide surface (D5 track, 2 of 3)

## Objective
Put the build guide in front of the user: one source of shop language, a private route that renders
`designBuildSteps()`, the Build Plan control in the header slot Sprint 76 reserved, and the steps on
the print sheet.

## Why now
Sprint 78 shipped `designBuildSteps()` and nothing renders it. The header slot has been sitting
empty by design since Sprint 76 — deliberately, because "ship no disabled placeholder" — and this
is the sprint that fills it.

## Definition of done
A signed-in owner opens a saved design, presses **Build Plan**, and gets an ordered guide with every
step's title, instruction, and quantities in tape-measure fractions. The print sheet carries the
same steps. A design that is not yours 404s. An unsaved draft shows no control at all.

## In scope
- `src/lib/board-designer/build-steps.ts` — **label source only**: use `ROW_TRANSFORM_LABELS`,
  delete the duplicate `TRANSFORM_NAME`. No logic change.
- **New:** `src/app/designer/[id]/build/page.tsx` — the guide route
- `src/components/designer/designer-shell.tsx` — Build Plan control in the reserved right group
- `src/app/designer/[id]/print/page.tsx` — build steps section
- `tests/` — coverage for the above

## Out of scope — do not touch
- **`designBuildSteps()` logic.** Sprint 78 closed at 97/100 after two fix rounds. T1 changes which
  label map it imports and nothing else. Step ids, ordering, quantities, plane-buffer counts, and
  slice sourcing all stay exactly as they are.
- **Safety guidance.** D7 is **still gated**. This is the sprint where a rendered build guide most
  invites "wear eye protection" — not one sentence, on screen or in print.
- **Dollar figures.** D2, tiers only.
- **A second label vocabulary.** After T1 there is exactly one map for transform wording. Do not
  add a third for the new route.
- Any schema change, any migration, `src/lib/cut-optimizer.ts`, D3 procedural textures, Sprint 80
  polish.

## Security — this route is private and owner-scoped
The guide exposes a user's saved design. It is modelled on `src/app/designer/[id]/print/page.tsx`,
which is already correct: `requireUser()`, then `getDesign(id)`, then `notFound()`. **Never** take a
user id from params, query, or body (CLAUDE.md §7 — that is an IDOR). The route does **not** go on
the `src/lib/public-routes.ts` allowlist, and it needs no service-worker change because
`/designer` is already a `NEVER_CACHE_PREFIXES` entry (`public/sw-policy.js:70`) and the match is
by prefix.

## Non-goal
Not a woodworking course, and not a redesign. It renders what Sprint 78 already derived, in the
existing visual language.
