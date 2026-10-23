# Plan-quality audit — REPORT

## Status (keep current)

| | |
|---|---|
| Rubric | **R-2** (2026-10-19; DECISIONS_LOG) |
| Current stage | **Stage 6 — DONE 2026-10-23.** Next: Stage 8 (report + `GO_LIVE_FIXES.md` C section) |
| Last batch | s6-01..36 complete; every Unpublish verifier-checked (v1–v6); consumable cleanup applied to all records |
| Ledger | 610: all read (583 read + 27 verified), 0 swept |
| Verdicts (610) | Fix 432 · Fix + Human review 6 · Ship 57 · Ship (unverified) 91 (+2 Human review) · Unpublish 22 |
| Updated | 2026-10-23 |

**Stage 8 inputs (collected during Stage 6; not yet written up):**
- Importer defects (bulk fixes):
  - Cut-row detail notes (angles, miters, bevels) are dropped: kids-stepping-stool "Cut at 22.3
    Degree Angle", kids-picnic-table "30 degree angled cuts", simple-mirror-frame, a-frame-birdhouse.
  - Feet marks misread as inches: raised-dog-bowl-stand Leg `1 1/2'` → 1, play-stand Side Poles `4'` → 4.
    Neither is in `importDiffs`.
- Fidelity-checker `correctRow` artifacts — spot-check before quoting Stage 2 numbers:
  - stuffed-animal-storage cutList[6] `[0.125,1.5,24]`, read from '1/8" from edge' text.
  - rustic-ladder-shoe-shelf `24x48x72`, read from `2'x6'x48"`.
- Single-row Kreg cut lists match the source (not import drops): rolling-trash-can-cabinet,
  easy-router-table-storage, diy-concrete-and-wood-nightstand, plywood-chair-set,
  diy-coastal-console-table, easy-garage-shop-cabinets-part-1-lowers.
- Catalog-wide items, report once each:
  - R9 (jig setting not stated).
  - Consumables missing from materials (`gaps` kind consumable).
  - Steps cite "the cutting diagram" where no layout image exists, though the cut list has the
    sizes (R11 Fix/likely).
- Rubric calls for Keagan:
  - **R11 reading:** verifier v2 (kids-stepping-stool) refused other steps' images, v3
    (shelving-unit-with-storage-and-tilt-out-laundry) accepted them. Verdicts unaffected so far.
  - **Kerf-only R5 shortfalls (≤ 1/2″):** e.g. over-sized-wooden-crate, play-stand,
    rolling-grill-table, picture-ledge-shelves, rustic-ladder-shoe-shelf. Should they count?
  - **Missing structural part or missing material?**
    - farmhouse-table-made-with-7-boards: legs installed in images but never bought or sized
      (R14 Fix; R2 not judged).
    - storage-mirror: mirror never installed (reader R14 Fix; a strict R14 reading may be Unpublish).

**Stage 5 gate — signed off by Keagan 2026-10-19:** Q1–Q4 all as recommended; core-40 agent
verdicts accepted without per-plan review. Rubric R-2 in `docs/PLAN_QUALITY_AUDIT.md` §6; verdicts
computed by `scripts/verdict.mjs`.

**Sonnet-vs-Opus check (Q4), 2026-10-19:** Sonnet readers re-read 10 calibrated plans from their
sweep state into `sonnet-check/plans/`, compared with the Opus R-2 records: same verdict bucket 9/10,
0 false Ships, every Unpublish-level finding matched at `certain`. Differences: Sonnet marked more
findings `likely` (Opus `certain`) and missed one Fix-level R2 (`gaming-computer-desk`);
`battery-charging-station` Sonnet Fix vs Opus Ship (unverified) (Opus settled R10 from viewed
images). Verdict: Sonnet readers go ahead; known downside — the ≥4-certain-Fix → Unpublish route
may fire less often.

**Stage 2 gate — answered by Keagan 2026-10-18** (relayed by the orchestrating session),
verbatim: "Yes to both: use the kreg-plans.json from git history, and score the measurement checks
against Kreg's corrected sizes, recording the live-site error once as cause: import."
1. Source = `kreg-plans.json` at git `efb0c79` (reproduces all 610 plans exactly).
2. Measurement checks are scored on Kreg's corrected dimensions (`importDiffs[].correctRow`); the
   live-site error is recorded once per plan as `importAffected: true` + `importDiffs`
   (`cause: "import"`), never as a per-check finding.

## Stage 1 — set up (done)

- `ledger.json`: 610 published slugs. `plans/<slug>.json`: one stub record each.
- Read: `src/content/plan-schema.ts`, `scripts/import-kreg-plans.mjs` 1–160, `run1-*` headers.
- Hand-tried the rubric on `kitchen-drawer-divider` (small gift), `3-drawer-nightstand`
  (cabinet with drawers), `craftsman-style-twin-bed` (bed).

### Rubric notes for Stage 5 (not reinterpreted — applied as written until then)

1. **R5 ignores ripping.** It totals part *lengths* against stock length. `kitchen-drawer-divider`
   cuts 2″-wide dividers from `materials[1]` "Poplar, 1/2\" X 5 1/2\" 48\"", which can be ripped
   into more than one strip, so a length-only total over-counts what is needed.
2. **R5's "score only when…" has no stated result otherwise.** Recorded as `unknown` with reason
   `R5 precondition not met` until Stage 5 decides `unknown` vs `n/a` (it moves many plans
   between Ship and Ship (unverified)).
3. **An omitted position is caught by no check.** R10 fires only when the text implies a measured
   position. `3-drawer-nightstand` `steps[9].body` "attach supports to interior side panels" gives
   no height and no image-free way to find it; nothing in R-1 fails it.
4. **A plan that stops early is only an R3 Fix.** `3-drawer-nightstand` ends at `steps[10]`
   "Attach backing": no step installs the glides, drawers, drawer fronts or pulls (search: step
   bodies matching /glide|front|pull|install/i are only `steps[4]` "overhang at front and sides" and
   `steps[9]` "Before installing drawer glides attach supports"). The Kreg source has the same 11
   steps, so `cause: "plan"`. Only R3 (unused `cutList[5]`/`[6]` drawer fronts) catches it.
5. **R9 will fail widely.** `3-drawer-nightstand` names screw lengths ("1 ¼” pocket hole screws")
   but no jig thickness setting anywhere — a fail as written. Expect this in many Kreg plans.
6. **R1 "attached" wording.** `kitchen-drawer-divider` `steps[2].body` "I have attached my plan
   with dimensions" — the attachment may be that step's image. The sweep will flag "attached" for
   image viewing rather than score R1 from text.
7. **Nominal sizes outside §9.** `craftsman-style-twin-bed` posts are `3x3 (or 4x4)` in Kreg's
   text; 3x3 is not in §9, so R4 is `unknown` for those rows even after correction.

## Stage 2 — import fidelity (done)

See [`import-fidelity.md`](import-fidelity.md). In short: 518 of 610 plans (3,617 of 4,938
cut-list rows) carry import-damaged dimensions; 153 plans have gross errors (3/4″ → 3,
36 1/8″ → 8, 1×12 → 1 × 12, 7′ → 7), well beyond S-19 as logged. Material quantities of 1 are
real except 31 defaulted lines in 8 plans. (Revised in Stage 5 for feet values; see that file.)

## Stage 3 — scripted sweep (done)

See [`sweep-summary.md`](sweep-summary.md). All 610 swept on Kreg-corrected sizes; no plan failed
an Unpublish-level check by script (gate not triggered); 173 plans had no flag. §3 ground truth
re-measured: unchanged.

## Stage 4 — pilot read (done)

30 plans (15 worst by sweep flags, 15 clean, across categories), 3 fresh readers of 10, verifier
on all 5 proposed Unpublish plans (22 findings: 21 upheld, 1 refuted → 3 Unpublish, 2 became Fix).
About 25k tokens per plan read. Where readers found the rubric ambiguous, and where they disagreed
with the sweep, is folded into `calibration.md` Q1–Q3; the sweep's misses (sizes with no inch mark,
"prints"/"sketch" not in the R11 pattern) were passed to later readers.

## Stage 5 — calibration (at gate)

40 more plans read (20 sweep-clean incl. long/sheet-heavy, 20 with R1/R11 flags); 2 more Unpublish
proposals verified (4/4 upheld). [`calibration.md`](calibration.md) holds the core 40 for Keagan's
verdicts (all 18 Ship, all 5 Unpublish, 17 Fix) plus 30 more Fix in an appendix, and the four
questions. No rubric change is made until he answers (R-1 still in force).
