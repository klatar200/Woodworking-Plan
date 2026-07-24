<!-- CLAUDE.md — agent-optimized operating manual. Dense; not prose. Read AGENTS_CONTEXT.md first. On their domains these OVERRIDE this file: BUSINESS_PLAN (what), BUILD_PLAN (how you operate), DECISIONS_LOG (facts), SPRINT_LOG (history). §7–§8 invariants each broke prod once — preserve every one. -->

# CLAUDE.md

## 1. Roles
You = lead senior engineer (own technical judgment/quality/security/execution; decide what an experienced engineer would). Keagan = PM (owns product, business, vendor, money, legal, branding, priority, scope).

## 2. Autonomy
If you can do it, do it (write/edit/build/test/install/research/audit/config), then report. Handoffs only when your ability is exhausted; today the only legit ones: `git push`/PRs (no GitHub creds/`gh`), vendor account creation + dashboard secrets (Neon/Clerk/Vercel = his identity), running `git` against the repo (mount corrupts `.git`), GitHub repo settings. Creds appear ⇒ stop handing off, re-check.

## 3. Response style
HARD RULE: every response SHORT — outcome + decisions that matter + next. No play-by-play, scope restatement, self-narration, long postambles. Multi-file changes → table (file→change). Root cause = one line. Ask freely (short, recommended option). Long reply = mistake.

## 4. Hard rules
- Escalate (never assume) business decisions: money, lock-in vendors, legal/compliance, irreversible data, anything BUSINESS_PLAN doesn't cover, branding/naming/public copy → stop, state recommended option+why, wait, record in DECISIONS_LOG BEFORE continuing. Routine engineering → just decide.
- One sprint at a time, BUILD_PLAN §4 order (authoritative status). No feature absent from BUSINESS_PLAN. Flag scope creep in one line.
- $0 during dev: every vendor a genuine perpetual free tier. Tier changed/expired ⇒ stop+say; never go paid, never enter a card.
- Trunk-based: commit+push straight to `main`, no branches/PRs. CI = detector not gate; fix forward.
- Self-score every sprint vs BUILD_PLAN §6, real per-category evidence. <95% ⇒ fix real issue + re-score, ≤3 attempts, then stop+escalate. Log in SPRINT_LOG.
- Launch gate (binding): Vercel Hobby prohibits commercial use. Nothing with billing/ads/affiliate ships on Hobby ⇒ stop+escalate. (Note: public+non-monetized reachability IS allowed on Hobby; trigger = monetization, see AGENTS_CONTEXT §"Settled".)
- Security is yours: proactively flag auth/multi-tenancy/secrets/permissions. Never commit a secret. `NEXT_PUBLIC_` = entire client/server boundary — never prefix a secret with it.

## 5. Environment (SCOPE: Claude Code/Cowork agent only; Cursor agent → AGENTS.md)
- Read/Write/Edit = real file state. Bash sandbox mount does NOT (serves truncated/null/stale). Any file-content/git claim → verify with Read; Read wins, say so.
- 🛑 NEVER bash-write the mount — corrupts the real file (truncated 2 source files mid-identifier, reported success). All writes via Write/Edit or device tooling (`device_commit_files`/on-device node fs; mount denies `unlink` so a git write leaves stale `.git/index.lock`). Bash = run things, never edit this repo.
- Tests: `/tmp` clone only (repo `node_modules` = Windows binaries → rollup/vitest fail `@rollup/rollup-linux-x64-gnu`). `git clone`→`npm ci`→`npx prisma generate`→typecheck/test/lint. Reproduce WIP from content you hold, never copy off the mount.
- Never run `git` from sandbox against this repo (corrupts `.git/index`). Git = Keagan's.
- `next build`/`next dev` can't run in sandbox (SWC SIGBUS). Typecheck/lint/tests/`prisma generate` work. Build verified on Keagan's Windows + CI.
- Long installs killed ~45s, can corrupt `node_modules` → re-run, suspect corruption before library.
- Keagan on Windows/PowerShell: commands exact/copy-pasteable/ordered. Never `Out-File -Encoding utf8` for tool-parsed files (PS5.1 UTF-8 BOM breaks parsers) — use Write. `.ps1` = pure ASCII (BOM/em-dash/box-drawing → parse errors).

## 6. Current state
Stack: Next.js 15 (App Router, RSC+API) · TS · Postgres/Neon · Clerk · Vercel · Prisma · Vitest · GH Actions CI · Cloudflare R2 (plan images). All free tiers.

Catalog = KREG (full swap from ana-white 2026-07-23). `content/plans/` = 1128 JSON; 639 published (`published:true`, full cut list) / 489 hidden (`published:false`, hidden by empty `cutList` AND/OR no live images — both force false; re-publish needs filled cut list AND ≥1 live image; `set-published.mjs`). Difficulty 1:147/2:372/3:483/4:88/5:38. Images on R2 as webp (~16k); dead non-R2 → `unresolvedImages[]` (`park-dead-images.mjs`); no images ⇒ `published:false` (`content.test` forbids published+empty images). `content/plans-draft/` = NON-LIVE staging (~1115 ana-white legacy from git history + WIP); not read by app/seed/default validator; validate `node scripts/validate-plans.mjs content/plans-draft`; promote = move into `content/plans/` + re-seed. `content/paths/` = 0 files (5 learning paths deleted in swap; code/structure remain).

Indexing: `src/lib/seo.ts` `SITE_INDEXABLE=true` (single switch; `go-live.ps1`). Public pages crawlable = publicly REACHABLE/indexable, NOT a product launch (still in development: no marketing/subscriptions/commercialization/users; live≠launched, see AGENTS_CONTEXT §"Settled"). Private routes (print/build/boards/dev/offline/shopping-list) keep hardcoded `noindex`.

Brand: Notch @ notchplans.com, "Oak & Forest" light palette, tagline "Built naturally. Made to last." `src/lib/brand.ts` = single identity source (BRAND_NAME/SITE_ORIGIN/CONTACT_EMAIL=support@notchplans.com/tagline/description). Dark theme = legacy orange DELIBERATELY (re-palette is a separate unopened sprint) — do not "fix".

Content→prod: content NEVER deploys with code. Any content change (publish flags/plans/step tags/paths) needs `npm run db:seed` against prod. Schema flows auto (`prisma migrate deploy` in `vercel-build`); DATA does not — seed runs only where pointed.

Open items (Keagan): Clerk on DEV keys on a public site → needs prod keys. Optional 2nd cut-list parse to re-publish the 489. Kreg legal G1 RESOLVED 2026-07-24 (partnership confirmed; catalog cleared live). Credential rotation (Neon pw + Clerk secret pasted in chat) DEFERRED to pre-go-live, SETTLED — stop raising; rotate once pre-launch then update `.env.local` + both Vercel vars together.

Roadmap (BUILD_PLAN §4 authoritative): Phases 0–3 done; Phase 4 partial (build logs + tool-aware search only; forums/AI-customization/video/metric shut); Tailwind+theme (28–32), UX remediation (33–42), Notch rebrand (43–45) CLOSED; Sprint 46 catalog-UX shipped. Out of scope until Keagan adds to BUSINESS_PLAN: comments, tool-substitution notes, lumber price sync, plan versioning, offline shopping mode, community submissions.

Neon/Vercel: ONE Neon branch `sparkling-band` = production; Vercel Prod `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) both point at it. Dev+prod share this branch during dev ON PURPOSE — do not re-flag "prod==dev"; separate dev branch = pre-go-live task.

Scripts (`scripts/`): `import-kreg-plans.mjs`+`kreg-mapping.config.mjs` (Kreg→`content/plans/*.json`, full-cutlist-only, estimators) · `swap-catalog.mjs` (dry-run default) · `reset-plans-db.mjs` (wipes plans AND paths — Path not a Plan child, own `deleteMany`) · `migrate-images-to-r2.mjs` (webp+R2, resumable JSONL ledger, parallel — run natively) · `spread-difficulty.mjs` · `park-dead-images.mjs` · `set-published.mjs` (`--only-empty-cutlist`) · `stage-legacy-plans.mjs` · `go-live.ps1` · `cleanup-repo.ps1`. Seed per-plan txn `{maxWait:15000,timeout:60000}` (fixes P2028 prod).

## 7. Invariants (each broke prod once; preserve)
Data/security:
- `src/lib/public-routes.ts` = ALLOWLIST (fails closed). Never invert to denylist. Adding an entry = security decision.
- Never accept `userId`/identity from client input (=IDOR). Current user only from `getCurrentUser()`/`requireUser()` (verified Clerk session). Scope every query by session user.
- `published:true` lives in `src/lib/plans.ts`, not pages. Every read goes through it — extend, never raw `prisma.plan` (forgotten filter exposes staged content, still "works").
- Money = integer cents. Dimensions = tape-measure fractions (13/16″, never 0.8125″).
- DB URLs: `DATABASE_URL`=pooled (`-pooler`, app; direct would exhaust). `DIRECT_URL`=direct (only `prisma migrate`; pooled PgBouncer fails migrations P1017). Both needed.
- Prisma CLI reads `.env` not `.env.local` → db scripts via `dotenv-cli`; don't simplify away.

Deploy/migrate/CI:
- `DATABASE_URL` and `DIRECT_URL` MUST point at SAME db (migrate via directUrl, query via url; mismatch = green build, every page 500). `scripts/check-db-urls.mjs` runs first in `vercel-build`, fails on mismatch — don't remove.
- `vercel.json` `buildCommand` OVERRIDES `package.json` `vercel-build` — kept out of `vercel.json`; re-adding silently disables the guard.
- Schema→prod auto; DATA does not. A migration adding a column computed from existing rows needs a prod backfill (DEPLOYMENT.md). Column≠populated (Sprint 4 `searchVector` shipped empty; prod search dead, dev worked).
- Prefer compute-on-read over denormalized column (like/rating counts use `_count`/`_avg`). Denormalize only when measured, with txn+backfill.
- Green deploy/suite ≠ proof. Read the build log. Deploy early each sprint.
- Check GH Actions after every push: `curl -s "https://api.github.com/repos/klatar200/Woodworking-Plan/actions/runs?per_page=5"`. `next build` prerenders `/_not-found`→root layout→`ClerkProvider`→needs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (CI dummy). Stale comments that argue against evidence are worse than none.
- `git rm` a renamed/superseded test file IN THE REPO, in the sprint's commit block (sandbox delete doesn't reach Keagan's repo).

Server actions NEVER throw (throw = HTTP 500 on public endpoint):
- Rate limiter DROPS never THROWS: `checkRateLimit()` returns bool; actions no-op on false.
- Shared `src/lib/form-fields.ts` `formString`/`formInt` return null never throw; actions bail with `redirect(bounceTarget(...))`. `formInt` requires BOUNDS (`parseInt("5abc")`=5, `"1e9"`=1; ratings computed-on-read, one junk poisons averages).
- Only missing-RATING bail carries a notice (`?notice=rating-required`); missing structural ids bounce silent.
- Every lib call in an action → `guardAction()` (`src/lib/action-guard.ts`): `unstable_rethrow` passes framework signals; name-matched `UnauthorizedError` → sign-in w/ return URL; else logged silent bounce.
- Rate-limit bounce target = attacker input → `safeReturnTo()` rejects absolute/protocol-relative(`//evil`)/backslash URLs (else open redirect). `redirect()` = 303 not throw.
- Tests assert the behaviour the APP needs, not that code throws.

CSP/nonce: CSP `'strict-dynamic'` disables host allowlisting; script runs only w/ request nonce. `<ClerkProvider nonce={…}>` does NOT work (Clerk zeroes it unless `dynamic`). Use `<ClerkProvider dynamic>` (reads `x-nonce` from middleware). Clerk degrades quietly — check the console.

Image uploads (hostile bytes): only behind `src/lib/storage.ts` (sole `@vercel/blob` importer). Strip EXIF; type from magic bytes not `Content-Type`; fully re-encode (kills polyglots); byte cap BEFORE decode + pixel cap from header. TWO gates must allow a host or images silently blocked: `img-src` in `src/middleware.ts` AND `images.remotePatterns` in `next.config.ts`. `ADMIN_USER_IDS` = Clerk-id allowlist, fails closed (unset=nobody), ids not emails. `R2_PUBLIC_HOST` must be set at Vercel build time or plan images blocked. Upload size: `serverActions.bodySizeLimit=4mb` (Vercel ~4.5MB edge caps before action), `MAX_UPLOAD_BYTES=4MB`, client downscale island (`photo-input.tsx`/`src/lib/client-image.ts`) to 1600px edge, fails soft.

Offline/SW (cache is unencrypted, survives sign-out): TWO caches `CACHE_NAME` (public) + `PRIVATE_CACHE_NAME` (library+shopping list). `isCacheable()` = DENYLIST (`NEVER_CACHE_PREFIXES` in `public/sw-policy.js`): `/saved`,`/profile`,`/builds`,`/workshop`,`/api/*`,`/shopping-list`,`/dev`, auth. Every new private route → add here + to `tests/offline.test.ts` "covers every private surface". Private cache written by ONE path: `DOWNLOAD_LIBRARY` message (consent), re-checked vs `DOWNLOADABLE_PREFIXES`; wiped on sign-out (`PrivateCacheGuard`, watches session state). `isCacheableResponse` vs `isDownloadableResponse` = separate (consented one alone allows `Set-Cookie`). Policy lives once in `public/sw-policy.js` (constants+4 predicates), loaded by `public/sw.js` via `importScripts`; `tests/offline.test.ts` runs it in Node `vm`. `/sw.js`+`/sw-policy.js` = `no-store`.

View tracking: `PlanView` has NO `userId`, must not get one (user-id'd view log = browsing history, un-collecting later impossible). Logged from a client effect, never server render (prefetch renders plan page server-side → logging there logs views on hover + crawlers count). Action drops denied req, no redirect. Raw SQL not covered by mocked tests: `make_interval(days=>$1)` 500'd default-sort home; bind a computed JS `Date` cutoff, run new raw SQL vs real Postgres, smoke `/` after deploy. Trending = LEFT JOIN (inner drops unviewed = day-one catalog), tiebreak `publishedAt DESC, title ASC`. Trending/Viewed/Recommended rank via `paginateOrderedIds()` (same path as keyword search) — no per-sort query (a lost `published:true` still "works", serves staged).

Shopping list: source = `ShoppingListEntry` (explicit add), NOT `SavedPlan`. `getShoppingList()` takes NO args (owner from session), returns merged + by-plan (`?view=`). Matcher EXACT: merge only on exact normalized (name,unit,species); fuzzy = safety bug; units never combined. Content generic ("Wood glue" not brand) except where it changes what you buy (waterproof for outdoor/boards; every fastener size) → detail in material `note`; fix dupes in DATA not the matcher. Cost = ballpark shown as `≈ $X` + count of unpriced. Gap: `/shopping-list` private → not cached → no offline; print is mitigation.

Cost display: TIERS ONLY, no dollar figures anywhere public (cards/plan/materials/shopping/print) — `$`…`$$$$$`. `formatCents`/`formatCostRange` DELETED (structural); `format.test` asserts absence — don't re-add. `Material.costCents`/`Plan.costMin/MaxCents` stay (derive the tier). `costTierForCents()` thresholds derived from authored plans — re-derive from data if catalog shifts.

Cut-list optimizer (`src/lib/cut-optimizer.ts`, pure): (1) KERF ~1/8″/cut (six 16″ don't fit 96″). (2) RIPPING narrow parts from wider `stockWidthIn`. (3) `totalBoards()` sums `physicalBoards` not `boards.length` (lanes; 4 ripped lanes=1 board). (4) Impossible parts reported LOUDLY, never dropped. (5) grain no-rotate, 1-D length packing. FFD (deterministic). `yieldRatio` divides by what you BUY (`physicalBoards×ripsPerBoard×stockLength`).

Recommender (`src/lib/`): output = inference channel (private) → `getRecommendations()` takes ZERO args. Content-based; cold start returns `[]`, renders nothing. Never fall back to popular under a personalized heading. Recommended-as-a-SORT is fine (anon gets whole-catalog Trending order).

Per-step tools/materials: subset of the plan's, enforced in `src/content/load.ts` (not DB). Optional `.default([])`. Materials by name, tools by slug; seed creates one-by-one for ids. Original-24 tags in `scripts/apply-step-tags.mjs` (skips any slug not in its TAGS table — else re-run strips inline tags from newer plans). Edit original-24 = edit that script+re-run+re-seed; edit others = edit JSON+re-seed.

Learning paths (0 live post-swap): no `PathProgress` table (step complete when its plan is reviewed — `Review` is truth). "Next" = first UNBUILT step, not completed+1. `reason` required by schema. difficulty-dip check in `load.ts` = warning not error. Paths = content→seed. `Path.experienceLevel Int?` + `categoryId String?` nullable on purpose (null category = "spans several"; untagged level → "Not yet rated"). `experienceLevel` reuses 1–5 difficulty; category FK `ON DELETE SET NULL`.

Print: public route cached by SW → `Ctrl+P→Save as PDF`, zero signal. Do NOT build a server PDF endpoint (needs network = least offline-capable). Saving a plan pre-caches its print view. Print CSS: black-on-white, `break-inside:avoid` on cut-list rows, repeated headers, tape fractions.

Clerk deletion webhook: `POST /api/webhooks/clerk` verifies Svix sig; `user.deleted` → `deleteUserByClerkId()` deletes build-photo BLOBS first (DB cascade can't reach object storage) then `deleteMany` User (cascades saves/collections/likes/reviews). Fails closed, idempotent. Not live until `CLERK_WEBHOOK_SIGNING_SECRET` set in Vercel + `user.deleted` endpoint added in Clerk dashboard.

Routing: catalog = `/browse`; `/` = marketing landing. `src/lib/routes.ts` `CATALOG_PATH` = single seam for "point at catalog"; never hardcode `/`.

Launch economics (DECISIONS_LOG 2026-07-13): stay Vercel Hobby, NO monetization (no ads/affiliate/billing), $0/mo. First ad/affiliate/payment ⇒ must be on Vercel Pro FIRST (Hobby enforcement = suspension). Pricing #7 + processor #6 deferred — build no billing/tier-gating/limits.

## 8. Design/CSS invariants (full tables in DESIGN_BRIEF.md — authoritative)
- `globals.css` = single source of design tokens (per-theme set; light=Oak & Forest, dark=legacy orange), mapped via `@theme inline var()` — no copied hex. Dark = `.dark{}` token flip, no `dark:` utilities (`@custom-variant dark` for one-offs). SSR: root layout stamps `.dark` on `<html>` before paint.
- Guards (tests): `dark-theme` (`:root`/`.dark` token parity), `contrast` (WCAG AA both themes), `clerk-appearance` (Clerk vars==tokens), `brand` (manifest colors chained to `:root`). A comment is not a mechanism.
- `--accent` (orange) stays light in BOTH themes → on-accent text via `--accent-fg` (dark ink both; `=--fg` in light). `--oak` graphic-only on light (2.08:1), text-safe on dark panels only.
- UNLAYERED CSS BEATS LAYERED TAILWIND UTILITIES. `globals.css` base rules (`h1`/`h2`/`.muted`/`.small`), print sheet, retained component classes are unlayered → win. Migrated base rules deleted; every modifier/compound/print/context class KEPT on its element. Beat global `h2` with `!`.
- Tailwind source-order traps (emit order, NOT className order): base `border-transparent` beats variant `border-border` → put `border`+color on each variant; `py-*`=`padding-block` shorthand fights `pb-*` → use `pt-`/`pb-`; `font:inherit` emitted after `font-medium` → `font-medium!`; `translate`/`scale` own properties in v4 → `transition-[transform]` animates nothing, name them; two `shadow-*` don't compose (share `--tw-shadow`); use `:active` not `:hover` for press (`hover:` gated behind `@media(hover:hover)`, dead on touch).
- Elevation: `--elev-1/2/3` → `shadow-e1/e2/e3`; never a `shadow-[…]` literal (print sets `--elev-*:none`; dark needs inset top-edge; guard scans floating components).
- Any class in an `@media print` block MUST stay on its element (converting to utilities makes it print — happened 3×). Print block forced light.
- Theme init: `THEME_INIT_SCRIPT` (`src/lib/theme.ts`), only inline script, first child of `<body>`, carries nonce from `x-nonce`. Reads one cookie; none → `prefers-color-scheme`. Traps: `\s` collapses in a JS string → source writes `\\s`; regex must not require `theme` as first cookie (Clerk cookies precede). React doesn't serialize `nonce` → hydration mismatch site-wide (`suppressHydrationWarning` on `<html>` doesn't cover it); caught via console.
- Landing `queryPlans` call stays UNFILTERED (shared w/ featured carousel; narrowing turns headline count into a subset). `landing-copy.test` whitelists arg keys to `['perPage','sort']`. Landing states real catalog size from `total`; below 100-plan floor DROPS the size claim.
- No radius tokens (all radii literals); `landing-scale.test` is a source test.
