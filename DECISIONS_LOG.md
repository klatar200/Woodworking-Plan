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

See `BUILD_PLAN.md` §3 for the full list (frontend framework, backend
framework, database, hosting, auth build-vs-buy, payment processor,
content admin approach, branding/domain, budget ceiling). None are
answered yet; entries will be added here as each is confirmed.
