# Sprint 75 — Doc truth pass + repo compaction

## Objective
Make `CLAUDE.md` §6 true again, and compact the two long logs so they hold the same binding
facts in a fraction of the lines. Docs only. No product code changes.

## Why now
`CLAUDE.md` §6 says "Sprint 46 catalog-UX shipped" while `BUILD_PLAN` §4 has Sprints 73 and 74
CLOSED at 98/100 — it is ~28 sprints stale and never mentions the Cutting Board Designer, a
product area that consumed Sprints 51–74. It is the file BOTH agents load into every session,
so every session starts from a wrong picture. That is a live cost, not housekeeping.

`SPRINT_LOG.md` (5907 lines) and `DECISIONS_LOG.md` (1937) are secondary: nothing reads them
wholesale, so their size costs little today. They are compacted here because the sprint is
already open on these files, not because they are urgent.

## Definition of done
An agent reading `CLAUDE.md` §6 + `BUILD_PLAN` §4 gets an accurate picture of what exists and
what shipped, and neither log has lost a single binding fact.

## In scope
- `CLAUDE.md` §6 only
- `SPRINT_LOG.md` — compact, preserve every recorded grade
- `DECISIONS_LOG.md` — compact to binding outcomes, preserve every decision and every
  ⛔ SUPERSEDED marker
- `COMPETITIVE_AUDIT_CBD.md` → `docs/`
- Tracked root scratch artifacts — **verify before removing**

## Out of scope — do not touch
- `src/`, `prisma/`, `content/`, `public/`, `tests/`, `scripts/`
- `CLAUDE.md` §1–§5 and §7–§9. §7 invariants especially: each one broke prod once.
- `BUILD_PLAN.md` — it is the authoritative status source this sprint corrects *toward*
- `AGENTS.md`, `AGENTS_CONTEXT.md`, `BUSINESS_PLAN.md`, `DESIGN_BRIEF.md`, `DEPLOYMENT.md`
- Deleting either log outright

## Non-goal
This is not a rewrite of project history. Compaction removes deliberation prose and keeps
outcomes. If a fact only exists in the long form, it stays.

## Standing hazard
`.gitignore` force-commits `run1-ledger.json` with the comment "it IS the resume point".
Anything in the debris sweep may still be load-bearing — a file is removed only after its
absence of inbound references is demonstrated, never on the strength of its name.
