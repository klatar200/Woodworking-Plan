# Sprint pack — file ownership and formats

Copy this directory to `sprints/<NN>/` to open a sprint. Delete this README from the copy.

## Ownership — one writer per file, no exceptions

| File | Writer | Never written by |
|------|--------|------------------|
| `GOAL.md` | implementing session | — |
| `PLAN.md` | implementing session | — |
| `ACCEPTANCE.md` | implementing session, before any code | **grader subagent** |
| `ACCEPTANCE.sha256` | implementing session (`verify.mjs lock`) | grader subagent |
| `verify.txt` | `npm run verify -- --out` | hand-edited by anyone |
| `SCORECARD.md` | **grader subagent** (fresh context) | **implementing session** |
| `changes.diff` | `git diff <lock-sha> HEAD --output=` | — |
| `FIXES.md` | implementing session | grader subagent |

Two rules produce everything else:

1. **The context that writes the bar and the code never writes the grade.** The implementing
   session authors `ACCEPTANCE.md` before any code exists; a fresh-context grader subagent grades
   against it. Self-grading is what the original loop allowed.
2. **The bar is locked.** `ACCEPTANCE.sha256` is written at plan time and checked by
   `tests/sprint-pack.test.ts`. Editing `ACCEPTANCE.md` afterwards turns the suite red.

## ACCEPTANCE.md line format — machine-parsed, do not improvise

```
- [ ] A1 | <binary statement> | evidence: verify.txt
- [ ] A2 | <binary statement> | evidence: file:line
- [ ] A3 | <binary statement> | evidence: manual
```

- **Id** = 1–2 uppercase letters + integer. Unique in the file; contiguous from `1` within
  each prefix. Conventional prefixes: `A` acceptance, `R` regression gate, `M` manual-only.
- **Statement** must be binary. "Search returns results ordered by `publishedAt DESC`" — not
  "search feels better". If a human has to judge it, it is not a check.
- **evidence:** is exactly one of `verify.txt`, `file:line`, `manual`.
- `R` gates void the sprint on any FAIL, regardless of the percentage.

## SCORECARD.md line format — machine-parsed

```
- A1 | PASS | verify.txt:14 typecheck PASS
- A2 | FAIL | src/lib/plans.ts:22 published filter still missing
```

Every id in `ACCEPTANCE.md` must appear exactly once with `PASS` or `FAIL` and a concrete
evidence string. A missing id is a **test failure**, not an oversight — that is the whole
point of the guard.

State the grade as `PASS ÷ total = NN%`. Gate is **≥95%**.

## FIXES.md format

Appended per round by Claude. One `## Round N` heading per round, max 3 — a `## Round 4`
heading fails the guard test, which is the CLAUDE.md §4 escalation rule made mechanical.

Each entry names the failing check id, the root cause in one line, and the exact remediation:

```
## Round 1

### A2 — published filter dropped
`src/lib/plans.ts:22` — `queryPlans` no longer applies `published: true`.
Fix: restore the filter in the shared helper, not in the page.
```
