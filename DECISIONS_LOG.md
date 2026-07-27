<!-- AGENT-INDEX-V1 -->
# Decisions Log

> **Append-only decision record — every entry is FACT; do not re-derive or second-guess.** This index (read first) summarizes the *settled/binding* decisions; scroll to the dated entry for the full record. **Current catalog/stack/launch state is NOT here — see `CLAUDE.md` §6.** New decisions append at the bottom under a `### YYYY-MM-DD — <title>` heading.
>
> **Kreg full-catalog swap (2026-07-23):** dated entry below (added 2026-07-24); **G1 legal gate RESOLVED 2026-07-24 — Kreg partnership confirmed**.

## Settled decisions — index (date → what's binding)
- **Stack (2026-07-12):** React+Next.js · Node/TS as Next API routes (no 2nd host) · Postgres/Neon · Vercel Hobby · Clerk · Prisma. All genuine free tiers.
- **$0 during development (2026-07-12, #9):** every vendor a perpetual free tier, not a trial. Never enter a card.
- **Vercel Hobby commercial-use gate (2026-07-12):** build on Hobby; the moment ads/affiliate/billing appear, move to a commercial-use-permitted host FIRST (enforcement = suspension).
- **Trunk-based (2026-07-12):** commit straight to `main`; no branches/PRs; CI is a detector.
- **Content pipeline (2026-07-12):** version-controlled seed files + idempotent seed; no admin UI; headless CMS rejected.
- **Single DB during dev (2026-07-14):** ONE Neon branch `sparkling-band` = production; dev+prod share it on purpose. Separate dev branch = pre-go-live task. **Credentials rotate PRE-GO-LIVE only — settled, don't re-raise.**
- **Launch economics (2026-07-13; reconciled 2026-07-24):** stay on Hobby, NO monetization (no ads/affiliate/billing), $0/mo. Pricing (#7) + processor (#6) deferred; build no billing/tier-gating/limits. **No affiliate links** on the shopping list. **The move-off-Hobby trigger is MONETIZATION (ads/affiliate/billing/paid tiers), not mere public reachability** — the site being publicly indexable on Hobby with no monetization and no users is permitted; the earlier "any public launch" wording is superseded by this narrower reading.
- **Image storage:** build-photo UPLOADS on **Vercel Blob** (2026-07-13, replaced an earlier R2 call that was SUPERSEDED/never implemented); **plan catalog images on Cloudflare R2** (2026-07-17, stop hotlinking ana-white — Keagan confirmed re-host rights; the Kreg swap re-hosted to R2 as webp).
- **Cost display (2026-07-13):** TIERS ONLY ($…$$$$$), no dollar figures anywhere public; `formatCents`/`formatCostRange` deleted.
- **Shopping list (2026-07-13):** merge on EXACT identity only (fuzzy = safety bug); fix the CONTENT not the matcher; cost is a BALLPARK — show `≈ $X` + unpriced count, don't withhold. **Decoupled from saves → built from `ShoppingListEntry` explicit adds (2026-07-14).** *(Public UI later: tiers only — see cost-display entry.)*
- **Print (2026-07-13):** print CSS + browser Save-as-PDF, NOT a server-generated PDF. Two layouts: full plan + cut-list one-pager.
- **Offline library (2026-07-13):** opt-in, WIPED ON SIGN-OUT.
- **Learning paths (2026-07-13):** progress DERIVED from reviews, no `PathProgress` table; 5 authored paths (deleted in the Kreg swap — `content/paths/` now empty).
- **View log (2026-07-14):** `PlanView` stores NO user id (a view log with one is browsing history).
- **Per-step tags (2026-07-14):** delivered as `apply-step-tags.mjs`, not 24 hand edits.
- **UI redesign (2026-07-13/14):** adopt the Claude Design mockup as a visual reskin (not a re-architecture); dollar figures / tier limits / custom auth screens / extra sorts explicitly NOT built.
- **Tailwind + dark mode (2026-07-16):** approved (reinstating dark mode at Keagan's direction). **Dark follows OS when no cookie (2026-07-21).**
- **UX Remediation calls (2026-07-21):** stop pre-ticking workshop filter boxes; landing states the real catalog size; CAD part-diagram pilot stays GATED (needs a `StepPart` join); app-page type hierarchy DECLINED. `start_url` → `/browse`.
- **🏷️ Branding #8 RESOLVED (2026-07-21):** the product is **Notch** at **notchplans.com**, "Oak & Forest" palette, tagline "Built naturally. Made to last.", `support@notchplans.com`.
- **Sprint 46 (2026-07-23):** catalog UX batch; imageless plans unpublished; runtime step formatting.
- **Mobile-first is scoped to the PLANS side (2026-07-25):** browsing plans / cut lists / build steps stay mobile-first; the **designer is desktop-only authoring**, and a saved design's plan + cut list must be reachable on mobile. Narrows — does not reverse — the 2026-07-12 platform strategy. Gate on VIEWPORT WIDTH, never UA sniffing. B7 still holds: do not meet "cut list on mobile" by rendering `toParts()`.
- **Designer desktop-gate copy + resize (2026-07-26):** two notice strings (new vs saved); WebGL never created below `lg`; unsaved draft stays mounted across resize (notice overlays, does not unmount). See dated entry.
- **Designer undo/redo (2026-07-25):** table stakes, pulled out of U7 into its own sprint; replaces the template-replace confirm; in-memory only. Advanced templates + the wider "Canva-like" feature set are DEFERRED to their own conversations.
- **Designer species expansion (2026-07-26):** append exactly seven ids after the original eight (yellowheart, bloodwood, beech, ash, birch, hickory, bamboo) with the stated hexes; min pairwise distance floor 0.127; B13/B14 hold; `schemaVersion` stays 1. See dated entry.
- **Cutting Board Designer (2026-07-24):** promoted from FUTURE_IDEAS → BUILD_PLAN Sprint 47+. Sign-in required; hard nav; shopping-list later; product differentiator = modern 3D preview (lightweight shell OK first). **Copy settled (same day):** nav `Designer`; landing CTA `Design a board →`; h1 `Board designer`; empty library `No boards saved yet. Start from a template.`
- **U6 shopping-list designer entries (2026-07-26):** `planId` nullable + nullable `boardDesignId` FK (`onDelete: Cascade`); exactly-one CHECK + action reject; synthesize board feet on read (cheap path); unit `"board feet"`. See dated entry.
- **Designer shell / IA Sprints 67–72 (2026-07-26):** Canva-like top bar; preview ~1200px + height cap; sticky preview+dock with per-card scroll + dock min-height; full dock panels (no stubs; inactive **mounted/hidden**); tab badges; Reset + shopping list; Pattern = row pattern only; grain→edge switches tab to Templates; panel folders; Board settings disclosure; 3D default + view-only 2D rotate + 2D export; Save a copy = dirty config, name `Copy of {name}` → new id; desktop-only; UOM/tabs/share/custom species → FUTURE_IDEAS. Agent contract in BUILD_PLAN §4. See dated entries.
- **Designer upgrade programme (2026-07-26):** D2 **NO lumber pricing** (estimated or otherwise) — `format.test` unmodified; D1 material-math → **Sprint 73** (scheduled 2026-07-26); D3/D5/D7 gated on BUSINESS_PLAN + §4 — do not scaffold. See dated entries.
- **Stale wasteFactor retirement (2026-07-26):** Sprint 74 — `schemaVersion` 2→3 zeroes stored `wasteFactor === 0.15` (old default) on read. Deliberate 0.15 indistinguishable from stale default → accepted pre-launch. Links D1.

_(Full history below, chronological.)_

---

Every business, vendor, legal, or money decision affecting this project, in order. Format per entry: date, binding outcome, supersession if any.

---

### 2026-07-12 — Platform strategy: mobile-first PWA, not native-app-first
**Binding:** Mobile-first PWA (not native-app-first). Native re-eval deferred to Phase 3 (push/discovery). Narrowed 2026-07-25: plans side stays mobile-first; designer is desktop-only authoring.

### 2026-07-12 — License: Proprietary / All Rights Reserved
**Binding:** Proprietary / All Rights Reserved. See `LICENSE`.

### 2026-07-12 — Frontend framework: React + Next.js
**Binding:** React + Next.js (`BUILD_PLAN` §3 #1).

### 2026-07-12 — Backend framework: Node.js + TypeScript
**Binding:** Node.js + TypeScript as Next.js API routes on Vercel — no separately hosted backend (clarified same day under $0 constraint).

### 2026-07-12 — Database: PostgreSQL
**Binding:** PostgreSQL (`BUILD_PLAN` §3 #3).

### 2026-07-12 — Hosting/infra: managed platform (Render/Railway/Vercel)
**Binding:** Managed platform; narrowed same day to Vercel (see free-tier stack).

### 2026-07-12 — Development-phase budget: $0, hard constraint
**Binding:** $0 during development. Every vendor must be a genuine perpetual free tier — not a trial. Never enter a card. Hosting/monetization revisited only at launch.

### 2026-07-12 — Free-tier stack: Vercel + Neon Postgres + Clerk
**Binding:** Vercel (Hobby) + Neon Postgres + Clerk. All perpetual free tiers. Re-verify terms at Sprint 0 start.

### 2026-07-12 — Sprint 0 free-tier re-verification (Vercel / Neon / Clerk)
**Binding:** Neon + Clerk still genuine free (Clerk free allowance now 50k retained users; BUILD_PLAN "10k" stale). Vercel Hobby free but commercial-use restricted — see next entry.

### 2026-07-12 — Vercel Hobby commercial-use restriction: build on Hobby, hard gate before launch
**Binding:** Build on Hobby. **Hard gate:** move off Hobby to Pro (or commercial-use-permitted host) BEFORE shipping any billing/payment, advertisement/affiliate link, or (original wording) public launch/marketing. No sprint may ship those on Hobby. *(Launch-economics 2026-07-13 + index reconcile 2026-07-24: trigger narrowed to MONETIZATION; public indexability without monetization is permitted.)*

### 2026-07-12 — Branching model: trunk-based, commit straight to `main`
**Binding:** Commit+push straight to `main`; no feature branches/PRs. CI is a detector, not a gate. Revisit branch protection before real-user launch.

### 2026-07-12 — Plan-content admin/CMS: version-controlled seed files now, custom admin panel later
**Binding:** Plan content = version-controlled structured files + idempotent seed. No admin UI in Sprint 1. Headless CMS rejected. Custom admin deferred until schema proven / content pipeline needed.

### 2026-07-12 — Separate dev and production databases (Neon branch)
**Binding (original):** Local → Neon `dev` branch; Vercel → `production`; schema to prod only via `prisma migrate deploy`; seed prints target host. **Superseded in practice 2026-07-14:** one shared `sparkling-band` (= production) during development; separate dev branch is a pre-go-live task.

### 2026-07-12 — Sign-in methods: email/password + Google OAuth
**Binding:** Clerk: email/password + Google OAuth. Apple Sign-in rejected ($99/yr breaches $0); revisit only if native iOS ships.

### 2026-07-13 — Save/category limits: unlimited for now, gate later
**Binding:** Unlimited saves/categories until launch economics + pricing confirmed. Schema/data layer must allow enforcing a limit in one place later.

### 2026-07-13 — LAUNCH ECONOMICS: stay on Vercel Hobby, no monetization for now
**Binding:** Stay on Vercel Hobby; **no monetization** (no ads, no affiliate links, no payments). Pricing deferred; payment processor (#6) deferred. Gate: any ad / affiliate / payment ⇒ move to commercial-use host FIRST. BUSINESS_PLAN §7–§8 revenue assumptions superseded pending revision.

### 2026-07-13 — Rate limiting: Upstash Redis (free tier)
**Binding:** Upstash Redis for shared rate-limit state (serverless in-memory is theatre). Free tier; $0.

### 2026-07-13 — Phase 2 begins: Sprint 10 = Reviews, ratings & build photos
**Binding:** Sprint 10 = reviews, ratings & build photos. Unblocks image-storage vendor decision.

### 2026-07-13 — Image storage: Cloudflare R2 for BUILD-PHOTO UPLOADS — ⛔ SUPERSEDED, DO NOT IMPLEMENT
**⛔ SUPERSEDED, DO NOT IMPLEMENT** for **user build-photo uploads**. Reversed same day: R2 requires a payment method on file → breaks $0/no-card. Kept for record. **Scope note (2026-07-24):** ban applies to build-photo *uploads* only; R2 was later adopted for **plan-catalog images** (2026-07-17). Uploads live on Vercel Blob.

### 2026-07-13 — Image storage: Vercel Blob (replaces R2)
**Binding:** User-uploaded build photos → **Vercel Blob** (no new vendor/card). All blob access via `src/lib/storage.ts` so provider swap is one module.

### 2026-07-13 — UGC moderation: publish immediately, owner can delete
**Binding:** Reviews/photos publish immediately; admin can delete; no pre-approval queue. Security (not product): strip EXIF; validate by magic bytes + re-encode; size/dimension caps. No report button / automated scan (accepted gap pre-public).

### 2026-07-13 — Sequencing: rate limiting shipped standalone, BEFORE Sprint 10
**Binding:** Rate limiting is its own hardening task, shipped before Sprint 10.

### 2026-07-13 — Sprint 11: owned-tools PROFILE deferred to its own sprint
**Binding:** Sprint 11 recommends from saved/liked only. Owned-tools *profile* (persisted `UserTool` + UI) deferred; per-session tools filter stays.

### 2026-07-13 — Sprint 11: recommendations surface on the catalog home
**Binding:** "Recommended for you" section on catalog home for signed-in users with saves/likes. No `/for-you` route. Cold users see nothing.

### 2026-07-13 — Sprint 12: shopping list is per-collection + whole library, and stateless
**Binding (original):** Generate for any collection or whole library; stateless (no persisted check-off). **Later revised 2026-07-14:** list decoupled from saves → `ShoppingListEntry`; collection scoping removed.

### 2026-07-13 — Sprint 12: NO AFFILIATE LINKS (the Hobby constraint, restated)
**Binding:** Shopping list ships **without affiliate links**. Hobby prohibits commercial use; links wait until commercial-use-permitted host.

### 2026-07-13 — Sprint 12: materials merge on EXACT identity only, never fuzzily
**Binding:** Merge only on exact normalized (name, unit, species). Never fuzzy. Units never combined.

### 2026-07-13 — Sprint 12 REVISION: fix the CONTENT, not the matcher
**Binding:** Genericize brand-specific materials in content (glue/sandpaper/finish); keep fastener sizes specific; specificity moves to `note`. Exact-merge rule unchanged.

### 2026-07-13 — Sprint 12 REVISION: cost is a BALLPARK; show it, don't withhold it
**Binding (at time):** Always show list total as `≈ $X` + unpriced-item count; don't null the whole total. **Superseded for public UI by cost-tiers-only (same day later):** no dollar figures public; shopping list shows a list tier instead.

### 2026-07-13 — Sprint 13: print CSS + browser Save-as-PDF, NOT a server-generated PDF
**Binding:** Print-optimized public page + browser Save-as-PDF. No server PDF endpoint (needs network = worst for offline).

### 2026-07-13 — Sprint 13: two print layouts — full plan, and a cut-list one-pager
**Binding:** Two layouts: full plan; single-page cut list + materials.

### 2026-07-13 — Sprint 14: offline library is OPT-IN, and is WIPED ON SIGN-OUT
**Binding:** Explicit "Make available offline" only; downloads saved plans + print views + shopping list; private cache wiped on sign-out; two caches (public vs private). SW still fail-closed on private routes by default.

### 2026-07-13 — Phase 3 CUT DOWN: marketplace, native app, lumber prices all parked
**Binding:** Marketplace, native app, lumber-price estimator → `FUTURE_IDEAS`. Phase 3 keeps cut-list optimizer + learning paths. Makerspace/team accounts stay blocked by launch gate.

### 2026-07-13 — Cost display: TIERS ONLY. No dollar amounts anywhere in the public UI.
**Binding:** Public UI = `$`…`$$$$$` only. No plan cost range, per-material price, or shopping-list dollar total. `Material.costCents` / `Plan.costMin/MaxCents` stay as tier inputs. Shopping list derives a whole-list tier from summed cents.

### 2026-07-13 — Sprint 16: path progress is DERIVED FROM REVIEWS, not a new table
**Binding:** Path step complete ⇔ user reviewed that plan. No `PathProgress` table.

### 2026-07-13 — Sprint 16: five authored learning paths
**Binding:** Five authored paths as content (JSON→seed), each step with a `reason`. *(Kreg swap 2026-07-23 emptied `content/paths/` — paths deleted from live catalog.)*

### 2026-07-12 — Default branch / repo housekeeping
**Binding / open:** Set `main` as GitHub default and delete stale branches — Keagan action in GitHub Settings. Not a build blocker.

### 2026-07-13 — UI redesign: adopt Claude Design mockup's visual system
**Binding:** Visual reskin from Claude Design mockup (architecture unchanged). Palette replaces neutral; dark mode dropped then *(reinstated 2026-07-16)*. Clerk stays for auth UI (appearance API only). No custom auth screens; no sitemap; no email-notifications toggle. PWA install prompt ships. Step walker is progressive enhancement on full server-rendered step list.

### 2026-07-14 — Prototype Wireframe folder reviewed; wireframes file is historical only
**Binding:** Wireframes file = historical, not spec. Do not build: dollar figures, Free-tier save limits, custom auth screens, email-notifications, sitemap. Approved deltas: active-filter chips + skeleton loading. Sort options stay as-is at this time *(later Trending/Recommended opened at Keagan's direction)*. Priority: UI deltas before launch blockers; credential rotation still pre-go-live.

### 2026-07-14 — Production DB backfilled; Vercel env-var target NEEDS KEAGAN'S CHECK
**Binding / historical:** Prod backfilled (migrations + seed). Open question: Vercel may point at `sparkling-band` (dev). **Closed by next entry.**

### 2026-07-14 — RESOLVED: one database, labelled production. Credentials rotate PRE-GO-LIVE only.
**Binding:** ONE Neon branch `sparkling-band` = production; deliberately shared by dev+prod during development. Empty `long-lake` deleted. Separate dev branch = **pre-go-live task** — do not re-flag prod==dev. **Credential rotation DEFERRED TO PRE-GO-LIVE, FINAL** — rotate Neon password + Clerk secret once before public launch, then update `.env.local` + both Vercel vars together. Do not re-raise.

### 2026-07-14 — Rate-limit denial feedback (closes the standing follow-up)
**Binding:** Denied actions `redirect()` with `?notice=slow-down`; `returnTo` validated by `safeReturnTo()` (open-redirect guard). No throw; no DB work on denial.

### 2026-07-14 — Post-launch-blocker backlog: Keagan's UI/feature punch list, four scope calls
**Binding:** (1) Community-submitted plans — DEFERRED. (2) AI-rendered plan images — SKIPPED ($0). (3) Category sidebar — FLAT (no subcategory schema). (4) About/FAQ — stub routes only, no copy yet. Sprint 17 quick wins shipped (inline bold, print list CSS, cost-tier qualifier dropped, breadcrumbs, Home/About/FAQ public). Queued later: desktop layout, sort overhaul (`PlanView`), shopping-list redesign, etc.

### 2026-07-14 — Sprint 19: the view log stores NO user id (build agent's call, flagged)
**Binding:** `PlanView` has **NO `userId`**. View logged from client effect after hydration (not server render — prefetch/crawler inflation). Counts only; reversible only toward collecting more, not less.

### 2026-07-14 — Sprint 21: per-step content delivered as a script, not 24 file edits
**Binding:** `scripts/apply-step-tags.mjs` applies tags; subset rule in loader (`load.ts`); materials by name, tools by slug; tags optional.

### 2026-07-14 — Sprint 22: the shopping list is decoupled from saves
**Binding:** `ShoppingListEntry` + explicit add. Existing saves do NOT auto-populate. Collection scoping removed; views = merged | by-plan (`?view=`). Exact-merge unchanged.

### 2026-07-14 — Prod incident: Trending sort 500 (`make_interval`), and CI made green
**Binding / standing rule:** Bind a JS `Date` cutoff for Trending window (not `make_interval($1)`). New `$queryRaw` must run against real Postgres + smoke `/`. Prototype Wireframe/ eslint-ignored so CI detects again.

### 2026-07-14 — Sprint 23: About/FAQ copy drafted; name + contact are placeholders
**Binding (at time):** Draft copy with working name placeholders + "free right now, no ads, no affiliate links, no forever promise." *(Branding resolved 2026-07-21 → Notch / support@notchplans.com.)* Public copy remains Keagan's to approve.

### 2026-07-15 — Completion plan: Sprints 24–27 scheduled; Phase 4 partially opened
**Binding:** Sprint 24 hardening first; 25–26 workshop + tool-aware search (profile prefills filter form, never silently filters bare URL); Phase 4 = build logs only (forums/AI/video/metric closed); community submissions stay deferred. Branding, commercial licensing, credential rotation deferred to pre-go-live.

### 2026-07-16 — Sprints 24–27 confirmed complete & pushed; UI migration to Tailwind CSS + dark mode approved
**Binding:** Migrate to Tailwind (pixel-parity; print CSS out of scope). Dark mode reinstated (reverses 2026-07-13 drop); toggle in Clerk UserButton; first-visit default light *(later: OS when no cookie, 2026-07-21)*. Sprints 28–32 in BUILD_PLAN §4.4.

### 2026-07-16 — Desktop/mobile layout fix pass; "Start building" gets a dedicated page
**Binding:** Desktop width/grid fixes; mobile header/banner fixes. "Start building" → `/plans/[slug]/build` (public, no extra view log); plan page keeps full step list for print/offline/no-JS. Dev-only `'unsafe-eval'` for react-refresh.

### 2026-07-16 — Nav redesign, install moves to the profile dropdown, perf pass
**Binding:** Catalog install banner removed; install in profile dropdown + mobile drawer. Quiet nav + hamburger drawer (`<details>`). Catalog DB parallelized; Clerk preconnect.

### 2026-07-17 — Image storage vendor: Cloudflare R2 (stop hotlinking ana-white.com)
**Binding:** Plan catalog images on Cloudflare R2 (Keagan confirmed re-host rights). Migrate via script (re-encode, strip EXIF, content-hash keys). Wire `R2_PUBLIC_HOST` into remotePatterns + CSP `img-src`. Dead URLs → empty `images` + preserve in `unresolvedImages`. Custom domain deferred to launch; credential rotation stays pre-go-live.

### 2026-07-19 — Site navigation IA (QOL-D): category "Browse" menu; Workshop becomes a profile setting
**Binding:** Nav "Browse" category menu (desktop + mobile); catalog left rail unchanged. `Workshop` removed from signed-in header; stays on `/profile` (+ plan-page prompt); `/workshop` redirects. Sitemap/SEO still gated on branding at this time.

### 2026-07-19 — Learning-path taxonomy (QOL-E): one level vocabulary; no new path content
**Binding:** `experienceLevel` reuses Plan difficulty 1–5 / `difficultyLabel()`. Taxonomy only — no new paths authored this sprint.

### 2026-07-19 — QOL-F visual direction: variant **A (restrained, CSS-only)**
**Binding:** Variant A: CSS-only card lift/shadow; no JS tilt island. Keep `:active` press feedback. Elevation tokens (3 levels); motion limited to press/save/tab/card settle. No page transitions / scroll parallax / print or step-walker motion.

### 2026-07-19 — Learning-path taxonomy (QOL-E) — tagging detail
**Binding:** Path tags: First Five→Beginner/Mixed; Cutting Board→Easy/Cutting Boards; Outfit Shop→Intermediate/Shop; Furnish Room→Intermediate/Furniture; Joinery→Advanced/Mixed. `experienceLevel` = level the path is FOR (authored), not first-step difficulty.

### 2026-07-20 — UI/QOL punch list (QOL-H..M): three IA/UX calls, plus a stale-doc flag
**Binding:** (1) Landing at `/`; catalog moves to `/browse` — update all hardcoded `/` catalog seams together. (2) Sort "Apply" visually hidden, kept for no-JS/keyboard. (3) Content pages → `.page-wide` (64rem), not edge-to-edge. Flag: catalog size docs were stale vs live count.

### 2026-07-20 — PWA `start_url`: stays on the landing page, not `/browse`
**Binding (at time):** `start_url` stays `/`; landing must have prominent CTA to `/browse`. **Superseded 2026-07-21:** `start_url` → `/browse`.

### 2026-07-20 — QOL-L account modal: build our OWN modal, keep Clerk for credentials
**Binding:** Custom `AccountModal`; credentials/security stay in Clerk (`openUserProfile`). `/profile` stays as no-JS fallback (avatar is progressive enhance). Workshop in-modal path later removed (2026-07-21 → link to `/profile#workshop`).

### 2026-07-20 — QOL-M landing page: Fraunces heading font; copy stays placeholder
**Binding:** Fraunces for headings via `next/font` (no external font CSP hole). Landing copy DRAFT/placeholder; factual claims only. *(Branding name resolved 2026-07-21.)*

## Recommendations Awaiting Explicit Confirmation
Not decisions until Keagan signs off: BUSINESS_PLAN §7 monetization/pricing; §8 profit estimates; §6 content-partner specifics / licensing terms.

### 2026-07-21 — UX Remediation Plan (Sprints 33–42) opened; 33–36 executed
**Binding:** UX remediation Sprints 33–42 opened (UI quality, not new business capability). 33–36 decision-free engineering except `start_url` (next entry).

### 2026-07-21 — PWA `start_url` → `/browse` (Sprint 36.5, audit H6)
**Binding:** `start_url` = `/browse` (supersedes 2026-07-20 landing `start_url`). `scope` stays `/`.

### 2026-07-21 — Dark mode follows the OS when no cookie exists (Sprint 37, audit D1)
**Binding:** No `theme` cookie ⇒ honor `prefers-color-scheme`; cookie overrides thereafter. Reverses 2026-07-16 light-default/cookie-only. Needs nonce'd inline theme-init script before paint. Accepted: first OS-dark visit may have light `theme-color` chrome for one render.

### 2026-07-21 — Workshop tool prefill: stop pre-ticking the filter boxes
**Binding:** URL alone ticks filter boxes. No silent pre-tick/apply of owned tools. "Show plans I can build" CTA remains the prefill path. `FilterPanel` gets `hasWorkshop` boolean only (no owned slugs).

### 2026-07-21 — Landing marquees: below `lg` the featured band is a swipe row
**Binding:** Below `lg`, featured carousel = scroll-snap row (not animated). Text bands keep animating; all pause on `:hover`/`:focus-within`.

### 2026-07-21 — The landing states the real catalog size
**Binding:** Landing shows live published `total`. Below 100-plan floor, **drop** the size claim entirely (never a false approximation). Wording DRAFT.

### 2026-07-21 — One workshop picker: the account modal links to `/profile#workshop`
**Binding:** Modal Workshop = link to `/profile#workshop` only. Delete in-modal picker, `saveWorkshopModalAction`, and `/api/workshop`. Do not reintroduce.

### 2026-07-21 — Cost tiers get an anchor (public copy, DRAFT)
**Binding:** Draft anchor `$ = scrap-wood cheap · $$$$$ = a serious lumber budget` (no digits). Visible in Cost filter; `title` on card/glance. Does not weaken no-dollar-figures rule (glyphs, not currency).

### 2026-07-21 — The CAD part-diagram pilot stays, gated (Sprint 42.5)
**Binding:** Keep gated pilot (`/dev/diagrams`, part-diagram lib/components/tests). Do not wire into live pages without `StepPart` join + content pass.

### 2026-07-21 — App-page type hierarchy: DECLINED (Sprint 42.6, audit D3)
**Binding:** Declined/closed. Global unlayered `h2` cascade consequence noted in DESIGN_BRIEF §6.

### 2026-07-21 — 🏷️ BRANDING (#8) RESOLVED: the product is **Notch**, at **notchplans.com** (Sprints 43–45)
**Binding:** Name Notch; domain notchplans.com; Oak & Forest light palette; tagline "Built naturally. Made to last."; contact `support@notchplans.com`. `robots: noindex` stays until explicit go-live. Dark theme NOT re-paletted this phase. SW cache names kept deliberately. Identity source: `src/lib/brand.ts`.

### 2026-07-21 — Sprint 44: Oak & Forest light-palette calls (re-derivations + accepted ambiguities)
**Binding:** Re-derive `--danger`/`--muted-2` for AA on new cream. `--ok` stays functional success (may share forest family). Keep warm brown-black shadows. Print resets `--accent` to white. `--accent-fg` theme-divergent by design until dark re-palette.

## Pending — Pre-Sprint-0 Decisions
Confirmed historically: #1–5, #9. Open: payment processor (#6, deferred). Plan-content CMS (#7) resolved via seed files. Branding (#8) **RESOLVED 2026-07-21: Notch / notchplans.com**.

---

### 2026-07-23 — Sprint 46: catalog UX, imageless-plan unpublish, runtime step formatting
**Binding:** Imageless plans → `published:false` (content JSON + content.test guard). Paths that only referenced those plans unpublished too. Prod needs `db:seed`. Oak-authority mockups OPTIONS ONLY (no palette ship). Step-body formatter runtime-only (`step-format.ts`), no content rewrite.

### 2026-07-23 — Catalog: full swap ana-white → Kreg plans (G1 legal gate, G2 R2, G3 estimates)
**Binding:** Full catalog swap to Kreg (1128 plans; 639 published full cut list / 489 hidden). Cut list FULL ONLY. ana-white preserved in git + `content/plans-draft/`; paths emptied. **G1 RESOLVED 2026-07-24:** Kreg partnership confirmed — publish cleared; `SITE_INDEXABLE=true` intended. **G2:** re-host images to R2 webp; dead → `unresolvedImages`; no images ⇒ unpublished. **G3:** derive cost tier + time; cost stays TIER-ONLY (no dollar figures).

### 2026-07-24 — Cutting Board Designer: promote + product calls
**Binding:** Promote designer to BUILD_PLAN Sprint 47+. Sign-in required (`/designer(.*)` off public-routes). Hard nav. Shopping list later phase. Differentiator = modern 3D (lightweight shell OK first). No PRO paywall / dollar lumber UI; Hobby/$0 unchanged. Copy: nav `Designer`; h1 `Board designer`; CTA `Design a board →`; empty `No boards saved yet. Start from a template.`; library heading `Your boards`.

### 2026-07-25 — Mobile-first is scoped to the PLANS side; the designer is desktop-only
**Binding:** Plans side mobile-first; designer desktop-only authoring; saved design plan/cut list reachable on mobile. Gate on viewport width, never UA. Score mobile/offline against read-only surface. B7: do not meet mobile cut list via `toParts()`.

### 2026-07-25 — Undo/redo is table stakes for the designer, not a Phase 2 nicety
**Binding:** Undo/redo own sprint; replaces template-replace confirm; in-memory only. Advanced templates + Canva-like set deferred to separate conversations.

### 2026-07-26 — Designer desktop-gate copy, WebGL, and resize behaviour (Sprint 54)
**Binding:** Byte-exact notices for `/designer` and `/designer/[id]` below `lg`. WebGL never created below gate (`canvas === null`). Unsaved draft stays mounted across resize (notice overlays). Print CTA `Print sheet` + descriptive line; B7 still forbids `toParts()`.

### 2026-07-26 — Designer species expansion: seven append-only ids + hexes (Sprint 56)
**Binding:** Append in order: yellowheart `#C9A227`, bloodwood `#A01818`, beech `#EBC889`, ash `#CDBEA7`, birch `#F1E3C4`, hickory `#D2895D`, bamboo `#EFAB76`. Colour floor 0.127. B14 add-only; B13 shape only; `schemaVersion` stays 1; do not rename `WoodSpecies`.

### 2026-07-26 — U6 designer shopping-list entries (Sprint 64 Q1)
**Binding:** Nullable `planId` + nullable `boardDesignId` FK (`onDelete: Cascade`); exactly-one CHECK + action reject; unique `(userId, boardDesignId)`. Synthesize board feet on read; unit `"board feet"`; name = species display; `species` null. Exact matcher unchanged.

### 2026-07-26 — Designer upgrade programme: four decisions (COMPETITIVE_AUDIT_CBD.md)
**Source:** `docs/COMPETITIVE_AUDIT_CBD.md` (moved Sprint 75).
**Binding:** **D1** material-math rework authorised → later Sprint 73. **D2 NO lumber pricing** (estimated or otherwise); `format.test` unmodified; tiers-only everywhere including designer. **D3** procedural textures gated (not in BUSINESS_PLAN/§4). **D4** public/anon designer deferred. **D5** build steps + global settings authorised only when in BUSINESS_PLAN+§4 — do not scaffold early; new board styles NOT authorised. **D6** designer permanently desktop-only. **D7** safety guidance approved, gated with D5 build steps. B4 generator refactor deferred (no consumer). Metric already DO-NOT-BUILD.

### 2026-07-26 — Designer shell & IA track (Sprints 67–72)
**Binding:** Relayout desktop designer; data parity required (no field retirement). Full dock panels; alerts only when tab active; Board settings disclosure; Pattern = row pattern only; panel folders; sticky preview+dock; 3D default; 2D rotate view-only; Save a copy from dirty config; desktop `lg+` only. Preview ~1200px + ~50–55vh; dock min-height ≥~12rem. UOM/tabs/share/custom species → FUTURE_IDEAS. Dark re-palette not commissioned.

### 2026-07-26 — Designer shell quality amendments (post-audit)
**Binding:** Amendments A–I: no stub tabs (mounted from 67); height cap + dock min-height; Metrics/Cut plan tab badges; keep Reset + Add to shopping list; panel CRUD on folders in 69; dirty Save a copy; 2D Export PNG; parity/a11y/First Load (no three.js in initial chunk); density/IA DoD through Sprint 70.

### 2026-07-26 — BUILD_PLAN §4 67–72 agent-contract rewrite
**Binding:** BUILD_PLAN §4 67–72 rewritten as agent contract (INVARIANTS/HARD_STOP/PRESERVE/PARITY/DO-DONT). Product answers unchanged. Save a copy disabled when `designId==null`; 67=sole relocate; 68=dock+parity only.

### 2026-07-26 — Designer shell follow-ups (name / dock mount / grain→tab)
**Binding:** Save-a-copy name `Copy of {name}` (max 80). Grain→Edge while Pattern active auto-selects Templates. Inactive dock tabs stay mounted (hidden).

### 2026-07-26 — Schedule D1 material-math as Sprint 73
**Binding:** Sprint 73 = D1/A1–A4 (`planeBuffer`, `(n−1)×kerf`, `wasteFactor` = defects/snipe only). Do not touch D3/D5/D7.

### 2026-07-26 — Retire stale wasteFactor default (Sprint 74)
**Binding:** Sprint 74: `schemaVersion` 2→3; on-read zero `wasteFactor` when exactly `0.15`. Deliberate-0.15 collision accepted pre-launch. Links D1. Do not touch D3/D5/D7.
