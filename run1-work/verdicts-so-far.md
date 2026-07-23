# Verification verdicts captured before the session limit hit

## Batch 4 — only ONE chunk (w10) completed before all agents died

All four REJECT. These four plans need a **targeted re-fix** (not re-verification) — the
defect is named, so hand the rewriter the finding and have it fix that specific thing.
They are all in **b4g4.json**.

- **kitchen-island-open-shelving: REJECT**
  - step 11 "attach the corbels ... with 2\" screws" — plan's only fasteners are
    "Pocket hole screws, 1-1/4\"" and "Brad nails, 1-1/4\"". No 2" screw exists. (unsourced fastener)
  - "Double trash pull-out, max 15 in width" (the $80 hardware line) is installed by NO step.
  - "Drawer face, trash pull-out" is 3/4"x6" from "1x6, 8 ft" — a 1x6 is 5-1/2" actual, can't yield 6".
  - (The two-sheet plywood shortfall argument and the 12-1/2"+1-1/2"=14" drawer both check out.)

- **layered-wood-christmas-tree-trio: REJECT**
  - step 2 self-contradiction: "shorter one sitting 1\" lower at the bottom" while both 40°
    ends meet at a common apex — two lengths from one apex differing by 1" cannot have coplanar
    bottoms. Whichever reading is intended, one sentence is false, and step 3 propagates it.
  - step 1's blanket "every cut is a 40 or 25 degree miter" contradicts the three square-cut
    trunk pieces (2-3/4", 4-3/4", 6-3/4").
  - (The medium-tree shortfall 49-1/2" vs 48" IS real and correctly stated.)

- **round-outdoor-adirondack-side-table: REJECT**
  - step 2 + step 4 "1-1/4\" screws" — plan's only fastener is "1-1/2\" to 2\" self-tapping
    exterior screws". No 1-1/4" source.
  - step 3 "attach with 2\" screws" through leg support 3/4" + top 3/4" = 1-1/2" of stock —
    a 2" screw protrudes 1/2" through the sat-on top face.
  - (The circle chord geometry and the 2/2 + 3/3 lumber all check out.)

- **rustic-bathroom-vanity-three-drawer: REJECT**
  - step 4: face frame is 31-3/4" tall, four rails between the legs = 8" of rail, so 23-3/4"
    of opening. Three boxes total 3-1/2 + 5-1/2 + 5-1/2 = 14-1/2". That leaves 9-1/4" of
    opening unfilled and NO drawer front/face part exists in the cut list. Openings are 64%
    oversized however the two middle rails land.
  - (Everything else — 33-1/2" carcass, 25-1/4" bottoms matching BOX GEOMETRY, lumber — checks out.)

## The 34 stale-batch plans (b3a/b3r) — all verified in the PREVIOUS round

Those verifier findings are NOT lost — they were folded into `stale-hints.md`, and the 34
plans were re-rewritten as **s1.json / s2.json / s3.json / s4.json** (which now carry those
findings as leads). So s1-s4 are FRESH patches that still need their own verification pass.

Two of the b3 verdicts were CONFIRM and matter as "keep it light" signals:
- `triple-bunk-staggered-beds` (in s2) — verified clean, only a duplicate cut enumeration.
- `simple-built-in-daybed-frame` (in s3) — verified clean.
- `board-and-batten-bunk-top` (in s3) — verified CORRECT; its 2x2 "shortfall" is an FFD artifact.
