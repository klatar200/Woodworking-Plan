<!-- BUILD_PLAN.md — agent-optimized. How the build agent operates. §4 status table = authoritative. Business decisions in DECISIONS_LOG (fact); per-sprint scores in SPRINT_LOG; ops detail in CLAUDE.md. -->

# BUILD_PLAN.md

## 1. Guardrails
1. Factual reasoning only: every decision traces to BUSINESS_PLAN, DECISIONS_LOG, or a pure technical detail with no business/cost/legal implication. Else stop+ask.
2. Escalate business decisions (§2), don't guess.
3. One sprint at a time, no scope drift. Only current sprint's §4 deliverables; new ideas → backlog, not the active sprint.
4. Every sprint ends with a self-score ≥95% on §6 (§7 loop).
5. Log everything: business → DECISIONS_LOG; sprint outcomes → SPRINT_LOG. The why must be reconstructable from those two alone.

## 2. Escalation — requires Keagan (state recommended option + one-line rationale + trade-off; wait; record in DECISIONS_LOG before proceeding)
Money (pricing/tier, paid vendor, recurring cost) · vendor/tooling lock-in (processor, auth, host, CMS) · legal/compliance (ToS, privacy, retention, licensing) · irreversible data (schema drops, deleting seed content, renaming/removing public API) · anything BUSINESS_PLAN doesn't cover · branding/naming/public copy.
Don't escalate routine implementation (library, structure, test framework, names).

## 3. Pre-Sprint-0 (all resolved; in DECISIONS_LOG)
Frontend React+Next · Backend Node/TS Next API routes · DB Postgres/Neon · Host Vercel Hobby · Auth Clerk · Content version-controlled seed files (no admin UI; headless CMS rejected) · Budget $0/dev, every vendor genuine perpetual free tier. Processor #6 + pricing #7 DEFERRED (no billing until launch economics reopen). Branding #8 RESOLVED: Notch/notchplans.com.

## 4. Roadmap — status (2026-07-24, post-Kreg swap)
| Phase | Status |
|---|---|
| Phase 0 | ✅ 99 |
| Phase 1 MVP (1–9) | ✅ deployed |
| Rate limiting (pre-10) | ✅ incl. denial feedback |
| Phase 2 (10–14) | ✅ all §10 except affiliate links (blocked by Hobby) |
| Phase 3 (15–16) | ✅ cut-list optimizer + learning paths (paths: structure/code built, content REMOVED when Kreg catalog added — 0 live); 3 items → FUTURE_IDEAS |
| Post-launch backlog (17–23) | ✅ (About/FAQ copy = DRAFT for Keagan) |
| Completion (24–27) | ✅ live 2026-07-16 (hardening, workshop, tool-aware catalog, build logs) |
| UI migration (28–32) | ✅ CLOSED — Tailwind + light/dark (`.dark{}` flip, SSR cookie, no FOUC, print forced light) |
| UX Remediation (33–42) | ✅ CLOSED (audit-driven quality; detail in SPRINT_LOG/git) |
| Notch rebrand (43–45) | ✅ CLOSED (light→Oak & Forest; dark still legacy orange deliberately) |
| Sprint 46 (catalog-UX) | ✅ shipped 2026-07-23 |
| Kreg catalog swap | ✅ LIVE — ana-white replaced; 1128 plans (639 pub/489 hidden), images→R2 webp. CLAUDE.md §6 |
| Public launch | 🟡 REACHABLE, NOT LAUNCHED — `SITE_INDEXABLE=true`; crawlable/indexable but still in development (no marketing/subscriptions/commercialization/users). live≠launched (AGENTS_CONTEXT §"Settled") |
| Phase 4 | 🟡 PARTIAL — build logs (27) + tool-aware search (25–26) only; rest CLOSED |
| Sprints 47–50 | ✅ shipped (settings hub · page size 24 · navbar Browse→Plans · `/browse` filter rail) — detail in SPRINT_LOG. Listed so the next sprint number is not re-used. |
| Sprints 51–52 (Cutting Board Designer) | ✅ **BOTH CLOSED** 2026-07-25. Sprint **51 100/100** (Attempt 3 — Attempt 2's 92 was a verification-access deduction, not a defect; blockers cleared via `prisma migrate status` on the prod branch + signed-in save→library→reopen; §9 manual pass re-run; no product code changed). Sprint **52 100/100** (Attempt 1's 96 **invalidated**; Attempt 2 98; Attempt 3 `25cc107` — wheel bind to canvas OrbitControls, orbit/zoom feel; final 2 Correctness pts released on Keagan's browser PASS on prod `7a6b12e`); suite **1104/1104**; `/designer` First Load **113 kB**. |

Test suite — expected: 1104/1104 across 94 files (Sprint 51 Attempt 3, reproduced natively on Windows 2026-07-25; matches Sprint 52 Attempt 3 on the Cursor VM). Update this single figure each sprint close; 1103/1103 and earlier superseded.

Open follow-ups (Keagan): dark-theme re-palette (one scheduled sprint; opens once light migration verified live; don't start uncommissioned) · Clerk prod keys · optional 2nd cut-list parse to re-publish the 489 · credential rotation at go-live (settled: once, pre-launch) · Kreg legal gate RESOLVED 2026-07-24.

### Designer follow-ups — raised by Keagan 2026-07-25 (NOT scheduled; no sprint number assigned)
Sprints 51–52 delivered U1–U5 and are closed. U6/U7 remain Phase 2, unopened. These nine are Keagan's; **none is started**. Tier A = routine engineering, fits one polish sprint. Tier B = needs a DECISIONS_LOG entry first. Tier C = already U6/U7 scope, or needs a §3 type-contract change (contract §6 rule 3: stop and amend §3, don't negotiate it in code).

| # | Item | Tier | Note |
|---|---|---|---|
| 2 | Designer spans full page width, like `/browse` | **A** | `page-wide` already exists (Sprint 52 P1-A). Widen further + let the preview column take the slack |
| 3 | Preview stays in view while editing strips/settings | **A** | Sticky/split-pane preview. Biggest usability win on the list; also the thing item 1 is really reacting to |
| 4 | `PREVIEW` heading and `Export PNG` on one line, heading left / button right | **A** | Trivial flex fix |
| 6 | Strip verbiage — `Up`/`Down` unclear once the camera has moved | **A** | Real defect: labels are panel-order, but the user reads them against a rotated 3D view. Prefer order-relative wording tied to the diagram, not the camera. New user-visible copy ⇒ contract §8 wants it approved, but B6 leaves "tiny chrome" to engineering judgment — keep to labels, no new marketing lines |
| 7 | Species pills wrap to 2 lines; `Purpleheart` overflows its pill | **A** | Confirmed live on prod. CSS bug, not a data problem |
| 1 | Designer = desktop/tablet authoring; mobile read-only | **B** | Posture change vs §6 cat-6 "PWA-first" and BUSINESS_PLAN §5. Gate on viewport width, never UA sniffing. Read-only mobile = `/designer/library` + `/designer/[id]` view + print sheet. **Keagan's stated reason ("desktop-only packages/builds") does not hold for a web app** — the same bundle and the same WebGL2/three.js/R3F run in mobile Safari and Android Chrome; there is no desktop-only web dependency to gain. The valid reasons are screen real estate, pointer precision, GPU/thermal headroom, and dropping the touch-gesture surface. **Undecided — no DECISIONS_LOG entry yet; do not build against it** |
| 8 | Extend the species list beyond the initial 8 | **B** | B14 + contract §8: touching the species list after ship is an escalation. **Adding** is safe (new ids orphan nothing); removing/renaming is not. Needs §3.2 amended, `dark-theme`/`contrast` guards re-run, and hex values that stay distinguishable in 3D |
| 5 | Undo/redo (⌘Z) instead of the "Replace your current draft?" confirm; Canva-like editing/export | **C** | Undo/redo is **explicitly U7**. In-memory only per Keagan (not persisted across reload). "Canva-like" is open-ended ⇒ needs a concrete list before it can be scoped |
| 9 | Advanced end-grain templates — plaid, zigzag, 3D box | **C** | **Splits.** Plaid ≈ representable today (strip widths + `flipEveryOtherSlice`). Zigzag and 3D-box are **not**: `Strip` has no angle and `Cell` is axis-aligned `{xIn,yIn,wIn,hIn}`, so a rhombus/offset cell cannot be expressed. Those need a §3 change + new geometry + new tests — U7-scale, not "add a template" |

Out of scope until Keagan adds to BUSINESS_PLAN: comments · tool-substitution notes · lumber-price sync · plan versioning · offline "shopping mode" · community submissions.
Phase 3 removed pre-code (FUTURE_IDEAS, do NOT build): creator marketplace · native iOS/Android · local lumber pricing. Still launch-gated: makerspace/team accounts (paid tier = leave Hobby + #6 + #7 together).
Phase 4 per item: build logs ✅(27, forums stay CLOSED) · tool-aware search ✅(25–26) · AI plan customization ⛔(inference costs money) · video ⛔(no content) · metric/regional pricing ⛔(2x4 doesn't convert honestly; regional dead under cost-tier rule).
Do-NOT-build (decided out): dollar figures/per-material prices (`formatCents` deleted) · tier limits (no pricing) · custom auth screens (Clerk stays) · email-notif toggle, sitemap page · materials checklist, offline banner + saved-only catalog mode. `Woodworking Wireframes.dc.html` = historical, not spec.

### Launch blockers (all Keagan's)
- Single DB during dev (STANDING 2026-07-14): dev+prod share ONE Neon branch `sparkling-band` on purpose (catalog rebuildable via `npm run db:seed`). Separate dev branch = pre-go-live (needed the day a real person saves a plan). Do not re-flag "prod==dev".
- Credential rotation DEFERRED to pre-go-live — SETTLED, don't re-raise. Rotate once pre-launch, update `.env.local` + both Vercel vars together.
- Going publicly live is Keagan's call (indexing already on; caution stands for monetization).
Deferred by decision (need business-plan change first): affiliate/ads/billing/pricing tiers/save limits (launch economics — the moment any appears, move to commercial-use host FIRST). Community submissions (plan-ownership licensing). Makerspace/team accounts (launch gate).
Notch rebrand standing: dark re-palette scheduled follow-up · `noindex` was gated on launch call not branding (now lifted) · SW cache names keep historical `woodworking-plan-*` prefix forever (renaming private cache orphans downloaded offline libraries).

## 5. Definition of Done (every sprint)
Every §4 deliverable implemented · no feature outside listed deliverables · every business/vendor/legal/money decision in DECISIONS_LOG with Keagan's actual answer · tests exist+pass · manually verified end-to-end · no OWASP-top-10-class issue · self-scored ≥95% (§7) · new SPRINT_LOG entry (number, date, summary, score, breakdown, commit SHA on `main`).
Trunk-based: commit/push straight to `main`, no branches/PRs. CI = detector not gate. Deploy early every sprint. Green tests ≠ proof.

## 6. Scorecard (/100, one sentence evidence per category; threshold 95)
1 Requirements fidelity /25 (delivers exactly §4, no invented business logic; cite §4 bullets) · 2 Correctness /20 (end-to-end golden+edges; manual steps+outcome) · 3 Test coverage /15 (behaviors covered, not tautological; name files/cases) · 4 Security /15 (no injection/auth-bypass/secret-leak/OWASP-10; what was checked) · 5 Code quality /10 (no dead code/premature abstraction; repo conventions) · 6 Mobile/offline /10 (PWA-first) · 7 Docs/handoff /5.
Pure-backend sprint may move cat-6's 10 pts into cat-2 — note explicitly.

## 7. Self-score loop
Score vs §6, record breakdown in SPRINT_LOG. ≥95% ⇒ done. <95% ⇒ (a) identify category+why, (b) fix underlying issue + re-verify (not just re-score), (c) re-score full rubric, (d) ≤3 attempts. Still <95% after 3 ⇒ stop, report score/failing+why/what tried/recommended next (design decision? >1 sprint? split?). Log every attempt.

## 8. Logs
DECISIONS_LOG = every business/vendor/legal/money decision (Keagan decided, agent recommendation noted, date). SPRINT_LOG = every sprint scope/score/breakdown/attempts/SHA.
