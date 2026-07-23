# F1 — Runtime step-body formatter: before → after

**Sprint 46, Workstream F.** Runtime formatting only — **no `content/plans/*.json` was
edited.** The formatter (`src/lib/step-format.ts`, rendered by `StepProse` in
`src/components/prose.tsx`) turns a paragraph that *clearly sequences discrete actions*
into a bulleted action list and bolds *fastener sizes*. Everything else renders exactly as
today. Applied on `/plans/[slug]`, `/plans/[slug]/build`, and the print sheet from one
component, so the three never drift.

Example plan: **`happier-homemaker-farmhouse-table`** (published, real photo). A cut-heavy
step from **`extra-long-buffet-cabinet-drawers`** is included to show the strongest case.

## The three rules

1. **Action-sequence → bulleted list.** A paragraph becomes a list only when it has **≥3
   sentences** and **≥2** of them open with an action verb (`Cut`, `Attach`, `Glue`,
   `Then`, …). A reasoning sentence ("…because at this length a small error becomes a
   large one") is welded onto the action line above it, so the *why* stays with its step.
2. **Fastener sizes bold.** `1-1/4" pocket hole screws`, `2-1/2" screws`, `#8 x 2"` — the
   "what screw / what nail" a builder scans for. Bare **cut dimensions** (`88"`, `39-1/2"`)
   are left plain on purpose, or a cut-list step becomes a wall of bold.
3. **Fail soft.** Anything the heuristics aren't confident about renders as today's plain
   paragraphs, byte-for-byte. The formatter can add structure; it can never garble text.

Lists render as **bullets, not numbers**: a step already carries its own number, a single
step can hold more than one action paragraph (restarting "1." mid-step reads broken), and
bullets don't imply a rigid sub-order the prose doesn't actually claim. Easy to switch to
numbered if you'd rather — say the word.

---

## `happier-homemaker-farmhouse-table`

#### Step 1 — Cut the parts

**Before (today):**

Cut the longest 2x4 parts first, exactly as the material note says, or you will run out of usable board. From the six 8 ft 2x4s: two side aprons at 69", two end aprons at 30-1/4", four end stretchers at 24-1/4" and eight legs at 28-1/2". A 69" apron plus one 24-1/4" stretcher fills a board, and the legs pair up two or three to a board — all six boards get used.

From the 2x2, cut seven tabletop supports at 30-1/4", three to a board. The five 2x8 tabletop boards are 72" each, which is the full length of a 6 ft board, so use them as they come — pick your five straightest, flattest boards at the yard, because there is no length left to trim a bad end off.

**After (formatter):** *unchanged — the sentences lead with "From…" / "A…" / "The…", not
actions, so it stays prose (rule 3).*

Cut the longest 2x4 parts first, exactly as the material note says, or you will run out of usable board. From the six 8 ft 2x4s: two side aprons at 69", two end aprons at 30-1/4", four end stretchers at 24-1/4" and eight legs at 28-1/2". A 69" apron plus one 24-1/4" stretcher fills a board, and the legs pair up two or three to a board — all six boards get used.

From the 2x2, cut seven tabletop supports at 30-1/4", three to a board. The five 2x8 tabletop boards are 72" each, which is the full length of a 6 ft board, so use them as they come — pick your five straightest, flattest boards at the yard, because there is no length left to trim a bad end off.

#### Step 2 — Build the first leg sets

**Before (today):**

Each end of the table uses two of the eight 28-1/2" legs and two of the four 24-1/4" end stretchers — one stretcher up near the top where the apron will land, and one lower down as a foot rail. Join a stretcher between each pair of legs so the legs finish 24-1/4" apart on the inside.

Glue every joint. A brad nailer with 2" brads is easy here because the heads hide in the joint line, but 2-1/2" screws driven from what becomes the inside face hold better and never show. Mark both ends off the same layout — the plan does not fix the lower stretcher's height, so the only thing that matters is that the two ends agree with each other.

**After (formatter):** *para 1 (2 sentences) stays prose; para 2 becomes a list, with the
brad-nailer reasoning kept on the "Glue every joint" line and fastener sizes bolded.*

Each end of the table uses two of the eight 28-1/2" legs and two of the four 24-1/4" end stretchers — one stretcher up near the top where the apron will land, and one lower down as a foot rail. Join a stretcher between each pair of legs so the legs finish 24-1/4" apart on the inside.

- Glue every joint. A brad nailer with **2" brads** is easy here because the heads hide in the joint line, but **2-1/2" screws** driven from what becomes the inside face hold better and never show.
- Mark both ends off the same layout — the plan does not fix the lower stretcher's height, so the only thing that matters is that the two ends agree with each other.

#### Step 3 — Add the first legs

**Before (today):**

Fasten each stretcher pair to its legs for real now, driving 2-1/2" screws from the inside faces with glue at every joint. Predrill with the drill-bit-set near the board ends so a 2x4 does not split on you.

Then stack one end assembly on the other and confirm every leg and stretcher lines up. Two ends that differ by even a little put a twist through the whole table that no amount of adjustment at the apron stage will take out.

**After (formatter):** *para 1 → list (Fasten / Predrill); para 2 ("Then stack…" + a
reasoning sentence = one action) stays prose. Fastener size bolded.*

- Fasten each stretcher pair to its legs for real now, driving **2-1/2" screws** from the inside faces with glue at every joint.
- Predrill with the drill-bit-set near the board ends so a 2x4 does not split on you.

Then stack one end assembly on the other and confirm every leg and stretcher lines up. Two ends that differ by even a little put a twist through the whole table that no amount of adjustment at the apron stage will take out.

---

## `extra-long-buffet-cabinet-drawers` — the strongest case

#### Step 1 — Rip the sheets and cut the parts

**Before (today):** one 96-word paragraph.

Rip both 3/4" sheets into 15-3/4" strips on the table saw, then crosscut the carcass: the top and bottom at 88", two sides at 39-1/2", two dividers at 34" and four shelves at 26-1/2". Cut the face frame from its own stock — the 1x3 top rail at 89-1/2", four 1x3 stiles at 31-1/2", the 1x6 bottom rail at 89-1/2" and two 1x2 drawer trims at 33-1/2" — and cut five 1x4 top planks at 91". Leave the drawer boxes, the doors and both mouldings until the carcass and face frame are up and you can measure real openings; the cut list marks the drawer sides and door frames cut-to-fit for exactly that reason. Cut the two 88" panels as a pair and the two 39-1/2" sides as a pair — across nearly eight feet, a small length difference becomes a visible twist.

**After (formatter):** four scannable actions. Note the cut dimensions stay plain — no bold
soup.

- Rip both 3/4" sheets into 15-3/4" strips on the table saw, then crosscut the carcass: the top and bottom at 88", two sides at 39-1/2", two dividers at 34" and four shelves at 26-1/2".
- Cut the face frame from its own stock — the 1x3 top rail at 89-1/2", four 1x3 stiles at 31-1/2", the 1x6 bottom rail at 89-1/2" and two 1x2 drawer trims at 33-1/2" — and cut five 1x4 top planks at 91".
- Leave the drawer boxes, the doors and both mouldings until the carcass and face frame are up and you can measure real openings; the cut list marks the drawer sides and door frames cut-to-fit for exactly that reason.
- Cut the two 88" panels as a pair and the two 39-1/2" sides as a pair — across nearly eight feet, a small length difference becomes a visible twist.

---

## Verdict

This reads as a clear readability win on dense steps and is inert on the ones that already
read well, so per the brief I proceeded to F2 (shipped the formatter) in the same sprint.
Dials if you want them tuned: the sentence/action thresholds (rule 1), bullets vs. numbers,
and whether to bold `#`-gauge fasteners only vs. inch-sizes too. Say the word and I'll
adjust — no content edits involved either way.
