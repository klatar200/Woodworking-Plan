# Sweep summary — Stage 3 (rubric R-1, 2026-10-18)

`node audit/plan-quality/scripts/sweep.mjs` (deterministic, read-only). Totals in
`sweep-summary.json`; per-plan results and `flagged` candidates (path + verbatim quote + why) in
each `plans/<slug>.json`; ledger stage `swept` + tags for all 610. Tally flags with
`scripts/flag-stats.mjs [check] [samples]`; list a result with `scripts/show-check.mjs <check> <result>`.

**Measurements are scored on Kreg's corrected dimensions** (Keagan, Stage 2 gate). The live-site
import damage is recorded once per plan (`importAffected`, `importDiffs`, cause `import`) — 508
plans — and is not repeated in any check below. Every count here is therefore `cause: "plan"`
or a candidate for one.

## Results per check

`flagged` = the script found candidates a reader must confirm or reject; `to-read` = reader-scored,
nothing flagged. No check reached an Unpublish-level `fail` by script, so the >25% gate (§8
Stage 3) is not triggered (0 plans).

| Check | pass | fail | unknown | flagged | to-read | Flags (plans) |
|---|---|---|---|---|---|---|
| R1 depends on content we lack | 492 | — | — | 118 | — | 219 (118) |
| R2 parts in steps exist in cut list | — | — | — | 112 | 498 | 233 (112) |
| R3 cut rows are real, used parts | — | — | — | 80 | 530 | 201 (80) |
| R4 part size from listed material | 469 | 34 (`likely`) | 107 | — | — | 56 (34) |
| R5 materials cover the cut list | 49 | 2 (`certain`) | 559 | — | — | — |
| R6 fastener sizes in materials | — | — | — | 154 | 456 | 369 (154) |
| R10 measured positions given | 462 | — | — | 148 | — | 200 (148) |
| R11 "as shown" has an image | 529 | — | — | 81 | — | 218 (81) |

173 plans have no flag and no fail on any swept check. R8 and R9 are reading-only (Stage 4/6).

**What the flags mostly are** (top triggers): R2 — a dimension in a cut/rip sentence that no
corrected cut-list or material size matches (223); R6 — a screw/nail size in a step with no
material line of that size (198 screws, 60 nails), usually because Kreg lists screws only as a
product link in the tools section, which the importer did not carry into materials; R10 — a
placement sentence with no measurement whose step has an image to view (184); R11 — "as shown" /
"cutting diagram" in a step with no image of its own (186 hits in 81 plans); R1 — "Extras" (58),
http links (43), "the/see/have attached" (58), "my/our blog" (21), "pdf"/"download" (26).

**R4 `fail` is `likely`, not `certain`:** a glue-up or lamination the steps describe resolves it
(e.g. `easy-modern-bookshelf` 1 1/2 × 9 1/2 parts vs 2×10 stock 1 1/2 × 9 1/4). Readers confirm.
**R5 `fail` is `certain`** — computed with the fewest cuts possible and the most generous
orientation: `diy-padded-sofa` (part area 6,732 sq in > one 48 × 96 sheet, 4,608) and
`desk-calendar-pencil-holder` (28 5/16″ of parts from one 1x8 24″).

## Sweep rules that apply the rubric where R-1 is silent (for Stage 5)

1. **R4 nominal-written rows** — Kreg wrote some parts as `2" x 4" x 48"` (a 2x4). Compared by §9
   nominal key against a listed 2x4, they pass (`checks.R4.nominalRows`).
2. **R4 thinner than stock** → `unknown` (planing/resawing is not stated, not judged).
3. **R5 precondition not met** → `unknown` with that reason (Stage 1 note 2). This is 559 plans,
   almost all because they use more than one stock type.
4. **R5 ripping** → `unknown` when any part is ≤ half the stock width (Stage 1 note 1).
5. **R5 orientation** — the importer sorted T ≤ W ≤ L, so a part shorter than the board is wide is
   assumed to run across it (uses its width along the board). Kerf = 1/8″ × (parts − boards),
   the fewest cuts possible. Both choices can only turn a fail into a pass, never the reverse.
6. **R5 non-wood rows** — a row not the stock's thickness (e.g. `bird-feeder` polycarbonate
   windows) makes R5 `unknown`, not part of the length total.

## §3 ground truth re-measured

| Fact | §3 | Measured | Note |
|---|---|---|---|
| Plan files / published | 1,128 / 610 | 1,128 / 610 | same |
| Avg steps · cut rows · materials · tools · images | 11.2 · 8.1 · 8.3 · 7.2 · 14.2 | 11.2 · 8.1 · 8.3 · 7.2 · 14.2 | same |
| Steps / with image | 6,809 / 6,120 | 6,809 / 6,120 | same |
| Unattached images | 1,928 in 581 plans | 1,928 non-primary in 581 plans (2,532 in 609 counting the primary image) | same |
| Plans with "full plans/Extras/PDF" in step text / any field | 66 / 78 | 66 / 78 | same |
| "as shown"/"cutting diagram" steps with no image | 96 in 63 | 96 in 63 | same |
| Plans with an `http` link (text fields) | 35 | 35 | same |
| Alt text non-generic | 0 | 0 | same |
| `cutList[].material` filled | 0 | 0 | same |
| Material lines `quantity: 1` | 2,540 / 5,047 | 2,540 / 5,047 | same; only 31 are importer defaults (Stage 2) |
| Categories | furniture 230 · gifts 148 · storage 110 · outdoor 77 · shop 42 · boards 3 | same | same |
