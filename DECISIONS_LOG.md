# Decisions Log

Every business, vendor, legal, or money decision affecting this project,
in the order it was made. This is the factual record `BUILD_PLAN.md`
requires all sprint work to trace back to — no sprint should assume a
business decision that isn't logged here with the user's actual answer.

Format per entry: date, decision, status, source/rationale.

---

### 2026-07-12 — Platform strategy: mobile-first PWA, not native-app-first
**Status:** Confirmed by user.
**Source:** User described actual workflow (phone-only use in the
workshop, outdoors, and at the hardware store, often with weak
connectivity); recommendation and trade-offs documented in
`BUSINESS_PLAN.md` §5. Native app re-evaluation deferred to Phase 3,
contingent on push-notification/discovery needs.

### 2026-07-12 — License: Proprietary / All Rights Reserved
**Status:** Confirmed by user (selected from 3 offered options: Proprietary, MIT, or no license file).
**Source:** Chosen given the business plan's monetization strategy — see `LICENSE`.

### 2026-07-12 — Frontend framework: React + Next.js
**Status:** Confirmed by user (selected from 3 recommended options: React + Next.js, Vue + Nuxt, SvelteKit).
**Source:** `BUILD_PLAN.md` §3, decision #1. Rationale: best PWA/offline tooling maturity, pairs with the mobile-first PWA strategy already confirmed.

### 2026-07-12 — Backend framework: Node.js + TypeScript
**Status:** Confirmed by user (selected from 3 recommended options: Node.js + TypeScript, Python/FastAPI/Django, Go).
**Source:** `BUILD_PLAN.md` §3, decision #2. Rationale: one language across front and back end.
**Superseded/clarified 2026-07-12:** given the $0-during-development
constraint below, the backend will be delivered as Next.js API routes
running on Vercel rather than a separately-hosted Node service — still
Node.js + TypeScript, just without a second host to pay for or operate.
See the free-tier stack decision below.

### 2026-07-12 — Database: PostgreSQL
**Status:** Confirmed by user (selected from 3 recommended options: PostgreSQL, MongoDB, MySQL).
**Source:** `BUILD_PLAN.md` §3, decision #3. Rationale: relational fit for structured plan metadata, mature full-text search.

### 2026-07-12 — Hosting/infra: managed platform (Render/Railway/Vercel)
**Status:** Confirmed by user (selected from 3 recommended options: managed platform, AWS/GCP/Azure directly, self-hosted/VPS).
**Source:** `BUILD_PLAN.md` §3, decision #4. Rationale: low ops burden, fits the lean early-stage cost profile in `BUSINESS_PLAN.md` §8.
**Narrowed 2026-07-12:** specific provider selected — see the free-tier stack decision below.

### 2026-07-12 — Development-phase budget: $0, hard constraint
**Status:** Confirmed by user.
**Source:** User instruction: "There should be no startup costs while
developing the application. When it goes live, we can discuss it then
but during the build there should be absolutely no costs." This
resolves `BUILD_PLAN.md` §3 decision #9. Every vendor/tooling choice
during the build phases (Phase 0 through at least the end of Phase 1)
must use a genuinely free tier — not a free trial or a tier with a
time-limited or usage-limited expiry that would force a paid upgrade
mid-build. Hosting/monetization economics get revisited explicitly at
launch, per the user's instruction — not before.

### 2026-07-12 — Free-tier stack: Vercel + Neon Postgres + Clerk
**Status:** Confirmed by user (selected from 3 recommended options: Vercel + Neon + Clerk, Render + Supabase Auth, Supabase all-in-one + Vercel).
**Source:** `BUILD_PLAN.md` §3, decisions #4 (hosting, narrowed) and #5
(auth, now resolved). Rationale: Vercel hosts both the Next.js frontend
and its API routes on one free Hobby-tier account (no second host to
pay for); Neon provides a Postgres free tier with no auto-expiry
(idles/cold-starts, does not delete data or force an upgrade); Clerk's
free tier covers up to 10,000 monthly active users, far beyond
development needs. All three are real perpetual free tiers as of this
writing — re-verify current terms at the start of Sprint 0, since
vendor free-tier terms can change.

### 2026-07-12 — Default branch / repo housekeeping
**Status:** Open — user asked to set `main` as the repository default
branch and delete stale merged branches. No available tool exposes
GitHub's default-branch setting or branch deletion; this requires the
user to act directly in GitHub's Settings → Branches UI. Not a build
blocker, but tracked here since it's an outstanding action item.

---

## Recommendations Awaiting Explicit Confirmation

These are **not** decisions yet — they are the build agent's
recommendations written into `BUSINESS_PLAN.md` during planning, and
must not be treated as confirmed business decisions until the user
explicitly signs off (per `BUILD_PLAN.md` §1.1, factual reasoning only).

- **Monetization model & pricing** (`BUSINESS_PLAN.md` §7): Freemium
  subscription with Free / Plus ($6.99/mo) / Pro ($14.99/mo) / Creator
  revenue-share tiers is a recommendation, not a confirmed pricing
  decision. Must be explicitly confirmed (or revised) before any billing
  integration work begins.
- **Monthly profit estimates** (`BUSINESS_PLAN.md` §8): planning-level
  estimates only, explicitly labeled as such in the business plan. Not a
  target or commitment.
- **Content strategy specifics** (`BUSINESS_PLAN.md` §6): "license or
  partner with established plan creators" is a strategic direction, not
  a confirmed list of actual creators/partners or licensing terms — any
  real content-licensing agreement is a legal/money decision requiring
  explicit user sign-off per `BUILD_PLAN.md` §2.

## Pending — Pre-Sprint-0 Decisions

See `BUILD_PLAN.md` §3 for the full list. Confirmed: frontend framework,
backend framework, database, hosting/auth stack, and budget (#1-5, #9).
Still open: payment processor (#6, not urgent — deferred until launch
per the $0-during-development decision above), plan-content admin/CMS
approach (#7, blocks Sprint 1), and branding/domain (#8, blocks
public-facing copy, not Sprint 0). **Sprint 0 is unblocked and can
begin.**
