# Rubric R-2 (2026-10-19)

R-2 = R-1 (`docs/PLAN_QUALITY_AUDIT.md` §6) with the changes below. Decided by Keagan at the
Stage 5 gate, 2026-10-19, verbatim: "Q1-Q4: accept your recommendations (R9 reported once as a bulk
item and not counted toward verdicts; add R14 and widen R10 as rubric R-2, then re-score the 70; R1
gets a Fix level; Stage 6 readers on Sonnet with Opus verifiers after a 10-plan check)."
The questions and the evidence behind them are in [`calibration.md`](calibration.md).

| Id | R-1 | R-2 | Why (calibration evidence) |
|---|---|---|---|
| R1 | Depends on content we don't have → Unpublish | **Unpublish** when the build cannot be completed without the missing content; **Fix** when it can (a non-structural piece, e.g. a dial face or a decorative cutout, is only in the missing document) | Q3: `mantel-clock-with-free-printable-dial`, `mega-lego-table` went to Human review with no Fix level available |
| R9 | Jig setting stated → Fix | Scored and recorded exactly as before, but **does not count toward the verdict**; reported once as a catalog-wide bulk item. A setting shown in a **viewed** step image counts as stated. | Q1: R9 failed 35 of 70 plans and was the only failure in at least 16 Fix plans |
| R10 | A step that *implies* a measured position gives it | **Every position the builder must set is given**: a number in the text, or a viewed image showing it. Relational placements (centered, flush, even spacing, against another part, as desired) still pass. | Q2: shelf, glide-support, hinge-cup and cord-hole positions given nowhere were caught by no check |
| R14 (new) | — | **Steps, cut list and materials agree.** (a) Counts and sizes of a part agree between steps and cut list (corrected sizes); (b) every part or sub-assembly made is installed or used by a later step; (c) every item a step uses (hardware, sheet, fastener, panel) is in materials, and every material is used. Level **Fix**; **Unpublish** when the plan ends before the build is complete (e.g. drawers, doors or a seat are made but never installed and no step finishes the piece). | Q2: 33 plans had `gaps` — doors never hung, seats never installed, 11 vs 12 slats, 13 slats in an 80″ opening needing 87 1/2″, brackets/staples/anchors not in materials |

Ids R7, R12, R13 stay removed; R14 is new (no renumbering).

**R14(c) scope (clarified 2026-10-19, during the re-score):** "items" are lumber, sheet goods,
hardware, fasteners (incl. staples, brads) and purchased components (hinges, slides, address
numbers, panels). **Consumables are excluded** — glue, finish, stain, sandpaper, filler, tape, wax —
both as "used but not listed" and as "listed but never used" (finishing is out of scope, §1).
Why: a re-scorer failed four otherwise-clean plans only for "glue not in materials"; that is the
same catalog-wide noise R9 was, not a sense or measurement problem.

**More one-defect pairs (clarified 2026-10-19):** a position or size missing *because* it is only
in a document we don't have is scored once, under **R1** (Fix if the build can still be completed,
else Unpublish), not again under R10/R14. **Pocket-hole locations are not R10 positions** — like
the jig setting (R9), they follow the jig, not a plan measurement.

**Human review from unknowns:** an `unknown` on R1, R2 or R8 adds "+ Human review" to any verdict
(it blocks Ship, and on a Fix plan it leaves a possible Unpublish-level question open).

**One defect, one check.** A defect is scored under the most specific check: a missing cut-list
part → R2; an unused cut-list row → R3; a fastener size → R6; a count/size disagreement, an
uninstalled part, an unlisted item or an unused material → R14.

**Verdict (R-2)** — computed by `scripts/verdict.mjs` from the checks, never typed by hand. Count
only `cause: "plan"` failures and never R9:
- **Unpublish** — an Unpublish-level failure that is `certain` and verifier-upheld; or ≥ 4 Fix-level
  failures that are all `certain` and verifier-upheld.
- **Unpublish (pending verifier)** — the same, before the verifier has run.
- **Fix** — 1–3 Fix-level failures; or ≥ 4 not all certain/upheld; or an Unpublish-level failure that
  is only `likely`.
- **Ship** — every counted check `pass` or `n/a`.
- **Ship (unverified)** — no counted failure, one or more `unknown` on R3–R6, R10, R11, R14.
- An `unknown` on R1, R2 or R8 blocks Ship → **Human review**.
- **+ Human review** when the record sets `humanReview.value: true` (a question needing knowledge
  outside §9). An R9 question alone no longer adds Human review.
