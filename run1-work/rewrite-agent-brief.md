# Run 1 rewrite agent — standing brief

You are rewriting woodworking plan steps in `C:\Users\latar\Desktop\Woodworking-Plan`.
Repo root is the cwd. Plans live at `content/plans/<slug>.json`.

## Your job

For each slug you are given: read `content/plans/<slug>.json` ONCE, score its
buildability 1–5, and if it needs work, emit a patch. You do **not** edit any file.
You return a patch JSON and nothing else touches the repo.

## The standard: "buildable by reading alone"

A competent beginner with the listed tools should be able to build the project from the
steps without guessing a dimension, a joint, or an order of operations. Score:

- **1** — steps are captions, not instructions. No dimensions, no joinery, no order.
- **2** — you could sort of follow it but you'd have to invent measurements.
- **3** — mostly followable; at least one step leaves a real gap.
- **4** — followable end to end; minor polish only.
- **5** — genuinely complete.

**Rewrite if the score is ≤3, OR any critical step is under-specified.** Otherwise
`"action": "pass"`. Passing is a real answer — do not manufacture work.

## Depth target

**2–5 sentences per step.** Match the approved anchor exactly — read
`step-detail-rewrite-sample.md` at the repo root before you start. Not an essay; the
sentences that remove the guesswork. Rewrite **only the thin/under-specified steps**,
leave good steps byte-identical (just omit them from `ops`).

## THE SYSTEMIC GAP: a missing cut step

Most of these plans never tell you to cut the parts. If the plan has a `cutList` but no
step that produces those parts, **insert one as step 1** and enumerate the parts with
their real dimensions from the cut list. This is the single highest-value addition in
the whole audit.

## Hard constraints — a patch violating any of these is rejected whole

1. **NEVER INVENT A MEASUREMENT.** Every number in your prose must come from the plan's
   own `cutList`, `materials`, or `description`, or be sound arithmetic on those values.
   If you can't source it, don't write it — write the technique without the number, or
   put it in `flags`.
2. **No dollar figures.** Ever. Cost is shown as tiers elsewhere.
3. **Tape-measure fractions only.** `23 1/2"`, never `23.5"`. `13/16"`, never `0.8125"`.
4. **`step.tools` ⊆ the plan's own `tools[].slug`.** Exact slugs.
5. **`step.materials` ⊆ the plan's own `materials[].name`.** Verbatim, character for
   character — these are shopping-list merge keys.
6. **Step keys are exactly** `title`, `body`, `tools`, `materials`, `image` (optional).
   The schema is `.strict()`.
7. **Change nothing outside `steps`.** No new cut-list rows, no material edits, no
   description changes.
8. No HTML, no markdown in `body` — plain prose.

## §4.6 — CORRECTNESS BEFORE PROSE

**Never write confident prose around a wrong number.** Before rewriting, check the plan
against itself:

- Does the declared lumber actually yield the cut list? (see below)
- Do the part dimensions add up to the stated assembly?
- Is a cut-list row impossible from the declared stock?

If you find a defect: **fix it in the prose if the plan's own data determines the right
answer**, and always name it in `flags`. If the data doesn't determine the answer, do
NOT guess — flag it and write around it.

## Box geometry — DO NOT guess which member runs full length

When four members make a rectangle, either the long pair spans the full outside and the
short pair fits between them, or the reverse. **Getting this backwards inverts every
number downstream** and it caused nine of the eighteen rejections in the last batch: a
12" drawer box built for a 10-3/4" opening, two correct shelves declared 3/4" too long
and cut shorter, a slide clearance computed off a box assembled inside-out.

A script already solves it from the plan's own panels. Run it first:

```
node scripts/run1-box-geometry.mjs <slug>
```

It prints lines like:

```
"Box sides" (33") runs the FULL length and "Box top and bottom" (56-1/2") sits BETWEEN
them — proved by the "Back panel" at 58" x 33", which closes only on that reading.
```

**Treat that as settled.** Do not re-derive it, and never write prose that contradicts it.
If it reports OPPOSITE readings, the cut list genuinely contradicts itself — say so in the
prose and in `flags`, and do not pick a side. If it prints nothing for your plan, the data
does not determine the assembly: describe the joint without asserting which piece is
captured.

## Lumber sufficiency — DO NOT compute this by hand

Batch 2's three worst defects were all invented shortfalls: the agent binned each part
LENGTH separately instead of cross-pairing different lengths onto one board. A 58 1/4"
rafter and a 37 1/2" one share a 96" board.

**Use the script.** From the repo root:

```
node -e "import('./scripts/run1-verify-packet.mjs').then(m=>console.log(m.packBoards([58.25,37.5,37.5],96)))"
```

`packBoards(lengths, stockLengthIn)` returns `{boards, worstSlack}` with a 1/8" kerf, or
`null` if a part is longer than the stock. Group parts by their thickness×width
signature first — parts of different cross-sections don't share a board.

**A false shortfall is as damaging as a missed one.** If you assert one, set
`"shortfallClaim": true` on the patch so it routes to the full 3-verifier panel.

## Output

Write a JSON **array** of patch objects to the output path you are given. One object per
slug you were assigned — including the ones you pass, so the ledger stays complete.

**`baseStepTitles` is REQUIRED on every rewrite patch**: the `title` of every step in the
plan AS YOU READ IT, in order, verbatim. Your `index` values are meaningless against any
other array, and a batch of 34 patches was once invalidated wholesale because a script
inserted a step into those plans while the patches sat waiting — every replace then
overwrote the step after its target. The applier compares this list and refuses the patch
if the plan has moved. Copy it; do not summarise it.

```json
[
  {
    "slug": "1x3-blanket-ladder",
    "score": 2,
    "baseStepTitles": ["Cut the parts", "Lay out the rung positions", "Assemble", "Finish"],
    "action": "rewrite",
    "shortfallClaim": false,
    "flags": ["Exact rung spacing is not specified in the source; 14-15\" is DERIVED from the 72\" rail and 5 rungs."],
    "ops": [
      { "op": "insert", "index": 0,
        "step": { "title": "Cut the rails and rungs", "body": "...", "tools": ["circular-saw"], "materials": ["1x3 furring strips, 8 ft"] } },
      { "op": "replace", "index": 0, "title": "Lay out the rung positions", "body": "...", "tools": ["tape-measure"], "materials": [] }
    ]
  },
  { "slug": "some-good-plan", "score": 4, "action": "pass", "flags": [] }
]
```

- `op: "insert"` — `index` is the position in the ORIGINAL step array; the step object is
  complete.
- `op: "replace"` — `index` is the ORIGINAL index; supply only the fields you're changing
  (`title`/`body`/`tools`/`materials`).
- Indices are all against the original array. The applier handles the shifting.

## Before you return

Sanity-check your own patch: every tool slug and material name copied verbatim from the
plan, every number traceable, no decimals with an inch mark, no `$`. Then return a
one-paragraph summary — scores, what you rewrote, and any correctness defects you found.
The patch file is the deliverable; the summary is for the log.
