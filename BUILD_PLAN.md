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
| Sprints 53–56 (Designer polish) | ✅ **ALL CLOSED** — 53 **98** · 54 **98** · 55 **95** · 56 **100**. |
| Sprint 57 (Species dropdown + multi-panel v2) | ✅ **CLOSED** 2026-07-26 — **99/100** Part A `aeb7d19` · Part B `32f6379`. Suite **1152/1152** across 98 files; `/designer` First Load **117 kB**. All seven browser checks run on prod by Claude Code 2026-07-26 — six PASS, one PARTIAL (three-panel print unverified; needs a saved plaid design). Derived-length board feet confirmed to the digit. |
| Sprint 58 (Mitered strips / hexagon) | ✅ **CLOSED** 2026-07-26 — **82/100**. Template incorrect — reopened as Sprint 59. Primitive/clip/transforms/editor sound; named `hexagon` rendered isolated rhombi (check 1 FAIL on prod). Suite **1165/1165**; First Load **120 kB**. |
| Sprint 59 (Harlequin + hex honesty) | ✅ **CLOSED** 2026-07-26 — **90/100** (browser re-score; was 96). Rename `hexagon`→`harlequin`; t=w·secθ; `speciesComponents`; Part B: no one-miter hex lattice. Dimension display defects — fixed in Sprint 60. Suite **1168/1168**; First Load **120 kB**. |
| Sprint 60 (Dimension display) | ✅ **CLOSED** 2026-07-26 — **96/100** (browser verify PASS on prod `2fd0b61`). `formatInches` zero-numerator + non-finite; `closingThicknessHint`; harlequin thicknessIn=1; §7 decimal-inch guard. Suite **1174/1174**; First Load **120 kB**. |
| Sprint 61 (Close the gaps) | ✅ **CLOSED** 2026-07-26 — **93/100** (browser re-score; was 96). Skip note unreachable at 48k=schema max — fixed in Sprint 62. 32 KiB defence-in-depth kept. Suite **1182/1182**; First Load **120 kB**. |
| Sprint 62 (Skip note / reachability) | ✅ **CLOSED** 2026-07-26 — **96/100** (browser verify PASS). Deleted unreachable colour gate; always-run check; reachability witness suite. Closure false-positive on mixed base species — fixed in Sprint 63. Suite **1195/1195**; First Load **120 kB**. |
| Sprint 63 (Geometric closure) | ✅ **CLOSED** 2026-07-26 — **96/100** (browser verify PASS on prod `2eab289`). `wedgeWebContinuous` replaces species equality; accent strips no longer false-positive. Suite **1203/1203**; First Load **120 kB**. |
| Sprint 64 (U6: optimizer + shopping push) | 🔓 **OPEN** 2026-07-26 (Keagan). Cut optimizer panel (reuse `toParts`/`optimize`/`BoardBar`) + shopping-list push. Part B blocked on Q1 (designer entry representation). |

Test suite — expected: 1203/1203 across 104 files (Sprint 63, Cursor VM; Sprint 64 in progress). Update this single figure each sprint close; 1195/1195 and earlier superseded.

**U6 OPENED** (Keagan, 2026-07-26). **U7 retired as a unit** — its contents shipped across Sprints 53–63 (undo/redo, multi-panel end grain, angled/miter strips, species expansion, geometric closure). Remaining U7 items (share links, custom species, drag reorder, thumbnails) stay deferred, not a bundled unit.

Open follow-ups (Keagan): dark-theme re-palette (one scheduled sprint; opens once light migration verified live; don't start uncommissioned) · Clerk prod keys · optional 2nd cut-list parse to re-publish the 489 · credential rotation at go-live (settled: once, pre-launch) · Kreg legal gate RESOLVED 2026-07-24.

### Sprints 53–56 — Designer polish (CLOSED).
Sprints 51–52 delivered U1–U5. Polish track 53–56 + miter/closure 57–63 closed. **U6 OPENED 2026-07-26.** U7 retired (contents shipped piecemeal). Decisions of record: DECISIONS_LOG 2026-07-25 (mobile-first scoping; undo/redo).

| Sprint | Scope (Keagan's item #s) | Notes / gates |
|---|---|---|
| **53 — Designer layout & chrome** | **2** full-page width like `/browse` · **3** preview stays in view while editing · **4** `PREVIEW` left + `Export PNG` right on one line · **6** strip `Up`/`Down` verbiage · **7** species pills one line, `Purpleheart` overflow | ✅ **CLOSED** 2026-07-25 — Attempt 2 **98/100** (`cff58b9` + `c4a4e99`). |
| **54 — Desktop-only designer + mobile plan/cut list** | **1** | ✅ **CLOSED** 2026-07-26 — **98/100** (`4e8f2bf`). Viewport gate flips at exactly **1024** (verified); form stays mounted so a resize cannot destroy a draft (verified round-trip); `canvas === null` below the gate; exact notices; print sheet clean at 366px. B7 held (no `toParts()`). Header now a single `xl` breakpoint (`a728a0e` + `2844c22`) — the first attempt left a 1024–1279 band with no search at all. |
| **55 — Undo/redo** | **5a** | ✅ **CLOSED** 2026-07-26 — **95/100** (`31a5940` + `7701bad`). In-memory history (cap 50); coalesce typed width/repeat/name; template apply undoable (confirm removed); Ctrl/Cmd+Z + Ctrl+Y / Ctrl+Shift+Z; viewport gate; no new deps. All 9 behaviours verified on prod. Two defects fixed on review before prod: `Ctrl+Shift+Z` was dead (`event.key` is case-shifted — a synthesized keystroke sends `'z'`, hardware sends `'Z'`), and a constant imported from `r3f-canvas` pulled three.js into the initial bundle (**114→358 kB**, restored to 115 kB). Open: the lazy three chunk still loads below the gate (pre-existing Sprint 54). |
| **56 — Species expansion** | **8** | ✅ **CLOSED** 2026-07-26 — **100/100** (`784ecf8`). Appended seven ids (yellowheart→bamboo) with Keagan hexes; §3.2 → exactly 15; pairwise floor 0.127 guarded; `dark-theme`/`contrast` re-run green; First Load held at **115 kB**. All six browser checks observed on prod, no defects. Rendered separation of the pale group is **0.070** vs the shipped cherry/padauk control at **0.073** — at the palette's limit, so a further species needs the pill grid rethought first (strip cards are now 697px tall). |
| **57 — Species dropdown + multi-panel v2** | — | ✅ **CLOSED** 2026-07-26 — **99/100**. Part A native `<select>` (`aeb7d19`). Part B `schemaVersion:2` panels/rowPattern/`RowTransform`; `rotateByOne` deleted; v1 migrates; +plaid/brick/diagonal/thue-morse; First Load **117 kB**. All seven browser checks run on prod by Claude Code 2026-07-26 — six PASS, one PARTIAL (three-panel print unverified; needs a saved plaid design). Derived-length board feet confirmed to the digit. |

**Deferred to their own conversations — do not fold into 53–58:**
- **True hexagon lattice / star / tumbling-block / chevron templates** — corner-miter harlequin is rhombi; closed hex needs a richer primitive (e.g. two miters/strip — contract change). Each needs its own visual verification.
- **Advanced zigzag / 3D-box templates** — still need a Cell or Strip contract change beyond optional `wedge`.
- **The wider "Canva-like" editing/export set (item 5b)** — open-ended; needs a concrete behaviour list before it can be scoped.

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
