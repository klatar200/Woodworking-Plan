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

**One sprint at a time, in `BUILD_PLAN.md` §4 order.** Phases 0–3 are COMPLETE
(see `BUILD_PLAN.md` §4 status table). **Sprints 24–27 are the scheduled completion
plan** (`BUILD_PLAN.md` §4.3, opened 2026-07-15): Hardening Pass 2 → My Workshop →
tool-aware catalog → build logs, in that order. Phase 4 is otherwise CLOSED — build
logs and tool-aware search are its only opened items; forums, AI customization,
video, and metric units stay shut (reasons in the §4 Phase-4 header). No features
that aren't in `BUSINESS_PLAN.md` — the previously-discussed-but-not-approved ideas
(comments, tool substitution notes, lumber price sync, plan versioning, offline
shopping mode, community plan submissions) are **out of scope** until Keagan adds
them to the business plan himself. Flag scope creep in one line.

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
- **Sprint 14 (Expanded offline mode): COMPLETE — 98/100.** Opt-in "Make available
  offline" downloads the whole saved library, its print views, and **the shopping list**
  into a separate PRIVATE cache — **wiped on sign-out**. Closes the `BUSINESS_PLAN.md` §5
  hardware-store gap. 336 tests green. See the corrected offline rule below.

- **Sprint 18 (Desktop catalog layout): COMPLETE — 96/100.** Three-column catalog at
  ≥64rem (category rail / results / filter rail) via `grid-template-areas`, cards
  3 → 4 → 5 across at 64/80/96rem. **ONE DOM in ONE source order** — mobile is
  unchanged by construction: below 64rem there is no grid, the rail is `display: none`,
  and every rule added this sprint lives inside a `min-width` query. `CategoryNav` is a
  *duplicate* affordance (the filter panel's category `<select>` is still the only one
  on a phone), and `FilterDisclosure` force-opens the filters on desktop in a
  `useEffect` — with the `<summary>` never hidden, so no-JS still reaches the filters.
  459 tests green. Visual check on a real browser is Keagan's.

- **Sprint 19 (Sort overhaul + view tracking): COMPLETE — 96/100.** `PlanView` log table,
  **Trending** (7-day) and **Most viewed** (all-time) sorts, **Recommended** folded into
  the sort dropdown (the standalone section is deleted), default sort → Trending,
  Cheapest/Easiest/Quickest removed (they were filters wearing a sort's clothes). 477
  tests green. **Does nothing until the migration runs** — see the view-tracking rule
  below.

- **Sprint 20 (Plan-detail redesign): COMPLETE — 96/100.** Desktop two-column layout
  (data left, image rail right), Tools/Materials/Cut List as **tabs** (`PlanTabs`),
  Instructions behind a **"Start building" button** (`InstructionsDisclosure`), an
  **image slot** (`PlanImageSlot` — primary photo or an honest empty placeholder, **no
  AI render**, `DECISIONS_LOG.md` 2026-07-14), and a **last-step review/photo CTA** in
  StepWalker. **All progressive enhancement over the SAME server-rendered document** —
  the client components only hide parts after mount; print CSS force-shows every tab
  panel and the instructions region, so print/offline/no-JS get the whole plan. One DOM,
  mobile via `order` (title → photo → details). 484 tests green. Visual check is Keagan's.

- **Sprint 21 (Per-step tools/hardware): COMPLETE — 96/100.** `StepTool` + `StepMaterial`
  join tables. A step's tools/materials are a **SUBSET of the plan's own**, enforced at
  content-load (`src/content/load.ts`), NOT by the DB — Postgres can't cheaply express
  "must also be one of this plan's tools", and a plain FK would accept a tool the plan
  never declared. Per-step tags are **optional** (schema `.default([])`), so every plan
  still validates before it's tagged. Chips render on the plan page and the print sheet.
  **The content pass (all 24 plans, 263 tool-tags, 202 material-tags) ships as
  `scripts/apply-step-tags.mjs`** — Keagan's chosen delivery: the TAGS table IS the
  content; he runs it, reviews the diff, re-seeds. Idempotent, rewrites only each plan's
  `steps` array, throws on any non-subset tag. 490 tests green. **Renders nothing until
  the migration runs + the script is applied + re-seed** — see the step-tags rule below.

- **Sprint 22 (Shopping-list redesign): COMPLETE — 96/100.** New `ShoppingListEntry`
  (`userId`,`planId`) model — the shopping list is now built from **explicit per-plan
  adds**, decoupled from saves (`DECISIONS_LOG.md` 2026-07-14). `getShoppingList()` takes
  **no arguments** (owner from session) and returns BOTH views — **merged** (combined,
  grouped by unit; the Sprint 12 exact-merge rule is UNCHANGED) and **by-plan** (each
  project's materials, unmerged). "Add to shopping list" button on each plan (`toggle`
  rate-limit, no-throw, redirect notice); merged/by-plan GET toggle replaced the old
  collection scoping. 495 tests green. **Renders nothing until the migration runs** and a
  user explicitly adds a plan — saved plans do NOT auto-populate it.

- **Sprint 26 (Tool-aware catalog): COMPLETE — 96/100.** One-tap "🧰 Show plans I can
  build" (catalog, signed-in + has workshop + not already tools-filtered) — a GET `<Link>`
  via `buildQueryString` expanding the profile into `?tools=`, reusing the SAME
  `queryPlans` path (no second query, per the `published:true` lesson). Plan page shows
  tool fit ("✓ You own all N essential tools" / "Missing: Router" → link to `/workshop`)
  and highlights owned per-step tool chips (✓). `toolFit()` is a pure helper in
  `src/lib/workshop.ts`, unit-tested; **ESSENTIAL-only, matching the owned-tools filter so
  the page and the filter never disagree**. Results stay URL-driven — a shared `?tools=`
  link renders identically for everyone. 516 tests green. Needs Sprint 25's migration.

- **Sprint 25 (My Workshop — owned-tools profile): COMPLETE — 97/100.** `UserTool` model +
  migration; private `/workshop` screen (off the allowlist + `requireUser`), `saveWorkshop`
  action (`create` rate-limit, denial notice), `🧰 Workshop` in the signed-in header. Same
  IDOR posture as saves: no `userId` params, `deleteMany` scoped by `userId`, forged slugs
  validated away. **The profile only PRE-FILLS the filter panel's tool boxes when the URL
  has no `?tools=`; results stay URL-driven so a shared link renders identically for
  everyone** (`DECISIONS_LOG.md` 2026-07-15). 511 tests green. **Dark until the migration
  runs.** Sprint 26 (tool-aware catalog) builds on this — not built here.

- **Sprint 27 (Build logs — "My builds"): COMPLETE — 96/100. Gate PASSED on Keagan's machine
  (524/524 vitest green, `eslint` clean, `tsc` clean after `prisma generate`).** The final
  completion-plan sprint. A private `/builds` view + a "🔨 N built this" count on plan pages,
  **DERIVED entirely from `Review`/`BuildPhoto` on read** (reviewed ⇒ built, the Sprint 16 rule)
  — **ZERO schema change, ZERO migration**, the first feature-sprint that needs neither.
  `listMyBuilds()` is zero-arg, session-derived, scoped to `published: true`, newest-first. The
  build count REUSES `getRatingSummary().count` — I deliberately did **not** add a
  `getBuildCount()` (a second query for a number the page already holds; documented at the absent
  function). Community stays read-only: no comments, no threads, no forums. **Pre-push audit found
  + fixed a real private-cache leak:** `/builds` (and latent-since-Sprint-25 `/workshop`) were
  missing from the offline `NEVER_CACHE_PREFIXES` denylist, so a signed-in page could be written
  to the unencrypted, sign-out-surviving SW cache — both added + tested. **Gotcha confirmed:**
  `tsc` failed locally only because the generated Prisma client was stale (pre-`UserTool`);
  `prisma generate` fixes it. 🔴 **Push 23, 24, 25, 26 AND 27** — the whole tail is unpushed.

- **Sprint 24 (Hardening Pass 2): COMPLETE — 95/100.** Code audit + fixes of the surfaces
  rebuilt in 17–23. **Real a11y fix:** `PlanTabs` had `role="tablist"` with no keyboard
  support — now the full WAI-ARIA tab pattern (roving `tabindex`, ←/→ wrap, Home/End,
  focusable active panel); nav math extracted to `src/lib/tab-nav.ts` and unit-tested.
  OWASP re-check of every write path since Sprint 9 — clean (`safeReturnTo` defends
  open-redirect; all writes rate-limited + session-scoped). Dead-code sweep + `npm audit`
  — clean (0 vulns). 501 tests green. **Deferred to Keagan (device-bound):** mobile
  Lighthouse on a real device, and the airplane-mode service-worker regression on a real
  phone; plus one real-browser keyboard check of the tab fix once deployed.

- **Sprint 23 (About/FAQ copy): COMPLETE (DRAFT) — 96/100.** Real copy on `/about` and
  `/faq`, grounded in the actual feature set; FAQ free-framing matches launch economics
  ($0, no ads/affiliate, **no forever promise**). **Public copy is Keagan's to approve
  (`BUILD_PLAN.md` §2)** — so the brand name is the "Woodworking Plan" placeholder and the
  contact line is a marked `hello@example.com` placeholder, both to swap with branding/
  domain (#8). Both pages stay `robots: noindex`. Content-only; 495 tests green.

- **Prod hotfix + CI (2026-07-14).** Trending's `make_interval(days => $1)` raw SQL 500'd
  the home page in prod (see the view-tracking rule); fixed to a bound `Date` cutoff. CI's
  long-standing lint red was the `Prototype Wireframe/` design export — now eslint-ignored,
  so CI is a working detector again. A latent Sprint 21 print-test fixture (steps missing
  `tools`/`materials`) was also corrected.

- **Prototype-delta pass (2026-07-14): COMPLETE.** Active-filter chips
  (`filter-chips.tsx` — GET links, one per active filter value, sort/query ride
  along) and skeleton loading states (`loading.tsx` for catalog + plan detail,
  `prefers-reduced-motion` respected). 398 tests green. The wireframes file in
  `Prototype Wireframe/` is HISTORICAL — its dollar figures, save limits, and
  custom auth screens are superseded; see `DECISIONS_LOG.md` 2026-07-14.

## ✅ PHASES 2 AND 3 COMPLETE (Sprints 10–16). Run rate still $0/mo.

Every item in `BUSINESS_PLAN.md` §10 is built except **affiliate links**, which are
blocked by the Hobby commercial-use constraint — not by oversight.

**Phase 3 was OPENED, cut down, and finished (2026-07-13).** Keagan removed three of its
six items (creator marketplace, native app, local lumber pricing → `FUTURE_IDEAS.md`,
**do not build**) and the two that remained shipped: **Sprint 15 (cut-list optimizer,
98/100)** and **Sprint 16 (learning paths, 97/100)**. Makerspace/team accounts stays
blocked by the launch gate (it is a paid tier). See `BUILD_PLAN.md` §4 — the authoritative
status table — and `SPRINT_LOG.md` for the scores. **Phase 4 is NOT open; do not start it
without Keagan explicitly opening it.** Before anything else ships, the launch blockers
below come due.

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

### Shopping-list SOURCE rule (Sprint 22) — explicit adds, not saves

**The shopping list is built from `ShoppingListEntry` (explicit per-plan "add to shopping
list"), NOT from `SavedPlan`.** Saving is "maybe someday"; the shopping list is "buying
for these now" — conflating them made the sheet a dumping ground of every idea ever
bookmarked (`DECISIONS_LOG.md` 2026-07-14). Adding a plan is a separate, explicit action.
`getShoppingList()` takes **no arguments** (owner from session; the old `collectionId`
scope is gone) and returns BOTH the **merged** and **by-plan** views — presentation picks
one via `?view=`, never an argument aimed at another user's data. Same IDOR rules as
saves/likes: no function here takes a `userId`; every write is scoped by `userId` in its
WHERE. **The merge rules below (Sprint 12) are UNCHANGED** — only the source of the plans
changed.

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

**Follow-up CLOSED (2026-07-14):** a denied action now `redirect()`s back to the
page with `?notice=slow-down`, and `/`, `/plans/[slug]`, and `/saved` render a
dismissible banner (`rate-limit-notice.tsx`). Redirect, not `useActionState`, so
the no-JS form path gets the notice too. `redirect()` is a framework-handled 303 —
NOT the uncaught throw that caused the original incident. The bounce-back target
comes from an optional `returnTo` form field, which is ATTACKER INPUT: it goes
through `safeReturnTo()` (src/lib/rate-limit-feedback.ts), which rejects absolute,
protocol-relative (`//evil`), and backslash URLs — remove that check and every
denial is an open redirect.

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
- ~~**Vercel env target unverified.**~~ **RESOLVED 2026-07-14 (Keagan).** ONE Neon
  branch, `sparkling-band`, labelled **production**; Vercel Production's
  `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) both point at it. The empty
  `long-lake` decoy is deleted. **Dev and prod share this one branch on purpose
  during development** — a separate dev branch is a pre-go-live task, not a defect.
  Do not re-flag "prod == dev". See `DECISIONS_LOG.md` 2026-07-14.
- **🔑 Credential rotation — DEFERRED TO PRE-GO-LIVE. This is SETTLED; stop raising
  it.** The Neon role password and Clerk secret were pasted into a chat transcript.
  Keagan has decided — explicitly and repeatedly — that they rotate **once, right
  before public launch**, NOT during development. Do not propose rotating them now,
  do not list them as a current blocker, and do not reopen this each session. When
  go-live is scheduled: rotate in Neon (Roles → reset password) and Clerk, then
  update `.env.local` **and** both Vercel env vars together.
- ~~**Clerk deletion webhook**~~ **DONE (2026-07-14).** `POST /api/webhooks/clerk`
  (`src/app/api/webhooks/clerk/route.ts`) verifies the Svix signature via
  `verifyWebhook` and, on `user.deleted`, calls `deleteUserByClerkId()`
  (`src/lib/user-deletion.ts`) — which deletes the user's build-photo BLOBS first
  (the DB cascade cannot reach object storage) then `deleteMany`s the `User` row,
  cascading saves/collections/likes/reviews. Fails CLOSED (no secret → 500, bad sig →
  400), idempotent for Svix retries. **NOT LIVE until `CLERK_WEBHOOK_SIGNING_SECRET`
  is set in Vercel and a "user.deleted" endpoint is added in the Clerk dashboard** —
  see `DEPLOYMENT.md`.
- ~~**`offline.ts` and `sw.js` duplicate the caching rules.**~~ **DONE (2026-07-14).**
  Policy de-duplicated into a single `public/sw-policy.js`, loaded by the worker via
  `importScripts` and tested directly. See the offline caching rule below.

### Offline caching rule (Sprint 8, CORRECTED and rebuilt in Sprint 14)

**A service worker cache is unencrypted and survives sign-out.**

**⚠️ The old version of this rule was WRONG, and it was cited confidently for three
sprints.** It said we "never write a user's private library to disk." But saving a plan
pre-caches that plan's page — so the cached plan pages already *were* an approximation of
the saved library. **A rule that overstates its own guarantee is worse than no rule**,
because everything downstream trusts it.

**What is true now (Sprint 14):**

- **TWO CACHES.** `CACHE_NAME` (public) and `PRIVATE_CACHE_NAME` (the library, the
  shopping list). Separate, so the sign-out wipe is one `caches.delete()` that cannot
  miss an entry.
- **The worker still NEVER caches a private route on its own initiative.** `isCacheable()`
  refuses `/saved`, `/profile`, `/builds`, `/workshop`, `/api/*`, `/shopping-list`, and the
  auth flows. **Browsing to `/shopping-list` while online caches nothing.** ⚠️ `isCacheable`
  is a DENYLIST (`NEVER_CACHE_PREFIXES` in `public/sw-policy.js`) with a second response gate
  behind it — so **every new private route MUST be added to that list** (and to the
  `tests/offline.test.ts` "covers every private surface" assertion). `/builds` (Sprint 27)
  and `/workshop` (Sprint 25, added late in the Sprint 27 pre-push audit) are on it now.
  Miss this and a signed-in page is cached to an unencrypted, sign-out-surviving disk cache.
- **The private cache is written by exactly ONE path:** an explicit `DOWNLOAD_LIBRARY`
  message from the "Make available offline" button. **Consent is what separates a
  defensible cache from a silent one.** The worker re-checks every URL against
  `DOWNLOADABLE_PREFIXES` — a compromised page cannot use it to stash `/profile`.
- **The private cache is WIPED ON SIGN-OUT** (`PrivateCacheGuard`). This is the mitigation
  the whole decision rests on. It watches **session state**, not a sign-out button — there
  are several ways to sign out and a wipe wired to one of them silently keeps the data for
  all the others.
- **`isCacheableResponse` and `isDownloadableResponse` are SEPARATE FUNCTIONS, not one
  function with a flag.** The only difference is that the consented one allows
  `Set-Cookie`. A flag would be one careless `true` away from putting a session-bearing
  response in the *public* cache, where it survives sign-out forever.

**Known limitation, stated honestly:** the wipe fires when *this device* observes the
sign-out. A session revoked from another device leaves this one's cache until it next
loads the app. The download UI says plainly that the data lives on the device.

**The policy now lives ONCE (de-duplicated 2026-07-14).** It was formerly in two files —
`src/lib/offline.ts` (tested) and a copy inside `public/sw.js` (shipped) — kept in step
only by a test that string-matched a few constants, so the predicate *logic* could still
drift silently. Now:

- **`public/sw-policy.js`** is the single source: the constants and the four predicates
  (`isCacheable`, `isDownloadable`, and the two response gates), as a plain classic script.
- **`public/sw.js`** loads it with `importScripts('/sw-policy.js')` and reads everything
  from `self.OfflinePolicy`. It contains ONLY event wiring (install/activate/fetch/message)
  — no policy literals. `src/lib/offline.ts` is **deleted**.
- **`tests/offline.test.ts`** loads `public/sw-policy.js` in a Node `vm` sandbox and tests
  the exact functions the browser runs — not a mirror. So there is nothing to keep in
  step: **there is one copy.** The test also asserts `sw.js` consumes the policy and does
  not re-declare it (e.g. `'/profile'` must not appear in `sw.js`).
- Both `/sw.js` **and** `/sw-policy.js` are `no-store` in `next.config.ts` — a stale cached
  policy would defeat a deploy exactly like a stale worker would. Miss either and an old
  policy keeps running silently.

### 🔧 Per-step tools/materials rule (Sprint 21)

**A step's tools/materials are a SUBSET of the plan's, and the SUBSET is enforced in
`src/content/load.ts`, not in the database.** Postgres can't cheaply say "must also be
one of this plan's tools", and a bare FK to `Tool` would happily accept a tool the plan
never declared — which would tell a builder to fetch something the project doesn't use
(`BUSINESS_PLAN.md` §12 trust bug). The loader check names the file and step; a DB error
would name neither and fire mid-seed.

**Per-step tags are OPTIONAL** (`step` schema `.default([])` for both). A plan that
predates the content pass still validates and renders no chips. That is what let the
mechanism ship before the content did.

**Step materials are referenced by NAME, tools by SLUG.** Materials are plan-local rows
with no global slug; the seed resolves name → the plan's own `Material` row. The name is
unique within a plan, so the map is unambiguous — but this is why the seed creates
materials and steps one-by-one (to capture ids) instead of `createMany`.

**The content is `scripts/apply-step-tags.mjs`, not 24 hand-edited files** (Keagan's
delivery choice, `DECISIONS_LOG.md` 2026-07-14). The TAGS table in that script IS the
content. It is idempotent, rewrites only each plan's `steps` array, and throws on any
non-subset tag. **Editing the tags = editing that script + re-running it + re-seeding.**
Like all content, it does NOT reach production on deploy — production needs a seed
(`DEPLOYMENT.md`).

### 👁 View-tracking rule (Sprint 19) — the count must MEAN something

**`PlanView` has NO `userId`, and must not get one.** A view log with a user id is a
BROWSING HISTORY: the most sensitive table this app could hold, needing a deletion path,
a retention policy, and a disclosure. Trending and Most Viewed need **counts**, and a
count does not need to know who. Adding the column later is a migration; **un-collecting
a year of browsing history is not a thing you can do.** (`DECISIONS_LOG.md` 2026-07-14.)

**The view is logged from a CLIENT EFFECT, never from the page's server render.**
`next/link` prefetches the RSC payload of every catalog card in the viewport — which
*renders the plan page on the server*. Log it there (or in `after()`) and **hovering the
catalog logs a view for every card**, so Trending becomes "whatever sat near the top of
the grid": a loop that entrenches its own output. Crawlers would count too. The accepted
cost: no-JS and offline readers are never counted. **A ranking signal may be lossy; it
may not be inflated.** The print view logs nothing — printing a plan is not viewing it.

**The action DROPS a denied request and does not redirect.** Same no-throw rule as every
other action (an uncaught throw is a 500), but *unlike* like/save it must not
`redirect()` either — it fires from a background effect, and bouncing a reader to another
URL because a beacon was throttled would be absurd.

**🛑 RAW SQL IS NOT COVERED BY THE TESTS — it 500'd prod once already (2026-07-14).**
Trending first shipped with `NOW() - make_interval(days => ${windowDays})`. Postgres
couldn't resolve `make_interval(days => $1)` against the bound parameter's inferred type,
so **every request for the default (Trending) sort threw a 500 on the home page** — while
`Most viewed` (same query, no window clause) worked, which is what isolated it. The unit
tests MOCK `$queryRaw`, so the broken SQL executed for the first time on a live deploy.
Fixed by binding a computed JS `Date` cutoff (`v."viewedAt" >= ${cutoff}`) — a plain
timestamp comparison with no function-arg inference. **Lesson: a `$queryRaw` string is
NOT proven by a green suite. Any new raw SQL must be run against a real Postgres (a dev
branch) before it's trusted, and a smoke check of `/` after deploy is mandatory when a
raw-SQL path is on the default render.**

**Trending's cold start is real, and the TIEBREAK is the feature.** The table ships empty,
so every count is 0 and the SQL tiebreak (`publishedAt DESC, title ASC`) *is* the order —
i.e. the default catalog is "newest first" until traffic exists. That is why the tiebreak
was chosen to be something defensible on its own. **The ranking is a LEFT JOIN**: an inner
join would drop every unviewed plan — on day one, the entire catalog.

**Trending/Viewed/Recommended rank as an ORDERED ID LIST**, intersected with the filters
by `paginateOrderedIds()` — the same path keyword search uses. Do not give a new sort its
own query: `published: true` going missing on one path still "works", it just serves
staged content.

**Recommended-as-a-sort does NOT violate the Sprint 11 rule.** That rule forbade a
*heading* promising personalization over a generic list. A cold/anonymous user selecting
this sort gets the Trending order of the **whole catalog** — nothing hidden, nothing
claimed. `getRecommendations()` still takes **zero arguments**, and nothing on this path
accepts a `userId`.

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

### 🎓 Learning-paths rule (Sprint 16) — progress is DERIVED, never stored

**There is no `PathProgress` table, and there must not be one.** A step is complete when
the user has **reviewed** that plan. `Review` (Sprint 10) already exists and is already
the truth, so there is nothing to backfill and nothing that can drift.

**"Next" is the FIRST UNBUILT step, not `completed + 1`.** People build out of order —
they see the dovetail box, build it first, and come back. `completed + 1` would point at a
step they had already finished.

**`reason` is REQUIRED by the schema**, not by convention. An ordered list of plans with no
explanation of why each comes where it does is a collection with numbers on it. The reason
IS the teaching.

**The difficulty-dip warning in `load.ts` is a WARNING, not an error** — a deliberate dip
is defensible (the Crosscut Sled is harder than the Rolling Cart, but you want the sled
first because it makes every later cut square). An *accidental* dip must not pass silently.

**Paths are CONTENT.** Editing `content/paths/*.json` changes DATA, which does not reach
production on deploy. It needs a production seed. See `DEPLOYMENT.md`.

### 🪚 Cut-list optimizer rule (Sprint 15) — the buying list must be BUYABLE

`src/lib/cut-optimizer.ts`. Pure module, no deps. Five things it must never get wrong:

1. **KERF.** Every cut eats ~1/8″. Six 16″ parts do **not** fit on a 96″ board, and an
   optimizer that says they do puts someone at a saw with a ruined final piece.
2. **RIPPING. Nobody sells a 2″-wide hardwood board.** Narrow parts are ripped from wider
   stock. The first version grouped by part width and assumed you could buy it — it would
   have told people to buy stock that does not exist. `stockWidthIn` fixes this.
3. **`totalBoards()` sums `physicalBoards`, NOT `boards.length`.** `boards` is a list of
   **lanes**; four ripped lanes are ONE board. Summing lanes over-buys by the rip factor.
4. **Impossible parts are reported LOUDLY**, never dropped. A confident buying list that
   cannot build the thing is worse than no tool.
5. **Grain does not rotate.** Length packing stays 1-D. A 2-D packer would lay a 30″ part
   across a 6″ board "because it fits". That is firewood.

**FFD, not something cleverer.** It is deterministic and eyeball-checkable, and the user
must be able to look at the layout and see it is sane. That beats the last 3% of yield.

**Yield is BOTH dimensions (fixed 2026-07-14).** `yieldRatio` divides consumed board
length-inches by what you actually BUY — `physicalBoards × ripsPerBoard × stockLength` —
so a rip lane left empty (width you paid for) counts against the yield, not just the
length offcut. It used to divide by lanes USED, which hid wasted rip-lane width and
reported ~0.95 where the truth was ~0.70. For non-ripped stock (ripsPerBoard = 1) the
number is unchanged.

### 💲 Cost display rule (Phase 3, 2026-07-13) — TIERS ONLY, NO DOLLAR AMOUNTS

**The public UI never shows a dollar figure.** Not on cards, not on plan pages, not in
the materials table, not on the shopping list, not in print. Only `$` … `$$$$$`.

**`formatCents` and `formatCostRange` are DELETED, not merely unused.** A formatter that
exists will eventually get called. Removing them makes the rule STRUCTURAL — you cannot
render a dollar amount because there is nothing to render it with. `tests/format.test.ts`
asserts they do not exist. **Do not re-add them.**

**`Material.costCents`, `Plan.costMinCents`, `Plan.costMaxCents` STAY in the schema and
stay populated.** They are the INPUT that derives the tier. This is a *presentation*
decision, not a data decision — deleting the numbers would be a one-way door.

**`costTierForCents()`** derives a tier from summed cents, for the shopping list (which
spans plans and has no tier of its own). Its thresholds are **derived from the 24 authored
plans**, not invented — bucketing them by `costMaxCents` separates the hand-assigned tiers
with no overlap. If the catalog shifts, **re-derive from the data; do not nudge by feel.**

**Why:** a dollar figure is a claim of precision we cannot support. Lumber moves with
region, species and season, and every number in the catalog is a hand-authored ballpark. A
band says the decision-relevant thing — "cheap project" vs "not" — and cannot be wrong the
way a number can. It also kills any temptation to chase live lumber pricing
(`FUTURE_IDEAS.md`).

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
