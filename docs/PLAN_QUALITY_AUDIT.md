# PLAN_QUALITY_AUDIT.md — pre-go-live audit of the published plan catalog

**Audience:** a new Claude Code session (native, Keagan's Windows checkout) and any sub-agents it
spawns. **Owner:** Keagan (PM). **Written:** 2026-10-18, revised after a fresh-eyes review.
**Rubric version:** `R-1`.

Read this whole file before doing anything. Then read `CLAUDE.md` (project rules — they apply to
you) and `GO_LIVE_FIXES.md` (what is already known). You need no other history.

**This is an audit, not a sprint.** Do not create a sprint pack, a SPRINT_LOG entry, or a
BUILD_PLAN row. The only process files are the ones §7 defines.

---

## 1. Objective

Keagan's goal, in his words: **"ensure each plan makes sense and the measurements are good."**
That is the whole scope. For each of the **610 published plans** in `content/plans/`, answer two
questions:

1. **Does it make sense?** The steps can be followed in order: every part is cut before it is
   used, nothing is missing, nothing depends on a document we don't have, and each step says
   what to do and how parts join.
2. **Are the measurements good?** The cut list agrees with the steps, each part can come from the
   material listed, the materials bought are enough, and positions/sizes the builder needs are
   given.

Everything else (tools lists, finishing, safety, time/cost estimates, style) is out of scope.

**Where the plans came from:** all 610 were imported from Kreg Tool's plan library in July 2026
(`git log` shows every file added by commit `efb0c79` "Swap catalog to Kreg import"). Kreg hosts
plans by many authors, so some read like Ana White or blog plans (one says "This is an Ana White
modified design"), but they all came through the same importer and get the same audit. The old
Ana White catalog is not live and is not audited.

Every plan gets one verdict:

| Verdict | Meaning |
|---|---|
| **Ship** | Followable as written. Every rubric check passes (§6). |
| **Ship (unverified)** | No failures found, but at least one check came back `unknown`. Listed separately so Keagan can see how much was not verifiable. |
| **Fix** | Followable after specific, listed corrections. |
| **Unpublish** | Not followable, or depends on something we don't have. Should leave the catalog until corrected. |
| **Human review** | The question can only be answered with woodworking knowledge outside §9 (e.g. "is this joint/screw adequate?"). You flag it; you never decide it. Can combine with another verdict (e.g. `Fix + Human review`). |

**Success** = a record for every one of the 610 plans (§7), a report Keagan can act on in about
an hour (Stage 8), and findings that are each backed by quoted evidence. A smaller, correct audit
beats a complete, speculative one.

**READ-ONLY for the catalog.** You change nothing in `content/`, `src/`, `prisma/`, `public/`,
`scripts/`, or the database. You write only under `audit/plan-quality/`, plus one `GO_LIVE_FIXES.md`
section at the very end (Stage 8). Fixing is separate work Keagan schedules from your report.

---

## 2. Decisions already made — do not re-open them

| Decision | Source |
|---|---|
| Plans by outside authors (bloggers, paid-plan sellers linked from Kreg) **stay**. Authorship and third-party links are not problems in themselves. A plan that *depends* on content we don't have is (R1). | DECISIONS_LOG 2026-10-18 |
| Kreg is a confirmed partner; the catalog is cleared to be public. Licensing is out of scope. | DECISIONS_LOG 2026-07-24 (G1) |
| Safety/technique coaching copy is **gated (D7)**. You never write or recommend safety text. Safety and structural adequacy are **not** part of this audit; if something looks like a genuine hazard, note it once in the report and move on. | CLAUDE.md, DECISIONS_LOG; Keagan 2026-10-18 scope |
| The catalog is inch-only; metric plans were unpublished in Sprint 84. Audit published plans only. | DECISIONS_LOG 2026-10-17 |
| Time, cost tier and difficulty are **formula estimates** from the import. Out of scope — do not check them. | Keagan 2026-10-18 scope |
| Content JSON is the source of truth. Never edit plan files or the DB. | CLAUDE.md §6 |
| **Known issues — record per plan where they apply, but do not report them as new findings:** S-17 (seed resets `publishedAt`); S-18 (garbage cut-list rows inside the size bounds — score them under R3); **S-19 (the importer drops fractions — §3)**. Also known, not yet logged: the site's cut optimizer packs boards by length only and cannot lay out plywood sheets — mention it **once** in the report, never as a plan failure. | GO_LIVE_FIXES.md |

---

## 3. Ground truth (measured 2026-10-18 — re-measure in Stage 3, never assume)

| Fact | Value |
|---|---|
| Plan files / published | 1,128 / **610**. A plan is published when its JSON has `"published": true` (the schema default is `true`, so a missing key also counts as published; in practice every file states it). |
| Per published plan (avg) | 11.2 steps · 8.1 cut-list rows · 8.3 materials · 7.2 tools · 14.2 images |
| Steps / steps with an `image` | 6,809 / 6,120 |
| Images in `images[]` not attached to any step | 1,928 across 581 plans (one of them may be the cutting diagram) |
| Plans whose **step text** mentions "full plans", "Extras" or "PDF" | 66 (78 if any field is searched) |
| Steps that say "as shown"/"cutting diagram" with no step image | 96 steps in 63 plans |
| Plans containing an `http` link | 35 (allowed — §2) |
| Image alt text | Generic ("<title> — step photo N") on **all** images. Never infer content from it. |
| `cutList[].material` | Empty on **every** row. Which stock a part comes from is not recorded. |
| Material lines with `quantity: 1` | 2,540 of 5,047 (many may be importer defaults — see below) |
| Categories (published) | furniture 230 · gifts 148 · storage 110 · outdoor 77 · shop 42 · cutting boards 3 |

**Plan file shape** (`src/content/plan-schema.ts` is authoritative; `.strict()` — unknown keys
fail): `slug, title, summary, description, category, difficulty (1–5), timeMinMinutes,
timeMaxMinutes, timeLabel, costTier, costMinCents, costMaxCents, tags,
tools[{slug, essential, note?}], materials[{name, unit, quantity, species?, costCents?, note?}],
cutList[{part, quantity, thicknessIn, widthIn, lengthIn, material?, note?}],
steps[{title, body, image?, tools?, materials?}], images[{url, alt, isPrimary?}],
unresolvedImages?, published`.

**How the plans got here — read before judging any plan.** The catalog was scraped from
`https://learn.kregtool.com/plans/<slug>/` by `kreg_scraper.py` (repo root) into a
`kreg-plans.json` dump (not in the repo), then converted by `scripts/import-kreg-plans.mjs`. The
importer is lossy in ways that make a correct Kreg plan look broken here:

- **Fractions dropped (S-19, the big one).** `parseNum` (`import-kreg-plans.mjs:19-25`) reads
  `5-1/2` but not `5 1/2`; `parseFloat("5 1/2")` returns **5**. About 1,400 of 4,938 published
  cut-list rows are whole numbers in every dimension, and in 299 plans the step text gives a
  fraction where the cut list has only the whole number (e.g. `one-sheet-workbench` steps cut a
  "16 1/4″" strip; the cut list says Shelf 16). **Rule:** when a cut-list dimension is a whole
  number and the step text, the material's nominal size (§9), or another field gives the same
  number plus a fraction, record `cause: "import"` — it is a real defect on the live site, but it
  is S-19, fixed in bulk, never a separate plan finding and never grounds for Unpublish.
- **Dimensions reordered.** `:36` sorts the three parsed numbers smallest→largest, so grain
  direction and "which edge is width" are lost. The nominal-lumber path (`:40-47`) does not sort
  and can take a stray number as the length (32 published rows are not smallest→largest, e.g.
  `adirondack-counter-height-chair` "Arms 0.75×2.5×2"). Treat such rows as `cause: "import"`.
- **Quantities defaulted.** A material quantity it cannot parse becomes **1** (`:109-110`); a
  cut-list row quantity likewise (`:140`). A cut list is emitted only if every row parses.
- **Tools dropped.** Tool names the mapping doesn't know are omitted (`report.unmappedTools`).
- Steps with no title and no body are dropped (`:94`); tips are appended to the body as
  `**Tip:** …` (`:126`).

When the data looks wrong, the cause may be the **import**, not Kreg. Stage 2 exists to tell the
two apart.

**Rendering:** `/plans/<slug>` (overview, materials, tools, cut list, steps),
`/plans/<slug>/build`, `/plans/<slug>/print`, `/plans/<slug>/boards` (the optimizer's "what to
buy"). Step text is shown as written; cut-list dimensions are shown as tape-measure fractions
(nearest 1/16″).

---

## 4. Evidence rules — the most important section

These make every finding a fact, not a guess. A finding that breaks one is discarded, however
plausible.

1. **Quote it or drop it.** Every failed check cites the slug, the JSON path (`steps[4].body`,
   `cutList[2]`, `materials[0].name`) and a **verbatim quote** (≤ 200 chars). If you can't point
   at the text, you don't have a finding.
2. **Show the arithmetic.** Any numeric claim includes the calculation with every input quoted
   from the plan, or the output of a committed script. "Seems short" is not a finding.
3. **Absence must be searched, not assumed.** "X is never cut" / "size Y is not in materials"
   requires searching the whole plan (all steps, cut list, materials, description, summary) —
   state the search (e.g. `no cutList.part or materials.name matches /shelf/i`).
4. **Only the plan and §9 are facts.** Your woodworking knowledge tells you *where to look*; it is
   never itself evidence. A check that needs outside knowledge not in §9 ("is this screw long
   enough?") → **Human review**, not Fix.
5. **`unknown` is a valid answer.** Every check can return `unknown` with a reason. Never turn an
   `unknown` into a `fail` to be thorough.
6. **Never invent a number, step, part, or fix.** Say *what is missing* ("no shelf height in
   `steps[6]`"); never supply the value.
7. **Images:** only claim what an image shows if you opened it in this run (`viewed: true`).
   Never infer content from alt text.
8. **Plan vs site vs import.** A problem in how the site shows a correct plan is a site finding
   (report once). A problem the importer caused is `cause: "import"` (§3). Only a problem in
   Kreg's own content is `cause: "plan"`.
9. **Verify before Unpublish.** No plan is marked Unpublish until an independent verifier
   (§10) has tried to refute each Unpublish-level finding and failed.
10. **Confidence is explicit:** `confidence: "certain" | "likely"`. Only `certain`, verifier-upheld
    findings can produce Unpublish.
11. **Script vs reader disagreement.** If a reader contradicts a sweep result, the reader must
    quote the evidence; the verifier decides. If the verifier can't settle it, the check is
    `unknown`.

---

## 5. Scope guards — what NOT to spend time on

- **No edits** outside `audit/plan-quality/` (plus the Stage 8 `GO_LIVE_FIXES.md` section). No
  content, code, schema, tests, `scripts/`, config, or DB.
- **No rewriting** steps or drafting better instructions. Name what's missing; stop.
- **Do not audit** unpublished plans, `content/plans-draft/`, the board designer, site UI, SEO,
  performance, or `GO_LIVE_FIXES.md` items beyond §2.
- **Do not judge style:** tone, first-person voice, brand mentions ("Kreg Jig®"), length, photo
  quality, attractiveness. Only followability.
- **Out of scope (Keagan 2026-10-18):** tools lists, finishing, safety/structural adequacy,
  time/cost/difficulty estimates. The audit answers only "does it make sense?" and "are the
  measurements good?" (§1).
- **Do not run** `scripts/run1-ledger.mjs --init` (writes a root-level file) or
  `scripts/run1-apply-patch.mjs` (writes plan files).
- **Network:** you may fetch plan images from the R2 host in the plan JSON
  (`pub-b845b7e7b4924e4d8f2520661b54734d.r2.dev`) to view them, saving to the session scratchpad
  only. Any other request — including re-scraping Kreg — needs Keagan's go-ahead.
- **Per-plan budget:** about **40k tokens** per plan in Stage 6, images included. Over that, record
  `unknown` with the reason and move on.
- **Stop and ask Keagan** (never decide yourself) when: a rubric check proves ambiguous on real
  plans; more than ~25% of plans head to Unpublish; you find what looks like a live safety
  hazard; or a stage gate (§8) is reached. If Keagan doesn't answer at a gate: commit, update the
  status block (§12), and stop. Do not continue past a gate on assumption.

---

## 6. The rubric (version R-2)

R-2 (2026-10-19, Stage 5, DECISIONS_LOG): R1 gains a Fix level; R9 no longer counts toward the
verdict; R10 widened to every position the builder must set; R14 added. Reason: calibration showed
R9 alone decided ~half of all Fix verdicts, and 33 of 70 read plans had real sense/measurement
problems (`gaps`) no R-1 check caught.

Each check returns `pass | fail | unknown | n/a`. **S** = script, **R** = reading, **S+R** = script
flags, reading confirms. Apply the §3 import rule first: a failure caused by S-19 or another
importer defect is recorded with `cause: "import"` and does not count toward the verdict
thresholds (it is reported in bulk).

| Id | Check | How | Fail level |
|---|---|---|---|
| R1 | The plan does not depend on content we don't have: a step, cut row or material that says to use full plans, Extras, a PDF, a downloadable template, or an external/paid page **in order to complete the build**. A credit or optional link is fine (§2). | S+R | **Unpublish** when the build cannot be completed without the missing content; **Fix** when it can (only a non-structural piece is missing, e.g. a printable dial or a decorative cutout shape) |
| R2 | Every part a step cuts or assembles exists in the cut list, or the step itself says to cut it from listed material. | S+R | Missing **structural** part → Unpublish; other → Fix |
| R3 | Every cut-list row is a real part the steps use — not an assembly ("Drawers"), a placeholder ("See Full Plans"), or unused. | S+R | Fix |
| R4 | Each part's thickness and width can come from a listed material: compare with §9 nominal sizes, allowing for S-19 (a whole number that is the nominal width rounded down passes, `cause: import`). Sheet parts must fit 48″ × 96″ (in either orientation). | S | Fix |
| R5 | Materials cover the cut list. Score it **only** when the plan uses exactly one stock type, or the steps name the stock for every part. Then: total part length + 1/8″ per cut ≤ total length bought (lengths only where the material name states them, §9). For sheets: `unknown` unless all parts are from one sheet type and their total area exceeds the area bought (that is a certain fail). If any quantity involved is 1 and Stage 2 shows it may be an import default, result is `unknown`. | S | Fix |
| R6 | Every fastener/hardware size used in the steps appears in materials, and the plan never gives two different sizes for the same use. | S+R | Fix |
| R8 | Build order is possible: each part/sub-assembly exists before the step that uses it; nothing is fastened in a way a later step must undo or cannot reach. | R | **Unpublish** if the build cannot proceed; else Fix |
| R9 | Pocket-hole joints: a jig thickness setting is stated **somewhere in the plan** for every part thickness that gets pocket holes, and no setting contradicts the thickness it is used on. One statement covers all later joints of that thickness. Other joints: the method and fastener are stated. Screw length vs an outside chart is **not** judged. A setting shown in a viewed image counts as stated. | R | Fix — **recorded only; does not count toward the verdict** (catalog-wide bulk fix, reported once in Stage 8) |
| R10 | Every position the builder must set to complete the build — where a part, piece of hardware or hole goes, when the parts themselves don't fix it — is given as a number, or shown in a viewed image. This includes positions the text never mentions (a shelf height, cord-hole location, hinge-cup distance). Relational placements — centered, flush, even spacing, "as desired", against another part — and positions fixed by the parts (a panel captured in a frame) **pass**. | S+R | Fix |
| R11 | A step that says "as shown", "see diagram" or refers to a drawing has an image available: its own step image, **or** any unattached image in `images[]` that, when viewed, shows the referenced content. | S+R | Fix; **Unpublish** if the step is structural and the information exists nowhere in the plan |
| R14 | Steps, cut list and materials agree: (a) a count or size a step gives for a part matches its cut-list row (Kreg-corrected; S-19 is `cause: import`), and numbers a step gives add up (e.g. slat count × width + gaps vs the opening, quoted inputs); (b) every part or sub-assembly the steps make is installed by a later step; (c) every non-fastener item a step uses (hinges, glides, brackets, staples, anchors, sheet plastic) is in materials (fastener sizes stay R6, parts stay R2, unused cut rows stay R3); (d) the steps reach the finished piece. | R | **Unpublish** when the steps end without making or installing a part the piece cannot be used without (drawers, doors, top, seat); else **Fix** |


Ids R7 (tools list), R12 (finishing) and R13 (high-risk/safety) were removed when Keagan narrowed
the scope on 2026-10-18 — do not score them, and do not renumber the others.

**Verdict** (count only `cause: "plan"` findings):
- **R9 is excluded** from everything below (its fails and unknowns are recorded, not counted).
- **Unpublish** — any Unpublish-level failure that is `certain` and verifier-upheld; **or** ≥ 4
  Fix-level failures that are all `certain` and verifier-upheld (the plan needs a rewrite).
- **Fix** — 1–3 Fix-level failures, or an Unpublish-level finding that is only `likely`.
- **Ship** — every check `pass` or `n/a`.
- **Ship (unverified)** — no failures, but one or more `unknown` on R3–R14 (R9 excluded).
- An `unknown` on **R1, R2 or R8** blocks Ship → **Human review**.
- **Human review** is added when a check can only be settled with knowledge outside §9; the
  record carries `humanReview: "<reason>"`.
- The verdict is computed from the checks by `audit/plan-quality/scripts/verdict.mjs` (R-2); a
  verdict that needs a verifier that hasn't run is `Unpublish (pending verifier)`.
- A plan whose only failures are `cause: "import"` gets the verdict its `plan`-cause checks earn,
  with `importAffected: true`.

Rubric changes happen only in Stage 5, are versioned (`R-2`…), with the reason recorded; every
record carries the version it was scored under.

---

## 7. Records and resumability

All output lives in `audit/plan-quality/`. Only the **orchestrating session** writes the ledger,
merges records and runs git; sub-agents write only their own batch's `plans/<slug>.json` files.
Commit to `main` after every batch (trunk-based, CLAUDE.md §4); **push only at a gate** (to avoid
one deploy per batch). A context reset loses nothing: the next session reads the ledger and
continues from the first entry not `done`.

- `audit/plan-quality/ledger.json` — one entry per published slug:
  `{ slug, stage: "pending"|"swept"|"read"|"verified"|"done", tags: [], verdict, rubric, batch }`.
- `audit/plan-quality/plans/<slug>.json` — one record per plan (shape below; values illustrative,
  not real):

```json
{
  "slug": "<slug>",
  "rubric": "R-1",
  "batch": 3,
  "importAffected": true,
  "importDiffs": [],
  "checks": {
    "R1": { "result": "pass" },
    "R5": { "result": "fail", "level": "Fix", "confidence": "certain", "cause": "plan",
            "evidence": [{ "path": "materials[2].name", "quote": "<verbatim>" },
                         { "path": "cutList[0..4]", "quote": "<verbatim>" }],
            "arithmetic": "<every input quoted, then the sum and comparison>" },
    "R10": { "result": "unknown", "reason": "steps[3] image not viewed" }
  },
  "verdict": "Fix",
  "verifier": { "ran": true, "upheld": ["R5"], "refuted": [] },
  "notes": "optional, one sentence"
}
```

- `audit/plan-quality/scripts/` — any script you write (sweep, comparison, tagging). Read-only
  against `content/`, deterministic, committed, and **lint-clean** (`npm run lint` covers this
  folder). You may import helpers from `scripts/run1-*.mjs` (§11) but re-test them on 3 real
  plans before trusting their output.
- Never leave a finding only in chat or a commit message. If it isn't in a record, it didn't
  happen.

---

## 8. Stages

Each stage has an objective, outputs and a **gate**. At a gate: commit, push, report to Keagan in
≤ 10 lines, and stop until he answers.

### Stage 1 — Set up
**Objective:** the ledger and records exist; nothing is judged yet.
1. Create `audit/plan-quality/` and `ledger.json` with the 610 published slugs (`"pending"`).
2. Read `src/content/plan-schema.ts`; three plans of different kinds (a small gift, a cabinet with
   drawers, a bed); `scripts/import-kreg-plans.mjs` lines 1–160; the `run1-*` headers.
3. Try each rubric check by hand on those three plans. If one can't be applied as written, note
   it for Stage 5 — never reinterpret silently.
**Gate:** none.

### Stage 2 — Import fidelity (needs Keagan)
**Objective:** separate importer defects from Kreg's content, so importer defects are fixed once.
1. Ask Keagan whether he still has `kreg-plans.json`. If yes, use it.
2. If not, ask before re-scraping. With his OK: confirm on 5 plans that the URL pattern
   `https://learn.kregtool.com/plans/<slug>/` matches our slugs, then run
   `python kreg_scraper.py --url <url>` per published slug (it is polite: delay, robots.txt,
   backs off). Save output under the scratchpad, not the repo.
3. Script-compare each plan with its source: material quantities (find defaulted 1s), cut-list
   rows (count, quantity, dimensions — confirm S-19 per row), step count, dropped tools.
4. Write `importDiffs` into each record.
**Output:** `audit/plan-quality/import-fidelity.md` — each importer defect, the line in
`import-kreg-plans.mjs` responsible, and how many plans/rows it touches.
**Gate:** report. If Keagan declines both options: R5 is `unknown` wherever a quantity of 1 is
involved, R4 import-cause calls rely on §3 heuristics only, and say so in the report.

### Stage 3 — Scripted sweep (all 610, no model reading)
**Objective:** everything a script can decide is decided, with evidence, before anyone reads.
1. Write `audit/plan-quality/scripts/sweep.mjs` for the S and S+R parts of R1–R6, R10 and R11.
   S+R checks write `flagged` candidates (with path + quote) for readers.
2. Re-measure every §3 number; note any that differ.
**Output:** updated records; `audit/plan-quality/sweep-summary.md` (counts per check, import vs
plan cause).
**Gate:** only if > 25% of plans already fail an Unpublish-level check with `cause: "plan"`.

### Stage 4 — Pilot read (30 plans)
**Objective:** test the rubric and the reader prompt on real plans before spending on 610.
1. Pick 30: 15 worst by sweep flags and 15 the sweep found clean, across categories.
2. Read with the §10 reader template, 10 per sub-agent. Run the verifier on every Unpublish
   finding.
3. Record where checks were ambiguous, where readers disagreed with the sweep, and tokens/plan.
**Gate:** none — feeds Stage 5.

### Stage 5 — Calibration with Keagan
**Objective:** prove the auditor's verdicts match a woodworker's before acting on them.
1. Write `audit/plan-quality/calibration.md`: about 40 plans (15 Ship, 15 Fix, 10 Unpublish; read
   more beyond the pilot as needed; spread across categories; include plywood-heavy and long
   plans). For each: `https://notchplans.com/plans/<slug>`, the agent verdict, failed checks with
   quotes, and a blank "Keagan's verdict" column.
2. The measure that matters is **false Ships** (agent Ship, human Fix/Unpublish). Required:
   **zero** false Ships attributable to R1, R2 or R8.
3. Change the rubric (`R-2`) only where Keagan's verdicts show a check is wrong; record why.
**Gate:** STOP until Keagan signs off the calibration file. Do not start Stage 6 without it.

### Stage 6 — Full read (remaining plans)
**Objective:** every published plan has a verdict.
1. Worst-first from the ledger, 10–15 plans per fresh sub-agent (§10). Commit after each batch.
2. Open a step image only when the sweep flagged that step (R10/R11), or (R-2) when it is needed to
   settle an R10/R14 position or count. Do not open every image.
3. Verifier on every Unpublish finding.
4. If the rubric changed in Stage 5, re-score the pilot plans under it first.
**Gate:** none until done; stop early per §5.

### Stage 7 — (removed)
Estimate formulas were dropped from scope on 2026-10-18. Go straight to Stage 8.

### Stage 8 — Report and triage
**Objective:** decisions Keagan can make in about an hour.
1. `audit/plan-quality/REPORT.md`:
   - Headline counts by verdict; top 10 failure reasons with counts; `unknown` counts per check.
   - **Decision lists:** Unpublish (slug + one-line reason); Fix (grouped by fix type, with the
     importer-level fixes first — one importer change can fix hundreds of plans); Human review;
     Ship (unverified).
   - Importer defects (Stage 2) and the bulk fix each implies.
   - Site findings, once each (e.g. optimizer can't lay out sheets), and any genuine hazard
     noticed in passing (one line each — not audited).
   - What was **not** verified and why.
2. Append a **C — Catalog** section to `GO_LIVE_FIXES.md` (ids `C-01`…): one row per *type* of
   problem with counts and a pointer to `REPORT.md`. Follow that file's rules (append-only).
3. Change no plan. Push. Report to Keagan.

---

## 9. Reference tables — the only outside facts you may use

**Dimensional lumber (nominal → actual, inches):**

| Nominal | Actual | Nominal | Actual |
|---|---|---|---|
| 1×2 | 3/4 × 1 1/2 | 2×2 | 1 1/2 × 1 1/2 |
| 1×3 | 3/4 × 2 1/2 | 2×3 | 1 1/2 × 2 1/2 |
| 1×4 | 3/4 × 3 1/2 | 2×4 | 1 1/2 × 3 1/2 |
| 1×6 | 3/4 × 5 1/2 | 2×6 | 1 1/2 × 5 1/2 |
| 1×8 | 3/4 × 7 1/4 | 2×8 | 1 1/2 × 7 1/4 |
| 1×10 | 3/4 × 9 1/4 | 2×10 | 1 1/2 × 9 1/4 |
| 1×12 | 3/4 × 11 1/4 | 2×12 | 1 1/2 × 11 1/4 |
| 4×4 | 3 1/2 × 3 1/2 | | |

Material names come in several forms (`Board, 1x6 36"`, `1x8x8`, `2x4 - 8'`). Parse the length
only when a unit is explicit (`"`, `in`, `'`, `ft`). An `NxMxL` form with no unit is ambiguous:
treat its length as **feet only if L ≤ 16**, and record that assumption in the evidence; otherwise
`unknown`.

**Sheet goods:** 48 × 96 full sheet; part sheets as written in the name (24 × 48, 48 × 48, …).
Thickness as written.

**Kerf:** 1/8″ per cut.

**No length written:** stock length is `unknown`. Never assume 8 ft.

Anything not here — screw-length charts, span tables, load ratings, wood movement — is not a fact
you may apply. Questions that need it are Human review.

---

## 10. Sub-agent templates

**Batch reader (Stages 4 and 6).** Spawn fresh; pass this text plus the slugs:

> You are auditing published woodworking plans for followability. First read
> `docs/PLAN_QUALITY_AUDIT.md` §1–§6 and §9 — they bind you, especially §3 (the importer drops
> fractions and defaults quantities; such defects are `cause: "import"`, not plan failures) and
> §4 (evidence rules). For each slug: read `content/plans/<slug>.json` and its record
> `audit/plan-quality/plans/<slug>.json`. Your only questions are "does the plan make sense?" and
> "are the measurements good?" (§1). Confirm or reject each `flagged` item and score R1–R6 (sweep
> results stand unless you quote evidence against them), R8, R9, R10, R11 and R14 under rubric R-2. Open an image (fetch from the R2 URL in the JSON, scratchpad
> only) only for steps the sweep flagged, or when needed to settle an R10/R14 position or count. Every failure needs path + verbatim quote (+ arithmetic
> if numeric); otherwise `unknown`. Do not rewrite steps, invent values, or judge style. Write
> each plan's updated record (same schema) and nothing else. Do not run git. Return only, per
> plan: slug, proposed verdict, failed check ids.

**Verifier (every Unpublish finding).** Spawn fresh — never a reader:

> Your job is to REFUTE audit findings. For each finding (slug, check id, path, quote,
> arithmetic): open `content/plans/<slug>.json`, confirm the quote is verbatim at that path, redo
> the arithmetic, check whether §3's importer rule explains it, and search the whole plan for
> anything that resolves it (the part cut in another step, the size stated in the description,
> an unattached image). Return per finding: `upheld` or `refuted`, with evidence. Add no new
> findings. Judge nothing outside the finding. Do not run git or edit files.

The orchestrator applies results: refuted → the check becomes `pass` or `unknown`; upheld →
`verifier.ran: true, upheld: […]`.

---

## 11. Existing tools — reuse, but re-test

From the July 2026 "Run 1" audit of the previous (ana-white) catalog — **different data**:

| Script | Useful for | Caution |
|---|---|---|
| `scripts/run1-number-lint.mjs` | Tracing numbers in step text to the cut list/materials (R2, R6, R10, and spotting S-19 rows) | Re-test on 3 Kreg plans first |
| `scripts/run1-box-geometry.mjs` | Which members run full length in a box frame (R8 sanity) | Built for ana-white shapes |
| `scripts/run1-verify-packet.mjs` | Per-stock totals vs supplied stock (R5) | Assumes parseable stock lengths |
| `scripts/run1-batch.mjs` | Worst-first batching pattern | Reads the stale ledger — copy the idea, not the file |
| `scripts/run1-ledger.mjs`, `run1-ledger.json` | Ledger pattern only | `--init` writes `run1-ledger.json` at the repo root (1,115 stale entries). **Do not run or reuse.** |
| `scripts/run1-apply-patch.mjs` | — | Writes plan files. **Never use** in this audit. |
| `scripts/validate-plans.mjs` | Schema + cross-field validation | Already green; not a quality check |

The previous audit brief (`git show 0568433^:PLAN_AUDIT_BRIEF.md`) found ~47% of a 70-plan sample
had a material-sufficiency or internal-contradiction defect. Expect R5 and R6 to be the largest
categories here too — after S-19 is accounted for.

---

## 12. Session rules

- `CLAUDE.md` applies. Native session: you may run git; commit to `main` after each batch; push
  at gates (after a push, check CI per CLAUDE.md §7).
- Keep a status block at the top of `audit/plan-quality/REPORT.md` (current stage, batch,
  counts by verdict) so Keagan can check progress at any time.
- At a gate: commit, push, summarise in chat in ≤ 10 lines (what was done, the numbers, what you
  need), and stop.
- If anything here conflicts with the plan data or `CLAUDE.md`, stop and ask. Do not invent a
  new rule.
