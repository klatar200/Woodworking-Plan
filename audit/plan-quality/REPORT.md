# Plan-quality audit — REPORT

## Status (keep current)

| | |
|---|---|
| Rubric | R-1 |
| Current stage | **Stage 5 gate — waiting for Keagan to sign off [`calibration.md`](calibration.md)** |
| Last batch | calib-4 (pilot-1..3, calib-1..4 read; pilot + calib Unpublish findings verified) |
| Ledger | 610: 70 read/verified, 540 swept |
| Verdicts (70 read) | Ship 8 · Ship (unverified) 10 · Fix 47 · Unpublish 5 (verifier-upheld) · Human review 7 (combined with another verdict) · not yet read 540 |
| Updated | 2026-10-18 |

**Waiting on Keagan (Stage 5):** his verdicts on the core 40 in `calibration.md`, and answers to
Q1 (R9 at Fix?), Q2 (add R14 + widen R10 → R-2?), Q3 (R1 Fix level?), Q4 (Stage 6 cost / model).

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
