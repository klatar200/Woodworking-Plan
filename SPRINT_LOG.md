# Sprint Log

Every sprint's outcome, in order. Use one entry per sprint, including
every remediation attempt, per `BUILD_PLAN.md` §7. No sprint entry is
complete without its full scorecard breakdown.

Entry template:

```
## Sprint N: <name>
**Dates:** <start> – <end>
**Scope (from BUILD_PLAN.md §4):** <deliverables actually attempted>
**PR(s):** <link(s)>

### Attempt 1
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | | |
| Correctness & functionality (/20) | | |
| Automated test coverage (/15) | | |
| Security (/15) | | |
| Code quality & simplicity (/10) | | |
| Mobile/offline behavior (/10) | | |
| Documentation & handoff (/5) | | |
| **Total (/100)** | | |

**Result:** Pass (≥95) / Fail — remediation needed
**If fail:** what's wrong, what was fixed, then re-score as Attempt 2.

### Attempt 2 (only if Attempt 1 failed)
...

### Final outcome
Score: __ /100 — Pass / Escalated to user after 3 attempts (see notes).
```

---

## Sprint 0: Environment & Architecture
**Dates:** 2026-07-12
**Scope (from BUILD_PLAN.md §4):** Next.js (TypeScript) repo structure covering
frontend and API routes; Neon Postgres provisioned on its free tier; Clerk
configured on its free tier; CI pipeline (lint/typecheck/test on every push);
local dev environment; deployment pipeline to Vercel's free Hobby tier (deploy a
"hello world" end to end); environment/secrets management; confirm every service
is a genuine free tier.

**Commits on `main`:** `74fe210`, `4b144b3`, `196025e`, `a49d987`, `ee925de`.

**Status: COMPLETE — 99/100 on Attempt 2.**

### Decisions escalated during this sprint
- **Vercel Hobby prohibits commercial use.** Found during the required free-tier
  re-verification. Escalated *before* any code was written; answered and logged in
  `DECISIONS_LOG.md` with a binding hard gate: no billing, ads, or public launch
  on Hobby.
- **Trunk-based branching** (straight to `main`, no PRs) — user instruction,
  logged, and `BUILD_PLAN.md` §5 amended accordingly.
- Free-tier re-verification also found Clerk's free allowance rose 10k → 50k users
  (Feb 2026) and Neon's is unchanged and still perpetual. No costs incurred; no
  card entered anywhere.

### Attempt 1 — score 80/100 — FAIL, escalated (not looped)

Code-complete, but three §4 deliverables (Neon provisioned, Clerk configured,
hello-world deployed) were blocked on vendor accounts only the user can create,
and `next build` could not run in the build agent's sandbox (Next's SWC binary
crashes with SIGBUS on `require()` alone — an environment limit, not a defect).

| Category | Score | Note |
|---|---|---|
| Requirements fidelity (/25) | 19 | 3 of 7 deliverables blocked on user-only actions |
| Correctness & functionality (/20) | 12 | No live deploy; build unverifiable locally |
| Automated test coverage (/15) | 14 | 25 tests, none tautological; nothing proved the build compiles |
| Security (/15) | 15 | Secrets, leak-scrubbing, CI least-privilege, Vercel ToS flagged |
| Code quality & simplicity (/10) | 10 | Reverted an unnecessary Prisma workaround once the true root cause was found |
| Mobile/offline behavior (/10) | 6 | Mobile-first CSS/viewport correct, but unverified — no runnable dev server |
| Documentation & handoff (/5) | 4 | Docs complete; no commit existed yet |
| **Total** | **80** | |

Per `BUILD_PLAN.md` §7.4, the sprint was **escalated after one attempt rather than
looped**: every lost point required either the user's vendor accounts or an
environment where SWC runs. Re-scoring the same work twice more would have changed
nothing and burned the remediation budget for show.

### Attempt 2 — score 99/100 — PASS

Blockers cleared. Neon, Clerk, and Vercel provisioned on free tiers; app deployed.
Live production `/api/health` returns:

```json
{"status":"ok","services":{"database":{"status":"ok","latencyMs":303},
"clerk":{"configured":true}},"timestamp":"2026-07-12T23:56:20.551Z"}
```

That is the end-to-end proof Sprint 0 required: Vercel → Next.js API route → Neon
Postgres, live, with Clerk configured.

**Four real defects surfaced between attempts — every one invisible to local
tests, all caught only by deploying:**

| Defect | Root cause | Fix |
|---|---|---|
| Vercel: "No Next.js version detected" | A git index/lock recovery deleted the untracked working-tree files; the first commit contained docs only — no `package.json`, no `src/` | Restored all 18 source files (`4b144b3`) |
| Vercel: `npm ci` EUSAGE, ~100 missing deps | `package-lock.json` was generated in a broken environment and omitted every platform-specific optional binary (esbuild/rollup/sharp/unrs) | Regenerated the lockfile from scratch (`a49d987`) |
| Local build: "@prisma/client did not initialize yet" | Prisma's client is generated code; a fresh `node_modules` has none until `prisma generate` runs — easy to forget, and the build agent did forget it in a handoff | Added `"postinstall": "prisma generate"` so it can never be forgotten in any environment (`ee925de`) |
| 3 moderate npm vulnerabilities | `postcss <8.5.10`, XSS via unescaped `</style>` (CVE-2026-41305), pinned transitively by Next.js | `overrides: { postcss: "^8.5.10" }` → `npm audit` = 0 vulnerabilities |

| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | **25** | Every §4 Sprint 0 bullet complete: repo structure (App Router, frontend + `/api/health`); **Neon provisioned**; **Clerk configured**; CI (lint/typecheck/test/build on every push); local dev env; **hello-world deployed end to end on Vercel Hobby**; env/secrets management; free-tier confirmation (which surfaced the Vercel issue). Nothing out of scope: `schema.prisma` still has **zero models** (Sprint 1 owns the plan schema); Clerk protects **no route** and has no auth UI (Sprint 2 owns auth). |
| Correctness & functionality (/20) | **20** | Golden path driven for real: `npm ci` → `postinstall` → `next build` all pass; deployed URL serves the status page; live `/api/health` returns HTTP 200, `database.status: "ok"`, 303 ms Neon latency (cold start). Locally: `tsc --noEmit` 0 errors, `eslint .` 0 errors/0 warnings, `vitest run` 25/25. |
| Automated test coverage (/15) | **15** | `tests/env.test.ts` (13): prod boot fails loudly naming *every* missing secret; rejects non-postgres `DATABASE_URL`; rejects a `pk_` key pasted into `CLERK_SECRET_KEY`; proves a *half*-configured Clerk does not count as configured. `tests/health.test.ts` (8): all three `/api/health` states (200 not_configured, 200 ok, 503 degraded) + no connection-string leak on driver error. `tests/page.test.ts` (4): drives the status page component through the same states + secret-leak assertion. The build is exercised on every push by CI and Vercel. |
| Security (/15) | **15** | (a) **Secrets**: `.env*` gitignored except `.env.example`; no real value committed; `.env.local` confirmed absent from `git status`. (b) **Leakage**: the Neon connection string embeds the DB password, so `checkDatabase()` logs the raw driver error server-side and returns a fixed safe string — two tests assert the password and host never appear in any response. (c) **Boundary**: `CLERK_SECRET_KEY` server-only; `NEXT_PUBLIC_` documented as the entire client/server perimeter. (d) **CI**: `permissions: contents: read`, and given **no secrets** on purpose, so the build can never come to depend on one. (e) Baseline security headers. (f) **CVE fixed** — postcss override, audit clean. (g) Vercel's commercial-use restriction escalated, not silently shipped into. |
| Code quality & simplicity (/10) | **10** | Real simplification pass: an early fix for a type error added a custom Prisma generator `output` plus gitignore and eslint-ignore entries, on the theory Prisma 6.19 had dropped its type declarations. The actual cause was a **corrupted `@prisma/client` from an interrupted install** (0 `.d.ts` files present). Once found, all three pieces of that workaround were **reverted** rather than kept as cargo cult. |
| Mobile/offline behavior (/10) | **9** | Mobile-first from the first commit, not retrofitted: `viewport` export (`width=device-width`, `viewport-fit=cover`), CSS sized for a phone and widened only at larger breakpoints, `env(safe-area-inset-bottom)`, `prefers-color-scheme`. Deployed page renders correctly. −1: not confirmed on a physical handset. PWA/service-worker/offline caching correctly **absent** — Sprint 8. |
| Documentation & handoff (/5) | **5** | `DEPLOYMENT.md` rewritten as a click-by-click provisioning guide with a troubleshooting table; `DECISIONS_LOG.md` carries the Vercel gate, trunk-based decision, and free-tier re-verification; `CLAUDE.md` added as the working agreement; every file comments what is deliberately *not* built and which sprint owns it. |
| **Total (/100)** | **99** | |

### Final outcome
**Score: 99/100 — PASS.** (Attempt 1: 80, escalated. Attempt 2: 99, after
provisioning and four real defect fixes.)

**Lesson carried into `BUILD_PLAN.md` §5:** all four Attempt-2 defects were
invisible to local typecheck, lint, and a green 25-test suite. Green tests are not
proof it works. **Deploy early in every sprint.**

### Known follow-ups from Sprint 0 (not blocking)
- Delete stale merged branches in GitHub (`claude/*`) — user action, no tool exposes it.
- `BUILD_PLAN.md` §3 decision #5 still says Clerk's free tier is 10k MAU; it is 50k.
- Prisma 6.19 → 7.8 available. Deliberately **not** taken — a major bump is not a
  Sprint 0 deliverable. Backlog.

---

## Sprint 1: Plan Data Model & Content Pipeline
**Dates:** 2026-07-12
**Scope (from BUILD_PLAN.md §4):** schema for a plan (title, category, difficulty
1-5, tools required, materials required, time estimate, cost tier $-$$$$$,
itemized cost range, instructions, images); seed-content ingestion path
sufficient to load ~20 real test plans for development.

**Commits on `main`:** `5162f17`, `bfdcb8b`, `b5bd067`, `e821192`, `9082499`.

**Status: COMPLETE — 98/100, Attempt 1. Pass.**

**Category 6 (Mobile/offline) redistributed into Category 2 (Correctness),** per
`BUILD_PLAN.md` §6: Sprint 1 is a pure data/backend sprint with no UI surface.
The Sprint 0 status page is unchanged; browse and detail views are Sprint 3.
Category 2 is therefore scored out of 30.

### Decisions
- **Decision #7 (plan-content admin/CMS) resolved** before the sprint started:
  version-controlled seed files + idempotent seed script now; custom admin panel
  deferred (not cancelled); headless CMS rejected. Logged in `DECISIONS_LOG.md`.
- **Content is originally authored by the build agent**, not transcribed from Ana
  White or any existing creator. Licensing third-party plan content remains a
  legal/money decision for the user (`BUSINESS_PLAN.md` §6) and was not touched.

### What was delivered

| Piece | Detail |
|---|---|
| Schema | `Plan`, `Category`, `Tool`, `PlanTool`, `Material`, `CutListItem`, `Step`, `Image` + `CostTier` enum. Migration `0_init` committed. |
| Content pipeline | `content/plans/*.json` → zod validation (`src/content/plan-schema.ts`) → referential-integrity check (`src/content/load.ts`) → idempotent upsert (`prisma/seed.ts`). |
| Seed catalog | 24 plans, 6 categories, 32 tools. |

**Two design decisions worth defending:**
- **Money is integer cents, never floats.** This data feeds a cost estimator that
  semi-pro makers price real work against (`BUSINESS_PLAN.md` §3). Float drift in
  currency is not acceptable there.
- **Tools are a normalized table, not free text.** `BUSINESS_PLAN.md` §4.6
  requires "only show plans I can build with tools I own." That is not reliably
  answerable against free-text tool names. Sprint 5 depends on this being right
  now, not retrofitted later.

### Attempt 1 — 2026-07-12

| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | **25** | Maps to the §4 Sprint 1 bullet field by field: title, category, difficulty (1-5, constrained), tools required (with an `essential` flag), materials required (species/quantity/unit/cost), time estimate (min/max **minutes** for filtering, plus a human label because "2 weekends" is not expressible in minutes), cost tier ($–$$$$$ enum), itemized cost range (integer cents), instructions (ordered steps), images (with mandatory alt text). Ingestion path delivered and loads **24** plans — above the "~20" the sprint asked for. Nothing out of scope: no browse/detail views (Sprint 3), no search (4), no filters (5), no auth (2), no admin UI (deferred per decision #7). |
| Correctness & functionality (/30) | **29** | Verified against **live Neon**, not just locally: `prisma migrate reset` dropped the schema and replayed `0_init` from empty — proving the committed migration actually rebuilds the database from scratch, which is the whole point of committing it. `npm run db:seed` loaded all 24 plans. **Run twice: still 24** — idempotency proven, not asserted. `npm run db:migrate` then reported "Already in sync". `next build` passes; `tsc --noEmit` 0 errors; `eslint .` 0 errors/0 warnings. −1: no *automated* test drives the seed against a real database — that verification is currently manual. |
| Automated test coverage (/15) | **15** | `tests/content.test.ts` (23 cases) runs against the **real** `content/` files, not fixtures — so CI validates exactly what the seeder will push. It proves: every plan's cost tier agrees with its actual dollar range; no inverted cost/time ranges; every tool and category reference resolves; no duplicate slugs; every plan has ≥1 *essential* tool; and the catalog actually **spans** the axes Sprints 3–5 will filter on (all 5 difficulty levels, all 5 cost tiers, all 6 categories, 29 distinct tools, quick projects *and* multi-weekend builds). Plus 7 negative cases proving the schema rejects a lying cost tier, an inverted range, a bad difficulty, a typo'd key, a missing alt text, an all-optional tool list, and a bad slug. 48 tests total across the suite. |
| Security (/15) | **14** | Checked: no secrets committed (`.env.local` gitignored and confirmed absent from `git status`); the seed script is **additive/updating only — it never drops a table and never deletes a plan absent from `content/`**, because deleting catalog content is an irreversible data action and stays a deliberate decision; all writes go through Prisma's parameterized client (no raw SQL, no injection surface); `migrate reset` was **flagged as irreversible and escalated to the user before running**, not executed unilaterally. −1, honestly: **dev and production still share one Neon database.** Flagged to the user proactively. Harmless today (no users, seed-only data); a real hazard the moment either exists. Fix is a Neon dev branch — free tier includes 10. Tracked below. |
| Code quality & simplicity (/10) | **10** | The seed script and the test suite share one loader (`loadCatalog`) rather than each maintaining its own parsing — so the tests cannot drift from what the seeder actually does. Zod schemas are `.strict()` everywhere, so a typo'd key fails loudly instead of being silently dropped. Children of a plan are rewritten inside a transaction rather than merged, so a stale step or cut-list row cannot survive a content edit. Lint clean, no dead code. |
| Documentation & handoff (/5) | **5** | `schema.prisma` documents *why* money is cents and *why* tools are normalized, and explicitly names what is deliberately absent and which sprint owns it. `plan-schema.ts` explains the cost-tier bounds and what breaks without them. Decision #7 logged in `DECISIONS_LOG.md`. Commit SHAs recorded above per the amended DoD. |
| **Total (/100)** | **98** | |

**Result: PASS (98 ≥ 95).**

### The validator caught three real defects — in the build agent's own content

`cedar-planter-box`, `shaker-step-stool`, and `rolling-shop-cart` each declared a
cost tier that contradicted their own dollar range (e.g. claiming `$` while
costing up to $55, past the $50 tier bound). Zod's cross-field refinement caught
all three on the first test run.

This is exactly the class of defect that would have silently poisoned the cost
filter in Sprint 5 and made the catalog untrustworthy — the top risk named in
`BUSINESS_PLAN.md` §12. It would never have been caught by reading the files.
Fixed, and CI now blocks it permanently.

### Environment defects found and fixed (again, only by running it for real)

| Defect | Root cause | Fix |
|---|---|---|
| `Environment variable not found: DATABASE_URL` on every db command | Prisma's CLI reads `.env`; `.env.local` is the Next.js convention and is where the secrets actually live | `dotenv-cli` wired into every db script |
| Same error persisted | `.env.local` did not exist at all — Sprint 0 was verified via the deployed Vercel URL, so the secrets only ever lived in Vercel's dashboard | User created it from `.env.example` |
| `syntax error at or near ""` applying `0_init` | PowerShell's `Out-File -Encoding utf8` writes a **UTF-8 BOM**; Prisma's SQL parser chokes on it | Build agent regenerated and wrote the migration without a BOM |
| `type "CostTier" already exists` | The BOM'd `0_init` read as empty, so `migrate dev` concluded the schema was missing and generated a **duplicate** migration | Deleted the duplicate; `migrate reset` rebuilt a clean history |

**Lesson, consistent with Sprint 0:** none of these were visible to a green test
suite. All four appeared only on contact with a real database.

### Known follow-ups (not blocking)
- **Dev and prod share one Neon database.** Recommend a Neon dev branch with its
  own `DATABASE_URL` in `.env.local`. Free tier includes 10 branches. Do this
  before Sprint 2 puts real user records in the database.
- No plan currently has images — `images: []` throughout. The schema and the
  validator support them (alt text mandatory); sourcing actual photography is a
  content decision for the user, not a dev task.
- Prisma 6.19 → 7.8 available. Still deliberately not taken.
