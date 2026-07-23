# Plan Audit — read-only report (2026-07-23)

**Scope.** The audit/report phase of `PLAN_AUDIT_BRIEF.md` — re-measure ground truth and
re-run the deterministic defect audit against the **current** `content/plans/` on `main`
(post-Sprint-46, post `run1-plan-audit` merge). **No plan content was modified.** Run in a
disposable `/tmp` clone of the device source; nothing written back to the repo except this
report and the refreshed review CSV.

**Method.** `scripts/validate-plans.mjs` (Zod-mirror gate) + `scripts/run1-ledger.mjs --init`
(rebuilds the per-plan deterministic signals from current content) + a fresh ground-truth count.
All deterministic, zero LLM tokens, offline.

---

## 1. Ground truth — current vs. the brief's 2026-07-22 baseline

| Metric | 2026-07-22 baseline | **Now (2026-07-23)** | Change |
|---|---|---|---|
| Plan files | 1,115 | **1,115** | — |
| Validator (`validate-plans.mjs`) | 1,115 / 1,115 clean | **1,115 / 1,115 clean** | — |
| Published / unpublished | 948 / 167 | **863 / 252** | −85 published |
| Published **with** image | 863 | **863** | — |
| Published **no** image (**P1**) | 85 | **0** | **−85 → resolved** |
| Unpublished, no image, parked URL (**P2**) | 154 | **154** | — |
| Unpublished, no image, no parked URL | — | **85** | the ex-P1 set, now hidden |
| Live `images[]` URLs | 876 | **876**, all on `pub-…r2.dev`, 0 malformed | — |

**Headline: Sprint 46 Workstream C closed the P1 image gap.** The 85 published-but-imageless
plans were unpublished, so **every one of the 863 published plans now carries an image**. The
catalog no longer serves a single honest-placeholder card. Those 85 didn't gain images — they
moved out of the live catalog until real photos are sourced (no parked URL to recover from).

---

## 2. Buildability — deterministic defect audit (published cohort = 863)

`run1-ledger.mjs` flags a plan for rewrite when the deterministic signals alone show it isn't
"buildable by reading" (§4.1/§6.2). Recomputed on current content:

| Signal | Published plans flagged | What it means |
|---|---|---|
| **Deterministically flagged (any signal)** | **411 / 863** | ~48% of the live catalog has ≥1 buildability defect |
| Thin steps (`< 90` chars) | 273 | a step too short to follow |
| Low step density (`≥5 parts`, `< parts/2` steps) | 82 | more parts than the steps explain how to make |
| Untraceable numbers | 96 | a dimension in prose that doesn't trace to the cut list/materials |
| Fastener contradiction | 65 | a fastener size the plan's own materials contradict |
| Unplaced structural stock | 15 | board/sheet you're told to buy and never told to use |
| **Missing cut step** | **2** | no step actually cuts the parts (was the highest-value single fix) |

Total flagged incl. unpublished: **592** (411 published + 181 unpublished).

**Prior `run1` progress preserved in the ledger:** 37 plans **verified** (their rewrites are
already on `main`), 21 **returned/flagged**, **1,057 pending**. So the rewrite pass is ~5% run,
95% remaining.

### Worst-first published offenders (top 20, with reasons)

```
media-hutch-rebecca-media-suite   NEVER USED: Pine 1x3 8ft | thin steps 1,2,3,5,7
crooked-doghouse                  NEVER USED: Pine 1x2 8ft | low density (9 steps/19 parts) | thin 3,4,7
parson-chair-plans                NEVER USED: Plywood scrap 1/4" | thin 9 | untraceable 2",2",3",3"
x-desk-with-drawer                NO CUT STEP | thin 5,8
birdhouse-bath-shelf-towel-bar    NEVER USED: Pine 1x2 8ft | thin 4,5,6,7
farmhouse-storage-bed-with-drawers NEVER USED: 2x2 8ft; 1x3 8ft | low density (7 steps/20 parts)
wood-cooler-stand                 NEVER USED: Plywood scrap | thin 2,7,9,12
extra-wide-triple-pedestal-farmhouse-table  NEVER USED: Pine 1x2 8ft | thin 4,7 | untraceable 2"
narrow-end-table                  NEVER USED: 1x4 4ft | untraceable 2-1/2", 2"
classic-storage-bed-king          low density (9/21) | untraceable 1-1/4" ×3
hudson-dresser                    low density (7/23) | untraceable 19", 2", 2"
pretend-play-coffee-cart-espresso-machine  low density (8/18) | thin 1,4,5,8
shaker-style-dresser              NEVER USED: Pine 1x3 6ft; 1x5 6ft; 1x8 8ft | untraceable 2-1/4"
open-center-bathroom-vanity-48    low density (9/19) | thin 3,8,9
outdoor-x-base-table              NEVER USED: Pine 2x4 8ft | thin 1
tiny-house-loft-bedroom-system    low density (11/27) | thin 3,5,8
toddler-farmhouse-bed-crib-mattress low density (8/19) | untraceable 2", 2"
cedar-desk-accessory-set          low density (4/11)
6-drawer-library-coffee-table-square NEVER USED: Pine 1x4 8ft
armoire-drawers-mirrored-door     low density (13/27) | thin 4,6
```

---

## 3. Image audit

| Tier | Count | State |
|---|---|---|
| **P1** — published, no image, not recoverable | **0** | resolved by Sprint 46 (was 85) |
| **P2** — unpublished, no image, parked source URL | **154** | recoverable via `migrate-images-to-r2` / re-scrape |
| ex-P1 — unpublished, no image, no parked URL | **85** | need net-net images before they can republish |
| **P3** — published image URL that 404s | **unknown** | needs a live HTTP check — see below |

Refreshed review list: **`missing-images-review-2026-07-23.csv`** (239 rows;
`slug, published, recoverable_via_parked_source_url`).

**Broken-image check (§5.2) could NOT run here.** All 876 URLs are well-formed on the single R2
host, so "broken" = the object no longer serves, which needs a network HTTP check of each URL.
The Cowork cloud sandbox has no such network path (WebFetch rejects image binaries; device shell
has no network; the web policy forbids curl/wget). Run the Appendix-D script natively (Claude
Code / your terminal / CI) to append any 404s as P3.

---

## 4. What's next — and why the rewrite pass isn't a sandbox job

The **audit is done and clean**; the **rewrite pass (Run 1) is not something this cloud session
should run.** Per the brief's own §6, Run 1 is an autonomous, native Claude-Code loop needing
Postgres, `next build`, network, and a 3-vote adversarial verify across ~411 published flagged
plans — and its §7/`CLAUDE.md` §6 explicitly bar editing content from this sandbox's bash mount
(it has corrupted source files) and running git against the repo here. Forcing it here risks the
exact patch-index / corrupted-write incidents the brief documents.

**Recommended next step:** run **Run 1 natively** (Claude Code on your machine), pointed at this
ledger. It's resumable per-batch, so it can go in sittings. Priority order the ledger already
encodes: the **2 missing-cut-step** plans and **15 unplaced-structural-stock** plans first (a
builder only discovers those at the end), then the density/thin/untraceable long tail.

If you'd rather stage it from here first, I can (all read-only, no content writes): export the
full worst-first published queue as a CSV, or draft the exact native Claude-Code kickoff
commands + batch plan. Just say which.

*No production seed is implied by anything in this report — content only reaches prod via the
manual seed, and nothing here changed content.*
