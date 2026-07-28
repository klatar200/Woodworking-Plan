# Sprint NN — PLAN

Executor: **Cursor**. Tasks are ordered; do not reorder.
Read `GOAL.md` first — its "Out of scope" list is enforced by the `R` gates in `ACCEPTANCE.md`.

**Model: `<Auto | premium>`** — <one line of why>. Advisory: no file can set Cursor's model, the
picker is set before this file is read. Claude states the recommendation here so Keagan is
prompted at dispatch instead of having to remember. Default is **Auto** (unlimited on Pro);
premium only for a genuinely hard slice, and note which task needs it.

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
Grade every `ACCEPTANCE.md` id in `SCORECARD.md` citing `verify.txt:<line>` or `<file>:<line>`.
Do not edit `ACCEPTANCE.md`. Commit to the sprint branch; do not push or merge.
