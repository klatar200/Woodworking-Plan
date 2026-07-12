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

### 2026-07-12 — Database: PostgreSQL
**Status:** Confirmed by user (selected from 3 recommended options: PostgreSQL, MongoDB, MySQL).
**Source:** `BUILD_PLAN.md` §3, decision #3. Rationale: relational fit for structured plan metadata, mature full-text search.

### 2026-07-12 — Hosting/infra: managed platform (Render/Railway/Vercel)
**Status:** Confirmed by user (selected from 3 recommended options: managed platform, AWS/GCP/Azure directly, self-hosted/VPS).
**Source:** `BUILD_PLAN.md` §3, decision #4. Rationale: low ops burden, fits the lean early-stage cost profile in `BUSINESS_PLAN.md` §8.

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

See `BUILD_PLAN.md` §3 for the full list. Frontend framework, backend
framework, database, and hosting (#1-4) are confirmed above. Still open:
auth build-vs-buy (#5, blocks Sprint 2), payment processor (#6, not
urgent), plan-content admin/CMS approach (#7, blocks Sprint 1),
branding/domain (#8), and MVP infra/tooling budget ceiling (#9, blocks
Sprint 0 provisioning).
