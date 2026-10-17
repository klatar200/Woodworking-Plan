# Sprint NN — PLAN

Executor: **Claude Code** (implementing session). Tasks are ordered; do not reorder.
Read `GOAL.md` first — its "Out of scope" list is enforced by the `R` gates in `ACCEPTANCE.md`.

---

## T1 · <task name>

**Create / Edit** `<exact/path.ts>`

<What to build. Agent-focused: name the function, the signature, the call site. Not prose.>

Requirements:
- <specific, checkable>
- <specific, checkable>

**Guardrail:** <the invariant this task is most likely to break, and the rule. Cite CLAUDE.md §7
by name where one applies — e.g. "every read goes through `src/lib/plans.ts`, never raw
`prisma.plan`".>

---

## T2 · <task name>

<...>

---

## Invariants this sprint must not break

<Copy the specific CLAUDE.md §7 entries in this sprint's blast radius. Not all of §7 — the ones
a reasonable executor could plausibly violate here. A list of forty is a list of none.>

- <invariant + why it broke prod once>
- <invariant + why it broke prod once>

## Verification

```
npm run verify -- --out sprints/NN/verify.txt
```
Never a shell redirect — `>` writes UTF-16LE on Windows and breaks every downstream parser.
Then `git diff <lock-sha> HEAD --output=sprints/NN/changes.diff` and hand grading to a fresh-context
subagent, which writes `SCORECARD.md` citing `verify.txt:<line>` or `<file>:<line>`. Do not edit
`ACCEPTANCE.md`.
