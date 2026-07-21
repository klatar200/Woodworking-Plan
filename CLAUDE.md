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

**🛑 HARD RULE (standing, do not drift from it): keep every response SHORT.** Tell
Keagan only what he needs — the outcome, the decisions that matter, and what's next.
Cut everything else: no reasoning play-by-play, no restating scope, no self-narration,
no long postambles after sharing files. If a sentence can be removed without losing
necessary information, remove it. This applies to EVERY response, including sprint
completions — the SPRINT_LOG holds the detail; the chat reply stays lean. Keagan has
re-flagged verbosity; treat a long reply as a mistake.

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
(see `BUILD_PLAN.md` §4 status table). **Sprints 24–27 (the completion plan) are
COMPLETE and PUSHED** — Keagan confirmed 2026-07-16: CI green, live site verified.
Phase 4 stays PARTIALLY OPENED (build logs + tool-aware search only, per Sprints
25–27); forums, AI customization, video, and metric units stay shut (reasons in the
§4 Phase-4 header). **Sprints 28–32 are now the scheduled work** (`BUILD_PLAN.md`
§4.4, opened 2026-07-16, Keagan's direction): Tailwind CSS migration + a light/dark
theme system, in that order. This is a UI/tooling refactor, not a Phase 4 feature —
it doesn't reopen or expand Phase 4. No features that aren't in `BUSINESS_PLAN.md` —
the previously-discussed-but-not-approved ideas (comments, tool substitution notes,
lumber price sync, plan versioning, offline shopping mode, community plan
submissions) are **out of scope** until Keagan adds them to the business plan
himself. Flag scope creep in one line.

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

- **UX Remediation Plan (Sprints 33–42): IN PROGRESS. 33–37 are code-complete and
  browser-verified at localhost:3000 (2026-07-21, Keagan's direction); push is Keagan's.**
  ⚠️ **Environment note, 2026-07-21:** this session ran NATIVELY on Keagan's Windows machine,
  where `npm run build`, `npx vitest run`, `tsc` and `eslint` all work directly against the repo
  — the `/tmp`-clone rule and the "next build SIGBUS" note in §6 describe the LINUX SANDBOX and
  do not apply when running here. Sprint 37's gate was run natively: build green, 858 tests, tsc
  and eslint clean. `UX_REMEDIATION_PLAN.md`, derived from
  `UX_AUDIT_2026-07-21.md`. A UI/UX quality pass that closes audit findings — **NOT a Phase-4
  feature**, no new business capability; every finding maps to one sprint (that plan's §2 coverage
  matrix). No dev-server restart was needed for any of 33–36 (CSS/TSX hot-reload); the PWA
  `start_url` change (36.5) only takes effect on REINSTALL.
  - **Sprint 33 (light-theme AA contrast — audit A1): COMPLETE.** New `--accent-text` token
    (light `#a85413` = 5.06:1 on `--bg`, 4.78:1 on `--accent-tint`; dark reuses `--accent-strong`
    `#f2b884`; **reset in the print block too**, or dark-mode printing would render accent text as
    invisible light orange). Darkened light `--muted-2` `#8a8175`→`#75705f` (3.64→4.70:1; dark
    unchanged). Re-pointed the THREE text usages of `accent-strong` — `page.tsx` eyebrow + hero
    `<em>`, `browse` "Clear" link — and left every glyph/background/border on `accent-strong`
    (graphic, ≥3:1). **`tests/contrast.test.ts`** parses the token hexes and computes WCAG on 15
    usage pairs × both themes (32 asserts) so a sub-AA TEXT token fails red; `--accent-text` is the
    18th token in the `dark-theme.test` set. Verified live: eyebrow/hero = `rgb(168,84,19)`.
  - **Sprint 34 (44px touch-target sweep — audit M1/V3): COMPLETE.** Step dots, filter
    trigger/close, avatar (44px HIT area, 36px visual circle kept), modal close, chip + checkbox
    pills (`ui.ts`), saved-remove ✕, pagination (→chip-family pill: bordered on `--surface`,
    orange `--accent` active), breadcrumb, shopping checkbox (18.4→24px) + its line row → all
    `2.75rem`. **`tests/touch-targets.test.ts`** guards the shared constants; carries an `it.todo`
    for Sprint 41's `compactOnMobile` deletion. `filter-disclosure.test` updated (was asserting the
    old 2.25rem). Verified live: avatar/pagination/filter/checkbox all 44×44; only sub-44 leftovers
    are the intentional `visually-hidden` no-JS buttons and the checkbox `<input>` inside its 44px
    label.
  - **Sprint 35 (destructive-action confirms + shopping-list control — audit H1/H2/A4): COMPLETE.**
    Review + build-photo delete are now a **two-step, no-JS-safe, URL-driven confirm**
    (`?confirm-delete=<id>` / `?confirm-photo=<id>`) that states the full blast radius (review +
    photos + Your-builds entry + un-marks learning paths) before deleting. Visibility gated by
    `showConfirm()` (`src/lib/review-confirm.ts`) to a review/photo the SESSION user may modify — a
    forged/foreign id reveals nothing and the raw param is never reflected into markup (server
    action re-checks regardless). `/shopping-list` gains remove-from-list — a per-plan header form
    in by-plan, a "Plans on this list" block in merged — reusing the existing
    `removeFromShoppingListAction` (needed `id` added to `ShoppingListPlan` +
    `getShoppingList` select). New **`slugify()`** in `format.ts` fixes the invalid/colliding
    checkbox ids (audit A4: raw `have-${line.name}` held spaces/quotes and collided across unit
    groups). Tests: `slugify.test`, `review-confirm.test` (pure). The delete/remove click-throughs
    need existing review/list data → Keagan's `npm run dev` pass.
  - **Sprint 36 (wayfinding — audit A2/A5/H7/H11/H6/M4 + tabpanel polish): COMPLETE.** Header nav
    current-state via a tiny client island `nav-current.tsx` wrapping `<Link>` (aria-current + ink
    + `font-semibold` + a 2px `--accent` underline) with the match rule in pure
    `src/lib/nav-active.ts` (`/` exact, others prefix, `/plans/*` marks nothing) — **NO
    `useSearchParams`** (the `/_not-found` Suspense trap); PUBLIC_NAV/SIGNED_IN_NAV stay the single
    source. Results count → `role="status"` live region (A5). Sort **no longer vanishes** during a
    keyword search — it's a DISABLED "Relevance" control with the reason in `title` (H7). Mobile
    drawer search (`#drawer-q`, 16px, its own id; **`MobileNav` now exempts `input/label` from its
    close-on-click** so tapping the field doesn't shut the drawer, while the submit button still
    closes it for a query-only search-from-`/browse`). Header-search input 15→16px (M4, iOS zoom).
    `PlanTabs` panels now ship **role-free**; the effect adds `role="tabpanel"`/`aria-labelledby`
    **only post-mount when the tablist exists** (no ARIA orphan) — the three `<section data-tab>`
    lost their server-rendered roles. **`start_url` → `/browse`** (⚖️ Keagan). Tests:
    `nav-active.test` (pure); updated `sort-select.test` (was asserting `''`) +
    `filter-disclosure.test`. Verified live: nav aria-current on `/paths`, disabled Relevance on
    `?q=`, results `role=status`, drawer form in DOM, header search 16px.
  - **⚠️ Staging-cache staleness caught 2026-07-21:** `device_stage_files` served a STALE
    pre-Sprint-33 snapshot of `browse/page.tsx` (same bytes/mtime, still `accent-strong`). Caught
    via `git diff` (authoritative), rebased the Sprint-36 edit on the correct copy, and verified
    on-device that browse carries BOTH 33's `text-accent-text` and 36's `role="status"`. Lesson:
    for a file already modified this session, cross-check the staged copy against `git diff` before
    editing — a stale stage will silently revert.
  - **Sprint 37 (dark mode for everyone — audit D1): COMPLETE.** Verified in a real browser at
    localhost:3000 (2026-07-21); `npm run build`, 858 tests, `tsc` and `eslint` all green on this
    machine. **⚖️ Keagan reversed the 2026-07-16 "cookie, not OS" call:** with **no cookie**, the
    app now follows `prefers-color-scheme`; the cookie stays the explicit override
    (`DECISIONS_LOG.md` 2026-07-21). The engine is unchanged — cookie → `.dark` on `<html>`,
    server-stamped, token flip.
    - **The app's first and only inline script** (`THEME_INIT_SCRIPT`, `src/lib/theme.ts`), first
      child of `<body>`, carrying the CSP nonce from `x-nonce` (`'strict-dynamic'` would silently
      block it otherwise). The server cannot see `prefers-color-scheme`, so a `useEffect` would
      flip AFTER paint — the exact flash the cookie stamp exists to prevent. It reads one cookie's
      PRESENCE, sets one class, writes nothing, and is try/catch'd so a browser without
      `matchMedia` degrades to light instead of dying before the page renders.
    - **🛑 TWO TRAPS, both caught, both would have shipped silently.** (1) **`\s` inside a JS
      string is an unrecognised escape** that collapses to a bare `s` — shipping
      `/(?:^|;s*)theme=/`, which only matches when `theme` is the FIRST cookie. With Clerk's
      cookies in front, every explicit choice would be ignored and the OS would win. The source
      writes `\\s`; `tests/theme.test.tsx` EXECUTES the script in a `node:vm` sandbox (the
      `sw-policy.js` technique) across 8 cases including "theme cookie not first". (2) **React
      deliberately does not serialize `nonce` to the client**, so hydration compared the server's
      real nonce against `nonce=""` and logged a mismatch site-wide. `suppressHydrationWarning`
      on `<html>` does NOT cover it — it only applies one level deep. Found by reading the browser
      console, not by any test: **"it works" is not "the console is clean."**
    - **Shared `ThemeToggle`** (`theme-toggle.tsx`) in THREE places — mobile drawer + footer (both
      **outside `<SignedIn>`**, which is the whole fix) and the account modal. Backed by a module
      store (`theme-store.ts`, same shape as `install-store.ts`) read via `useSyncExternalStore`:
      with per-instance `useState`, toggling from the drawer left the footer button still reading
      "Dark mode" on an already-dark page. Verified live: both labels flip from one click. Renders
      **nothing until mounted** — a cookie toggle could be a no-JS POST form, but a server action
      + rate-limit key for a display preference is out of proportion, and a dead button is worse
      than none. `data-theme-toggle` is load-bearing: `MobileNav` exempts it from close-on-click,
      so the drawer re-themes under your thumb instead of slamming shut.
    - **Clerk dark appearance** (`clerkAppearanceDark`) — the audit's "single most jarring dark-mode
      moment". Set ONCE on `<ClerkProvider>`; the per-page `appearance` props on sign-in/sign-up
      were **removed** (a second source is how a page ends up white inside a dark app).
      `colorPrimary` is the light INK, not the orange accent — Clerk paints white button text on
      `colorPrimary`, and orange would fail contrast. Verified live in dark: card `#221e17`, inputs
      `#17140f`, **zero white surfaces** in the Clerk tree. **The old "update this by hand when the
      palette changes" comment had already failed** — `colorTextSecondary` was still `#8a8175`, the
      pre-Sprint-33 `--muted-2` that failed AA. `tests/clerk-appearance.test.ts` now parses
      `:root`/`.dark` out of `globals.css` and asserts every variable equals its token, plus AA on
      Clerk's own text pairs. A comment is not a mechanism.
    - **Browser chrome follows the theme:** `viewport` became `generateViewport()` reading the
      cookie per request (`#faf9f6` / `#17140f` = each theme's `--bg`); it was a fixed `#1a1a1a`,
      i.e. a dark toolbar over the light default. Manifest `background_color`/`theme_color` →
      `#faf9f6` (static file, so the splash is light either way). **Accepted limit, logged:** on an
      OS-dark FIRST visit there is no cookie, so the meta is light for that one render while the
      script darkens the page. Self-corrects on first toggle.
    - **37.5 dark sweep found a real defect beyond the hex grep:** the account avatar was
      `bg-[#e9a86c]` (a literal that had stopped tracking `--accent`) **and its fallback glyph
      inherited `text-fg` — 8.5:1 in light, 1.7:1 in dark, an invisible icon.** `--accent` is light
      in BOTH themes, which is exactly what `--accent-fg` exists for → `bg-accent text-accent-fg`.
      Landing's deliberate `#ffe6c4`/`#7a4a12` panel and the always-dark final CTA stay, per audit.
    - **Deferred to Keagan (device-bound, per E3):** real-phone check that the OS-dark cold start
      has no flash, the Android toolbar colour actually following, and a print preview (print
      forces light via the token reset — unchanged by this sprint).
  - **Pending docs (batched to Sprint 42's doc truth-pass):** `DESIGN_BRIEF.md` rewrite, and the
    §7 entries for 38–41 as they land. This §7 block and the `DECISIONS_LOG` `start_url` +
    OS-preference entries are recorded now (2026-07-21).

- **Stack:** Next.js 15 + TypeScript (App Router, frontend + API routes),
  Postgres via Neon, auth via Clerk, hosted on Vercel. All free tiers. Prisma
  ORM. Vitest. GitHub Actions CI.
- **Catalog size (verified 2026-07-20, against the LIVE site, not just the
  content files): 948 published plans.** `content/plans/` holds **1,115 total
  plan JSON files, 948 marked `published: true`** — and `localhost:3000`
  confirms 948 plans actually rendering in the catalog right now, so this
  content is already seeded and live, not sitting unseeded in git. **85 of
  those 948 published plans ship with an empty `images` array** (no photo) —
  full slug list available on request, not reproduced here. The
  "85 plans (24 + 61)" figure and its "gated on a production seed" caveat
  immediately below this line, from 2026-07-16, are SUPERSEDED — the catalog
  grew roughly 10x past that count with no corresponding update to this
  section, which is exactly the kind of drift this section exists to prevent.
  **Not verified in this pass:** whether the scraped content beyond the
  original ~85 went through the provenance/branding review
  `AUDIT_2026-07-16.md` #5 called for before its seed ran — worth Keagan
  confirming, since the content is evidently already live regardless of
  whether that review happened. Older records elsewhere in this file and in
  other docs citing "24 plans" or "85 plans" are HISTORICAL — accurate for
  their sprint, not the current count.
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
  `prisma generate` fixes it. **Pushed (confirmed 2026-07-16, Keagan): CI green, live
  site verified.** The former "unpushed tail" note is resolved.

- **Sprints 28–32 (UI framework migration — Tailwind CSS + light/dark theme): IN
  PROGRESS.** OPENED 2026-07-16 (Keagan's direction). See `BUILD_PLAN.md` §4.4 for the
  five-sprint breakdown and `DECISIONS_LOG.md` 2026-07-16 for the decision record
  (this reinstates dark mode, reversing the 2026-07-13 "dark mode dropped" call —
  explicitly at Keagan's direction this time, not the build agent relitigating it).

  - **Sprint 28 (Tailwind env setup): COMPLETE — 97/100.** Foundation only, **zero visual
    change**. `postcss.config.mjs` (`@tailwindcss/postcss`) + `src/app/tailwind.css`:
    imports the `theme` + `utilities` layers but **NOT preflight** — Tailwind's base reset
    would move pixels on every page and fight the un-migrated CSS through Sprints 29–30, so
    `globals.css` stays the base reset for the whole migration. `@theme inline` maps all 15
    color tokens to the live `:root` `var()`s (**single source of truth — no copied hex**;
    Sprint 31 dark mode works by flipping the vars), plus `--breakpoint-xs: 34rem` (defaults
    cover 40/64/80/96 → sm/lg/xl/2xl). `tailwind.css` imported **before** the unlayered
    `globals.css` in `layout.tsx`, so the hand-written system wins every conflict this
    sprint. `globals.css` UNTOUCHED. Verified by compiling the entry file with the real
    Tailwind **v4.3.2** toolchain (tokens → exact `var()`s, breakpoints exact, no preflight
    emitted). Guard test `tests/tailwind-setup.test.ts` locks the preflight-excluded +
    var-mapped invariants. **Adds two devDeps (`tailwindcss`, `@tailwindcss/postcss`
    `^4.3.2`) → needs `npm install` + verify + push on Keagan's machine** (the full Next
    build, where Tailwind runs, can't run in the sandbox). Sprints 30–32 not started.

  - **Sprint 29 (Component migration, wave 1): COMPLETE — 96/100.** Converted the shared
    shell + highest-traffic surfaces to Tailwind utilities: `SiteHeader`/brand/nav, the
    `.page` container + skip link, the whole `.btn` system (base + ghost/primary/danger/
    liked + the step-walker disabled state), the search form controls, and the catalog +
    plan-detail **card chrome**. Reused classes are shared constants in **`src/lib/ui.ts`**
    (`btn`/`btnGhost`/`btnPrimary`/`btnDanger`/`btnLiked`, `page`, `searchInput`,
    `categoryLabel` — `.btn*` alone was ~80 usages across 17 files); one-offs are inline.
    **Parity method:** every class string compiled with the real Tailwind v4.3.2 toolchain
    and the emitted declarations diffed against the deleted CSS (arbitrary values like
    `px-[0.875rem]`, `rounded-[50%]`, `ease-[ease-in-out]` where the default scale wouldn't
    match). **THE cascade rule for this migration:** delete each migrated BASE rule, but KEEP
    every not-yet-converted modifier/compound/print/context class (`.page-wide`,
    `.page-catalog`, `.plan-detail`, the print `.page`/`.site-header`/`.search-box` rules,
    `.saved-item .plan-card`, `.step-walker-nav`, `.plan-rating`, `.pagination-disabled`) —
    they're **unlayered**, so they still beat the layered utilities and mid-migration parity
    holds by construction. That's also why the `page`/`site-header`/`search-box`/`plan-card`
    CLASSES are retained on their elements. **Two Tailwind gotchas (remember these for waves
    2–3):** (1) same-property utilities apply in Tailwind's fixed source order, NOT className
    order — a base `border-transparent` beats a variant's `border-border`, so `border` + its
    color live on each variant and each button carries exactly one border-color + one
    text-color (guarded by `tests/ui-classes.test.ts`); (2) a local `const page` in
    `app/page.tsx` shadowed the imported `page` shell class → import aliased to `pageShell`.
    **One accepted deviation:** the card-link hover tint compiles to a `@media (hover:hover)`
    rule (Tailwind's `hover:` idiom) — desktop identical, touch no longer sticky-hovers.
    **Needs `npm run build` + a real-browser pixel-parity pass (34/40/64/80/96rem, mobile +
    desktop) + push on Keagan's machine.** ⚠️ The sandbox mount served a **stale/truncated
    `globals.css`** this session, so its CSS parse is Keagan's build; the edits are verified
    via Read + a per-edit brace-balance audit.

  - **Sprint 30a (Component migration, wave 2 — catalog + plan-detail layout): COMPLETE —
    96/100.** Sprint 30 (retire ~all remaining `globals.css`) is **split into three
    browser-checkable sub-waves 30a/b/c** (Keagan's direction 2026-07-14) so pixel-parity is
    verified incrementally, not as one 200-rule blind diff. **30a = the two hardest-to-eyeball
    layout systems:** the Sprint 18 three-column catalog grid (`grid-template-areas` as
    `lg:[grid-template-areas:'nav_search_filters'_'nav_results_filters']` + `grid-area`
    placements) and the Sprint 20 plan-detail layout (two-column `lg:` grid, image slot, the
    Tools/Materials/Cut-list tabs, the instructions disclosure). **Deferred within 30a, each for
    a cascade reason:** `.plan-grid` (SHARED grid across catalog/saved/paths → convert with
    them), `.catalog-nav-heading` (overrides the unlayered global `h2` — a layered utility can't
    win, so it waits for the typography pass), `.page-wide.plan-detail` (compound override of the
    retained `.page-wide` modifier). **Gotcha for 30b/c:** `font: inherit` is emitted AFTER
    `font-medium` in Tailwind's source order, so a button that needs both must use `font-medium!`
    (important) or the shorthand resets the weight. Retained-class pattern continues (print/
    sibling selectors keep `catalog-nav`, `plan-detail-grid`/`-aside`, `plan-tabs`/`plan-tablist`,
    `instructions-open`/`-region`). `category-nav.test.tsx` updated (asserts the active-only
    `bg-accent-tint` utility instead of the removed `.catalog-nav-link-active` class). **Needs
    `npm run build` + real-browser pixel-parity + push.** ⚠️ Mount appended NUL bytes to
    `globals.css` this session (known corruption); real file intact per Read + balance audit,
    authoritative parse is the build. **30b/30c remain.**

  - **Sprint 30b (wave 2 — filters/chips/saves/shopping/workshop/builds): COMPLETE — 96/100.**
    Converted the filter panel (`:has()` checkbox pills, selects, legend, form), active-filter
    chips, sort control, collection tabs + saved-item frames, shopping list, workshop form, and
    build log to Tailwind. Shared constants added to **`src/lib/ui.ts`**: `selectControl`,
    `checkbox`, `checkboxInput`, `chip`/`chipActive`. **`:has()` note:** Tailwind's `has-[...]`
    compiles to `:has(*:is(...))` (equivalent) and its specificity means checked/focus colors win
    over the base without class-order juggling. **Deferred to 30c** (documented): heading-classes
    (`.build-log-title`, `.sub-heading` — override the global `h2`, blocked until the typography
    pass), the shared `.plan-grid`/`.plan-grid-inner`, and boards' `.scope-form`/`.notice`. **Bug
    caught in verification:** `.notice` is shared with the boards page (`notice notice-warning`) —
    deleting its base rule would have broken boards; the orphan grep caught it and the rule was
    restored. `filter-disclosure.test.tsx` updated (class-agnostic summary assertion). Retained
    classes: `sort-form` (print), `saved-item` (the `.saved-item .plan-card` compound). **Needs
    build + real-browser parity + push. 30c remains** (reviews, board-plan, paths, prose,
    skeletons, global typography/reset → `globals.css` down to `:root` + print + reset).

  - **Sprint 30c (wave 2 — the remainder): CLOSED with a documented component-CSS residual —
    95/100.** 30c is the whole rest of `globals.css` (~130 rules) and is markedly more entangled
    than 30a/30b: nearly every remaining rule is a descendant selector on dynamic rows (tables
    `th/td`, `dl` `dt/dd`, `.prose p`), a compound (`.path-step-done .path-step-number`,
    `.step-rail-item-active .step-rail-number`), an animation (`.skel` + `@keyframes`), a print
    dependency, or a class on an `h2` that overrides the global `h2`. Per Keagan (2026-07-14) these
    stay as a **component-CSS residual** — there's no clean per-element utility form for dynamic
    content, and inlining them is low-value, high-regression churn (this pass alone surfaced 3 real
    print regressions). **Converted:** the reviews section (`reviews-section.tsx`), star rating
    (`star-rating.tsx`), the
    step-walker chrome (`step-walker.tsx` — rail/dots/progress/nav, with per-variant active
    colors and `[font-family:inherit]` to dodge the `font:inherit` size-reset), and the PWA
    install prompt (`install-prompt.tsx`); dead `.recommendations*` (component removed Sprint 19)
    deleted. **Gotcha found:** `review-body`/`build-photo*` are shared by the builds page —
    converted there too. **Remaining (a further pass):** the plan-detail CONTENT — `.data-table
    th/td/thead/tbody/tfoot`, `.detail-row dt/dd`, `.glance-item dt/dd`, `.prose p/strong`,
    `.steps`/`.step`/`.step-title`/`.step-number` — these are **descendant/element selectors on
    dynamic (mapped) rows with no clean per-element inline-utility equivalent**; the honest options
    are to class every cell or keep them as a small component-CSS residual. Plus paths, board-plan,
    skeletons (+`@keyframes`), pagination/empty-state, status-list, auth-page, prose/faq, and the
    global base typography (`h1`/`h2`/`.muted`/`.small`) which §4.4 permits to stay as "truly-global
    reset". **Descendant/`dl`/table/prose rules stay as a documented component-CSS residual per
    Keagan (2026-07-14)** — no clean per-element utility for dynamic rows. ⚠️ **PRINT-REGRESSION
    LESSON (found + fixed this pass):** the print stylesheet hides `.step-rail/.step-dots/
    .step-walker-bar/.step-walker-nav/.step-finish-cta` (this turn) and `.plan-actions` +
    `.shopping-line/.shopping-line-main` (30b) BY CLASS — converting those to utilities and dropping
    the class made them print. Fixed by retaining the class alongside the utilities. **Any class in
    an `@media print` block MUST be kept on its element.** Working tree is print-safe + clean (no
    orphans); build + 542 tests + CI green. `globals.css` end-state: `:root` + `*`/`html`/`body`
    reset + base element typography (`h1`/`h2`/`code`/`.muted`/`.small`) + the print stylesheet +
    the documented component residual. **Sprint 31 (dark theme) is unblocked** — the residual uses
    the `:root` tokens, so flipping the tokens themes it too. If a full retirement is ever wanted,
    the residual can be inlined page-by-page later (low priority, no user-facing change).

  - **Sprint 31 (Light/dark theme + toggle): COMPLETE — 96/100.** Dark mode is a **`.dark {}`
    block in `globals.css` that flips the `:root` tokens** — because every utility AND the 30c
    component residual read `var(--token)`, this re-themes the whole app with **no `dark:`
    utilities** (`@custom-variant dark` is registered for one-offs). Light palette unchanged; dark
    is a warm-dark palette, same orange accent, functional colours lightened — 11 key text pairs
    computed at **AA (5.7–15.6:1)**. **The one trap:** `--accent` (orange) stays light in dark, so
    the active pill/checkbox (`bg-accent` + `text-fg`) would be light-on-orange and fail — fixed
    with a new **`--accent-fg`** token (dark ink in both themes; `= --fg` in light so nothing
    changes there); on-accent text (`chipActive`, `checkbox:has(:checked)`) routes through it.
    **SSR-safe, no FOUC:** the root layout reads a `theme` cookie and stamps `.dark` on `<html>`
    before paint (default light). **Toggle** is in the Clerk `UserButton` dropdown via
    `UserButton.Action` `onClick` — extracted to a client `UserMenu` island (onClick can't cross
    the server boundary) so `SiteHeader` stays a server component. **Print is forced light** by
    resetting the tokens under `@media print`. Full WCAG-AA audit + real-browser toggle/FOUC/print
    check are Keagan's (Sprint 32). Needs `npm run build` + push.

  - **Sprint 32 (Responsive & theme hardening — FINAL): COMPLETE — 95/100. The Tailwind migration
    (28–32) is CLOSED.** Code-auditable hardening: **dark-palette AA audit** — every text +
    focus/interactive pair passes AA (5.1–15.6:1; active-pill 8.5 via `--accent-fg`); dark borders
    are intentional subtle hairlines (the light theme's are ~1.1:1 too — not a regression, no
    change). **Hardcoded-colour audit → 3 fixes** that didn't theme: `.impossible-part` red text →
    `var(--err)`, a `.dark .skel` shimmer gradient, and the install-prompt subtitle (`dark:`
    override, light unchanged). Print confirmed forced-light; no-JS/offline document integrity
    intact (retained print classes). New guard test `tests/dark-theme.test.ts` locks light/dark to
    the same 17 tokens (a token added to `:root` but missed in `.dark` = a silent un-themed colour)
    + the print reset. **Device-bound → Keagan (same as Sprint 24):** real-phone Lighthouse,
    real-browser toggle/FOUC test, visual regression at 5 breakpoints × 2 themes.

- **Desktop-layout fix pass (2026-07-16, Keagan's direction): COMPLETE.** Three real
  defects: (1) **Sprint 30a REGRESSION — the plan-detail grid was mirrored.** The aside
  (DOM-first for the mobile hoist) had `lg:order-0`, so grid auto-placement put the IMAGE
  in the wide 1fr column and every table/step/paragraph in the 22rem rail. Fixed with
  `lg:order-1` (data left, image right, per Sprint 20); aside 22 → 24rem. (2) `.plan-grid`
  columns were VIEWPORT-keyed (2/3/4/5 steps) but the grid lives in containers of very
  different widths — the 52rem saved page got five ~9rem cards at 96rem viewport. Now
  `repeat(auto-fill, minmax(16rem, 1fr))` ≥40rem: container-driven, min card width
  guaranteed, mobile unchanged. (3) Widths/spacing: catalog `lg:max-w-none` (full-width),
  `.page-wide` 52 → 64rem, `.page-wide.plan-detail` 70 → 84rem, `page` shell gains
  `lg:px-[2.5rem]`, catalog rails 13/18rem + 2.5rem gaps, both loading skeletons matched
  to their pages' shells (a narrower skeleton makes the layout jump when data lands).
  **Plus a dev-only CSP fix:** the strict CSP blocks `eval()`, and `next dev`'s
  react-refresh runtime needs it — so in dev NOTHING hydrated (no filter auto-open, no
  tabs, no walker) and interactivity was being "tested" against dead JS. `'unsafe-eval'`
  is appended to `script-src` ONLY when `NODE_ENV !== 'production'`; the production
  header is byte-identical. All verified in a real browser against `npm run dev` at
  2134px. New utilities compiled against the real Tailwind v4 toolchain.

- **Mobile fix pass + dedicated build page (2026-07-16, Keagan's direction, same session):
  COMPLETE.** (1) **Mobile header**: the eight nav buttons overflowed past the header
  background on a phone — header is now `flex-wrap` (background grows with it) and the nav
  is ONE horizontally-scrollable row (`overflow-x-auto`, scrollbar hidden), brand
  `whitespace-nowrap`. (2) `btnBase` gains `whitespace-nowrap` — a label folding mid-phrase
  ("Log in" across two lines) reads broken; buttons drop to the next flex row instead.
  (3) **Install banner**: the two buttons are one flex group (`ml-auto`), so on wrap they
  move together. (4) **"Start building" is now a LINK to `/plans/[slug]/build`**
  (`DECISIONS_LOG.md` 2026-07-16) — a dedicated page hosting the StepWalker full-page (rail
  on desktop, dots on phone). The step markup is shared via `src/components/plan-steps.tsx`
  (renders on the plan page AND the build page — one copy, no drift). Contracts preserved:
  the plan page still carries every step in its document, hidden only after mount
  (`instructions-disclosure.tsx` now renders a server-side Link — works no-JS, unlike the
  old dead button; print force-shows the region and hides `.instructions-open` by class);
  the build page is public via `/plans(.*)`, added to BOTH offline paths (save pre-cache in
  `service-worker.tsx` + the library download in `offline-urls.ts`, cross-check test
  updated); NO ViewLogger on it (Sprint 19: the plan page already logged the view —
  double-counting would corrupt Trending). Verified in-browser at desktop + ~835px;
  real-phone pass is Keagan's.

- **Header/nav overhaul + install relocation + perf quick wins (2026-07-16, Keagan's
  direction, same session): COMPLETE.** (1) **Navbar redesign**: desktop nav is quiet
  text links (muted → ink on hover) with ONE primary CTA (Sign up) and a hairline
  divider before the signed-in links — replacing the row of eight identical outlined
  buttons. Below `lg`, a **hamburger opens a drawer** (`mobile-nav.tsx` — a native
  `<details>`, same no-JS pattern as FilterDisclosure; the links are server-rendered
  children passed through the client island; `usePathname` closes it on navigation
  since the header persists across client-side routing). The header carries `relative`
  ON PURPOSE — the drawer panel positions against it (`absolute top-full`). (2) **The
  catalog install BANNER is deleted.** Install lives in the profile dropdown
  (`user-menu.tsx`, next to the theme toggle) and the mobile drawer (signed-out users'
  affordance). `beforeinstallprompt` is captured app-wide from the root layout
  (`InstallCapture` → module store in `src/lib/install-store.ts`, read via
  `useSyncExternalStore`) — the old catalog-only listener missed every deep link.
  Items render ONLY while the browser actually offers installability; no nag state
  needed (a menu item interrupts nothing). `tests/install-prompt.test.tsx` updated.
  (3) **Perf**: catalog's `queryPlans` + `listSavedPlans` + `getOwnedToolSlugs` now
  run in ONE `Promise.all` (were three serial awaits — two wasted DB round-trips per
  signed-in render; `getCurrentUser` is `cache()`d so no duplicate Clerk calls), and
  the root layout emits a **preconnect to Clerk's frontend API** (origin DERIVED from
  the publishable key's base64 host segment, fail-soft — clerk.browser.js is the
  biggest third-party fetch on every page). Bigger levers (function-region co-location
  with Neon, caching public content, Lighthouse on prod) recorded in the chat summary —
  they need vendor dashboards or launch-scale decisions, not code.

- **Full-app audit + fix pass (2026-07-19, Keagan's direction): COMPLETE.** Audit found
  7 defects; 5 fixed this pass, 2 deferred as decisions. **(1) Review photo uploads were
  capped at 1 MB silently** — Next's default `serverActions.bodySizeLimit` rejects the
  body BEFORE the action runs, so `MAX_UPLOAD_BYTES` (8 MB) was unreachable dead code and
  most phone photos failed with a framework error. Now: `bodySizeLimit: '4mb'`
  (next.config.ts — Vercel's platform caps ~4.5 MB, so higher just moves the failure),
  `MAX_UPLOAD_BYTES` 8 → 4 MB to match, and a **client downscale island**
  (`photo-input.tsx` + pure math in `src/lib/client-image.ts`) re-encodes big photos to
  the stored 1600px edge before submit — fails soft per file, no-JS degrades to the plain
  input, server pipeline untouched. Residual: a multi-photo submission totalling >4 MB
  still dies at the platform edge; the downscale makes that rare, not impossible.
  **(2) The no-throw rule stopped one layer above the data layer** — `savePlan`/'Plan not
  found', `upsertReview`'s throws, and `requireUser()` for an EXPIRED session all escaped
  actions as HTTP 500s (the plan page is public, so middleware never saw the POST). Now
  every lib call goes through **`guardAction()`** (`src/lib/action-guard.ts`):
  `unstable_rethrow` passes framework signals, a named `UnauthorizedError` (auth.ts,
  matched by NAME to keep the guard off the Clerk/Prisma import chain) → sign-in with a
  return URL, everything else → logged silent bounce via the SAME `bounceTarget()`; a
  refused photo carries `?notice=upload-failed` (`UploadFailedNotice`, plan page) — the
  one data-layer failure a real person can reach. The view beacon swallows-and-logs (no
  redirect — it's a background effect). **(3) The offline download was half-broken since
  Sprint 22:** it cached `/shopping-list?collection=` (a param the page STOPPED READING —
  N dead copies) and missed `?view=by-plan` and the `/saved?collection=` tabs — the SW
  matches EXACT URLs, so every offline-tappable view needs its own entry
  (offline-urls.ts). **(4)** `/dev` added to `NEVER_CACHE_PREFIXES` (the "every private
  route" rule). **(5)** `R2_PUBLIC_HOST` added to the env schema + a build-time WARNING
  in check-db-urls.mjs (unset at Vercel build time = every plan image silently blocked —
  the two-gates failure shape); also `.design-sync/**` eslint-ignored (a tracked design
  export was failing `eslint .` — the Prototype-Wireframe/CI-red shape again). Zero new
  dependencies. **Deferred to Keagan:** theme toggle for signed-out visitors (placement
  is a design call — today dark mode is signed-in only), and `PlanView` retention
  (pruning breaks the all-time Most Viewed sort — needs a rollup design, not a quick
  fix); `git rm src/components/save-button.tsx` still pending from QOL-B. Gate run in a
  /tmp clone (HEAD + the uncommitted working tree reproduced): **724 tests green
  (63 files), `tsc` clean, `eslint` clean.** Needs `npm run build` + a browser pass
  (post a review with a large phone photo; toggle the shopping-list views offline) + push.

- **🛑 THE CATALOG NOW LIVES AT `/browse`, NOT `/` (QOL-M, 2026-07-20).** `/` is the
  marketing LANDING page. `src/lib/routes.ts` `CATALOG_PATH` is the single seam — read it,
  do not hardcode `/browse`. Historical §7 entries below that say "catalog at `/`" (Sprint 3,
  18–20, etc.) are ACCURATE FOR THEIR SPRINT but superseded on this point. **Anything that
  means "revalidate/point-at the catalog" must use `CATALOG_PATH`/`/browse`, not `/`** — the
  hardening pass below fixed eight `revalidatePath('/')` calls that missed this.

- **Phases QOL-H → QOL-M + hardening + carousel fix: COMPLETE, PUSHED, CI green
  (2026-07-20).** The whole `QOL_UI_BUILD_PLAN.md` (A→M) is now closed; details per phase
  are in that file's headers and `SPRINT_LOG.md` (2026-07-20 consolidated entry).
  - **QOL-H/I:** a shared soft-GET-form hook — sort + filters auto-apply via
    `router.push(url,{scroll:false})` with Apply/duplicate-Clear hidden when JS is on (no-JS
    paths intact); configurable page size threaded through `queryPlans`/`buildQueryString`.
  - **QOL-J:** compact desktop header search (any page) + nav regrouped beside the logo;
    `CATALOG_PATH` constant introduced here.
  - **QOL-K:** About/FAQ/Profile/Learning widened to page-wide; body is a `min-h-screen`
    flex column so the footer pins to the viewport bottom on short pages.
  - **QOL-L:** `/profile` folded into **our own** native-`<dialog>` account modal
    (`account-modal.tsx` + `account-menu.tsx`), NOT Clerk's `UserProfilePage` (client-only,
    can't host our server-action form — decision 2026-07-20). Private `GET /api/workshop`
    feeds it; `saveWorkshopModalAction` returns a result (no redirect out of the modal);
    `/profile` stays as the no-JS fallback. Same no-`userId` security posture.
  - **QOL-M:** landing at `/` (Fraunces headings via `next/font`; real Trending featured
    carousel; hero showcases a real plan's cut list + real board count; one primary CTA →
    `/browse`), catalog at `/browse`. Placeholder brand name (branding #8 still open).
  - **Hardening pass:** fixed the `revalidatePath('/')`→`/browse` regression (see the rule
    above); landing marquee loop-duplicates are `inert` + `aria-hidden` (new `PlanCard
    decorative` prop) so they're not a second tab stop / SR echo; decorative SVGs hidden.
  - **Carousel seam fix:** narrow marquees (trust, category) repeat enough copies
    (`MARQUEE_COPIES`) that a full screen sits behind the loop point — 2 copies left a
    visible gap that "jerked" on reset; featured uses `PLAN_MARQUEE_COPIES`; `--speed` scales
    with copy count. Category scrolls opposite (`reverse`) to featured. **The reverse only
    works as an unlayered `.landing-marquee-reverse` rule** — the unlayered
    `.landing-marquee-track { animation: … }` shorthand resets `animation-direction` and beats
    a layered Tailwind `[animation-direction:reverse]` utility (the standing "unlayered wins" trap).
  - **Mockup-fidelity rebuild (2026-07-20):** Keagan flagged the first Step-2 landing as
    "boring" vs. the approved mockup — it had dropped the depth panels, the **board-buying-plan
    bars**, and the "what a plan looks like" section. Rebuilt to match, still real-data-only:
    new **`src/components/landing-plan-panel.tsx`** (cut list + real `BoardBar`/`optimize()`
    board plan + tool chips) used in the hero (rotated) and a restored "what a plan looks like"
    section (panel + explainer list); depth tokens **`--card-bg` + `--bevel`** added to BOTH
    themes (dark-theme guard); `.landing-panel`/`.landing-hatch`/`.landing-band-inset`/
    `.landing-timeline` connector. The hero/detail panels only use plans whose optimizer result
    is CLEAN (no impossible part), so every bar + "buy N boards" count is honest. Verified on the
    live deploy (5 panels, 6 board bars, all sections). See `SPRINT_LOG.md` for the file table.

- **Phase QOL-G (part-diagram PILOT): COMPLETE — 96/100. ⏸ AWAITING KEAGAN'S VERDICT**
  (2026-07-19). A generic SVG renderer computed from each plan's existing `cutList`
  (`src/lib/part-diagram.ts` = pure layout, `part-diagram.tsx` = the SVG), piloted on 5
  plans at **`/dev/diagrams`** — **dev-only, not wired into any live page**. Two
  independent gates, both tested: `NODE_ENV === 'production'` → `notFound()` **before any
  query**, and `/dev` is off the `PUBLIC_ROUTES` allowlist. **🔴 THE PILOT'S ANSWER: do
  NOT roll out catalog-wide.** (1) Per-step highlighting **cannot be automatic** —
  nothing in the schema links a step to a cut-list ROW, and the vocabularies differ
  (`Pine` vs `Pine boards, 1x10 (3/4" x 9-1/4" actual)`); bridging them means guessing,
  and a wrongly-highlighted part is the Sprint 21 trust bug. It needs a **`StepPart` join
  + a content pass over 85 plans**. (2) Value scales with part-size SPREAD — only 2 of the
  5 pilot plans earn it; the cutting board's six identical strips gain nothing. (3) It
  partly duplicates `/plans/[slug]/boards`, which already draws to-scale bars AND answers
  "what do I buy". **The question people actually want is "how do these go together" — an
  assembly view, which needs geometry the schema does not have.** Cheapest useful subset
  if kept: diagram only on plans with ≥4 rows and a ≥3× longest/shortest spread.
  **Deliberately NOT merged with `cut-optimizer.ts`** (that one's output is a buying
  number; this one's is a picture). 680 tests green, `tsc`/`eslint` clean. Needs
  `npm run dev` → `/dev/diagrams` and a decision: keep narrow, open a `StepPart` sprint,
  or drop.

- **Phase QOL-F step 2 (visual/motion ROLLOUT, variant A): COMPLETE — 96/100** (2026-07-19,
  `DECISIONS_LOG.md`). Keagan chose **A** (CSS-only lift + shadow) over B (pointer tilt,
  which needed a client island on the catalog grid); B's press feedback was kept.
  Shipped: `--elev-1/2/3` tokens in **both** themes → `shadow-e1/e2/e3` utilities; card
  resting elevation + 4px hover lift (`plan-card.tsx`); press settle on **every** button
  (`btnPress` in `btnBase`) with **only `btnPrimary` elevated**; the save toggle pops on
  press; a catalog hero (`.hero-wash`, CSS gradient, no art); and a bounded card
  settle-in replacing the skeleton jump. **🛑 THREE TRAPS, all caught in construction and
  all worth remembering:** (1) **two `shadow-*` utilities on one element do NOT compose** —
  they share `--tw-shadow` and the second silently replaces the first, so each `--elev-*`
  carries the COMPLETE value including dark mode's inset edge highlight; (2) **Tailwind v4
  emits `translate`/`scale` as their own properties**, so `transition-[transform,…]`
  animates nothing — every transition names `translate`/`scale`; (3) **the settle-in's
  `animation-fill-mode: both` holds cards at `opacity: 0`**, so print and reduced-motion
  MUST set `animation: none` or the whole catalog grid renders blank — both escapes exist
  and are tested. Also: `:active` not `:hover` for press (Tailwind gates `hover:` behind
  `@media (hover:hover)`, so hover-based feedback does nothing on a phone); dark elevation
  is its OWN set (a shadow doesn't register on a near-black surface); shadows are
  warm-tinted, not grey. **Deviation:** the mockup's tab-underline slide was NOT built —
  the live tabs are folder tabs, so an underline would be a redesign, not a motion pass;
  they got a colour transition. Print kills every shadow (a shadow is ink). 662 tests
  green, `tsc`/`eslint` clean. Needs `npm run build` + a browser pass (**dark mode + print
  preview especially**) + push.

- **Phase QOL-F step 1 (visual/motion MOCKUP): DELIVERED → variant A CHOSEN** (2026-07-19).
  `mockups/qol-f/modern-saas-depth.html` — self-contained, **outside `src/`**, so it is not
  a route, not in the build, not linted, and **nothing in the live app was touched** (suite
  re-run to prove it: 650 green, `tsc`/`eslint` clean). Covers the three things QOL-F asked
  for: hero, card depth/hover, micro-animations. **Colours are existing tokens only; the
  SHADOWS are the proposal** — the app is flat today, so depth means a new elevation scale
  (three levels, warm-tinted not grey, layered contact+ambient; dark mode gets its own set
  because shadows don't register there — elevation comes from a lighter surface + a hairline
  top edge). **THE DECISION IS A vs B, and it's architectural:** A = 4px lift + shadow, pure
  CSS, cards stay server components; B = pointer-tracked tilt + image parallax, which needs
  a **client island around the catalog grid** and does nothing on touch. **Recommended: A,
  keeping B's press feedback.** Three micro-animations only (press settle, save pop, tab
  underline) + a card settle-in replacing the skeleton jump; page transitions, scroll
  parallax, and any motion on print/step-walker explicitly excluded. Not scored — a mockup
  has nothing to test and no attack surface. **Keagan picked A; the rollout shipped the
  same day (entry above). The mockup file now carries a superseded banner naming the three
  places the shipped code deliberately differs from it.**

- **Phase QOL-E (Learning paths — rename + taxonomy): COMPLETE — 96/100** (2026-07-19,
  `QOL_UI_BUILD_PLAN.md`; **decisions in `DECISIONS_LOG.md` 2026-07-19**). The first
  schema change since Sprint 25. (1) **"Paths" → "Learning" in nav/headings, URL STAYS
  `/paths`** — renaming the route would rewrite every saved library's offline list
  (`offline-urls.ts`), invalidate service-worker entries already on real devices, and
  break existing links, for a label. (2) **`Path.experienceLevel Int?` + `Path.categoryId
  String?`** (migration `20260719120000_add_path_taxonomy`). `experienceLevel` **reuses
  the 1–5 `Plan.difficulty` scale and `difficultyLabel()`** (Keagan's call over a separate
  3-value enum — one meaning for "Intermediate" sitewide). `category` is nullable and
  **`null` is an AUTHORED value** meaning "spans several categories" → rendered "Mixed
  categories"; `load.ts` rejects an unknown slug so a typo can't impersonate it. FK is
  **`ON DELETE SET NULL`** — deleting a category must not delete authored paths.
  (3) `/paths` rebuilt: grouped by level, GET-form filters, URL-driven; ONE
  `listPaths(filters)` serves filtered + unfiltered (Sprint 3 rule; a test asserts the
  filtered query still carries `published: true`). Card titles h2 → h3 (level heading is
  now the h2); the two `globals.css` selectors followed. **🛑 BOTH COLUMNS ARE NULLABLE ON
  PURPOSE — the Sprint 4 trap:** a migration creates a column, the SEED populates it, and
  content does not deploy. `NOT NULL DEFAULT 1` would have made every path silently claim
  "Beginner"; instead untagged paths group under **"Not yet rated"** until a seed runs.
  **No new path content authored** (Keagan's call) — the 5 existing paths were tagged.
  650 tests green, `tsc`/`eslint`/`prisma generate` clean. **⚠️ The migration SQL has NOT
  been run against a real Postgres** (none in the sandbox) — plain nullable ADD COLUMNs,
  but unverified. Needs `npm run db:migrate` → **`npm run db:seed`** → `npm run build` →
  browser pass → push. *If a path shows under "Not yet rated", the seed didn't run.*

- **Phase QOL-D (Navigation & profile/settings): COMPLETE — 95/100** (2026-07-19,
  `QOL_UI_BUILD_PLAN.md`; **decisions in `DECISIONS_LOG.md` 2026-07-19** — item 1 was an
  IA call and was put to Keagan with three options before any code). (1) **Categories now
  have a "Browse" menu in the site nav** — a `<details>` panel on desktop, a collapsible
  section in the mobile drawer, both linking to the existing `?category=` catalog (no new
  route, no new query path); the Sprint 18 catalog rail is untouched. (2) **New shared
  `SiteFooter`** in the root layout (categories + site links + copyright), `.site-footer`
  added to BOTH print blocks. (3) **`🧰 Workshop` REMOVED from the header** (Keagan: a
  tool list you set once is settings, not a destination) — the form moved into
  `/profile#workshop` as `WorkshopForm`; `/workshop` is now a four-line redirect (kept, so
  bookmarks and the plan page's "Update your workshop" prompt don't break) and stays
  PRIVATE + on the offline denylist; `saveWorkshopAction`'s three targets all follow the
  form to `/profile`. **🛑 THE LOAD-BEARING DECISION: `NAV_CATEGORIES` is a BUILD-TIME
  CONSTANT read from `content/categories.json` (the seed's own source of truth), NOT a
  `listCategories()` query** — the header/footer render in the root layout on every page,
  so a Prisma call there would put a DB round-trip on `/faq`, make an outage break the 404
  and offline pages, and **need a reachable database at BUILD time for the prerendered
  `/_not-found`** (the same failure shape that kept CI red for ten commits). A test asserts
  the constant equals the content file exactly, in `sortOrder`. **Two traps caught in
  build:** `MobileNav` closed on ANY click inside the drawer, so opening the nested Browse
  section would have shut the whole drawer (now ignores clicks on a `<summary>`); and the
  footer's `<h2>`s needed `!` overrides because the global `h2` in `globals.css` is
  UNLAYERED and beats layered utilities (the Sprint 30a `.catalog-nav-heading` trap). No
  sitemap / no `robots` change — still blocked on branding #8. 629 tests green,
  `tsc`/`eslint` clean. Needs `npm run build` + a drawer/menu browser pass + push.

- **Phase QOL-C (FAQ accordion): COMPLETE — 97/100** (2026-07-19,
  `QOL_UI_BUILD_PLAN.md`). `/faq`'s `<dl>` became eight native `<details>`/`<summary>`
  accordions — same no-JS disclosure pattern as everywhere else in this codebase. **The
  `<dl>` could not be kept**: a `<dl>` may only contain `dt`/`dd`, so the answer would
  have had to sit inside the `<dt>` to be inside the disclosure; `<summary>` gives a
  stronger Q→A link anyway (a disclosure whose expanded content IS the answer), and the
  questions were never headings so no heading level was lost. **The height animation
  (`::details-content` + `interpolate-size`) is allowed to fail** — unlike
  `filter-disclosure.tsx`, where that same too-new feature would have broken the FEATURE,
  here a non-supporting browser just snaps open; the closed state comes from `<details>`
  itself (tested: no `hidden` attribute anywhere), and the chevron's transform transition
  works everywhere. Both animations off under `prefers-reduced-motion`. `.faq`/`.faq-item`
  + their `dt`/`dd` rules **deleted** from `globals.css` (verified no orphans, braces
  balanced). No copy changed; `robots: noindex` intact. Known + accepted: printing `/faq`
  now yields the questions only. 615 tests green, `tsc`/`eslint` clean. Needs
  `npm run build` + push.

- **Phase QOL-B (Plan-detail page reorg): COMPLETE — 95/100** (2026-07-19,
  `QOL_UI_BUILD_PLAN.md`). Six items, UI only — no schema, no route, no server-action or
  data-layer change. (1) **"Start building" is now the page's one primary CTA** in the
  action row; **additive** — the lower link and the full server-rendered instructions
  section are untouched, because they are the no-JS/print/offline path (Sprint 20
  contract), and a test asserts BOTH build links survive. (2) The plan page uses the
  **same bookmark `SaveToggle` as the catalog cards** (top-right of the title block, via
  a flex row — not absolute positioning, which collides with a long title on a phone);
  `save-button.tsx` is now dead and **must be `git rm`'d** (the sandbox mount cannot
  delete). `LikeButton` reads as a counter (icon + number in a pill) with the full "3
  likes" kept in `aria-label`/`title`. (3) Print + shopping list moved into a **`<details>`
  "…" overflow menu** (`overflow-menu.tsx`) — no client component, so no JS needed;
  Board plan stays in the row. (4) **The Cut List tab now draws the board layout inline**
  (`inline-board-plan.tsx`) — it calls the SAME `optimize()`/`totalBoards()` as `/boards`
  and renders the SAME extracted `BoardBar`; **impossible parts suppress the headline
  count entirely** and route to `/boards` (optimizer rule 4); `/boards` remains the only
  place to change stock length/width/kerf. (5) **Board-feet rows get a worked example**
  (`isBoardFeetUnit`/`boardFeetExample` — "≈ about 11 ft of 3/4″ × 6″ board") plus a
  definition footnote, shown only when a plan actually uses the unit. (6) **Star-rating
  input that IS the radio group** — radios `visually-hidden` (clipped, focusable,
  submitted), each star is that radio's `<label>`, so it works with no JS; **the radios
  run 5→1 in the DOM with `flex-row-reverse`** because CSS has no preceding-sibling
  selector and `peer-checked:` compiles to `:where(.peer):checked ~ &` — flip either half
  and it fills the wrong stars. 608 tests green, `tsc`/`eslint` clean. **Flagged, NOT
  fixed (pre-existing, out of scope): `submitReviewAction` THROWS on a missing `rating`
  (`requiredString`), and an uncaught throw out of a server action is an HTTP 500 — a
  crafted POST 500s that endpoint today.** Needs `git rm src/components/save-button.tsx`
  + `npm run build` + a browser pass (the star input's native "required" prompt first) +
  push.

- **Phase QOL-A (Catalog filter & sort UX): COMPLETE — 95/100** (2026-07-19,
  `QOL_UI_BUILD_PLAN.md`). Mobile-only UX pass; **desktop ≥64rem unchanged by
  construction** — every added class below `lg` has an `lg:` counterpart restoring the old
  value, verified by compiling the class lists with the real Tailwind v4.3.2 toolchain
  (source order included). (1) `FilterDisclosure` is now an **off-canvas drawer below
  `lg`** — same `<details>` mechanism as `MobileNav`, so it opens/closes with no JS — with
  a compact pill trigger (36px) replacing the 44px full-width bar; the scrim and ✕ render
  **only after mount** (a scrim on a no-JS page would cover the trigger used to close the
  drawer). (2) `compactOnMobile` in `src/lib/ui.ts` shrinks the sort **Apply** trigger
  below `lg` only — **`btnBase` is untouched** (~80 call sites; 44px stays right for
  actions on a plan). (3) Sort **auto-submits on POINTER/TOUCH changes only** — `change`
  fires on every ↑/↓ in a focused closed `<select>` in several browsers, so a blanket
  auto-submit strands keyboard users on option two; the **Apply button stays** as the
  keyboard commit AND the whole no-JS path (`sort-select-control.tsx` is a tiny client
  island so the form itself stays server-rendered). (4) The `(N/5)` difficulty numeral is
  gone from the plan page **and the print sheet** — the label alone, matching
  `plan-card.tsx`. **Two things to remember:** the print block's `.filters` rule had been
  **orphaned since Sprint 30b** (class dropped in the Tailwind conversion) so the filter
  form was printing — class restored + tested, the same failure Sprint 30c hit three
  times; and **an active filter no longer auto-opens the panel** (as a drawer that parks
  an overlay over the results on every Apply — the count is in the trigger and FilterChips
  lists them above the results instead). 575 tests green, `tsc`/`eslint` clean. Needs
  `npm run build` + a real-phone drawer pass + push.

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

**THE SAME BUG WAS SITTING ONE LINE BELOW THE LIMITER, IN FOUR FILES — fixed
2026-07-19.** `likes.ts`, `saves.ts`, `shopping-list.ts` and `reviews.ts` each declared a
private `requiredString()` that **threw** on a missing field. So the limiter no-throw fix
landed, and directly beneath it a POST omitting `planId` (or `rating`, `collectionId`,
`reviewId`, `photoId`) still produced an HTTP 500 on a public endpoint. The rule was
applied to the caller that caused the incident and to nothing else.

Now: one shared `src/lib/form-fields.ts` (`formString`, `formInt`) returning **`null`,
never throwing**, and every action bails with `redirect(bounceTarget(...))`. Two
notes that matter:

- **`formInt` requires BOUNDS.** `Number.parseInt` reads `"5abc"` as `5` and `"1e9"` as
  `1`, and nothing downstream re-validated the rating — while catalog ratings are
  **computed on read** from those rows, so one junk value silently poisons every average.
- **Only the missing-RATING bail carries a notice** (`?notice=rating-required`,
  `RatingRequiredNotice`). A real person can reach it (the star input is
  `visually-hidden` radios; a browser that failed to enforce `required` submits empty).
  Missing structural ids bounce **silently** — only a hand-built request can omit them,
  and it learns nothing from our field names.
- **Two existing tests had to be rewritten because they asserted the throw and passed** —
  the exact trap this section already warned about, made again in the file whose own
  header describes it. Assert the behaviour the APP needs.

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

**For the original 24 plans, the tag content is `scripts/apply-step-tags.mjs`** (Keagan's
delivery choice, `DECISIONS_LOG.md` 2026-07-14). Its TAGS table was the content for those
24; it is idempotent, rewrites only each plan's `steps` array, and throws on any non-subset
tag. **⚠️ CORRECTED 2026-07-16:** the 61 plans added later carry their per-step tags
**inline in their JSON**, which is the single source of truth for them. `apply-step-tags.mjs`
now **skips any slug not in TAGS** — without that guard a re-run rebuilt each step from the
(empty) TAGS entry and silently STRIPPED every inline tag from all 61 new plans. So:
**editing an ORIGINAL-24 plan's tags = edit that script + re-run + re-seed; editing any
other plan's tags = edit its JSON directly + re-seed.** Like all content, tags do NOT reach
production on deploy — production needs a seed (`DEPLOYMENT.md`).

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
