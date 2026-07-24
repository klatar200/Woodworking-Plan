# BUILD_PLAN.md — how the build agent operates (governing doc, agent context)

Governs *how* the product in `BUSINESS_PLAN.md` gets built, sprint by sprint, with a self-scoring gate and a hard rule against inventing business decisions. Model-agnostic; "the build agent" = you. Per-sprint scores/evidence live in `SPRINT_LOG.md`; operational detail in `CLAUDE.md`; every business/vendor/cost/legal call in `DECISIONS_LOG.md` (treat as fact).

---

## 1. Guardrails (operating principles)
1. **Factual reasoning only.** Every decision traces to (a) `BUSINESS_PLAN.md`, (b) `DECISIONS_LOG.md`, or (c) a pure technical detail with no business/cost/legal implication. Else stop and ask.
2. **Escalate business decisions, don't guess** (§2).
3. **One sprint at a time, no scope drift.** Work only the current sprint's §4 deliverables; new ideas go to backlog notes, not the active sprint.
4. **Every sprint ends with a self-score** ≥95% on §6 (§7 loop).
5. **Everything is logged.** Business decisions → `DECISIONS_LOG.md`; sprint outcomes → `SPRINT_LOG.md`. The *why* must be reconstructable from those two files alone.

## 2. Escalation protocol — what requires Keagan's decision
Stop and ask (with a **recommended option labeled**) for any of:

| Category | Examples |
|---|---|
| Money | pricing/tier changes, a new paid vendor, any recurring cost |
| Vendor/tooling with lock-in | payment processor, auth provider, host, CMS |
| Legal/compliance | ToS, privacy, data retention, creator licensing |
| Irreversible/hard-to-reverse data | schema changes that drop data, deleting seed content, renaming/removing a public API |
| Anything `BUSINESS_PLAN.md` doesn't cover | a feature, limit, or rule the plan doesn't address |
| Branding/naming/public copy | app name, tagline, domain |

**Don't escalate** routine implementation (library for a solved problem, code structure, test framework, names). **How:** state the decision, options, recommended option + one-line rationale, trade-off; wait; record in `DECISIONS_LOG.md` before proceeding.

## 3. Pre-Sprint-0 decisions — ALL RESOLVED (record in `DECISIONS_LOG.md`)
Frontend = React+Next.js · Backend = Node/TS as Next API routes · DB = Postgres/Neon · Host = Vercel Hobby · Auth = Clerk · Content = version-controlled seed files (no admin UI; headless CMS rejected) · Budget = **$0 during dev, every vendor a genuine perpetual free tier**. Payment processor (#6) + pricing (#7) **deferred** — no billing work until launch economics reopen. **Branding #8 RESOLVED: Notch / notchplans.com** (2026-07-21).

---

## 4. Sprint & phase roadmap

### Status at a glance (updated 2026-07-24, post-Kreg swap)
| Phase | Status |
|---|---|
| Phase 0 (Sprint 0) | ✅ 99 |
| Phase 1 MVP (1–9) | ✅ deployed |
| Rate limiting (pre-10, standalone) | ✅ incl. denial feedback |
| Phase 2 (10–14) | ✅ every §10 item except affiliate links (blocked by Hobby, not oversight) |
| Phase 3 (15–16) | ✅ cut-list optimizer + learning paths; 3 items cut to `FUTURE_IDEAS.md` |
| Post-launch backlog (17–23) | ✅ complete (About/FAQ copy is a DRAFT for Keagan) |
| Completion plan (24–27) | ✅ pushed & live 2026-07-16 (CI green) — hardening, workshop, tool-aware catalog, build logs |
| UI framework migration (28–32) | ✅ CLOSED — Tailwind CSS + light/dark theme (`.dark{}` token flip; SSR cookie, no FOUC; print forced light) |
| UX Remediation (33–42) | ✅ CLOSED — quality pass from `UX_AUDIT_2026-07-21.md` (governing doc `UX_REMEDIATION_PLAN.md`); NOT a Phase-4 feature |
| Notch rebrand (43–45) | ✅ CLOSED — branding #8 resolved; light palette → Oak & Forest; dark deliberately still legacy orange |
| Sprint 46 (catalog-UX batch) | ✅ shipped 2026-07-23 |
| **Kreg catalog swap (2026-07-23)** | ✅ LIVE — ana-white fully replaced; 1128 plans (639 published / 489 hidden, empty cut list), images re-hosted to R2 as webp. See `CLAUDE.md` §6 |
| **Public launch** | 🟢 DE FACTO LIVE — `SITE_INDEXABLE = true` (`go-live.ps1` flipped it); public pages crawlable |
| Phase 4 | 🟡 PARTIAL — build logs (Sprint 27) + tool-aware search (25–26) only; everything else CLOSED (below) |

Test suite last verified run: 957 green / 81 files (Sprint 45 close-out, Keagan's machine; tsc + eslint + build green). Kreg-swap gate: green in a Linux `/tmp` clone (tsc/eslint clean, vitest 1017/1017); build + device pass are Keagan's.

**Open follow-ups (all Keagan's):** dark-theme re-palette (the one scheduled sprint — opens once the light migration is verified live; do not start uncommissioned) · Clerk **production keys** (dev keys on a public site) · optional 2nd cut-list parse to re-publish the 489 hidden plans · credential rotation at go-live (settled: once, pre-launch) · **Kreg partnership legal gate — RESOLVED 2026-07-24 (partnership confirmed; catalog cleared to be live).**

### Out of scope until Keagan adds them to `BUSINESS_PLAN.md`
comments on plans · tool-substitution notes · lumber-price sync · plan versioning · offline "shopping mode" · community plan submissions. No sprint builds a feature the business plan doesn't specify.

### Phase 3 — removed before any code (in `FUTURE_IDEAS.md`; do NOT build)
creator marketplace (two-sided, zero users, needs monetization) · native iOS/Android (no user base = no case) · local lumber pricing (no free source; scraping prints confidently-wrong prices). **Still blocked by the launch gate:** makerspace/team accounts (a paid tier — needs leaving Hobby + processor #6 + pricing #7 together).

### Phase 4 — status of each item
build logs → ✅ shipped as Sprint 27 (cut down; **forums stay CLOSED** — moderation liability, no user base) · tool-inventory-aware search → ✅ Sprints 25–26 · AI-assisted plan customization → ⛔ CLOSED (inference costs money, $0 rule) · video integration → ⛔ CLOSED (no content to embed) · international/metric + regional pricing → ⛔ DEFERRED (a "2x4" doesn't convert honestly to metric; regional pricing dead under the cost-tier rule). Revisit only on real demand.

### "Do NOT build" — prototype/wireframe elements decided out (not forgotten)
dollar figures / per-material prices (cost-tier-only rule; `formatCents` deleted) · "10 saved plans / 1 folder" tier limits (no pricing decision) · custom email/password auth screens (Clerk stays; hand-rolled auth = security regression) · email-notifications toggle, sitemap page · materials checklist, offline banner + saved-only catalog mode (offered 2026-07-14, not selected). The `Woodworking Wireframes.dc.html` is historical design iteration, not spec — decisions win where they conflict.

### Launch blockers (§4.2) — all Keagan's
- **Single database during development (STANDING, 2026-07-14):** dev + prod share ONE Neon branch `sparkling-band` (labelled production) on purpose — catalog is rebuildable from `content/*.json` via `npm run db:seed`, nothing to protect a reset from. A separate dev branch is a **pre-go-live** task (needed the day a real person saves a plan). **Do not re-flag "prod == dev".**
- **Credential rotation DEFERRED to pre-go-live — SETTLED, do not re-raise.** Neon role pw + Clerk secret were pasted into chat; rotate once, immediately before launch, then update `.env.local` + both Vercel vars together.
- Going publicly live is Keagan's explicit call (indexing is already on; the caution around "launch" stands for monetization).

### Deferred by decision (needs a business-plan change first)
affiliate links / ads / billing / pricing tiers / save limits → all blocked by launch economics (Vercel Hobby, $0, no monetization). **The moment any appears, the project must be on a commercial-use-permitted host FIRST** (Hobby enforcement = account suspension). Community plan submissions → deferred (no users to submit; plan-ownership is an unrushed licensing call). Makerspace/team accounts → launch gate.

### Notch rebrand — standing consequences
dark-theme re-palette is the scheduled follow-up (dark runs legacy orange until then; one theme per session, so the mismatch is contained) · `robots: noindex` was gated on the launch call, not branding (now lifted) · **SW cache names keep the historical `woodworking-plan-*` prefix forever** (renaming the private cache orphans users' downloaded offline libraries).

---

## 5. Definition of Done (every sprint)
- [ ] Every §4 deliverable for the sprint is implemented.
- [ ] No feature outside the sprint's listed deliverables was added.
- [ ] Every business/vendor/legal/money decision made is in `DECISIONS_LOG.md` with Keagan's actual answer (not an assumed default).
- [ ] Automated tests exist and pass for the sprint's functionality.
- [ ] Manually verified end-to-end (driving the feature, not just reading code/tests).
- [ ] No OWASP-top-10-class issue introduced.
- [ ] Self-scored ≥95% on §6 via the §7 loop.
- [ ] New `SPRINT_LOG.md` entry: number, date, summary, final score, scorecard breakdown, commit SHA(s) on `main`.

**Trunk-based (2026-07-12):** commit/push straight to `main`; no branches/PRs. CI is a *detector*, not a gate — a bad commit lands and gets fixed forward. Revisit before launch. **Deploy early every sprint** — Sprint 0 shipped 4 defects (missing `package.json`, broken lockfile, ungenerated Prisma client, transitive CVE) that a green local suite missed. Green tests are not proof it works.

## 6. Quality scorecard (score every sprint /100; one sentence of evidence per category)
| # | Category | Max | Measures | Evidence |
|---|---|---|---|---|
| 1 | Requirements fidelity | 25 | delivers exactly §4's spec — no more, no less, no invented business logic | cite the exact §4 bullet(s) each deliverable maps to |
| 2 | Correctness & functionality | 20 | works end-to-end, golden path + reasonable edges | manual verification steps + outcome |
| 3 | Automated test coverage | 15 | behaviors covered by tests that exercise them (not tautological) | name test files/cases + what each proves |
| 4 | Security | 15 | no injection/auth-bypass/secret-leak/OWASP-10 issue introduced | what was checked (inputs, auth boundaries, secrets) |
| 5 | Code quality & simplicity | 10 | no dead code, no premature abstraction, follows repo conventions | any simplification/cleanup done |
| 6 | Mobile/offline behavior | 10 | PWA-first: works on mobile and (where relevant) offline | what was tested on mobile viewport / offline |
| 7 | Documentation & handoff | 5 | commits/PR/doc updates clear enough to hand off | link PR, note what was documented |

**Total 100. Passing threshold: 95.** A pure-backend sprint with no offline/mobile surface may redistribute category 6's 10 pts into category 2 — note it explicitly in the log.

## 7. Self-scoring & remediation loop
1. Score against §6, record the breakdown (not just the total) in `SPRINT_LOG.md`.
2. **≥95%:** done — proceed (or stop for review if asked).
3. **<95%:** (a) identify the category losing points and why; (b) fix the underlying issue and re-verify the feature (don't just re-score); (c) re-score the full rubric; (d) repeat up to **3 total attempts**.
4. **Still <95% after 3 attempts:** stop, don't loop. Report score, what's failing + why, what was tried, recommended next step (needs a design decision / needs more than one sprint / split the deliverable). A stuck sprint is a signal to escalate.
5. Log **every** attempt in `SPRINT_LOG.md`.

## 8. Logs
`DECISIONS_LOG.md` = every business/vendor/legal/money decision (Keagan decided, agent's recommendation noted, date) — the source of truth §1.1 points to. `SPRINT_LOG.md` = every sprint's scope, final score, breakdown, remediation attempts, commit SHA(s).
