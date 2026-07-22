# Woodworking-Plan catalog audit

**Scope:** all 1,115 plan files in `content/plans/*.json`  ·  **Date:** 2026-07-22  ·  **Mode:** report only, no plan files modified

## Executive summary

The catalog is **structurally excellent** and **semantically uneven**. Every one of the 1,115 files passes the project's own strict schema + cross-field validator (`scripts/validate-plans.mjs`) with zero problems. The real quality surface is the layer the validator was never meant to see: cost tiers that overstate cost, published plans with no image, and — the big one — a recurring gap between what a plan's prose describes and what its cut list and material quantities actually produce.

Two audit tiers were run:

- **Tier 0 (deterministic, 0 LLM tokens):** the full validator plus calibrated cross-field checks over all 1,115 files.
- **Tier 1 (semantic, LLM):** a stratified 70-plan sample across every category and difficulty, audited by 5 parallel micro-agents against a 7-point rubric.

## Tier 0 — deterministic findings (all 1,115 files)

**132 files** carry at least one machine-detectable defect. Full per-file list in `deterministic-defects.csv`.

| Defect | Count | Fix |
|---|---|---|
| Cost tier overstates authored cost | 40 | Mechanical — recompute from `costMaxCents` |
| Published plan with no image | 85 | Needs image sourcing (not text) |
| Board-feet unit spelled 'board ft' (breaks exact merge) | 14 | Mechanical — normalize to 'board feet' |
| Duplicate identical material line | 1 | Mechanical — dedupe |
| Unpriced material line | 5 | Allowed by schema; low priority |

**Code discrepancy to reconcile first:** `plan-schema.ts` bounds (TIER_3 ≤ $350, TIER_4 ≤ $750) disagree with `format.ts` `TIER_MAX_CENTS` (TIER_3 ≤ $300, TIER_4 ≤ $720). The tier recompute is only deterministic once you pick which is authoritative. The clearly-wrong cases (e.g. `$130` costMax tagged TIER_3, `$280` tagged TIER_4) fail under either.

## Tier 1 — semantic sample findings (70 plans)

| Result | Plans | Share |
|---|---|---|
| Clean (no semantic issue) | 37 | 53% |
| Low-severity only (polish) | 10 | 14% |
| Medium-severity (would mislead a builder) | 20 | 29% |
| High-severity (build-breaking) | 3 | 4% |
| **Any issue** | **33** | **47%** |

Issue distribution by dimension:

| Dimension | Findings |
|---|---|
| material-sufficiency | 20 |
| internal-contradiction | 13 |
| build-completeness | 6 |
| description-vs-build | 4 |
| time-plausibility | 1 |

**The dominant pattern is material-sufficiency and internal-contradiction** — the declared lumber often falls a board or two short of the cut list, or a dimension/quantity is labeled inconsistently between the prose, the cut list, and the materials. This is the signature of a catalog that was **bulk-expanded (24 → 1,115 plans via `import-legacy-plans.mjs`) without a per-plan reconciliation of materials against the cut list.** It is systematic, not random — which is good news: it is exactly what a batched LLM pass is built to find and fix.

### Every flagged plan in the sample

| Plan | Quality | Max severity | Issues |
|---|---|---|---|
| `footed-charcuterie-board` | 4/5 | low | **time-plausibility/low**: timeLabel '1-1.5 hrs' omits glue cure, yet step 3 says 'Once the glue-up is dry'; sibling glue-up plans build cure into their time. |
| `edge-grain-maple-cutting-board` | 3/5 | high | **internal-contradiction/high**: cutList: 6 strips at width 2 glued on edge = ~4.9in wide, but note/steps claim 12in wide. Following the cutList yields a ~5in board, not 12in. |
| `end-grain-walnut-maple-butcher-block` | 4/5 | med | **internal-contradiction/med**: 13-strip panel = 19.5in wide, but 'Trim to final size roughly 12x16x1.5' is below what the cutList produces. |
| `baby-changing-table-topper` | 3/5 | med | **material-sufficiency/med**: One 1x4 10ft (120in) supplied, but cutList needs 123.5in before kerf; a second board is required. |
| `round-modern-dining-table-base` | 3/5 | med | **material-sufficiency/med**: 48in base: 2x 2x6 8ft (192in) vs parts 195in; 2 cross braces have no stock. 60in option also 239 vs 240 with no kerf. |
| `1x3-sawhorse-desk` | 3/5 | med | **build-completeness/med**: Top attached twice/out of order: step 4 attaches legs to top, step 6 attaches base to top again; contradicts description's 'top attaches last'. |
| `farmhouse-hall-tree` | 3/5 | med | **material-sufficiency/med**: 1x3 stock short: 3x8ft (288in) vs 304in of parts; a fourth board needed. · **material-sufficiency/med**: 1x4 stock short: 2x8ft (192in) but 56+41 pieces need 3 boards. |
| `pipe-and-wood-slat-bed` | 4/5 | low | **internal-contradiction/low**: 5 slats need 10 hangers, but 20 split-ring hangers listed; counts inconsistent. |
| `full-height-playhouse-loft-bed` | 3/5 | med | **material-sufficiency/med**: 2x4 parts ~669in vs 6x8ft=576in; plus platform legs have no cutList entry or stock. |
| `sweet-pea-bunk-bed` | 3/5 | med | **build-completeness/med**: Two sleeping levels but only 10 slats supplied, ~one bunk's worth; upper bunk has no slat support budgeted. |
| `18in-doll-beverage-stand` | 4/5 | low | **material-sufficiency/low**: Both single-board specs ~2in short before kerf; mitigated by explicit 'Scraps are fine'. |
| `play-vanity` | 2/5 | med | **internal-contradiction/med**: Cabinet sides 10in vs shelves 19.75in with 20.5in-tall backs: sides/shelves transposed; built as listed the cabinet is nonsensical. · **description-vs-build/low**: Angled back panels are in materials and steps but absent from cutList. |
| `a-frame-dollhouse` | 3/5 | med | **material-sufficiency/med**: 3/4 plywood sheet yields only one of two A-frame sides; 1/4 plywood short for the hinged roof panel. |
| `nature-inspired-floor-lamp` | 4/5 | low | **material-sufficiency/low**: Step 3 uses pocket-hole joinery but no pocket screws in materials (only brads/glue). |
| `tiny-house-dollhouse-for-dolls` | 4/5 | low | **internal-contradiction/low**: Steps say 'inner walls' and 'two loft pieces' but cutList lists quantity 1 for each. |
| `custom-laminated-canoe-paddle` | 3/5 | med | **internal-contradiction/med**: Text says mill to 1.25in thickness, but cutList thicknessIn=0.3125 with width=1.25; the emphasized dimension is mislabeled. |
| `a-frame-chicken-coop` | 4/5 | med | **material-sufficiency/med**: 2x4 qty 12 but cutList needs ~14 boards (51in pieces don't pair on 96in stock). |
| `outdoor-x-base-table` | 3/5 | med | **material-sufficiency/med**: 2x6: 528in supplied vs 608in required; short by ~a full board. · **build-completeness/low**: Step 2 attaches cross-supports not present in the cutList. |
| `4x8-chicken-coop` | 4/5 | low | **internal-contradiction/low**: Bird's-mouth count: description says half of 10 (=5), cutList note says 6. · **build-completeness/low**: Nest box listed in summary/steps but no dimensions/cutList; conceded as a separate linked plan. |
| `diy-octagon-picnic-table` | 4/5 | low | **description-vs-build/low**: Summary says every board at 22.5deg, but some cutList entries note 30deg. · **material-sufficiency/low**: 64 mitred pieces need ~96% yield from 15 boards; realistically a board short. |
| `pergola-outdoor-room` | 2/5 | high | **material-sufficiency/high**: 10x 2x6 8ft consumed entirely by the 10 rafters at 96in, leaving zero for bench shelf/seat/end pieces from same stock; ~15-16 boards needed. · **internal-contradiction/med**: 96in rafters cut from 'stud length' (92-5/8in) is impossible; 8ft yields 96in only with zero margin. |
| `garden-storage-shed` | 3/5 | high | **internal-contradiction/high**: Skids lengthIn 120 but material is 4x4 8ft (96in); a 96in board cannot yield a 120in skid. · **material-sufficiency/med**: PT 2x6: 8 boards vs 10 pieces needed (none pair on 120in board). · **material-sufficiency/low**: Ridge board is a 2x8 (width 7.25) but only 2x4/2x6 stock is listed. |
| `outdoor-cabana-backyard-retreat` | 3/5 | med | **internal-contradiction/med**: 4 post connectors + 4 pier blocks and 'corner posts' plural, but cutList lists only 2 corner posts; two posts appear missing. · **material-sufficiency/low**: 4x4 parts ~569in vs 6x8ft=576in, ~99% yield with no kerf margin. |
| `adjustable-sawhorses-for-desks` | 3/5 | med | **build-completeness/med**: cutList 'Top gussets','Cross braces','End caps' (12 pieces) never referenced in any step. |
| `miter-saw-cart` | 4/5 | low | **material-sufficiency/low**: Six 24in-wide plywood parts total 191.5in vs 192in of stock; no kerf margin. |
| `enclosed-workbench-wood-storage` | 3/5 | med | **material-sufficiency/med**: 2x4 ~790in vs 8x8ft=768in; 64in connectors waste remainder, ~9 boards needed. · **material-sufficiency/low**: 1/2in ply qty 2 yields 2 shelves but 3 needed at 28in width. · **build-completeness/low**: Backsplash in cutList but no step attaches it. |
| `router-table-cabinet` | 4/5 | med | **description-vs-build/med**: Description says two bit drawers and cutList has 2 faces, but box parts cover only one drawer; second small drawer has no box. |
| `workbench-with-vise` | 4/5 | med | **material-sufficiency/med**: 20 finished 1.5x3x62 maple laminations need >40 net bd ft; only 40 rough bd ft supplied — rough 8/4 milled to 1.5in falls short. |
| `2x4-frame-panel-chest-of-drawers` | 4/5 | med | **internal-contradiction/med**: Back panel listed 12in wide but case interior ~19.5in; back is ~7.5in too narrow to function. |
| `face-frame-base-kitchen-cabinet-carcass-24in` | 4/5 | low | **internal-contradiction/low**: Stated 24in face frame / 23.5in carcass don't match part math (24.5in frame, 25in carcass); scribe overhang inverted. |
| `open-center-bathroom-vanity-48` | 4/5 | med | **description-vs-build/med**: Prose says one door + one drawer, but cutList/hardware build two doors. |
| `midcentury-modern-console-buffet` | 3/5 | med | **internal-contradiction/med**: Two doors/two knobs/two hinge sets but door panels qty 5 (one door's worth) and 3 dividers where 4 are needed. |
| `nursery-armoire` | 4/5 | low | **material-sufficiency/low**: Hobby-board trim ~319in vs 3x8ft=288in; a fourth board needed. |

## Projection to the full catalog

Extrapolating the sample rate to all 1115 plans (with the caveat that these are unverified single-pass findings — a verify pass would filter the softer material-yield calls):

- **~526 plans** likely carry at least one semantic issue
- **~366 plans** likely carry a medium-or-high issue that would mislead or block a builder
- **~48 plans** likely carry a high-severity, build-breaking contradiction

## Recommendation

1. **Reconcile the tier-bounds code discrepancy**, then apply the mechanical Tier-0 fixes (40 tiers, 1 duplicate line, board-feet normalization) by script on a branch, gated by re-running the validator. Near-zero tokens, near-zero risk.
2. **Run the full semantic pass** as a batched micro-agent workflow: ~75 agents × ~15 plans, each returning structured findings, **with an adversarial verify stage** on every medium+ finding before it is trusted (the material-yield class especially needs a second opinion on kerf/nesting assumptions). Budget ~3–5M tokens. Fixes split two ways: mechanical numeric corrections by script, prose/cut-list rewrites by LLM — every change re-validated.
3. **Image sourcing** for the 85 published image-less plans is a separate track (you own the source site per the schema comments); the parked `unresolvedImages` URLs are the recovery path for the unpublished 154.

The order matters: mechanical first (cheap, shrinks the surface), then verified semantic (expensive, where the real quality lives). Auditing is read-only and safe to parallelize hard; the *writes* belong on a branch with the validator as the tripwire, because this content seeds the production database and drives the filters the business plan calls trust-critical.