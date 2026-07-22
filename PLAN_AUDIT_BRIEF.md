# Notch Catalog — Plan Audit & Enrichment Brief

**Purpose:** an executable specification for a future Claude agent to audit and improve the
1,115 woodworking-plan JSON files in `content/plans/`. The audit/rewrite work described here has
**not** been executed — the plan content is unchanged.

**Already committed this session, at the owner's direction (image *pipeline* only, not plan content):**
`scraper.py` (captures all photos, not just the first), `scripts/import-legacy-plans.mjs` (maps the
full `images[]` through), and the per-step-image content layer — `plan-schema.ts`, `load.ts`,
`scripts/validate-plans.mjs` (see §5.4). All additive and validator-green on all 1,115; no plan
file's content was altered.

**Authored:** 2026-07-22 (planning session). Baseline figures below were measured against the
live repo on that date; re-measure before acting, since content may have moved.

**Read these repo files before doing anything** (they are the contract this work must respect):
`CLAUDE.md`, `BUILD_PLAN.md`, `DECISIONS_LOG.md`, `src/content/plan-schema.ts`,
`src/content/load.ts`, `scripts/validate-plans.mjs`, `src/lib/format.ts`,
`src/lib/shopping-list.ts`.

---

## 1. Objectives

1. **Step-detail audit.** Assess every plan so each build step carries enough context for a
   person to build the project *by hand, from the text alone* — the right tool, the reference
   face/edge, the measurement or setting, the check that tells them it went right.
2. **Conditional rewrite.** Where a plan's steps are not thorough enough to follow by reading,
   rewrite them to the standard in §4 — grounded in the plan's own data, never invented.
3. **Image audit.** Detect **missing** images (empty `images[]`) and **broken** images
   (an `images[]` URL that no longer serves).
4. **Missing-image review list.** Produce a prioritized list of image-less plans for later
   human review / sourcing.

---

## 2. Ground truth (measured 2026-07-22)

| Fact | Value |
|---|---|
| Plan files in `content/plans/` | 1,115 |
| Pass the schema + cross-field validator (`validate-plans.mjs`) | 1,115 / 1,115 (clean) |
| Published / unpublished | 948 / 167 |
| Published **with** an image | 863 |
| Published **no** image (live, showing placeholder — **P1**) | **85** |
| Unpublished no image, but parked `unresolvedImages` URL exists (**P2**) | **154** |
| Total live `images[]` URLs | 876 — **all** on `pub-b845b7e7b4924e4d8f2520661b54734d.r2.dev`, none malformed |

Two audit tiers already run this session (results in the delivered `woodworking-plan-audit.md`):
a deterministic pass (0 LLM tokens) and a 70-plan semantic sample. The sample found **~47% of
plans carry at least one content issue**, dominated by *material-sufficiency* (declared lumber
falls short of the cut list) and *internal-contradiction* (a dimension/quantity labeled
inconsistently across prose, cut list, and materials). This matters here because **a step-detail
rewrite must not paper over a numeric defect** — see §4.6.

---

## 3. Hard constraints (do not violate)

These come from the repo's own rules. Breaking any of them silently corrupts a live catalog.

- **The validator is the gate.** After *every* batch of edits, `node scripts/validate-plans.mjs`
  must pass. It mirrors the real Zod schema in `plan-schema.ts` (`.strict()` everywhere: an
  unknown key fails). If in doubt, `plan-schema.ts` wins.
- **Step tags are a subset.** `step.tools` are plan **tool slugs**; `step.materials` are plan
  **material names**. Each must be a subset of the plan's own `tools`/`materials`
  (enforced in `load.ts`). If a rewrite references a tool the plan doesn't list, either add it
  to `tools[]` (its slug must exist in `content/tools.json`) or reword — never tag a
  non-subset value.
- **No dollar figures, ever, in prose.** The UI shows cost *tiers* only (`$`–`$$$$$`).
  `formatCents`/`formatCostRange` are deliberately deleted. A rewrite must not introduce a
  dollar amount.
- **Tape-measure fractions, never decimals.** Write `13/16"`, not `0.8125"`. `formatInches`
  is the source of truth for display; match it in prose.
- **Do not invent measurements.** Ground every added detail in the plan's `cutList`,
  `materials`, and existing `description`. If a genuinely required dimension is missing or
  contradictory, **flag it for correction — do not fabricate a plausible number.** That is the
  exact trust bug the project warns about.
- **Preserve the print / offline / no-JS contract.** Steps render on the print sheet and in the
  offline cache. Keep `body` clean text (the codebase uses light markdown like `**bold**` in
  `description`; match existing conventions, don't introduce HTML).
- **Don't break the shopping-list exact merge.** Material `name`/`unit`/`species` are merge
  keys. Do not rename a material as a side effect of a step rewrite (that would split or merge
  lines wrongly). Unit spelling must stay consistent (`board feet`, not `board ft`).
- **Work on a branch; produce a reviewable diff.** One plan per file keeps diffs readable.
  Content reaches production only via the seed, so a bad edit is caught at review, not by users
  — *if* the diff is actually reviewed.
- **Sandbox hazards (if executing in the Cowork cloud sandbox):** never write to the mounted
  repo from `bash` (it has corrupted source files); never run `git` against the mount; run the
  test suite from a `/tmp` clone. See §7 and `CLAUDE.md` §6. These do **not** apply when running
  natively (Claude Code, or Cowork "on your computer").

---

## 4. Goals 1 & 2 — Step-detail audit and conditional rewrite

### 4.1 The standard: "buildable by reading alone"

A step passes when a competent-but-new builder could execute it without guessing. Each step's
`body` should, where relevant to that step, cover:

- **Action** — what you are doing (already present in most plans).
- **How** — technique, orientation, which reference face/edge, order within the step.
- **Numbers** — the dimensions, spacing, angle, depth, pilot-hole and fastener size, blade/bit
  setting that the step depends on — in tape-measure fractions, drawn from the cut list/materials.
- **Tool & material** — name the tool and material used (and keep them in `step.tools`/
  `step.materials` as valid subset tags).
- **The check** — how the builder knows it went right ("clamp and confirm the frame is square
  before the glue sets"), and the common mistake to avoid.
- **Safety** — where a step has a real hazard.

### 4.2 Depth target — sufficient, not maximal

Goal 1 says "as detailed as possible." Read that as **as detailed as needed to build by
reading** — not maximal verbosity. Over-writing bloats the print sheet and buries the signal.
Target roughly **2–5 sentences per step**; if a step truly needs more, split it into ordered
sub-steps rather than one wall of text. A dead-simple project (e.g. a glue-up cutting board)
legitimately has short steps — do not pad it to hit a length.

**Approved depth (locked 2026-07-22): match `step-detail-rewrite-sample.md`.** That companion file
is the canonical target — add the missing cut step, the technique, grounded measurements (in
tape-measure fractions), and a per-step check; keep it short; flag missing/contradictory data
instead of inventing. Do not go deeper (no mandatory safety note on every power-tool step, no
invented spacings) or lighter than that sample.

### 4.3 Scoring (audit phase — read-only)

For each plan, score **buildability 1–5** (5 = a stranger could build it from the text; 1 =
critical steps leave the builder guessing). Record, per plan: the score, which steps are
under-specified, and *what specifically is missing* (a measurement, a technique, a tool, an
order). Output structured JSON, one record per plan. **Rewrite only plans below the threshold:
score ≤ 3, or any single critical step under-specified** (locked 2026-07-22). Do not touch plans
that already pass — goal 2 is conditional.

### 4.4 Rewrite rules (only for below-threshold plans)

- Rewrite `steps[].body` (and split/retitle steps if needed) to meet §4.1 at the §4.2 depth.
- Obey every §3 constraint. Re-tag `step.tools`/`step.materials` if the rewrite now clearly uses
  a tool/material — keeping them valid subsets.
- Ground every number in the plan. Where a needed number is absent or self-contradictory, add a
  flag to the plan's audit record (for separate correction) instead of inventing it.
- Keep the plan's voice: plain, practical, second-person imperative, consistent with the existing
  `description`.
- Do not change `slug`, `title` semantics, cost fields, `category`, `difficulty`, `tags`, or the
  cut list as part of a *step* rewrite. Those are separate concerns (see §4.6).

### 4.5 Execution shape (batched micro-agents)

- **Do not run one agent per file.** Batch ~15–20 plans per agent so fixed overhead is amortized;
  hand each agent only its file paths (it reads its own slice) and have it return structured
  findings, not prose. ~60–75 agents cover the catalog per pass.
- Pipeline: **audit/score → (below-threshold only) rewrite → 3-vote adversarial verify → validator
  gate** (see §6 for the full loop). The verify stage is not optional and is **not single-vote**:
  three independent agents, each prompted to *refute*, must majority-confirm (a) schema validity,
  (b) no invented measurement, (c) every number traceable to the plan, (d) constraints in §3,
  (e) depth matching the approved anchor — or the change is discarded and retried.
- After each batch: `node scripts/validate-plans.mjs` must stay green. Commit per batch on the
  branch so a bad batch is isolated.

### 4.6 Intersection with correctness defects (important)

The semantic sample shows ~31% of plans have a *material-sufficiency or contradiction* defect
(e.g. "10 ft board, cut list needs 123.5 in"; "cabinet sides 10 in but shelves 19.75 in"). A
step-detail rewrite **must surface these, not smooth them over.** If the audit agent finds a step
is under-detailed *because the underlying data is wrong or short*, it flags a correctness defect
for separate fixing — it does not write confident prose around a number that doesn't work.
Recommended order: run/attach the correctness check first (or in the same pass), fix data defects,
*then* enrich prose on a plan whose numbers are sound.

---

## 5. Goals 3 & 4 — Image audit and review list

### 5.1 Missing images — deterministic, already computed

- **P1 — 85 published plans, no image, no parked URL.** These are *live* and rendering the honest
  placeholder. Highest priority; each needs a net-new image sourced. Full list in
  `missing-images-review.csv` (delivered alongside this brief) and Appendix C.
- **P2 — 154 unpublished plans, no image, with a parked `unresolvedImages` source URL.**
  Recoverable: the original source URL is preserved and can be re-fetched/re-hosted (see the R2
  migration scripts `scripts/migrate-images-to-r2.mjs`, `scripts/null-unresolved-images.mjs`).
- Regenerate this split anytime with the one-off in Appendix B (offline; no network needed).

### 5.2 Broken images — needs a live network check

All 876 `images[]` URLs are well-formed and on the R2 host, so "broken" cannot be detected
offline — it means the R2 object no longer serves (404/deleted). That requires an HTTP check of
each URL. **This cannot be done in the Cowork cloud sandbox** (WebFetch rejects image binaries;
the device shell has no network; the web-content policy forbids curl/wget/python URL fetching).
Run the ready-made script in **Appendix D** in an environment that has network access to
`*.r2.dev`: Claude Code on the local machine, the user's own terminal, or CI. Any URL returning
non-200 is treated like a missing image (re-source, or park it to `unresolvedImages` and empty
`images[]` so the plan renders the placeholder instead of a broken `<img>`).

### 5.3 Goal 4 deliverable — the review list

`missing-images-review.csv` columns: `slug, published, recoverable_via_parked_source_url`.
Sort/triage: **P1 first** (published, not recoverable), then P2. After §5.2 runs, append **P3**:
published plans whose image URL 404s. This CSV *is* the "review later" artifact.

### 5.4 Per-step images (step illustrations) — **Run 2**; status + remaining vertical

Context: `scraper.py` now captures every photo and `import-legacy-plans.mjs` carries them all into
`images[]` (primary first). The additional (non-primary) photos are intended as **per-step
illustrations**, assigned by the per-plan pass (§4.5) — deliberately not a gallery.

**Getting photos onto the *existing* authored plans** is `scripts/merge-scraped-images.mjs`
(committed 2026-07-22, dry-run by default): it matches a freshly-scraped page back to its live plan
(image-hash → parked-URL → slug), appends only the genuinely-new photos to that plan's `images[]`,
and leaves every authored field untouched — format-skipping anything it can't edit byte-safely.
Image pipeline order: **(1) re-scrape** (native) → **(2) `merge-scraped-images.mjs --write`** →
**(3) `images:migrate`** (re-host to R2) → **(4) per-plan assignment** (§4.5 sets `step.image`).
Finding: a dry-run against the *current* single-image `plans.json` already reports ~65 image-less
plans whose primary could be recovered — review that set before `--write`, since a few may be
encoding-variants of an already-parked broken URL. The multi-image payoff only appears after step (1).

**DONE (content layer — committed 2026-07-22, validator green on all 1,115):**

- `plan-schema.ts` — the step object gains an optional `image`: a URL that must be one of the
  plan's own `images[]`.
- `load.ts` — enforces the subset (`step.image` ∈ the plan's image URLs), same pattern and reason
  as `step.tools` / `step.materials`.
- `validate-plans.mjs` — mirrors both (http(s) URL shape + subset).

A step can now carry a subset-validated photo, and existing plans are unaffected (optional/unused).

**REMAINING — DB + render vertical (native-gated; NOT done in the planning sandbox — needs Postgres
and a native build):**

1. `prisma/schema.prisma`, `model Step`: add `imageUrl String?` and `imageAlt String?` (nullable,
   additive → safe migration).
2. Migration: `npx prisma migrate dev --name add_step_image` (generates + applies locally); prod
   picks it up via `prisma migrate deploy`.
3. `prisma/seed.ts`: when creating each step, resolve `step.image` (the URL) to its `alt` from the
   plan's images and write `imageUrl` + `imageAlt`. Denormalised on purpose — content is re-seeded
   wholesale, so it never drifts.
4. Query: `src/lib/plans.ts` — the step `include` already returns all Step scalars, so
   `imageUrl`/`imageAlt` flow through with **no query change**.
5. Render: `plan-steps.tsx` — `PlanStep` gains `imageUrl?/imageAlt?`; render a `next/image` inside
   the `<li className="step">` with a `step-image` class. **`step-walker.tsx` needs no change** — it
   only toggles `.step` display, so the image rides along. `print/page.tsx` — render the step image
   in the print sheet. Check `globals.css` `@media print` doesn't blanket-hide images; exempt
   `.step-image` if it does.
6. Native gate: migration + re-seed, then `tsc` / `eslint` / `vitest` / `npm run build`, and a
   real-browser check of a plan page and its print view. Renders nothing until a step has an image.

**Assignment task (folds into the §4.5 per-plan pass):** while enriching a plan's steps, the agent
also reviews that plan's non-primary `images[]` and sets `step.image` on the step each photo
illustrates — subset-valid, the primary photo left as the plan hero, and no step forced to take an
image that doesn't fit. One per-plan walk does step text **and** photo assignment.

---

## 6. Execution model — autonomous, Claude Code, quality-gated

Runs entirely in **Claude Code** (native Postgres / build / network). It is an autonomous batch
loop — Claude Code's own iteration, not the literal `/loop` skill. Two runs; **Run 1 needs no
scrape**. Machine gates replace per-batch human approval. The goal is get-it-right-once **at the
lowest token cost that preserves it**: spend the model only on irreducible judgment, and route
everything mechanical or provably-safe to scripts, the cheap tier, or a cached prefix (§6.2).

### Run 1 — Step-detail rewrite + correctness (this quality pass)

Autonomous per-plan loop over **published (948) first, then unpublished (167)**:

1. **Branch** off `main`. Keep a **progress ledger** (per plan: audited / fixed / rewritten /
   verified) so any interruption resumes from the last committed batch — it never restarts. This is
   what makes a crash cost minutes, not a redo.
2. **Per plan, cheap work first (§6.2):** (a) apply the **scripted mechanical fixes** — tier
   recompute, unit spellings, decimal→tape-fraction, and a cut-step *scaffold* from the cutList —
   zero tokens; (b) **correctness reconciliation** (§4.6) — fix the data defect the audit surfaced,
   or flag if undecidable; (c) **step rewrite** to the §4.2 depth *only if* below threshold, and only
   the **thin steps** (emit a patch, not a re-emitted plan). The builder-facing prose is always the
   strong model; a cut-step scaffold is *enriched* by the model, never shipped as bare template.
3. **Verify, tiered (§6.2):** first the **deterministic no-invented-number lint** — every
   part-dimension in the new prose must trace to the cutList/materials (fractions normalised); a
   purely mechanical change that passes the lint + validator needs no model verifier. Every
   **judgment** change (derived measurement, technique, step reorder, material-yield) goes to **3
   independent verifiers, majority rule**, each prompted to *refute* (default reject) — checking
   traceability, nothing invented, schema-valid, depth-matches-anchor, with **full plan context for
   coherence/ordering checks** and the compact packet only for number checks. Ships only on
   majority-confirm; else discarded and retried or flagged.
4. **Self-calibration, not human waiting:** at the start of each transform type the loop emits a
   small sample, a judge panel scores it against the approved anchor, and it proceeds only on a
   match. No human approval gate. (The depth anchor is already human-approved.)
5. **Machine gates after every batch** (all must pass or the batch is reverted and retried):
   `node scripts/validate-plans.mjs` clean, `tsc`, and the content-load test. Commit the batch.

**Run 1 finalize (autonomous):** full `vitest` + `next build`; a **completeness-critic sweep**
("what's unverified, skipped, or unsupported?") whose findings re-enter the loop until it comes back
dry. Then the **safe-autonomous seed** (see §6.1).

### 6.1 Ship gate — autonomous to a green branch, then one manual seed

The loop **never seeds production**. It runs fully autonomous up to a **green, verified, pushed
branch**: per-batch machine gates (validator + `tsc` + content-load test), then finalize with full
`vitest` + `next build` + the completeness sweep, then push so **CI** (lint / typecheck / test /
build — `.github/workflows/ci.yml`) goes green. That is the entire autonomous surface — zero manual
work across all 948 plans.

**Production seed stays the one deliberate manual command, by the project's own design.**
`DEPLOYMENT.md` is explicit: schema auto-flows on deploy, **content does not** — it reaches prod only
via a manual seed, and the dev/prod Neon branch split exists *specifically* so automation can't write
to live users. Confirmed 2026-07-22: no preview-seed / smoke-test / auto-promote pipeline exists, and
building one would reverse that guard. So the loop's final act is to **hand over** the command, not
run it:

```powershell
# Point .env.local at the PRODUCTION branch, then:
npm exec -- dotenv -e .env.local -- prisma migrate deploy
npm exec -- dotenv -e .env.local -- tsx prisma/seed.ts   # read the printed target host — confirm prod
# Swap .env.local back to the dev branch immediately after.
```

Stopping at a green branch is the guardrail; the ~30-second seed is the one intentional human act.

### 6.2 Token discipline — cost down, quality held

Savings come from *not* spending the model where it adds no quality — never from doing judgment more
cheaply. The full 3-vote stays on genuine judgment changes (~10–20% of edits — where a redo hides).
Applied in this order:

1. **Deterministic-first.** Anything with one correct answer is a script, not a model call: tier
   recompute, unit normalisation, decimal→tape-fraction, and the cut-step *scaffold* from the
   cutList. Zero tokens, and more reliable than an LLM (no hallucination).
2. **Deterministic no-invented-number lint.** After a rewrite, extract every measurement and confirm
   each part-dimension traces to the cutList/materials (fractions normalised). This is the primary
   guard against the worst defect — an invented dimension — and it's exact, not probabilistic. Only
   numbers it can't trace reach a model verifier. (It *adds* a gate; it removes none.)
3. **Model tiering — with a hard rule.** Cheap tier: read, triage/score, confirm deterministic
   results, low-risk verification. Strong tier: the builder-facing rewrite prose and every judgment
   verification. **The cheap model never writes an instruction a person builds from, and routing
   escalates to the strong model on any doubt.** Tiering can only *add* rewrites/verification, never
   suppress or cheapen judgment.
4. **Union flagging (anti-silent-miss).** A plan is queued for rewrite if the triage **or** the
   deterministic under-detail signals (short bodies, no measurements, missing cut step) flag it — so
   the cheap triage cannot silently skip a class of plans. Calibrate the triage against the strong
   model on a sample first; tier it only if they agree closely.
5. **Read once; verify on a scoped packet.** One agent reads a plan once and does score + correctness
   + rewrite together. Verifiers get the **full plan** for coherence/ordering/description checks, but
   only the compact cutList+materials packet for number-traceability — never thin the context for a
   judgment check.
6. **Cache the stable prefix.** Rubric + approved anchor + §3 constraints are a fixed, cached prefix;
   only per-plan content varies. Across ~948 iterations the shared prefix is near-free on repeat.
7. **Reuse prior audit output as hints, not gospel.** The deterministic-defects list applies directly
   (mechanical); the semantic sample findings are priors that tell the loop where to look — the loop
   still verifies them.

**Backstops that catch any slip:** the validator, the number-lint, and the completeness-critic sweep
(which re-checks a random sample of *passed* plans with the strong model) all sit downstream of these
optimisations, with the manual seed last. Rough effect: Run 1 lands around **~1M tokens or below**
(vs ~2–4M naïve) with equal or lower redo risk, because the deterministic checks are stronger than
LLM ones for their jobs.

### Run 2 — Additional images (a later, separate pass; §5.4)

Deferred so Run 1 ships clean. Adds its own prereqs first — the per-step-image **DB/render vertical**,
a **fresh scrape**, `merge-scraped-images.mjs`, `images:migrate` — then the same autonomous loop
assigns `step.image` per plan (3-vote verified), gated and seeded exactly as above.

---

## 7. Environment: does Claude Code vs Cowork matter here?

**For authoring this brief and for the read-only audits: no difference.** Planning, orchestrating
batched agents, and the deterministic/semantic audits run equally well in Cowork (this session did
all of that here).

**For *executing* goals 2 and 3, yes — and the differences favor a native environment:**

| Concern | Cowork (cloud sandbox) | Cowork ("on your computer") | Claude Code (local) |
|---|---|---|---|
| Live image URL check (goal 3) | ✗ blocked — no curl/python URL fetch; WebFetch refuses images; device shell has no network | ✗ same web-content policy applies | ✓ agent runs the reachability script directly |
| Run validator / `tsc` / `vitest` on the repo | ~ works, but via a `/tmp` clone (mount is unreliable) | ✓ native | ✓ native |
| `npm run build` (Next.js) | ✗ SIGBUS in the sandbox (documented) | ✓ native | ✓ native |
| `git` branch/commit | ✗ never run git against the mount (corrupts `.git`) | ✓ native | ✓ native |
| Edit the actual files | ~ via the device bridge (stage/commit; documented staleness) | ✓ direct | ✓ direct |
| Orchestrate many sub-agents | ✓ strong | ✓ | ✓ |

**Decision (locked 2026-07-22): execution runs entirely in Claude Code** — it clears every ✗ above
(native Postgres, build, git, and network for the scrape/migrate/image-reachability), and it runs
the autonomous loop and safe-autonomous seed described in §6 without the Cowork web-content
restriction that blocks image fetching. Cowork's role was this planning session only.

---

## 8. Decisions

### Locked (2026-07-22)

- **Depth:** match `step-detail-rewrite-sample.md` exactly — not deeper, not lighter (see §4.2).
- **Rewrite scope:** **published plans (948) first**, then the 167 unpublished as a second wave.
- **Buildability threshold:** rewrite plans scoring **≤ 3, or with any single critical step
  under-specified**.
- **Venue:** **all Claude Code** (native throughout) — an autonomous batch loop, not the literal
  `/loop` skill (§6).
- **Run split:** **Run 1 = step-detail rewrite + correctness** (no scrape); **Run 2 = additional
  images** (scrape → merge → migrate → per-step assignment; §5.4), done later.
- **Verification:** **3 independent verifiers, majority rule** (not single-vote), each prompted to
  refute; changes ship only on majority-confirm (§6).
- **Sample gates:** **automated self-calibration** against the approved anchor — no per-batch or
  per-sample human approval.
- **Autonomy / final gate:** **fully autonomous up to a green, pushed branch** (per-batch machine
  gates + CI). The **production seed is the single documented manual command** (§6.1,
  `DEPLOYMENT.md`) — the loop hands it over rather than running it, honoring the dev/prod branch
  safety split. Confirmed 2026-07-22 the preview/smoke-test/auto-promote net does not exist and
  won't be built.
- **Token discipline (§6.2):** deterministic-first, a deterministic no-invented-number lint, model
  tiering under the hard rule that the cheap tier never writes builder-facing prose or judgment
  verification, union-flagging so tiering can't silently skip plans, scoped verifier packets, and a
  cached prefix. Full 3-vote preserved on judgment changes. Quality held or improved; ~1M tokens or
  below for Run 1.

### Still open (confirm before the relevant step)

- **Tier-bounds reconciliation** (only matters if cost-tier correction is in scope for this pass):
  `plan-schema.ts` (TIER_3 ≤ $350, TIER_4 ≤ $750) vs `format.ts` (≤ $300, ≤ $720). Pick the
  authoritative pair first. *Note: this brief's primary scope is step detail + images; cost-tier
  fixes are the separate deterministic track from the earlier audit.*
- **Token budget** for the published-first semantic + rewrite pass: rough order ~2–4M tokens for
  948 plans; confirm the ceiling before kickoff.

---

## 9. Definition of Done

- `node scripts/validate-plans.mjs` → clean; `tsc`, `eslint`, `vitest` green; `npm run build`
  green (native).
- Every rewritten plan: schema-valid, numbers traceable to its own data, no invented dimension,
  no dollar figure, tape-measure fractions, tags still valid subsets, print/offline intact.
- A buildability score recorded for all plans; every below-threshold plan either rewritten or
  flagged with the reason it couldn't be (e.g. underlying data defect needing a decision).
- Image review list finalized (P1/P2/P3); any confirmed-broken image URL parked to
  `unresolvedImages` with `images[]` emptied so the placeholder renders.
- Every shipped change majority-confirmed by **3 independent verifiers** (§6); a resumable progress
  ledger shows every plan as audited / fixed / rewritten / verified.
- Per-step images (§5.4, **Run 2**): the DB+render vertical shipped and native-verified; each plan's
  non-primary photos assigned to the steps they illustrate (subset-valid) or deliberately left
  unassigned.
- Autonomous work ends at a **green, verified, pushed branch** (CI green); the run hands over the one
  documented **manual prod-seed command** (§6.1). Production is live only after that command is run —
  nothing auto-seeds prod.

---

## Appendix A — Baseline audit figures (2026-07-22)

- Deterministic defects (all 1,115): 40 cost-tier overstatements, 85 published-no-image,
  14 `board ft` unit variants, 1 duplicate material line, 5 unpriced materials. (Full list:
  `deterministic-defects.csv`, delivered earlier.)
- Semantic sample (70 plans, stratified): 53% clean, 16% low-severity, 27% medium, 4% high;
  47% flagged overall. Dominant dimensions: material-sufficiency, internal-contradiction,
  description-vs-build.

## Appendix B — Regenerate the missing-image split (offline, no network)

```bash
# From the repo root. Reads files only; writes nothing.
node -e '
const fs=require("fs"),path=require("path");
const d=path.join(process.cwd(),"content","plans");
let p1=[],p2=[];
for(const f of fs.readdirSync(d).filter(f=>f.endsWith(".json"))){
  const j=JSON.parse(fs.readFileSync(path.join(d,f),"utf8"));
  if((j.images||[]).length===0){
    if(j.published) p1.push(j.slug);
    else if((j.unresolvedImages||[]).length>0) p2.push(j.slug);
  }
}
console.log("P1 published no-image:",p1.length);
console.log("P2 unpublished recoverable:",p2.length);
'
```

## Appendix C — P1 list: 85 published plans with no image (top priority)

```
4x8-chicken-coop, adirondack-chair, barn-bird-house-and-feeder, better-bee-house,
built-in-bookcases, campaign-style-storage-box, camper-napkin-holder, catch-all-tray,
cedar-mailbox-with-corbels, cedar-planter-box, cedar-raised-garden-bed, charlie-nightstand,
cherry-serving-board-with-juice-groove, circle-cutting-jig, classic-picnic-table, corner-desk,
crosscut-sled, custom-laminated-canoe-paddle, cutting-board-storage-rack, dachshund-cd-holder,
demilune-dining-table, diy-buffet-table, diy-mod-clock, diy-router-table, diy-wooden-tool-box,
dovetailed-keepsake-box, edge-grain-maple-cutting-board, end-grain-walnut-maple-butcher-block,
entryway-storage-bench, farmhouse-dining-table, floating-walnut-shelves, floor-standing-headboard,
folding-guitar-stand, footed-charcuterie-board, garden-arbor-bench, garden-storage-shed,
homestead-bench, homestead-console-table, homestead-end-table, how-to-make-a-corner-clamp,
jacobs-ladder-toy, kids-toolbox, large-dog-house, large-three-sided-outdoor-bar, leopold-bench,
live-edge-coffee-table, low-rise-candle-holder, magnetic-knife-block, matts-media-tower,
modern-nesting-tables, modern-tall-dresser, multi-guitar-stand, nesting-cutting-boards-and-egg-holder,
nightstand-with-drawer, oak-coat-rack, ombre-cutting-board, one-board-magazine-rack,
open-shelf-console-table, outdoor-grill-cart, pine-bookcase, plant-stand-magazine-rack,
platform-bed-frame-queen, plywood-jewelry-box, plywood-picture-frame, portable-tool-rack,
pvc-window-box, rolling-lumber-cart, rolling-shop-cart, router-table-fence, salt-pepper-shakers,
shaker-step-stool, simple-bat-house, small-square-farmhouse-table, spice-drawer-organizer,
stacking-sawhorses, toy-sink-running-water, trellis-planter, turned-pepper-mill,
wall-mounted-clamp-rack, wall-mounted-drop-leaf-table, wall-mounted-tool-cabinet,
wooden-centerpiece-tray, wooden-gear-wall-clock, workbench-with-hutch, workbench-with-vise
```

## Appendix D — Image reachability script (run where network is available; NOT the Cowork cloud sandbox)

```js
// scripts/check-image-urls.mjs — reads content/plans, HEAD-checks every images[] URL.
// Run from repo root with a networked shell: `node scripts/check-image-urls.mjs`
// Exits non-zero if any image is broken. Writes nothing to the repo.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PLANS = join(process.cwd(), 'content', 'plans');
const targets = [];
for (const f of readdirSync(PLANS).filter((f) => f.endsWith('.json'))) {
  const p = JSON.parse(readFileSync(join(PLANS, f), 'utf8'));
  for (const img of p.images ?? []) {
    targets.push({ slug: p.slug, url: img.url, isPrimary: !!img.isPrimary });
  }
}

const CONCURRENCY = 12;
const broken = [];
let i = 0;
async function worker() {
  while (i < targets.length) {
    const t = targets[i++];
    try {
      let res = await fetch(t.url, { method: 'HEAD' });
      if (res.status === 405 || res.status === 501) {
        res = await fetch(t.url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
      }
      if (!res.ok && res.status !== 206) broken.push({ ...t, status: res.status });
    } catch (err) {
      broken.push({ ...t, status: `ERR ${err.code ?? err.message}` });
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

broken.sort((a, b) => a.slug.localeCompare(b.slug));
console.log(`Checked ${targets.length} image URLs. ${broken.length} broken.`);
for (const b of broken) console.log(`BROKEN ${b.status}\t${b.slug}\t${b.url}`);
process.exit(broken.length ? 1 : 0);
```
