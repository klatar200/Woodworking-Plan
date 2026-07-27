# Sprint 00 — ACCEPTANCE

Bar author: Claude Code. Written before implementation. Grader: whoever executes T1–T7.
Locked via `ACCEPTANCE.sha256` once T4 lands.

Grade = PASS ÷ 22. Gate = **≥95%** (21/22). Below that: fix round, max 3, then escalate.
Any `R` FAIL voids the sprint regardless of grade.

---

## Verify runner (T1)

- [ ] A1 | `npm run verify` exists and runs without a `.env.local` present | evidence: verify.txt
- [ ] A2 | Output contains `=== VERIFY SUMMARY ===` with exactly the four ids `typecheck`, `lint`, `test`, `content`, each `PASS` or `FAIL` | evidence: verify.txt
- [ ] A3 | Output ends with `=== EXIT: 0 ===` on a clean tree | evidence: verify.txt
- [ ] A4 | A deliberately broken step does not prevent the other three from running and reporting | evidence: manual
- [ ] A5 | `verify` invokes neither `next build` nor `db:seed` nor any network call | evidence: file:line
- [ ] A6 | `--only test` runs only the test step | evidence: manual

## Template + spec (T2)

- [ ] A7 | `sprints/_template/` contains `GOAL.md`, `PLAN.md`, `ACCEPTANCE.md`, `README.md` | evidence: file:line
- [ ] A8 | `sprints/_template/README.md` states file ownership and both line formats | evidence: file:line
- [ ] A9 | `sprints/README.md` states the six-step loop, four standing prompts, model routing, 3-round cap | evidence: file:line

## Guard test (T3, T4)

- [ ] A10 | `tests/sprint-pack.test.ts` passes against the current repo | evidence: verify.txt
- [ ] A11 | Test FAILS when a SCORECARD omits an ACCEPTANCE id — demonstrated on a scratch fixture, not committed | evidence: manual
- [ ] A12 | Test FAILS when `ACCEPTANCE.md` is edited after `ACCEPTANCE.sha256` is written | evidence: manual
- [ ] A13 | Test PASSES on a sprint folder with no SCORECARD (in-flight sprint stays green) | evidence: manual

## Contracts + hygiene (T5, T6)

- [ ] A14 | `AGENTS.md` gains a `Sprint pack protocol` section containing both standing prompts verbatim; no existing section altered | evidence: file:line
- [ ] A15 | `CLAUDE.md` gains `## 9. Sprint pack protocol` stating no-re-audit, audit-from-diff, and model routing; §1–§8 byte-identical | evidence: file:line
- [ ] A16 | `.gitignore` contains `sprints/*/changes.diff`; no other pack file ignored | evidence: file:line

---

## Regression gate — any FAIL here voids the sprint regardless of grade

- [ ] R1 | Zero files changed under `src/`, `prisma/`, `content/`, `public/` | evidence: file:line
- [ ] R2 | No existing test's assertions modified | evidence: file:line
- [ ] R3 | No new dependency in `package.json` | evidence: file:line
- [ ] R4 | `vercel-build` unchanged; `vercel.json` has no `buildCommand` | evidence: file:line

## Manual — Keagan's box only

- [ ] M1 | `npm run verify` exits 0 on Windows before commit | evidence: manual
- [ ] M2 | `npm run build` still succeeds | evidence: manual
