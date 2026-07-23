# Verified findings carried forward from the invalidated batch

These plans had a patch written against a stale step array, so the patches were discarded
wholesale. The **verifier findings below are independent of that** — they are real defects
in the PLAN DATA, found and proved by an adversarial reader. Treat each as a strong lead to
confirm yourself, not as settled: confirm the arithmetic from the cut list before writing
prose around it, and flag it in `flags`.

Where a verifier said the plan's own data CONTRADICTS ITSELF, say so in the prose. Do not
pick a side and invent a joint to absorb the difference — that is what got the last attempt
rejected.

## outdoor-loveseat-modern-comfort
Interior span is 50-1/2" (Bases, Back rail, Back rest top all 50-1/2"), but Seat cleats are
54-1/2" and the source says to fit them "inside the frame". 54-1/2" does not go inside
50-1/2". 54-1/2" is the OUTSIDE dimension (Back base 54-1/2" less 2" overhang each end =
50-1/2"). The cleats are not an interior part, or the length is wrong — flag it.

## outdoor-sectional-ottoman-table
Step 5's trim cannot do what the source implies: legs are flush with the frame top, the 22"
tabletop boards lay flat ON the frame, so the top surface is 1-1/2" above the leg tops. One
1-1/2" trim piece cannot cover the leg tops AND finish flush with the tabletop. Also the
board ends face sideways, so you cannot screw "down through the trim into the board ends".
2x2: two 25" pieces need 50" of a 50" stick — no kerf allowance. Real, flag it.

## patchwork-dresser-wheels
**The big one.** BOX GEOMETRY settles it: Sides (48") run full, Case partitions (24-3/4")
sit between, per the 48" x 26-1/4" Cabinet back — case is 26-1/4" outside, 24-3/4" clear.
But the wide drawer boxes compute to 28-3/4" outside (confirmed by "Drawer bottoms, wide:
14" x 28-3/4"") and the wide faces are 29-1/2" — wider than the whole carcass. That is a
~4" overrun before slide clearance. Do NOT write "sized to their actual openings" or "an
even 1/8" gap"; the plan does not close. Flag it as the headline defect.
Also: one 8 ft 1x3 rips to ONE 1-1/2" strip, so it yields 96" against 102-1/2" of trim
alone — before the narrow drawer parts off the same board.

## play-kitchen-fridge
The declared back stock is 1/4" plywood 12" x 36", but the geometry requires 13"
(11-1/2" + 3/4" + 3/4", matching the 13" x 36" Back row). The MATERIAL line is the error.
Fridge shelf is 9-1/4" deep (1x10) in an 11-1/4" deep case, so its rear edge sits 2" forward
of the back panel — do not instruct nailing the back into it.

## rustic-modern-platform-bed
Two real shortfalls, both verified: 2x4 parts (80/80/80/67/20/20) need 5 boards against 4
declared (three 80s cannot share, and 67+20 leaves no room for the second 20); eleven 60"
slats from 120" stock are one per board (60 + kerf + 60 > 120), so 11 against 5 declared.
Slat gap 80 − 11x3-1/2 = 41-1/2 over 10 gaps = 4-1/8". All sound.

## scrap-lap-desk
2x2: 4x13 + 2x10 = 72" out of one 72" stick — zero kerf allowance, real. There is NO 1x2 in
materials, yet a step cuts the fixed back at 24" "from the 1x2"; the 1x3 has ~40" spare to
rip it from. Fix the contradiction rather than restating both.

## small-firewood-shed
Arithmetic verified sound: 72 − 28 − 1/8 = 43-7/8" offcut covers a 43" picket, so 14 boards
yield 14 side + 14 roof pickets; 22 pickets total = 22 declared. The existing cut step's
"five 12 ft 2x4" is one more than declared and drops the 8 ft 2x4 — reconcile to four
12-footers plus the 8-footer.

## small-ladder-bookshelf
No numeric defect — ends outer, 22-1/2 + 3/4 + 3/4 = 24" matching the 24" plywood bottoms.
The previous failure was ordering only.

## storage-bed-12-drawers
NOT a shortfall: four 30" + four 16-3/4" moulding = 93-1/2" + kerfs on each of TWO 96"
boards. The 2 declared are sufficient — packBoards says 3 but lowerBound is 2, and the
hand packing closes. Do not claim a shortfall here.
A retained step tells the builder to buy three 8 ft Pine 1x2 when the 1x2's only parts are
two 36" bottom trims (one board). Fix that.

## tiny-house-convertible-desk
A step specifies 3/4" screws; the only fastener is "Pocket-hole screws, 1-1/4" and 2-1/2"".
A 3/4" screw through a 3/4" apron holds nothing. Route it to 1-1/4".
Verified sound: 48 + 2x1-1/2 = 51"; tabletop 51-1/2 x 19-1/4 = 1/4" overhang; 48 − 2x12 =
24" opening; 21-1/2 + 2x3/4 = 23" box.

## toddler-farmhouse-bed-crib-mattress
1x3 shortfall is REAL: 2x18-1/2 + 2x9 + 2x30 = 115" against one declared 96" board.
Materials list only "Brad nails, 1-1/4"" and "Wood screws, 2"" — any "2" nails" is unsourced;
route those joints to the 2" screws, in EVERY step, not just one.

## triple-bunk-staggered-beds
Verified clean by a verifier who tried to break it: 167 pieces reconcile, the
12-3/4/25-1/2/38-1/4/51/63-3/4 ladder closes on the 70-3/4" leg (70-3/4 − 63-3/4 = 7").
52 declared boards are sufficient against 51 needed — state it as sufficiency, not shortfall.
Only flaw was a duplicate cut enumeration. Keep the rewrite light.

## vintage-bar-stool
Materials declare EIGHT "Pocket hole screws, 2-1/2"". Do not specify 2-1/2" screws for the
apron-to-leg joints (8) AND the stretchers (16) — that is 24+ against 8. Aprons are 3/4"
stock: a 3/4" pocket hole takes a 1-1/4" screw; a 2-1/2" screw exits a 1-1/2" leg.
2x2 shortfall is TRUE: 210-1/2" packs to 3 boards, 2 declared.

## wood-cooler-stand
Data contradiction — state it, do not resolve it. Top frame opening is 23" x 12-1/2"
(28 and 17-1/2 less 2-1/2" stock each side). The lid inner frame's parts are 25-1/2" and
13", so its smallest outer footprint is 25-1/2" x 13" — too big to drop in, too small to
register outside the 28" x 17-1/2" frame. It fits neither way.
A step mis-tags the shelf as "Pine, 1x2, 8 ft"; the shelf and supports are 5-1/2" wide 1x6.

## adjustable-sawhorses-for-desks
No numeric defect: 306" of 2x2 into 4 declared boards; 373-1/2" of 1x3 into 4. There are
exactly 4 horizontal supports = 2 per sawhorse, ONE tier — do not imply a second tier.

## chicken-coop-run-for-shed-coop
Lumber verified sound: 4x144 + 7x96 = 1248" of 2x6 exactly matches the declared bill; 2x4
packs to 9 = 9 declared. The "description says three stiles, cut list has four" flag is TRUE.

## hot-cocoa-gift-crate
The ends butt to the ENDS of the 16" bottom: 16 + 3/4 + 3/4 = 17-1/2", which is what the
17-1/2" slats require, and the crate is then 4" tall (not 4-3/4"). Do not write the
"ends sitting on top of the bottom" reading — it gives 16" overall and the slats overhang.
1x6: 4 + 4 + 16 = 24" out of a 24" board, zero kerf. Real.

## parsons-console-bookshelf
Shelf stock is 3/4": those pocket holes take the 1-1/4" screws, not the 2-1/2". A 2-1/2"
screw exits the far face of a 1-1/2" 2x2 leg — the visible outside of the piece. Only the
2x2-to-2x2 joints take 2-1/2".
2x2 shortfall is REAL and hand-proved: best packable combination is 90-1/4" of 96", and
465-1/2" / 5 boards needs 93-1/8" each.

## rustic-wall-clip-frame
The 1x2 rails are FACE-FORWARD (that is the only orientation a clothespin can glue to, and
the only one where "2-1/2" vs 1-1/2" wider landing" means anything). So the frame is
23-3/4 + 1-1/2 + 1-1/2 = 26-3/4" wide, NOT 25-1/4". A 1-1/4" brad also cannot cross a
face-forward rail. There are FIVE cross members, not four rows.

## simple-built-in-daybed-frame
Verified CONFIRM last round — keep changes minimal. The back cleat is genuinely absent from
the cutList; 2x4 need is 10 boards against 9 declared (eight 75" parts each need their own
96" board; three 37-3/4" backs pack 2+1). Slat gap 13-1/4 over six = about 2-1/4".
Worth flagging: "two per leg" x 7 slats x 3 legs = 42 screws against 16 declared.

## kids-lounge-bench
Two "1x3 long rails" (31-1/2") are cut and never installed by any step — they are NOT the
31-1/2" 1x2 seat supports. Give them a home or flag them.
Arithmetic verified: 35 1x3 pieces = 644-3/4" across seven boards, no shortfall. 1x2 = 197"
in 3 boards.

## modern-wood-storage-sofa
The seat frames matter most — the description calls the matched pair "the one thing you
cannot fudge". Four 102-1/2" long rails + ten 9" cross members must be assembled, and the
arms must be joined to the back; make sure both survive.
Lumber verified: 1x8 needs 7 boards (only three 24"s per board); 8 ft 2x4 fits 4.

## modular-stackable-dollhouse
BOX GEOMETRY settles the ROOF the same way it settles the deck: the 14" long sides sit
BETWEEN 7-3/4" members, so the roof's outside dimension IS 15-1/2" — the same footprint as
the module below. The last attempt applied this to the deck and denied it for the roof, and
in a stacking system that changes every module by 1-1/2". Obey the solver in both places.
Honest flags to keep: 2 of 4 room frame pieces and 2 of 4 short rails go unused.

## outdoor-cabana-backyard-retreat
THREE shortfalls, one of which the last attempt missed: the floor is ~89" across, but
thirteen 5-1/2" deck boards plus twelve 1/2" gaps = 77-1/2" — **11-1/2" short**, needing two
more 2x6, and all 16 declared 2x6 are already consumed (13 decking + 3 braces).
Also real: 21 2x4 needed against 12 declared (every piece >= 70-1/2", none pair on a 96"
board); 4 2x8 against 2. The 4x4 count is CORRECT at 6 — do not flag it.

## armoire-drawers-mirrored-door
The large drawer opening is BELOW the bottom shelf, not above it. Proof from the cut list:
67" panel − 56" divider = 11" of case below the shelf, and 1-1/2" of 1x2 trim + a 9-1/2"
opening (9-1/4" face + 1/8" reveals) = 11" exactly. The 56" divider standing ON the shelf
splits the 44" span into 23-1/4" + 19-1/4", and a 43"-wide drawer box cannot live in a
23-1/4" bay. The second pair of 44" trims frames that drawer's BOTTOM.
Materials have "Brad nails, 1-1/4"" — there is no "1-1/4" finish nail".
Verified real: 1x2 = 318" needs 4 boards (2 listed); 1x3 = 331-1/2" needs 4 (3 listed).

## around-the-corner-bookshelf
Do NOT assert the legs sit "outer face flush with the panel" — the source never says it and
it is the one reading that breaks the cut list. Outer-flush puts panel-inner to panel-inner
at 29-1/4 + 1-1/2 = 30-3/4", while the 29-1/4" shelves must span it. The legs are flush
INSIDE; then shelves, shelf trim and 2x2 trims all measure 29-1/4" against one span, and the
overall width is 32-1/4" under the 32-3/4" top.
The add-on panel stands 16-1/2" clear of the main unit, so its legs cannot be screwed to it —
the four 16-1/2" 2x2 trims are the actual connection.
Verified real: 1x2 = 228-1/2" needs 3 boards (2 listed). 1x12 and 2x2 both fit.

## board-and-batten-bunk-top
An adversarial verifier tried to break this and could not — the previous prose was CORRECT.
Its only blemish was a duplicate final step. Keep the rewrite LIGHT and preserve these
verified findings: 1x6 offcut 120 − 75 − 39 − kerf = 5-7/8"; baluster gaps
(72 − 14x1-1/2)/15 ≈ 3-3/8" and (60-1/2 − 21)/15 ≈ 2-5/8"; batten gaps (39 − 5x1-1/2)/4 =
7-7/8"; guardrail 72 + 2x1-1/2 = 75"; headboard 39 + 2x1-1/2 = 42".
The 2x2 is NOT a shortfall — 39+24+24 = 87-1/4" per board packs 324" into four 8 ft boards,
so FFD's 5 is a binning artifact and the 4 listed are adequate.
The 1x3 finding IS real and important: no two of {75, 72, 63-1/2, 60-1/2} share a 96" board,
so all four are consumed and the longest offcut is 35-3/8" — under the ~39" a mattress slat
needs. The material note's "mattress slats" cannot be met from it.
There is no 2" fastener in the list; do not name one.

## board-batten-media-console
The centre drawer bay is over-subscribed and this is the headline defect. The face is
54-1/2" between the legs less two 1-1/2" trims = 51-1/2" of openings. Two doors at 15-3/8"
plus a 20-1/4" drawer box = 51", leaving 1/2" total — which the door reveals alone consume
(1/8" all round = 1/2"), before any side guides (3/4" per side off a 1x2, 1-1/2" off a 2x2).
The drawer cannot be installed as specified. Say so; do not write "your real opening rules"
over it while step 1 still cuts the 20-1/4" parts.
The top does NOT overhang: the legs sit flush to the inside of the box (that is what makes
the 54-1/2" trims fit between them), so each leg projects 3/4" and the width at the legs is
57-1/2" — exactly the top. Flush, not a 3/4" reveal.
Also: the 1x2 has only ~19" of usable offcut across its two boards, nowhere near the ~46"
the drawer bottom guides need.
Verified fine: 1x12 226" into 3 boards; 1x8 127" of 144"; only a 2-1/2" screw exists.

## cabinet-console-table
The face frame gives TWO openings, each 31-3/4" x 30-1/4" — but the cut list has 4 doors,
4 pairs of hinges and 4 knobs. Nothing says the four doors are two pairs sharing the two
openings, so "measure your four openings" is unbuildable. Flag it.
Also: the 72" top over a 71" face frame overhangs 1/2" per end, not 3/4"; a 3/4" inset
gives a 70-1/2" carcass the 71" face frame will not fit.
Verified real: the five-board 1x12 shortfall, and the 27-1/4" → 30-1/4" divider trim
correction (32-3/4 − 2-1/2).

## cubby-dresser-no-drawer-slides
The three 29-1/2" x 5-1/2" 1x6s stand edge to edge, so the joints between them are
VERTICAL and 29-1/2" long. A 16-1/2" batten runs perpendicular and cannot cover one — and
there are 2 joints, not 3. Do not repeat that instruction.
The 1x10 purchase must be sized from the CORRECTED length: 12 x 12-1/4 + 12 x 11-3/4 = 288",
not the 351" that uses the discarded 17" figure.
Verified real: the six-vs-twelve drawer-sides shortfall; the 12-1/4" bay and 11-1/2" clear
opening. Leave the 2x4 top-slab orientation alone unless the data settles it.

## farmhouse-storage-bed-with-drawers
Do not lose the top supports and cap: two 41" 2x6 caps, two 32" 2x4 top rails and two 39"
2x4 supports must be installed by some step, and the description's "top 2x6 cap overhangs 1"
on all sides" is a stated feature.
Verified correct and worth keeping: the 21-1/2"-between / 14"-full-length drawer reading
(agrees with BOX GEOMETRY); the 75" x 75" back is really 75" x 15" (13-1/2 + 2 x 3/4); the
three-bay 24" opening (75 − 4 x 3/4 = 72, /3); the sheet layouts all close.
The drawer-box rows are labelled backwards — state the correction once, not twice.

## firewood-holder-console-table
The legs go on the FRONT and BACK faces, so the depth is 3/4 + 17 + 3/4 = 18-1/2" — exactly
the top's width. The top is FLUSH front and back, not "an even 3/4" overhang on all four
sides", and with the 3/8" back panel outside the back legs the assembly is 18-7/8" deep, so
the top is actually 3/8" narrower at the back. Lengthwise the 71" top is flush with the 71"
back panel.
The 69-1/2" liner equals the frame's full OUTER length and the inside opening is only
66-1/2" x 10" — it lies on top of the frame, it does not go in.
Verified fine: 2x4 pairing (66-1/2 + 17 per board), three legs per 1x4, 31-1/2 + 16-1/2 = 48".

## simple-adirondack-side-table
The cut list does not close in either reading. Three 15" long sides exist; in the
15" x 16" frame the clear span is 13-1/2", so the third is 1-1/2" too long, and the
long-sides-between reading gives 16-1/2" x 14-1/2" with uneven 1"/1-1/2" overhang rather
than the even 1-1/4" the top implies. SAY the data is ambiguous. Do not invent a lap joint.
Verified fine: nine 1x3 pieces, 139" into two 8 ft boards; 17" height = 16-1/4 + 3/4.

## x-desk-with-drawer
Do NOT say the long-point/short-point offset equals the board thickness. Across a 2-1/2"
wide 1x3 it is 2-1/2 x tan(35°) = about 1-3/4", and 2-1/2 x tan(20°) = about 15/16".
The drawer sides stack EDGE ON EDGE (2-1/2 + 2-1/2 = 5" deep), not face to face — face to
face gives a 1-1/2" thick side and no added depth.
Verified fine: 1x3 442-3/4" into 5 of 6 boards; 1x4 138" + kerfs of 144".
