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

**One sprint at a time, in `BUILD_PLAN.md` §4 order.** No Phase 2–4 work. No
features that aren't in `BUSINESS_PLAN.md` — the previously-discussed-but-not-
approved ideas (comments, tool substitution notes, owned-tools profile, lumber
price sync, plan versioning, offline shopping mode) are **out of scope** until
Keagan adds them to the business plan himself. Flag scope creep in one line.

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
- **Next up:** Sprint 7 — Liking. Not blocked.

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
