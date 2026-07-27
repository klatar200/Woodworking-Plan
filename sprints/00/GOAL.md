# Sprint 00 — Sprint-pack infrastructure

## Objective
Replace clipboard-as-integration-layer with a file-backed handoff between Claude Code and Cursor.
Ship the mechanism only. No product code changes.

## Why now
Per-sprint context is currently paid for 4–5× per fix round: Claude regenerates a full prompt,
Keagan pastes it, Cursor re-ingests it, Cursor emits prose, Keagan pastes that back. Claude Max 5×
weekly cap and Cursor Pro monthly cap are both being exhausted on duplicated context, not on work.

## Definition of done
`npm run verify` exists and emits machine-parseable evidence; a guard test makes an ungraded or
tampered acceptance bar a **test failure**; both agent-contract docs state the protocol; sprint 47
can open on the new loop with zero further setup.

## In scope
- `scripts/verify.mjs` + `verify` npm script
- `sprints/_template/` skeletons and the check-id format spec
- `tests/sprint-pack.test.ts` structural guard
- `AGENTS.md` Cursor contract section
- `CLAUDE.md` §9 protocol section
- `.gitignore` entry for derived diffs

## Out of scope — do not touch
- Any file under `src/`, `prisma/`, `content/`, `public/`
- Any existing test's assertions
- Playwright / browser-automation acceptance (deferred: `next dev` cannot run in the Claude
  sandbox — SWC SIGBUS, CLAUDE.md §5. Separate sprint, on Keagan's box or CI.)
- BUILD_PLAN §4 roadmap ordering
- Anything requiring a vendor account, secret, or spend

## Non-goal
This is process infrastructure, not product. It appears in no user-facing surface and must not
alter `npm run build` output.

## Threshold rule (prevents the process becoming the work)
Sprint packs are for **sprints**. A change touching fewer than ~3 files goes direct — no pack.
