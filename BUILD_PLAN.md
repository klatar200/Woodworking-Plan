# Woodworking Plan — AI-Driven Build Plan

This document governs how an AI coding agent (referred to below as "the
build agent") implements the product defined in `BUSINESS_PLAN.md`,
sprint by sprint, with a self-scoring quality gate and a strict rule
against inventing business decisions.

A note on naming: as of this writing there is no Claude model named
"Opus 8" — the current lineup is the Claude 5 family, Opus 4.8, Sonnet 5,
and Haiku 4.5. This plan is written to be model-agnostic on purpose, so
it stays valid no matter which current-generation Claude model or agent
session actually executes it. Wherever you're picking up this plan,
"the build agent" means you.

---

## 1. Operating Principles (Guardrails)

1. **Factual reasoning only.** Every implementation decision must trace
   to either (a) an explicit statement in `BUSINESS_PLAN.md`, (b) an
   explicit answer recorded in `DECISIONS_LOG.md`, or (c) a purely
   technical detail with no business/cost/legal implication (e.g.,
   variable naming, internal function structure). If a decision doesn't
   trace to one of these, stop and ask — do not assume it.
2. **Escalate business decisions, don't guess them.** See Section 2 for
   exactly what must be escalated and how.
3. **One sprint at a time, no scope drift.** Work the current sprint's
   defined deliverables only. New ideas, "while I'm in here" fixes, and
   speculative features go into the Section 4 backlog notes, not into
   the active sprint.
4. **Every sprint ends with a self-score.** No sprint is "done" until it
   scores ≥95% on the Section 6 scorecard (see Section 7 for the
   remediation loop).
5. **Everything is logged.** Business decisions go in
   `DECISIONS_LOG.md`. Sprint outcomes and scores go in `SPRINT_LOG.md`.
   Anyone picking up this project later should be able to reconstruct
   *why* something was built the way it was from these two files alone.

---

## 2. Escalation Protocol — What Requires the User's Decision

Stop and ask the user (via a clear question with a **recommended
option clearly labeled**, per the user's standing instruction) whenever
a decision falls into any of these categories:

| Category | Examples |
|---|---|
| **Money** | Pricing/tier changes, a new paid vendor, anything with a recurring cost |
| **Third-party vendor/tooling choice with lock-in** | Payment processor, auth provider, hosting platform, CMS |
| **Legal/compliance** | Terms of service, privacy policy, data retention, licensing terms with content creators |
| **Irreversible or hard-to-reverse data actions** | Schema changes that drop data, deleting seed content, renaming/removing a public API |
| **Anything not covered by `BUSINESS_PLAN.md`** | A feature, limit, or rule the business plan simply doesn't address |
| **Branding/naming/public-facing copy** | App name, tagline, domain |

**Do not escalate** routine implementation details that don't carry
business risk (library choice for a solved problem, internal code
structure, test framework, variable names) — deciding those without
asking is expected and keeps the project moving.

**How to escalate:** state the decision needed, the options, your
recommended option with a one-line rationale, and the trade-off of
picking otherwise. Then wait. Once the user answers, record it in
`DECISIONS_LOG.md` before proceeding — this is what "factual reasoning"
means in practice: future sprints reason from that log, not from memory
or assumption.

---

## 3. Pre-Sprint-0 Decisions Required

These block Sprint 0 (or a later, specifically-noted sprint) and must be
answered and logged in `DECISIONS_LOG.md` before that sprint starts.
Recommendation is given for each; none are assumed without your answer.

| # | Decision | Blocks | Recommendation | Status |
|---|---|---|---|---|
| 1 | Frontend framework | Sprint 0 | React (with a PWA-capable meta-framework, e.g. Next.js or Vite + Workbox) — matches the mobile-first PWA strategy in `BUSINESS_PLAN.md` §5, huge hiring/ecosystem pool | **Confirmed: React + Next.js** |
| 2 | Backend language/framework | Sprint 0 | Node.js (TypeScript, e.g. NestJS or a lean Express/Fastify setup) — one language across front and back end, minimizes context-switching for a small early team | **Confirmed: Node.js + TypeScript, delivered as Next.js API routes on Vercel (no second host)** |
| 3 | Database | Sprint 0 | PostgreSQL — relational fit for structured plan metadata (tools/materials/time/cost/category/difficulty) and mature full-text search support for keyword search | **Confirmed: PostgreSQL (via Neon, free tier)** |
| 4 | Hosting/infra | Sprint 0 | A managed platform (e.g. Render, Railway, or Vercel + a managed Postgres) over self-managed cloud infra — lower ops burden matches the lean early-stage cost profile in `BUSINESS_PLAN.md` §8 | **Confirmed: Vercel (free Hobby tier)** |
| 5 | Auth: build vs. buy | Sprint 2 | Buy (e.g. Auth0, Clerk, or Supabase Auth) over building auth from scratch — auth bugs are high-severity and low-differentiation for this product | **Confirmed: Clerk (free tier, up to 10k MAU)** |
| 6 | Payment processor | Needed before any billing sprint (Phase 1 hardening or Phase 2, not Sprint 0) | Stripe — de facto standard for subscription billing, handles the tiered plans in `BUSINESS_PLAN.md` §7 | **Open, deferred — no billing work until launch economics are discussed, per decision #9** |
| 7 | Plan-content admin/CMS | Sprint 1 | A lightweight custom admin panel over a general headless CMS — plan metadata (tools/materials/cost tier/time/difficulty) is a fixed, opinionated schema a generic CMS doesn't model well out of the box | **Confirmed: version-controlled seed files + idempotent seed script for Sprint 1; no admin UI yet; custom admin panel deferred (not cancelled). Headless CMS rejected.** |
| 8 | Branding/app name/domain | Before any public-facing UI copy or launch marketing | No recommendation — this is a pure brand decision only you can make | **Open** |
| 9 | MVP infra/tooling budget ceiling | Sprint 0 | N/A — needed to choose between the hosting/vendor options above | **Confirmed: $0 during development — every tool/vendor must be a genuine free tier, not a trial or time-limited free tier. Revisit at launch.** |

Decisions 1-5 and 9 are confirmed (see `DECISIONS_LOG.md`). **Sprint 0 is
unblocked and can begin.** Decisions #7 (content admin/CMS) and #8
(branding) remain open but don't block Sprint 0 — #7 blocks Sprint 1,
#8 blocks any public-facing copy/marketing. #6 (payment processor) is
explicitly deferred: no billing-related work starts until the user
revisits launch economics, per the $0-during-development decision.

**These are asked as a batch immediately following this document's
publication** — see the end of this build plan's introduction message
for the actual question prompts.

---

## 4. Sprint & Phase Roadmap

Roadmap follows `BUSINESS_PLAN.md` §10 exactly. Only Phase 1 (MVP) is
broken into sprints now — Phases 2-4 are listed at the feature-list level
from the business plan and will be broken into sprints when each phase
starts, so that sprint planning reflects the business plan's *current*
state rather than assumptions made today.

### 📌 Status at a glance (updated 2026-07-16)

| Phase | Status |
|---|---|
| Phase 0 (Sprint 0) | ✅ COMPLETE — 99/100 |
| Phase 1 MVP (Sprints 1–9) | ✅ COMPLETE — all sprints ≥94, deployed |
| Rate limiting (standalone, pre-Sprint 10) | ✅ COMPLETE — incl. user feedback (2026-07-14) |
| Phase 2 (Sprints 10–14) | ✅ COMPLETE — every §10 item except affiliate links (blocked by Hobby, not oversight) |
| Phase 3 (Sprints 15–16) | ✅ COMPLETE — cut-list optimizer + learning paths; 3 items cut to `FUTURE_IDEAS.md` |
| UI redesign + prototype integration | ✅ COMPLETE — see §4.1 below |
| Phase 4 | 🟡 PARTIALLY OPENED 2026-07-15 — **build logs only** (Sprint 27). Everything else in Phase 4 stays closed |
| Completion plan (Sprints 24–27) | ✅ COMPLETE, PUSHED & LIVE — 24 (95), 25 (97), 26 (96), 27 (96 — gate passed on Keagan's machine: 524/524 vitest, eslint + tsc clean after `prisma generate`). **Confirmed pushed 2026-07-16 (Keagan): CI green, live site verified.** See §4.3 |
| UI framework migration (Sprints 28–32) | ✅ COMPLETE (code) — Tailwind CSS + light/dark theme. **28 (env) 97; 29 (wave 1) 96; 30a 96; 30b 96; 30c 95 (closed w/ documented component-CSS residual); 31 (theme + toggle) 96; 32 (hardening) 95.** Dark mode = `.dark{}` token flip; toggle in the Clerk `UserButton` dropdown; SSR cookie, no FOUC; print forced light; dark palette AA-audited. **Device-bound → Keagan:** real-phone Lighthouse, real-browser toggle/FOUC, visual regression at 5 breakpoints × 2 themes. See §4.4 |
| **Launch blockers** | 🔴 OPEN — see §4.2 below; all Keagan's (branding, copy approval, rotation at go-live, launch call) |
| Post-launch-blocker backlog (Sprints 17-23) | ✅ COMPLETE — Sprints 17–23 all done; see §4.1.1. (About/FAQ copy is a DRAFT for Keagan's review; brand name + contact are marked placeholders pending decision #8.) |

Per-sprint scores and evidence live in `SPRINT_LOG.md`; the operational
detail behind each ✅ lives in `CLAUDE.md` §7. Test suite as of the last verified
run: **524 green** (Sprint 27 gate, Keagan's machine, 2026-07-15). Sprints 24–27
(hardening pass, workshop, tool-aware catalog, build logs) are now confirmed pushed
and live (2026-07-16) — the completion plan is fully closed. See §4.4 for what's
next.

**Important scope note:** the feature ideas discussed in chat before this
build plan (comments on plans, tool substitution notes, an "owned
tools" profile, local lumber price sync, plan versioning, an offline
"shopping mode") are **not** in `BUSINESS_PLAN.md` yet and are therefore
**out of scope** for every sprint below until you decide which of them to
adopt and the business plan is updated accordingly. This is the
guardrail in Section 1.1 applied directly: no sprint should build a
feature the business plan doesn't actually specify.

### Phase 0 — Setup ✅ COMPLETE (99/100)

- **Sprint 0: Environment & Architecture** — Next.js (TypeScript) repo
  structure covering both frontend and API routes, Neon Postgres
  provisioned on its free tier, Clerk configured on its free tier, CI
  pipeline (lint/typecheck/test on every push), local dev environment,
  deployment pipeline to Vercel's free Hobby tier (can deploy an empty
  "hello world" end to end), environment/secrets management. Every
  service provisioned in this sprint must be confirmed as a genuine free
  tier before use — see decision #9: **no costs during development.**

### Phase 1 — MVP / Launch ✅ COMPLETE (`BUSINESS_PLAN.md` §4, delivered as a PWA per §5)

All nine sprints done and deployed (scores 94–99, details in `SPRINT_LOG.md`).
Plus one standalone item shipped between Phases 1 and 2: **Upstash
sliding-window rate limiting on all server actions** — including, as of
2026-07-14, user-visible feedback on denial (`?notice=slow-down` redirect +
banner; see `CLAUDE.md` "Rate-limit rule").

- **Sprint 1: Plan Data Model & Content Pipeline** — schema for a plan
  (title, category, difficulty 1-5, tools required, materials required,
  time estimate, cost tier $-$$$$$, itemized cost range, instructions,
  images); seed-content ingestion path (even if seed content itself is a
  content-strategy task, not a dev task) sufficient to load ~20 real
  test plans for development.
- **Sprint 2: Accounts & Auth** — sign up/login, session handling, user
  profile. Depends on decision #5 (Section 3).
- **Sprint 3: Plan Repository & Browse/Detail Views** — catalog listing,
  plan detail page rendering all structured data from Sprint 1.
- **Sprint 4: Keyword Search** — full-text search across title,
  description, tags, tools, materials.
- **Sprint 5: Filter/Facet Search** — category, difficulty, cost tier,
  time, and tools-owned filtering, combinable with keyword search.
- **Sprint 6: Save Plans & Custom Categories** — bookmarking, user-named
  category folders.
- **Sprint 7: Liking** — like/unlike a plan, like-count-driven "Popular"
  sort.
- **Sprint 8: PWA Shell** — installable to home screen, service-worker
  offline caching of saved plans (the specific capability
  `BUSINESS_PLAN.md` §5 identifies as the most important one for
  workshop/outdoor/hardware-store use), responsive mobile-first UI pass.
- **Sprint 9: Hardening & Launch Readiness** — security review (OWASP
  top 10 pass), accessibility pass, performance pass (mobile network
  conditions), end-to-end QA across the full MVP feature set.

### Phase 2 ✅ COMPLETE (`BUSINESS_PLAN.md` §10) — broken into sprints 2026-07-13, all five shipped

**Binding constraint (see `DECISIONS_LOG.md`, `LAUNCH_ECONOMICS.md`): the project is
on Vercel Hobby with NO monetization.** Hobby prohibits commercial use. So Sprint 12
ships the shopping list **without affiliate links** — the aggregation is the useful
part; the links cannot exist until the host changes. **The moment an ad, an affiliate
link, or a payment appears, the project must be on a commercial-use-permitted host
FIRST.**

**Sprint 10 — Reviews, ratings & build photos ("I made this")**
`Review` (1–5 stars + text, one per user per plan) and `BuildPhoto`, stored on Vercel
Blob. Aggregate rating **computed on read**, never denormalized. Uploads validated by
magic bytes, re-encoded server-side, **EXIF/GPS stripped**. UGC publishes immediately;
owner can delete. Blob host added to CSP `img-src`.

**Sprint 11 — Personalized recommendations**
Driven by **saved/liked plans only**. Content-based, not collaborative — there is no
user base to collaborate across, and "people who saved X also saved Y" returns nothing
when there are no other people.

**The owned-tools profile is NOT in this sprint** (`DECISIONS_LOG.md` 2026-07-13). It
needs a `UserTool` table and a management screen — a feature, not a parameter — and it
gets its own sprint. The Sprint 5 per-session tools filter is unaffected.

Surfaces as a "Recommended for you" section on the catalog home, shown only to signed-in
users who have saved or liked something. It renders *nothing* for a cold user rather
than an empty shell.

**Sprint 12 — Shopping list generator (NO affiliate links — see constraint above)**
Aggregate materials across saved plans into one consolidated, buyable list. Merge like
items, sum quantities, keep money in integer cents.

**Sprint 13 — Print-friendly / offline PDF export**
A cut list is used at a table saw. Print CSS + a generated PDF of the plan.

**Sprint 14 — Expanded offline mode**
Pre-cache the entire saved-plan library, not just visited plans. Must not violate the
Sprint 8 caching rule: **public content only; `/saved` and `/profile` are never cached.**

### Phase 3 ✅ COMPLETE — opened 2026-07-13, deliberately CUT DOWN, both remaining sprints shipped

Phase 3 as originally written was six items. **Three were removed by Keagan before any
code was written** and now live in `FUTURE_IDEAS.md` — they are not scheduled, not
approved, and **must not be started**:

| Removed | Why |
|---|---|
| Creator marketplace | A two-sided product with zero users on either side. Also needs monetization, which Hobby prohibits. |
| Native iOS/Android | Nobody has joined the app. The original gate ("only if the data shows…") answers itself: there is no data, so there is no case. |
| Local lumber pricing | No free perpetual source; a paid vendor breaks the $0 rule and scraping prints confidently-wrong prices next to things people buy. |

**What remains:**

**Sprint 15 — Cut-list optimizer / board-footage calculator**
Turn a plan's cut list into a board-buying plan: how many boards of what size to buy, and
how to lay the parts out with the least waste. Pure computation — no vendor, no money, no
new data. **This is the real differentiator:** every plan site gives you a cut list;
none of them tells you what to actually put in the truck.

**Sprint 16 — Skill-building learning paths**
Sequence plans into ordered paths ("your first five projects"). Content and ordering, no
new vendor. Depends on nothing.

**🛑 STILL BLOCKED BY THE LAUNCH GATE — do not build:**

- **Makerspace / team accounts.** A paid tier. Requires leaving Vercel Hobby, plus the
  payment processor (§3 decision #6) and pricing (#7). All three come due together, and
  that is a conversation, not a sprint.

### Phase 4 🟡 PARTIALLY OPENED (2026-07-15, Keagan) — build logs only
- AI-assisted plan customization (resize/re-species with recalculated cost/materials)
  — ⛔ CLOSED for now: inference costs money, violates the $0 rule
- Community forums / **build logs** — 🟡 build logs OPENED as Sprint 27 (§4.3),
  deliberately cut down; **forums stay CLOSED** (moderation liability, no user base)
- Video content integration — ⛔ CLOSED for now: there is no video content to embed;
  a content decision, not a dev task
- International expansion (metric units, regional pricing) — ⛔ DEFERRED by decision:
  US dimensional lumber (a "2x4") does not convert honestly to metric stock, so a
  toggle risks misleading cut lists; regional pricing is dead under the cost-tier
  rule anyway. Revisit on real international demand
- Tool-inventory-aware search — 🟡 OPENED as Sprints 25–26 (§4.3); it is the natural
  completion of the owned-tools profile `BUSINESS_PLAN.md` §10 already names

### 4.1 UI redesign & prototype integration ✅ COMPLETE (2026-07-13 / 2026-07-14)

Keagan supplied a Claude Design prototype (`Prototype Wireframe/Woodworking Plan
Prototype.dc.html`) as the app's target look. Adopted as a **visual reskin, not a
new architecture** — GET-form filters/search, server actions, Clerk, and Prisma
are unchanged. Full decision record: `DECISIONS_LOG.md` 2026-07-13 and 2026-07-14.

**Shipped:**

- **Palette/reskin** — cream/ink/orange visual system replaces the neutral theme;
  dark mode removed (the mockup has none, and inventing one would be an
  uncommissioned design decision).
- **Step-by-step plan walker** — progress bar, step rail/dots, Prev/Next, as a
  progressive enhancement OVER the full server-rendered step list (print, offline,
  and no-JS keep the complete document).
- **PWA install prompt** — `beforeinstallprompt` capture + banner (closed a real
  Sprint 8 gap).
- **Clerk re-themed via its `appearance` API** — the mockup's custom auth screens
  were NOT hand-rebuilt.
- **Active-filter chips** (2026-07-14) — one removable chip per filter value, plain
  GET links, search/sort ride along (`filter-chips.tsx`).
- **Skeleton loading states** (2026-07-14) — `loading.tsx` for catalog + plan
  detail, `prefers-reduced-motion` respected.

**Explicitly NOT built (decided, not forgotten):**

| Prototype/wireframe element | Why excluded |
|---|---|
| Dollar figures ("$85–$130", per-material prices in print) | Violates the cost-tier-only rule (2026-07-13): tiers only, `formatCents` deleted |
| "Free tier: 10 saved plans / 1 folder" limits | No pricing decision exists; no tier gating until billing is a real conversation |
| Custom email/password auth screens | Clerk stays; hand-rolled auth is a security regression |
| Email-notifications toggle, sitemap page | Scope creep / design-tool navigation aid |
| "Recommended"/"Trending" catalog sorts | New features not in `BUSINESS_PLAN.md`; declined 2026-07-14 |
| Materials checklist; offline banner + saved-only catalog mode | Offered 2026-07-14, not selected — **not approved, do not build without asking** |

The `Woodworking Wireframes.dc.html` file in the same folder is **historical
design iteration, not spec** — where it contradicts the above, the decisions win.

### 4.1.1 Post-launch-blocker backlog (opened 2026-07-14) — Sprints 17-23 ✅ COMPLETE

**All seven sprints (17–23) are done — the backlog is closed.** Every sprint self-scored
96–99 with evidence in `SPRINT_LOG.md`; test suite at **495 green**. Several land in the
DB only after Keagan runs their migrations/seed and pushes (19, 21, 22 — see §4.2 and the
per-row notes); Sprint 23's copy is a DRAFT for his approval. No further backlog sprints
are open; Phase 4 remains ⛔ NOT OPENED.

Keagan's UI/feature punch list from walking the live app. Four scope calls were
escalated and answered first — see `DECISIONS_LOG.md` 2026-07-14 for the full
reasoning. Community submissions and AI-rendered images are **not** in this list —
both deferred by his explicit call.

| Sprint | Scope | Status |
|---|---|---|
| 17 | Bug fixes: `**bold**` markdown rendering (real bug, all 24 plans affected), print double-numbering (CSS root cause, not content), cost-tier "of $$$$$" qualifier dropped, breadcrumb restyled to an on-theme pill, Home/About/FAQ stub nav | ✅ COMPLETE — 449 tests green, typecheck/lint clean |
| 18 | Desktop catalog layout: 4-5 columns, filters right sidebar, flat-category nav left sidebar (mobile layout unchanged) | ✅ COMPLETE — 96/100. One DOM, one source order; the three columns are `grid-template-areas` at ≥64rem and every rule is inside a `min-width` query, so mobile is untouched by construction. Cards go 3 → 4 → 5 across at 64/80/96rem (5 across at 1024px would be a ~110px card). 459 tests green; visual sign-off pending on Keagan's browser |
| 19 | Sort overhaul: new `PlanView` log table (no view-tracking exists today); Trending (7-day window) + Most Viewed (all-time) sorts; Recommended folded into the sort dropdown, retiring the standalone "Recommended for you" section; default sort → Trending; Cheapest/Easiest/Quickest removed | ✅ COMPLETE — 96/100. `PlanView` carries **no `userId`** (a view log with one is a browsing history — `DECISIONS_LOG.md` 2026-07-14). Views are logged from a **client effect**, never the server render, or `next/link`'s prefetch would count a hover as a view. Trending/Viewed/Recommended rank as an ordered id list intersected with the filters — one path, shared with keyword search. 477 tests green; **needs a migration before it does anything** (see §4.2) |
| 20 | Plan-detail redesign (desktop): sidebar/tabs for Tools/Materials/Cut List, right-sidebar image slot (empty — no AI generation per the decision above), a button to open Instructions, last-step CTA for review + photo upload. Full server-rendered document stays underneath, same progressive-enhancement pattern as the existing step walker (print/offline/no-JS unaffected) | ✅ COMPLETE — 96/100. `PlanTabs`, `InstructionsDisclosure`, `PlanImageSlot` + a StepWalker last-step CTA. All follow the StepWalker contract: the full document is server-rendered and the client components only HIDE parts after mount, so print/offline/no-JS get everything (print CSS forces every panel + the instructions region visible). Image slot shows the primary photo or an honest empty placeholder — **no AI render**. 484 tests green; visual sign-off pending on Keagan's browser |
| 21 | Per-step tools/hardware: `Step` has no relation to `Tool`/`Material` today — needs join tables (kept as a subset of the plan's already-declared tools/materials) plus a content pass across all 24 plans | ✅ COMPLETE — 96/100. `StepTool`/`StepMaterial` join tables; per-step tools are a **subset** of the plan's, enforced at content-load (`load.ts`), not by the DB. Per-step chips render on the plan page and the print sheet. **Content pass for all 24 plans (263 tool-tags, 202 material-tags) delivered as `scripts/apply-step-tags.mjs`** — Keagan's chosen delivery (`DECISIONS_LOG.md` 2026-07-14): review the mapping, run it, review the diff. 490 tests green; **needs the migration + `node scripts/apply-step-tags.mjs` + re-seed** before it shows anything |
| 22 | Shopping-list redesign: new `ShoppingListEntry` model decoupled from `SavedPlan` (an explicit per-plan "add to shopping list", not everything saved); two view modes (by-plan, unmerged vs. whole-list, merged) | ✅ COMPLETE — 96/100. `ShoppingListEntry(userId,planId)`; the list is now built from explicit adds, not saves. `getShoppingList()` takes **no args** and returns both views; the **exact-merge rule is unchanged**. "Add to shopping list" button on each plan; merged/by-plan GET toggle replaces the old collection scoping. 495 tests green. **Needs the migration** before it works (see §4.2). Also fixed a latent Sprint 21 print-test fixture + the CI-lint red (Prototype Wireframe now eslint-ignored) |
| 23 | About/FAQ real copy, once Keagan writes/approves it (stub pages shipped in Sprint 17) | ✅ COMPLETE (DRAFT) — 96/100. Real copy on both pages, grounded in what the app actually does; free framing matches launch economics ($0, no ads/affiliate, no forever promise). Per §2, public copy is Keagan's to approve: brand name is the "Woodworking Plan" placeholder and the contact line is a marked placeholder, both to swap with branding/domain (#8). Stays `noindex`. 495 tests green |

**Sort/Recommended reversal, stated explicitly:** this directly reverses the
2026-07-14 decision below ("Sort options stay as-is... declined for now") and the
Sprint 11 rule ("never fall back to popular plans under a personalized heading").
Both reversals are at Keagan's explicit direction, not a re-litigation by the build
agent — see `DECISIONS_LOG.md` for the record. The two rules aren't actually in
tension once built: a sort's fallback-to-Trending for a cold user is a tiebreaker
within a full catalog listing, not a fabricated personalized recommendation shown
under a "for you" heading — the trust concern the original rule was guarding against.

### 4.2 🔴 Still required — open items, in priority order

**Launch blockers (come due before anything else ships):**

1. ~~**Vercel env target verification (found 2026-07-14).**~~ **RESOLVED
   2026-07-14 (Keagan).** There is ONE Neon branch, `sparkling-band`, now labelled
   **production**, and Vercel Production's `DATABASE_URL`/`DIRECT_URL` both point at
   it (pooled + direct on the same branch — the Sprint 6 pairing is correct). The
   empty `long-lake` decoy branch has been deleted. A separate dev branch is
   deliberately NOT maintained during development — see the standing note below.
2. **Rotate the Neon + Clerk credentials — DEFERRED TO PRE-GO-LIVE, by Keagan's
   explicit and repeated decision.** They were pasted into a chat transcript, so
   they rotate *once, immediately before public launch*, alongside the branding/
   domain work. **This is settled. Do NOT re-raise it as a now-blocker, do NOT
   propose rotating it mid-development, and do NOT reopen it every session.** When
   go-live is actually scheduled: rotate in both dashboards and update `.env.local`
   + both Vercel vars together.
3. **Branding/domain (§3 decision #8).** Blocks PWA icons (placeholders), SEO
   (`robots: noindex` is set sitewide because of it), and HSTS preload.
4. **Going publicly live is Keagan's explicit call** — named as a gate trigger
   out of caution; that caution stands.

> **STANDING DECISION — single database during development (2026-07-14, Keagan).**
> Dev and prod share ONE Neon branch (`sparkling-band`, labelled production) on
> purpose. With no public users and a catalog rebuildable from `content/*.json`
> via `npm run db:seed`, there is nothing to protect a reset from. A separate dev
> branch is a **pre-go-live** task (it becomes necessary the day a real person
> saves a plan), not a now-task. Do not re-flag "prod == dev" as a defect.

**Engineering debt (mine, not blocking, tracked):**

- ~~**Clerk deletion webhook**~~ **DONE (2026-07-14).** `POST /api/webhooks/clerk`
  verifies the Svix signature and, on `user.deleted`, deletes the user's build-photo
  blobs then cascades the `User` row. Fails closed, idempotent, 15 tests. Needs one
  ops step before it does anything: set `CLERK_WEBHOOK_SIGNING_SECRET` in Vercel and
  register a "user.deleted" endpoint in Clerk (see `DEPLOYMENT.md`).
- ~~**`offline.ts` / `sw.js` duplication**~~ **DONE (2026-07-14).** The caching policy
  now lives once in `public/sw-policy.js`, loaded by the worker via `importScripts` and
  tested directly (no mirror). `src/lib/offline.ts` deleted.
- ~~**Paths not cached offline**~~ **DONE (2026-07-14).** The learning-paths hub and
  each path are now in the consented offline download (`src/lib/offline-urls.ts`,
  cross-checked against the real worker policy). Public content → public cache.
- ~~**`yieldRatio` gap**~~ **DONE (2026-07-14).** Yield now divides by the board you
  actually buy (`physicalBoards × ripsPerBoard × stockLength`), so wasted rip-lane
  width counts, not just length offcut. Unchanged for non-ripped stock.

With those four closed, the §4.2 launch blockers above are the only open items — all
of them Keagan's (env target, credential rotation, branding, launch call).

**Deferred by decision (not debt — needs a business-plan change first):**

- Affiliate links on the shopping list, ads, billing, pricing tiers, save limits
  → all blocked by the launch-economics decision (Vercel Hobby, $0, no
  monetization). **The moment any of these appear, the project must be on a
  commercial-use-permitted host FIRST.**
- ~~Owned-tools profile~~ — **SCHEDULED as Sprint 25** (§4.3, 2026-07-15).
- Community plan submissions (user-uploaded plans + admin review queue) — **kept
  deferred 2026-07-15 (Keagan)**: with zero public users there is nobody to submit,
  and who-owns-a-submitted-plan is a licensing decision that shouldn't be rushed.
- Makerspace/team accounts — blocked by the launch gate (paid tier).
- Remaining Phase 4 features (see the Phase 4 header), and `FUTURE_IDEAS.md`.

### 4.3 Completion plan — Sprints 24–27 (opened 2026-07-15, Keagan's scope calls)

Everything below is **$0, no new vendors, no branding dependency** — buildable now.
The four scope decisions (hardening first; workshop + tool-aware catalog; build logs
only from Phase 4; submissions stay deferred) are Keagan's, recorded in
`DECISIONS_LOG.md` 2026-07-15. Standard rules apply: one sprint at a time, §5 DoD,
§6 scorecard ≥95, §7 loop.

**Sprint 24 — Hardening Pass 2.** ✅ COMPLETE — 95/100 (2026-07-15). Sprint 9's pass
predated the redesign; Sprints 17–23 rebuilt most of what users touch. Code audit +
fixes done:
- **a11y (fixed):** `PlanTabs` declared `role="tablist"` but had no keyboard support —
  now the full WAI-ARIA pattern (roving `tabindex`, ← / → wrap, Home / End, active panel
  focusable). The nav math is extracted to `src/lib/tab-nav.ts` and unit-tested.
  Re-audited `InstructionsDisclosure` (aria + focus-on-reveal — sound), `RateLimitNotice`
  (`role="status"` — sound), the three-column catalog landmarks/heading order, filter
  chips, and the sort dropdown — no other gaps.
- **OWASP (clean):** re-checked every write path since Sprint 9 — view beacon,
  shopping-list toggle, Clerk webhook, review CTA. `safeReturnTo` verified against
  open-redirect (`//`, `/\`, non-slash); all writes rate-limited, session-scoped, no
  `userId`.
- **dead code / audit (clean):** no orphan components, eslint no-unused clean,
  `recommendations.tsx` already removed, **`npm audit` 0 vulnerabilities**.
- 501 tests green; typecheck + `eslint .` clean.

**Deferred to Keagan — device-bound, can't run from the sandbox:** the mobile Lighthouse
pass (real device, catalog + plan detail) and the service-worker airplane-mode regression
on a real phone. Same handoff shape as prior sprints' visual sign-off. The `PlanTabs`
keyboard fix also wants one real-browser keyboard check once deployed.

**Sprint 25 — My Workshop (owned-tools profile).** ✅ COMPLETE — 97/100 (2026-07-15).
`UserTool(userId, toolId)` model + migration; private `/workshop` screen (grouped tool
checkboxes, same grouping/list as the filter panel); `saveWorkshopAction` rate-limited
(`create` bucket) with the standard denial notice; `🧰 Workshop` link in the signed-in
header. Standing security verbatim: no `userId` params (owner from session),
`deleteMany` scoped by `userId`, submitted slugs validated against real tools, `/workshop`
off the allowlist (private) + `requireUser`. **URL stays the source of truth** — the
profile PRE-FILLS the filter panel's "tools you own" boxes only when the URL carries no
`?tools=`; results are always URL-driven, so a shared link renders the same catalog for
everyone. 511 tests green. **Needs the migration to run before it works** (§4.2). NOT built
(that's Sprint 26): the one-tap "plans I can build", plan-page "you own N tools", per-step
owned-tool highlight.

**Sprint 26 — Tool-aware catalog (completes Phase 4's tool-inventory-aware
search).** ✅ COMPLETE — 96/100 (2026-07-15). One-tap "🧰 Show plans I can build" on the
catalog (signed-in + has workshop + not already tools-filtered) — a plain GET `<Link>`
built via `buildQueryString`, expanding the profile into `?tools=`, so it's URL-driven,
shareable, and flows through the SAME `queryPlans` filter path (no second query). Plan
page shows tool fit for signed-in users: "✓ You own all N essential tools" or "You own X
of N. Missing: Router." with a link to `/workshop`; per-step tool chips highlight the ones
you own (✓). Fit logic is a pure `toolFit()` in `src/lib/workshop.ts`, unit-tested;
ESSENTIAL-only, matching the owned-tools filter so the page and filter agree. 516 tests
green. **Needs Sprint 25's migration** to have any owned tools to work with.

**Sprint 27 — Build logs (Phase 4, deliberately cut down — NO forums).** ✅ CODE COMPLETE
— self-scored 94/100, BELOW the 95 gate on in-session evidence (2026-07-15). A private
`/builds` "My builds" view (plans you've reviewed, your photos, dates) + a "🔨 N built
this" count on plan pages, **derived entirely from `Review`/`BuildPhoto` on read** (Sprint
16 rule: reviewed ⇒ built; no new progress table, nothing to backfill). **ZERO schema
change, ZERO migration** — the first feature-sprint needing neither. `listMyBuilds()` is
zero-arg, session-derived, `published`-scoped, newest-first; the count reuses
`getRatingSummary().count` (no `getBuildCount()` — a query for a number the page already
holds). Community stays read-only: no comments, no threads, no user-to-user surface.
**Why sub-gate:** `builds.ts` is unit-tested (5/5 green, isolated) and its select validated
against the schema, but the full in-repo `tsc`/`eslint`/`vitest` could NOT run this session
— `origin/main` is 4 sprints behind (23–26 unpushed, HEAD at Sprint 22), so a clean clone
lacks the 25/26 code these edits build on, and the 45s install cap corrupted `node_modules`.
Verification tooling, not a defect. Authoritative gate = Keagan's machine + CI. See
`SPRINT_LOG.md` Sprint 27 and §4.2 item below.

**Update (2026-07-15/16):** the gate ran on Keagan's machine — 524/524 vitest green,
`eslint` clean, `tsc` clean after `prisma generate` — and re-scored to **96/100**,
clearing the 95 gate on real evidence (see `SPRINT_LOG.md` Sprint 27 for the
breakdown). **Confirmed pushed 2026-07-16:** CI green, live site verified.

> ✅ **Unpushed tail RESOLVED (2026-07-16, Keagan).** Sprints 23–27 are pushed to
> `origin/main`. CI is green and the live site reflects all five sprints — confirmed
> directly by Keagan, not re-derived. The completion plan (§4.3) is fully closed.

**Keagan's parallel quick list ($0, minutes each, independent of the sprints):**

1. Set `CLERK_WEBHOOK_SIGNING_SECRET` in Vercel + register the `user.deleted`
   endpoint in Clerk (activates the deletion webhook — see `DEPLOYMENT.md`).
2. Visual sign-off on Sprints 18/20 desktop layouts in a real browser.
3. Review/approve the Sprint 23 About/FAQ copy (the brand name and contact line
   stay placeholders until #8 — the copy itself can be approved now).

### 4.4 UI framework migration — Sprints 28–32 (opened 2026-07-16, Keagan's direction)

Everything below is **$0, no new vendors, engineering-tooling only** — Tailwind is an
MIT-licensed npm dependency, not a hosted vendor, so this doesn't touch decision #9.
Full record: `DECISIONS_LOG.md` 2026-07-16. This migration is a **refactor of how CSS
is delivered, not a redesign** — the current look (cream/ink/orange, `Prototype
Wireframe` visual system) is the target output of Sprints 28–30, byte-for-byte as
rendered. **Pixel-parity against the live site, at all five existing breakpoints
(34/40/64/80/96rem), on mobile/tablet/desktop, is the acceptance bar for every sprint
in this section** — no visual change is authorized as a side effect of moving CSS
engines. The print stylesheet (`CLAUDE.md` "Print rule": kerf, ripping,
`break-inside: avoid`, tape-measure fractions, black-on-white) is explicitly **OUT of
scope for the whole migration** and stays plain CSS — Tailwind's `print:` variant is
not a good fit for those non-negotiables and re-deriving them risks losing one.

**Sprint 28 — Tailwind CSS environment setup (foundation only, zero visual change).**
✅ **COMPLETE — 97/100 (2026-07-14).** `postcss.config.mjs` + `src/app/tailwind.css`
(theme + utilities layers, **preflight deliberately excluded** so `globals.css` stays the
base reset and zero pixels move), `@theme inline` mapping all 15 color tokens to the live
`:root` `var()`s (single source of truth, not copied hex), `--breakpoint-xs: 34rem` added
(defaults already cover 40/64/80/96 → sm/lg/xl/2xl), imported ahead of the unlayered
`globals.css` so the hand-written system still wins every conflict. Verified by compiling
the entry file with the real Tailwind **v4.3.2** toolchain: utilities resolve to the exact
live values, breakpoints exact, no preflight reset emitted. `globals.css` untouched.
Guard test `tests/tailwind-setup.test.ts` locks the preflight-excluded + var-mapped
invariants. **Needs `npm install` (new devDeps) + verify + push on Keagan's machine** — the
full Next build (where Tailwind runs) can't run in the sandbox. See `SPRINT_LOG.md` Sprint
28. Original scope for reference:
Install `tailwindcss` + its PostCSS plugin (Tailwind v4 — CSS-first `@theme` config,
no `tailwind.config.js` needed, fits the Next 15 / React 19 stack already in place;
routine engineering choice, not escalated). Port the existing design tokens
(`--bg`, `--surface`, `--fg`, `--muted`, `--accent`, etc. from `globals.css`) into an
`@theme` block so Tailwind utilities (`bg-bg`, `text-fg`, `border-border`, …) resolve
to the *exact same* hex values already live. Add a custom breakpoint for the existing
non-default `34rem` rule (Tailwind's default scale has no equivalent — `sm` is
`40rem`); the four default breakpoints (`sm`/`lg`/`xl`/`2xl`) already line up with the
project's existing `40/64/80/96rem` media queries. **`globals.css` stays fully intact
and unchanged this sprint** — Tailwind is installed alongside it, not replacing
anything yet. DoD: build, dev, lint, typecheck, and the full test suite all still
green; **zero visual diff**, because nothing has changed yet.

**Sprint 29 — Component migration, wave 1 (shared shell + highest-traffic surfaces).**
✅ **COMPLETE — 96/100 (2026-07-14).** Converted `SiteHeader`/nav, the page shell (`.page`
container + skip link), the whole `.btn` system (base + ghost/primary/danger/liked + the
step-walker disabled state), the search form controls, and the catalog + plan-detail card
chrome to Tailwind utilities — reused classes centralised in `src/lib/ui.ts` (`btn*`, `page`,
`searchInput`, `categoryLabel`), one-offs inline. Each migrated rule deleted from
`globals.css`; every not-yet-converted modifier/print/context class (`.page-wide`,
`.page-catalog`, `.plan-detail`, print `.page`/`.site-header`/`.search-box`, `.saved-item
.plan-card`, `.step-walker-nav`, `.plan-rating`) KEPT — unlayered, so it still wins over the
layered utilities and parity holds mid-migration. Byte-parity verified at the declaration
level against the real Tailwind v4.3.2 compiler; two gotchas fixed (per-variant border/text
color to beat source-ordering; the `page` import aliased around a local `const page`). Guard
test `tests/ui-classes.test.ts` added. **Needs `npm run build` + a real-browser pixel-parity
pass + push on Keagan's machine.** See `SPRINT_LOG.md` Sprint 29. Original scope for reference:
Convert `SiteHeader`/nav, the page layout shell (`.page` container, skip link), buttons
(`.btn`, `.btn-primary`, `.btn-ghost`), form controls, and the card components used on
the catalog and plan-detail pages to Tailwind utility classes. Delete each rule from
`globals.css` as its component converts — no dead CSS left behind mid-migration.

**Sprint 30 — Component migration, wave 2 (remaining page-specific styles).**
🟡 **IN PROGRESS — delivered in three browser-checkable sub-waves (30a/b/c), Keagan's
direction 2026-07-14**, so the ~200-rule retirement is pixel-checked incrementally rather than
as one blind diff. **30a COMPLETE — 96/100 (2026-07-14):** the Sprint 18 three-column catalog
grid (`grid-template-areas` via `lg:` arbitrary utilities) and the Sprint 20 plan-detail layout
(two-column grid, image slot, Tools/Materials/Cut-list tabs, instructions disclosure). Deferred
within 30a for documented cascade reasons: `.plan-grid` (shared grid → do with saved/paths),
`.catalog-nav-heading` (overrides global `h2` → typography pass), `.page-wide.plan-detail`
(compound override of a retained modifier). **30b COMPLETE — 96/100:** the filter panel (incl.
`:has()` checkbox pills), chips, sort, saves/collections, shopping list, workshop, build log —
shared `selectControl`/`checkbox`/`chip` in `src/lib/ui.ts`; deferred to 30c (headings that
override global `h2`, the shared `.plan-grid`, boards' `scope-form`/`notice`). **30c** = reviews +
board-plan + paths + prose + skeletons + the global typography/reset, ending with `globals.css`
down to `:root` + print + reset. See `SPRINT_LOG.md` Sprint 30a/30b. Original scope for reference:
Convert the three-column catalog grid, plan-detail tabs/instructions/image slot,
filter panel + active-filter chips, shopping list, workshop/builds screens, and
about/faq prose. By the end of this sprint `globals.css` is retired down to: the
`:root` token definitions (kept as the single source of truth — Tailwind's `@theme`
reads from them, not a duplicate copy), the print stylesheet, and any truly-global
reset with no Tailwind utility equivalent. Same pixel-parity acceptance bar as
Sprint 29.

**Sprint 31 — Light/dark theme system + toggle.** ✅ **COMPLETE — 96/100 (2026-07-14).**
`@custom-variant dark` + a `.dark {}` block in `globals.css` that FLIPS the `:root` tokens —
so every utility AND the component-CSS residual re-theme with no `dark:` utilities. Light =
current palette, unchanged. Dark = a warm-dark palette (dark surfaces, off-white text, SAME
orange accent, functional colours lightened); the 11 key text pairs computed at **AA (5.7–15.6:1)**,
incl. the active-pill fix (on-accent text routed through a new `--accent-fg` = dark ink in both
themes, 8.5:1). SSR-safe: the root layout reads a `theme` cookie and stamps `.dark` on `<html>`
before paint (no FOUC; default light). Toggle lives in the Clerk `UserButton` dropdown via
`UserButton.Action` `onClick` (a client `UserMenu` island; `@clerk/nextjs` ^6.12). Print forced to
white/black by resetting the tokens under `@media print`. **Device-bound (Keagan):** full WCAG-AA
audit (`design:accessibility-review`) + real-browser toggle test — see Sprint 32. Original scope:
Tailwind's class-based dark variant
(`@custom-variant dark` in v4) over the token set from Sprint 28. **Light theme is the
current palette, unchanged.** Dark is a new palette derived from the same cream/ink/
orange accent system (dark surface, light text, same orange accent), contrast-checked
to WCAG AA (`design:accessibility-review` applies, same bar as the Sprint 24 a11y
pass). **Toggle lives in the Clerk `UserButton` dropdown**, per Keagan's explicit
placement instruction — verify `@clerk/nextjs` (^6.12.0, currently installed) supports
a custom `UserButton.Action` item; if not, the fallback is a plain menu item styled to
match. **Persistence must be SSR-safe** — reading `localStorage` alone flashes the
wrong theme on first paint of a server-rendered page; use a cookie read in the root
layout or a small blocking inline script that sets the theme class before hydration.
**Default is light** (the current, familiar theme) — no surprise dark-on-first-visit.
Print stays forced to light/black-on-white regardless of the user's theme choice (the
existing print non-negotiable, unaffected by this sprint).

**Sprint 32 — Responsive & theme hardening pass.** ✅ **COMPLETE — 95/100 (2026-07-14).**
Code-auditable hardening done: **full dark-palette AA audit** — all text + focus/interactive
pairs pass (muted-2 5.1, accent-strong 10.5, danger 7.1, err 6.3, ok focus-ring 7.5, active-pill
8.5); dark borders are intentionally subtle hairlines matching the light baseline (light borders
are ~1.1:1 too). **Hardcoded-colour audit** fixed the three that didn't theme: `.impossible-part`
red text → `var(--err)`, a dark `.skel` shimmer gradient, and the install-prompt subtitle
(`dark:` override, light unchanged). Print confirmed forced-light; no-JS/offline document integrity
preserved (retained print classes). Guard test `tests/dark-theme.test.ts` locks light/dark token
sync + the print reset. **Device-bound → Keagan:** real-phone Lighthouse, real-browser toggle/FOUC
test, and the full visual-regression pass at all five breakpoints × both themes. Original scope:
Full mobile/tablet/desktop
re-verification at all five breakpoints, in both themes; WCAG AA contrast audit of the
dark palette; visual regression spot-check against the pre-migration site; confirm
offline/print/no-JS still render the complete document (print theme-agnostic by
design). Device-bound checks (real-phone Lighthouse, real-browser toggle test) are
handed to Keagan, same pattern as the Sprint 24 hardening pass.

---

## 5. Definition of Done (applies to every sprint)

A sprint is not complete until **all** of the following are true:

- [ ] Every deliverable listed for the sprint in Section 4 is implemented.
- [ ] No feature outside the sprint's listed deliverables was added
      (check against Section 4's scope note and the backlog).
- [ ] Every business/vendor/legal/money decision made during the sprint
      is present in `DECISIONS_LOG.md` with the user's actual answer —
      not an assumed default.
- [ ] Automated tests exist and pass for the sprint's functionality.
- [ ] The change has been manually verified end-to-end (driving the
      actual feature, not just reading code/tests) — per this repo's
      `/verify` practice once application code exists.
- [ ] No known security issue (OWASP top 10) was introduced.
- [ ] The sprint has been self-scored on the Section 6 scorecard at
      ≥95%, following the Section 7 loop.
- [ ] `SPRINT_LOG.md` has a new entry: sprint number, date, summary,
      final score, scorecard breakdown, and the commit SHA(s) on `main`.

**Branching model (decided 2026-07-12, see `DECISIONS_LOG.md`): trunk-based —
commit and push directly to `main`. No feature branches, no pull requests.** CI
still runs on every push to `main`, but it is a *detector*, not a *gate* —
nothing blocks a bad commit from landing, and it gets fixed forward. Accepted
deliberately; revisit before launch, when `main` starts serving real users.

**Deploy early in every sprint.** Sprint 0 shipped four defects that local
typecheck, lint, and a green test suite all missed, and that only surfaced on a
real deploy (missing `package.json` in the commit, an incomplete lockfile that
broke `npm ci`, an ungenerated Prisma client, and a transitive CVE). Green tests
are not proof it works. Get it deployed, then iterate.

---

## 6. Quality Scorecard (Self-Scoring Rubric)

Score every sprint out of 100 using this rubric. Each category's score is
the awarded points out of its max, with one required sentence of
evidence (not just a number) per category.

| # | Category | Max Points | What's being measured | Evidence required |
|---|---|---|---|---|
| 1 | Requirements fidelity | 25 | Does the sprint deliver exactly what Section 4 specified for it — no more, no less, no invented business logic | Cite the exact Section 4 bullet(s) each deliverable maps to |
| 2 | Correctness & functionality | 20 | Does the feature work end-to-end for the golden path and reasonable edge cases | Describe the manual verification steps taken and their outcome |
| 3 | Automated test coverage | 15 | Are the sprint's behaviors covered by tests that actually exercise them (not trivial/tautological tests) | Name the test files/cases and what each one proves |
| 4 | Security | 15 | No injection, auth-bypass, secret-leak, or other OWASP top-10-class issue introduced | State what was checked (inputs, auth boundaries, secrets handling) |
| 5 | Code quality & simplicity | 10 | No dead code, no premature abstraction, follows existing repo conventions, no unnecessary complexity | Note any simplification/cleanup pass performed |
| 6 | Mobile/offline behavior | 10 | Given the PWA-first strategy, does this sprint's UI work well on mobile and (where relevant) offline | Describe what was tested on a mobile viewport / offline mode |
| 7 | Documentation & handoff | 5 | Commit messages, PR description, and any relevant doc updates are clear enough for someone else to pick up | Link the PR and note what was documented |

**Total: 100. Passing threshold: 95.**

Sprints with no offline/mobile-relevant surface (rare, but possible for
a pure backend sprint) may redistribute category 6's 10 points into
category 2 (Correctness) — note this explicitly in the sprint log entry
if used.

---

## 7. Self-Scoring & Remediation Loop

1. At sprint completion, the build agent scores itself against Section 6
   and records the breakdown (not just the total) in `SPRINT_LOG.md`.
2. **If the total is ≥95%:** the sprint is done. Proceed to the next
   sprint (or stop for user review, if the user has asked to check in
   between sprints).
3. **If the total is <95%:** the build agent must:
   a. Identify the specific category/categories losing points and why.
   b. Fix the underlying issue (not just the score) — re-verify the
      feature after the fix, don't just re-score the same work.
   c. Re-score against the full rubric.
   d. Repeat up to **3 total scoring attempts** for the sprint.
4. **If still <95% after 3 attempts:** stop. Do not keep looping. Report
   to the user: the current score, exactly what's failing and why, what
   was already tried, and a recommended next step (e.g., "this needs a
   design decision from you," "this needs more time than a single
   sprint allows," "this deliverable should be split"). This is a
   guardrail against burning effort on a sprint that has a deeper
   problem than a quick fix — a stuck sprint is a signal to escalate,
   not a reason to keep silently retrying.
5. Every attempt (not just the final one) is logged in `SPRINT_LOG.md`
   so the history of what was wrong and what was fixed is visible.

---

## 8. Logs

- **`DECISIONS_LOG.md`** — every business/vendor/legal/money decision,
  who decided it (user, with the build agent's recommendation noted),
  and when. This is the source of truth Section 1.1's "factual
  reasoning" rule points back to.
- **`SPRINT_LOG.md`** — every sprint's outcome: scope, final score,
  scorecard breakdown, remediation attempts if any, and links to the
  resulting PR(s).

Both files are seeded with their format and the decisions already made
during business planning (see `DECISIONS_LOG.md`).
