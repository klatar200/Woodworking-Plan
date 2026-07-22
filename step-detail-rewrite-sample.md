# Step-detail rewrite — calibration sample

Purpose: make "detailed enough to build by reading alone" concrete, so you can approve or adjust
the **depth** before a future agent applies it to the catalog. These are *proposed* rewrites for
review — no plan file has been changed.

Three tiers are shown: a **trivial** project (to prove the target is *sufficiency, not verbosity*),
a **simple** project (to show real enrichment), and a **complex** project that **already passes**
(to show goal 2 is conditional — most detailed plans are left alone).

A pattern worth noting up front, visible in both rewrites: **neither plan has a step that tells you
to cut the parts.** They jump straight to assembly. That is a systemic gap the audit will likely
find across many plans, and it is exactly the kind of thing that blocks "build by reading alone."

---

## Example 1 — `1x3-blanket-ladder` (trivial · difficulty 1) → light rewrite

**Cut list it must stay true to:** 2 rails @ 72", 5 rungs @ 16", all 3/4" × 2 1/2" from 1x3
furring strips (three 8 ft strips supplied).

**BEFORE (3 steps, verbatim):**
1. *Mark the rung positions* — "Lay the two rails flat and mark evenly spaced rung positions on both together."
2. *Attach the rungs* — "Screw or nail each rung between the two rails at the marked positions."
3. *Finish* — "Sand and apply primer and paint, or stain and poly."

**AFTER (4 steps — proposed):**
```json
"steps": [
  { "title": "Cut the rails and rungs",
    "body": "Cut two rails 72\" long and five rungs 16\" long from the 1x3 furring strips, squaring each cut. A furring strip's actual size is 3/4\" x 2 1/2\", so all seven pieces share that cross-section and only the lengths differ. Each 72\" rail uses its own 8 ft strip (leaving a 24\" offcut); cut all five 16\" rungs from the third strip.",
    "tools": ["circular-saw", "tape-measure"], "materials": ["1x3 furring strips, 8 ft"] },
  { "title": "Lay out the rung positions",
    "body": "Set the two rails side by side with their ends aligned and mark all five rung positions across both rails at the same time — marking them together is what keeps every rung square and stops the finished ladder from racking. Space the five rungs evenly along the 72\" rails, roughly every 14–15\", working from the same end of each rail so the marks line up.",
    "tools": ["tape-measure"], "materials": [] },
  { "title": "Fasten the rungs",
    "body": "Stand each rung between the rails at its marks and drive two screws through the outside face of each rail into the rung's end. Drill a pilot hole first — 1x3 is narrow and splits easily near the end — or, if nailing, add glue and two 1 1/4\" brad nails per joint. Keep the rails parallel as you work so the ladder sits flat against a wall.",
    "tools": ["drill-driver"], "materials": ["1x3 furring strips, 8 ft", "Self-tapping star bit screws, 1-1/2\", or brad nails, 1-1/4\", and glue"] },
  { "title": "Sand and finish",
    "body": "Sand all faces and ease the sharp edges and corners, especially where hands and blankets touch. Prime and paint, or stain and seal with poly. Lean the finished ladder against a wall at a comfortable angle, with the base set out far enough that it won't slip.",
    "tools": [], "materials": ["Primer and paint, or stain and poly"] }
]
```

**What changed & why:** added the missing cut step (grounded in the cut list, with a correct
material-yield note); added the *technique* that makes it come out right (mark both rails together,
pilot holes to stop splitting); added the *check* (rails parallel). Still four short steps — a
trivial project does not get padded.

**Flag raised for the audit record (not written into the file):** exact rung spacing is not
specified in the source. The "every 14–15\"" is *derived* from the 72" rail and 5 rungs and offered
as guidance — confirm the intended spacing, or accept it as builder's choice.

---

## Example 2 — `adirondack-footstool` (simple · difficulty 2) → substantive rewrite

**Cut list it must stay true to:** 2 stringers @ 23 1/2" (both ends 30°), 5 slats @ 22 1/2",
2 legs @ 13 3/4" (one end 30°).

**BEFORE (3 steps, abbreviated):** "Cut the two stringers … at 30° … parallel." / "Lay the five
1x4 slats … even gaps … attach with screws." / "Attach the two angled legs to the underside, then
flip."

**AFTER (4 steps — proposed):**
```json
"steps": [
  { "title": "Cut the parts",
    "body": "From the 2x4, cut two stringers 23 1/2\" long with both ends mitered at 30° off square and parallel to each other — set the miter saw once and cut both so they are identical, because this angle is what tilts the finished top to meet your legs. Cut two legs 13 3/4\" long (longest-point measurement), each with one end at 30°. From the 1x4, cut five top slats 22 1/2\" long. Hold the two stringers together and confirm the angles match before going on; if they don't, the top will twist.",
    "tools": ["miter-saw", "tape-measure", "speed-square", "pencil"], "materials": ["2x4, 8 ft", "1x4, 12 ft"] },
  { "title": "Attach the slats to the stringers",
    "body": "Stand the two stringers on edge and parallel, both 30° slopes facing the same way (this becomes the seat's tilt), about 15\" apart so the 22 1/2\" slats overhang each stringer by roughly 3 3/4\". Lay the five slats across them with a small even gap (about 1/4\") between each for rain drainage, ends flush with the outside faces of the stringers. Fasten each slat to each stringer with two 2\" exterior deck screws, pre-drilling near the slat ends so the cedar doesn't split.",
    "tools": ["drill-driver", "tape-measure"], "materials": ["1x4, 12 ft", "Exterior deck screws, 2\" and 2-1/2\""] },
  { "title": "Attach the legs",
    "body": "Flip the assembly slats-down. Attach a leg to the underside near each end with two or three 2 1/2\" exterior screws, orienting each leg so its 30° cut sits flat on the ground and the stool stands level despite the sloped top. Turn it right-side up.",
    "tools": ["drill-driver"], "materials": ["2x4, 8 ft", "Exterior deck screws, 2\" and 2-1/2\""] },
  { "title": "Ease edges and finish",
    "body": "Sand the slat tops and ease every edge and corner so bare legs and feet won't catch a splinter. Cedar can be left to grey outdoors or sealed with an exterior finish; use exterior screws either way. Set it in front of your Adirondack chair and check that the top's slope meets your outstretched legs — that match is the whole point of the 30° cuts.",
    "tools": [], "materials": [] }
]
```

**What changed & why:** added the cut step; converted the cut-list decimals to tape-measure
fractions (23 1/2", 13 3/4", 22 1/2"); added stringer spacing and slat gap; added pre-drilling and
screw-length choice (2" into the thin slats, 2 1/2" into the legs); added the final fit check.

**Flags raised for the audit record:**
- **Leg placement/orientation is under-specified in the source** — the data gives the leg length
  and its 30° cut but not exactly where each leg sits or how the angle registers to keep the stool
  level. The rewrite goes as far as the data allows and stops; a builder may still need the photo.
  This is a genuine gap to resolve (author clarification or a diagram), **not** something to invent.
- **Finish is mentioned but not in `materials[]`** — the description and this step reference sealing,
  yet no finish/sealer line exists in the plan's materials. Candidate to add (which also puts it on
  the shopping list) or to drop from the prose.
- Stringer spacing (~15") and slat gap (~1/4") are derived suggestions, not authored values.

---

## Example 3 — `18-inch-kitchen-base-cabinet` (complex · difficulty 4) → **PASS, no rewrite**

This plan already meets the bar. A representative existing step:

> *Build and attach the face frame* — "Build the face frame flat on a smooth table with clamps,
> square, joining with 3/4\" pocket holes, 1-1/4\" screws, and glue. Mark the sides at 1/4\" for the
> side overhang and attach the frame to the cabinet face through predrilled pocket holes."

It names the tool, the technique, the fastener, the measurement, and the reason. **Buildability
score 5 → not rewritten.** Goal 2 is conditional: the pass rewrites only the plans that fall short,
so a catalog-wide pass touches far fewer than 1,115 files.

---

## Depth target — the takeaways to approve or adjust

- **Sufficiency, not maximum.** Trivial projects stay short (4 tight steps); the target is that a
  stranger could build it, not that every step is exhaustive.
- **Every added number is grounded** in the plan's own cut list/materials, in tape-measure
  fractions. Where a needed number isn't in the source, the rewrite **flags it** rather than
  inventing — the flags above are the model for that.
- **A missing cut step** appears to be systemic and is the highest-value single addition.
- Rewrites stay **schema-valid**: only `title`/`body`/`tools`/`materials`, and every tag is a
  subset of the plan's own tools/materials.

If this depth looks right, the future agent applies exactly this standard. If you want it deeper
(e.g. always state a specific spacing, add safety notes on every power-tool step) or lighter, say
so and the brief's rubric is adjusted to match.
