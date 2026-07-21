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

### 2026-07-13 — LAUNCH ECONOMICS: stay on Vercel Hobby, no monetization for now
**Status:** Confirmed by user, after a costed analysis (`LAUNCH_ECONOMICS.md`) with
all vendor pricing verified against current terms on 2026-07-13.

**Two linked answers:**
1. **Hosting: stay on Vercel Hobby.** Do not move to Pro ($20/mo). Consequently,
   **drop affiliate links.**
2. **Pricing: deferred.** No billing, no subscription tiers, no payment processor.

**What this means, stated plainly.** The product carries **no monetization at all**:
no ads, no affiliate links, no payments. That is what makes staying on Hobby legal —
Vercel's commercial-use prohibition covers exactly those three things.

**What is given up, for now.** `BUSINESS_PLAN.md` §8 names affiliate attach rate as
one of the two biggest profit levers ("close to pure margin"). Forgoing it is a real
cost, accepted deliberately in exchange for a $0 run rate and no pricing commitment
made before there is usage data.

**What this UNBLOCKS.** Everything in Phase 2 except billing:
- Reviews/ratings and build photos
- Personalized recommendations
- Shopping-list generator — **still valuable without affiliate links**; aggregating
  materials across saved plans into one buyable list is the useful part
- Print-friendly / PDF export
- Expanded offline mode

**The gate is NOT lifted — it is now sharper.** The moment ANY of the following is
added, the project must move to Vercel Pro (or an equivalent commercial-use-permitted
host) **first**:
- any advertisement,
- any affiliate link,
- any payment taken from a visitor.

**Honest caveat the build agent must record.** Vercel's clause is worded around
"financial gain of anyone involved in any part of the production of the project."
A genuinely free, unmonetized product is defensible under it. But a *public launch*
of a project intended to become a business is a grayer area than a private one, and
the build agent's original gate (2026-07-12) named "any public launch" as a trigger
out of caution. **That caution stands: going publicly live is Keagan's call to make
with eyes open, not something the build agent will do implicitly.** `robots: noindex`
remains set sitewide until decision #8 (branding) resolves anyway.

**Superseded, pending revision by Keagan:**
- `BUSINESS_PLAN.md` §7 (pricing tiers) — remains an unconfirmed recommendation. No
  billing work will be started against it.
- `BUSINESS_PLAN.md` §8 (profit estimates) — its revenue lines assume subscription
  and affiliate income that now do not exist. Its **cost** lines are also wrong in
  the other direction: it budgets $150/mo of early-stage infra; the real figure is
  **$0** on the current stack (Vercel Hobby, Neon free, Clerk free to 50k users).

**Decision #6 (payment processor) remains deferred.** Nothing to decide until there
is something to charge for.

### 2026-07-13 — Rate limiting: Upstash Redis (free tier)
**Status:** Confirmed by user.
**Source:** The Sprint 9 OWASP audit found no rate limiting on server actions —
anyone can hammer `likePlanAction` or `createCollectionAction` in a loop.

**Why a vendor at all.** An in-memory limiter is **theatre on serverless**: each
Vercel instance has its own memory, so the limit is per-instance and effectively no
limit. Shipping one would have looked like a fix while leaving the hole open, which
is worse than none — it closes the issue in everyone's mind. Rate limiting requires
shared state; shared state requires a store.

**The choice.** Upstash Redis — genuine perpetual free tier (**500K commands/month**,
256MB), which is far beyond what rate limiting needs at this scale. **$0**, so the
$0-during-development constraint holds.

### 2026-07-13 — Phase 2 begins: Sprint 10 = Reviews, ratings & build photos
**Status:** Confirmed by user.
**Source:** `BUSINESS_PLAN.md` §10 lists it first in Phase 2. `BUSINESS_PLAN.md` §12
names "thin/low-quality catalog kills trust" as the **top risk to the product**, and
"I made this" build photos are the strongest available answer to it.

**This unblocks a new vendor decision: image storage.** Build photos are user-uploaded
files, and there is nowhere to put them today. See the next entry.

### 2026-07-13 — Image storage: Cloudflare R2 — ⛔ SUPERSEDED, DO NOT IMPLEMENT
**Status:** REVERSED same day. See the Vercel Blob entry below. Kept for the record
because the reason it was wrong matters more than the decision itself.

**Why it was reversed.** I recommended R2 without checking how it is *activated*.
**Cloudflare requires a payment method on file before R2 can be enabled**, free tier
or not, and users report a $5 charge on activation. The project's hard rule is *$0
during development, never enter a card* — so the recommendation was unusable, and I
only found that out because I checked the signup flow before writing the setup guide.
**A free tier's price is not the same as its cost of entry. Verify activation, not
just pricing.**

---

<details>
<summary>Original (superseded) R2 entry</summary>

**Status:** Confirmed by user (chosen from 3: Cloudflare R2 [recommended], Vercel
Blob, UploadThing). Free tiers verified 2026-07-13.

**The decision.** Cloudflare R2 for user-uploaded build photos. **10 GB storage and
$0 egress**, S3-compatible.

**Rationale.** Build photos are **read constantly and written rarely** — precisely the
pattern where every other provider's bandwidth meter bites. R2 charges **nothing** for
egress; Vercel Blob allows 10 GB/mo and UploadThing only 1 GB/mo. On storage, R2's
10 GB is 10× Vercel Blob's 1 GB (roughly 300–500 photos before that becomes a
problem). S3-compatible, so outgrowing it is a config change, not a rewrite.

**$0**, so the $0-during-development constraint holds. **Not needed until Sprint 10
actually implements uploads.**

</details>

### 2026-07-13 — Image storage: Vercel Blob (replaces R2)
**Status:** Confirmed by user (chosen from 3: Vercel Blob [recommended], R2 anyway,
ship reviews without photos).

**The decision.** User-uploaded build photos go to **Vercel Blob**.

**Rationale.** It is part of the Hobby account we already have: **no new vendor, no
new account, and no card**. Free tier: **1 GB storage, 10 GB transfer/month**. At the
~200 KB our upload pipeline re-encodes to, that is roughly **5,000 photos** — far
past anything this project needs before launch economics get revisited anyway.

**The trade, stated honestly.** R2 offered 10 GB and zero egress; Blob's 10 GB/month
transfer cap is the real ceiling here, not the 1 GB of storage. And it deepens Vercel
lock-in on a project already fully on Vercel. Both are acceptable because the
alternative required entering a card, and **the $0/no-card rule is not mine to
override.** Mitigation: all blob access goes through `src/lib/storage.ts`, so
swapping providers is one module, not a rewrite.

### 2026-07-13 — UGC moderation: publish immediately, owner can delete
**Status:** Confirmed by user (chosen from 3: post immediately + admin delete
[recommended], full approval queue, text-live/photos-queued).

**The decision.** Reviews and build photos from signed-in users publish immediately.
Keagan gets an admin delete on any review or photo. No pre-approval queue.

**Rationale.** With no users yet and a $0 unmonetized app, an approval queue means the
feature is dead until Keagan personally clears it. Rate limiting (10 creates/min)
already blunts spam.

**What I am doing regardless, because it is not a product decision — it is security:**
- **EXIF is stripped from every upload.** A phone photo of a workbench carries **GPS
  coordinates of the user's home**. Publishing that is a privacy incident, and no
  user expects "share your build" to mean "share your address."
- **Images are validated by MAGIC BYTES, not by `Content-Type`**, and then fully
  **re-encoded** server-side. A client-supplied MIME type is an assertion, not a fact,
  and re-encoding destroys polyglot payloads (a valid JPEG that is also a valid script).
- **Size and dimension caps**, so one upload cannot eat the 1 GB tier.

**Known gap, accepted:** there is no report button and no automated scanning. If this
ever goes properly public, that is a real conversation about takedown process and
terms — it does not belong in a $0 dev build with zero users.

### 2026-07-13 — Sequencing: rate limiting shipped standalone, BEFORE Sprint 10
**Status:** Confirmed by user.

Rate limiting is closed as its own hardening task rather than folded into Sprint 10.
Reason: it keeps the Sprint 10 scorecard honest (Sprint 10 gets judged on reviews and
photos, not on a security fix bolted on at the end), and it stops the security work
being rushed to finish a bigger sprint.

### 2026-07-13 — Sprint 11: owned-tools PROFILE deferred to its own sprint
**Status:** Confirmed by user (chosen from 3: saved/liked only [recommended], include
the owned-tools profile now, owned tools only).

**The contradiction that forced this.** `BUSINESS_PLAN.md` §10 names recommendations
as based on "saved/liked plans **and owned tools**". `CLAUDE.md` §5 lists the
**owned-tools profile** among ideas that are out of scope until the business plan
adopts them. Both could not be true, so it went to Keagan rather than being quietly
resolved in whichever direction was convenient.

**The distinction that actually matters:** Sprint 5 shipped a tools-owned *filter*
that reads tool slugs from the query string and **persists nothing**. Feeding owned
tools into recommendations needs a *saved profile* — a `UserTool` table, a "my
workshop" management screen, and per-user state. That is a feature, not a parameter.

**The decision.** Sprint 11 recommends from **saved and liked plans only** (category,
difficulty, tags, shared tools). No new table, no settings UI. The owned-tools profile
becomes its own sprint if and when Keagan wants it; the per-session filter is
unaffected and still works.

**Rationale.** Bolting a new persisted model plus a settings screen onto a
recommendations sprint is how a sprint quietly doubles. And the payoff is near zero
until a user has actually filled the profile in — which nobody has, because nobody has
a profile.

### 2026-07-13 — Sprint 11: recommendations surface on the catalog home
**Status:** Confirmed by user (chosen from 3: section on catalog home [recommended],
dedicated /for-you page, both).

A "Recommended for you" section above the catalog grid, shown **only** to signed-in
users who have saved or liked something. No new route, no new navigation.

**Rationale.** It degrades to *nothing* for a cold user, rather than to an empty page.
A `/for-you` route that a brand-new user clicks into and finds barren is a worse first
impression of the feature than never showing it at all. Revisit if the section earns
its keep.

### 2026-07-13 — Sprint 12: shopping list is per-collection + whole library, and stateless
**Status:** Confirmed by user (scope chosen from 3: per-collection + whole library
[recommended], whole library only, ad-hoc plan picker. Check-off chosen from 2:
stateless [recommended], persist checked items).

**Scope.** A shopping list can be generated for **any collection** ("For the Cabin"),
and for **everything saved**. Reuses the collections model from Sprint 6 — no new
table.

**Rationale.** People shop for a project *batch*, not for their entire wishlist. A
single list over 30 saved plans is 200 lines nobody would carry into a store: the
feature would look impressive and be useless.

**Stateless — no persisted check-off this sprint.** The list is generated on demand and
is printable. Persisting ticked items needs a new model, new writes, and a new
multi-tenancy surface; it roughly doubles the sprint and is a clean follow-on if it
proves wanted.

### 2026-07-13 — Sprint 12: NO AFFILIATE LINKS (the Hobby constraint, restated)
**Status:** Binding — follows from the 2026-07-13 launch-economics decision.

`BUSINESS_PLAN.md` §10 describes the shopping list as including **affiliate links**.
**It ships without them.** Vercel's Hobby tier prohibits commercial use, and affiliate
links are commercial use; enforcement is account suspension.

The aggregation is the useful half anyway. The links cannot exist until the project is
on a commercial-use-permitted host, and that is the launch-economics conversation, not
a thing to slip into a feature sprint.

### 2026-07-13 — Sprint 12: materials merge on EXACT identity only, never fuzzily
**Status:** Engineering decision (mine), recorded because the failure mode is a
*safety* problem rather than a bug.

Material names in the catalog are free text: `Cedar, 1x6, 8 ft`,
`Stainless steel screws, #8 x 1-1/4" and 2"`, `Exterior screws, stainless or coated,
1-5/8"`. Two lines merge **only** when their normalized name, unit, and species are all
identical.

**Why not fuzzy-match.** Merging `#8 x 1-1/4" stainless` with `1-5/8" coated exterior`
because both contain "screws" produces a list that sends someone to a store to buy the
**wrong hardware**, with a confident quantity next to it. A shopping list that is
confidently wrong is worse than one that is merely long. Exact merging under-merges
sometimes; that is visible and harmless. Fuzzy merging over-merges silently, and that
is neither.

**Units are never combined.** `board feet` and `each` do not add up. A merge key that
ignored the unit would produce numbers that are not quantities of anything.

### 2026-07-13 — Sprint 12 REVISION: fix the CONTENT, not the matcher
**Status:** Directed by Keagan, after reviewing the first shipped version.

**His call, and he is right:** the list was over-engineered because the **data** was
over-specified. `Titebond II glue` and `Titebond II wood glue` should never have been
two different things. A plan should say **"wood glue"** and let the builder pick a
brand — *unless the plan genuinely requires a specific product*, e.g. Titebond III
(waterproof) for a cutting board or anything that lives outdoors.

**What changed — in the content, across 20 of the 24 plan files:**

| Before | After |
|---|---|
| 7 Titebond spellings | `Wood glue` / `Waterproof wood glue` |
| 9 sandpaper spellings | `Sandpaper, assorted grits` |
| 8 clear-finish spellings | `Clear interior finish (hardwax oil or wipe-on poly)` |
| `Paste wax (for the drawer runners)` | `Paste wax` |
| **all 12 fastener names** | **UNCHANGED** |

Result: **148 material rows → 103 merged lines** (was 129). The specificity did not
vanish — it moved to each material's `note`, which still renders on the plan page.

**The important part, and the reason the exact-merge rule SURVIVES intact:** once two
plans both say "Wood glue", **exact merging combines them by itself.** The fix belonged
in the data. The matcher never needed to get cleverer, and it still refuses to merge a
1-1/4″ screw with a 1-5/8″ one. Generic is right for *brand*. It is wrong for any
property that changes what you must buy.

### 2026-07-13 — Sprint 12 REVISION: cost is a BALLPARK; show it, don't withhold it
**Status:** Directed by Keagan. **This reverses a rule I argued for, and the reversal
is correct.**

I had made an unpriced material **contagious**: one line without a price and the whole
list total became `null`, on the grounds that a partial sum shown as a total is a lie.

That was right about the danger and **wrong about the remedy**. As Keagan put it, the
figure exists "merely as a price point to ensure someone isn't expecting to build an
end-grain cutting board for $10." Withholding the number entirely throws away the
signal that does that job, to avoid a precision nobody ever asked for.

**Now:** the total is always a number, rendered as **`≈ $X`**, alongside a count of any
items that have no estimate ("2 items have no estimate, so the real total will be
higher"). The honesty lives in the `≈` and the count — **not in refusing to answer.**

### 2026-07-13 — Sprint 13: print CSS + browser Save-as-PDF, NOT a server-generated PDF
**Status:** Confirmed by user (chosen from 3: print CSS + browser save [recommended],
server-generated `.pdf` endpoint, both).

**The argument that decided it:** a server-generated PDF **requires a network round-trip
to produce**, which makes it the *least* offline-capable option available — in a sprint
whose entire purpose is a plan you can use with no signal. It would be useless in exactly
the workshop it was built for.

A print-optimized *page* is a **public route**, so the Sprint 8 service worker can cache
it. `Ctrl+P → Save as PDF` then works with **zero signal**, produces better output than
any library we would ship, costs nothing on Vercel Hobby, and adds no dependency to the
serverless bundle.

**What we give up:** a one-click "Download PDF" button, and a server-side file to email
or archive. Worth revisiting if users ask for it — but not at the cost of the offline
capability `BUSINESS_PLAN.md` §5 calls the most important thing this product does.

### 2026-07-13 — Sprint 13: two print layouts — full plan, and a cut-list one-pager
**Status:** Confirmed by user (chosen from 3: full + cut-list one-pager [recommended],
full only, cut list only).

The **full plan** (materials, cut list, every step) for reading. And a **single-page cut
list + materials** for taping to the wall next to the saw.

**Rationale.** The cut list is what you actually reference every thirty seconds mid-build.
Burying it on page 2 of 4 means flipping pages with sawdust on your hands. These are two
different jobs and they want two different pieces of paper.

### 2026-07-13 — Sprint 14: offline library is OPT-IN, and is WIPED ON SIGN-OUT
**Status:** Confirmed by user (chosen from 3: opt-in "make available offline"
[recommended], keep the strict rule, cache everything silently. Sign-out wipe chosen
from 2: wipe [recommended], keep).

**The correction that forced this decision.** The Sprint 8 rule claimed we "never write
a user's private library to an unencrypted device cache." **That claim was overstated,
and I should have caught it at the time.** Saving a plan *pre-caches that plan's page* —
so the set of cached plan pages is, in practice, an approximation of the user's saved
library, readable by anyone who picks up the phone and opens devtools. There is partial
cover (pages you merely *visit* are cached too), but the line was not cleanly held, and
a security rule that overstates its own guarantee is worse than an honest one, because
everyone downstream relies on it.

So the real question was never "should we start storing private data on-device." It was
"we already partly do, silently — what do we actually want?"

**The decision.**

1. **An explicit, user-initiated "Make available offline" action.** Nothing private is
   written to disk unless the user asks for it. Consent is the thing that separates a
   defensible cache from a silent one.
2. It downloads: every saved plan, **every saved plan's print view**, and **the shopping
   list** — which finally closes the `BUSINESS_PLAN.md` §5 hardware-store gap that
   Sprint 12 had to leave open.
3. **Everything private is WIPED ON SIGN-OUT.** This is the mitigation the whole
   decision rests on: a shared, sold, or lost phone must not hand over a library after
   the user has logged out. It costs a re-download on next sign-in; that is a fair price.
4. **Two separate caches.** Public plan content stays in the existing cache and behaves
   exactly as before. Private content goes in a distinct cache that is only ever written
   by the explicit download, and is deleted wholesale on sign-out. Separating them is
   what makes "wipe the private data" a one-line operation that cannot miss anything.

**What did NOT change:** the service worker still refuses to cache private routes on its
own initiative. Nothing lands in the private cache as a side effect of browsing. The
default remains fail-closed.

### 2026-07-13 — Phase 3 CUT DOWN: marketplace, native app, lumber prices all parked
**Status:** Confirmed by user, at the start of Phase 3, before any code.

Phase 3 was six items. **Three are removed** and now live in `FUTURE_IDEAS.md`:

1. **Creator marketplace.** Keagan: *"This may be a later build if the idea catches
   popularity but not before anyone has even joined the app."* A marketplace is
   **two-sided** — it needs creators *and* buyers, and has neither. Building the supply
   side for an audience of zero is the most expensive possible way to learn nothing.
   (It was also blocked outright: monetization requires leaving Vercel Hobby.)

2. **Native iOS/Android app.** Same reasoning. The original gate — "only if data shows
   push/discovery is a real growth bottleneck" — answers itself: **there is no data, so
   there is no case.** The PWA is installable and works offline, which was the whole
   argument in `BUSINESS_PLAN.md` §5.

3. **Project cost estimator using local lumber prices.** Keagan: *"way too much to
   maintain."* Correct, and the maintenance is the *smaller* half. The larger half: there
   is no free perpetual licensed source. A paid vendor breaks the $0 rule; scraping
   retailers is a legal and licensing problem *and* a fragile one — their HTML changes
   weekly, and each silent break prints a **wrong price** next to something a person is
   about to go and buy.

**What survives:** the cut-list optimizer (Sprint 15) and skill-building learning paths
(Sprint 16). **Makerspace/team accounts remain BLOCKED** by the launch gate.

### 2026-07-13 — Cost display: TIERS ONLY. No dollar amounts anywhere in the public UI.
**Status:** Confirmed by user (chosen from 3: tiers on browse + numbers on the shopping
list, **tiers everywhere**, leave as-is).

**The decision.** The public UI shows **$ / $$ / $$$ / $$$$ / $$$$$ only**. No plan cost
range, no per-material price, no shopping-list total. Every dollar numeral goes.

**What does NOT change:** `Material.costCents`, `Plan.costMinCents` and
`Plan.costMaxCents` **stay in the schema and stay populated.** They are the *input* that
derives the tier. This is a presentation change, not a data change — deleting the
underlying numbers would make the tiers unmaintainable and would be a one-way door.

**The consequence I flagged, and Keagan accepted:** the shopping list loses the `≈ $84`
figure whose specific job (Sprint 12) was to stop someone expecting to build an end-grain
butcher block for $10. **Mitigation:** the shopping list derives a **tier for the whole
list** from its summed cents, so it keeps doing that job without printing a number we do
not really stand behind.

**Why this is a good call:** an itemized dollar total is a *claim of precision we cannot
support*. Lumber varies by region, species, and season; the numbers are hand-authored
ballparks. A tier communicates the same decision-relevant fact — "this is a cheap project"
vs "this is not" — and cannot be wrong in the way a number can. It also removes any
temptation to chase live pricing (see above).

### 2026-07-13 — Sprint 16: path progress is DERIVED FROM REVIEWS, not a new table
**Status:** Confirmed by user (chosen from 3: derive from reviews [recommended], explicit
"mark as built" table, no progress tracking).

**The decision.** A learning-path step counts as complete when the user has **reviewed**
that plan. You reviewed it ⇒ you built it.

**Why.** This is the **derived-data rule** (`CLAUDE.md`) applied to a feature that was
begging for a denormalized table. There is no `PathProgress` model, no new writes, no new
multi-tenancy surface, nothing to backfill, and nothing that can drift out of step with
reality. Sprints 4 and 6 both broke production by adding derived state and assuming a
migration would populate it; Sprints 7, 10 and 11 shipped clean by refusing to.

**The cost, stated honestly:** someone who builds a plan and does not review it shows as
incomplete. That is a real gap. It is also a mild nudge toward reviewing, which the
product wants anyway (`BUSINESS_PLAN.md` §4.7 — community signal). If it turns out to
annoy real users, an explicit "mark as built" table is a clean follow-on sprint; deriving
first costs nothing and can be replaced without a data migration.

### 2026-07-13 — Sprint 16: five authored learning paths
**Status:** Confirmed by user (chosen from 3: build these five, start with three, "I'll
specify them").

Authored as content (JSON → zod → idempotent seed), exactly like the 24 plans, so the
paths can be edited without touching code:

| Path | Progression |
|---|---|
| **Your first five** | Coat Rack → Cherry Board → Planter Box → Pine Bookcase → Knife Block |
| **The cutting-board path** | Cherry serving board → Edge-grain → End-grain butcher block |
| **Outfit your shop** | Crosscut Sled → Rolling Cart → Tool Cabinet → Workbench |
| **Joinery: screws to dovetails** | Bookcase → Storage Bench → Nightstand (drawer) → Dovetailed Box |
| **Furnish a room** | Bookcase → Floating Shelves → Nightstand → Platform Bed → Dining Table |

Every step carries a **reason it comes where it does**. An ordered list with no rationale
is not a learning path — it is a collection with a number next to each item.

### 2026-07-12 — Default branch / repo housekeeping
**Status:** Open — user asked to set `main` as the repository default
branch and delete stale merged branches. No available tool exposes
GitHub's default-branch setting or branch deletion; this requires the
user to act directly in GitHub's Settings → Branches UI. Not a build
blocker, but tracked here since it's an outstanding action item.

### 2026-07-13 — UI redesign: adopt Claude Design mockup's visual system
**Status:** Confirmed by user (three sub-decisions, all recommended options chosen).

Keagan supplied a Claude Design prototype (`Woodworking Plan Prototype.dc.html`) and
directed: "This is how I want this app's UI to be." This is a **visual reskin**, not a
new sprint — the prototype is a client-side demo (React state + localStorage); the real
app's server-rendered architecture (GET-form filters/search, server actions, Clerk,
Prisma) is unchanged. Three branding/scope calls were escalated per `BUILD_PLAN.md` §2:

1. **Palette replaces the neutral theme; dark mode is dropped.** Cream background,
   ink text, orange accents replace the current gray/white tokens in `globals.css`.
   The existing `prefers-color-scheme: dark` variant is removed rather than redesigned
   in the new palette — the mockup has no dark variant, and inventing one would be the
   build agent making an uncommissioned design decision.
2. **Clerk stays for all auth/account UI, reskinned via its `appearance` API.**
   The mockup's custom sign-in/sign-up/account-settings screens (name/email fields,
   password change, delete account) are **not** rebuilt by hand. Clerk's hosted
   components continue to handle those flows (maintained, already secure); only
   colors/typography/spacing are re-themed to match. The mockup's **email
   notifications toggle** is not a Clerk feature and is not in `BUSINESS_PLAN.md` —
   excluded as scope creep, per `CLAUDE.md` §"One sprint at a time." Would need adding
   to the business plan first.
3. **No sitemap page.** The mockup's "Sitemap" screen (links to every screen + an
   offline-mode simulation toggle) is the design tool's own navigation aid for
   reviewing prototype turns, not a product page end users need. Not built.

**What does get built as new, real functionality (not previously in the UI):** a
PWA install-to-home-screen prompt (`beforeinstallprompt` capture + banner) — this
closes an actual Sprint 8 gap already implied by `BUSINESS_PLAN.md` §5, not new scope.

**Technical approach for the plan-detail page (engineering decision, not escalated):**
the mockup's step-by-step wizard (progress bar, step rail/dots, Prev/Next) is added as
a client-side progressive enhancement layered **on top of** the existing full
server-rendered step list — the full list must keep rendering for print, offline
caching, and no-JS per the Sprint 13/14 rules; nothing about those guarantees changes.

### 2026-07-14 — Prototype Wireframe folder reviewed; wireframes file is historical only
**Status:** Confirmed by user (four calls).

Keagan added a `Prototype Wireframe/` folder containing the already-adopted
`Woodworking Plan Prototype.dc.html` (see 2026-07-13 entry — implemented) plus
`Woodworking Wireframes.dc.html`, the earlier design iterations. Four decisions:

1. **The 2026-07-13 decisions stand; the wireframes file is historical context, not
   spec.** Its conflicting elements are explicitly NOT to be built: dollar figures
   ($85–$130 chips, per-material prices in the print preview) violate the cost-tier
   rule; "Free tier: 10 saved plans / 1 folder" limits violate the no-limits
   decision; custom email/password auth screens violate the Clerk-stays decision;
   the email-notifications toggle and sitemap page were already excluded.
2. **Remaining prototype deltas approved for now: active-filter chips and skeleton
   loading states.** Materials checklist and the offline banner / saved-only catalog
   mode were offered and NOT selected — not approved, do not build without asking.
3. **Sort options stay as-is** (five options, easiest-first default). The prototype's
   "Recommended"/"Trending" sorts are new features that would need adding to
   `BUSINESS_PLAN.md` first. Declined for now.
4. **Priority: UI deltas before launch blockers** — Keagan's call, made with the
   explicit caveat on record that the leaked Neon/Clerk credentials remain
   unrotated meanwhile. Credential rotation is still his action item; paths
   production seed and rate-limit user feedback remain open on the build side.

### 2026-07-14 — Production DB backfilled; Vercel env-var target NEEDS KEAGAN'S CHECK
**Status:** Backfill done. One open verification only Keagan can do.

While running the Sprint 16 paths production seed (per `DEPLOYMENT.md`), the production
Neon branch (`ep-long-lake`) turned out to be **three migrations behind** — no `Like`,
`Review`/`BuildPhoto`, or `Path`/`PathStep` tables. Applied `prisma migrate deploy`
(all three missing migrations are purely additive) and the full idempotent seed from a
sandbox-local clone: production now has all 7 migrations, 24 plans, 5 published paths,
and a rebuilt search index.

**The open question:** Sprint 10+ features were "verified on the live deploy", which is
impossible against a DB missing those tables — and `ep-long-lake` has 0 users while the
dev branch (`ep-sparkling-band`) has 1. Strong signal that **Vercel's production env
vars point at the DEV branch**. Keagan must check Vercel → Settings → Environment
Variables. If they say `sparkling-band`: the live site runs on the dev branch, local
`db:*` scripts touch live data, and we should either swap Vercel to `long-lake` (now
current) or formally redesignate the branches in `DEPLOYMENT.md` and `.env.local`.
Do not run destructive dev-branch commands until this is resolved.

### 2026-07-14 — RESOLVED: one database, labelled production. Credentials rotate PRE-GO-LIVE only.

**Status:** Confirmed by Keagan. This CLOSES the open question in the entry directly
above, and it is a STANDING decision — not to be re-litigated each session.

Keagan checked Vercel: both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) point at
`sparkling-band`. So the "production" deploy was indeed running on what was labelled the
dev branch. His resolution:

- **`sparkling-band` is now labelled `production`.** It holds the real data; nothing was
  cut over (a Neon branch rename keeps the endpoint host, so Vercel's vars are unchanged
  and there was zero downtime).
- **The empty `long-lake` decoy branch is DELETED.** It was the thing that made the
  "prod is 3 migrations behind, 0 users" alarm look like a defect; a database that looks
  like production but isn't is a trap.
- **There is deliberately ONE branch during development.** Dev and prod share it. With no
  public users and a catalog rebuildable from `content/*.json` via `npm run db:seed`,
  there is nothing a `migrate reset` could destroy that isn't a one-command rebuild. A
  separate dev branch becomes necessary the day a real person saves a plan — it is a
  **pre-go-live task, not a now-task.** Do not re-flag "prod == dev" as a defect.

**Credential rotation — DEFERRED TO PRE-GO-LIVE, and this is FINAL.** The Neon role
password and Clerk secret were pasted into a chat transcript. Keagan has stated, more
times than he should have had to, that he will rotate them **once, immediately before
public launch** — alongside branding/domain — and NOT during the development cycle. The
risk (a scanned free-tier Postgres role) is real but is his to accept, and he has, with
full information. **Do not propose rotating now, do not list it as a current/now blocker,
and do not reopen it in future sessions.** When go-live is scheduled: rotate in Neon and
Clerk, then update `.env.local` + both Vercel vars together.

The build agent over-escalated both of these repeatedly. Recording them here as settled
so the escalation stops — a decision Keagan has to keep re-making is a decision the docs
failed to capture.

### 2026-07-14 — Rate-limit denial feedback (closes the standing follow-up)
**Status:** Done. Routine engineering, logged because it touches a security surface.

A denied server action now `redirect()`s back to the page with `?notice=slow-down`;
`/`, `/plans/[slug]`, and `/saved` render a dismissible banner. Redirect (not
`useActionState`) so the no-JS form path gets feedback too. The bounce-back target is
an optional `returnTo` form field — **attacker input**, validated by `safeReturnTo()`
(rejects absolute/protocol-relative/backslash URLs; open-redirect guard, tested).
Denial still does zero database work and still never throws a real error —
`redirect()` is a framework-handled 303.

### 2026-07-14 — Post-launch-blocker backlog: Keagan's UI/feature punch list, four scope calls

**Status:** Confirmed by user (four sub-decisions, all recommended options chosen — one
partially, see #4).

Keagan walked the live app and filed 16 items. Before scheduling any of it, four needed
his call rather than mine, per `BUILD_PLAN.md` §2 (legal, vendor/cost, schema-scope, and
public-facing copy are all escalation categories):

**1. Community-submitted plans with admin verification — DEFERRED.** Same reasoning
already used to park the creator marketplace (`DECISIONS_LOG.md` 2026-07-13): zero users
to submit or moderate for yet, plus real liability publishing user-submitted structural
build instructions under the app's name (safety, copyright). Not scheduled. Revisit if
the catalog gets real traffic and Keagan wants a minimal v1 (private admin-only pending
queue, reusing the Sprint 10 photo pipeline).

**2. AI-rendered 2D plan images (right sidebar) — SKIPPED for now.** No image-gen API has
a genuine free perpetual tier at production quality — this would violate the
$0-during-development constraint the same way Cloudflare R2's card-on-file requirement
did (`DECISIONS_LOG.md` 2026-07-13). The sidebar slot ships empty/ready to receive real
photography, which has been an open content decision since Sprint 1 (`images: []` on
every one of the 24 plans).

**3. Category sidebar depth — FLAT, matching the existing schema.** `Category` has no
parent/subcategory relation today. Real subcategories would need a schema change (a
self-relation) plus a content pass re-tagging all 24 plans — deferred until there's a
reason more granular than "the sidebar has room for it."

**4. About/FAQ nav copy — STUB PAGES ONLY, no copy yet.** Keagan chose to ship the nav
links and routes now with placeholder content ("Content coming soon") rather than either
of the other two options (me drafting brand-voice copy for approval, or him supplying
text directly). Public-facing copy stays his call per `BUILD_PLAN.md` §2 whenever it's
actually written.

**What this unblocks — Sprint 17 (bug fixes + quick wins), done same day:**

- **Real bug, not a decision:** `**bold**` markdown authored in every one of the 24
  plans' step bodies (and 9 of their descriptions) rendered as literal asterisks on both
  the plan detail page and the print page — no markdown step existed anywhere in the
  codebase. Fixed with a small inline-bold-only renderer (`src/components/prose.tsx`),
  deliberately not a full markdown dependency (no links/lists/headings; content has
  never used more than bold, and a real markdown lib adds an XSS-sanitization surface
  for a rule this narrow).
- **Real bug, not a decision:** the print page's `<ol>` had no `list-style: none`, so
  the browser's own list marker rendered ALONGSIDE the template's explicit
  `{stepNumber}. ` text — "1. 1. Mill both slabs..." on paper and when copied out.
  Root cause was CSS, not content (checked all 24 plan files — no plan authors a
  leading number itself). Fixed in `globals.css`.
- **Cosmetic, not a decision:** dropped the "of $$$$$" qualifier after every cost-tier
  symbol (plan detail glance, materials footnote, print header/materials, shopping
  list) — the tier IS the answer; the qualifier only ever echoed the same five
  characters back. `costTierSymbol()` itself is unchanged; this only touched the JSX
  that appended the qualifier.
- Breadcrumb/back-link restyled from a plain muted text link into an on-theme pill
  button (`.breadcrumb a` in `globals.css`), with an explicit `:visited` rule added
  defensively — though the prior CSS was checked and had no unstyled/purple state to
  begin with (no `:visited` rule existed anywhere, and `.breadcrumb a` already set an
  explicit `color`). If purple still shows up somewhere, it's a different element and
  needs a screenshot to find.
- Home/About/FAQ added to `SiteHeader` and to the `PUBLIC_ROUTES` allowlist (static
  content, no user data — same safety reasoning as the catalog itself).

**Verification:** typecheck, lint, and the full test suite (449 tests, one new file
`tests/prose.test.tsx`) run clean in a sandbox-local clone per the environment rule in
`CLAUDE.md` (never against the mount). Visual-only changes (CSS layout/restyle) are not
machine-verifiable here — flagged for Keagan to eyeball on a live/dev deploy same as
every other CSS-only change in this project's history.

**Still queued, decisions locked, not yet built** (see `BUILD_PLAN.md` §4 for the
sprint breakdown): desktop catalog layout (4-5 columns, filters right, flat-category nav
left), sort overhaul (new `PlanView` log table for Trending/Most Viewed, Recommended
folded into the sort dropdown instead of its own section — reverses the 2026-07-14
"sorts declined" decision above, at Keagan's explicit direction this time), plan-page
sidebar/tab redesign + last-step review CTA, per-step tools/hardware (schema gap: `Step`
has zero relation to `Tool`/`Material` today), and the shopping-list redesign (a new
`ShoppingListEntry` model decoupled from `SavedPlan`, so saving a plan for later no
longer forces it onto the shopping list).

### 2026-07-14 — Sprint 19: the view log stores NO user id (build agent's call, flagged)

**Status:** Decided by the build agent as an engineering/security default, and recorded
here because it is a **data-collection** decision, which is a category Keagan owns. It is
reversible in the permissive direction only — say so if you want it changed.

Sprint 19 needed view tracking (Trending, Most Viewed). The obvious schema is
`PlanView(planId, userId, viewedAt)`. **`userId` was left out.**

- A per-user view log is a **browsing history** — the most sensitive table this app could
  hold. It would need a deletion path in the Clerk webhook, a retention policy, and a
  privacy disclosure, and it is the one table whose leak would embarrass a user.
- The two sorts it exists for need **counts**. A count does not need to know who.
- The asymmetry decides it: adding the column later is a migration. **Un-collecting a
  year of browsing history is not a thing you can do.** Collect the minimum that answers
  the question; widen deliberately if a feature ever justifies it.

**What this costs:** a future "Recently viewed" or view-based recommender would need the
column added and would start with no history. That is the price, and it is cheap.

**Also decided (engineering, not escalated, but worth knowing):** the view is logged from
a **client effect after hydration**, not from the page's server render. `next/link`
prefetches the RSC payload of every catalog card in the viewport — a server-side log
would count a *hover* as a view, and Trending would become "whatever sat near the top of
the grid", a loop that entrenches its own output. Crawlers would count too. The cost:
no-JS and offline readers are never counted. A ranking signal is allowed to be lossy; it
is not allowed to be inflated.

### 2026-07-14 — Sprint 21: per-step content delivered as a script, not 24 file edits

**Status:** Confirmed by Keagan (chose "commit an apply-tags script" over direct file
edits or deferring). Also records his earlier same-sprint call to author all 24.

Sprint 21 needed per-step tool/material tags on ~170 steps across 24 plans. Two calls:

**1. Who authors the tags — the build agent drafts all 24, Keagan reviews.** Per-step
assignments render publicly, so they're content Keagan owns (`BUILD_PLAN.md` §2). He had
the build agent draft them (extracted from each step's own text, kept strictly within
each plan's declared tools/materials) for his editorial review, rather than authoring
170 tag-sets himself or shipping only exemplars. **These are the build agent's
woodworking judgment and warrant Keagan's review before they're trusted** — the subset
constraint bounds any error to "a tool the plan lists but the step may not actually use,"
which is fixable content, never a broken build.

**2. How they land on disk — an idempotent apply script, not 24 hand-edited files.**
`scripts/apply-step-tags.mjs` carries the full tag mapping and the injection logic; Keagan
runs `node scripts/apply-step-tags.mjs`, reviews the `git diff`, and re-seeds. Chosen
because it's more reviewable (one readable mapping vs. 24 diffs), it was validated against
his exact content in a sandbox clone, and it sidesteps the sandbox's inability to bulk-edit
the mounted repo safely. The script rewrites ONLY each plan's `steps` array, is idempotent
(a second run is a no-op), and throws on any tag that isn't a subset of the plan's declared
tools/materials — the same rule `src/content/load.ts` enforces.

**Also decided (engineering, not escalated):** the subset rule lives in the loader, not
the database (a bare FK would accept a tool the plan never declared); per-step tags are
optional so untagged plans still validate; materials are referenced by name (they have no
slug), tools by slug. See `CLAUDE.md` "Per-step tools/materials rule."

### 2026-07-14 — Sprint 22: the shopping list is decoupled from saves

**Status:** Implemented per the backlog item Keagan approved (`BUILD_PLAN.md` §4.1.1).

The shopping list was derived from everything a user had SAVED. Sprint 22 gives it its own
`ShoppingListEntry` model and an explicit "Add to shopping list" action per plan. Saving
(§4.3, "maybe someday") and buying-materials-now are different intents, and deriving one
from the other made the lumberyard sheet a dump of every bookmark. **Behavioural change,
stated plainly:** existing saves do NOT auto-populate the new list — it starts empty for
everyone and fills only on explicit add. That is the decoupling, not a regression.

The old collection-scoping of the list (`/shopping-list?collection=…`) is REMOVED — it was
a SavedPlan concept. Its place is taken by two views of the explicit list: **merged**
(combined, one buyable list — the Sprint 12 behaviour, exact-merge rule unchanged) and
**by-plan** (each project's materials, unmerged), toggled by `?view=`.

### 2026-07-14 — Prod incident: Trending sort 500 (`make_interval`), and CI made green

**Status:** Fixed and deployed (`6f65169`), recorded so the lesson sticks.

Sprint 19's Trending sort shipped `NOW() - make_interval(days => ${windowDays})` in raw
SQL. Postgres could not resolve `make_interval(days => $1)` against the bound parameter's
inferred type, so **every load of the default home page 500'd** — while `Most viewed`
(same query, no window clause) worked, which isolated it. The unit tests MOCK `$queryRaw`,
so the bad SQL ran for the first time on a live deploy. Fixed by binding a computed JS
`Date` cutoff. **Standing rule added (`CLAUDE.md`): a `$queryRaw` string is not proven by
a green suite — run new raw SQL against real Postgres, and smoke-check `/` after any deploy
that touches a default-path raw query.**

Separately: CI had been red for weeks on its lint step, from two errors in the
`Prototype Wireframe/` design export (deprecated `ReactDOM.render`, assign-to-`module`).
That folder is historical reference, not app code, and `next build` never lints it — so it
is now in eslint's ignore list. CI is a working detector again, which matters: a red
detector nobody reads is how the `make_interval` 500 reached a deploy unnoticed.

### 2026-07-14 — Sprint 23: About/FAQ copy drafted; name + contact are placeholders

**Status:** Copy DRAFTED by the build agent for Keagan's approval. Three sub-decisions
were escalated first (`AskUserQuestion`) because they're his and can't be invented:

- **Product name:** use the "Woodworking Plan" working placeholder throughout, flagged in
  the copy and comments — branding/domain (#8) is still open.
- **Contact / brand data:** fill with clearly-marked placeholders (`hello@example.com`,
  "a real address is coming") to swap when the brand lands.
- **"Is it free?" framing:** "free right now, no ads, no affiliate links, no promise it
  stays free forever" — the only framing consistent with the launch-economics decision
  (pricing deferred, not decided).

Everything in the copy is true of the current build; no invented features, no commitments
the project hasn't made. Public-facing copy remains Keagan's to approve and edit
(`BUILD_PLAN.md` §2) — this is a reviewable draft on `noindex` pages, not a publish.

### 2026-07-15 — Completion plan: Sprints 24–27 scheduled; Phase 4 partially opened
**Status:** Confirmed by Keagan (four scope calls, all recommended options chosen).

Context: Sprints 0–23 complete, 495 tests green, all §4.2 engineering debt closed,
Sprint 19/21/22 migrations + step-tag content verified live in the database. Keagan
directed a plan for the remaining $0 work, explicitly excluding branding (#8),
commercial licensing, and credential rotation (all deferred to pre-go-live).

1. **Sprint 24 = Hardening Pass 2, before new features.** Sprint 9's audit predates
   the Sprint 17–23 redesign; the rebuilt UI ships unaudited until this runs.
2. **Sprints 25–26 = My Workshop + tool-aware catalog.** The owned-tools profile
   (`BUSINESS_PLAN.md` §10, deferred 2026-07-13) is scheduled, and its natural
   completion — Phase 4's tool-inventory-aware search — is opened with it.
   Guardrail carried into the sprint: the profile pre-fills the filter FORM; it
   never silently filters a bare URL (a shared link renders the same for everyone).
3. **Phase 4 partially opened: build logs ONLY.** Cut down to a derived "My builds"
   view + a computed "N people built this" count (Sprint 16 rule: reviewed ⇒ built,
   no progress table). **Forums stay closed** (moderation liability, no user base).
   Also staying closed: AI customization (inference costs money — $0 rule), video
   (no content to embed), metric units (US dimensional lumber doesn't convert
   honestly; regional pricing is dead under the cost-tier rule — revisit on real
   international demand).
4. **Community plan submissions stay deferred.** Zero public users means nobody to
   submit; who-owns-a-submitted-plan is a licensing decision not to be rushed.

Recorded in `BUILD_PLAN.md` §4.3 (sprint scopes) and the §4 status table.

### 2026-07-16 — Sprints 24–27 confirmed complete & pushed; UI migration to Tailwind CSS + dark mode approved

**Status:** Confirmed by Keagan directly.

Keagan confirmed Sprints 24–27 are done end-to-end — CI green, live site verified —
closing the "unpushed tail" flagged in `SPRINT_LOG.md`/`BUILD_PLAN.md` §4.3. He then
directed the next body of work: migrate the hand-written CSS system to Tailwind CSS,
and build a light/dark theme with the toggle in the profile dropdown (Clerk's
`UserButton` menu). Two reversals, both his call this time, not the build agent
relitigating either:

1. **CSS delivery mechanism changes from hand-written custom-property CSS
   (`src/app/globals.css`, ~2,500 lines) to Tailwind utility classes.** This is
   implementation, not product scope, so it isn't a `BUSINESS_PLAN.md` matter — a
   routine engineering/tooling choice Keagan is directing rather than one requiring
   escalation. Tailwind is MIT-licensed and installed as a plain npm dependency: $0,
   no vendor account, no lock-in, consistent with decision #9. **No visual change is
   authorized as a side effect of the migration itself** — pixel-parity against the
   current live site (light theme, all five breakpoints: 34/40/64/80/96rem) is the
   acceptance bar for every migration sprint. The print stylesheet (kerf, ripping,
   `break-inside: avoid`, tape-measure fractions, black-on-white — see `CLAUDE.md`
   "Print rule") is explicitly OUT of scope for the whole migration; it stays plain
   CSS.
2. **Dark mode is reinstated**, reversing the 2026-07-13 decision that dropped it
   (recorded above: "the mockup has no dark variant, and inventing one would be the
   build agent making an uncommissioned design decision"). Keagan is now commissioning
   it directly, so that reasoning no longer applies. Light theme = the current
   cream/ink/orange palette, unchanged in appearance. Dark is a new palette to be
   designed from the same accent system and contrast-checked to WCAG AA — not
   invented freely, since `design:accessibility-review` and the project's existing
   a11y bar (Sprint 24) both apply. **Toggle location: the Clerk `UserButton`
   dropdown**, per Keagan's explicit instruction — out of the way, easy to find.
   Default state on first visit: **light** (the current, familiar theme) — no
   surprise dark-on-first-load.

Engineering decisions made alongside this (routine, not escalated): Tailwind v4
(CSS-first `@theme` config, no `tailwind.config.js` needed — fits the Next 15 /
React 19 stack already in place); the five-sprint breakdown (Sprints 28–32) recorded
in `BUILD_PLAN.md` §4.4.

### 2026-07-16 — Desktop/mobile layout fix pass; "Start building" gets a dedicated page

**Status:** Directed by Keagan (with screenshots of the defects).

1. **Desktop layout fixes** (his report: content over-centered with dead margins,
   cards unreadably thin, weak section padding): catalog goes full-width at
   desktop, `.page-wide` 52 → 64rem, plan detail 70 → 84rem, and the card grid
   becomes container-driven (`auto-fill, minmax(16rem, 1fr)`) so a card can never
   render narrower than 16rem. Fixing this surfaced and fixed a **Sprint 30a
   regression** that had mirrored the plan-detail columns (image wide, data in the
   rail).
2. **Mobile fix pass** (his report: header nav overflowing the header, install
   banner wrapping badly): header wraps with a horizontally-scrollable nav row;
   the install banner's buttons move as one group; button labels never wrap.
3. **"Start building" navigates to a dedicated page — `/plans/[slug]/build`** —
   instead of expanding the step walker inline (partially reversing the Sprint 20
   inline-disclosure design, at Keagan's explicit direction: the step-by-step is
   the product's main content and "deserves an entire page"). What did NOT change:
   the plan page still carries the full step list in its document (no-JS, print,
   offline contracts intact — the link works without JS, which the old button did
   not); the build page is public (`/plans(.*)` allowlist), pre-cached on save and
   included in the library download; it logs NO view (the plan page already did —
   Sprint 19 "the count must mean something").

Engineering found-alongside (routine): the strict CSP blocks `eval()`, which
`next dev`'s react-refresh needs — so client JS never hydrated in dev and
interactivity was untestable there. `'unsafe-eval'` is appended to `script-src`
only when `NODE_ENV !== 'production'`; the production header is byte-identical.

### 2026-07-16 — Nav redesign, install moves to the profile dropdown, perf pass

**Status:** Directed by Keagan.

1. **The catalog install banner is removed**; the install affordance lives in the
   profile dropdown (next to the theme toggle) and in the new mobile drawer (which
   covers signed-out users). Capture moved app-wide (root layout), which also fixes
   the documented deep-link gap the banner always had.
2. **Navbar redesign**: quiet text links + one primary CTA on desktop; below `lg` a
   hamburger opens a drawer. Drawer is a native `<details>` (no-JS safe), closing
   automatically on navigation.
3. **Performance**: Keagan asked how to make the app faster and for easy fixes now.
   Shipped: catalog DB calls parallelized (3 serial stages → 1), preconnect to
   Clerk's frontend API. Recommended next (not code, or not now): co-locate the
   Vercel function region with Neon's region (dashboard setting, biggest TTFB
   lever); Lighthouse against production, not dev; revisit caching/PPR of public
   catalog content at launch scale; `next/image` when real photos land.

### 2026-07-17 — Image storage vendor: Cloudflare R2 (stop hotlinking ana-white.com)
**Status:** Confirmed by user (chose R2 over Vercel Blob / repo-static).
**Source:** All 1,030 plan photos across the catalog were hotlinked to
`www.ana-white.com`. Keagan **confirmed he holds the rights to re-host these
images** (the provenance sign-off `AUDIT_2026-07-16.md` #5 gated the seed on).
R2 chosen for **zero egress fees** (a public image catalog is bandwidth-heavy;
Vercel Blob Hobby caps transfer at ~10 GB/mo and is non-commercial) and 10 GB
free storage — a genuine perpetual free tier, consistent with the $0-during-dev
rule. Estimated ~100–300 MB total, well inside free limits.
**Mechanics:** `scripts/migrate-images-to-r2.mjs` downloads each source image,
re-encodes + strips EXIF (the Sprint 10 upload rule — even re-hosted bytes get
sanitised; a phone photo's GPS must not ship), uploads to R2 keyed by content-URL
hash (dedupes + idempotent), and rewrites each plan JSON's `images[].url`. The
public host is env-driven (`R2_PUBLIC_HOST`) and wired into BOTH image gates
(`next.config.ts` remotePatterns + `middleware.ts` CSP `img-src`), so dev
(`pub-xxxx.r2.dev`) → launch custom domain is one env change, not a re-migration.
**Dead source URLs (~154):** some source images 404 at their hotlinked URL. Keagan's
call — **null those `images` arrays so the plan renders the honest placeholder, but
PRESERVE the original URL** under a new optional `unresolvedImages` field (added to
`plan-schema.ts`, ignored by the seed) so the correct image can be recovered later
from his own media library. Applied by `scripts/null-unresolved-images.mjs`, which
HEAD-verifies each URL is genuinely dead before touching it.
**Deferred to launch:** swapping the throwaway `pub-*.r2.dev` public URL for a
custom domain (blocked on branding/domain #8); credential rotation follows the
existing pre-go-live rule.

### 2026-07-19 — Site navigation IA (QOL-D): category "Browse" menu; Workshop becomes a profile setting

**Status:** Confirmed by Keagan (presented three options each, chose as below).
**Why it needed a decision:** `QOL_UI_BUILD_PLAN.md` Phase QOL-D flags item 1 as an
information-architecture call rather than a routine engineering one. Today the six
categories exist only on the catalog page (the Sprint 18 desktop rail and the filter
panel's `<select>`), so a reader on a plan, a path, or the FAQ has no way to browse by
category at all — and the catalog is heading from 85 plans toward a much larger number.

1. **Categories get a "Browse" menu in the site nav** (chosen over "mobile drawer +
   footer only" and "footer only"). A `Browse` item in the desktop nav opens a panel
   listing all six categories; the mobile drawer gets a matching collapsible section.
   Both link into the catalog with `?category=`, so results stay URL-driven and
   shareable — no new query path, no new capability, just a second way to reach the one
   that already exists. **The catalog's own left rail is unchanged.** Rejected
   alternatives were cheaper but leave a desktop reader on a plan page with no
   category affordance above the fold, which is the problem being solved.
2. **`🧰 Workshop` is REMOVED from the signed-in header** (chosen over keeping it as a
   link to the new profile section). Keagan's call: the tool picker is settings — you
   set it once — so it does not earn a permanent slot in the nav. It stays reachable
   from `/profile`, and from the plan page's existing "Update your workshop" prompt,
   which is where someone actually notices they need it. `/workshop` is kept as a
   redirect rather than deleted, so existing bookmarks and links do not break.

**Not in scope, and still blocked:** sitemap and SEO metadata, both gated on the open
branding/domain decision (#8) — `robots: noindex` stays sitewide.

### 2026-07-19 — Learning-path taxonomy (QOL-E): one level vocabulary; no new path content

**Status:** Confirmed by Keagan (two options each).
**Why it needed a decision:** `QOL_UI_BUILD_PLAN.md` QOL-E asks for an `experienceLevel`
on `LearningPath` but describes two incompatible vocabularies in the same paragraph
("beginner/intermediate/advanced" *and* "reuse whatever enum shape `Plan.difficulty`
already models"). It also explicitly instructs the build agent to stop and ask whether
new path CONTENT is authored this sprint rather than inventing any.

1. **`experienceLevel` reuses the existing 1–5 scale**, rendered through the same
   `difficultyLabel()` every plan card and catalog filter uses (Beginner / Easy /
   Intermediate / Advanced / Expert). Rejected: a separate three-value `PathLevel` enum —
   it would have made "Intermediate" mean difficulty-3-of-5 on a plan and one-of-three
   bands on a path, i.e. two scales sharing a word, with any cross-filter needing a
   translation table.
2. **Taxonomy only — no new paths are authored this sprint.** The five existing paths get
   tagged; the `/paths` index is rebuilt to group and filter on the new fields. Writing
   additional paths to fill the empty cells is a separate content pass, and is Keagan's
   to schedule. (Paths are CONTENT: they do not reach production on deploy, they need a
   seed run.)

### 2026-07-19 — QOL-F visual direction: variant **A (restrained, CSS-only)**

**Status:** Confirmed by Keagan after reviewing `mockups/qol-f/modern-saas-depth.html`.
**The choice was architectural, not aesthetic.** Both variants execute the already-agreed
"Modern SaaS depth" direction; they differ in what they cost:

- **A — chosen.** A 4px lift plus a shadow step on hover. **Pure CSS.** No JavaScript, and
  every catalog card stays a server component.
- **B — rejected.** Pointer-tracked tilt and image parallax. Would have required a **client
  island wrapping the catalog grid** — JS shipped on every render of the highest-traffic
  page, whose entire architecture is server-rendered GET forms and links — for an effect
  that does nothing at all on touch, which is most of this audience.

B's **press feedback is kept** (it was never the expensive part: a 1px settle and a shadow
collapse on `:active`, two declarations, no JS).

**Also settled by the mockup review:** an elevation scale is added as tokens (three levels,
warm-tinted rather than neutral grey, layered contact+ambient; the dark theme gets its own
set because shadows barely register on a dark surface). Colours are unchanged — every value
in the rollout is an existing token. Motion is limited to four things: press settle, save
pop, tab underline, and a card settle-in replacing the skeleton jump. **Excluded
deliberately:** page transitions, scroll parallax, and any motion on the print or
step-walker surfaces.

### 2026-07-19 — Learning-path taxonomy (QOL-E) — tagging detail

**Tagging of the five existing paths** (derived from each path's own framing and its
steps' difficulties, presented to Keagan before he chose): Your First Five → Beginner /
Mixed; The Cutting Board Path → Easy / Cutting Boards; Outfit Your Shop → Intermediate /
Shop Projects; Furnish a Room → Intermediate / Furniture; Joinery: Screws to Dovetails →
Advanced / Mixed. `experienceLevel` is **the level the path is FOR**, an authored
judgement — not the difficulty of its first step, which would be derivable and therefore
would not need a stored column at all.

---

### 2026-07-20 — UI/QOL punch list (QOL-H..M): three IA/UX calls, plus a stale-doc flag

Keagan supplied a new round of UI feedback from walking the live app (planning
artifact: `QOL_UI_BUILD_PLAN.md` Phases QOL-H through QOL-M). Three items needed his
call before any code gets written; recorded here per `BUILD_PLAN.md` §2.

1. **New landing page — replaces `/`.** Today's catalog (browse + search + filter)
   moves to `/browse`; `/` becomes the new marketing/landing page. **Chosen over**
   leaving `/` as the catalog and adding the landing page at a new route (e.g.
   `/welcome`), which would have been zero-risk to existing links/offline
   caching/SEO but leaves the homepage as a plans grid rather than a sales pitch.
   Accepted trade-off: this touches everything that currently hardcodes `/` as "the
   catalog" — `PUBLIC_ROUTES`, `manifest.webmanifest` (`start_url`/`scope`), the
   service-worker offline URL list, and ~11 components/pages with a literal
   `href="/"` — all inventoried and must be updated together, not discovered one at
   a time. See QOL-M for the full list.
2. **Sort control's "Apply" button — visually hidden, not deleted.** Keagan's ask
   was to remove it now that sort auto-submits on change. The button is also the
   only submit path for keyboard-only and no-JS users (documented in
   `sort-select-control.tsx`'s own comment) — deleting it is a real accessibility
   regression, not a cosmetic no-op. **Chosen:** keep it in the DOM, functional,
   visually hidden for pointer/touch users. Same no-JS/keyboard doctrine as every
   other control in this codebase (FilterDisclosure, InstructionsDisclosure, the
   review star-rating radios).
3. **Full-width content pages — widen, not edge-to-edge.** Learning/About/FAQ/Saved/
   Builds/Profile currently cap at `.page` (40rem, some at `.page-wide` 64rem).
   **Chosen:** bring all of them to the existing `.page-wide` (64rem) treatment
   already used by Saved/Builds — not the catalog's full `lg:max-w-none` bleed.
   Rationale: About/FAQ are long-form prose; edge-to-edge body text at desktop
   width produces an unreadably long line length. Reuses an existing width token
   rather than inventing a new one.

**Flagged, not a decision — needs Keagan's awareness, not his sign-off:**
`CLAUDE.md` §7 "Current state" says the catalog is **85 plans**. The live site at
`localhost:3000`, right now, shows **948 published plans** (1,115 total files in
`content/plans/`, 948 `published: true` — confirmed against the running app, not
just the content files). `QOL_UI_BUILD_PLAN.md` Phase QOL-D already noticed this
drifting ("85 plans growing toward ~950") but `CLAUDE.md`'s own count was never
corrected. This plan is written against the real number (948) throughout — CLAUDE.md's
"Current state" section should get its catalog-size line corrected as routine
hygiene, but that correction is not part of this punch list and wasn't made
here.

**Also answered directly (data question, not a decision):** of the 948 published
plans, **85 have zero images** (`images: []` in their content JSON). Full slug list
available on request; not reproduced here to keep this log short.

### 2026-07-20 — PWA `start_url`: stays on the landing page, not `/browse`

Resolves the one open question QOL-M's write-up flagged as unanswered. **Decision:
`start_url` in `public/manifest.webmanifest` stays `/` (the new landing page) after
the landing-page migration — it does NOT jump straight to `/browse`.** `scope` stays
`/` either way (it has to cover both routes regardless of which one `start_url`
points at).

**Binding requirement that follows from this:** the landing page must ship with a
working, prominent primary CTA into `/browse`. An installed PWA opening to a
marketing page with no obvious way into the actual catalog would be a dead end for
the exact people most likely to have installed it — returning users. `QOL_UI_BUILD_PLAN.md`
Phase QOL-M (Step 0 outline, Step 1's manifest bullet, and both the Step 1 and Step
2 session prompts) updated to state this as decided rather than an open question.

### 2026-07-20 — QOL-L account modal: build our OWN modal, keep Clerk for credentials

**Status:** Confirmed by user (chose "recreate the modal our way" over folding into
Clerk's pre-built `<UserProfile>`; then chose "defer credentials to Clerk" over
recreating credential management).

**Context / why the original QOL-L plan changed.** QOL-L as written assumed folding
`/profile` into Clerk's `UserButton.UserProfilePage` custom pages. The API was verified
to exist (Clerk Next.js docs, live-checked 2026-07-20), BUT it renders CLIENT-only inside
Clerk's modal, while our profile is server-rendered: `WorkshopForm` is an `async` server
component and `saveWorkshopAction` `redirect()`s — neither survives a "reuse unchanged"
move into a client modal, and the redirect lands wrong (full-page nav out of the modal).
Surfaced to Keagan rather than forcing the old pattern to fit (the plan's own item-5
instruction).

**Decision.** Build a **custom `AccountModal`** (our own accessible `<dialog>`), opened
from the header avatar, containing: account summary (name/email/avatar from Clerk's
`useUser()`, member-since from Clerk `createdAt`), activity links (Builds/Saved), the
Workshop tool picker (rebuilt to work in-modal: client fetch of `/api/workshop`, save via
a result-returning `saveWorkshopModalAction`, in-modal success — NOT a redirect), the
theme toggle + install action (moved from the old `UserButton` dropdown), and a **"Manage
account & security"** button that opens Clerk's own UI via `useClerk().openUserProfile()`,
plus Sign out via `useClerk().signOut()`.

**Hard boundary (security):** we do NOT reimplement credential/security flows (password,
email change/verify, MFA, active sessions, account deletion). Those stay with Clerk —
recreating them would be a new auth-sensitive surface and throw away the reason Clerk is
used. Our modal owns presentation + our data only.

**`/profile` STAYS** as the server-rendered page (no route → redirect this time): the
modal is client-only, so `/profile` is the no-JS fallback, and the header avatar is an
`<a href="/profile">` progressively enhanced to open the modal — no-JS users still reach
their account + workshop. This reverses the original QOL-L "/profile becomes a redirect"
bullet, deliberately, for the no-JS path.

### 2026-07-20 — QOL-M landing page: Fraunces heading font; copy stays placeholder

Two calls made while building the QOL-M Step 2 landing page.

1. **Heading font: Fraunces**, approved by Keagan ("continue to step 2 with your
   recommended font"). A warm display serif for headings only (`--font-display`, applied via
   the `.font-display` helper), body copy unchanged. **Self-hosted by `next/font/google`**, so
   there is NO external font request and NO CSP `font-src` hole — the mockup's Google-Fonts
   `<link>` is not used in production. This is a visual/typographic choice, not the brand
   identity: **branding decision #8 (app name, logo, icons) is still open**, and the landing
   still uses the "Woodworking Plan" placeholder name. Swapping the font later is a one-line
   change in `layout.tsx`.
2. **Landing copy is a DRAFT / placeholder**, same standing rule as Sprint 23's About/FAQ
   ("public copy is Keagan's to approve", `BUILD_PLAN.md` §2). Every factual claim on the page
   is true of the app today (real Trending featured plans, a real plan's real cut list, "$0 /
   no ads / offline"); nothing is fabricated. No user counts, testimonials, or comparisons.

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

### 2026-07-21 — UX Remediation Plan (Sprints 33–42) opened; 33–36 executed
**Status:** In progress (Keagan's direction). Sprints 33–36 code-complete and verified at
localhost:3000; the /tmp gate, `npm run build`, and push to `main` are Keagan's.
**Source:** `UX_REMEDIATION_PLAN.md`, derived from the independent `UX_AUDIT_2026-07-21.md`.
This is a UI/UX quality pass that closes audit findings — **not a Phase-4 feature and not a
new business capability**, so it opens no business/vendor/legal question. Sprints 33 (light-theme
AA contrast), 34 (44px touch-target sweep) and 35 (destructive-action confirmation + shopping-list
control) are decision-free engineering and were executed under standing autonomy (`BUILD_PLAN.md`
§2). The only ⚖️ item in 33–36 is the PWA `start_url`, logged immediately below.

### 2026-07-21 — PWA `start_url` → `/browse` (Sprint 36.5, audit H6)
**Status:** Confirmed by Keagan (chose `/browse` over keeping `/`).
**Source:** UX audit H6. The installed PWA now launches to the catalog (`/browse`) instead of the
marketing landing (`/`): someone who installed the app is a returning user who wants plans, whereas
the landing page exists for first-time visitors. `scope` stays `/`. Offline-cold behavior is
unchanged — `/browse` is `force-dynamic` and not pre-cached, so a cold-offline launch shows the SW
offline fallback exactly as `/` did; the change improves the ONLINE launch. Takes effect only when
the PWA is reinstalled. This does not reopen the 2026-07-16 "dark mode follows cookie, not OS"
call — that OS-preference question is Sprint 37's separate ⚖️.

### 2026-07-21 — Dark mode follows the OS when no cookie exists (Sprint 37, audit D1)
**Status:** Confirmed by Keagan (chose "OS default, cookie overrides" over "keep light-default,
cookie-only"). **This REVERSES the 2026-07-16 "dark mode follows the cookie, not
`prefers-color-scheme`" call** — deliberately, at Keagan's direction, not the build agent
relitigating it. That call is superseded on this point only; the cookie mechanism itself is
unchanged and still the explicit override.

**Decision.** With **no `theme` cookie**, a visitor whose OS asks for dark gets dark. Any use of
the toggle writes the cookie, and the cookie wins from then on — including choosing *light* on an
OS-dark machine, which is the case a naive `prefers-color-scheme` implementation gets wrong.

**Why the reversal is right.** The 2026-07-16 rule was made when the toggle was the only entry
point and dark mode was signed-in-only; the audit's finding (D1) is that a phone in a dim workshop
— this app's stated context — renders a bright cream page with no visible way out. Honoring the OS
costs nothing to anyone who has ever expressed a preference.

**Implementation constraint (the reason this was a decision and not a detail).** The server cannot
see `prefers-color-scheme`, so a FOUC-free implementation needs a **nonce'd inline `<script>` in
`<head>`** that adds `.dark` before first paint when (no cookie) && `matchMedia` says dark. The
nonce comes from the `x-nonce` request header our middleware already sets — the same mechanism
`<ClerkProvider dynamic>` relies on. This is the app's first inline script; it is 3 lines, reads
no user data, and writes nothing.

**Accepted limitation, recorded so nobody "fixes" it later:** `<meta name="theme-color">` is
server-rendered from the cookie, so on an OS-dark *first* visit the browser chrome is light for
that one render while the page is dark. The alternatives are worse (script-mutating a meta tag
after paint, or dropping the server-side stamp and reintroducing the FOUC the cookie exists to
prevent). It self-corrects the moment the visitor touches the toggle.

## Pending — Pre-Sprint-0 Decisions

See `BUILD_PLAN.md` §3 for the full list. Confirmed: frontend framework,
backend framework, database, hosting/auth stack, and budget (#1-5, #9).
Still open: payment processor (#6, not urgent — deferred until launch
per the $0-during-development decision above), plan-content admin/CMS
approach (#7, blocks Sprint 1), and branding/domain (#8, blocks
public-facing copy, not Sprint 0). **Sprint 0 is unblocked and can
begin.**
