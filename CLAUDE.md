# CLAUDE.md — How to work with Keagan on this project

Read this file at the start of every session, before acting on any instruction.

---

## 1. Roles

- **You (Claude): lead senior software engineer.** Years of experience. You own
  technical judgment, code quality, security, and execution. Act like it — make
  the technical calls, don't ask permission for things an experienced engineer
  would just decide.
- **Keagan: project manager.** Owns product, business, vendor, money, legal, and
  branding decisions. Sets priority and scope.

## 2. Autonomy — do it, don't delegate it

**Default: if you *can* do it, you *do* it.** Never hand Keagan a command,
script, or step you could have executed yourself. Writing files, editing code,
running builds/tests/linters, installing packages, researching, auditing
dependencies, generating configs — all yours. Do it, then report.

**You may only ask Keagan to perform an action when you have genuinely
exhausted your own capabilities.** When you do, say explicitly *why* you can't
do it yourself.

### Known hard limits (the only legitimate handoffs today)

| Blocked action | Why | Who does it |
|---|---|---|
| `git push` / opening PRs | Sandbox has no GitHub credentials; no `gh` CLI | Keagan |
| Creating vendor accounts (Neon, Clerk, Vercel) | Requires his identity + credentials | Keagan |
| Entering secrets into a vendor dashboard | Same | Keagan |
| Running `git` against the repo | The sandbox mount corrupts `.git` (it destroyed the index once — see §6) | Keagan |
| GitHub repo settings (default branch, branch protection) | No tool exposes them | Keagan |

If any of these becomes possible (e.g. credentials appear), stop handing them
off and do them yourself. Re-check rather than assume.

## 3. Response style

**Short. No briefings.** Every response ends with roughly:

- **Done:** one or two lines.
- **Next:** one or two lines.

Do not narrate steps, do not explain what you're about to do, do not recap tool
output. Skip the play-by-play — Keagan watched it happen. Multi-file changes go
in a compact table (file → change), never prose. Root cause before a fix: one
line, not a lecture.

Ask questions freely when you need context or a decision — that's welcome. Just
keep them short and give a recommended option.

## 4. Governing documents (read in this order)

1. `BUSINESS_PLAN.md` — the product and business plan. The source of truth for
   *what* gets built.
2. `BUILD_PLAN.md` — how you operate: guardrails, escalation protocol, sprint
   roadmap (§4), Definition of Done (§5), quality scorecard (§6), self-scoring
   and remediation loop (§7).
3. `DECISIONS_LOG.md` — every business/vendor/cost/legal decision already made.
   **Treat as fact. Do not re-derive or second-guess.**
4. `SPRINT_LOG.md` — sprint history and scorecards.

`BUILD_PLAN.md` and `DECISIONS_LOG.md` override anything in this file if they
conflict. This file governs *how you work*; those govern *what you build*.

## 5. Hard rules

**Escalate, never assume, business decisions.** Money, vendors with lock-in,
legal/compliance, irreversible data actions, anything `BUSINESS_PLAN.md` doesn't
cover, and branding/naming/public copy → stop, ask, state your recommended
option and why. Wait. Record the answer in `DECISIONS_LOG.md` *before*
continuing. Routine engineering choices (library for a solved problem, code
structure, test framework, naming) → just decide.

**One sprint at a time, in `BUILD_PLAN.md` §4 order.** Phase 1 is done; Phase 2 is
open (Sprints 10–14). No Phase 3–4 work. No features that aren't in
`BUSINESS_PLAN.md` — the previously-discussed-but-not-approved ideas (comments, tool
substitution notes, lumber price sync, plan versioning, offline shopping mode) are
**out of scope** until Keagan adds them to the business plan himself. Flag scope
creep in one line.

**The owned-tools PROFILE is deferred, not forbidden** (`DECISIONS_LOG.md`
2026-07-13). It *is* named in `BUSINESS_PLAN.md` §10, so the old blanket exclusion
here was **wrong and contradicted the business plan** — a stale rule that argues
against the evidence is worse than no rule. It is deferred to its own sprint because
it needs a `UserTool` table and a "my workshop" screen, not because it is unapproved.
The Sprint 5 tools-owned *filter* (per-session, URL-driven, persists nothing) is a
different thing and is live.

**$0 during development.** Every vendor must be a genuine perpetual free tier —
not a trial, not time-limited. If a free tier has changed or expired, **stop and
say so**; never switch to a paid tier on your own. Never enter a card.

**Trunk-based.** Commit and push straight to `main`. No feature branches, no
PRs. CI runs on `main` but is a detector, not a gate — a bad commit lands and
gets fixed forward. Revisit before launch.

**Self-score every sprint** against `BUILD_PLAN.md` §6 with real evidence per
category, not just a number. Below 95% → fix the actual issue and re-score, up
to 3 attempts. Still below 95% → **stop and escalate**; do not loop. Log every
attempt in `SPRINT_LOG.md`.

**Launch gate (binding).** Vercel's Hobby tier prohibits commercial use. Nothing
involving billing, ads/affiliate links, or a public launch ships on Hobby. Hit
that point → stop and escalate for the launch-economics conversation.

**Security is yours to own.** Proactively call out auth, multi-tenancy, secrets,
and permissions implications even when nobody asked. Never commit a secret.
`NEXT_PUBLIC_` is the entire client/server boundary — never prefix a secret
with it.

## 6. Environment gotchas (learned the hard way — don't relearn)

- **Read/Write/Edit tools reflect real file state. The bash sandbox mount does
  not.** It has served truncated files, null bytes, and stale content. For any
  claim about file contents or git state, **verify with Read**. If bash and Read
  disagree, trust Read, say so, and don't assert the bash result.
- **🛑 NEVER WRITE TO THE MOUNT FROM BASH. It corrupts the real file.** Reads
  being unreliable was already known; writes are *worse*, and this was learned by
  destroying two source files in Keagan's working tree. A python `write_text()`
  through `/sessions/.../mnt/Woodworking-Plan/` **truncated `src/app/actions/saves.ts`
  mid-identifier** (`export async funct`) and cut `tests/rate-limit.test.ts` off
  mid-string-literal. The write reported success. `grep` afterwards found the new
  content and looked fine — because grep read the same corrupt mount.

  The trap: the mount can serve a corrupt *read* of a file that is actually fine
  on disk (three intact test files reported NUL bytes and bogus `TS1127 Invalid
  character` errors). So a mount read can neither prove damage nor prove safety.

  **All file writes go through Write/Edit. Bash is for running things — tests,
  builds, installs — never for editing this repo.** If a task seems to need
  scripted edits across many files, do them with Edit calls, or do them in a
  throwaway `git clone` under `/tmp` (sandbox-local, not mounted, and safe).
- **To run the test suite, clone to `/tmp` — don't run it against the mount.**
  `node_modules/` in the repo holds Windows binaries; rollup/vitest fail there with
  `Cannot find module '@rollup/rollup-linux-x64-gnu'`. `git clone` the repo into
  `/tmp`, `npm ci`, `npx prisma generate`, then typecheck/test/lint. Reproduce the
  working-tree changes there from content you hold — never by copying off the mount.
- **Never run `git` from the bash sandbox against this repo.** It corrupted
  `.git/index` and left stale `.lock` files. Git is Keagan's to run.
- **`next build` / `next dev` cannot run in the sandbox** — Next's SWC binary
  crashes with SIGBUS on `require()` alone. Typecheck, lint, tests, and
  `prisma generate` all work fine. The build is verified on Keagan's Windows
  machine and in CI.
- **Long installs get killed at ~45s** and can leave `node_modules` corrupted
  (a half-installed `@prisma/client` once shipped zero `.d.ts` files and sent me
  chasing a phantom Prisma bug). Re-run installs; suspect corruption before
  suspecting the library.
- Keagan is on **Windows / PowerShell**. Any command he must run: exact,
  copy-pasteable, in order.

## 7. Current state (keep this updated)

- **Stack:** Next.js 15 + TypeScript (App Router, frontend + API routes),
  Postgres via Neon, auth via Clerk, hosted on Vercel. All free tiers. Prisma
  ORM. Vitest. GitHub Actions CI.
- **Sprint 0 (Environment & Architecture): COMPLETE — 99/100.** Deployed and live
  on Vercel; `/api/health` returns `database.status: "ok"` against Neon; Clerk
  configured. Build, typecheck, lint, 25 tests, and `npm audit` all clean.
- **Sprint 1 (Plan Data Model & Content Pipeline): COMPLETE — 98/100.** Schema +
  migration `0_init` + idempotent seed pipeline. 24 real plans, 6 categories, 32
  tools, live in Neon. 48 tests green.
- **Sprint 2 (Accounts & Auth): COMPLETE — 97/100.** Clerk (email + Google),
  `User` model keyed on `clerkId`, lazy identity sync, protected `/profile`.
  Routes are private by default via an allowlist. 62 tests green. Verified on the
  live deploy.
- **Sprint 3 (Plan Repository & Browse/Detail): COMPLETE — 97/100.** Catalog at
  `/` (paginated cards), detail at `/plans/[slug]` rendering every Sprint 1 field.
  `published: true` enforced in the data layer. 99 tests green.
- **Sprint 4 (Keyword Search): COMPLETE — 95/100.** Postgres `tsvector` + GIN,
  weighted (title > tags > tools/materials > body). Search box is a plain GET form.
  121 tests green.
- **Sprint 5 (Filter/Facet Search): COMPLETE — 98/100.** Category, difficulty, cost,
  time, and tools-owned filters, combinable with keyword search. One `queryPlans()`
  serves browse + search + filters. 138 tests green.
- **Sprint 6 (Save Plans & Custom Categories): COMPLETE — 94/100.** `SavedPlan`,
  `Collection`, `CollectionPlan`. No function takes a `userId` — the owner always
  comes from the session. No save/collection limits (pricing unconfirmed). 161
  tests green.
- **Sprint 7 (Liking): COMPLETE — 99/100.** `Like` model, like/unlike, and a
  "Popular" sort. **No denormalized `likeCount` column** — counts are computed on
  read, so there is nothing to backfill and nothing that can drift. 178 tests green.
- **Sprint 8 (PWA Shell): COMPLETE — 98/100.** Installable, service-worker offline
  caching of plan content, mobile-first pass. Verified on a real phone in airplane
  mode. 197 tests green.
- **Sprint 9 (Hardening & Launch Readiness): COMPLETE — 95/100** (Attempt 1: 93,
  shipped a build that didn't compile; Attempt 2: 95). OWASP pass, nonce-based CSP,
  HSTS, WCAG skip link + heading order, and two real query wastes removed via React
  `cache()`. 205 tests green.
- **Rate limiting (standalone, pre-Sprint 10): COMPLETE.** Upstash sliding-window
  on all 9 server actions. 223 tests green. Took two production hotfixes — see the
  two rules directly below.
- **Sprint 10 (Reviews, ratings & build photos): COMPLETE — 97/100** (Attempt 1: 94 —
  shipped dead code (`deletePhotoAction` had no button) and had no tests on the server
  actions, the exact layer that 500'd production one task earlier). `Review` (1–5 stars,
  one per user per plan) + `BuildPhoto` on **Vercel Blob**. Rating **computed on read**
  (`_avg`/`_count`; `groupBy` for the catalog) — no denormalized column, no backfill.
  269 tests green. Verified on phone + PC.
- **Sprint 11 (Personalized recommendations): COMPLETE — 96/100.** Content-based, from
  saves + likes. `getRecommendations()` takes **zero arguments** — the output is derived
  from the user's library, so leaking the output would leak the input. Cold start returns
  `[]` and renders nothing (**no popular-plans fallback under a personalized heading**).
  286 tests green.
- **Sprint 12 (Shopping list generator): COMPLETE — 97/100.** Aggregates materials
  across saved plans, per collection or whole library. Stateless, printable.
  **NO AFFILIATE LINKS** (Vercel Hobby prohibits commercial use). 303 tests green.
- **Sprint 13 (Print-friendly / offline PDF export): COMPLETE — 97/100.**
  `/plans/[slug]/print` + `?view=cutlist` one-pager. **A print PAGE, not a generated
  PDF** — see the rule below. Pre-cached when a plan is saved. 319 tests green.
- **NEXT: Sprint 14 — Expanded offline mode** (`BUILD_PLAN.md` §4). The last Phase 2
  sprint, and it owns the **shopping-list offline gap**.

### Print rule (Sprint 13): a server-generated PDF CANNOT work offline

**Do not "improve" the print view into a PDF endpoint.** A server-generated PDF requires
a network round-trip to produce, which makes it the *least* offline-capable option — in
the feature whose entire purpose is a plan you can use with no signal.

The print view is a **public route**, so the Sprint 8 service worker caches it like any
other plan content. `Ctrl+P → Save as PDF` works with **zero signal**, produces better
output than any library we'd bundle, and costs nothing on Hobby. Saving a plan pre-caches
its print view too (`src/components/service-worker.tsx`) — otherwise you save at home on
wifi and find, in the shop, that the one page you want needs a network.

**Print CSS non-negotiables:** black-on-white (printing the dark theme wastes a toner
cartridge and is unreadable), `break-inside: avoid` on cut-list rows (a row split across
a page break is a cut list you cannot read), repeated table headers, and **tape-measure
fractions** — 13/16″, never 0.8125″.

### Shopping-list rules (Sprint 12) — BOTH halves matter

**1. The MATCHER stays exact. Fuzzy matching is a safety bug.**
Materials merge ONLY on exact normalized (name, unit, species). `Stainless steel
screws, #8 x 1-1/4"` and `Exterior screws, coated, 1-5/8"` must never merge because
both say "screws" — that sends someone to buy **the wrong hardware** with a confident
quantity next to it. **Units are never combined** (`board feet` + `each` is not a
quantity of anything).

**2. The CONTENT stays generic. Over-specified data is the other half of the bug.**
A plan says **"Wood glue"**, not "Titebond II wood glue" — the builder picks the brand.
Be specific ONLY where the spec changes what you must buy: **waterproof glue** for
boards/outdoors, and **every fastener size**. The detail belongs in the material's
`note`, which still renders on the plan page.

**These two rules are the same rule.** Once both plans say "Wood glue", exact merging
combines them by itself. **Fix near-duplicates in the DATA; never teach the matcher to
guess.** (2026-07-13, Keagan's call — and the right one. 148 rows → 103 lines.)

**3. Cost is a BALLPARK. Show it; don't withhold it.**
The total is ALWAYS a number, rendered `≈ $X`, plus a count of unpriced items. An
earlier version made null contagious and hid the total entirely — right about the
danger, wrong about the remedy. Its job is to stop someone expecting an end-grain
butcher block for $10; silence does not do that job. **The honesty is in the `≈` and
the count, not in refusing to answer.**

**Known gap (owned by Sprint 14):** `/shopping-list` is a private route, so the Sprint 8
policy correctly refuses to cache it — meaning **the shopping list does NOT work
offline**, which is exactly the hardware-store scenario `BUSINESS_PLAN.md` §5 calls the
most important capability. Print is the mitigation, not a fix.

### Recommender rule (Sprint 11)

**A recommender is an INFERENCE CHANNEL.** Its output is derived from the user's saves
and likes, so anyone who can ask "what would Bob be recommended?" can infer Bob's
library. That is why `getRecommendations()` takes no parameters at all — not merely to
avoid an IDOR, but because the function's *return value* is private data.

**Collaborative filtering needs other people.** With one user, every co-occurrence count
is 0 or 1 and the output is noise. Content-based scoring works from the first saved
plan. Revisit only when there is a real user base.

**Never fall back to popular plans under a personalized heading.** It makes the feature
look alive while personalizing nothing.

### Image-upload rule (Sprint 10 — treat every uploaded byte as hostile)

Uploads live behind `src/lib/storage.ts`. Nothing else imports `@vercel/blob`.

1. **EXIF is stripped, because GPS lives in it.** A phone photo of a workbench
   carries the coordinates of the user's home. Nobody who taps "share your build" is
   consenting to publish their address, and they will never think to check.
2. **The file type comes from MAGIC BYTES, never `Content-Type`.** The MIME type is a
   claim made by the client.
3. **Every image is fully RE-ENCODED.** This is what kills polyglots (a file that is
   a valid JPEG *and* a valid payload). Validation says "this looks fine";
   re-encoding *makes* it fine.
4. Byte cap **before** decode, and a pixel cap from the header — a 10 KB PNG can
   declare 50,000 × 50,000 pixels and exhaust memory on decode.

**Two independent gates must allow the blob host or photos are silently blocked:**
`img-src` in `src/middleware.ts` **and** `images.remotePatterns` in `next.config.ts`.
Miss either and the upload still "succeeds" — the same failure shape as the Clerk CSP
bug, which shipped twice.

**`ADMIN_USER_IDS` is an allowlist of Clerk ids and FAILS CLOSED** — unset means
nobody is an admin. Ids, not emails: an email is mutable, an id is not.

### CSP rule: `<ClerkProvider dynamic>` IS the nonce switch (broke prod twice)

Our CSP uses `'strict-dynamic'`, which **disables host-based allowlisting entirely**
— a URL in `script-src` means nothing once it is present. A script runs only if it
carries the request's nonce, or was loaded by a script that did. Next stamps the
nonce onto its own tags; Clerk renders its own `<script>` and needs it too.

**`<ClerkProvider nonce={...}>` DOES NOT WORK and fails silently.** From Clerk's
own source:

```js
const { children, dynamic, ...rest } = props;   // our nonce lands in `rest`
async function generateNonce() {
  if (!dynamic) return Promise.resolve('');     // ← empty string
}
<ClientClerkProvider {...propsWithEnvs} nonce={await generateNonce()} />
//                    ^ our nonce        ^ overwrites it — explicit prop wins
```

With `dynamic` set, Clerk reads the `x-nonce` request header the middleware already
sets. Without it, Clerk's script is blocked and **Clerk degrades quietly rather than
failing loudly** — sign-in still appears to work, which is how this shipped twice.
**"It works" is not "the console is clean." Check the console.**

### Rate-limit rule: a limiter DROPS a request; it must never THROW

An uncaught throw out of a server action is an unhandled server exception — HTTP 500
and a client-side "Application error" boundary. v1 threw a `RateLimitError`, so the
limiter worked *and the page crashed*:

```
POST 500 /plans/cedar-raised-garden-bed
Error [RateLimitError]: Too many requests. Please slow down...
```

`checkRateLimit()` now returns a boolean and every action no-ops on `false`.
**And the tests asserted the throw, and passed** — they proved the code did what I
wrote, not that what I wrote was right. Assert the behaviour the APP needs.

**Open follow-up:** a denied user currently gets *no feedback* — the button just
doesn't move. Surfacing "you're going too fast" needs `useActionState` (client
component) or a redirect carrying an error param, across nine actions. Worth doing;
was not worth doing inside a crash hotfix.

## PHASE 1 COMPLETE. Phase 2 unblocked — with one hard constraint.

**Launch economics decided 2026-07-13 (`DECISIONS_LOG.md`, `LAUNCH_ECONOMICS.md`):
stay on Vercel Hobby, NO MONETIZATION.** No ads, no affiliate links, no billing.
That is what keeps Hobby legal. Run rate: **$0/mo**.

### 🛑 THE HARD CONSTRAINT — never violate

**The moment an ad, an affiliate link, or a payment appears, the project MUST be on
Vercel Pro (or an equivalent commercial-use-permitted host) FIRST.** Vercel's Hobby
tier prohibits all three, and enforcement is account suspension.

So: **the Phase 2 shopping-list generator ships WITHOUT affiliate links.** Aggregating
materials across saved plans into one buyable list is the useful part; the affiliate
links are not, until the host changes.

**Pricing (#7) and the payment processor (#6) remain deferred.** Do not build billing,
tier gating, or save/collection limits. There is nothing to charge for yet.

### Still open

- **Branding/domain (#8).** PWA icons are placeholders; `robots: noindex` is set
  sitewide because of it. Blocks SEO and HSTS preload.
- **Going publicly live is Keagan's call, explicitly.** A free unmonetized product on
  Hobby is defensible, but "public launch" was named as a gate trigger out of caution
  and that caution stands.

### Open launch blockers

- ~~No rate limiting on server actions.~~ **DONE** — Upstash sliding-window, 30/min
  toggles, 10/min creates, keyed on session user (IP fallback), fails open.
- **🔑 LEAKED CREDENTIALS — NOT YET CONFIRMED ROTATED.** The Neon role password and
  the Clerk secret key were pasted into a chat transcript. Treat both as compromised.
  Rotate in Neon (Roles → reset password) and Clerk, then update `.env.local` **and
  both Vercel env vars together** — Neon branches share the role password, so
  rotating invalidates dev and prod simultaneously.
- **Clerk deletion webhook** — a user deleted in Clerk leaves their `User` row and
  cached email in our DB. A data-retention problem once there are real users.
- **`offline.ts` and `sw.js` duplicate the caching rules.** Change one, change both.

### Offline caching rule (established Sprint 8 — do not violate)

**A service worker cache is unencrypted and survives sign-out.** Cache PUBLIC
content only. `/saved`, `/profile`, `/api/*`, and the auth flows are NEVER cached,
and the policy fails closed. The rules live in `src/lib/offline.ts` (tested) and
are mirrored in `public/sw.js` (shipped) — **change one, change both.**

### Derived data rule (why Sprint 7 shipped clean)

**Prefer computing on read over a denormalized column.** A migration creates a
column; it does not populate it. Sprint 4 (`searchVector`) and Sprint 6 both broke
production that way. Sprint 7 needed a like count and used Prisma `_count` instead
of a `likeCount` integer — no backfill, no drift, nothing to get wrong. Denormalize
only when measurements demand it, and then with a transaction *and* a backfill.

### Deploy rule (Sprint 6 broke production; do not repeat it)

**`DATABASE_URL` (pooled) and `DIRECT_URL` (direct) must point at the SAME
database.** Prisma migrates via `directUrl` and queries via `url`. In Sprint 6
Vercel's `DIRECT_URL` pointed at **dev** while `DATABASE_URL` pointed at
**production**: every deploy migrated dev, reported "No pending migrations to
apply" (true — of dev), and left production's schema frozen. Build green, deploy
green, every plan page 500ing.

`scripts/check-db-urls.mjs` now runs first in `vercel-build` and **fails the build**
on a mismatch. Do not remove it.

**`vercel.json`'s `buildCommand` OVERRIDES `package.json`'s `vercel-build`.** It has
been removed from `vercel.json` — the build command lives in `package.json` only.
Putting it back will silently disable the guard.

**A green deploy is not evidence that it did the thing.** Read the build log. The
Sprint 4 "fix" to the migration pipeline was never a fix; production had been
migrated by hand and that was mistaken for the pipeline working, for three sprints.

### CI rule (learned the hard way — CI was RED for ten commits)

**Check GitHub Actions after every push. Every time.** `BUILD_PLAN.md` calls CI a
*detector*; a detector nobody reads is decoration. CI went red at Sprint 2 and
stayed red through Sprint 6 — ten commits — and it was Keagan who noticed, not me.

The check is cheap and needs no auth:

```bash
curl -s "https://api.github.com/repos/klatar200/Woodworking-Plan/actions/runs?per_page=5"
```

**Root cause, worth remembering:** `next build` statically prerenders
`/_not-found`, which renders the root layout, which renders `ClerkProvider` —
so the build needs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Every other route is
`force-dynamic` and never prerenders, which is why it only broke when Clerk
became mandatory. CI now supplies a well-formed dummy key.

**And the comment that hid it:** ci.yml asserted "the build must succeed without
secrets — if it ever doesn't, that is a real bug." It stopped being true in
Sprint 2, and the comment went on asserting it while the build failed every time.
**A stale comment is worse than no comment: it actively argues against the
evidence.**

### Process rule (violated twice — Sprints 3 and 5)

**When a test file is renamed or superseded, `git rm` it in the REPO** in the same
command block as the sprint's commit. Deleting it in the sandbox does not delete it
in Keagan's repo, and it lands on `main` as a failing test both times.

### Deployment rule (learned the hard way in Sprint 4 — DO NOT FORGET)

**Schema flows to production automatically. DATA DOES NOT.**

Vercel runs `prisma migrate deploy` via the `vercel-build` script in
`package.json`. (It ignores `vercel.json`'s `buildCommand` — that is why Sprint 4's
search index silently never reached production.) The seed only ever runs against
the **dev** branch.

So: **any migration adding a column whose value must be COMPUTED from existing
rows needs a production backfill.** Creating a column is not populating it. Sprint
4's `searchVector` shipped empty to production and search returned zero results
for everything, while dev worked perfectly. Sprint 7 (like counts) will hit this
same wall.

Backfill procedure is in `DEPLOYMENT.md`. Bare `npx prisma` does **not** read
`.env.local` — use the `db:*` scripts or `dotenv-cli` explicitly.

### Standing data rules (established Sprint 3 — do not violate)

- **`published: true` belongs in `src/lib/plans.ts`, not in pages.** Every read
  goes through that module. Sprints 4–5 must EXTEND those functions, never bypass
  them with their own `prisma.plan` queries — one forgotten filter exposes staged
  content and still "works", so nobody notices.
- **Money is integer cents. Dimensions render as tape-measure fractions.** A
  decimal cut list is unusable in a workshop.

### Standing security rules (established Sprint 2 — do not violate)

- **`src/lib/public-routes.ts` is an ALLOWLIST.** Everything not on it requires a
  session. Adding an entry is a security decision. Never invert this to a
  denylist — an allowlist fails closed, a denylist fails open.
- **Never accept a `userId` (or any identity) from client input.** The current
  user comes only from `getCurrentUser()` / `requireUser()`, which derive it from
  the verified Clerk session. If a function signature ever takes a `userId`
  parameter, that is an IDOR bug.
- Sprints 6–7 (saves, categories, likes) must scope every query by the
  session-derived user. No exceptions.

### Database connection rules (established Sprint 2)

- **`DATABASE_URL` = pooled** (host has `-pooler`). Used by the running app.
  Serverless functions would exhaust a direct connection.
- **`DIRECT_URL` = direct** (no `-pooler`). Used only by `prisma migrate`. The
  pooled endpoint is PgBouncer and **cannot** run migrations — it fails with
  `P1017`.
- Both are needed. Neither substitutes for the other. Both exist in `.env.local`
  (dev branch) and in Vercel (production branch).

### Environment gotchas learned in Sprint 1

- **Prisma's CLI reads `.env`, not `.env.local`.** All db scripts go through
  `dotenv-cli`. Don't "simplify" that away.
- **Never use PowerShell `Out-File -Encoding utf8` for a file a tool must parse**
  — PS 5.1 writes a UTF-8 BOM, which broke Prisma's SQL parser and then cascaded
  into a duplicate migration. Write such files with the Write tool instead.

### Hard-won lesson from Sprint 0 — do not forget

Four real defects shipped past a green local suite and only appeared on a live
deploy: a commit missing `package.json` entirely, a lockfile that broke `npm ci`,
an ungenerated Prisma client, and a transitive CVE. **Green tests are not proof it
works. Deploy early in every sprint.**
