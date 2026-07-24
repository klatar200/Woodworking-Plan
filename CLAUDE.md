# CLAUDE.md — agent operating manual (context, not prose)

Read before acting on any instruction. This governs **how you work**. On their own domains these override this file: `BUSINESS_PLAN.md` (what to build — source of truth), `BUILD_PLAN.md` (how you operate: guardrails, sprint roadmap §4, Definition of Done §5, scorecard §6, self-score/remediation §7), `DECISIONS_LOG.md` (every business/vendor/cost/legal decision — **treat as fact, do not re-derive**), `SPRINT_LOG.md` (sprint history). Read in that order when starting real work.

---

## 1. Roles
- **You = lead senior engineer.** Own technical judgment, code quality, security, execution. Make the technical calls; don't ask permission for what an experienced engineer would just decide.
- **Keagan = PM.** Owns product, business, vendor, money, legal, branding, priority, scope.

## 2. Autonomy — do it, don't delegate it
Default: **if you can do it, you do it** — write files, edit code, run builds/tests/lint, install, research, audit deps, generate configs. Then report. Only hand Keagan an action when you've genuinely exhausted your own ability, and say *why*.

Legitimate handoffs (the only ones today): `git push`/PRs (no GitHub creds, no `gh`), creating vendor accounts + entering dashboard secrets (Neon/Clerk/Vercel — his identity), running `git` against the repo (sandbox mount corrupts `.git`), GitHub repo settings (default branch/protection). If creds ever appear, stop handing these off — re-check, don't assume.

## 3. Response style
**HARD RULE (standing): every response SHORT.** Outcome + decisions that matter + next, nothing else. No reasoning play-by-play, no restating scope, no self-narration, no long postambles after sharing files. Multi-file changes → compact table (file → change), never prose. Root cause before a fix: one line, not a lecture. Ask questions freely (short, with a recommended option). Keagan has re-flagged verbosity repeatedly — treat a long reply as a mistake.

## 4. Hard rules (engineering + escalation)
- **Escalate, never assume, business decisions:** money, vendors with lock-in, legal/compliance, irreversible data actions, anything `BUSINESS_PLAN.md` doesn't cover, branding/naming/public copy → stop, state recommended option + why, wait, record in `DECISIONS_LOG.md` **before** continuing. Routine engineering (library choice, structure, naming, test framework) → just decide.
- **One sprint at a time, `BUILD_PLAN.md` §4 order.** §4 is the authoritative status table. No features absent from `BUSINESS_PLAN.md`. Flag scope creep in one line.
- **$0 during development.** Every vendor must be a genuine perpetual free tier. If a tier changed/expired → stop and say so; never switch to paid, never enter a card.
- **Trunk-based.** Commit + push straight to `main`; no feature branches/PRs. CI is a detector, not a gate — bad commit lands, fix forward.
- **Self-score every sprint** vs `BUILD_PLAN.md` §6 with real per-category evidence. <95% → fix the real issue + re-score, ≤3 attempts, then stop and escalate. Log attempts in `SPRINT_LOG.md`.
- **Launch gate (binding):** Vercel Hobby prohibits commercial use. Nothing with billing/ads/affiliate/public-launch ships on Hobby → stop and escalate the launch-economics conversation.
- **Security is yours to own.** Proactively flag auth/multi-tenancy/secrets/permissions even unasked. Never commit a secret. `NEXT_PUBLIC_` is the entire client/server boundary — never prefix a secret with it.

## 5. Environment gotchas (learned the hard way — don't relearn)
- **Read/Write/Edit reflect real file state. The bash sandbox mount does NOT** — it has served truncated files, null bytes, stale content. Any claim about file contents / git state → verify with Read. If bash and Read disagree, trust Read, say so.
- **🛑 NEVER WRITE TO THE MOUNT FROM BASH — it corrupts the real file.** It truncated two source files mid-identifier while reporting success; grep afterward read the same corrupt mount and looked fine. All file writes go through Write/Edit, or device tooling (`device_commit_files` / node fs on-device — the mount denies `unlink`, so a mount write via git leaves a stale `.git/index.lock` and `tar`/`rm` fail). Bash is for running things, never editing this repo.
- **Run the test suite in a `/tmp` clone**, never against the mount: repo `node_modules/` holds Windows binaries (rollup/vitest fail with `Cannot find module '@rollup/rollup-linux-x64-gnu'`). `git clone` → `npm ci` → `npx prisma generate` → typecheck/test/lint. Reproduce working-tree changes from content you hold, never by copying off the mount.
- **Never run `git` from the sandbox against this repo** (corrupted `.git/index`). Git is Keagan's.
- **`next build`/`next dev` can't run in the sandbox** (SWC SIGBUS on require). Typecheck/lint/tests/`prisma generate` work. Build is verified on Keagan's Windows machine + CI.
- **Long installs get killed ~45s** and can corrupt `node_modules`. Re-run; suspect corruption before suspecting the library.
- Keagan is on **Windows / PowerShell.** Any command he must run: exact, copy-pasteable, in order. Never `Out-File -Encoding utf8` for a tool-parsed file (PS 5.1 writes a UTF-8 BOM that breaks parsers) — use Write. `.ps1` scripts must be pure ASCII (BOM-less files read as ANSI; em-dash/box-drawing chars → parse errors).

---

## 6. Current state (post-Kreg launch — keep this updated)

**Stack:** Next.js 15 (App Router, RSC + API routes) · TypeScript · Postgres/Neon · Clerk auth · Vercel host · Prisma · Vitest · GitHub Actions CI · **Cloudflare R2** for plan images. All free tiers.

**Catalog = KREG plans (full swap from ana-white, 2026-07-23, Keagan's call).**
- `content/plans/` = **1128 plan JSON files**; **639 published** (`published:true` — the ones with a full structured cut list), **489 hidden** (`published:false`, empty `cutList` — reversible, awaiting a 2nd cut-list parse pass; re-publish via `set-published.mjs`). Difficulty spread 1:147 / 2:372 / 3:483 / 4:88 / 5:38.
- Images re-hosted to **R2 as webp** (~16k). Non-R2 dead images (404/410) parked into `unresolvedImages[]` by `park-dead-images.mjs`; a plan left with no images → `published:false` (`content.test` guard forbids a published plan with an empty `images`).
- `content/plans-draft/` = **NON-LIVE staging** (holds ~1115 ana-white legacy plans restored from git history + any WIP). NOT read by app / seed / default validator run. Validate: `node scripts/validate-plans.mjs content/plans-draft`. Promote: move file into `content/plans/` + re-seed.
- ana-white fully removed from `content/plans` and prod DB; preserved in git history + `plans-draft/` + orphaned R2 images. `content/paths/` = **0 files** (the 5 learning paths were deleted in the swap).

**Indexing / launch:** `src/lib/seo.ts` `SITE_INDEXABLE = true` — the single indexing switch; `go-live.ps1` flipped it. Public pages (landing/catalog/plan/about/faq) are now crawlable = the site is **de facto publicly launched**. Genuinely-private routes (print/build/boards/dev/offline/shopping-list) keep their own hardcoded `noindex`.

**Brand:** **Notch @ notchplans.com**, "Oak & Forest" palette, tagline "Built naturally. Made to last." `src/lib/brand.ts` = single identity source (BRAND_NAME / SITE_ORIGIN / CONTACT_EMAIL=support@notchplans.com / tagline / description). Light theme = Oak & Forest; **dark theme = legacy orange, deliberately not re-paletted** — do not "fix" the mismatch.

**Content → prod:** content **never** deploys with code. Any content change (publish flags, new/edited plans, per-step tags, paths) needs `npm run db:seed` against prod. **Schema** flows automatically (`prisma migrate deploy` in `vercel-build`); **DATA does not** — the seed only runs where you point it.

**Open items:** Clerk still on **DEV keys** on a public site → needs production keys (Keagan, Clerk dashboard). Optional 2nd cut-list parse to re-publish the 489. **Kreg legal (G1): RESOLVED 2026-07-24 — Kreg partnership confirmed; the catalog is cleared to be publicly live** (639 published + indexable is intended). Credential rotation (Neon role pw + Clerk secret pasted into chat) is **DEFERRED to pre-go-live and SETTLED — stop raising it**; rotate once, right before launch, then update `.env.local` + both Vercel vars together.

**Roadmap status (see `BUILD_PLAN.md` §4 — authoritative):** Phases 0–3 complete; Phase 4 partially open (build logs + tool-aware search only — forums/AI-customization/video/metric stay shut); Tailwind + light/dark theme migration (Sprints 28–32) CLOSED; UX remediation (33–42) CLOSED; Notch rebrand (43–45) CLOSED; Sprint 46 catalog-UX batch shipped. The previously-discussed-but-unapproved ideas (comments, tool-substitution notes, lumber price sync, plan versioning, offline shopping mode, community submissions) are **out of scope** until Keagan adds them to the business plan.

**Neon/Vercel env:** ONE Neon branch `sparkling-band` = production; Vercel Production `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) both point at it. **Dev + prod share this one branch during development on purpose** — do not re-flag "prod == dev"; a separate dev branch is a pre-go-live task.

**Current scripts (`scripts/`):** `import-kreg-plans.mjs` + `kreg-mapping.config.mjs` (Kreg JSON → `content/plans/*.json`; full-cutlist-only, difficulty/time/cost estimators) · `swap-catalog.mjs` (replace catalog, dry-run default) · `reset-plans-db.mjs` (wipe plans **and** paths in DB — Path is NOT a Plan child, needs its own `deleteMany`) · `migrate-images-to-r2.mjs` (webp + R2, resumable JSONL ledger, parallel — **run natively**, network+CPU heavy) · `spread-difficulty.mjs` · `park-dead-images.mjs` · `set-published.mjs` (`--only-empty-cutlist` unpublishes only plans without a cut list) · `stage-legacy-plans.mjs` · `go-live.ps1` (one-command go-live) · `cleanup-repo.ps1`. Seed per-plan transaction uses `{ maxWait:15000, timeout:60000 }` (fixes P2028 on prod).

---

## 7. Load-bearing invariants — each broke prod (or nearly) once. Do not relearn.

Implementation details are discoverable in code; these are the non-obvious **whys** that aren't. Preserve every one.

**Data + security foundation (Sprints 2–3):**
- `src/lib/public-routes.ts` is an **ALLOWLIST** — everything off it needs a session. Never invert to a denylist (allowlist fails closed). Adding an entry is a security decision.
- **Never accept a `userId` (or any identity) from client input.** Current user comes only from `getCurrentUser()`/`requireUser()` (verified Clerk session). A `userId` parameter = an IDOR bug. Scope every query by the session user.
- **`published: true` lives in `src/lib/plans.ts`, not pages.** Every read goes through that module — extend it, never bypass with a raw `prisma.plan` query (a forgotten filter exposes staged content and still "works").
- **Money = integer cents. Dimensions = tape-measure fractions** (13/16″, never 0.8125″); a decimal cut list is unusable in a shop.
- **DB URLs:** `DATABASE_URL` = pooled (`-pooler`, used by the app; serverless would exhaust a direct connection). `DIRECT_URL` = direct (used only by `prisma migrate`; the pooled PgBouncer endpoint fails migrations with `P1017`). Both needed, neither substitutes.
- Prisma CLI reads `.env`, not `.env.local` → all db scripts go through `dotenv-cli`; don't "simplify" it away.

**Deploy / migrate / CI (Sprints 4–6, each broke prod):**
- **`DATABASE_URL` and `DIRECT_URL` must point at the SAME db.** Prisma migrates via `directUrl`, queries via `url`; a mismatch migrates one and freezes the other (green build+deploy, every page 500ing). `scripts/check-db-urls.mjs` runs first in `vercel-build` and fails on mismatch — **don't remove it.**
- **`vercel.json`'s `buildCommand` OVERRIDES `package.json`'s `vercel-build`** — it's removed from `vercel.json`; putting it back silently disables the guard.
- **Schema flows to prod automatically; DATA DOES NOT.** A migration adding a column whose value must be computed from existing rows needs a **prod backfill** (`DEPLOYMENT.md`). Creating a column ≠ populating it (Sprint 4 `searchVector` shipped empty; search returned nothing in prod while dev worked).
- **Prefer compute-on-read over a denormalized column** (Sprint 7 like/rating counts use Prisma `_count`/`_avg` — no backfill, no drift). Denormalize only when measured, with a transaction + backfill.
- **A green deploy/suite is not proof it did the thing.** Read the build log. Green tests missed: a commit with no `package.json`, a broken lockfile, an ungenerated Prisma client, a transitive CVE (Sprint 0). Deploy early each sprint.
- **Check GitHub Actions after every push** — CI was red for 10 commits and Keagan caught it, not me: `curl -s "https://api.github.com/repos/klatar200/Woodworking-Plan/actions/runs?per_page=5"`. Root cause: `next build` prerenders `/_not-found` → root layout → `ClerkProvider` → build needs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (CI supplies a dummy). A **stale comment** asserting "build needs no secrets" hid it — a stale comment is worse than none (argues against the evidence).
- **`git rm` a renamed/superseded test file IN THE REPO**, in the sprint's commit block. A sandbox delete doesn't reach Keagan's repo (landed a failing test on `main` twice).

**Server actions never throw (throw = HTTP 500 on a public endpoint):**
- **A rate limiter DROPS, never THROWS.** `checkRateLimit()` returns a boolean; every action no-ops on `false`. The same throw hid in a private `requiredString()` in 4 files → one shared `src/lib/form-fields.ts` (`formString`/`formInt` return **null**, never throw); actions bail with `redirect(bounceTarget(...))`.
- **`formInt` requires BOUNDS** — `Number.parseInt("5abc")` = 5, `"1e9"` = 1, and catalog ratings are computed-on-read, so one junk value poisons every average.
- Only the missing-**rating** bail carries a user notice (`?notice=rating-required`); missing structural ids bounce silently (only a hand-built request omits them).
- Every lib call inside an action goes through **`guardAction()`** (`src/lib/action-guard.ts`): `unstable_rethrow` passes framework signals, a name-matched `UnauthorizedError` → sign-in with return URL, everything else → logged silent bounce.
- The rate-limit bounce target is attacker input → `safeReturnTo()` rejects absolute / protocol-relative (`//evil`) / backslash URLs (else open redirect). `redirect()` is a framework 303, not a throw.
- **Tests must assert the behaviour the APP needs, not that the code throws** — tests asserting the throw passed while the page crashed. Made this exact mistake twice.

**CSP / nonce (broke prod twice):** CSP uses `'strict-dynamic'` → host allowlisting is disabled; a script runs only if it carries the request nonce. **`<ClerkProvider nonce={…}>` does NOT work and fails silently** (Clerk overwrites it to `''` unless `dynamic` is set). Use `<ClerkProvider dynamic>` so Clerk reads the `x-nonce` header the middleware sets. Clerk degrades quietly — **"it works" ≠ "the console is clean." Check the console.**

**Image uploads — treat every byte as hostile (Sprint 10):** uploads live only behind `src/lib/storage.ts` (sole importer of `@vercel/blob`). EXIF stripped (phone photos carry home GPS). File type from **magic bytes**, never `Content-Type`. Every image **fully re-encoded** (kills polyglots). Byte cap **before** decode + pixel cap from the header (a 10KB PNG can declare 50k×50k). **Two independent gates must allow a blob/image host or images are silently blocked:** `img-src` in `src/middleware.ts` AND `images.remotePatterns` in `next.config.ts` (miss either = the Clerk-CSP failure shape). `ADMIN_USER_IDS` = Clerk-id allowlist, **fails closed** (unset = nobody admin); ids not emails (id is immutable). `R2_PUBLIC_HOST` must be set at Vercel build time or every plan image is blocked.
- Photo upload size: Next `serverActions.bodySizeLimit` rejects the body **before** the action runs (Vercel caps ~4.5MB) → set to `4mb`, `MAX_UPLOAD_BYTES` = 4MB, plus a client downscale island (`photo-input.tsx` / `src/lib/client-image.ts`) re-encoding to a 1600px edge before submit (fails soft, no-JS degrades). A multi-photo submit >4MB total still dies at the platform edge.

**Offline / service worker (Sprint 8, corrected Sprint 14):** an SW cache is **unencrypted and survives sign-out.**
- **TWO caches:** `CACHE_NAME` (public) + `PRIVATE_CACHE_NAME` (library + shopping list). Separate so the sign-out wipe is one `caches.delete()`.
- `isCacheable()` is a **DENYLIST** (`NEVER_CACHE_PREFIXES` in `public/sw-policy.js`): refuses `/saved`,`/profile`,`/builds`,`/workshop`,`/api/*`,`/shopping-list`,`/dev`, auth flows. **Every new private route MUST be added here + to the `tests/offline.test.ts` "covers every private surface" assertion**, or a signed-in page gets written to the sign-out-surviving disk cache.
- Private cache is written by **exactly one path** — an explicit `DOWNLOAD_LIBRARY` message (consent), re-checked against `DOWNLOADABLE_PREFIXES`. **Wiped on sign-out** (`PrivateCacheGuard`, watching session state not a button — several ways to sign out). `isCacheableResponse` and `isDownloadableResponse` are **separate functions** (the consented one alone allows `Set-Cookie`; a flag would be one careless `true` from a session in the public cache).
- Policy lives ONCE in `public/sw-policy.js` (constants + 4 predicates), loaded by `public/sw.js` via `importScripts`; `tests/offline.test.ts` runs it in a Node `vm`. Both `/sw.js` and `/sw-policy.js` are `no-store` in `next.config.ts` (a stale policy defeats a deploy).

**View tracking (Sprint 19):** `PlanView` has **no `userId` and must not get one** (a view log with a user id is a browsing history — the most sensitive table here; un-collecting it later is impossible). Logged from a **client effect**, never the server render (`next/link` prefetch renders the plan page server-side → logging there means hovering the catalog logs a view per card, and crawlers count — a ranking may be lossy, never inflated). The action drops a denied request and does **not** redirect (background effect). **Raw SQL is not covered by the mocked tests** — `make_interval(days => $1)` 500'd every default-sort home render; bind a computed JS `Date` cutoff instead, run any new raw SQL against a real Postgres, and smoke-check `/` after deploy. Trending: **LEFT JOIN** (inner drops unviewed plans = the whole day-one catalog), tiebreak `publishedAt DESC, title ASC`. Trending/Viewed/Recommended rank as an ordered id list via `paginateOrderedIds()` (same path as keyword search) — don't give a sort its own query (a lost `published:true` still "works", just serves staged content).

**Shopping list:**
- **Source (Sprint 22):** built from `ShoppingListEntry` (explicit per-plan "add to shopping list"), **not** `SavedPlan` (saving is "maybe someday"). `getShoppingList()` takes **no args** (owner from session), returns both **merged** and **by-plan** views (`?view=` picks one).
- **Matcher stays exact (Sprint 12):** materials merge only on exact normalized (name, unit, species). Fuzzy matching is a safety bug — merging two different "screws" sends someone to buy the wrong hardware with a confident quantity. **Units are never combined.**
- **Content stays generic:** a plan says "Wood glue", not a brand; be specific only where it changes what you buy (waterproof glue for outdoor/boards, **every fastener size**) — detail goes in the material `note`. Fix near-duplicates in the DATA, never teach the matcher to guess.
- **Cost is a ballpark, shown not withheld:** total is always `≈ $X` + a count of unpriced items (honesty is in the `≈` and the count).
- Known gap: `/shopping-list` is private → not cached → **does not work offline**; print is the mitigation.

**Cost display (Phase 3) — TIERS ONLY, NO DOLLAR FIGURES:** the public UI never shows a dollar amount (cards, plan, materials, shopping list, print) — only `$`…`$$$$$`. `formatCents`/`formatCostRange` are **deleted** (structural, so nothing can render one); `format.test` asserts their absence — do not re-add. `Material.costCents` / `Plan.costMin/MaxCents` stay in the schema (the input that derives the tier). `costTierForCents()` thresholds are **derived from the authored plans** — re-derive from data if the catalog shifts, don't nudge by feel.

**Cut-list optimizer (Sprint 15, `src/lib/cut-optimizer.ts`, pure):** (1) **KERF** — every cut eats ~1/8″; six 16″ parts don't fit a 96″ board. (2) **RIPPING** — narrow parts are ripped from wider stock (`stockWidthIn`); nobody sells a 2″ hardwood board. (3) `totalBoards()` sums `physicalBoards`, **not** `boards.length` (those are lanes; 4 ripped lanes = 1 board). (4) **Impossible parts reported LOUDLY**, never dropped. (5) Grain doesn't rotate — length packing stays 1-D. **FFD** (deterministic, eyeball-checkable). `yieldRatio` divides by what you actually **buy** (`physicalBoards × ripsPerBoard × stockLength`) so wasted rip-lane width counts against yield.

**Recommender (Sprint 11):** its output is an **inference channel** = private data → `getRecommendations()` takes **zero args** (leaking the output would leak the library). Content-based (collaborative filtering needs a real user base); cold start returns `[]` and renders nothing. **Never fall back to popular plans under a personalized heading.** Recommended-as-a-**sort** doesn't violate this — an anonymous user picking it gets the whole catalog's Trending order, nothing hidden.

**Per-step tools/materials (Sprint 21):** a step's tools/materials are a **subset of the plan's**, enforced in `src/content/load.ts` (not the DB — Postgres can't cheaply express it, a bare FK would accept an undeclared tool = a trust bug). Optional (`.default([])`). Materials referenced by **name**, tools by **slug**; the seed creates materials/steps one-by-one to capture ids. Original-24 plans' tags live in `scripts/apply-step-tags.mjs` (which **skips any slug not in its TAGS table** — else a re-run strips inline tags from newer plans, which carry their tags inline in JSON). Edit original-24 tags = edit that script + re-run + re-seed; edit any other = edit its JSON + re-seed.

**Learning paths (Sprint 16 — currently 0 live post-swap):** no `PathProgress` table (a step is complete when its plan is **reviewed** — `Review` is already the truth). "Next" = first **unbuilt** step, not `completed+1` (people build out of order). `reason` is **required by the schema** (the reason is the teaching). The difficulty-dip check in `load.ts` is a **warning, not an error**. Paths are content → seed. Taxonomy (QOL-E): `Path.experienceLevel Int?` + `categoryId String?`, both **nullable on purpose** — `null` category = authored "spans several categories", untagged level groups under "Not yet rated" until a seed runs (a `NOT NULL DEFAULT 1` would falsely claim "Beginner"). `experienceLevel` reuses the 1–5 difficulty scale; category FK is `ON DELETE SET NULL`.

**Print (Sprint 13):** the print view is a **public route** cached by the SW → `Ctrl+P → Save as PDF` works with zero signal. **Do NOT build a server-generated PDF endpoint** — it needs a network round-trip, i.e. the *least* offline-capable option in the feature whose point is no signal. Saving a plan pre-caches its print view too. Print CSS non-negotiables: **black-on-white** (printing dark theme wastes toner), `break-inside: avoid` on cut-list rows, repeated table headers, tape-measure fractions.

**Clerk deletion webhook:** `POST /api/webhooks/clerk` verifies the Svix signature; on `user.deleted` → `deleteUserByClerkId()` deletes the user's build-photo **blobs first** (the DB cascade can't reach object storage) then `deleteMany`s the `User` row (cascading saves/collections/likes/reviews). Fails closed, idempotent for retries. **Not live until `CLERK_WEBHOOK_SIGNING_SECRET` is set in Vercel + a `user.deleted` endpoint is added in the Clerk dashboard.**

**Routing:** catalog lives at **`/browse`**; `/` is the marketing landing page. `src/lib/routes.ts` `CATALOG_PATH` is the single seam — anything meaning "revalidate/point-at the catalog" uses it, never a hardcoded `/` (eight `revalidatePath('/')` calls missed this once).

**Launch economics (`DECISIONS_LOG.md` 2026-07-13):** stay on Vercel Hobby, **no monetization** (no ads, no affiliate links, no billing) — that is what keeps Hobby legal, run rate $0/mo. The moment an ad/affiliate/payment appears, the project must be on Vercel Pro (or equivalent) **first** (Hobby enforcement = account suspension). Pricing (#7) + payment processor (#6) deferred — build no billing/tier-gating/limits.

---

## 8. Design / CSS invariants (full token tables in `DESIGN_BRIEF.md`)

- **`globals.css` is the single source of design tokens: 23 tokens per theme** (light = Oak & Forest, dark = legacy orange), mapped into Tailwind via `@theme inline` `var()`s — **no copied hex**. Dark mode = a `.dark {}` block that flips the `:root` tokens, so the whole app (utilities + the 30c component-CSS residual) re-themes with **no `dark:` utilities** (`@custom-variant dark` registered for one-offs). SSR-safe: root layout stamps `.dark` on `<html>` before paint.
- **Guards:** `dark-theme.test` (light/dark share the same token set — a token in `:root` missing from `.dark` = a silent un-themed color), `contrast.test` (WCAG AA on token pairs, both themes), `clerk-appearance.test` (Clerk vars == tokens), `brand.test` (manifest colors chained to `:root`). A comment is not a mechanism.
- **`--accent` (orange) stays light in BOTH themes** → on-accent text routes through **`--accent-fg`** (dark ink both themes; `= --fg` in light). `--oak` is **graphic-only on light bg** (2.08:1), text-safe only on dark panels.
- **UNLAYERED CSS BEATS LAYERED TAILWIND UTILITIES.** `globals.css` base element rules (`h1`/`h2`/`.muted`/`.small`), the print stylesheet, and retained component classes are unlayered → they win. That's why migrated **base** rules were deleted but every modifier/compound/print/context class was **kept on its element**. A class that must beat the global `h2` uses `!` (or waits for the typography pass).
- **Tailwind source-order traps** (order is Tailwind's fixed emit order, NOT className order): same-property utilities — a base `border-transparent` beats a variant `border-border`, so put `border` + its color on each variant; `py-*` is the `padding-block` **shorthand** and fights `pb-*` longhand → use `pt-`/`pb-`; `font:inherit` is emitted after `font-medium` → use `font-medium!` or the shorthand resets weight; `translate`/`scale` are their **own** properties in v4 → `transition-[transform]` animates nothing, name `translate`/`scale`; two `shadow-*` on one element don't compose (share `--tw-shadow`) → each `--elev-*` carries the complete value incl. dark's inset edge; use `:active` not `:hover` for press feedback (`hover:` is gated behind `@media (hover:hover)`, dead on touch).
- **Elevation:** `--elev-1/2/3` in both themes → `shadow-e1/e2/e3`; **never a `shadow-[…]` literal** (print sets `--elev-*: none`; dark needs the inset top-edge highlight; flat-black low-alpha literals are invisible on dark surfaces). A guard scans floating components for `shadow-[`.
- **Any class inside an `@media print` block MUST stay on its element** — converting it to utilities and dropping the class makes it print (happened 3×). The print block is forced light (token reset).
- **Theme init script** (`THEME_INIT_SCRIPT`, `src/lib/theme.ts`): the app's only inline script, first child of `<body>`, carries the CSP nonce from `x-nonce` (`'strict-dynamic'` blocks it otherwise). Reads one cookie's presence; no cookie → follows `prefers-color-scheme`. Trap: `\s` in a JS string collapses to a bare `s` — source must write `\\s`, and the regex must not require `theme` to be the first cookie (Clerk cookies sit in front). React doesn't serialize `nonce` to the client, so hydration logs a mismatch site-wide — `suppressHydrationWarning` on `<html>` doesn't cover it (one level deep); caught via the console, not a test.
- **The landing's `queryPlans` call must stay UNFILTERED** — it's shared with the featured carousel, so any narrowing turns the real-catalog headline count into a subset. `landing-copy.test` whitelists its arg keys to exactly `['perPage','sort']`. The landing states the real catalog size from `total`; below a 100-plan floor it **drops** the size claim rather than softening it (a half-seeded DB is where nobody looks). *(This copy predates `/browse` + the Kreg counts — the invariant stands, the numbers are re-derived at render.)*
- No radius tokens exist (all radii are literals); the landing type/radius ramp was collapsed onto the shared scale (Sprint 40). `landing-scale.test` is a source test (rendering can't prove values belong to a system).
