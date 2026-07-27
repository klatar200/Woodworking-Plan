# Sprints

One folder per sprint. The folder is the **only** interface between Claude Code and Cursor —
no plan, scorecard, or fix list is ever pasted between chat windows again.

Packs are for sprints. A change touching fewer than ~3 files goes direct; the pack would cost
more than the work.

## The loop

| # | Actor | Model | Does | Writes |
|---|-------|-------|------|--------|
| 1 | Claude Code | **Opus** | Reads CLAUDE.md + BUILD_PLAN §4 + your change list. No repo re-audit. | `GOAL.md` `PLAN.md` `ACCEPTANCE.md` + lock |
| 2 | Cursor | Auto / premium | Opens the folder itself. Implements PLAN.md in order. | source · `verify.txt` · `SCORECARD.md` |
| 3 | Keagan | — | Commit, cut the diff. | `changes.diff` |
| 4 | Claude Code | **Sonnet** | Audits diff + verify.txt against the bar. §7 invariants, security, architecture. | `FIXES.md` |
| 5 | Cursor | Auto | Reads `FIXES.md` only. Re-runs verify. | `verify.txt` `SCORECARD.md` |
| — | | | **<95% → back to 3. Max 3 rounds, then escalate (CLAUDE.md §4).** | |
| 6 | Claude Code | **Opus** | Closes out, opens the next pack. | `SPRINT_LOG.md` · `sprints/<NN+1>/` |

Model routing is the point of steps 4 vs 1/6: auditing a diff against a written bar is
mechanical and belongs on Sonnet. Planning and closing need judgment and belong on Opus.

## The four standing prompts

**1 — open the sprint (Claude Code, Opus)**
```
Plan sprint NN. Changes I want:
- <your list, in your own words>

Write sprints/NN/GOAL.md, PLAN.md, ACCEPTANCE.md.
Agent-focused, not human-readable. Don't re-audit the repo.
```
Claude hands back a lock command to run before step 2 — `lock` writes a file, so it runs in your
shell, never from the Claude sandbox (CLAUDE.md §5):
```
node scripts/verify.mjs lock sprints/NN
```

**2 — hand off (Cursor)**
```
Read sprints/NN/. Implement PLAN.md in order.
Then run: npm run verify > sprints/NN/verify.txt 2>&1
Grade every ACCEPTANCE.md check in sprints/NN/SCORECARD.md,
citing verify.txt or file:line as evidence. Don't edit ACCEPTANCE.md.
```

**3 — audit (Claude Code, Sonnet)**
```
Audit sprints/NN. Append FIXES.md — gaps only, exact remediation.
```

**4 — fix round (Cursor)**
```
Read sprints/NN/FIXES.md. Apply only those fixes.
Re-run verify, update verify.txt and SCORECARD.md.
```

Between 2 and 3, and after every 4, you run:
```
git add -A; git commit -m "sprint NN: <summary>"
git diff HEAD~1 > sprints/NN/changes.diff
```

## Why this is enforced and not merely documented

`tests/sprint-pack.test.ts` runs inside `npm run verify`. It fails the suite when:

- a `SCORECARD.md` omits any `ACCEPTANCE.md` id
- a `SCORECARD.md` exists without a `verify.txt` containing a real summary block
- `ACCEPTANCE.md` was edited after `ACCEPTANCE.sha256` was written
- `FIXES.md` reaches a `## Round 4`
- a sprint folder is missing `GOAL` / `PLAN` / `ACCEPTANCE`, or its ids are malformed

A comment is not a mechanism. These are.

## Files

Everything in a pack is committed except `changes.diff` (gitignored — regenerable from git,
and large). Committing the rest is what makes a sprint resumable after a context reset: if a
Claude session hits its limit mid-sprint, nothing is lost.

See `_template/README.md` for the ACCEPTANCE / SCORECARD line formats.
