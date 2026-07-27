# Sprint 75 — PLAN

Executor: **Cursor**. Tasks are ordered; do not reorder. T1 is the one that matters — if you run
short, T1 complete and T2–T5 untouched is a better outcome than all five half-done.

Read `GOAL.md` first. Its "Out of scope" list is enforced by the `R` gates in `ACCEPTANCE.md`.

---

## T1 · `CLAUDE.md` §6 truth pass

**Edit** `CLAUDE.md`, section `## 6. Current state`, the "Roadmap" line ONLY. Leave every other
line of §6 (Stack, Catalog, Indexing, Brand, Content→prod, Open items, Neon/Vercel, Scripts) alone
unless it states something `BUILD_PLAN` §4 contradicts.

Current text is stale:
> Phases 0–3 done; Phase 4 partial (…); Tailwind+theme (28–32), UX remediation (33–42), Notch
> rebrand (43–45) CLOSED; Sprint 46 catalog-UX shipped.

It stops at 46. `BUILD_PLAN` §4 has Sprints 73 and 74 CLOSED at 98/100 (2026-07-27).

Source of truth for the rewrite is `BUILD_PLAN` §4 — **read it, do not infer from git log**.
The replacement must state, at minimum:
- the closed tracks through Sprint 74, grouped as `BUILD_PLAN` §4 groups them
- **the Cutting Board Designer** (Sprints 51–74) — an entire product area §6 never mentions,
  despite §7 carrying designer invariants and `tests/` carrying ~20 designer test files
- the last closed sprint number and its date

Keep it one dense line in the existing §6 register. §6 is agent-read, not prose.

**Guardrail:** every status claim you write must be traceable to a line in `BUILD_PLAN` §4.
If §4 does not say it, do not write it. Inventing a status is worse than omitting one — this
file is what both agents believe.

---

## T2 · `SPRINT_LOG.md` compaction

5907 lines. Two defects beyond length:
1. **Ordering flips mid-file.** Descending 74→47 (lines 12–1419), then ascending 0→46
   (line 1420 to end).
2. **A stray template stub** `## Sprint N: <name>` sits at line 245, between real entries.

Produce:
- **Full detail retained** for Sprints **65–74** — verbatim, including the "Shell IA post-close
  audit" section at line 79.
- **One line each** for Sprints **0–64**, format:
  `- Sprint NN — <title> — <score or "not scored"> — <one clause on what shipped>`
- **Strictly newest-first** throughout.
- Template stub at line 245 **deleted**.

**Guardrail — the recorded grade is a fact, not prose.** Every score in the current file
(`96/100`, `98/100`, `not scored, by design`, …) must survive into its one-line entry unchanged.
Do not round, re-derive, or "correct" a score. If an entry has no score, write `not scored`.

**Guardrail:** non-sprint sections (`Catalog swap — ana-white → Kreg`, the QOL phases, the
pilot answer at line 4749) are history too. Compact them to one line each on the same rule;
do not silently drop them.

---

## T3 · `DECISIONS_LOG.md` compaction

1937 lines, ~60 `###` decision entries, already carrying a "Settled decisions — index" at line 8.

Rewrite each `###` entry to its binding outcome: **date, title, what is binding, and any
supersession**. Drop the deliberation — the options weighed, the back-and-forth, the rationale
paragraphs. Keep the conclusion and any constraint a future agent must obey.

Retain the index section at the top; update it if entries move.

**Guardrail — three things must survive verbatim or the log is worse than useless:**
1. **Every `###` heading** (date + title). The heading set before and after must be identical.
   Verify with `git show HEAD:DECISIONS_LOG.md`.
2. **Every ⛔ SUPERSEDED marker**, e.g. the 2026-07-13 R2-for-build-photos entry superseded by
   Vercel Blob. Lose that marker and an agent re-implements the superseded thing.
3. **Every standing constraint**: the Vercel Hobby monetization gate, cost-tiers-only, no
   affiliate links, credential rotation deferred to pre-go-live, one-database-labelled-production,
   `PlanView` carries no `userId`.

**Guardrail:** compaction is not judgement. A decision you think is obsolete still gets its line —
marking something obsolete is Keagan's call (CLAUDE.md §4).

---

## T4 · `COMPETITIVE_AUDIT_CBD.md` → `docs/`

**Move** to `docs/COMPETITIVE_AUDIT_CBD.md`. 496 lines of one-time research; it is not a
context file and does not belong at root alongside the operating docs. Use `git mv`.
Update any inbound reference (grep the repo first).

---

## T5 · Tracked root scratch artifacts

Candidates, all currently tracked at repo root:

| File | Suspected |
|------|-----------|
| `_harness.tgz` | build artifact |
| `run1-handoff.tgz` | Run 1 audit artifact |
| `run1-cut-step-preview.txt` | Run 1 audit artifact |
| `run1-ledger.json` | ⚠️ **force-committed on purpose** — `.gitignore` says "it IS the resume point" |
| `deterministic-defects.csv` | audit output |
| `missing-images-review.csv` | audit output |
| `missing-images-review-2026-07-23.csv` | audit output |
| `kreg_scraper.py` | catalog import, possibly superseded by `scripts/import-kreg-plans.mjs` |
| `scraper.py` | ana-white era, likely dead |

**Procedure — evidence before removal, per file:**
1. `git log --oneline -3 -- <file>` — when was it last touched?
2. Grep the repo for its name (scripts, docs, `.gitignore`, package.json, CI).
3. Remove with `git rm` **only if** no inbound reference exists AND it is not `run1-ledger.json`.
4. Anything you do not remove: say why in SCORECARD, one line.

**Guardrail:** `run1-ledger.json` is OUT OF SCOPE for removal this sprint regardless of what you
find. Its `.gitignore` negation is deliberate and re-deciding it is Keagan's call. Leave the two
`.py` scrapers in place if either is referenced anywhere, including in prose.

---

## Invariants this sprint must not break

Docs-only sprint, so the usual §7 blast radius is empty — with two exceptions that live *in* the
files being edited:

- **`CLAUDE.md` §7 is untouchable.** Every entry there broke production once. This sprint edits
  §6 and nothing else in that file.
- **`DECISIONS_LOG` supersession markers are load-bearing.** They are the only thing stopping an
  agent from building something already rejected (see the R2 → Vercel Blob entry).

## Verification

```
npm run verify > sprints/75/verify.txt 2>&1
```
Grade every `ACCEPTANCE.md` id in `sprints/75/SCORECARD.md`, citing `verify.txt:<line>` or
`<file>:<line>`. Do not edit `ACCEPTANCE.md`. Commit and push the pack files with the code.
