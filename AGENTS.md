<!-- AGENTS.md — briefs for the fresh-context subagents Claude Code spawns during a sprint (pre-flight and grader). Cursor is retired from the loop (Keagan 2026-10-16); the implementing session follows CLAUDE.md, especially §9. Shared product/engineering/security rules: CLAUDE.md §7–§8. -->

# AGENTS.md — sprint subagent briefs

You were spawned by a Claude Code session to give an **independent** read of a sprint. You have
not seen the implementer's reasoning, and that is the point: report what you find, not what you
expect the author meant. Full loop and formats: `sprints/README.md`, `sprints/_template/README.md`.

Standard commands: `package.json` scripts: `npm run lint|typecheck|test|verify`. Node modules are
installed natively on this Windows box, so `npx vitest run <file>` works. Never use `>` to write a
file from PowerShell — 5.1 redirection writes UTF-16LE (use a tool's `--out`/`--output=` flag).

## `Check sprint NN` — pre-flight, read-only

Write no code, edit no file, run no git command that writes. Report in your reply.
1. Read this file, then `sprints/NN/GOAL.md`, `PLAN.md`, `ACCEPTANCE.md`.
2. State what the pack obligates the implementer to do, in order, in your own words.
3. Answer with specifics, not paraphrase: how many scored ids and what the denominator excludes ·
   the pass gate · which tasks have a mandatory order and why · every guardrail that forbids
   something · the exact verify command and grade-file path.
4. **Most important — name everything ambiguous, contradictory, or likely to go wrong.** Check the
   pack against the repo, not just against itself: `file:line` cites that do not point at what the
   prose says, exact expected strings or numbers the PLAN's formulas would not produce, existing
   tests the PLAN would turn red that are not in its authorised list, checks that need human
   judgment, and any check impossible to PASS as written. A clean bill of health is a FAILED
   review if real gaps exist.
5. Return each defect with severity (blocker / will-cost-a-round / minor), evidence, and the
   smallest fix. **Never edit the pack yourself.**

`node scripts/verify.mjs check-pack sprints/NN` is read-only and catches the mechanical defects;
it cannot tell whether a cite points at the RIGHT line — that is your job.

## `Grade sprint NN` — grader, writes `SCORECARD.md` only

1. Read `sprints/NN/ACCEPTANCE.md`, `sprints/NN/verify.txt`, and `sprints/NN/changes.diff`. Read
   `src/` only to confirm a specific line the diff or a check points at.
2. Write `sprints/NN/SCORECARD.md`: every id in `ACCEPTANCE.md`, exactly once, `PASS` or `FAIL`,
   with `verify.txt:<line>` or `<file>:<line>` as evidence, in the format
   `- A1 | PASS | verify.txt:14 typecheck PASS`. End with `PASS ÷ total = NN%`.
3. Write nothing else. Do not fix code, do not edit `ACCEPTANCE.md`, `ACCEPTANCE.sha256`,
   `verify.txt`, or `FIXES.md`.

Hard rules (each is enforced by `tests/sprint-pack.test.ts`, which runs inside `npm run verify`):
- Grade EVERY id exactly once. An omitted id fails the guard. A FAIL is fine — an ungraded check is not.
- Never mark PASS without evidence. "Looks correct" is not evidence. If a check names a test, find
  that test's result in `verify.txt`; if no test covers it, it is a FAIL with that reason.
- **`evidence: manual`** means the check is confirmed by doing something rather than reading a
  file — cite the command you ran and its result, or what you inspected. **`M`-prefixed ids** are
  excluded from the denominator; grade them anyway, and mark `FAIL | not run — Keagan` for any you
  cannot run.
- `verify.txt` must be the raw output of a FULL `npm run verify` (`--out`, UTF-8). A `--only`
  subset self-labels and the guard rejects it — grade that as an `R1` FAIL.
- `R` gates void the sprint on any FAIL regardless of the percentage. Be strict on them: they are
  where an implementer solves the right problem in the wrong place.
- `npm run verify` proves CODE, not content shipped. Content changes still need `npm run db:seed`
  against prod (CLAUDE.md §6).
