# Sprints

One folder per sprint. The folder is the **only** interface between Claude Code and Cursor —
no plan, scorecard, or fix list is ever pasted between chat windows again.

Packs are for sprints. A change touching fewer than ~3 files goes direct; the pack would cost
more than the work.

## Topology — read this before the loop

**All three actors share one working tree: Keagan's local checkout.** Cursor runs locally in his
Cursor, not in Cursor Cloud (decided 2026-07-28 — Cloud is metered, local is not). So there is no
transport, no push, no pull, and no waiting: a file Claude writes is a file Cursor reads.

What still separates the actors is **branches, not clones**:

- **Claude Code** edits the tree directly and runs no `git` at all — its sandbox mount corrupts
  `.git` (CLAUDE.md §5). That ban is unchanged and is about the sandbox, not about trust.
- **Cursor** owns four git verbs on its own branch: `checkout -b`, `add`, `commit`, `status`.
  It creates `cursor/sprint-NN-<slug>` off `main` and commits there. **Never** push, merge,
  rebase, reset, stash, or return to `main` — one tree, no remote copy, so a destructive verb
  costs the real repo.
- **Keagan** owns the branch boundary: cutting `changes.diff`, merging after the audit, pushing.

Branch isolation is what buys the audit-before-merge property that Cursor Cloud's separate clone
used to provide. It is the reason Cursor commits to a branch rather than straight into the tree:
without it there is no diff to audit and no clean way to unwind a failed round.

## The loop

| # | Actor | Model | Does | Writes |
|---|-------|-------|------|--------|
| 1 | Claude Code | **Opus** | Reads CLAUDE.md + BUILD_PLAN §4 + your change list. No repo re-audit. | `GOAL.md` `PLAN.md` `ACCEPTANCE.md` |
| 2 | Keagan | — | Lock the bar. Commit the pack to `main`. | `ACCEPTANCE.sha256` |
| 3 | Cursor | Auto / premium | Branches, opens the folder itself, implements PLAN.md in order, **commits to `cursor/*`**. | source · `verify.txt` · `SCORECARD.md` |
| 4 | Keagan | — | Diff that branch against `main`. Merge only after the audit passes. | `changes.diff` |
| 5 | Claude Code | **Sonnet** | Audits diff + verify.txt against the bar. §7 invariants, security, architecture. | `FIXES.md` |
| 6 | Cursor | Auto | Reads `FIXES.md` only, re-runs verify, commits to the same branch. | `verify.txt` `SCORECARD.md` |
| — | | | **<95% → back to 4. Max 3 rounds, then escalate (CLAUDE.md §4).** | |
| 7 | Keagan | — | Merge the branch, push. | — |
| 8 | Claude Code | **Opus** | Closes out, opens the next pack. | `SPRINT_LOG.md` · `sprints/<NN+1>/` |

Model routing is the point of step 5 vs 1/8: auditing a diff against a written bar is
mechanical and belongs on Sonnet. Planning and closing need judgment and belong on Opus.

The old cloud loop had a *push* between 2 and 3, a *fetch* at 4, and a *push/pull* pair around
the fix round. Running Cursor locally deletes all four — the pack is the same, the bar is the
same, only the transport is gone.

## The four standing prompts

**1 — open the sprint (Claude Code, Opus)**
```
Plan sprint NN. Changes I want:
- <your list, in your own words>

Write sprints/NN/GOAL.md, PLAN.md, ACCEPTANCE.md.
Agent-focused, not human-readable. Don't re-audit the repo.
```
Then lock the bar and commit the pack. `lock` writes a file, so it runs in your shell, never from
the Claude sandbox (CLAUDE.md §5). Cursor reads the pack off disk, so no push is needed — commit
anyway, so a context reset mid-sprint loses nothing.
```
node scripts/verify.mjs lock sprints/NN
git add -A; git commit -m "sprint NN: pack"
```

**2 — hand off (Cursor)**
```
Run sprint NN
```
That is the entire prompt. The six-step procedure it fires lives in `AGENTS.md` §"Triggers",
which Cursor loads from the repo root on its own — so it never has to be typed, and it stays
identical from sprint to sprint. Anything *specific* to this sprint belongs in `PLAN.md`
guardrails, never in the chat message. If a handoff needs a sentence of explanation, the pack
is wrong; fix the pack.

Cursor commits to a local `cursor/sprint-NN-*` branch and stops there. Diff it against `main` —
substitute the real branch name (it is at the top of `SCORECARD.md`); this is a template, not a
runnable line:
```
git diff "main...cursor/<real-branch-name>" --output=sprints/NN/changes.diff
```
Three properties of that command are load-bearing, each learned the hard way in Sprint 75:
- **`--output=`, never `>`.** PowerShell 5.1 redirection writes **UTF-16LE**, which every text
  tool downstream then fails to parse. `--output=` makes git write the file as UTF-8.
- **Quoted.** PowerShell parses a bare `@{` as a hashtable literal and eats it.
- **Three dots.** `A...B` is "what B added since it diverged from A" — correct against a branch,
  and it does not require merging first.

Without this file the audit falls back to reading `src/` directly, which costs several times more
Claude tokens for the same conclusion. It is the cheapest step in the loop and the one that pays.

Audit before merging. Once the audit passes:
```
git checkout main
git merge --ff-only cursor/<real-branch-name>
git push
```

**3 — audit (Claude Code, Sonnet)**
```
Audit sprint NN
```
`FIXES.md` lands on disk, which is all Cursor needs. Go straight to prompt 4.

**4 — fix round (Cursor)**
```
Fix sprint NN
```

Then re-cut `changes.diff` from step 2 and go back to prompt 3.

**Four prompts, and only the first one varies** — it carries your change list, which is the one
thing no file can know in advance. The other three are a verb and a number.

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
