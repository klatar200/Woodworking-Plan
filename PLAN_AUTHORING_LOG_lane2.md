# Plan Authoring Log — LANE 2 (indices 615–823)

Parallel authoring lane. Range: `plans.json` indices **615–823 inclusive**.
Rules: `published: false` on every file; write only to `content/plans/`; run
`node scripts/validate-plans.mjs content/plans` (0 problems) after every batch;
§8 stop-and-ask still applies. This log is lane-2 only — the shared
`PLAN_AUTHORING_LOG.md` is owned by other lanes and is NOT touched here.

## Status
- **LANE COMPLETE.** All indices 615–823 processed. Nothing further to resume —
  a new session should not start this lane again.
- Last updated: 2026-07-17
- Note: whole-dir validator occasionally shows transient FAILs in OTHER lanes'
  files (e.g. hemnes-linen-cabinet, hudson-dresser, mission-style-daybed,
  upholstered-cubes, basic-deck-stairs, vintage-gas-pump-cabinet,
  surf-bus-van-loft-bed) while they're mid-batch. All lane-2 files pass; those
  are not mine to fix. Whole directory (1115 files) validated 0 problems at
  end of batch 18 — the FINAL batch of this lane.
- Slug collision handled (§6.1, mechanical): idx 782 "Outdoor Chaise Lounge"
  collided with an existing `outdoor-chaise-lounge.json` authored by another
  lane (a different chaise design). Written as `outdoor-chaise-lounge-2.json`
  / title "Notched-Stringer Outdoor Chaise Lounge" to disambiguate.
- idx 794 "Farmhouse Canopy Bed Frame (All Sizes)" is a multi-size (Twin/Full/
  Queen/King/Cali King) parametric source entry — authored one concrete size
  (Queen) as `farmhouse-canopy-bed-frame-queen.json`, consistent with how the
  other farmhouse-bed sizes were each split into their own file earlier in
  this lane. idx 802 "Wall Kitchen Cabinet Basic Carcass Plan" was a similar
  parametric template (cuts given as formulas off a variable "CABINET WIDTH")
  — instantiated at a concrete 24" width as
  `wall-kitchen-cabinet-24-basic-carcass.json`, with the templated nature
  noted in the description.
- Known minor imperfection: `2x4-console-cubby-shelves.json`'s slug/filename
  retains the source's misleading "2x4" (the design uses no 2x4 lumber at
  all — title was cleaned per §6.2 to drop it, but renaming the slug/filename
  after the fact would orphan a duplicate file with no delete tool available,
  so the slug was left as-is). Flagging for optional cleanup at end-of-pass.

## Completed

### Batch 1 (indices 615–626)
| idx | title | slug |
|---|---|---|
| 615 | Simple Fireplace Mantle | simple-fireplace-mantle |
| 616 | Becca Wood Trunk | becca-wood-trunk |
| 617 | Slide Out Pot Rack | slide-out-pot-rack |
| 618 | Rustic Double X Bench | rustic-double-x-bench |
| 619 | Dress Up Storage | dress-up-storage |
| 620 | Closet Organizer from One Sheet of Plywood | closet-organizer-one-sheet-plywood |
| 621 | Sawhorse Outdoor Bench | sawhorse-outdoor-bench |
| 622 | Mudroom Pullout Rolling Bench Cart | mudroom-pullout-rolling-bench-cart |
| 623 | Wood Shim Cassidy Bed (Queen) | wood-shim-cassidy-bed-queen |
| 625 | Single Locker Cabinet | single-locker-cabinet |
| 626 | Triple Pedestal Farmhouse Bench | triple-pedestal-farmhouse-bench |

### Batch 2 (indices 627–638)
| idx | title | slug |
|---|---|---|
| 627 | Rustic Farmhouse Headboard (Twin) | rustic-farmhouse-headboard-twin |
| 628 | Wood Lath Crate Shelves | wood-lath-crate-shelves |
| 629 | Simple Quilt Rack Console Table | simple-quilt-rack-console-table |
| 630 | Modern A-Frame Bookshelf | modern-a-frame-bookshelf |
| 631 | Midcentury Modern Console / Buffet Cabinet | midcentury-modern-console-buffet |
| 632 | Modern Rustic X Console Table | modern-rustic-x-console-table |
| 634 | Bold Modern Bookshelf (Custom Sizes) | bold-modern-bookshelf |
| 635 | Scrap Wood Crayon Block Holder | scrap-wood-crayon-holder |
| 636 | Farmhouse Play Table | farmhouse-play-table |
| 637 | Vintage Drawer Bench | vintage-drawer-bench |
| 638 | Narrow Painter's Ladder Shelf | narrow-painters-ladder-shelf |

### Batch 3 (indices 639–650)
| idx | title | slug |
|---|---|---|
| 639 | Chunky Leg Coffee Table (Square) | chunky-leg-coffee-table-square |
| 640 | Cabinet Nightstand with Base Moulding | cabinet-nightstand-base-moulding |
| 641 | Calendar Shelf Command Center | calendar-shelf-command-center |
| 642 | Mudroom Hutch (Frameless) | mudroom-hutch-frameless |
| 643 | Lift-Top Coffee Table with Drawers | lift-top-coffee-table-drawers |
| 644 | Hailey Planked Headboard | hailey-planked-headboard |
| 645 | Brandy Scrap Wood Storage Bed (Queen) | brandy-scrap-wood-storage-bed-queen |
| 646 | Floating Shelf with Plywood Covering | floating-shelf-plywood-covered |
| 647 | Mini Fridge Snack Cabinet | mini-fridge-snack-cabinet |
| 648 | X Bench (works with X Outdoor Table) | x-bench-outdoor |
| 649 | Christmas Cookie Box or Serving Display | christmas-cookie-box |
| 650 | Countertop Cooling Rack | countertop-cooling-rack |

### Batch 4 (indices 651–662)
| idx | title | slug |
|---|---|---|
| 651 | 54" Bench with Cross Bracing | 54-inch-bench-cross-bracing |
| 652 | Kids Flip Chair / Toddler Flip Seat | kids-flip-chair |
| 654 | Extra Wide Media Base | extra-wide-media-base |
| 655 | Hot Cocoa Gift Crate | hot-cocoa-gift-crate |
| 656 | Simple Planked Wood Bed | simple-planked-wood-bed |
| 657 | Benchright Industrial Farmhouse Bench | benchright-industrial-farmhouse-bench |
| 658 | Bailey Console Table (source: "with Doors"; builds drawers) | bailey-console-table-doors |
| 659 | Factory Cart Coffee Table | factory-cart-coffee-table |
| 660 | Rustic Farmhouse Round Grand Coffee Table | rustic-farmhouse-round-grand-coffee-table |
| 661 | Chalkboard Cubby Shelf | chalkboard-cubby-shelf |
| 662 | Toddler Farmhouse Bed (Crib Mattress) | toddler-farmhouse-bed-crib-mattress |

Notes: 660 slug uses `-grand-` suffix — `rustic-farmhouse-round-coffee-table`
already existed (another lane / original). 658 source title says "with Doors"
but cut list/steps build drawers; authored as drawers, noted in description.

### Batch 5 (indices 663–674)
| idx | title | slug |
|---|---|---|
| 663 | 3-in-1 Fire Pit Bench | fire-pit-bench-3-in-1 |
| 664 | Leaning Wall Ladder Desk | leaning-wall-ladder-desk |
| 666 | Apothecary Console Table | apothecary-console-table |
| 667 | Modern Play Table with Storage | modern-play-table-storage |
| 668 | 1x3 and 1x4 Wood Box Tray | wood-box-tray |
| 669 | Hanging S'more Station | hanging-smore-station |
| 670 | Small Wall Shelf with Hooks | small-wall-shelf-hooks |
| 671 | The Media Hutch (Board and Batten) | media-hutch-board-batten |
| 672 | Frameless Office Open Shelf Base | frameless-office-open-shelf-base |
| 673 | Open Top Toy Box | open-top-toy-box |
| 674 | Wood Manger Scene | wood-manger-scene |

### Batch 6 (indices 675–685)
| idx | title | slug |
|---|---|---|
| 675 | 18" Doll Beverage Stand | 18in-doll-beverage-stand |
| 676 | 6 Drawer Library Coffee Table (Square Size) | 6-drawer-library-coffee-table-square |
| 677 | Benchmark Media Console | benchmark-media-console |
| 680 | Simple Open Farmhouse Style Vanity | simple-open-farmhouse-vanity |
| 681 | Truck Shelf or Desk Organizer | truck-shelf-desk-organizer |
| 682 | Simple Play Kitchen French Door Fridge | simple-play-kitchen-french-door-fridge |
| 683 | Scrap Wood Pumpkin Riser | scrap-wood-pumpkin-riser |
| 684 | Split Industrial Coffee Table | split-industrial-coffee-table |
| 685 | Modern Platform Bed Frame [All Mattress Sizes] (dowel legs) | modern-platform-bed-frame-all-sizes-2 |

Note: 685 is a slug collision with the pre-existing `modern-platform-bed-frame-all-sizes.json` (hairpin-leg version) — same underlying design (box frame, center support, 5 sizes) but this source used round dowel legs. Handled per §6.1 as a mechanical slug collision (`-2` suffix), not a stop-and-ask duplicate, since the existing file predates this lane. Flagging for end-of-pass reconciliation in case Keagan wants these two merged instead of both kept.

### Batch 7 (indices 686–696)
| idx | title | slug |
|---|---|---|
| 686 | DIY Wood Pumpkin Treat Holder | diy-wood-pumpkin-treat-holder |
| 687 | Raised Farmhouse Toy & Blanket Bin | raised-farmhouse-toy-blanket-bin |
| 688 | Shanty Open Shelf Console | shanty-open-shelf-console |
| 689 | Patchwork Dresser on Wheels | patchwork-dresser-wheels |
| 690 | Double Desk - Easy to Build DIY with Door | double-desk-hollow-core-door |
| 691 | Small Rustic X Console | small-rustic-x-console |
| 692 | DIY Mudroom System with Towers and Bench | mudroom-system-towers-bench |
| 693 | Basic Play Toy Workbench | basic-play-toy-workbench |
| 694 | Captain's Bed with Trundle Bed | captains-bed-with-trundle |
| 695 | DIY Personalized Block Photo Holder | personalized-block-photo-holder |
| 696 | 2x4 Upholstered Banquette Seat | 2x4-upholstered-banquette-seat |

Note: 694/696 mattress/sewing-pattern gaps in source filled with general
craft/upholstery knowledge (no actual diagram existed in source for the
banquette's skirt/cushion sewing steps); mattress purchases excluded from
694's materials list (furnishing, not a build material).

### Batch 8 (indices 697–708)
| idx | title | slug |
|---|---|---|
| 697 | Play Train Table Trundle | play-train-table-trundle |
| 699 | Kids' Trestle Craft Table with Storage | kids-trestle-craft-table-storage |
| 700 | Entryway Cabinet with Hooks | entryway-cabinet-with-hooks |
| 701 | 1x12 Pine Board Dress Up Wardrobe | 1x12-dress-up-wardrobe |
| 702 | DIY Parsons Small Coffee Table | diy-parsons-small-coffee-table |
| 704 | 1x12 Play Table Bench with Storage | 1x12-play-table-bench-storage |
| 705 | Dress Up Closet from Stair Spindles | dress-up-closet-stair-spindles |
| 706 | Emily Nightstand | emily-nightstand |
| 707 | DIY 16" Deep Bookshelf Base | 16in-deep-bookshelf-base |
| 708 | Art Cart Underbed | art-cart-underbed |

### Batch 9 (indices 709–720)
| idx | title | slug |
|---|---|---|
| 709 | Mitered Corner 1x2 Frames | mitered-corner-1x2-frames |
| 710 | Entryway Accessory Wall Cubby Organizer | entryway-accessory-wall-cubby-organizer |
| 711 | Mid Height 4 Drawer Dresser (Board and Batten) | mid-height-4-drawer-dresser-board-batten |
| 712 | 1x12 Bookcase with Wainscoting Back | 1x12-bookcase-wainscoting-back |
| 713 | DIY Play Kitchen with Back Wall | diy-play-kitchen-back-wall |
| 714 | Deep Console Table with Hutch | deep-console-table-with-hutch |
| 715 | Wedding Benches | wedding-benches |
| 716 | Rustic Modern Farmhouse Dresser Console | rustic-modern-farmhouse-dresser-console |
| 717 | Media Hutch (Rebecca Media Suite) | media-hutch-rebecca-media-suite |
| 718 | 2x2 House Shaped Indoor Playhouse Frame | 2x2-house-shaped-playhouse-frame |
| 719 | Foodie Play Kitchen Stove Wood Toy | foodie-play-kitchen-stove |
| 720 | Simple Wooden Pie Box | simple-wooden-pie-box |

Note: 710's source cut list was literally "generated in Shelf Help App" (no
real dimensions given, only "cubbies ~5x10\", customize to your space") —
authored a representative 30"x40" reference build per §6.12/general judgment,
not a stop-and-ask case since real steps + shopping list existed.

### Batch 10 (indices 721–732)
| idx | title | slug |
|---|---|---|
| 721 | Christmas Tree Tray | christmas-tree-tray |
| 722 | Collapsible Standing Wood Christmas Tree Shelf | collapsible-standing-wood-christmas-tree-shelf |
| 724 | Lighted Floating Table Runner Riser | lighted-floating-table-runner-riser |
| 725 | Gift Wrapping Station Wall Shelf Organizer | gift-wrapping-station-wall-shelf-organizer |
| 726 | Easy Fence Picket Wood Pumpkin Decor | easy-fence-picket-wood-pumpkin-decor |
| 727 | Child Sized Surf Board Adirondack Chair | child-sized-surf-board-adirondack-chair |
| 728 | 2x2 DIY Wood Pumpkin Decor for Mantle or Tabletops | 2x2-wood-pumpkin-decor |
| 729 | Rolling Bar Cart with Removable Tray | rolling-bar-cart-removable-tray |
| 730 | DIY Floral Centerpiece with Reclaimed Wood and Upcycled Jars | floral-centerpiece-reclaimed-wood-jars |
| 731 | Baby Doll Furniture Moon Bassinet | baby-doll-furniture-moon-bassinet |
| 732 | Refined Printer Cabinet | refined-printer-cabinet |

Note: 724 titled "Lighted..." in source but no lighting/electrical hardware
anywhere in the source data (shopping list is just 1x2/1x8/nails/glue) — title
trimmed to "Floating Table Runner Riser" per §6.2 (clean up title, don't invent
content); "floating" refers to the recessed-frame optical effect, which the
source steps do support.

### Batch 11 (indices 733–744)
| idx | title | slug |
|---|---|---|
| 733 | Fireplace TV Stand with Hidden Storage | fireplace-tv-stand-hidden-storage |
| 734 | Box Frame Console Table | box-frame-console-table |
| 735 | Taylor's Coffee Table | taylors-coffee-table |
| 736 | Small Ladder Bookshelf | small-ladder-bookshelf |
| 737 | Floating Boxes Nightstand | floating-boxes-nightstand |
| 738 | Emily Dresser | emily-dresser |
| 739 | 2x4 Leaning Hall Tree | 2x4-leaning-hall-tree |
| 740 | Umbrella Stand Hampton | umbrella-stand-hampton |
| 741 | One Sheet of Plywood Hall Tree | one-sheet-plywood-hall-tree |
| 742 | Monogrammed Snowflake Cutout | monogrammed-snowflake-cutout |
| 743 | $55 Fancy X Desk | fancy-x-desk |
| 744 | Modern Media Console with Metal Box Frame Base | modern-media-console-boxed-base |

Notes: 743 dollar figure ("$55") dropped from title per §6.2/site cost-tier
policy (no dollar amounts in public UI) — figure is also unverifiable/outdated.
744 source design uses welded steel tubing for the base, which needs a welding
tool not in `content/tools.json`; authored using the source's own documented
wood alternative (2x2 or hardwood 1x1 legs) as the buildable design, retitled
to drop "Metal Box Frame" since the built version uses wood — original metal
option described in the plan's description for anyone with welding equipment.

### Batch 12 (indices 745–756)
| idx | title | slug |
|---|---|---|
| 745 | Build Your Own Table Menu Stands – Free DIY Plans! | table-menu-stand |
| 746 | Flower Shaped Storage Play Table | flower-shaped-storage-play-table |
| 747 | DIY Parsons Square End Table or Nightstand | parsons-square-end-table |
| 748 | Outdoor X Base Table | outdoor-x-base-table |
| 749 | Platform Bed with Side Storage 1x12 Divider Shelf | platform-bed-side-storage-1x12-divider |
| 750 | Vintage Pew Bench | vintage-pew-bench |
| 751 | Printer's Console Table | printers-console-table |
| 752 | Grazing Board or Charcuterie Board - Serving Tray | charcuterie-serving-board |
| 753 | Art Storage Shelf with Caddies | art-storage-shelf-caddies |
| 754 | Rustic Wooden Candle Holders | rustic-wood-candle-holders |
| 755 | Farmhouse Bed - Standard King Size | farmhouse-bed-king-size |
| 756 | Wood Bird Feeder | wood-bird-feeder |

Notes: 745 marketing text ("Free DIY Plans!") kept out of the authored title.
748 and 752 had empty source CUT_LIST/TOOLS fields — cut lists and tool lists
authored from the step descriptions and shopping lists using craft judgment
(not a stop-and-ask case; both had full, usable steps). First-pass validation
on this batch surfaced a systematic error (step `materials` arrays accidentally
used cutList part names instead of the plan's top-level material name strings)
across all 12 files — corrected and re-validated clean.

### Batch 13 (indices 757–768)
| idx | title | slug |
|---|---|---|
| 757 | Farmhouse Bed - Queen Sized | farmhouse-bed-queen-size |
| 759 | How to Build a Loft Bed | loft-bed-with-ladder-and-guardrail |
| 761 | The Littlest Helper Tower | littlest-helper-tower |
| 762 | Rustic Bookshelf Plans with 2x2 Face Frames | rustic-bookshelf-2x2-face-frames |
| 763 | Garden Tool Storage | garden-tool-storage-rack |
| 764 | Child's Airplane Swing | childs-airplane-swing |
| 765 | Storage Sofa | diy-storage-sofa |
| 766 | Corner Cupboard | corner-cupboard |
| 767 | How to Build a Swing Set for the Playhouse! | playhouse-swing-set |
| 768 | 48" Turned Leg Vanity | 48in-turned-leg-vanity |

Notes: 764/766 had empty source TOOLS arrays — tools inferred from step content
(not stop-and-ask; real steps/cut lists/shopping lists existed). 768's own
source text says no fixed cut list is possible since it depends on purchased
turned legs — authored with explicit "cut to fit your legs" notes throughout,
consistent with how other measure-to-fit items have been handled all pass.
Same systematic step-materials mistake as batch 12 (cutList part names used
instead of top-level material names) occurred again across 9 of these 10
files — caught and fixed by the validator, whole directory re-verified clean.

### Batch 14 (indices 769–780)
| idx | title | slug |
|---|---|---|
| 769 | PLANS: A Murphy Bed YOU Can Build, and Afford to Build | affordable-murphy-bed |
| 770 | Classic Storage Bed (King) | classic-storage-bed-king |
| 771 | Narrow Farmhouse Table | narrow-farmhouse-table |
| 772 | Classic Chair Plans | classic-chair-plans |
| 773 | Miter Saw Cart | miter-saw-cart |
| 774 | Farmhouse Bed (California King Size) | farmhouse-bed-california-king-size |
| 775 | 2x4 Console Cubby Shelves | 2x4-console-cubby-shelves |
| 776 | Ultimate Lumber and Plywood Storage Cart | lumber-plywood-storage-cart |
| 777 | Wall Kitchen Corner Cabinet | wall-kitchen-corner-cabinet |
| 778 | Simple Lift Top Storage Bed | lift-top-storage-bed |
| 780 | Parson Chair Plans | parson-chair-plans |

Notes: 770's own cut list says "follow queen plans" for the side benches but
the full dimensions for those benches ARE included in this entry's own
CUT_LIST, so no external reference was actually needed. 774's source
shopping list omitted three items its own cut list required (1x4 panel trim,
1x6 footboard top trim, 2x10 side rails) — added all three as materials with
notes explaining the omission; cost estimate adjusted upward accordingly.
775's source title says "2x4" but the actual design uses no 2x4 lumber
anywhere (1x12/1x2 only) — title corrected per §6.2, slug/filename left
as-is (see Status notes). Same systematic step-materials mistake as batches
12–13 occurred again across nearly every file this batch — caught and fixed,
whole directory re-validated clean at 0 problems.

### Batch 15 (indices 781–792)
| idx | title | slug |
|---|---|---|
| 782 | Outdoor Chaise Lounge | outdoor-chaise-lounge-2 |
| 784 | Benchmark Storage or Media Tower | benchmark-storage-media-tower |
| 785 | Under Loft Bed Tall Bookcase | under-loft-bed-tall-bookcase |
| 786 | Kitchen Cabinet Sink Base 36 Full Overlay Face Frame | kitchen-cabinet-sink-base-36 |
| 788 | Elevated Planter Box | elevated-planter-box |
| 789 | Lyds' No-Sew Upholstered Bed | no-sew-upholstered-bed |
| 792 | Vegetable Rack with Slide Out Trays | vegetable-rack-slide-out-trays |

Notes: 782 hit a genuine slug collision with another lane's file (see Status
notes above) — resolved mechanically per §6.1. 789's source shopping list
specified 6 ft 1x12 boards for siderails, but the cut list needs 80"-long
siderails — a 72" board cannot yield an 80" part (same class of source error
as idx 774 last batch); corrected to 8 ft boards with a note explaining the
fix, and added a 10-slat mattress-support-slat line item that the source's
cut list mentions but never quantifies. 789 also had one empty placeholder
step (source "Step 5") which was dropped rather than authored as a no-op.
kitchen-cabinet-sink-base-36 needed one round of step-materials fixes
(reused the back-supports material name inexactly in two later steps) —
caught and fixed, whole directory re-validated clean at 1091 files, 0
problems.

### Batch 18 (indices 817–823) — FINAL BATCH OF THIS LANE
| idx | title | slug |
|---|---|---|
| 817 | Sweet Pea Bunk Bed | sweet-pea-bunk-bed |
| 818 | Wooden Squatty Potty | wooden-squatty-potty |
| 819 | Simple Stackable Outdoor Chairs | simple-stackable-outdoor-chairs |
| 823 | Coat Rack from Scraps | coat-rack-from-scraps |

Notes: 817 (Sweet Pea Bunk Bed) is the largest single plan authored this lane
after the castle loft bed — a genuine four-panel playhouse-style bunk bed with
arched windows and a rear shelf. Per the source's own explicit statement
("we'll be adding plans for the roof, pergola, window boxes, shutters and
stairs later"), this file covers ONLY the four structural wall panels + bed
assembly, matching the source's own stated scope — the roof/pergola/shutters
are separate plans not authored here. Condensed ~80 raw cut-list line items
into a faithful ~35-entry cutList and 21 source steps into 13 authored steps
without dropping any structural member. One round of step-materials fixes
(a step referenced a mattress-slat-specific material name where it meant the
general 1x4/1x6 boards) — caught and fixed. 818 (Squatty Potty) had zero
source steps but is a trivial 3-board stool with no real joinery ambiguity —
authored directly, unlike the empty-steps skips below which involve genuine
missing assembly decisions. 823 (Coat Rack from Scraps) is an intentionally
freeform scrap-wood project with no fixed shopping list by design — authored
with a representative cutList grounded in the source's own given hook
dimensions and angles, explicitly flagged as adjustable to whatever scraps
are on hand. Whole directory re-validated clean at 1115 files, 0 problems.
**This is the last batch — indices 615–823 are now fully processed.**

### Batch 17 (indices 805–816)
| idx | title | slug |
|---|---|---|
| 805 | Hanging Outdoor Bed | hanging-outdoor-bed |
| 806 | Farmhouse Bed for American Girl or 18" Dolls | farmhouse-bed-american-girl-18-doll |
| 807 | 36" Wall Cabinet, Double Door - Momplex Vanilla Kitchen | 36in-wall-cabinet-double-door |
| 808 | DIY Bucket or Basket Shelf Display Stand | diy-bucket-basket-shelf-display-stand |
| 809 | Simple 24" Bath Vanity | simple-24in-bath-vanity |
| 810 | 18" Kitchen Cabinet Drawer Base | 18in-kitchen-cabinet-drawer-base |
| 811 | Chicken Coop Run for Shed Coop | chicken-coop-run-for-shed-coop |
| 812 | Small Square Modern Farmhouse Table | small-square-modern-farmhouse-table |
| 813 | Mom's Train Table | moms-train-table |
| 815 | Rustic X DIY Changing Table | rustic-x-diy-changing-table |
| 816 | Face Frame Base Kitchen Cabinet Carcass | face-frame-base-kitchen-cabinet-carcass-24in |

Notes: 816 was another parametric template (like 802) — instantiated at a
concrete 24" width, this time using dimensions (22-1/2" strip width, 34-1/2"
side height) taken directly from the source's own step text rather than
invented. 815's source CUT_LIST was entirely empty, but the 14 STEPS contain
enough embedded dimensions (board lengths named inline in the prose) to
reconstruct a real cut list — except the X-brace diagonal pieces, whose exact
lengths are never stated even in the steps; those are marked as approximate
"scribe to fit" dimensions rather than presented as exact source numbers, same
treatment as a scribed cross-support piece in an earlier batch. One round of
step-materials fixes on 18in-kitchen-cabinet-drawer-base.json (drawer-face
material name mismatch) — caught and fixed, whole directory re-validated
clean at 1111 files, 0 problems.

### Batch 16 (indices 793–804)
| idx | title | slug |
|---|---|---|
| 794 | Farmhouse Canopy Bed Frame (All Sizes) | farmhouse-canopy-bed-frame-queen |
| 795 | How to Build a Fort Bed | how-to-build-a-fort-bed |
| 796 | Toddler Chalkboard Easel | toddler-chalkboard-easel |
| 797 | Workbench to Get the Job Done! | workbench-to-get-the-job-done |
| 798 | Castle Loft Bed with Stairs and Slide | castle-loft-bed-stairs-and-slide |
| 799 | Farmhouse Kitchen Island & Bar Plans | farmhouse-kitchen-island-bar |
| 800 | Weatherly Pergola | weatherly-pergola |
| 802 | Wall Kitchen Cabinet Basic Carcass Plan | wall-kitchen-cabinet-24-basic-carcass |
| 804 | Upgraded Luggage Rack or Suitcase Stand Benches | upgraded-luggage-rack-suitcase-stand-bench |

Notes: 794 and 802 were parametric/multi-size source entries — see Status
notes above for how each was instantiated concretely. 798 (Castle Loft Bed)
is a very large, genuinely complex build (25 source steps, three standalone
plywood sections plus railings) — condensed to ~13 authored steps and a
~30-line cutList without dropping any structural component; a stray
leftover-draft artifact in one step's materials array (a JS-like
`.replace(...)` fragment) was caught before validation and fixed. One round
of step-materials fixes needed on how-to-build-a-fort-bed.json (particle
board name mismatch) — caught and fixed, whole directory re-validated clean
at 1100 files, 0 problems.

## Skipped
| 758 | Free Tote Storage Rack Configurator | completely empty steps/shopping_list/cut_list/tools — no instructional content |
| 760 | Outhouse Plan for Cabin | empty shopping_list AND cut_list (no dimensions anywhere); a full outdoor structure over an excavated pit with zero anchoring data would require inventing the entire structural design from scratch — beyond safe inference from steps alone |
| 779 | DIY Elevator Bed for Tiny House | completely empty steps/shopping_list/cut_list/tools — no instructional content |
| 781 | Fancy Jewelry Box | steps array is completely empty despite a detailed shopping/cut list — same class as idx 703 (Lydia Queen Bed): no instructional content to author from |
| 783 | Concealed Hinges Made Easy! Video and Illustrated Guide | a hinge-installation technique tutorial, not a buildable project — shopping_list, cut_list, and steps are all empty; only a generic tools list is present |
| 787 | Steel Magnet Wall | not-a-real-woodworking-plan judgment call (§8): the build is almost entirely galvanized steel roofing screwed to a few furring strips — no cut list beyond "cut to fit," and the only tools involved outside basic furring-strip carpentry are tin snips and a metal-cutting blade; this is a metal wall-covering install, not a woodworking project for this catalog |
| 790 | Industrial Mobile Coat Rack - Featuring DIY ShowOff | completely empty on every field (shopping_list, cut_list, tools, steps) — no content to author from |
| 791 | Farmhouse Bed (Full Size) | steps array is completely empty despite full shopping_list and cut_list — same class as idx 703/781; construction is close to the queen/king/California-king farmhouse beds already authored this session, but inventing steps from a sibling plan rather than this entry's own (nonexistent) instructional content would not be authoring this plan, it would be authoring a different one under this title |
| 793 | Twin Storage (Captains) Bed | shopping_list and steps explicitly depend on building "the two side benches from the full size bed" — a separate source plan whose side-bench dimensions aren't included anywhere in this entry (its own cut list is labeled "TWIN END BASE UNIT ONLY"); authoring the side benches would mean fabricating the majority of the bed's structure rather than adapting real source content |
| 801 | Easiest Parson Chair Slipcovers | not-a-real-woodworking-plan judgment call (§8): TOOLS is empty and every material/step is fabric, thread, and a sewing machine — a slipcover sewing tutorial for the already-authored parson chair, not a woodworking project |
| 803 | Easy Window Trim | not-a-real-woodworking-plan judgment call (§8): in-place finish carpentry applied directly to an existing house window (no standalone buildable object, no fixed dimensions, no category in categories.json fits architectural trim work) |
| 814 | East Fork Free Doghouse (or Playhouse or Storage Shed) Plans (Kind of)... | CUT_LIST and TOOLS both entirely empty; all 15 STEPS have empty bodies (one just says "Done! Nice work!") — a materials-philosophy blog post about a whole house-scale build with zero actionable dimensions or instructions |
| 820 | Patio Table with Built-in Beer/Wine Coolers | STEPS_COUNT 0 despite a real, detailed cut list — a genuinely complex build (two recessed planter-box cooler openings, precise framing/skirt/box-support joinery) where the actual assembly order and joinery details are real open design decisions, not self-evident from the cut list alone — same class as idx 703/781/791 |
| 821 | Storage Stairs for the Playhouse Loft Bed | explicitly a modification of a separate "Playhouse Loft Bed" plan ("follow the directions in the ladder Playhouse Loft Bed plans to build the front wall..."), but the source's own cut-list notes are internally inconsistent about which variant of that base plan it modifies (references "building only one front rail" vs. two, contradicting its own instruction), and the currently-cataloged `playhouse-loft-bed.json` (authored by another lane) doesn't resolve the ambiguity — same class of unresolvable cross-plan dependency as idx 793 |
| 822 | DIY Barn Door Hardware from Washers | completely empty (shopping_list, cut_list, steps all empty) — a video/photo tutorial with no textual instructional content |
| idx | title | reason |
|---|---|---|
| 624 | Bookshelf Hutch for Basic Collection | empty steps/tools/shopping_list — no instructional content |
| 633 | Sofa Table Featuring Jenna Sue Design | empty steps/tools/shopping_list — no instructional content |
| 653 | Vintage Wood Riser | empty steps/shopping_list/cut_list — no instructional content |
| 665 | The Original Pallet Shelf Tutorial | empty steps/shopping_list/cut_list — no instructional content |
| 678 | Brina Bedside Table | empty steps/shopping_list/cut_list/tools — no instructional content |
| 679 | Dovetail Beam End Table | empty steps/shopping_list/cut_list/tools — no instructional content |
| 698 | Face Frame Wall Kitchen Cabinet Universal Template | empty steps/shopping_list/cut_list — no instructional content |
| 703 | Lydia Queen Bed | steps array has 1 entry with empty body — no instructional content despite detailed cut list |
| 723 | JOY Marquee Sign from Home Depot DIH Workshop | empty steps/shopping_list/cut_list/tools — no instructional content |

## Open questions for Keagan
- (none)
