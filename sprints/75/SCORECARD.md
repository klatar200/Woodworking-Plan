# Sprint 75 — SCORECARD

Grader: Cursor. Bar: `ACCEPTANCE.md` (locked). Evidence from `verify.txt` (full `npm run verify`) and file:line.

Grade = 26 PASS ÷ 27 = **96%** (M1 manual). Gate ≥95%. No `R` FAIL.

---

## CLAUDE.md §6 truth pass (T1)

- A1 | PASS | CLAUDE.md:45 — string "Sprint 46 catalog-UX shipped" absent; line uses "Sprint 46 (catalog-UX) ✅ shipped 2026-07-23"
- A2 | PASS | CLAUDE.md:45 — names "Cutting Board Designer (Sprints 51–74)"
- A3 | PASS | CLAUDE.md:45 — "74 CLOSED 2026-07-27 at 98/100 (last closed)"
- A4 | PASS | CLAUDE.md:45 claims match BUILD_PLAN.md §4 rows: Phase 0–3 ✅ (L22–26), Phase 4 PARTIAL (L35), UI migration 28–32 CLOSED (L29), UX Remediation 33–42 CLOSED (L30), Notch rebrand 43–45 CLOSED (L31), Sprint 46 shipped (L32), Sprints 47–50 shipped (L36), 51–52 BOTH CLOSED (L37), 53–56 ALL CLOSED (L38), 57–66 CLOSED (L39–48), 67–72 TRACK CLOSED (L55), Shell IA CLOSED (L56), 73 CLOSED (L57), 74 CLOSED 98/100 (L58)
- A5 | PASS | `cmp` origin/main CLAUDE.md §1–§5 and §7–§9 byte-identical; only §6 Roadmap line changed (CLAUDE.md:45)

## SPRINT_LOG compaction (T2)

- A6 | PASS | SPRINT_LOG.md — `wc -l` = 509 (≤ 900)
- A7 | PASS | SPRINT_LOG.md:14–426 — full sections for Sprints 74–65 including Shell IA post-close audit (L85) with HistoryState.baseline (L106)
- A8 | PASS | SPRINT_LOG.md:430–509 — exactly one compacted line per Sprint 0–64 (30 as 30a/30b/30c); no dups/missing
- A9 | PASS | scores preserved from baseline (e.g. Sprint 58 82/100 L436; 59 90/100 L435; 61 93/100 L433; 55 95/100 L439; QOL-F step1 "not scored, by design" L467); no invented grades
- A10 | PASS | SPRINT_LOG.md:14→509 — newest-first (74…0); no mid-file ascending flip
- A11 | PASS | `rg 'Sprint N:' SPRINT_LOG.md` empty — template stub deleted
- A12 | PASS | Catalog swap L448; QOL-A…QOL-H L463–472; pilot answer L464

## DECISIONS_LOG compaction (T3)

- A13 | PASS | DECISIONS_LOG.md — `wc -l` = 318 (≤ 600)
- A14 | PASS | `diff` of `^### ` vs origin/main — empty; 88 headings unchanged
- A15 | PASS | DECISIONS_LOG.md:101–102 — ⛔ SUPERSEDED, DO NOT IMPLEMENT retained on R2 build-photo entry
- A16 | PASS | Hobby monetization DECISIONS_LOG.md:11,74–75,92–93; cost-tiers-only L17,146–147; no affiliate L15,122–123; credential rotation deferred L14,167–168; one DB sparkling-band production L14,167–168; PlanView no userId L22,177
- A17 | PASS | DECISIONS_LOG.md:8 — "## Settled decisions — index"

## Repo hygiene (T4, T5)

- A18 | PASS | `git mv` COMPETITIVE_AUDIT_CBD.md → docs/COMPETITIVE_AUDIT_CBD.md; DECISIONS_LOG.md:299 notes `docs/` path; no dangling root path refs
- A19 | PASS | `git ls-files run1-ledger.json` — still tracked at repo root
- A20 | PASS | Removed (no inbound refs): run1-handoff.tgz, deterministic-defects.csv, missing-images-review.csv, missing-images-review-2026-07-23.csv. Retained: run1-ledger.json (force-commit / out of scope); _harness.tgz (docs/superpowers/plans/cutting-board-designer-build-plan.md:28); run1-cut-step-preview.txt (scripts/run1-cut-step.mjs:265); kreg_scraper.py + scraper.py (scraper.py referenced scripts/merge-scraped-images.mjs:14; PLAN: leave both if either referenced)
- A21 | PASS | No removed file referenced in .gitignore, package.json, CI, scripts/, or docs (verified before git rm)

## Regression gate

- R1 | PASS | `git diff --name-only origin/main...HEAD` — no paths under src/, prisma/, content/, public/, tests/, scripts/
- R2 | PASS | verify.txt:183–188 — all four PASS; `=== EXIT: 0 ===`
- R3 | PASS | SPRINT_LOG.md + DECISIONS_LOG.md exist at repo root
- R4 | PASS | BUILD_PLAN.md, AGENTS.md, AGENTS_CONTEXT.md, BUSINESS_PLAN.md, DESIGN_BRIEF.md, DEPLOYMENT.md byte-identical to origin/main (`cmp`)
- R5 | PASS | package.json byte-identical to origin/main (`cmp`)

## Manual

- M1 | FAIL | evidence: manual — `npm run build` not run on Keagan's box this sprint (Cloud VM; Keagan-only check)
