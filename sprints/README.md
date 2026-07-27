# Sprints

One folder per sprint. The folder is the **only** interface between Claude Code and Cursor —
no plan, scorecard, or fix list is ever pasted between chat windows again.

Packs are for sprints. A change touching fewer than ~3 files goes direct; the pack would cost
more than the work.

## Topology — read this before the loop

The three actors do **not** share a working tree:

- **Claude Code** edits Keagan's local checkout directly.
- **Cursor runs in Cursor Cloud** — its own VM, its own clone (`AGENTS.md`). It sees a pack only
  after that pack is **pushed**, and its work reaches Keagan only after Keagan **pulls**.
- **Keagan** owns every `git` operation. Both agents are read-only with respect to git.

So `origin/main` is the actual transport, and the pack is the payload. Every handoff between
Claude and Cursor costs one push and one pull. That is the price of Cursor being in the cloud —
it is still far cheaper than re-pasting the context, which is what it replaces.

## The loop

| # | Actor | Model | Does | Writes |
|---|-------|-------|------|--------|
| 1 | Claude Code | **Opus** | Reads CLAUDE.md + BUILD_PLAN §4 + your change list. No repo re-audit. | `GOAL.md` `PLAN.md` `ACCEPTANCE.md` |
| 2 | Keagan | — | Lock the bar, **commit + push the pack** so Cursor Cloud can see it. | `ACCEPTANCE.sha256` |
| 3 | Cursor | Auto / premium | Pulls, opens the folder itself, implements PLAN.md in order, **pushes a `cursor/*` branch**. | source · `verify.txt` · `SCORECARD.md` |
| 4 | Keagan | — | **Fetch**, then diff that branch against `main`. Merge only after the audit passes. | `changes.diff` |
| 5 | Claude Code | **Sonnet** | Audits diff + verify.txt against the bar. §7 invariants, security, architecture. | `FIXES.md` |
| 6 | Keagan | — | **Commit + push `FIXES.md`.** | — |
| 7 | Cursor | Auto | Pulls, reads `FIXES.md` only, re-runs verify, **pushes**. | `verify.txt` `SCORECARD.md` |
| — | | | **<95% → back to 4. Max 3 rounds, then escalate (CLAUDE.md §4).** | |
| 8 | Claude Code | **Opus** | Closes out, opens the next pack. | `SPRINT_LOG.md` · `sprints/<NN+1>/` |

Model routing is the point of step 5 vs 1/8: auditing a diff against a written bar is
mechanical and belongs on Sonnet. Planning and closing need judgment and belong on Opus.

**If you ever run Cursor locally instead of in the Cloud**, steps 2/4/6 collapse into a single
commit and the loop shrinks by two git operations. Nothing else changes — the pack is the same.

## The four standing prompts

**1 — open the sprint (Claude Code, Opus)**
```
Plan sprint NN. Changes I want:
- <your list, in your own words>

Write sprints/NN/GOAL.md, PLAN.md, ACCEPTANCE.md.
Agent-focused, not human-readable. Don't re-audit the repo.
```
Then lock and publish the pack. `lock` writes a file, so it runs in your shell, never from the
Claude sandbox (CLAUDE.md §5). **Cursor Cloud cannot see the pack until it is pushed.**
```
node scripts/verify.mjs lock sprints/NN
git add -A; git commit -m "sprint NN: pack"; git push
```

**2 — hand off (Cursor)**
```
Pull main, then read sprints/NN/. Implement PLAN.md in order.
Then run: npm run verify > sprints/NN/verify.txt 2>&1
Grade every ACCEPTANCE.md check in sprints/NN/SCORECARD.md,
citing verify.txt or file:line as evidence. Don't edit ACCEPTANCE.md.
Commit and push verify.txt and SCORECARD.md with the code.
```

Cursor Cloud pushes a `cursor/sprint-NN-*` branch, not `main`. Fetch it and diff the branch
against `main` — substitute the real branch name, this is a template not a runnable line:
```
git fetch origin
git diff "origin/main...origin/cursor/<real-branch-name>" --output=sprints/NN/changes.diff
```
Three properties of that command are load-bearing, each learned the hard way in Sprint 75:
- **`--output=`, never `>`.** PowerShell 5.1 redirection writes **UTF-16LE**, which every text
  tool downstream then fails to parse. `--output=` makes git write the file as UTF-8.
- **Quoted.** PowerShell parses a bare `@{` as a hashtable literal and eats it.
- **Three dots.** `A...B` is "what B added since it diverged from A" — correct against a branch,
  and it does not require merging first.

Audit before merging. Once the audit passes:
```
git merge --ff-only origin/cursor/<real-branch-name>
git push
```

**3 — audit (Claude Code, Sonnet)**
```
Audit sprints/NN. Append FIXES.md — gaps only, exact remediation.
```
Then publish the delta so Cursor Cloud can see it:
```
git add -A; git commit -m "sprint NN: fixes round N"; git push
```

**4 — fix round (Cursor)**
```
Pull main, then read sprints/NN/FIXES.md. Apply only those fixes.
Re-run verify, update verify.txt and SCORECARD.md, commit and push.
```

Then repeat the pull-and-diff pair from step 2 and go back to prompt 3.

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
