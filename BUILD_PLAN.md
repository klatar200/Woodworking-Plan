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
| 7 | Plan-content admin/CMS | Sprint 1 | A lightweight custom admin panel over a general headless CMS — plan metadata (tools/materials/cost tier/time/difficulty) is a fixed, opinionated schema a generic CMS doesn't model well out of the box | **Open** |
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

**Important scope note:** the feature ideas discussed in chat before this
build plan (comments on plans, tool substitution notes, an "owned
tools" profile, local lumber price sync, plan versioning, an offline
"shopping mode") are **not** in `BUSINESS_PLAN.md` yet and are therefore
**out of scope** for every sprint below until you decide which of them to
adopt and the business plan is updated accordingly. This is the
guardrail in Section 1.1 applied directly: no sprint should build a
feature the business plan doesn't actually specify.

### Phase 0 — Setup (gated on Section 3 decisions)

- **Sprint 0: Environment & Architecture** — Next.js (TypeScript) repo
  structure covering both frontend and API routes, Neon Postgres
  provisioned on its free tier, Clerk configured on its free tier, CI
  pipeline (lint/typecheck/test on every push), local dev environment,
  deployment pipeline to Vercel's free Hobby tier (can deploy an empty
  "hello world" end to end), environment/secrets management. Every
  service provisioned in this sprint must be confirmed as a genuine free
  tier before use — see decision #9: **no costs during development.**

### Phase 1 — MVP / Launch (`BUSINESS_PLAN.md` §4, delivered as a PWA per §5)

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

### Phase 2 (`BUSINESS_PLAN.md` §10, to be broken into sprints when this phase starts)
- User reviews/ratings and build photos ("I made this")
- Personalized recommendations based on saved/liked plans and owned tools
- Shopping list generator (aggregate materials across saved plans, affiliate links)
- Print-friendly / offline PDF export of plans
- Expanded offline mode (pre-cache entire saved-plan library)

### Phase 3 (to be broken into sprints when this phase starts)
- Creator marketplace (third-party plan publishing + monetization)
- Cut-list optimizer / board-footage calculator
- Project cost estimator using local lumber prices
- Makerspace/team accounts
- Skill-building learning paths
- Native iOS/Android re-evaluation (only if data shows push/discovery is a real growth bottleneck)

### Phase 4 (to be broken into sprints when this phase starts)
- AI-assisted plan customization (resize/re-species with recalculated cost/materials)
- Community forums / build logs
- Video content integration
- International expansion (metric units, regional pricing)
- Tool-inventory-aware search

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
      final score, scorecard breakdown, and links to the PR(s).

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
