# Plan-quality audit — REPORT

## Status (keep current)

| | |
|---|---|
| Rubric | **R-2** (2026-10-19; DECISIONS_LOG) |
| Current stage | **Round 2 DONE 2026-10-25.** Two independent full reads + adjudication; prod reseed is Keagan's (needs `.env.local`) |
| Last batch | Round 2: 586 re-read (`round2/`), 72 bucket disagreements adjudicated (Opus), all 25 Unpublish re-verified on white-flattened images |
| Ledger | 610: all read; 25 Unpublish (all `published:false` in content) |
| Verdicts (610) | Unpublish 25 · Fix 411 (+7 Human review) · Ship (unverified) 86 (+1 Human review) · Ship 80 |
| Updated | 2026-10-25 |

**Parallel line on `main` (superseded 2026-10-23, Keagan):** another session committed its own
Stage 5 work to `main` (`f8f738d..c75dd45`: `rubric-R2.md`, a re-score of the same 70, a 10-plan
model check), from the same Q1–Q4 answers, and stopped at the Stage 5 gate. It was merged with this
branch's tree kept (`git merge -s ours`). Those files survive in git history only.

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

## Stage 8 — results

<!-- stage8:begin (generated by scripts/report.mjs — do not edit by hand) -->

### Headline (610 published plans, rubric R-2)

| Verdict | Plans |
|---|---|
| Unpublish | 25 |
| Fix | 411 |
| Fix + Human review | 7 |
| Ship (unverified) | 86 |
| Ship (unverified) + Human review | 1 |
| Ship | 80 |

Unpublish rate 4.1%. 2 verdict(s) are Keagan's own call (`override`).

### Failures by check (plans failing, `cause: "plan"`)

| Check | What | Plans | Unpublish-level | Fix-level |
|---|---|---|---|---|
| R9 | pocket-hole jig setting not stated (recorded only; not counted) | 275 | 0 | 275 |
| R14 | steps, cut list and materials disagree | 260 | 14 | 246 |
| R6 | fastener/hardware missing or contradictory | 132 | 0 | 132 |
| R10 | position not given | 131 | 0 | 131 |
| R11 | "as shown" with nothing shown | 57 | 2 | 55 |
| R2 | part not in the cut list | 49 | 12 | 37 |
| R8 | build order impossible | 46 | 0 | 46 |
| R5 | materials don't cover the cut list | 41 | 0 | 41 |
| R1 | depends on content we don't have | 31 | 14 | 17 |
| R4 | part size not from a listed material | 31 | 0 | 31 |
| R3 | cut row not a real used part | 30 | 0 | 30 |

### Catalog-wide items (one bulk fix each, not per-plan verdicts)

- **Importer damage:** 518 plans carry import-damaged measurements (Stage 2, `import-fidelity.md`).
- **R9 jig setting:** 275 plans name pocket-hole screws but no jig thickness setting.
- **Consumables missing from materials** (glue, tape, finish…): 241 plans (`gaps` kind consumable).
- **Kerf-only stock shortfalls** (≤ 1/2″): 10 plans (R5 `kerfOnly`).
- **Other problems no check covers:** 278 plans carry `gaps` entries (per-plan, in the records).

### `unknown` per check (all 610)

| Check | Unknown |
|---|---|
| R2 | 1 |
| R3 | 1 |
| R4 | 53 |
| R5 | 370 |
| R8 | 1 |
| R9 | 14 |
| R10 | 2 |
| R14 | 6 |

### Unpublish (25)

| Plan | Why |
|---|---|
| [3-drawer-nightstand](https://notchplans.com/plans/3-drawer-nightstand) | R14: (b)/(d): the three drawer boxes made in steps[5]-[8] are never installed — no step mounts the glides (materials[14]), puts the drawers in, or fits th… |
| [diy-coastal-console-table](https://notchplans.com/plans/diy-coastal-console-table) | R1: The only cut-list row is a pointer to the author's site and the steps send the builder there for the cut list; no part has any dimension anywhere (se… |
| [diy-concrete-and-wood-nightstand](https://notchplans.com/plans/diy-concrete-and-wood-nightstand) | R1: The only cut-list row is 4x Legs; the dimensions of every other part (side and back pieces, drawer box, drawer front, anything else) are stated to li… |
| [diy-dog-crate-console](https://notchplans.com/plans/diy-dog-crate-console) | R2: structural parts the steps cut 'to size' — side/top pieces, legs, top and bottom aprons, vertical and horizontal dividers, bottom supports, bottom pa… |
| [diy-nightstand](https://notchplans.com/plans/diy-nightstand) | R1: The drawer (a stated feature; materials[8] Drawer Pull and materials[9] Drawer Slides are bought for it) is built only from an external tutorial. Sea… |
| [easy-garage-shop-cabinets-part-1-lowers](https://notchplans.com/plans/easy-garage-shop-cabinets-part-1-lowers) | R2: Structural parts used but not in cutList and not sized in any step or viewed image: Bottom Shelf, front Stretcher, back Stretcher, two face-frame sti… |
| [easy-router-table-storage](https://notchplans.com/plans/easy-router-table-storage) | R2: The cut list has one row (the importer emits a cut list only when every Kreg row parsed, so Kreg's list had 1 row). Steps use Back Piece, Dividers, R… |
| [farmhouse-table-made-with-7-boards](https://notchplans.com/plans/farmhouse-table-made-with-7-boards) | Keagan: Legs are installed in the step images but never bought or sized anywhere in the plan |
| [framed-magnetic-whiteboard-with-a-lego-inlay-shelf](https://notchplans.com/plans/framed-magnetic-whiteboard-with-a-lego-inlay-shelf) | R14: (d)/(b) Searched all 10 steps and the description for /glue/screw/nail/attach/secure/join/i: the only joint instructions are 'half lap joints' (steps… |
| [garage-mud-room-storage-and-organizer](https://notchplans.com/plans/garage-mud-room-storage-and-organizer) | R3, R6, R10, R14 (4+ certain Fix, verifier-upheld) |
| [kitchen-pantry-cabinet](https://notchplans.com/plans/kitchen-pantry-cabinet) | R14: (b)/(d) the two shelf doors are built (steps[9]-[14]) but no step hangs them: the steps end at steps[14] door trim; searched all steps for /hinge/han… |
| [large-outdoor-planter](https://notchplans.com/plans/large-outdoor-planter) | R1: The frame layout, bracing, bottom notches, drain hole and base all come from PDF drawings in the Kreg Extras tab, which this plan does not contain. T… |
| [outdoor-rolling-console](https://notchplans.com/plans/outdoor-rolling-console) | R1: the plan's only step sends the builder off-site 'for steps and complete how-to'; no text gives any assembly, joinery or fastener use. All 6 images op… |
| [plywood-chair-set](https://notchplans.com/plans/plywood-chair-set) | R1: The only cut-list row is a placeholder; every part shape and size lives in downloadable plans/templates that are not here. I viewed all 17 images (11… |
| [printers-cabinet-cat-litter-box-enclosure](https://notchplans.com/plans/printers-cabinet-cat-litter-box-enclosure) | R3, R6, R10, R14 (4+ certain Fix, verifier-upheld) |
| [rolling-kitchen-island](https://notchplans.com/plans/rolling-kitchen-island) | R1: Assembly (through-holes locating every shelf, divider and rail; notch sizes) is defined only in the "prints" - the PDF in Kreg's EXTRA section, which… |
| [rolling-trash-can-cabinet](https://notchplans.com/plans/rolling-trash-can-cabinet) | R2: The cut list has one row (Cabinet Sides). Steps cut or assemble Top and Bottom pieces (steps[2]), two Stretchers (3), corner stiles (4), side/back ra… |
| [shelving-unit-with-storage-and-tilt-out-laundry](https://notchplans.com/plans/shelving-unit-with-storage-and-tilt-out-laundry) | R2: Search of cutList[0..7] part names for /bottom/floor/brace/door/back/laundry unit base/diagonal/i matches only 'Base Unit Front and Back Supports' (=… |
| [side-table-with-wireless-charger](https://notchplans.com/plans/side-table-with-wireless-charger) | R14: R14(b)/(d): the Top (cutList[0], with the charger recess made in steps[7..9]) is never fastened to the legs/supports. Search of steps[0..12] for /att… |
| [simple-mirror-frame](https://notchplans.com/plans/simple-mirror-frame) | R1: The plan's only step sends the builder to an outside page for all build instructions. Viewed images: step image is a blog logo and images[3] is a dim… |
| [spare-table-that-doubles-as-wall-art](https://notchplans.com/plans/spare-table-that-doubles-as-wall-art) | R14: Legs never installed (Unpublish-level), plus three step-vs-cut-list size disagreements. |
| [storage-mirror](https://notchplans.com/plans/storage-mirror) | Keagan: The mirror is never installed; steps end at the base front |
| [tall-cupboard](https://notchplans.com/plans/tall-cupboard) | R14: The steps build the doors but never hang them (6 hinges, 2 knobs in materials are never used); the cupboard is left without doors. |
| [ultimate-folding-tailgate-table](https://notchplans.com/plans/ultimate-folding-tailgate-table) | R5, R6, R8, R14 (4+ certain Fix, verifier-upheld) |
| [upholstered-top-storage-coffee-table](https://notchplans.com/plans/upholstered-top-storage-coffee-table) | R2: The box side and end boards, the base legs and rails, and the leg trim pieces are assembled but are not in the cut list (cutList has only three uncut… |

### Human review (8)

| Plan | Verdict | Why |
|---|---|---|
| cabin-bed | Fix + Human review | Summary says "twin sized" and the plan gives no mattress size; the back panel/ledger frame is 73 1/2 x 36 1/2 (cutList[16], cutList[13]-[14]). Whethe… |
| compact-picnic-table-and-stools | Ship (unverified) + Human review | R4 unknown: decking board '5/4 x 6' actual size (cut rows 1 x 5 1/2) is not in the section 9 table. |
| dining-room-buffet-with-hutch | Fix + Human review | R4: cutList[23] plexiglass panel 1/8" vs listed "0.093 thick plexiglass" (acrylic nominal vs actual thickness is not in §9) |
| farmhouse-platform-bed-with-storage | Fix + Human review | R5: hardwood is bought as '10' of unit 'Board feet' (materials[4] 'Hardwood ,, Board feet'); judging it against the cut list needs the board-foot def… |
| modern-platform-bed | Fix + Human review | R1: whether a builder can finish this platform bed from the four summary steps and the cut list without the linked full tutorial needs woodworking ju… |
| sideboard-bar-cabinet | Fix + Human review | Fit clearances cannot be judged from section 9: the drawer box is 22.25 + 2x0.75 = 23.75 wide in a 24 in opening (56.5 - 2x15.5 - 2x0.75), and the do… |
| wall-clock-with-display-shelf | Fix + Human review | clock movement shaft: materials[6] 'High-torque clock movement, 7/16"-long shaft' vs the dial stack Clock Face 1/4 + Backer 1/4 = 1/2 in (cutList[13]… |
| washer-dryer-pedestals-with-storage | Fix + Human review | drawer vs slide length: steps[28] 'The drawers are designed for 21" slides that mount underneath' and materials[7] 'Pair of 21" heavy-duty under-moun… |

Fix (grouped by fix type) and Ship (unverified) lists: [`decision-lists.md`](decision-lists.md).

<!-- stage8:end -->

### Importer defects and the bulk fix each implies

One importer change set fixes most measurement problems across the catalog. Fix
`scripts/import-kreg-plans.mjs`, re-run it on the Kreg source (`kreg-plans.json` at git `efb0c79`),
then re-seed prod. Nothing is re-scraped.

| Defect | Plans | Fix |
|---|---|---|
| Fractions dropped / feet read as inches / dimensions re-sorted (S-19 family; `parseNum` `:19-26`, sort `:36`, nominal path `:40-47`) | 518 (153 gross) | Parse `N N/N`, `N'`, `N' N"` and keep Kreg's dimension order |
| Cut-row detail notes dropped: angles, miters, bevels, notches, e.g. kids-stepping-stool "Cut at 22.3 Degree Angle", kids-picnic-table "30 degree angled cuts", simple-mirror-frame, a-frame-birdhouse | not counted (found while reading) | Keep the text after the dimensions as a cut-row note |
| Material quantities defaulted to 1 | 8 (31 lines) | Parse the quantity or fail loudly |
| Feet marks missed by the fidelity checker itself: raised-dog-bowl-stand `1 1/2'` → 1, play-stand `4'` → 4 (not in `importDiffs`) | ≥ 2 | Same parser fix; re-run `import-fidelity.mjs` after |

The fidelity checker produced some false corrections; spot-check `correctRow` before quoting
Stage 2 counts. Examples: stuffed-animal-storage cutList[6] `[0.125,1.5,24]` came from the text
'1/8" from edge', and rustic-ladder-shoe-shelf `24x48x72` came from `2'x6'x48"`.

### Site findings (once each; not audited)

- **Plan images on a host the site blocks.** 5 published plans keep an image on
  `learn.kregtool.com`, not R2: easy-advent-calendar-house, grandkids-christmas-stocking-tree,
  herringbone-door-buffet, rustic-diy-buffet, simple-diy-toy-box-with-faux-slats. `img-src`
  (`src/middleware.ts:82`) and `images.remotePatterns` allow only R2, Clerk and Vercel Blob, so these
  images can't load on the live site. Checked against the code only; not seen in a browser.
- **Live cut lists show import-damaged sizes** in 518 plans until the importer fix ships (S-19).
- No genuine safety hazard was noticed. Safety was not audited.

### What was not verified, and why

- **Fix findings had one reader each.** Only Unpublish-level findings went to an independent
  verifier: 6 runs, which upheld most findings and refuted several, each refutation dropping a plan
  from Unpublish to Fix. A Fix verdict is a single reader's call.
- **540 of 610 plans were read by Sonnet**, not Opus (Keagan's Q4). On the 10-plan check, Sonnet
  agreed on 9 verdicts, with 0 false Ships. Its main bias is marking findings `likely`, which makes
  the "4+ certain Fix → Unpublish" route rarer.
- **The core 40 were never checked by a human.** Keagan accepted the agent verdicts at Stage 5, so
  the brief's "zero false Ships from R1/R2/R8" measure is unmeasured.
- **R11 fails were not re-checked against other steps' images** after Keagan widened R11 on
  2026-10-23. Only kids-stepping-stool was re-scored; others may now pass. Most of the 60 R11 fails
  are steps that cite a "cutting diagram" which exists nowhere.
- **R5 is `unknown` in 389 plans** because the plan uses several stock types and the steps don't
  name the stock for every part (R-1 precondition). Readers recorded some evident shortfalls only in
  `gaps`.
- **Images were opened only when needed** (a sweep flag, or to settle an R10/R14 position). An
  unopened image may resolve some R10/R11 fails or `unknown`s.
- **Kerf-only R5 calls** (10 plans) were picked by hand from each record's arithmetic text, not by
  a script.
- **Consumable rulings were applied by later cleanup passes**, not by the readers that started
  before the ruling. Leftovers would show as R14 fails that cite glue.
- The cut-row detail-note defect was not counted across the catalog.

## Round 2 — independent second read (2026-10-25)

Keagan asked for one more complete audit before the prod reseed (DECISIONS_LOG 2026-10-25).

- **Method.** 39 fresh Sonnet readers re-read all 586 published plans from a fresh sweep, into
  `round2/plans/`. They never saw round 1 and applied R-2 with every ruling to date. Their prompt is
  `prompts/reader-r2.md`, plus three clarifications added while they ran: optional-step items
  don't fail R14(c); R5's unique-material precondition; image-view limits.
  `scripts/round2.mjs compare` listed every plan whose bucket (Ship / Fix / Unpublish) differed.
  Six fresh Opus adjudicators (`prompts/adjudicator-prompt.md`) decided each of those from the plan
  and wrote the result into the round-1 record (`adjudication` block). They also acted as verifier
  for any new Unpublish.
- **Agreement.** Before adjudication, round 2 put 527 of 586 plans (90%) in the same bucket as
  round 1. 72 plans were adjudicated: 41 changed bucket (27 Fix→Ship, 13 Ship→Fix, 1 Fix→Unpublish)
  and 31 kept round 1's bucket.
- **New Unpublish: 1.** `ultimate-folding-tailgate-table` has 4 certain, verifier-upheld Fix
  findings: R5 (1x6 short by 6″), R6, R8, R14. It is now `published:false` (586 → 585 live).
- **Transparent-image defect (found in round 2).** About 700 cached plan diagrams are transparent
  webp files. Earlier PNG conversions rendered them on black, which hid their black dimension
  labels. All 692 were re-flattened onto white. Fresh Opus verifiers then re-checked all 25
  Unpublish plans against the white images (`verifier/rv-1..3.json`). All 25 were upheld, both
  overrides were confirmed, and only one image they depended on was transparent.
  **Not re-checked:** Fix-level R10/R11/R14 findings that say an image shows nothing. Some may be
  false Fixes. No Ship or publish decision rests on them.
- **Borderline, for Keagan:** `printers-cabinet-cat-litter-box-enclosure` is Unpublish on 4
  certain Fix findings. One of them, R14, rests only on the 16 cup handles: no step installs
  them, but the steps[14] image shows them fitted. If an image showing installation satisfies
  R14(d), the plan drops to Fix.
- **Other round-2 notes:**
  - The fidelity checker's `correctRow` still drops a fraction when Kreg wrote a space before the
    slash (`11 1 /4`).
  - One reader saw image reads come back as "[media removed]". Its image-based claims on 4 plans
    are weaker.
  - Several readers converted the whole image cache or saved images in the repo root. The images
    were cleaned up; nothing was committed.
