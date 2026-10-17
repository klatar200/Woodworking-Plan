# Sprints

One folder per sprint. The folder is the sprint's state — not a chat transcript. A session that
hits its limit mid-sprint resumes from the folder.

Packs are for sprints. A change touching fewer than ~3 files goes direct; the pack would cost
more than the work.

## Who does what (Keagan 2026-10-16: Claude Code only)

Cursor is retired from the loop. **One native Claude Code session** plans, implements, verifies,
and closes, and runs `git` itself (native sessions are safe — CLAUDE.md §2/§5).

Independence — the reason the old loop had a second tool — is kept with **fresh-context
subagents**: one reads the pack cold before it is locked, a different one grades the work after.
Neither has seen the implementer's reasoning. Brief them with paths, never with conclusions: an
agent handed your verdict tends to return it confirmed.

| Actor | Writes |
|---|---|
| Implementing session | `GOAL.md` `PLAN.md` `ACCEPTANCE.md` `ACCEPTANCE.sha256` `FIXES.md` `verify.txt` `changes.diff` · code · commits |
| Pre-flight subagent | nothing — read-only report |
| Grader subagent | `SCORECARD.md` only |
| Keagan | decisions (scope, D-gates, escalations) |

## The loop

| # | Step | Detail |
|---|------|--------|
| 1 | **Plan** | Read CLAUDE.md + BUILD_PLAN §4 + the change list. No repo re-audit. Write GOAL / PLAN / ACCEPTANCE. |
| 2 | **Check** | Fresh-context subagent, read-only, using `AGENTS.md` §"Triggers" `Check` steps as its brief. It checks the pack against the repo: cites, exact strings, tests the PLAN would turn red, non-binary checks. |
| 3 | **Fix + lock** | Fix the findings, `node scripts/verify.mjs check-pack sprints/NN`, then `node scripts/verify.mjs lock sprints/NN`. Commit the pack. |
| 4 | **Implement** | On `main` (trunk-based, CLAUDE.md §4), task order as PLAN states. |
| 5 | **Verify** | `npm run verify -- --out sprints/NN/verify.txt` |
| 6 | **Diff** | `git diff <lock-sha> HEAD --output=sprints/NN/changes.diff` |
| 7 | **Grade** | A NEW fresh-context subagent reads ACCEPTANCE + verify.txt + changes.diff and writes SCORECARD.md. |
| — | **< 95% or any `R` FAIL** | Append `## Round N` to FIXES.md (delta only), fix, back to 5 with another fresh grader. **Max 3 rounds, then escalate (CLAUDE.md §4).** |
| 8 | **Close** | SPRINT_LOG + BUILD_PLAN §4, commit, push, check GitHub Actions and the deploy. |

**Order is load-bearing at step 3** (learned in Sprint 77): locking before the Check means its
findings either cannot be acted on or move the bar after the lock, which voids the sprint on a hash
mismatch. If the bar genuinely has to change after locking, that is a re-scope and it is Keagan's
call — delete the hash and re-lock deliberately, never as a reflex to clear a red check.

**`--output=`, never `>`**, for both verify and `git diff`: PowerShell 5.1 redirection writes
UTF-16LE, which every downstream text tool then fails to parse (Sprint 75). Diff against the lock
commit's SHA — never `HEAD~1`, never `HEAD@{1}`.

## Why this is enforced and not merely documented

`tests/sprint-pack.test.ts` runs inside `npm run verify`. It fails the suite when:

- a `SCORECARD.md` omits any `ACCEPTANCE.md` id
- a `SCORECARD.md` exists without a `verify.txt` containing a real summary block
- `ACCEPTANCE.md` was edited after `ACCEPTANCE.sha256` was written
- `FIXES.md` reaches a `## Round 4`
- a sprint folder is missing `GOAL` / `PLAN` / `ACCEPTANCE`, or its ids are malformed

Those fire *after* implementation. `lock` also refuses to seal a pack — and `check-pack` reports
the same thing without sealing — when:

- the stated denominator ≠ the count of `A`+`R` ids (Sprint 76 shipped a gate of 34/35 while two
  of the 35 were not the grader's to run: **mathematically unpassable**)
- the gate numerator ≠ `ceil(pct × scored)`
- an id is duplicated, or a prefix group is not contiguous from 1
- a `file:line` cite names a file that is not in the repo, or a line past the end of it — cites
  resolve as a repo-relative path, a bare basename, or any unique path **suffix**
  (`print/page.tsx`), because prose abbreviates once the full path has been given; a suffix
  matching several files warns rather than failing

```
node scripts/verify.mjs check-pack sprints/NN
```

**What that validator cannot do, and must not be trusted to.** It checks that a cite *resolves*,
not that it points at the right place. Sprint 77's `serialize.ts:197` was a line number copied off
the *test* file; the source file is longer than 197 lines, so every check above passes it. Cite
accuracy needs a reader who does not already know what the author meant — that is the Check step.
The validator shortens that review; it does not replace it.

A comment is not a mechanism. These are.

## Files

Everything in a pack is committed except `changes.diff` (gitignored — regenerable from git,
and large).

See `_template/README.md` for the ACCEPTANCE / SCORECARD line formats.
