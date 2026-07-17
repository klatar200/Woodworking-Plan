# Plan Authoring Brief

**Read this entire document before writing anything.** This is the standalone
kickoff prompt for turning entries in root-level `plans.json` (1,241 raw
scraped woodworking plans) into real, thorough, schema-valid plan files at
`content/plans/*.json` for the Woodworking-Plan website. It is written to be
self-contained — assume you have no memory of any prior conversation about
this project, but you DO have file read/write access to this repository.

This project spans far more plans than one working session can responsibly
author. **You are expected to work in batches across many separate sessions.**
Re-read this brief and `PLAN_AUTHORING_LOG.md` at the start of every one.

---

## 1. Mission

For each viable entry in `plans.json`, produce one real, fully-authored JSON
file at `content/plans/<slug>.json` that satisfies the strict schema in
`src/content/plan-schema.ts` — not a mechanical field-copy, but genuinely
authored content: a real summary and description, a defensible cost estimate,
a real time estimate, correctly structured materials and cut list, and steps
that actually teach the build. Where the source data has gaps or a step's
explanation is thin, use general woodworking knowledge and the surrounding
context (the plan's own steps, materials, and tools) to fill it in
thoughtfully — the same way an experienced woodworker reading a stranger's
build log would reconstruct what's missing.

You are not summarizing. You are writing the plan as if you built it
yourself and are now teaching someone else to build it.

---

## 2. Hard boundaries — do not cross these

1. **Every file you write has `"published": false`.** Always. Flipping a
   plan to published, running a seed, or touching production is Keagan's
   call, not this task's. This matches the existing gate on the other
   scraped-content batch (see `AUDIT_2026-07-16.md` / `DECISIONS_LOG.md`
   2026-07-16 in this repo if present) — do not relitigate or "helpfully"
   flip it.
2. **Write only to `content/plans/`.** Do not touch `content/plans-import/`,
   `content/tools.json`, `content/categories.json`, `src/content/plan-schema.ts`,
   or any application code. If you believe one of those genuinely needs to
   change (e.g., a plan needs a tool or category that doesn't exist yet),
   **stop and ask** — see §8. Do not add one yourself.
3. **Never invent a category or a tool slug.** Categories are exactly the six
   in `content/categories.json`. Tools must come from `content/tools.json`
   (47 entries as of this writing — see §5.3 for the free-text → slug map
   for the 21 tool names that actually appear in `plans.json`). If a plan
   genuinely needs something outside both lists, stop and ask.
4. **Never fabricate a precise-looking fact you can't support.** A confident,
   wrong number is worse than an honest range. Cost and time are always
   estimates — that's what the `$`–`$$$$$` tier and the `timeLabel` string
   are *for* — but they must be genuinely reasoned estimates (see §6.6–6.7),
   not placeholders and not wild guesses either.
5. **No git.** Don't run `git` commands against this repo (the sandbox mount
   corrupts `.git` — this is a standing rule in this project, not new for
   this task).
6. **No `npm install` / build / seed / migration commands.** This task only
   ever reads `plans.json` + the existing `content/` files and writes plan
   JSON files. The one command you run repeatedly is the validator in §9.
7. **Stay in scope.** Don't add features, don't "fix" unrelated files you
   notice along the way, don't restructure the schema. If you spot something
   that seems wrong outside this task, mention it in the batch summary you
   give Keagan — don't act on it.

---

## 3. Required reading, in this order, before authoring your first plan

1. `src/content/plan-schema.ts` — the actual Zod contract. Section 6 below
   summarizes it, but the source file is the ground truth if the two ever
   disagree.
2. Two or three existing files in `content/plans/` for tone and structure —
   `adirondack-chair.json` is a particularly good example of the voice
   you're matching (see §7).
3. `content/categories.json` and `content/tools.json` — the closed
   vocabularies you must use.
4. `PLAN_AUTHORING_LOG.md` (same directory as this file) — tells you what's
   already done, what's in progress, and any open questions from a previous
   session that Keagan has since answered.
5. This document, in full.

---

## 4. The source: `plans.json`

Root-level file, a JSON array of 1,241 objects, each shaped like:

```json
{
  "url": "https://www.ana-white.com/woodworking-projects/...",
  "title": "Simple Build Bed Frame in All Mattress Sizes",
  "description": "Pin For Later!",
  "dimensions": "",
  "shopping_list": ["2 - 2x4 @ 8 feet long", "..."],
  "cut_list": ["2 - 2x4 @ 37\" - headboard legs", "..."],
  "tools": ["Tape Measure", "Drill", "..."],
  "steps": [{ "step": "Step 1", "body": "..." }, "..."],
  "image": "https://.../image.png"
}
```

### 4.1 Known data-quality issues — handle every one of these

- **`description` is not usable content in ~90% of rows.** It's empty or a
  junk placeholder ("Pin For Later!", "Pin for Later!!", etc.) in the large
  majority of entries. Never copy it into your output. Always write the
  `summary`/`description` fields from scratch, from the steps/materials/title.
- **`dimensions` is empty in every single row.** Ignore this field entirely;
  it carries no information.
- **`shopping_list` and `cut_list` are messy free text**, not clean data:
  section headers mixed in as list items ("TWIN SHOPPING LIST (75\" x 39\")"),
  notes and tips mixed in ("TIP: Prefinish all 2x4 and 2x6 boards..."),
  inconsistent unicode (curly quotes, `×` for `x`, non-breaking spaces, `–`
  vs `-`), and multiple sub-lists for size variants (twin/full/queen) in a
  single array. Read the whole array before extracting materials/cut-list
  items — don't process it line-by-line blind. Use judgment to separate real
  material/cut lines from notes and headers.
- **~236 of the 1,241 entries have an empty `steps`, `tools`, or
  `shopping_list` array.** Use judgment, not a hard rule:
  - If `steps` is empty or clearly not a real build sequence — **skip this
    plan.** There's no instructional content to author from. Log it (§10).
  - If `steps` has real content but `tools` is empty, infer a reasonable
    tool list from what the steps and materials actually require.
  - If `steps` has real content but `shopping_list` is empty, infer the
    materials list from the cut list and step text.
  - If the title/content is obviously not a real woodworking plan (an ad,
    a "PDF bundle" upsell page, spam) — skip it and log it.
- **Some `image` URLs may be dead or the wrong image** (scraped data, not
  verified). Use it as given for `images[0].url`; you cannot verify it loads
  from here, so don't spend time trying.

---

## 5. Reference data you must reuse (don't reinvent per-plan)

### 5.1 Categories (`content/categories.json` — closed set, do not add to it)

| slug | when to use it |
|---|---|
| `cutting-boards` | Cutting boards, charcuterie/serving boards |
| `furniture` | Tables, benches, chairs, beds, desks, casework for indoors |
| `storage` | Shelves, cabinets, boxes, organizers, racks |
| `outdoor` | Weather-exposed builds: planters, garden benches, sheds, fences |
| `shop-projects` | Jigs, workbenches, sleds, shop fixtures |
| `gifts-and-small-projects` | Small weekend builds, low cost/commitment |

### 5.2 Cost tiers (`src/content/plan-schema.ts` — `COST_TIER_BOUNDS`)

Bounds are on the plan's **maximum** estimated cost, in cents. `costMaxCents`
must be `<=` the bound for the tier you pick, or the file fails validation.

| tier | dollar range | `costMaxCents` must be ≤ |
|---|---|---|
| `TIER_1` | up to $50 | 5,000 |
| `TIER_2` | $50–$150 | 15,000 |
| `TIER_3` | $150–$350 | 35,000 |
| `TIER_4` | $350–$750 | 75,000 |
| `TIER_5` | $750+ | (no upper bound) |

### 5.3 Tool name → slug map (the 21 free-text names that appear in `plans.json`)

Use this exact mapping for consistency across the whole catalog — don't
re-derive slugs ad hoc per plan.

| source text (case-insensitive) | slug |
|---|---|
| Tape Measure | `tape-measure` |
| Safety Glasses | `safety-glasses` |
| Pencil | `pencil` |
| Speed Square | `speed-square` |
| Drill | `drill-driver` |
| Power Sander | `random-orbit-sander` |
| Hearing Protection | `hearing-protection` |
| Circular Saw | `circular-saw` |
| Brad Nailer | `brad-nailer` |
| Kreg Jig | `pocket-hole-jig` |
| Miter Saw | `miter-saw` |
| Drill Bit Set | `drill-bit-set` |
| jigsaw | `jigsaw` |
| Level | `level` |
| Hammer | `hammer` |
| Table Saw | `table-saw` |
| Staple Gun | `staple-gun` |
| Iron for Edge Banding | `edge-banding-iron` |
| Hole Saw Kit | `hole-saw` |
| Scroll Saw | `scroll-saw` |
| Router | `router` |

All 21 already exist in `content/tools.json` (10 of them — safety-glasses,
pencil, speed-square, hearing-protection, drill-bit-set, level, hammer,
edge-banding-iron, hole-saw, scroll-saw — were added there specifically for
this import). If a plan's steps clearly require a tool NOT in this list and
not already in `content/tools.json` (e.g., a plan that's really a lathe
project), **stop and ask** rather than inventing a slug.

### 5.4 Nominal lumber → actual dimensions (inches), for `cutList`

`cutList` entries need real decimal-inch `thicknessIn`/`widthIn`/`lengthIn` —
never nominal size strings, never fractions-as-strings.

| nominal | actual (thickness × width, inches) |
|---|---|
| 1x2 | 0.75 × 1.5 |
| 1x3 | 0.75 × 2.5 |
| 1x4 | 0.75 × 3.5 |
| 1x6 | 0.75 × 5.5 |
| 1x8 | 0.75 × 7.25 |
| 1x10 | 0.75 × 9.25 |
| 1x12 | 0.75 × 11.25 |
| 2x2 | 1.5 × 1.5 |
| 2x4 | 1.5 × 3.5 |
| 2x6 | 1.5 × 5.5 |
| 2x8 | 1.5 × 7.25 |
| 2x10 | 1.5 × 9.25 |
| 2x12 | 1.5 × 11.25 |
| 4x4 | 3.5 × 3.5 |
| 6x6 | 5.5 × 5.5 |

For non-standard stock (plywood sheets, cedar fence pickets, etc.), use your
own knowledge of standard sizes (e.g., a fence picket is nominally 5.5" wide,
3/4" thick) and say so in the item's `note`.

---

## 6. Output contract — one file per plan at `content/plans/<slug>.json`

Every field below is enforced by `planSchema` in `src/content/plan-schema.ts`
(`.strict()` — no extra keys, ever). This section is guidance on top of that
contract, not a replacement for reading it.

**6.1 `slug`** — kebab-case, lowercase, `[a-z0-9]` and hyphens only. Derive
from the title. **Check `content/plans/` for a collision before you write the
file** — list the directory, and if your slug already exists (from the
original 85, or from a plan you or a prior session already authored this
batch), append `-2`, `-3`, etc.

**6.2 `title`** — clean up the source title (fix capitalization/typos), but
don't invent a different project.

**6.3 `summary`** — one to two sentences, ≤200 characters, that tell someone
scanning a catalog card what makes this build worth their time or what's
tricky about it. Not a restatement of the title.

**6.4 `description`** — real prose, one or more paragraphs. Explain the
design decisions, what's easy to get wrong, and any material/technique
choices, the way `adirondack-chair.json`'s description does. This is where
you do the most inference: the source steps tell you *what* to do; your job
here is to explain *why*, using real woodworking knowledge.

**6.5 `category`** — one of the six in §5.1. Pick the best fit; if genuinely
ambiguous, prefer the more specific category over `furniture` (e.g., a patio
table is `outdoor`, not `furniture`).

**6.6 `difficulty`** (integer 1–5) — calibrate against build complexity, not
just step count:
- **1** — straight cuts only, simple assembly, forgiving joinery (basic
  shelf, simple box).
- **2** — basic joinery (pocket holes, butt joints with screws), no angles.
- **3** — compound angles, curves, or a template/jig step (e.g., the
  Adirondack chair — two compound angles define the whole geometry).
- **4** — real joinery (mortise/tenon, dovetails, dados) or a large
  multi-stage build (a bed, a cabinet with doors and drawers).
- **5** — advanced technique or tight tolerances stacked together (curved
  lamination, complex casework, integrated hardware/mechanisms).

**6.7 `timeMinMinutes` / `timeMaxMinutes` / `timeLabel`** — a real estimate
based on step count and complexity, in the style of the existing catalog
(e.g., `"7–10 hrs for the first one, 3 for the second"`). `timeLabel` is the
human-readable string; `timeMinMinutes`/`timeMaxMinutes` are that same range
in minutes.

**6.8 `costTier` / `costMinCents` / `costMaxCents`** — a genuine ballpark
using current (2026) US lumber/hardware pricing knowledge, summed from the
`materials` you author (see §6.11). Pick the tier from §5.2 whose bound
`costMaxCents` fits under. **Never leave these at a sentinel like $0** — that
was acceptable for a purely mechanical pass; it is not acceptable here. If a
plan is genuinely impossible to estimate (wildly incomplete materials list
even after your best inference), stop and ask rather than guessing wildly.

**6.9 `tags`** — an array of relevant lowercase keywords: material species,
project type, techniques used, room/use-case. Look at how the existing 85
plans use tags (e.g., `adirondack-chair.json`: `["adirondack", "chair",
"cedar", "outdoor", "patio", "curves", "jigsaw", "template"]`) and match that
density and style — not just a token dump of the title.

**6.10 `tools`** — array of `{ slug, essential, note? }`. `slug` must be from
§5.3's map or already in `content/tools.json`. Mark `essential: true` for
anything the build genuinely can't happen without; `false` for nice-to-haves
or alternates (e.g., a band saw as an alternative to a jigsaw). At least one
tool must be essential. Add a `note` when it clarifies why the tool matters
for *this* build (see the Adirondack chair's jigsaw note as the model).

**6.11 `materials`** — array of `{ name, unit, quantity, species?, costCents?,
note? }`. Two rules from this project's existing content policy, unchanged
for new content:
  - **Keep names generic** (`"Wood glue"`, not a brand). Be specific only
    where the spec changes what someone must buy — fastener sizes, and
    "waterproof" vs. plain glue/finish for outdoor builds. Brand/finish
    choice belongs in `note`, not `name`.
  - **`costCents` should be a real per-line ballpark** (current US pricing),
    because it's what you sum to justify `costTier`/`costMinCents`/
    `costMaxCents` above — don't pick the tier first and back into numbers.

**6.12 `cutList`** — array of `{ part, quantity, thicknessIn, widthIn,
lengthIn, material?, note? }`. Use §5.4 for nominal-to-actual conversion.
This array **may be legitimately empty** if the source truly gives you
nothing to work with (the existing catalog already has plans that ship an
empty cut list) — don't invent dimensions you can't support. Prefer
including what you can confidently derive over leaving it empty, but never
guess a number that isn't defensible.

**6.13 `steps`** — array of `{ title, body, tools?, materials? }`. This is
where the source's real content lives — the numbered `step`/`body` pairs in
`plans.json` are actual build-log text, not filler. Your job:
  - Write a real, short **title** per step (not "Step 1" — describe what
    happens, e.g. "Cut the two rear legs").
  - Rewrite **body** to be clear and complete — keep the real technical
    content from the source, fix anything confusing, and add the
    craft-knowledge context that makes a thin instruction actually buildable
    (why an order matters, a common mistake, a check to make before moving
    on). Multi-paragraph is fine; match the register of the existing plans
    (direct, opinionated where it helps, no fluff).
  - `tools`/`materials` on a step are **optional** — a slug/name array that
    must be a **subset** of the plan's own `tools`/`materials`. Tag them if
    it's easy and obviously correct; don't force it or spend excessive time
    on it. This is a nice-to-have for this pass, not a requirement (it's
    optional in the schema for exactly this reason).

**6.14 `images`** — `[{ url, alt, isPrimary }]` from the source `image`
field if non-empty, else `[]`. `alt` should describe the finished project,
not just repeat the title verbatim. At most one `isPrimary: true`.

**6.15 `published`** — always `false`. See §2.

---

## 7. Voice — match the existing catalog

Read `content/plans/adirondack-chair.json` in full before you start. Notice:

- It has an opinion ("Everyone thinks the Adirondack chair is about the
  curved back. It isn't.").
- It explains *why*, not just *what* ("plain steel will bleed rust streaks
  down a cedar chair in one wet season").
- Step bodies give a reason, not just an instruction ("The gaps aren't a
  style choice — water has to get out, or the chair rots from the seat
  down.").

Every plan you write should read like it came from the same person who wrote
that one.

---

## 8. When to stop and ask (don't guess through these)

Stop, write up the specific question(s), and wait for Keagan. Don't burn a
whole batch guessing past a real ambiguity:

- The source steps/materials/cut-list genuinely contradict each other (e.g.,
  a cut length that can't be right given the stated stock) and you can't
  resolve it with reasonable inference.
- A plan needs a tool or category outside the closed vocabularies in §3/§5.
- A plan looks like a near-duplicate of one you've already authored (same
  design, different source page) — don't silently author it twice or
  silently skip it; ask whether to include both, merge, or skip.
- You're genuinely unsure whether an entry is a real woodworking plan at all.
- Anything that feels like it needs a business/editorial call rather than an
  engineering/craft one (e.g., you think a whole sub-category of plans should
  be excluded for quality reasons).

---

## 9. Validation — non-negotiable, every batch

Run this after writing any files, before you consider a batch done:

```
node scripts/validate-plans.mjs content/plans
```

This is a zero-dependency script that mirrors every constraint in
`planSchema` (categories, tool slugs, cost-tier bounds, essential-tool
requirement, step tools/materials subset rule, strict-key checking, etc.). It
must report **zero problems** on the whole directory — not just the files you
touched this batch — before you write your batch summary. Fix anything it
flags before moving on. If it reports something you don't understand, stop
and ask rather than working around it.

---

## 10. Progress tracking — `PLAN_AUTHORING_LOG.md`

This file (same directory) is the shared memory across sessions. At the
start of a session: read it to see what's done and what's open. At the end
of a session (or when you stop for any reason, including hitting a natural
context limit): update it with:

- The `plans.json` array indices / titles you completed this session, and
  the resulting slugs.
- Any indices you skipped, and why (one line each — "no usable steps",
  "duplicate of X", "spam/PDF upsell page").
- Any open questions for Keagan you're waiting on.
- The next index to start from, so a fresh session doesn't have to
  re-derive where things stand by re-scanning `content/plans/`.

Write plan files to disk as you finish each one — don't batch up writes and
risk losing finished work if a session ends unexpectedly.

---

## 11. Batch size

Author **8–12 plans per working chunk**, then run the validator (§9) and
update the log (§10) before starting the next chunk. This depth of authoring
per plan is real work — don't stretch a chunk wider just to hit a round
number. Smaller, validated, logged batches beat a long run that goes off the
rails unnoticed.

**Standing authorization to run batches back-to-back (Keagan, 2026-07-17):**
Once started, keep running batch after batch — validate, log, immediately
start the next chunk — WITHOUT stopping to check in after every batch. Only
stop and message Keagan when one of these actually happens:

- A batch (or the whole directory) fails the validator and you can't resolve
  it yourself.
- You hit a real §8 stop-and-ask case (genuine contradiction, missing
  category/tool vocabulary, suspected duplicate, not-a-real-plan judgment
  call, or an editorial/business call).
- You judge that continuing in the current session would start compromising
  authoring quality — context filling up, needing to re-read files you
  already read, losing track of earlier decisions. When that happens, finish
  and log the batch you're on, then tell Keagan plainly that a fresh session
  should pick up from the logged next index, and why.

This replaces the old "stop after every batch" default. It does NOT relax
any other rule in this brief — §8 stop-and-ask cases, the validator gate, and
full logging after every batch all still apply exactly as written. A future
session reading this brief should run this way from the start, not just
revert to pausing after batch one.

---

## 12. Definition of done, per batch

- Every file written this batch passes `node scripts/validate-plans.mjs
  content/plans` with zero problems, and the whole directory still passes
  (not just the new files).
- No `content/plans-import/`, `content/tools.json`, `content/categories.json`,
  or any `src/` file was modified.
- Every new file has `"published": false`.
- `PLAN_AUTHORING_LOG.md` is updated per §10.
- Any open questions are written out clearly, not buried in a huge wall of
  text — Keagan should be able to read your batch summary in under a minute.
