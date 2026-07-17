# Parallel Plan Authoring — Coordination

Four lanes author `plans.json` → `content/plans/*.json` in parallel over
**disjoint** index ranges. Each lane is a **separate Claude session**. Paste the
matching `lane-N-prompt.md` into each session as its opening message.

## Range assignment (fixed — do not change mid-run)

| Lane | plans.json indices | Own log file |
|---|---|---|
| 1 | 406–614  | `PLAN_AUTHORING_LOG_lane1.md` |
| 2 | 615–823  | `PLAN_AUTHORING_LOG_lane2.md` |
| 3 | 824–1032 | `PLAN_AUTHORING_LOG_lane3.md` |
| 4 | 1033–1240 | `PLAN_AUTHORING_LOG_lane4.md` |

## The only rules that change vs. the solo run

1. **Each lane stays inside its range.** It never reads the shared
   `PLAN_AUTHORING_LOG.md` "next index" pointer and never writes to it.
   It stops when its own range is exhausted.
2. **Each lane logs to its own file** (column above), not the shared log.
3. Everything else in `PLAN_AUTHORING_BRIEF.md` applies unchanged —
   `published: false`, validator gate, §8 stop-and-ask, voice, the whole
   contract.

## Why this is safe

- One output file per plan; disjoint ranges ⇒ no two lanes ever write the
  same file. (Distinct files via Write/Edit is safe; the mount-corruption
  rule only bites on *same-file* writes.)
- The §6.1 slug-collision check still catches clashes with existing files.
- The validator is read-only over the whole dir — concurrent runs are fine.

## Residual risk the lanes CAN'T see live

Two lanes in different ranges may author the **same design from two source
pages** (a §8 near-duplicate) without knowing. That's expected. You resolve
it once, at the end — not during the run.

## Reconciliation (run in ONE session after all four lanes finish)

1. `node scripts/validate-plans.mjs content/plans` — must report 0 problems
   across the whole directory.
2. Duplicate-slug + near-duplicate-design sweep across all four ranges
   (list `content/plans/`, look for same-design pairs authored from
   different source pages). Resolve per §8.
3. Merge the four `PLAN_AUTHORING_LOG_laneN.md` files back into the main
   `PLAN_AUTHORING_LOG.md`, and set its "Next source index to start from"
   to reflect true completion.
