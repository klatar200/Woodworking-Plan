<!-- board-pattern-techniques.md — REFERENCE, not a build contract. Audience: a build agent scoping
     designer pattern work from a cold start. Authoritative build contract is
     docs/superpowers/plans/cutting-board-designer-build-plan.md §2–§3; this file explains WHY that
     contract has the shape it does and what a physically buildable pattern model must contain.
     Source: T. Kolokolnikov, "Mathematics on the chopping block" (12 pp). Conclusions are restated
     in our own terms and notation; no figures are reproduced here (copyright). Written 2026-07-26. -->

# Buildable cutting-board patterns — the geometry behind the designer

Everything below is constrained by one fact: **a cutting board is made with two glue-ups.** Glue strips
side by side into a panel; cross-cut the panel into slices; turn the slices end-grain up; re-glue.
Every operation the designer offers has to be expressible in that process, or the cut list it prints
is a lie. That is the filter this document applies.

---

## 1. The operation set is FLIP and SWAP — never rotate

After the first glue-up you have a panel of strips. Cross-cutting yields slices that are **all
identical**. The only things you can then do to a slice before the second glue-up are:

| Operation | Physical action | Effect on the row |
|---|---|---|
| identity | lay it down as cut | strip order unchanged |
| flip | turn the slice end-for-end / face-over | **strip order reversed** |
| swap | lay slices down in a different sequence | reorders rows |

That is the complete generator set. Kolokolnikov formalises it as a group on an n × m tile array —
flip any row or column, swap any two rows, swap any two columns — and proves (Thm 3.1) that with
enough cuts **any** arrangement of the same tile multiset is reachable. So the model is not
restrictive in the limit; it is restrictive per glue-up, which is what matters.

### 1.1 Rotate is not a buildable operation — this is the trap

Cyclically rotating a row's strip order (`[A,B,C,D] → [B,C,D,A]`) looks like a natural generalisation
of "flip every other slice", and it is **wrong**. Moving `A` from the front to the back means sawing
it off the slice and re-gluing it — an extra cut and an extra glue-up *per row*. No woodworker does
this; it is not what any of the reference boards are.

`layoutTopFace` in `src/lib/board-designer/layout.ts` currently implements `flipEveryOtherSlice` as
`rotateByOne(expanded)`. **For the shipped templates this is correct by coincidence**: rotate-by-one
and reverse agree on any sequence that alternates two species with an even count and equal widths,
which describes every template we ship. They diverge the moment widths are unequal or the count is
odd. Reverse is the correct operation; rotate is not.

Concretely, `[W 2″, M ¼″, W 2″]`:
- reversed → `[W 2″, M ¼″, W 2″]` (palindrome, no visible change) — correct, and buildable.
- rotated by one → `[M ¼″, W 2″, W 2″]` — requires cutting the slice apart.

**Anything specifying a rotation of strip order is a defect.** The four physically real row
transforms of a slice are:

```
none     identity
rot180   180° in-plane turn      → strip order reversed, each cell rotated 180°
mirrorX  flipped over vertically → strip order reversed, each cell mirrored left↔right
mirrorY  flipped over horizontally → strip order kept,  each cell mirrored top↔bottom
```

For solid (single-species) strips, `rot180` and `mirrorX` are indistinguishable, and `none` and
`mirrorY` are indistinguishable — which is why a solid-strip model only ever needs one boolean. They
become distinct the moment a strip's face is not a solid colour, i.e. §3 below.

### 1.2 A shifted pattern needs a second panel, not a rotation

A brick/offset course, or a diagonal, is produced by gluing up **another panel** whose strip order is
already shifted, and drawing rows from both panels. That is one extra glue-up per distinct offset,
which is exactly the real cost, and it is why a multi-panel model is the right abstraction:

> **panel = one glue-up.** Rows choose a panel and a transform. Nothing else is buildable.

---

## 2. Row height is panel thickness — the plaid unlock

On the finished top face of an end-grain board:

```
column width   = strip width
row height     = the PANEL's thickness        ← each slice is turned 90°, so its
                                                panel thickness becomes height on the face
board thickness = slice thickness
```

The consequence is the whole reason single-panel designs cannot produce plaid: **a thin accent line
running across the rows is a thin panel** — one full-width strip planed to ⅛″–¼″ — not a thin slice.
Thin lines *along* the rows are thin strips; thin lines *across* them are thin panels. A model with
one global `stockThicknessIn` can only ever produce lines in one direction.

Per-panel thickness is therefore not a nicety; it is the single field that separates "stripes and
checkerboards" from the whole grid-pattern family.

### 2.1 Derived panel lengths

Once rows choose panels, each panel only has to be long enough to yield the slices drawn from it:

```
rows_p              = number of rows drawn from panel p
requiredLengthIn(p) = rows_p × sliceThicknessIn + max(0, rows_p − 1) × kerfIn
finishedWidthIn     = Σ over rows of panel(row).thicknessIn
finishedLengthIn    = panel width (all panels must match, or slices will not line up)
finishedThicknessIn = sliceThicknessIn
```

This inverts the original contract rule (B12: slice count derived from panel length). Deriving length
from rows is strictly better for the maker — the print sheet can now state *how long to glue each
panel up* — and it preserves B12's intent, which was that no entered number may misdescribe the
geometry.

Board feet must use each panel's own thickness and derived length, not a global pair.

---

## 3. Mitered strips — the technique that unlocks the "impossible" boards

This is §4 of the paper and it is the most valuable thing in it.

### 3.1 The construction

1. Take a strip of species A. **Rip it along its length with the blade tilted**, so the cut plane runs
   the length of the strip and appears in cross-section as a straight line at a chosen angle.
2. Glue a matching piece of species B onto the cut face.
3. The composite strip's **cross-section is now a rectangle split by a straight line into two
   species** — and every cross-cut of that strip yields an identical two-tone tile.
4. Glue a row of such strips (each oriented as you choose) into a panel. That row is the
   **generator**. Cross-cut, alternate rows with their mirror, re-glue.

Rubber bands substitute for clamps at the glue angle. Two glue-ups, exactly as before.

### 3.2 Why this matters more than a polygon engine

The tile grid stays **axis-aligned**. Only the *fill* of a cell changes from one rectangle to two
polygons. So the existing `Cell {xIn, yIn, wIn, hIn}` grid, the row/column layout, the metrics, and
the cut list all survive; the renderer gains a clipped-polygon fill and the 3D scene gains a second
prism per split cell.

That is a bounded change. A general angled-geometry engine — parallelograms and triangles as
first-class parts, `ExtrudeGeometry` in place of instanced boxes, angle-aware board feet, an angle on
every cut-list part — is not needed for any of the reference boards. **Mitered strips are the cheap
path to the boards that look expensive.**

### 3.3 Exact geometry

Let `w` = strip width, `t` = panel thickness (= the tile's height on the finished face), and `θ` =
the angle of the split line **measured from the horizontal (the strip-width axis)**. State the
convention explicitly in code; "a 60° cut" at the saw is the complement of this and the two get
confused constantly.

```
vertical drop of the split across the full tile width:   d = w · tan θ
wedge is the intersection of the tile rectangle with a half-plane
  → clip the rect by the line; the result has 3, 4 or 5 vertices
  → implement as a general convex clip, NOT as a hard-coded triangle
```

The clip matters: when `d > t` the wedge is truncated by the opposite edge and becomes a
quadrilateral. A triangle-only implementation overflows the cell.

A tile is fully described by `{ baseSpeciesId, wedgeSpeciesId, angleDeg, corner }` where `corner ∈
{tl, tr, bl, br}` says which corner the wedge occupies. The eight rigid transforms of a tile are the
four rotations and their mirrors; on an axis-aligned grid they reduce to the four corner choices plus
a colour swap.

### 3.4 The regular-hexagon condition (derived, and it checks out against the paper's figure)

The paper's hexagon lattice uses `θ = 30°` from horizontal (its "60° corner", measured off the strip
axis). For the lattice to close into **regular** hexagons:

```
slant edge length    = w / cos θ
vertical edge length = t − d = t − w·tan θ
regular  ⇔  t − w·tan θ = w / cos θ

        t/w = tan θ + sec θ          ← the closing condition, in general
```

At θ = 30° that is `0.5774 + 1.1547 = 1.7321 = √3`, so **t = w·√3 ≈ 1.732 w**.

Two independent confirmations: the paper's own tile artwork measures 415 px tall × 240 px wide =
ratio **1.73**, and the author's interactive generator ships `angle 30 / ratio 1.73205` as its
defaults.

The UI should **derive the ratio from the angle** rather than accept both, or warn when the pair
cannot tile. The reference generator accepts mismatched values and silently draws a pattern that
does not close up — that is a defect to fix, not a behaviour to copy.

Picking real numbers on a tape measure:

| strip width `w` | ideal `t = w√3` | nearest real stock | error |
|---|---|---|---|
| **⅞″ (0.875)** | 1.515″ | **1½″ (8/4 dressed)** | **1.2%** — use this |
| 13/16″ (0.8125) | 1.407″ | 1½″ | 6.6% — visibly off |
| 1″ | 1.732″ | 1¾″ | 1.0%, but 1¾″ stock is uncommon |

So: **⅞″ strips in a 1½″-thick panel, mitered at 30° from horizontal**, gives a near-regular hexagon
lattice out of ordinary 8/4 stock. The wedge drop is `d = 0.875/√3 = 0.505″`, comfortably inside the
1.5″ tile.

### 3.5 What this family produces

Varying only the generator (the sequence of tile orientations in the panel) and the row transform
gives, from *identical stock and identical cuts*: hexagon lattice, six-point star lattice,
tumbling-block / 3D-cube isometric weave, chevron and arrow patterns, and diamond/cross motifs. The
paper shows four such boards built in real wood from the same method. This single feature covers the
majority of the "advanced" reference boards.

---

## 4. Substitution and fractal patterns — a template generator, not a product mode

§5–§6 of the paper, and the author's four interactive generators, build Sierpinski gaskets,
"duplicating" fractals and "double" fractals by a **recursive** process: cut the board into 3, 4 or 8
pieces, transform each by one of the 8 rigid transforms of the square, re-glue at twice the
dimension, repeat. The output is always a 2ⁿ × 2ⁿ grid of species.

### 4.1 What a two-glue-up board can actually reach

This is the test any generated pattern must pass, and it is worth stating as a rule:

> With P panels, a board is buildable iff **every row of the pattern is one of the P panel sequences
> or its reverse**. The number of glue-ups is P + 1.

So the cost of a generated pattern is not its iteration count — it is its **number of distinct rows
up to reversal**. Compute that first; it is the whole feasibility question.

Worked examples, all at 8 × 8:

| Pattern | Distinct rows (mod reversal) | Panels | Verdict |
|---|---|---|---|
| checkerboard | 1 | 1 | trivial |
| **2-D Thue-Morse** | **1** | **1** | ships as a Sprint 57 template |
| plaid | 3 | 3 | ships as a Sprint 57 template |
| general substitution rule | up to 8 | up to 8 | 9 glue-ups — usually not worth it |
| any 16 × 16 fractal | up to 16 | up to 16 | not buildable in practice |

The Thue-Morse case is the striking one. Its grid is `M[i][j] = parity(popcount(i XOR j))`, and
because popcount parity is linear over GF(2) this equals `t(i) XOR t(j)` — so there are only **two**
distinct rows, the Thue-Morse word and its complement. At length 8 the word is *antipalindromic*
(reverse = complement), so the complement row is just a flipped slice: **one panel, one glue-up,
eight slices, five of them flipped.** This holds at length 8 because 3 is odd; it fails at 4 and at
16. Do not generalise it.

### 4.2 The recursive route, and why it is a different product

The alternative fabrication route is the author's own: recurse on the cross-section. A stick of
section `w × w` and length `L` is crosscut into four, assembled 2 × 2, and re-glued, giving
`2w × 2w × L/4`. After k iterations: section `2ᵏ·w`, length `L/4ᵏ`. From a ½″ stick of 8-foot stock,
three iterations yields a 4″ × 4″ board 1½″ thick — a coaster. Getting a real board means running
many sticks in parallel, which is why the paper says more than three or four iterations is very
difficult, and why the author's own four-iteration board has misplaced blocks in one corner.

Claims that a generated matrix yields "the strip layout, the crosscut sequence and the glue-up order"
assume a single glue-up. It does not. Any tool that prints a cut list for one of these without
counting distinct rows is printing a cut list that cannot be followed.

### 4.3 Conclusion

Do **not** build a substitution engine, a rule browser, or a rule-number slider into the app. Rule
spaces of 4096 or 2³² are a mathematician's toy; a maker wants a board. If we want patterns from this
family, generate them **offline** in a `scripts/` tool that emits a `BoardDesignConfig`, reject any
whose distinct-row count exceeds the panel cap, and ship the survivors as ordinary templates. The
recursion is the easy half; our existing metrics, board feet, cut list and print sheet then work
unchanged, because the output is just a config.

Represent the board as an integer matrix of species ids, never as pixels — the transforms become
exact index permutations (transpose plus row/column reversal), with no resampling and no
antialiasing, and the result is trivially testable.

---

## 5. How many designs are there? (context, not a requirement)

Starting from `n` black-and-white strips and `m − 1` cross-cuts, the number of distinct patterns is

```
N(n, m) = 2^⌊(n+1)/2⌋ · (1 − 2^(m−1)) + 2^(n+m−1)
```

which gives **30,736** basic designs for an 8 × 8 board. Counting them up to rotation and reflection
is an open problem, as is the minimum number of flips and swaps needed to reach a given pattern
("god's number"), bounded below by roughly n²/log n and above by 32n² for a half-and-half n × n board.

The practical takeaway: the design space reachable with two glue-ups and solid strips is already
enormous, and the interesting variety comes from the *tiles* (§3), not from more operations.

---

## 6. Mapping to our contract

| Paper concept | Our field |
|---|---|
| glue-up / generator | `Panel` — one glue-up, its own thickness and strip list |
| strip | `Strip { speciesId, widthIn, repeat }` |
| mitered strip (§3 above) | `Strip.miter { speciesId, angleDeg, corner }`, optional; absent = solid |
| cross-cut slice, placed | `RowStep { panelId, transform }` |
| flip | `transform: 'rot180' \| 'mirrorX' \| 'mirrorY'` |
| swap | ordering of `rowPattern` |
| tile | `Cell` — unchanged rectangle, plus an optional split |

Sequencing recommendation: solid multi-panel first (plaid, brick, diagonal — no renderer change
beyond variable row heights), mitered strips second (hexagon, star, tumbling blocks — renderer gains a
polygon clip). The second depends on the first for its panel and row model, not the other way round.

---

**Sources.** T. Kolokolnikov, *Mathematics on the chopping block*, 12 pp. §1 chessboard process ·
§2 counting · §3 group theory, flip/swap generators, Thm 3.1 · §4 hexagonal patterns via miter cuts ·
§5 IFS and duplicating fractals · §6 double fractals · §7 Yosegi and Khatam marquetry. Plus the same
author's four interactive generators at `mathstat.dal.ca/~tkolokol/board/` — one periodic angled
tiler (corroborates §3.4: it ships `angle 30 / ratio 1.73205` as defaults) and three recursive
substitution generators (§4 above).

**Clean-room (B8) applies to all of it.** These are conclusions and geometry restated in our own
terms. Copy no code, markup, assets or textures from those pages or from any third-party designer;
the pages carry no licence. Boards in the paper's Fig. 2 are by Andrey Muntyan (MTMWood), reference
only. No figures from any source are reproduced in this repo.

**One preset set is excluded deliberately.** The reference generators ship two named presets whose
rules produce swastika-like motifs — a degenerate case of a four-fold rotational substitution rule.
Neither the rules, the values, nor the names are carried into this repo. More generally, every
template we ship is one a person has looked at; that is the whole control, and it is sufficient
precisely because designs are private (B2) and there is no sharing surface (B11). Adding any public
sharing, gallery or export path would make user-generated patterns a review question for the first
time — treat that as a precondition on such a feature, not a gap today.
