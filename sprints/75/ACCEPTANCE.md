# Sprint 75 — ACCEPTANCE

Bar author: Claude Code. Written before implementation. Grader: Cursor.
Locked by `ACCEPTANCE.sha256`.

Grade = PASS ÷ 27. Gate = **≥95%** (26/27). Any `R` FAIL voids the sprint regardless of grade.

Baseline for every "before" comparison: `git show HEAD:<file>` at the commit this pack landed on.

---

## CLAUDE.md §6 truth pass (T1)

- [ ] A1 | `CLAUDE.md` §6 no longer contains the string "Sprint 46 catalog-UX shipped" | evidence: file:line
- [ ] A2 | `CLAUDE.md` §6 names the Cutting Board Designer and the sprint range that built it | evidence: file:line
- [ ] A3 | `CLAUDE.md` §6 states Sprint 74 as the last closed sprint | evidence: file:line
- [ ] A4 | Every sprint-status claim in the rewritten §6 line appears in `BUILD_PLAN` §4 | evidence: file:line
- [ ] A5 | `CLAUDE.md` §1–§5 and §7–§9 are byte-identical to baseline | evidence: file:line

## SPRINT_LOG compaction (T2)

- [ ] A6 | `SPRINT_LOG.md` is ≤ 900 lines | evidence: file:line
- [ ] A7 | Sprints 65–74 retain their full pre-compaction detail, including the "Shell IA post-close audit" section | evidence: file:line
- [ ] A8 | Sprints 0–64 each have exactly one entry line | evidence: file:line
- [ ] A9 | Every score present in the baseline file survives unchanged in its entry; entries without one read `not scored` | evidence: file:line
- [ ] A10 | Entries run strictly newest-first with no ordering flip | evidence: file:line
- [ ] A11 | The `## Sprint N: <name>` template stub is gone | evidence: file:line
- [ ] A12 | Non-sprint sections (Kreg catalog swap, QOL phases, pilot answer) each retain an entry | evidence: file:line

## DECISIONS_LOG compaction (T3)

- [ ] A13 | `DECISIONS_LOG.md` is ≤ 600 lines | evidence: file:line
- [ ] A14 | The set of `###` headings is identical to baseline — none added, none dropped | evidence: file:line
- [ ] A15 | Every ⛔ SUPERSEDED marker in the baseline is present | evidence: file:line
- [ ] A16 | These six constraints are each still stated: Vercel Hobby monetization gate · cost-tiers-only · no affiliate links · credential rotation deferred pre-go-live · one database labelled production · `PlanView` carries no `userId` | evidence: file:line
- [ ] A17 | The "Settled decisions — index" section is retained | evidence: file:line

## Repo hygiene (T4, T5)

- [ ] A18 | `COMPETITIVE_AUDIT_CBD.md` is at `docs/`, moved with `git mv`, and no inbound reference is left dangling | evidence: file:line
- [ ] A19 | `run1-ledger.json` is still tracked at repo root, untouched | evidence: file:line
- [ ] A20 | Every root artifact removed has a SCORECARD line showing no inbound reference; every one retained has a one-line reason | evidence: file:line
- [ ] A21 | No file was removed that is referenced in `.gitignore`, `package.json`, CI, `scripts/`, or any doc | evidence: file:line

---

## Regression gate — any FAIL voids the sprint

- [ ] R1 | Zero files changed under `src/`, `prisma/`, `content/`, `public/`, `tests/`, `scripts/` | evidence: file:line
- [ ] R2 | `npm run verify` reports all four steps PASS and `=== EXIT: 0 ===` | evidence: verify.txt
- [ ] R3 | `SPRINT_LOG.md` and `DECISIONS_LOG.md` both still exist at repo root | evidence: file:line
- [ ] R4 | `BUILD_PLAN.md`, `AGENTS.md`, `AGENTS_CONTEXT.md`, `BUSINESS_PLAN.md`, `DESIGN_BRIEF.md`, `DEPLOYMENT.md` are byte-identical to baseline | evidence: file:line
- [ ] R5 | No new dependency in `package.json` | evidence: file:line

## Manual — Keagan's box only

- [ ] M1 | `npm run build` still succeeds | evidence: manual
