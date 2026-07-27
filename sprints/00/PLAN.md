# Sprint 00 — PLAN

Executor: **Claude Code** (see GOAL.md "Out of scope"). Cursor is not used in this sprint;
its first task under the new protocol is sprint 47.

Tasks are ordered. Do not reorder — T3 depends on the format T2 defines.

---

## T1 · Verify runner

**Create** `scripts/verify.mjs`

Runs four steps **in sequence, continuing past failures** so one broken step never hides the
other three. Chaining with `&&` in an npm script is explicitly rejected for this reason.

| id | command |
|----|---------|
| `typecheck` | `npx tsc --noEmit` |
| `lint` | `npx eslint .` |
| `test` | `npx vitest run` |
| `content` | `node scripts/validate-plans.mjs` |

Requirements:
- Stream each step's stdout/stderr through to the parent, prefixed with `[<id>]`.
- After all four, emit this block **verbatim in this shape** — it is the contract SCORECARD cites:

```
=== VERIFY SUMMARY ===
typecheck: PASS
lint: PASS
test: FAIL
content: PASS
=== EXIT: 1 ===
```

- Exit code = `0` only if all four PASS, else `1`.
- Accept `--only <id>[,<id>]` to re-run a subset during fix rounds.
- No network. No database. No `db:seed`.

**Edit** `package.json` — add to `scripts`:
```
"verify": "node scripts/verify.mjs"
```
Place it directly after `"test:watch"`. Add a `"// verify"` comment key above it in the existing
house style explaining the continue-past-failure rule.

**Guardrail:** `verify` must not invoke `next build` (SWC SIGBUS in sandbox, CLAUDE.md §5) and must
not require `.env.local` (it runs where no secrets exist).

**Known gap to state in the comment:** verify proves code, not *content shipped*. Content changes
still require `npm run db:seed` against prod (CLAUDE.md §6). Content sprints must carry a manual
acceptance check for it.

---

## T2 · Sprint pack template + format spec

**Create** `sprints/_template/GOAL.md`, `PLAN.md`, `ACCEPTANCE.md` — skeletons mirroring the
structure of `sprints/00/*`, with instructional placeholders.

**Create** `sprints/_template/README.md` stating file ownership (Claude: GOAL/PLAN/ACCEPTANCE/FIXES;
Cursor: verify.txt/SCORECARD; Keagan: changes.diff) and the two formats below.

### ACCEPTANCE.md line format — fixed, machine-parsed
```
- [ ] A1 | <binary statement> | evidence: verify.txt
- [ ] A2 | <binary statement> | evidence: file:line
- [ ] A3 | <binary statement> | evidence: manual
```
Ids are 1–2 uppercase letters + integer, unique in the file, contiguous from `1` **within each
prefix group**. Conventional prefixes: `A` acceptance, `R` regression gate, `M` manual-only.
`evidence:` is one of `verify.txt`, `file:line`, `manual`. Statements must be binary — no
"improved", "clean", "better".

### SCORECARD.md line format — fixed, machine-parsed
```
- A1 | PASS | verify.txt:14 typecheck PASS
- A2 | FAIL | src/lib/foo.ts:22 still throws
```
Every id in ACCEPTANCE must appear. Grade = PASS count ÷ total, stated as a percentage.

**Create** `sprints/README.md` — one screen: the six-step loop, the four standing prompts, the
model routing (Opus for plan/close, Sonnet for audit), the 3-round cap.

---

## T3 · Structural guard test

**Create** `tests/sprint-pack.test.ts`. This is the enforcement core — it converts protocol
violations from "something Keagan might notice" into red CI.

For every `sprints/<NN>/` where `NN` matches `^\d+$` (skip `_template`):

| # | Assertion | Catches |
|---|-----------|---------|
| 1 | `GOAL.md`, `PLAN.md`, `ACCEPTANCE.md` all present | half-opened sprint |
| 2 | ACCEPTANCE ids parse, are unique, and are contiguous from `1` within each prefix group | malformed bar |
| 3 | Every ACCEPTANCE statement is non-empty and has a valid `evidence:` token | vague bar |
| 4 | If `SCORECARD.md` exists: every ACCEPTANCE id appears with `PASS` or `FAIL` | **Cursor silently skipping a check** |
| 5 | If `SCORECARD.md` exists: `verify.txt` exists and contains `=== VERIFY SUMMARY ===` | grading without running verify |
| 6 | If `ACCEPTANCE.sha256` exists: recomputed hash of `ACCEPTANCE.md` matches | **Cursor editing the bar it is graded against** |
| 7 | `FIXES.md` contains no heading matching `Round [4-9]` | fix loop past the CLAUDE.md §4 cap |

Assertion 6 requires T4. Assertions 4–6 are skipped when `SCORECARD.md` is absent, so an
in-flight sprint never reddens the suite.

**Guardrail:** this test reads the filesystem only. No mocks, no network, no DB. It must pass on a
repo with zero sprint folders.

---

## T4 · Acceptance lock

Extend `scripts/verify.mjs` with a subcommand `node scripts/verify.mjs lock <sprintDir>`:
writes `sha256(ACCEPTANCE.md)` to `<sprintDir>/ACCEPTANCE.sha256`.

Run at the end of step 01 (plan). Guard-test assertion 6 then makes any later edit to
ACCEPTANCE.md a test failure. Tamper-evident, zero ceremony.

**Runs natively, not from the Claude sandbox.** `lock` writes a file, and CLAUDE.md §5 forbids
bash-writing the mount. Claude hands the command to Keagan in the closing message.

**Guardrail:** lock is written by the planner only. Never re-lock to clear a failure — a genuine
bar change means the sprint is being re-scoped, which is a Keagan decision per CLAUDE.md §4.

---

## T5 · Agent contracts

**Edit** `AGENTS.md` — append a `## Sprint pack protocol` section:
- The standing four-line Cursor prompt (implement) and three-line prompt (fix round), verbatim.
- Cursor's hard rules: never edit `ACCEPTANCE.md`; never mark PASS without a `verify.txt` line or
  `file:line`; never exceed PLAN.md's declared paths; on a fix round read `FIXES.md` only.
- Model routing: Auto for rote and fix rounds, premium for the hard slice.

**Edit** `CLAUDE.md` — append `## 9. Sprint pack protocol`:
- Six-step loop and file ownership table.
- **Never re-audit the repo at session start** — read `CLAUDE.md` + `BUILD_PLAN` §4 + the pack.
- **Audit from `changes.diff` + `verify.txt`**, not from re-reading `src/`.
- ACCEPTANCE derives from BUILD_PLAN §6; the bar's author never writes SCORECARD.
- Model routing: Opus for plan/close, Sonnet for audit.
- The GOAL.md threshold rule (<3 files ⇒ no pack).

**Guardrail:** these are append-only edits. Do not restructure, renumber, or "tidy" existing
sections of either file — they are load-bearing context for both agents.

---

## T6 · Repo hygiene

**Edit** `.gitignore` — add:
```
sprints/*/changes.diff
```
Derived from git, regenerable, and large. Everything else in a sprint pack **is** committed —
that is what makes a sprint resumable after a context reset.

---

## T7 · Handoff

Produce for Keagan, in the closing message only:
1. The exact PowerShell block to run `npm run verify` and commit.
2. The four standing prompts, ready to paste.

Claude does not run `git` (CLAUDE.md §2/§5).

---

## Invariants this sprint must not break

- CLAUDE.md §7 in full — nothing here touches `src/`, so any §7 diff is a scope violation.
- `package.json` `vercel-build` unchanged. `vercel.json` gains no `buildCommand`.
- No new dependency. Runner uses `node:child_process` and `node:crypto` only.
- No existing test's assertions modified. New test file only.
- `npm run build` output byte-identical.
