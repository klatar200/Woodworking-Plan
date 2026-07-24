---
name: sprint-close
description: Close a Notch sprint — DoD, BUILD_PLAN §6 score ≥95%, SPRINT_LOG. Use when finishing a sprint or writing the score entry.
---

# Sprint close

1. Deliverables = current `BUILD_PLAN.md` §4 only
2. `npm run lint && npm run typecheck && npm test`
3. Score §6 with one-line evidence each (total ≥95; else fix≤3 then escalate)
4. Append `SPRINT_LOG.md` (number, date, summary, score, breakdown, SHA)
5. Business answers only → `DECISIONS_LOG.md`
6. After push, check Actions runs

Do not invent scope from `FUTURE_IDEAS.md`.
