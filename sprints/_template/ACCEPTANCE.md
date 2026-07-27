# Sprint NN — ACCEPTANCE

Bar author: Claude Code. Written **before** implementation. Grader: Cursor.
Locked by `ACCEPTANCE.sha256` — see `sprints/_template/README.md`.

Grade = PASS ÷ <total>. Gate = **≥95%**. Any `R` FAIL voids the sprint regardless of grade.

---

## <group name — e.g. "Search ordering (T1)">

- [ ] A1 | <binary statement> | evidence: verify.txt
- [ ] A2 | <binary statement> | evidence: file:line

## <group name>

- [ ] A3 | <binary statement> | evidence: manual

---

## Regression gate — any FAIL voids the sprint

<Derive these from GOAL.md "Out of scope" plus the §7 invariants in PLAN.md. These are the
checks that catch an executor solving the right problem in the wrong place.>

- [ ] R1 | Zero files changed outside the paths named in PLAN.md | evidence: file:line
- [ ] R2 | No existing test's assertions modified | evidence: file:line
- [ ] R3 | No new dependency in `package.json` | evidence: file:line

## Manual — Keagan's box only

<Only what a script genuinely cannot check: browser walkthroughs, `next build`, prod seed.
Every line here costs human minutes — if `npm run verify` could prove it, it belongs above.>

- [ ] M1 | <browser path, stated as click-by-click> | evidence: manual
