# Sprint Log

Every sprint's outcome, in order. Use one entry per sprint, including
every remediation attempt, per `BUILD_PLAN.md` §7. No sprint entry is
complete without its full scorecard breakdown.

Entry template:

```
## Sprint N: <name>
**Dates:** <start> – <end>
**Scope (from BUILD_PLAN.md §4):** <deliverables actually attempted>
**PR(s):** <link(s)>

### Attempt 1
| Category | Score | Evidence |
|---|---|---|
| Requirements fidelity (/25) | | |
| Correctness & functionality (/20) | | |
| Automated test coverage (/15) | | |
| Security (/15) | | |
| Code quality & simplicity (/10) | | |
| Mobile/offline behavior (/10) | | |
| Documentation & handoff (/5) | | |
| **Total (/100)** | | |

**Result:** Pass (≥95) / Fail — remediation needed
**If fail:** what's wrong, what was fixed, then re-score as Attempt 2.

### Attempt 2 (only if Attempt 1 failed)
...

### Final outcome
Score: __ /100 — Pass / Escalated to user after 3 attempts (see notes).
```

---

*(No sprints have started yet — Sprint 0 is gated on the Pre-Sprint-0
decisions in `BUILD_PLAN.md` §3. This file will get its first real entry
once those are confirmed and Sprint 0 begins.)*
