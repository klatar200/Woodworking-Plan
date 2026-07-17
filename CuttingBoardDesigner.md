---
name: Cutting Board Designer
overview: 'Design (not implement) a cutting-board designer inside Woodworking Plan: trustworthy build steps first, then pattern library, then light share — Approach A architecture, gated on adding the feature to BUSINESS_PLAN.md before any code.'
todos:
  - id: biz-plan-gate
    content: Add cutting board designer to BUSINESS_PLAN + DECISIONS_LOG + open sprint in BUILD_PLAN (Keagan approval)
    status: pending
  - id: finalize-section-4
    content: Finalize instruction-generator + print section at sprint kickoff
    status: pending
  - id: sprint-domain
    content: 'Sprint: domain module + unit tests (after gate)'
    status: pending
  - id: sprint-ui
    content: 'Sprint: designer UI + print route (after gate)'
    status: pending
  - id: sprint-save
    content: 'Sprint: save/share schema + mine + allowlist/offline/nav (after gate)'
    status: pending
  - id: sprint-harden
    content: 'Sprint: hardening + scorecard ≥95 (after gate)'
    status: pending
isProject: false
---
# Cutting Board Designer — Design Plan

## Status

Design only. **No implementation until** the feature is added to [`BUSINESS_PLAN.md`](BUSINESS_PLAN.md) and a sprint is opened in [`BUILD_PLAN.md`](BUILD_PLAN.md) (record in [`DECISIONS_LOG.md`](DECISIONS_LOG.md)).

## Locked product decisions

- **Priorities:** (1) trustworthy shop output / guided build steps, (2) non-technical UI, (3) realistic look
- **V1 output:** cut sheet + guided build steps (not full catalog-style plan; that is later if popular)
- **Hosting:** inside the app at `/tools/cutting-board`
- **Modes:** edge-grain + end-grain (edge-grain default)
- **Patterns (v1):** stripes, checkerboard, chevron, basket weave, freeform (pinwheel later)
- **Persistence:** URL state for everyone; optional account save when signed in
- **Share (v1):** public read-only link per design; no Popular feed
- **BOM:** dimensional lumber via existing [`src/lib/cut-optimizer.ts`](src/lib/cut-optimizer.ts)
- **Units:** user-selectable; fractional inches default ([`formatInches`](src/lib/format.ts))
- **V1 scope:** pattern + build only (no juice groove / handles / 3D / dollar estimates)
- **Cost UI:** cost **tiers only** — never dollar estimates (conflicts with cuttingboarddesigner.com; our rule wins)
- **Architecture:** Approach A — React designer island + pure TS domain module + SSR/print route
- **References:** [cuttingboarddesigner.com](https://www.cuttingboarddesigner.com/) (UX north star); [MvRens/CuttingBoard](https://github.com/MvRens/CuttingBoard) (Unlicense — study math, do not embed Vue)

## Section 1 — UX flow (approved)

Mode → Size → Pattern → Woods/strips → live preview → Build steps + cut list + dimensional BOM → Print / Share / Save

- Plain-language edge vs end grain
- Preview always visible; end-grain also shows pre-crosscut glue-up
- Warn before pattern change wipes custom strips

## Section 2 — Domain model + math (approved)

Pure module `src/lib/cutting-board/` (no React/Prisma). Inches internally.

- Types: `Design`, `DerivedPlan`, `PatternId`, `Strip`, `WoodSpecies`
- Deterministic `derivePlan(design)` — same input → same output
- Kerf on every consuming cut; reuse Sprint 15 optimizer for buy list; impossible parts loud
- End-grain: glue-up → crosscut → flip/reorder → final glue
- Edge-grain: strips → glue only
- Unit tests own kerf, checkerboard flips, serialize round-trip, optimizer feed

## Section 3 — Routes, auth, save (approved)

| Route | Access |
|---|---|
| `/tools/cutting-board` | Public designer |
| `/tools/cutting-board/print` | Public print sheet |
| `/tools/cutting-board/[id]` | Public only if `isPublic` |
| `/tools/cutting-board/mine` | Private |

- Anonymous: URL-encoded design only (no DB spam)
- Signed-in Save → `CuttingBoardDesign` (`payload` Json, `isPublic` default false)
- Copy public link → set `isPublic` + share `/[id]`
- No `userId` from client; rate-limit writes; private ids 404
- Add `/tools/cutting-board/mine` to [`public/sw-policy.js`](public/sw-policy.js) `NEVER_CACHE_PREFIXES`
- Allowlist only public designer/print/`[id]` in [`src/lib/public-routes.ts`](src/lib/public-routes.ts)
- Nav: add Designer to `PUBLIC_NAV` in [`src/components/site-header.tsx`](src/components/site-header.tsx)

## Section 4 — Instruction generator + print (to finalize at sprint start)

- `buildSteps(derivedPlan)` → numbered plain-language steps (edge vs end templates)
- Print page mirrors plan print: browser Print → PDF, black-on-white, tape fractions
- Cut list + dimensional buying list on same sheet
- No generated PDF endpoint (offline rule)

## Section 5 — Preview bar (v1)

- Flat species colors (hex palette), not photo textures
- Top-down face; end-grain second “glue-up” strip view
- Textures / 3D deferred to “full studio” phase

## Suggested sprint split (when opened)

1. **Domain + tests** — `src/lib/cutting-board/*`, vitest
2. **Designer UI + print** — public routes, client island, print page
3. **Save + public share** — Prisma model/migration, actions, `/mine`, allowlist/offline/nav
4. **Hardening** — a11y, mobile layout, scorecard ≥95

## Explicitly out of v1 / later

- Pinwheel, juice groove, handles, feet, 3D orbit, AR, Popular gallery, dollar cost estimates, catalog-style full plan pages, Vue port of MvRens

## Pre-code gate (required)

1. Add feature to `BUSINESS_PLAN.md` (e.g. Phase 4 / Tools)
2. Log decision in `DECISIONS_LOG.md`
3. Open sprint(s) in `BUILD_PLAN.md` §4
4. Then implement on trunk per existing process
