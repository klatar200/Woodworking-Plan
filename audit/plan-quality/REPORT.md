# Plan-quality audit — REPORT

## Status (keep current)

| | |
|---|---|
| Rubric | R-1 |
| Current stage | **Stage 2 gate — waiting for Keagan** |
| Last batch | — (no reading yet) |
| Ledger | 610 published slugs, all `pending` |
| Verdicts | Ship 0 · Ship (unverified) 0 · Fix 0 · Unpublish 0 · Human review 0 · not yet scored 610 |
| Updated | 2026-10-18 |

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

## Stage 2 — import fidelity (done, at gate)

See [`import-fidelity.md`](import-fidelity.md). In short: 508 of 610 plans (3,593 of 4,938
cut-list rows) carry import-damaged dimensions; 141 plans have gross errors (3/4″ → 3,
36 1/8″ → 8, 1×12 → 1 × 12), well beyond S-19 as logged. Material quantities of 1 are real
except 31 defaulted lines in 8 plans.
