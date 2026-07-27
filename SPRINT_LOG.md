<!-- AGENT-INDEX-V1 -->
# Sprint Log

> **Append-only sprint history — this is the record of what happened, NOT current state.** For current catalog/stack/launch reality read `CLAUDE.md` §6; for roadmap/phase status read `BUILD_PLAN.md` §4. Each sprint is one `## Sprint N` section (attempts + final score + scorecard breakdown + commit SHAs), per the §7 loop.
>
> **Latest logged: Sprint 74 (2026-07-27) — CLOSED 98/100** — retire stale wasteFactor / schema v3. Suite: 1344 green.
>
> **Milestones:** … · shell 67–72 ✅ · Sprint 73 ✅ · Sprint 74 ✅. Suite: 1344 green.
>
> **Compaction (Sprint 75):** Sprints 65–74 retain full detail; Sprints 0–64 and non-sprint history sections are one line each. Newest-first throughout.

---

## Sprint 74: Retire stale wasteFactor (schema v3)
**Dates:** 2026-07-27
**Scope:** BUILD_PLAN §4 Sprint 74 — zero stored `wasteFactor===0.15` via schema bump; estimate path only.

### Attempt 1 — score 98/100 — PASS
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | v2→v3 zeroes only `0.15`; non-default left; v1→v3; cut-plan untouched; no D3/D5/D7; DECISIONS entry |
| Correctness & functionality (/20) | 18 | verify-52 upgraded total **1.17** (= fresh); v3 deliberate 0.15 preserved; Part C viewport still open (−2) |
| Automated test coverage (/15) | 15 | `board-designer-schema-v3` + serialize/v2-migration updates; suite **1344/1344** / 118 |
| Security (/15) | 15 | parse never throws; invalid rows skipped in backfill; no secrets |
| Code quality (/10) | 10 | shared v2/v3 body schema; `STALE_DEFAULT_WASTE_FACTOR`; dry-run backfill via `parseConfig` |
| Mobile/offline (/10) | 10 | On-read upgrade hits print + shopping + narrow; designer still desktop-only (D6) |
| Documentation & handoff (/5) | 5 | DECISIONS + BUILD_PLAN + PowerShell dry-run for Keagan |

**Reasoning (schema bump vs script):** Agreed with Keagan — on-read v2→v3 covers every load with no prod script and records the meaning change. Optional `scripts/migrate-board-design-v3.ts` is tidiness only (dry-run default; agent did **not** run against prod).

**Keagan PowerShell (dry run first, then real):**
```
npx dotenv -e .env.local -- npx tsx scripts/migrate-board-design-v3.ts
npx dotenv -e .env.local -- npx tsx scripts/migrate-board-design-v3.ts --yes
```

**Still open (Part C):** sticky/preview/dock viewport; 2D rotate/export; Save a copy E2E + ownership gate — not measured (designer requires auth; no layout session).

Score: **98/100** — Pass.

---

---

## Sprint 73: Material-math rework (D1 / A1–A4)
**Dates:** 2026-07-26 → 2026-07-27
**Scope:** BUILD_PLAN §4 Sprint 73 — computed cut allowance; estimate path only.

### Attempt 1 — self-score 98/100; Keagan prod **90/100** — FAIL magnitude
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | planeBuffer · (n−1)×kerf · waste=defects/snipe · cut-plan wasteFactor:0 held · no D3/D5/D7 |
| Correctness & functionality (/20) | 10 | Schema/coalesce/cut-plan OK; **volume ~70–82%** on verify-52/51 (D1 wants ~29%/~~14%) — plane on W×L×T × 15% waste (−10) |
| Automated test coverage (/15) | 12 | strip-stack unit ratio only; did not assert **volume** overage (−3) |
| Security (/15) | 15 | planeBuffer z 0–1; no new routes/secrets |
| Code quality (/10) | 10 | `lumber-allowance.ts`; history coalesce for planeBuffer |
| Mobile/offline (/10) | 10 | Math surfaces on print + narrow read-only |
| Documentation & handoff (/5) | 5 | DECISIONS schedule · BUILD_PLAN · scorecard |

Tip `8b439fd`. Keagan: estimate 1.67 > cut-plan buy 1.50 on verify-52.

### Attempt 2 — score 98/100 — PASS
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | Glue-up axes only (strip W + end-grain rows); no T/edge-L plane; `wasteFactor` default **0** (was covering planing); cut-plan `wasteFactor:0` held |
| Correctness & functionality (/20) | 18 | 12×1″ / 5×2″ **volume** ~29%/~~14%; edge verify-52 ~18.8% (<50%); est 1.17 < buy 1.50; Part E still open (−2) |
| Automated test coverage (/15) | 15 | Geometry-spelled volume assertions + edge sanity; suite **1338/1338** / 117 |
| Security (/15) | 15 | Bounds unchanged; no new routes/secrets |
| Code quality (/10) | 10 | Compounding rationale in `panelStockDims`; templates default documented |
| Mobile/offline (/10) | 10 | Print + narrow read-only numbers |
| Documentation & handoff (/5) | 5 | BUILD_PLAN · this Attempt 2 · residual flag below |

**Root cause (A1):** `planeBuffer` on width **and** length **and** thickness, then `×(1+0.15)` — 0.175/0.75 alone is +23%.

**Residual (presentation, not decided):** cut plan = boards-to-buy; shopping = board feet. After calibration, verify-52 (waste 0): estimate **1.17** bd ft vs buy **1.50** (2×8ft @ ¾×1½). Gap from finished-cross-section packing vs strip-stack stock width — still two answers; left alone.

**Still open (Part E):** sticky/preview/dock viewport; 2D rotate/export; Save a copy E2E — not measured.

Score: **98/100** — Pass.

---

---

## Shell IA post-close audit
**Dates:** 2026-07-26
**Scope:** Second-pass verification of BUILD_PLAN §4 Sprints 67–72 after TRACK CLOSED. No new §4 scope.

### Attempt 1 — PASS (fix-forward) — tip `c1a9867`
| Finding | Severity | Fix |
|---|---|---|
| `dockTab` only synced from top-bar `setGrain` — template load / undo / redo / reset could leave Pattern active with tab hidden → empty dock | bug | `useEffect` on `config.grain` → `dockTabForGrain` |
| Cut plan tab badge used default stock; panel used local `stockLengthIn`/`stockWidthIn` | bug | Stock state lifted into `DesignerDock`; badge + `OptimizerPanel` share it |
| 2D 90°/270° CSS rotate clipped non-square boards (`overflow-hidden`; export already swapped W/H) | bug | `overflow-visible` + aspect-aware host `minHeight` |
| `copyBoardDesignAction` did not verify owned `designId` before create | gap | `getDesign(designId)` ownership gate; foreign → `/designer` |
| Top-bar order shopping/copy/Save vs FINAL_LAYOUT | nit | Save → Save a copy → shopping |

**Evidence:** suite **1326/1326** / 115 files; typecheck + lint green; authz tests for copy foreign/owned/rate-limit; shell + parity guards. SHA: `c1a9867` (+ docs commit on `main`).

Keagan prod signed-in verify at `ff5eb81`: four of five Attempt-1 fixes confirmed (grain→dock toggle+redo, stock in dock, mounted-hidden panels, FINAL_LAYOUT order). **93/100** before Attempt 2 — two missed defects + docs contradiction.

### Attempt 2 — score 97/100 — PASS (fix pass A–D)
| Finding | Severity | Fix |
|---|---|---|
| A. `strip.label` unused in cut plan / print / shopping by-plan | bug | `toParts` → `stripDisplayName`; print Label column; `designMaterialLineName` on by-plan design lines |
| B. Undo-to-bottom emptied Name (HISTORY_CAP dropped loaded seed; empty name in mid-stack) | bug | `HistoryState.baseline` + `trimPast` keeps loaded design as undo floor |
| C. Metrics finished size used letter `x`; top bar used `×` | nit | Metrics → `×` |
| D. DECISIONS_LOG upgrade-programme entry had merge conflict markers + D2 stale pro-pricing bullets + D1 “Sprint 65” mislabel | docs | Resolve conflict (keep both programme + shell IA entries); delete four stale D2 bullets; renumber D1 |

**Empty name → database?** **No data loss path.** `parseConfig` / zod require `name.min(1)`; `updateBoardDesignAction` / `createBoardDesignAction` bounce invalid config before write. Empty name can exist only in in-memory history present (UX bug, now floored by baseline). Did not Save over a real design to prove — schema gate is the proof.

**Part E:** No Sprint 73+; D3/D5/D7 gated — no scaffold.

**Part F — still open (not verified this pass):** sticky/preview/dock live viewport numbers; 2D rotate clip + PNG export in browser; Save a copy E2E + second-account ownership. No `next dev` / measurable viewport in this agent session (`innerWidth` unavailable).

| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | A–D delivered; E no new features; F left open |
| Correctness & functionality (/20) | 17 | Unit + history/toParts/print/shopping tests; empty-name DB-safe; Part F browser −3 |
| Automated test coverage (/15) | 15 | toParts labels · history baseline/undo-to-bottom · print labels · design-shopping-label · suite 1331 |
| Security (/15) | 15 | Empty name rejected pre-write; copy ownership gate retained; conflict markers removed from DECISIONS_LOG |
| Code quality (/10) | 10 | Shared `stripDisplayName`; baseline outside cap drop |
| Mobile/offline (/10) | 10 | Print Label column (yard sheet); designer still desktop-only |
| Documentation & handoff (/5) | 5 | DECISIONS_LOG D1/D2 hygiene + this scorecard |

Score: **97/100** — Pass. Suite **1331/1331** / 116 files.

---

---

## Sprint 72: Save a copy
**Dates:** 2026-07-26
**Scope:** BUILD_PLAN §4 Sprint 72 — dirty in-memory copy → new design.

### Attempt 1 — score 98/100 — PASS
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | copyAction · Copy of name · disabled sans designId |
| Correctness & functionality (/20) | 18 | Unit + shell wiring; signed-in prod copy not re-run (−2) |
| Automated test coverage (/15) | 15 | copy-design-name · shell Sprint 72 · 1322 |
| Security (/15) | 15 | guardAction + rate-limit · session createDesign |
| Code quality (/10) | 10 | Sibling form; copy-name helper |
| Mobile/offline (/10) | 10 | Narrow untouched |
| Documentation & handoff (/5) | 5 | BUILD_PLAN track closed |

Score: **98/100** — Pass. Shell IA track closed. Post-close audit added ownership gate (`c1a9867`).

---

---

## Sprint 71: 2D + rotate
**Dates:** 2026-07-26
**Scope:** BUILD_PLAN §4 Sprint 71 — 3D/2D toggle, view-only rotate, 2D export.

### Attempt 1 — score 97/100 — PASS
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | 3D default · 2D diagram · view-only rotate · 2D PNG |
| Correctness & functionality (/20) | 17 | Suite; browser rotate/export not re-run (−3) |
| Automated test coverage (/15) | 15 | board-preview source guards |
| Security (/15) | 15 | UI-only mode/rotation |
| Code quality (/10) | 10 | No new renderer dep |
| Mobile/offline (/10) | 10 | Narrow untouched |
| Documentation & handoff (/5) | 5 | BUILD_PLAN + this entry |

Score: **97/100** — Pass.

---

---

## Sprint 70: Literacy
**Dates:** 2026-07-26
**Scope:** BUILD_PLAN §4 Sprint 70 — field hints + unit suffixes.

### Attempt 1 — score 98/100 — PASS
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | Kerf/waste help · unit/count labels |
| Correctness & functionality (/20) | 18 | Suite; browser literacy skim not re-run (−2) |
| Automated test coverage (/15) | 15 | designer-shell Sprint 70 guard · 1319 |
| Security (/15) | 15 | Display-only copy |
| Code quality (/10) | 10 | Shared FieldHint |
| Mobile/offline (/10) | 10 | Narrow untouched |
| Documentation & handoff (/5) | 5 | BUILD_PLAN + this entry |

Score: **98/100** — Pass. IA track DoD with 69. Next: Sprint 71.

---

---

## Sprint 69: Strip directory
**Dates:** 2026-07-26
**Scope:** BUILD_PLAN §4 Sprint 69 — optional strip.label, directory UI, selected detail.

### Attempt 1 — score 97/100 — PASS
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | label optional · directory+detail · P5–P7 kept |
| Correctness & functionality (/20) | 17 | Suite/serialize/history; browser rename round-trip not re-run (−3) |
| Automated test coverage (/15) | 15 | serialize/history/display/strip-drag/shell · 1318 |
| Security (/15) | 15 | Additive schema only |
| Code quality (/10) | 10 | strip-display helper; coalesce label |
| Mobile/offline (/10) | 10 | Narrow untouched |
| Documentation & handoff (/5) | 5 | BUILD_PLAN + this entry |

Score: **97/100** — Pass. Next: Sprint 70.

---

---

## Sprint 68: Dock behavior + parity lock
**Dates:** 2026-07-26
**Scope:** BUILD_PLAN §4 Sprint 68 — badges, cut plan expanded, parity test, dock stay mounted.

### Attempt 1 — score 98/100 — PASS
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | Expanded cut plan · badges · parity test · Pattern hide on edge |
| Correctness & functionality (/20) | 18 | Badge + impossible helpers; browser sticky census still open (−2) |
| Automated test coverage (/15) | 15 | `designer-shell-parity.test.ts` · suite 1312/114 |
| Security (/15) | 15 | No new trust boundary |
| Code quality (/10) | 10 | `cutPlanHasImpossible`; OptimizerPanel section not details |
| Mobile/offline (/10) | 10 | Narrow untouched |
| Documentation & handoff (/5) | 5 | BUILD_PLAN + this entry |

Score: **98/100** — Pass. Next: Sprint 69.

---

---

## Sprint 67: Designer shell relocate
**Dates:** 2026-07-26
**Scope:** BUILD_PLAN §4 Sprint 67 agent contract — top bar, Board settings ⋯, sticky preview+dock, full dock panels mounted/hidden, preview caps, surplus width → right rail, grain→Templates. No badges/2D/Save-a-copy/strip.label.

### Attempt 1 — score 96/100 — PASS
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | DO complete; DONT held; Settings card removed from right rail |
| Correctness & functionality (/20) | 16 | Suite + dockTabForGrain; sticky/ultrawide browser census not re-run this attempt (−4) |
| Automated test coverage (/15) | 15 | `designer-shell` Sprint 67 case + `dockTabForGrain`; suite 1309 |
| Security (/15) | 15 | Shopping sibling form; Save via `form=` attr; no nested forms; no client userId |
| Code quality (/10) | 10 | RowPatternEditor extracted; single relocate; no three.js static import |
| Mobile/offline (/10) | 10 | Narrow untouched (Sprint 54 gate) |
| Documentation & handoff (/5) | 5 | BUILD_PLAN 67 ✅ · this entry |

Score: **96/100** — Pass. Next: Sprint 68 (dock behavior + parity lock).

---

Every sprint's outcome, in order. Use one entry per sprint, including
every remediation attempt, per `BUILD_PLAN.md` §7. No sprint entry is
complete without its full scorecard breakdown.

Entry template:

```

---

## Sprint 66: orphaned stream container + drag coverage
**Dates:** 2026-07-26
**Scope:** Part A characterize/fix orphaned React stream `S:` bags · Part B pointer-drag handler tests · Part C next BUILD_PLAN §4 item (or idle). Trunk-based to `main`.
**Status:** CLOSED (Attempt 2)
**Part C (next §4 item):** **none** — every BUILD_PLAN §4 shippable row through Sprint 65 is closed; remaining open follow-ups are Keagan-owned (dark re-palette uncommissioned, Clerk prod keys, launch blockers) or BUSINESS_PLAN-absent / deferred contract changes (true hex lattice, Canva-like 5b). No invented scope.
**Commits on `main`:** `15fa502` (Attempt 1) · `9c6a038` (Attempt 2)
**/designer First Load JS:** **123 kB** (held).
**Suite:** **1307/1307** across 113 files (Attempt 2).
**CI:** https://github.com/klatar200/Woodworking-Plan/actions/runs/30212607663 success.
**Vercel:** Production deploy `9c6a038` success.

### Part A — Attempt 1 (corrected)
**Trigger (one sentence):** When an App Router Suspense boundary from route `loading.tsx` streams under React’s postponed opener `<!--$~-->`, `$RC` silently no-ops and leaves `div#S:N` holding a full page copy beside the already-visible tree.

**Nonce:** SETTLED — not CSP. **0** unnonced inline scripts on prod (243 scripts / 4 routes in Attempt-2 verify).

**Attempt 1 shipped:** deleted null root `loading.tsx`; skeletons dropped `<main>`. **`/designer/*` went clean** (1 main, 88 buttons). **`/browse` was NOT fixed** — route `loading.tsx` still wrapped the catalog; prod hard-reload at `15fa502` still showed 2 mains, 2× `$~`, ~101 KB orphan bag with the *resolved* catalog (not the skeleton). fetch()/headless-after-idle looked clean; **only a real browser load (esp. signed-in / slow first flush) shows the stuck orphan.**

**Route difference:** `/designer/*` had no route `loading.tsx` → Attempt 1 enough. `/browse` + `/plans/[slug]` kept route `loading.tsx` → still postponed. Skeleton-without-`<main>` does not help when the orphan holds the resolved page.

### Attempt 1 — score corrected to **90/100** (prod verify)
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 22 | A/B/C done, but close report over-claimed browse fixed. **−3** |
| Correctness & functionality (/20) | 14 | Designer PASS; browse FAIL on prod hard reload. **−6** |
| Automated test coverage (/15) | 15 | drag + stream-orphan (Attempt 1) |
| Security (/15) | 15 | Nonce settled |
| Code quality & simplicity (/10) | 9 | Partial mitigation only for browse |
| Mobile/offline behavior (/10) | 10 | — |
| Documentation & handoff (/5) | 5 | — |
| **Total (/100)** | **90** | |

### Attempt 2 — fix pass (delete route loading.tsx)
**Fix:** Delete `src/app/browse/loading.tsx` and `src/app/plans/[slug]/loading.tsx` so those pages ship in the first flush (Next #94750 workaround — same as designer).

**Detector:** `tests/main-landmark.test.ts` (exactly one `<main` in content page sources). Streaming orphans are invisible to fetch/static suite — browser census is `scripts/smoke-stream-dom.mjs` / `npm run smoke:stream-dom`.

**Framework residue:** With route `loading.tsx` removed on catalog/plan/designer, the stuck full-page orphan should not recur on those routes. Other Suspense (Clerk islands, selective hydration) may still emit empty/`$?` bags; those are not a second `<main>`. Verdict **framework-unfixable only if a route still needs `loading.tsx` and hits `$~`** — we chose no-skeleton over that risk for browse/plans.

### Attempt 2 — score
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | Browse/plans loading deleted; report corrected; browser census script + source detector |
| Correctness & functionality (/20) | 19 | Chrome hard-path census on tip: `/`, `/browse`, filters, pagination, `/plans/*` → **1 main, 0 `$~`, 0 bags** (throttled early+late). Pre-fix throttled `/browse` had `$~`+71 KB bag. **−1**: signed-in `/designer`/`/saved`/`/shopping-list` not re-measured here (Clerk OAuth; Attempt-1 designer already 1 main) |
| Automated test coverage (/15) | 15 | `main-landmark` · updated `stream-orphan` · suite **1307** |
| Security (/15) | 15 | Nonce unchanged/confirmed |
| Code quality & simplicity (/10) | 10 | Delete loading vs half-mitigation; smoke script documented |
| Mobile/offline behavior (/10) | 10 | Landmark census; offline untouched |
| Documentation & handoff (/5) | 5 | Corrected Attempt 1 + route difference |
| **Total (/100)** | **99** | |

**Result:** Pass (≥95)

### Browser census (Chrome headless, prod `9c6a038`, signed out, 2026-07-26)

| Route | mains | `$~` | largest `S:` bag |
|---|---|---|---|
| `/` | 1 | 0 | none |
| `/browse` | 1 | 0 | none (was 2 mains / ~101 KB orphan at `15fa502`) |
| `/browse?page=2` | 1 | 0 | none |
| `/browse?difficulty=1` | 1 | 0 | none |
| `/plans/x-leg-tv-stand` | 1 | 0 | none |
| `/designer`, `/designer/library`, `/saved`, `/shopping-list` | 0 (Clerk sign-in shell, signed out) | 0 | none |

Throttled early snapshot on `/browse` after fix: still 1 main / 0 bags (pre-fix same throttle: 2× `$~` + 71 KB `S:1` with a `<main>`).

### Final outcome (Attempt 2)
Score: **99/100**. Browse/plans match designer: no route `loading.tsx`.

---

---

## Sprint 65: U7 remainder — library thumbnails + strip drag reorder
**Dates:** 2026-07-26
**Scope:** Part 0 S64 Attempt-2 verify · library thumbnails from config · `reorder-strip` + drag · shopping-list footer copy. Trunk-based to `main`.
**Status:** CLOSED
**Commits on `main`:** `72afc4c` (Part 0) · `3538a26` (code) · `423fb0e` (close) · `e47448b` (Attempt 2 a11y fix)
**/designer First Load JS:** **123 kB** (was 122; +1 from strip-list pointer drag client — library thumbs are SSR, `/designer/library` **106 kB**).
**Suite:** **1251/1251** across 110 files (Attempt 2).
**CI:** Attempt 1 code https://github.com/klatar200/Woodworking-Plan/actions/runs/30210398689 · Attempt 2 tip https://github.com/klatar200/Woodworking-Plan/actions/runs/30211158680 success.
**Vercel:** Production deploy for Attempt 2 tip success (includes `e47448b` a11y fix).

### Attempt 1 — score 96/100 — PASS
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | Thumbs from config via `layoutTopFace`/`calculateMetrics` (no R2/store); `MAX_THUMB_CELLS=500` + visible degrade; `reorder-strip` one undo; arrows kept; footer neutral; share/species out |
| Correctness & functionality (/20) | 16 | Unit+source verified (cells/colours, over-budget placeholder, parse fail keeps rows, one drag=one undo, OOB no-op, past snapshot clone). **−4**: browser checks unrun (Clerk OAuth) |
| Automated test coverage (/15) | 15 | `library-thumb.test.tsx` · `designer-history` reorder suite · footer source guard; suite **1247** |
| Security (/15) | 15 | `/designer` still off public-routes + in `NEVER_CACHE`; no `img-src`/`remotePatterns`; thumbnails never throw; no stored hostile bytes |
| Code quality & simplicity (/10) | 10 | No layout fork; pointer events only (no DnD lib); budget rationale in comment |
| Mobile/offline behavior (/10) | 10 | Offline denylist unchanged / green; drag has AT path via existing buttons + `aria-live` |
| Documentation & handoff (/5) | 5 | This entry + BUILD_PLAN §4; First Load noted |
| **Total (/100)** | **96** | |

### Browser checks (unrun — Clerk blocks agent OAuth)
1. `/designer/library` thumbnail per design, both themes — **UNRUN**
2. Over-budget design degrades visibly — **UNRUN** (source+unit PASS)
3. Drag reorder; one undo restores — **UNRUN** (unit PASS)
4. Arrow buttons still work — **UNRUN** (unit PASS)
5. **Carried over:** print view miter offcut note (`designer/[id]/print` gate) — **UNRUN** (source-verified only)

### Final outcome
Score: **96/100** — Pass. U7 remainder (thumbs + drag) closed.

### Sprint 65 Attempt 2 — prod verification (Claude Code, signed in, 2026-07-26) → **94/100** then fix

Verified on prod at `3538a26`. Thumbnails, degradation, arrows, single-step undo, footer, and the carried-over miter print offcut note all PASS. Two a11y defects: inert drag-handle tab stop; live region empty after reorder.

`verify-65` is a Claude Code test fixture (540 cells, mitered, non-closing by design) and may be deleted once the thumbnail budget has a unit test covering it (it does — `library-thumb.test.tsx` over-budget case).

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Thumbnails render | PASS | `verify-51` 96 rects `viewBox 0 0 18 12`; `verify-52` 7 rects `0 0 18 10.5` |
| 2 | Over-budget degrades | PASS | `verify-65`, 540 cells → no SVG, "Too many pieces to preview", row still openable |
| 3 | Miter print offcut note | PASS | Renders on `verify-65`; Miter column `Walnut · 30° · Top right` (carried since Sprint 61) |
| 4 | Arrow buttons still reorder | PASS | `[M,W,M,W]` → `[W,M,M,W]` |
| 5 | One undo restores | PASS | One click restores; Undo then disabled — exactly one history entry |
| 6 | Footer copy | PASS | `summed across everything on this list` |
| 7 | Pointer drag | NOT MEASURED | Synthetic drag emits no intermediate `pointermove`; no reorder and no history entry resulted |
| 8 | Handle keyboard-operable | **FAIL** | Focusable `<button>`, Enter is a no-op |
| 9 | Reorder announced | **FAIL** | Sole `aria-live="polite"` node empty after a completed move |

**Attempt-1 score corrected to 94/100** (two a11y defects on prod). Fix below.

### Attempt 2 — fix pass score (after a11y fix)

| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | 25 | Same U7 remainder; a11y fix chooses pointer-only handle (arrows = SC 2.1.1) + announce on all reorder commits |
| Correctness & functionality (/20) | 18 | Prod verify table PASS on 1–6 + miter note; fixes 8–9 in code. **−2**: pointer drag NOT MEASURED (synthetic pointermove gap) |
| Automated test coverage (/15) | 15 | `strip-reorder-a11y.test.ts` (tabIndex/−1, announce copy, no-op silent); history reorder suite still green |
| Security (/15) | 15 | Unchanged private `/designer` surface |
| Code quality & simplicity (/10) | 10 | Pure `strip-reorder-announce.ts`; no grab-mode half-build |
| Mobile/offline behavior (/10) | 10 | Offline denylist unchanged; keyboard path via arrows |
| Documentation & handoff (/5) | 5 | This verification table + re-score |
| **Total (/100)** | **98** | |

**Result:** Pass (≥95)

### Final outcome (Attempt 2)
Score: **98/100** — Pass. Inert drag handle removed from tab order; reorder announces on drag/arrows/undo.

### Sprint 65 Attempt 2 — browser re-verify (Claude Code, prod, `e47448b`, signed in, 2026-07-26)

| # | Check | Result | Evidence (prod, `e47448b`, signed in) |
|---|---|---|---|
| 1 | Handle out of tab order | PASS | All 24 handles `<button type="button" tabindex="-1" aria-hidden="true">⋮⋮` |
| 2 | Arrow move announces | PASS | `Hard Maple moved to position 2 of 12`, cleared at ~1.5 s |
| 3 | Undo announces | PASS | `Walnut moved to position 2 of 12` — describes resulting state |
| 4 | Redo announces | PASS | `Hard Maple moved to position 2 of 12` |
| 5 | Arrows still reorder | PASS | `[M,W,M,W]` → `[W,M,M,W]`, restored exactly through undo/redo/undo |
| 6 | One history entry per move | PASS | Single undo restores; Undo then disabled, Redo enabled |
| 7 | Pointer drag | NOT MEASURED | Tooling cannot emit intermediate `pointermove`; see Sprint 66 Part B |
| 8 | Duplicate `<main>` | NEW FINDING | 2 mains / 172 buttons after hard reload; see Sprint 66 Part A |

**98/100 confirmed** on Attempt 2 a11y fixes. Carry-overs → Sprint 66.

---

---

## Sprints 0–64 and non-sprint history (compacted)

- Sprint 64 — U6 — cut optimizer panel + shopping-list push — 96/100 — Cut plan optimizer panel + designer shopping-list push.
- Sprint 63 — Closure is geometric, not chromatic — 96/100 — wedgeWebContinuous replaces species equality for geometric closure.
- Sprint 62 — Make the skip note reachable or delete it, and correct the record — 96/100 — Deleted unreachable skip-note gate; reachability witness suite.
- Sprint 61 — Close the gaps — 93/100 — Close silent save-loss path; browser re-score after skip-note gap.
- Sprint 60 — Dimension display — make every measurement a measurement — 96/100 — formatInches guards; closingThicknessHint; harlequin thicknessIn=1.
- Sprint 59 — Correct the miter template (harlequin) + hex honesty — 90/100 — Rename hexagon→harlequin; closing t=w·secθ; speciesComponents.
- Sprint 58 — Mitered strips (hexagon family) — 82/100 — Miter geometry + hexagon template; incorrect on prod — reopened as Sprint 59.
- Sprint 57 — Species dropdown + multi-panel board model — 99/100 — Species dropdown + multi-panel schemaVersion:2; new templates.
- Sprint 56 — Species expansion — 96/100 — Appended seven species ids; pairwise floor 0.127; First Load 115 kB.
- Sprint 55 — Designer undo/redo — 95/100 — In-memory undo/redo (cap 50); coalesce typed fields; Ctrl/Cmd+Z.
- Sprint 54 — Desktop-only designer + mobile plan/cut list — 98/100 — Desktop-only designer lg gate; mobile plan/cut list notices.
- Sprint 53 — Designer layout & chrome — 98/100 — Designer layout & chrome; sticky preview; strip controls.
- Sprint 52 — Cutting Board Designer 3D + print/hard nav (U4–U5) — 100/100 — Cutting Board Designer 3D + print/hard nav (U4–U5).
- Sprint 51 — Cutting Board Designer foundation (U1–U3) — 100/100 — Cutting Board Designer foundation (U1–U3).
- Sprint 50 — /browse single left filter rail — not scored — /browse single left filter rail.
- Sprint 49 — Navbar Browse → Plans — not scored — Navbar Browse → Plans.
- Sprint 48 — Catalog page size default 24 — not scored — Catalog page size default 24.
- Sprint 47 — Settings hub — not scored — Settings hub + profile fields migration.
- Catalog swap — ana-white → Kreg (2026-07-23) [content migration, not a numbered sprint] — not scored — Full ana-white → Kreg catalog swap; 1128 plans; images to R2 webp.
- Sprint 46 — Catalog UX + Oak & Forest authority (A1) + runtime step formatting — 96/100 — Catalog UX batch; Oak & Forest authority; imageless plans unpublished; runtime step formatting.
- Sprint 45 — Notch rebrand, part 3: docs truth pass + logo assets — 96/100 — Notch rebrand part 3: docs truth pass + logo assets.
- Sprint 44 — Notch rebrand, part 2: the Oak & Forest light palette — 97/100 — Notch rebrand part 2: Oak & Forest light palette.
- Sprint 43 — Notch rebrand, part 1: name & identity swap (zero color change) — 97/100 — Notch rebrand part 1: name & identity swap (zero color change).
- Sprint 42 — Documentation truth pass + close-out (audit D1/D2/D3 docs, plan hygiene) — 99/100 — Documentation truth pass + UX remediation close-out.
- Sprint 41 — Consistency sweep: elevation tokens, dead code, cost anchor, one workshop picker — not scored — Consistency sweep: elevation tokens, dead code, cost anchor, one workshop picker.
- Sprint 40 — Landing integrity: motion you can stop, numbers that are true, one design system — 98/100 — Landing integrity: stoppable motion, true catalog numbers, one design system.
- Sprint 39 — Filter honesty and drawer manners (audit H5, M2, A6) — not scored — Filter honesty and drawer manners.
- Sprint 38 — The mid-build experience — step memory, scroll, reachable controls (audit H3, M3) — not scored — Mid-build experience — step memory, scroll, reachable controls.
- Sprint 37 — Dark mode for everyone (audit D1) — not scored — Dark mode for everyone; OS preference as no-cookie default.
- Sprint 36 — Wayfinding — nav state, live results, mobile search, PWA entry (audit A2, A5, H7, H11, H6, M4, tabpanel polish) — not scored — Wayfinding — nav state, live results, mobile search, PWA entry.
- Sprint 35 — Destructive-action confirms + shopping-list control (audit H1, H2, A4) — not scored — Destructive-action confirms + shopping-list control.
- Sprint 34 — 44px touch-target sweep (audit M1, V3) — not scored — 44px touch-target sweep.
- Sprint 33 — Light-theme AA contrast (audit A1) — not scored — Light-theme AA contrast (audit A1).
- Phases QOL-H → QOL-M + hardening + carousel fix — 2026-07-20 — shipped, CI green — QOL-H through QOL-M + hardening + carousel fix.
- 🔴 THE ANSWER TO THE QUESTION THE PILOT WAS ASKED — not scored — Pilot verdict: do NOT roll CAD part-diagrams catalog-wide.
- Phase QOL-G — Step/plan visuals: PILOT — 2026-07-19 — 96/100 — Step/plan visuals CAD pilot.
- Phase QOL-F (step 2 of 2) — Visual/motion ROLLOUT, variant A — 2026-07-19 — 96/100 — Visual/motion rollout variant A.
- Phase QOL-F (step 1 of 2) — Visual/motion MOCKUP — 2026-07-19 — not scored, by design — Visual/motion mockup checkpoint.
- Phase QOL-E — Learning paths: rename + taxonomy — 2026-07-19 — 96/100 — Learning paths rename + taxonomy.
- Phase QOL-D — Navigation & profile/settings — 2026-07-19 — 95/100 — Navigation & profile/settings IA.
- Phase QOL-C — FAQ accordion — 2026-07-19 — 97/100 — FAQ accordion.
- Phase QOL-B — Plan-detail page reorg — 2026-07-19 — 95/100 — Plan-detail page reorg.
- Phase QOL-A — Catalog filter & sort UX — 2026-07-19 — 95/100 — Catalog filter & sort UX.
- Sprint 32 — Responsive & theme hardening pass (UI migration, sprint 5 of 5 — FINAL) — 95/100 — Responsive & theme hardening pass (UI migration final).
- Sprint 31 — Light/dark theme system + toggle (UI migration, sprint 4 of 5) — 96/100 — Light/dark theme system + toggle.
- Sprint 30c — Component migration, wave 2 — the remainder (UI migration, sprint 3 of 5) — not scored — Component migration wave 2 — remainder.
- Sprint 30b — Component migration, wave 2 — filters/chips/saves/shopping/workshop/builds (UI migration, sprint 3 of 5) — 96/100 — Component migration wave 2 — filters/chips/saves/shopping/workshop/builds.
- Sprint 30a — Component migration, wave 2 — catalog + plan-detail layout (UI migration, sprint 3 of 5) — 96/100 — Component migration wave 2 — catalog + plan-detail layout.
- Sprint 29 — Component migration, wave 1 (UI migration, sprint 2 of 5) — 96/100 — Component migration wave 1 to Tailwind utilities.
- Sprint 28 — Tailwind CSS environment setup (UI migration, sprint 1 of 5) — 97/100 — Tailwind CSS environment + @theme tokens.
- Sprint 27 — Build logs ("My builds") — not scored — Build logs ("My builds") from reviews.
- Sprint 26 — Tool-aware catalog — 96/100 — Tool-aware catalog filter.
- Sprint 25 — My Workshop (owned-tools profile) — 97/100 — My Workshop owned-tools profile.
- Sprint 24 — Hardening Pass 2 — 95/100 — Hardening Pass 2 — WCAG/keyboard/OWASP after redesign.
- Sprint 23 — About / FAQ copy — not scored — About/FAQ copy drafted.
- Sprint 22 — Shopping-list redesign — 96/100 — Shopping list decoupled from saves via ShoppingListEntry.
- Prod incident (2026-07-14): Trending sort 500'd the home page — not scored — Trending sort 500 from make_interval; fixed with JS Date cutoff bind.
- Sprint 21 — Per-step tools & hardware — 96/100 — Per-step tools & materials tags.
- Sprint 20 — Plan-detail redesign — 96/100 — Plan-detail redesign.
- Sprint 19 — Sort overhaul + view tracking — 96/100 — Sort overhaul + PlanView tracking (no userId).
- Sprint 18 — Desktop catalog layout — 96/100 — Desktop catalog layout with sidebars.
- Sprint 17 — Backlog bug fixes + quick wins — 97/100 — Backlog bug fixes + quick wins; About/FAQ stubs.
- Sprint 16 — Skill-building learning paths — 97/100 — Skill-building learning paths; progress derived from reviews.
- Sprint 15 — Cut-list optimizer / board-footage calculator — 98/100 — Cut-list optimizer / board-footage calculator.
- Sprint 14 — Expanded offline mode — 98/100 — Expanded offline library; opt-in; wiped on sign-out.
- Sprint 13 — Print-friendly / offline PDF export — 97/100 — Print CSS + browser Save-as-PDF; full plan + cut-list layouts.
- Sprint 12 — Shopping list generator — 97/100 — Shopping list generator; exact-identity merge; no affiliate links.
- Sprint 11 — Personalized recommendations — 96/100 — Personalized recommendations on catalog home.
- Sprint 10 — Reviews, ratings & build photos — 97/100 — Reviews, ratings & build photos.
- Rate limiting (standalone hardening task, pre-Sprint 10) — not scored — Upstash Redis rate limiting shipped standalone before Sprint 10.
- Sprint 9 — Hardening & Launch Readiness — 95/100 — Hardening & launch readiness — a11y, perf, OWASP; rate limiting escalated.
- Sprint 8 — PWA Shell — 98/100 — PWA shell; offline caching denylist; service worker.
- Sprint 7 — Liking — 99/100 — Liking with computed-on-read counts; no denormalized like count.
- Sprint 6 — Save Plans & Custom Categories — 94/100 — Save plans & custom categories; production SavedPlan table defect remediations.
- Sprint 5 — Filter/Facet Search — 98/100 — Filter/facet search combinable with keyword search.
- Sprint 4 — Keyword Search — 95/100 — Keyword search via searchVector; prod backfill lesson learned.
- Sprint 3 — Plan Repository & Browse/Detail Views — 97/100 — Plan repository + browse/detail views with published:true filter.
- Sprint 2 — Accounts & Auth — 97/100 — Clerk auth; requireUser/getCurrentUser; public-routes allowlist.
- Sprint 1 — Plan Data Model & Content Pipeline — 98/100 — Plan Prisma schema + content JSON pipeline + idempotent seed + validator.
- Sprint 0 — Environment & Architecture — 99/100 — Scaffold Next.js + Neon + Clerk free-tier stack; Attempt 2 PASS after Attempt 1 escalate.
