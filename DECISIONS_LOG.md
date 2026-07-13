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

### 2026-07-12 — Sprint 0 free-tier re-verification (Vercel / Neon / Clerk)
**Status:** Verified by build agent at the start of Sprint 0, as required by the
free-tier stack decision above.

- **Neon (Postgres):** Still a genuine perpetual free tier — not a trial, no
  expiry, no forced upgrade. Free plan as of July 2026: 0.5 GB storage/project,
  100 CU-hours/project/month, autoscale to 2 CU, scale-to-zero after 5 min idle.
  No commercial-use restriction. **No change needed.**
- **Clerk (auth):** Free tier has *improved* since the stack decision was logged.
  Clerk's 2026-02-05 pricing change raised the free allowance from 10,000 to
  **50,000 monthly retained users**. Strictly better than what was logged; no
  decision required. **The "up to 10k MAU" figure in `BUILD_PLAN.md` §3 decision
  #5 is now stale — the real figure is 50k.**
- **Vercel (hosting):** Hobby is genuinely free, but carries a commercial-use
  restriction that was not known when the stack was chosen — see the decision
  immediately below.

### 2026-07-12 — Vercel Hobby commercial-use restriction: build on Hobby, hard gate before launch
**Status:** Confirmed by user (chosen from 3 options: stay on Hobby and revisit
at launch [recommended]; switch to a host with no commercial-use ban; pay for
Vercel Pro now).

**The conflict.** Vercel's Hobby plan is free but restricted to non-commercial,
personal use. Vercel defines commercial usage broadly — explicitly including
"any method of requesting or processing payment from visitors of the site" and
"the inclusion of advertisements." Both are core to `BUSINESS_PLAN.md` §7
(subscription tiers, affiliate links, ads on the free tier). Enforcement is
real: violation can result in account suspension. Lifting the restriction
requires Vercel Pro at **$20/user/month**, which collides with the
$0-during-development decision. This was not surfaced when the stack was
confirmed, so it is recorded as a correction to that decision's assumptions.

**The decision.** Build Phase 0 and Phase 1 on the free Hobby tier. During the
build there are no payments, no ads, no affiliate links, and no public marketing
traffic, so the commercial-use clause is not triggered by anything deployed. The
$0-during-development constraint is preserved intact.

**Hard gate — binding on all future sprints.** The project must move off Hobby to
Vercel Pro (or an equivalent commercial-use-permitted host) **before any of the
following ship to production:**
1. Any billing or payment integration (also gated on decision #6, still open).
2. Any advertisement or affiliate link rendered to a real visitor.
3. Any public launch or marketing push.

No sprint may ship any of the above on Hobby. On reaching the first of them,
stop and escalate for the launch-economics conversation.

**Acknowledged residual risk (user accepted):** Vercel's clause is worded around
"financial gain of anyone involved in any part of the production of the project,"
so a strict reading is arguable even pre-revenue. The user reviewed the wording
and chose to proceed on Hobby for the build phase.

### 2026-07-12 — Branching model: trunk-based, commit straight to `main`
**Status:** Confirmed by user.
**Source:** User instruction: "Ensure that we are pushing straight to main when
we merge or commit any and all sprints. This is a working dev app meaning we are
not going to screw anything up and any issues will be troubleshooted when
pushed."

**The decision.** All sprint work is committed and pushed directly to `main`. No
feature branches, no pull requests, for any sprint. `BUILD_PLAN.md` §5
(Definition of Done) is amended: it previously required "links to the PR(s)"; it
now requires the commit SHA(s) on `main`.

**Accepted trade-off (raised by the build agent, accepted by the user).** CI
still runs on every push to `main`, but with no PR and no branch protection it is
a **detector, not a gate** — a commit failing lint/typecheck/tests/build lands on
`main` anyway and is fixed forward. Reasonable for a single-developer, zero-user
dev app.

**Must be revisited before launch.** Once `main` serves real users, a broken
`main` stops being free. Re-evaluate branch protection + required CI checks at the
same time as the Vercel Hobby → Pro move.

### 2026-07-12 — Plan-content admin/CMS: version-controlled seed files now, custom admin panel later
**Status:** Confirmed by user (chosen from 3 options: seed files now + admin panel
later [recommended]; custom admin panel in Sprint 1; third-party headless CMS).
**Resolves:** `BUILD_PLAN.md` §3 decision #7. **Sprint 1 is unblocked.**

**The decision.** Plan content lives as version-controlled structured files
(JSON/Markdown) in the repo, loaded into Postgres by an idempotent seed script.
Sprint 1 ships the plan schema + that ingestion path — enough to load the ~20 real
test plans §4 calls for. **No admin UI in Sprint 1.**

**Rationale.** The ~20 development plans don't need an editing UI to exist, and
designing edit screens for a schema that has never met real content is how you
build the wrong screens. Costs $0, adds no vendor, keeps content diffable and
reviewable in git, and doesn't depend on Clerk auth (which isn't built until
Sprint 2).

**Explicitly rejected:** a third-party headless CMS (Sanity/Contentful). It would
add a new vendor with lock-in, split the source of truth across two systems, and
generic CMSes model this fixed, opinionated plan schema (tools / materials /
time / cost tier / difficulty) awkwardly.

**Accepted trade-off:** until the admin panel is built, Keagan cannot add or edit
plans without the build agent. Acceptable during development; **it stops being
acceptable once a real content pipeline is needed.** A custom admin panel is
therefore deferred, not cancelled — it should be scheduled once the schema has
proven itself against real plans, and it is a prerequisite for the in-house
content team described in `BUSINESS_PLAN.md` §6.

### 2026-07-12 — Separate dev and production databases (Neon branch)
**Status:** Confirmed by user. Raised proactively by the build agent as a
production/security risk at the end of Sprint 1.

**The risk.** Sprint 0 and Sprint 1 ran with `.env.local` and Vercel pointing at
the **same** Neon database. Harmless while the only data was reproducible seed
content — a bad `db:seed` just rewrote plans. It becomes a live-data hazard the
moment Sprint 2 (Accounts & Auth) creates real user records: a routine local
`npm run db:seed`, `migrate reset`, or a bad `migrate` would hit production users.

**The decision.** Use a Neon **`dev` branch** with its own connection string in
`.env.local`. Vercel continues to point at `production`. Neon's free tier includes
10 branches, so this costs **$0** and does not touch the $0-during-development
constraint.

**The resulting contract (binding on all future sprints):**
- Local db commands (`db:migrate`, `db:seed`, `db:push`, `migrate reset`) hit the
  **dev** branch only.
- Production's schema changes **exclusively** via `prisma migrate deploy`, run by
  Vercel on deploy from the committed migrations in `prisma/migrations/`.
- `npm run db:seed` prints its target database host on every run, so the
  environment being written to is never a guess.

Setup steps are in `DEPLOYMENT.md` §5.5.

### 2026-07-12 — Sign-in methods: email/password + Google OAuth
**Status:** Confirmed by user (chosen from 3 options: Email + Google
[recommended]; Email + Google + Apple; email/password only).
**Source:** `BUSINESS_PLAN.md` §4.1 specifies "sign up/login (email + OAuth)" but
does not name the providers. This resolves that gap for Sprint 2.

**The decision.** Clerk is configured with **email/password + Google OAuth**.

**Rationale.** Google covers the overwhelming majority of the target demographic
in `BUSINESS_PLAN.md` §3 (30–65, homeowners, existing DIY/YouTube audience) and is
a single toggle in Clerk. Email/password remains for anyone who won't use a social
login.

**Apple sign-in explicitly rejected — and this one is a cost issue, not a taste
issue.** Apple OAuth requires an Apple Developer account at **$99/year**, which
would breach the $0-during-development constraint. Revisit only if a native iOS
app happens (Phase 3, deferred): Apple *requires* Sign in with Apple on any iOS app
that offers other social logins, so the cost would become unavoidable then — but
not before.

### 2026-07-13 — Save/category limits: unlimited for now, gate later
**Status:** Confirmed by user (chosen from 3 options: unlimited now [recommended];
enforce the §7 limits now; a configurable limit defaulting to unlimited).

**The conflict.** `BUSINESS_PLAN.md` §7 proposes a Free tier with "limited saves
(e.g. 10 plans), 1 category folder", and §12 says to "gate high-value actions
(unlimited saves/categories) rather than content itself". But `DECISIONS_LOG.md`
lists the entire monetization model under **"Recommendations Awaiting Explicit
Confirmation"** — it is not a confirmed decision. Implementing a hard 10-save cap
would mean the build agent enacting an unconfirmed pricing decision, which
`BUILD_PLAN.md` §2 forbids.

**The decision.** Sprint 6 ships saves and custom categories with **no limits**.

**Rationale.** There is no billing (decision #6 is deferred), no paid tier, and no
upgrade path. A 10-save cap today would be a wall with no door — it would only
frustrate users while committing to specific numbers before launch economics have
been discussed.

**The obligation this creates.** The build agent must design the schema and data
layer so that a limit can later be enforced in **one place**, without reworking
saves or categories. That constraint is on the build agent, not on this decision.

**Revisit when:** launch economics are discussed (the same conversation as the
Vercel Hobby → Pro move and decision #6, payment processor). Pricing and tier
limits should be confirmed together, not piecemeal.

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
