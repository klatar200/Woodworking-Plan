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

### 📌 Status at a glance (updated 2026-07-14)

| Phase | Status |
|---|---|
| Phase 0 (Sprint 0) | ✅ COMPLETE — 99/100 |
| Phase 1 MVP (Sprints 1–9) | ✅ COMPLETE — all sprints ≥94, deployed |
| Rate limiting (standalone, pre-Sprint 10) | ✅ COMPLETE — incl. user feedback (2026-07-14) |
| Phase 2 (Sprints 10–14) | ✅ COMPLETE — every §10 item except affiliate links (blocked by Hobby, not oversight) |
| Phase 3 (Sprints 15–16) | ✅ COMPLETE — cut-list optimizer + learning paths; 3 items cut to `FUTURE_IDEAS.md` |
| UI redesign + prototype integration | ✅ COMPLETE — see §4.1 below |
| Phase 4 | ⛔ NOT OPENED — do not start without Keagan explicitly opening it |
| **Launch blockers** | 🔴 OPEN — see §4.2 below; these come due before anything else ships |

Per-sprint scores and evidence live in `SPRINT_LOG.md`; the operational
detail behind each ✅ lives in `CLAUDE.md` §7. Test suite as of this
update: **442 green** (2026-07-14: Clerk deletion webhook, offline policy
de-duplicated, paths offline, cut-list yield made width-aware).

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

### Phase 4 ⛔ NOT OPENED (to be broken into sprints if/when Keagan opens it)
- AI-assisted plan customization (resize/re-species with recalculated cost/materials)
- Community forums / build logs
- Video content integration
- International expansion (metric units, regional pricing)
- Tool-inventory-aware search

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

### 4.2 🔴 Still required — open items, in priority order

**Launch blockers (come due before anything else ships):**

1. **Vercel env target verification (found 2026-07-14).** Production Neon branch
   (`ep-long-lake`) was 3 migrations behind with 0 users — the live site has
   likely been running against the DEV branch the whole time. `long-lake` is now
   fully migrated + seeded. **Keagan:** check which branch Vercel's
   `DATABASE_URL`/`DIRECT_URL` point at, then we swap or formally redesignate.
   Until resolved, treat both branches as live.
2. **Rotate the leaked Neon + Clerk credentials** (pasted into a chat transcript;
   treat as compromised). **Keagan:** rotate in both dashboards, update
   `.env.local` and BOTH Vercel env vars together (Neon branches share the role
   password).
3. **Branding/domain (§3 decision #8).** Blocks PWA icons (placeholders), SEO
   (`robots: noindex` is set sitewide because of it), and HSTS preload.
4. **Going publicly live is Keagan's explicit call** — named as a gate trigger
   out of caution; that caution stands.

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
- Owned-tools profile (`UserTool` table + "my workshop" screen) — deferred to its
  own sprint, per `DECISIONS_LOG.md` 2026-07-13.
- Makerspace/team accounts — blocked by the launch gate (paid tier).
- Phase 4 features, and everything in `FUTURE_IDEAS.md`.

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
