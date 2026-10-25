# GO_LIVE_FIXES.md — fixes needed before go-live

The running list of problems found by audits that must be fixed (or consciously accepted) before
Notch goes live to real users. "Live" here means launch (AGENTS_CONTEXT §"Settled": real users /
monetization), not reachability — the site is already publicly reachable.

**How to use this file**
- Every audit appends its findings here. Nothing is deleted: a fixed item gets `✅ FIXED (Sprint NN)`,
  an item Keagan accepts gets `⚪ ACCEPTED (date, reason)`.
- Ids are permanent: `D-` designer, `S-` rest of the site, `O-` operational. Sprints cite them.
- Severity: **P1** wrong information, data/security risk, or a broken core flow · **P2** bug or
  misleading screen with a workaround · **P3** polish.
- `file:line` cites are as of the audit date; re-check before fixing.
- Status `❓ DECISION` = needs Keagan before work can start.

---

## O — Operational go-live checklist (already decided; collected here)

| Id | Item | Status | Source |
|---|---|---|---|
| O-01 | Rotate the Neon password and Clerk secret once, then update `.env.local` + both Vercel vars together | ⏳ deferred to pre-go-live | DECISIONS_LOG 2026-07-14 |
| O-02 | Clerk is on DEV keys on a public site — switch to production keys | ⏳ open | CLAUDE.md §6 |
| O-03 | Separate Neon dev branch (dev and prod share `sparkling-band` today) | ⏳ deferred to pre-go-live | DEPLOYMENT.md Step 5.5 |
| O-04 | Clerk deletion webhook not live until `CLERK_WEBHOOK_SIGNING_SECRET` is set in Vercel and the `user.deleted` endpoint is added in Clerk | ⏳ open | CLAUDE.md §7 |
| O-05 | Monetization of any kind (ads, affiliate, billing) requires leaving Vercel Hobby first | ⏳ gate, not a task | DECISIONS_LOG 2026-07-13 |

---

## D — Board designer (audit 2026-10-17, after Sprint 83)

| Id | Sev | Finding | Where | Status |
|---|---|---|---|---|
| D-01 | P1 | **The edge-grain build guide builds a face-grain board.** It mills stock to the board thickness and rips strips to the stripe width, then glues them flat. True edge grain mills to the stripe width, rips to the board thickness (+ flatten allowance) and turns each strip on edge. Affects the guide, print sheet and cut-plan thickness for every edge-grain design (Classic stripe, Butcher block, Accent stripe). | `src/lib/board-designer/build-steps.ts:112`, `:214` | ❓ DECISION — fix to true edge grain (recommended) or relabel "Edge" as face/long grain |
| D-02 | P1 | **Mitered designs under-buy wood.** Board feet count only the wedge share of each partner strip, but the cut list cuts a full partner. Harlequin: metrics + shopping list 2.84 bd ft vs 5.12 bd ft actually cut. The caveat appears only on the print sheet. | `src/lib/board-designer/design-board-feet.ts:83`; `src/app/designer/[id]/print/page.tsx` | open |
| D-03 | P1 | **Board feet ignore stock thickness.** The shopping list shows "Hard Maple 2.12 board feet" with no thickness (Checkerboard needs 8/4). Board feet per species sum stock of different thicknesses (Plaid's 1¾″ and ¼″ purpleheart), and the shopping list merges them across designs. | `src/lib/shopping-list.ts:426`; `design-board-feet.ts:137` | open |
| D-04 | P1 | **No thickness or trim allowance (the open D1 question).** "Mill to 1½, flatten to 1½"; edge grain "crosscut to 18, square both ends"; end grain trims the outer strips; the cut plan buys stock at finished thickness. | `lumber-allowance.ts`, `build-steps.ts`, `cut-optimizer` | ❓ DECISION (D1) |
| D-05 | P2 | An off-grid panel thickness (e.g. 1.3) or miter angle (22.25°) leaves Save enabled with no blockers, but the browser's own form validation blocks the save. Verified live: form invalid while Save enabled. Strip width snaps to 1/16″ on blur; panel thickness and angle do not. | `src/components/designer/panel-editor.tsx:208`; `strip-list.tsx:545` | open |
| D-06 | P2 | No print-sheet link on desktop — the only link is in the phone-only view. Verified live. | `src/components/designer/designer-narrow.tsx:119` | open |
| D-07 | P2 | Build Plan, Add to shopping list and Print read the last-saved design while the editor shows unsaved edits; nothing prompts to save first. | `src/components/designer/designer-shell.tsx:177`, `:266` | open |
| D-08 | P2 | A mitered design switched to edge grain still draws wedges, lists partner strips and the composite step, with no warning — contradicting "Miters only apply to end-grain boards". | `src/lib/board-designer/layout.ts:116`; `cut-pieces.ts:65` | open |
| D-09 | P2 | False warnings and a wrong size: an unused panel of a different width raises "Panels must be the same width" and marks the design incomplete; if that panel is first, the finished length uses its width (measured 4″ for a 3″ board); a row count shorter than the pattern says a panel "is not in the row pattern" when it is. | `src/lib/board-designer/panel-geometry.ts:89`, `:94`, `:111` | open |
| D-10 | P2 | Print sheet lists unused panels with 0″ cut lengths, can print a raw species id, and neither print nor Build Plan shows the design's warnings. | `src/app/designer/[id]/print/page.tsx:97`, `:134`, `:148` | open |
| D-11 | P2 | Row-pattern rows are keyed by panel+placement, so changing a select remounts the row and keyboard users lose focus after one arrow press. | `src/components/designer/row-pattern-editor.tsx:59` | open |
| D-12 | P2 | Saving a design deleted in another tab silently writes nothing (`updateMany` → 0 rows) and lands on a 404; the unsaved draft is stranded. | `src/lib/board-designs.ts:111` | open |
| D-13 | P3 | Plane buffer field steps by 0.025″; 0.025 makes the guide say "Rip each strip 0″ over". | `src/components/designer/board-settings.tsx:187` | open |
| D-14 | P3 | Closing-thickness hint prints "22.5°" instead of "22½°" (`formatMiterAngle`). | `src/lib/board-designer/miter-geometry.ts:69` | open |
| D-15 | P3 | A name of only spaces saves, leaving a blank link in Saved Boards. | `src/lib/board-designer/serialize.ts:58` | open |
| D-16 | P3 | Saved Boards "Updated" date is formatted on the server (UTC, en-US) — evening saves in US time zones show the next day. | `src/app/designer/library/page.tsx:47` | open |
| D-17 | P3 | Legacy v1 designs bypass current limits on migration (one loads with 384 rows); the only save blocker then says "undo your last change". | `src/lib/board-designer/serialize.ts:225` | open |
| D-18 | P3 | Width / planer checks use exact float equality — 10 × 1.3″ = 13.000000000000002 trips a false planer warning before the width snaps. | `panel-geometry.ts:89`, `:142` | open |
| D-19 | P3 | No "Saved" confirmation after an update-save. | `designer-shell.tsx` | open |
| D-20 | P3 | Metrics warnings and save blockers are `role="alert"` and re-announce on every edit. | `metrics-panel.tsx`, `designer-shell.tsx` | open |
| D-21 | P3 | Phones cannot add a design to the shopping list. | `designer-narrow.tsx` | ⚪ known deferral (B7) |
| D-22 | P3 | "Target size" in Board Settings is not saved. | `board-settings.tsx` | ⚪ by design (Sprint 76) |

---

## S — Rest of the site (audit 2026-10-17)

Coverage: every public page fetched live (status, titles, robots, links — 102 internal links,
none broken), signed-in GETs of every private page, security headers, mobile overflow at 375px,
a static a11y pass, `npm audit --omit=dev`, and a scan of all 639 published plan files. Not
covered: Lighthouse/perf profiling, a screen-reader pass, cross-browser, and server-action
internals outside the designer/shopping list (guarded by the CLAUDE.md §7 test suite).

| Id | Sev | Finding | Where | Status |
|---|---|---|---|---|
| S-01 | P1 | **Vulnerable production dependencies.** `npm audit --omit=dev`: 1 critical, 7 high, 1 moderate. Next 15.5.20 is in range for a set of advisories (Server Actions DoS, Image Optimization RCE with AVIF, unauthenticated disclosure of server function endpoints, cache confusion); also `sharp` (libvips/libheif/librsvg), `undici`, `source-map-js`, `postcss`. Fix available via upgrade. | `package.json` | ✅ FIXED (Sprint 84) — Next 15.5.28; ⚪ ACCEPTED residual: `deepmerge-ts <8` via `@prisma/config` → `prisma` (3 high) — Prisma CLI only, build/migrate time, trusted config; `@prisma/config` pins 7.1.5 and the fix is deepmerge-ts 8 / Prisma ≥ 7.11 (major). Revisit with the Prisma 7 migration. |
| S-02 | P1 | **28 published plans have impossible cut lists.** 20 metric plans store millimetres as inches — "Back 19″ × 140″ × 775″" — so the board plan says "Buy 0 boards" and every part "does not fit". 8 imperial plans have mis-parsed thickness (e.g. `tile-headboard-queen-size` 9″-thick plywood, `kids-school-desk` 10½″, `router-table-w-tons-of-storage-woodworklife` 6¼″). All public and indexed. The 20 metric plans also duplicate imperial ones, inflating the "639 plans" headline. Needs a content guard (`content.test`: thickness ≤ 4″, length ≤ 120″). | `content/plans/*-metric.json` + the 8 listed by the scan | ✅ FIXED (Sprint 84) — 29 plans unpublished (incl. `garden-planter`), prod re-seeded (610 live), `content.test` guard. Re-publishing needs a corrected cut list (or a metric→inch decision). |
| S-03 | P1 | **No Privacy Policy or Terms of Service.** Settings → Terms says "Coming soon"; nothing in the footer or on sign-up. The site collects emails (Clerk), photos and reviews. | `src/app/settings/terms/page.tsx` | ❓ DECISION — legal copy is Keagan's |
| S-04 | P1 | **No Kreg attribution anywhere, and the FAQ says "Every plan is hand-authored"** — the catalog is imported from Kreg. | `src/app/faq/page.tsx`; site footer | ❓ DECISION — partnership terms + public copy |
| S-05 | P2 | No branded 404 or error page. Unknown URLs show Next's default "404: This page could not be found."; `/plans/<missing>` renders no heading; a runtime error outside `/designer` shows Next's default error screen (no root `not-found.tsx` / `error.tsx` / `global-error.tsx`). | `src/app/` | open |
| S-06 | P2 | `/paths` ("Learning" in the header and footer) is live with 0 paths and tells the public "If you are seeing this on a fresh database, run npm run db:seed". The browse empty state carries the same developer copy. | `src/app/paths/page.tsx:160`; `src/app/browse/page.tsx:327` | open |
| S-07 | P2 | Indexable with no SEO basics: no `robots.txt`, no `sitemap.xml`, no canonical tags, no Open Graph / Twitter tags (shared links have no preview image), no structured data. `/browse` reuses the home page's title ("Notch") and description. | `src/app/layout.tsx`, `src/lib/seo.ts` | ❓ DECISION — sitemap was "do not build" (DECISIONS_LOG, wireframe review); revisit now that `SITE_INDEXABLE=true` |
| S-08 | P2 | Contradictory catalog copy. `/browse` and About say "most with a full cut list"; About also says "Cut list … on all of them"; the manifest says "every plan with a full cut list" (true — every published plan has one). FAQ and About never mention the board designer. | `src/app/browse/page.tsx`, `src/app/about/page.tsx`, `public/manifest.webmanifest` | open (public copy → Keagan approves wording) |
| S-09 | P2 | Shopping list shows a "$" cost band even when every item is unpriced ("2 items across 1 board · $ … 2 items have no estimate") — board designs contribute `costCents: 0`. | `src/lib/shopping-list.ts` | open |
| S-10 | P3 | Private pages (`/saved`, `/builds`, `/settings/*`, `/workshop`) send `robots: index, follow` and the generic title "Notch", so tabs and history are indistinguishable. Auth-gated, so crawl risk is low. | page `metadata` | open |
| S-11 | P3 | Browse "Category" and "Time available" selects have no accessible name of their own (only a fieldset legend). | `/browse` filter form | open |
| S-12 | P3 | Every public page renders dynamically with `Cache-Control: no-store` (nonce CSP) — no CDN caching; each view is a function call plus a DB query. Fine now; watch Vercel Hobby limits at launch. | `src/middleware.ts` | ⚪ known trade-off |
| S-13 | P3 | `/api/health` is public and unthrottled and queries the database on every call. | `src/app/api/health/route.ts` | open |
| S-14 | P3 | Search accepts an unbounded query (a 3,000-character `q` is run); an out-of-range `?page` shows an empty grid with no message. | `src/app/browse/page.tsx` | open |
| S-15 | P3 | Every page logs a font-preload warning (preloaded woff2 not used within a few seconds). | `src/app/layout.tsx` | open |
| S-16 | P3 | Clerk logs "loaded with development keys" on every page. | — | see O-02 |
| S-17 | P2 | `npm run db:seed` resets `publishedAt` to "now" for every published plan on every run, so the "Newest" sort and the Trending tiebreak reshuffle each seed. | `prisma/seed.ts:103` | open (found planning Sprint 84) |
| S-18 | P2 | Garbage cut-list rows inside plausible bounds still ship, e.g. `plywood-chair-set` "See Full Plans in Extras" 0.75×48×96 and `rolling-lumber-sheet-goods-cart` "Support panels" 3×45×46. Needs a content pass (or a Kreg re-parse). | `content/plans/` | open (found in the Sprint 84 pre-flight) |
| S-19 | P1 | **The Kreg importer drops fractions from space-separated dimensions.** `parseNum` only reads `5-1/2`, so `5 1/2"` becomes **5** (`parseFloat`). About 1,400 of 4,938 published cut-list rows are whole numbers in every dimension, and in 299 plans the step text gives a fraction where the cut list has only the whole number. Examples: `one-sheet-workbench` steps say a 16 1/4″ strip, but the cut list says Shelf 16; `2-board-plant-shelf` says 47 1/4″, but its row is 47. Live cut lists, board plans and shopping quantities are wrong by up to 7/8″ per dimension. Fix: correct `parseNum` (and the nominal-lumber path at `:40-47`, which can take a stray number as a length — 32 rows not smallest→largest), then re-import from the Kreg source and re-seed. Needs the `kreg-plans.json` dump or a re-scrape. | `scripts/import-kreg-plans.mjs:19-25`, `:36`, `:40-47` | open (found by the plan-audit brief review, 2026-10-18) |

---

## C — Catalog (plan-quality audit, 2026-10-23)

Coverage: all 610 published plans, read under rubric R-2 (`docs/PLAN_QUALITY_AUDIT.md` §6). Every
Unpublish was checked by an independent verifier. Per-plan evidence is in
`audit/plan-quality/plans/<slug>.json`; the numbers and full lists are in
`audit/plan-quality/REPORT.md` §Stage 8 and `decision-lists.md`. Verdicts: **Unpublish 24 ·
Fix 433 · Ship (unverified) 93 · Ship 60** (8 of these also need human review). Not covered: tools
lists, finishing, safety/structural adequacy, and time/cost/difficulty estimates (out of scope
2026-10-18).

| Id | Sev | Finding | Where | Status |
|---|---|---|---|---|
| C-01 | P1 | **24 plans can't be built as published.** Verified Unpublish-level findings: 8 depend on content that isn't in the plan (R1), 9 have structural parts that exist nowhere (R2), and 8 stop before a part the piece needs is made or installed (R14). A plan can have more than one. Of the rest, 2 have 4+ verified Fix-level failures and 2 are Keagan's own call. List with one-line reasons: REPORT §Stage 8 "Unpublish". | `content/plans/` (24 slugs) | ✅ content done (`published:false`): 24 on 2026-10-24 + `ultimate-folding-tailgate-table` from round 2 on 2026-10-25 → 585 live — prod `db:seed` pending |
| C-02 | P1 | **Importer measurement damage (S-19 family) in 518 plans** (153 gross: 3/4″ → 3, 1×12 → 1 × 12, 7′ → 7). One importer fix plus a re-import from the Kreg source and a re-seed fixes all of them. | `scripts/import-kreg-plans.mjs:19-26`, `:36`, `:40-47` | open — same work as S-19 |
| C-03 | P1 | **Importer drops cut-row detail notes**: angles, miters, bevels, notches (e.g. kids-stepping-stool "Cut at 22.3 Degree Angle", kids-picnic-table "30 degree angled cuts"). Builders lose cut angles Kreg gives. | `scripts/import-kreg-plans.mjs` (cut-detail parse) | open — fold into the C-02 re-import |
| C-04 | P2 | **433 plans need fixes** (1–3 Fix-level failures, or an Unpublish-level finding that is only `likely`). After round 2 (2026-10-25) **418 Fix plans**. Plans failing each check (a plan can fail several): steps/cut list/materials disagree (R14) 241, fastener missing or contradictory (R6) 118, position not given (R10) 113, "as shown" with nothing shown (R11) 55, build order (R8) 42, materials short (R5) 39, part not in cut list (R2) 38, size not from a listed material (R4) 27, missing content but buildable or only `likely` (R1) 23, cut row not a used part (R3) 21. Some image-based R10/R11/R14 fails may be false: transparent diagrams were read on black (REPORT §Round 2). | `audit/plan-quality/decision-lists.md` | ❓ DECISION — fix, accept, or unpublish by type |
| C-05 | P3 | **Pocket-hole jig setting not stated** in 275 plans (R9, recorded only). One bulk content fix: state the setting per part thickness. | `content/plans/` | ❓ DECISION |
| C-06 | P3 | **Consumables used but not in materials** (glue, tape, finish…) in 241 plans. One bulk content pass. | `content/plans/` | ❓ DECISION |
| C-07 | P2 | **8 plans need a human woodworker's call** (fit clearances, board-foot stock, a mattress size, a clock-movement shaft length, whether summary steps suffice). | REPORT §Stage 8 "Human review" | ❓ DECISION |
| C-08 | P2 | **Plan images on a host the CSP blocks**: 5 published plans keep an image on `learn.kregtool.com`, not R2. `img-src` and `remotePatterns` allow only R2/Clerk/Blob, so those images can't load. Seen in the code, not yet in a browser. | `src/middleware.ts:82`, `next.config.ts:49`; 5 plans listed in REPORT | open — migrate to R2 (`migrate-images-to-r2.mjs`) or park them |
| C-09 | P3 | **93 plans ship unverified**: no failure found, but at least one check is `unknown`, mostly R5, which can't be scored when the steps don't name the stock per part. | `decision-lists.md` | open — accept or re-check |
