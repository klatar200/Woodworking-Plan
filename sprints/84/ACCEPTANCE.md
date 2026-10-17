# Sprint 84 — ACCEPTANCE

Bar author: Claude Code. Written before implementation. Grader: a fresh-context subagent
(`AGENTS.md` `Grade sprint NN`) — never the implementing session.
Locked by `ACCEPTANCE.sha256`.

Grade = PASS ÷ **14** — the `A` and `R` ids only (A1–A9 + R1–R5). Gate = **≥95%** (14/14). Any
`R` FAIL voids the sprint regardless of grade.

`M` ids are **excluded from the denominator**. Grade them like any other id; if one cannot be run,
mark it `FAIL` with evidence `not run — Keagan`.

Evidence format: `verify.txt:<line>` or `<file>:<line>` for every `A`/`R` id. For `evidence: manual`,
cite the command run and its output. For `evidence: verify.txt`, cite the line where the test file
that asserts the statement passed; a statement no test asserts is a FAIL.

Baseline for every "before" comparison: the commit that added this pack's `ACCEPTANCE.sha256`
(`git log --format=%H -1 -- sprints/84/ACCEPTANCE.sha256`) — `git show <lock-sha>:<file>`.
`changes.diff` is cut against the same SHA.

"The 29 plans" = the slugs listed in PLAN T2.

---

## Dependencies (T1)

- [ ] A1 | In `package-lock.json`, `node_modules/next` is version ≥ 15.5.28 and < 16.0.0, and `package.json` declares `"next": "^15.5.28"` | evidence: file:line
- [ ] A2 | In `package-lock.json`, `node_modules/sharp` ≥ 0.35.5, `node_modules/undici` ≥ 6.29.1, `node_modules/source-map-js` ≥ 1.2.2, and `node_modules/postcss` ≥ 8.5.23 | evidence: file:line
- [ ] A3 | `sprints/84/audit.txt` contains no `Severity: critical`, and every advisory package it names is `deepmerge-ts`, `@prisma/config` or `prisma` | evidence: file:line
- [ ] A4 | The `package.json` diff against baseline is exactly one changed line, the `next` range | evidence: file:line

## Catalog (T2)

- [ ] A5 | Each of the 29 files `content/plans/<slug>.json` has exactly one changed line in the diff, `"published": true` → `"published": false` | evidence: file:line
- [ ] A6 | Exactly 610 files in `content/plans/` contain `"published": true` | evidence: manual

## Guard (T3)

- [ ] A7 | A `tests/content.test.ts` test asserts that every cut-list part of every published plan has 0 < thicknessIn ≤ 4, 0 < widthIn ≤ 48 and 0 < lengthIn ≤ 120, and it passes | evidence: verify.txt
- [ ] A8 | A `tests/content.test.ts` test asserts that no published plan's slug ends in `-metric`, and it passes | evidence: verify.txt
- [ ] A9 | A `tests/content.test.ts` test asserts that the bounds check flags a 19 × 140 × 775 part and a part with lengthIn 0, and passes a 4 × 48 × 120 part, and it passes | evidence: verify.txt

---

## Regression gate — any FAIL voids the sprint

- [ ] R1 | `npm run verify` reports all four steps PASS and `=== EXIT: 0 ===` | evidence: verify.txt
- [ ] R2 | No change under `src/`, `prisma/`, `public/` or `scripts/`, and no change to any `content/` file other than the 29 | evidence: file:line
- [ ] R3 | No existing test assertion is changed, deleted, or skipped; `tests/content.test.ts` only gains lines | evidence: file:line
- [ ] R4 | The key sets of `dependencies`, `devDependencies` and `overrides` in `package.json` are unchanged from baseline | evidence: file:line
- [ ] R5 | In `package-lock.json`, the major versions of `next` (15), `react` and `react-dom` (19), `@clerk/nextjs` (6), `@prisma/client` and `prisma` (6) are unchanged from baseline | evidence: file:line

## Manual — graded, not scored (outside the 14)

- [ ] M1 | `npm run build` succeeds | evidence: manual
- [ ] M2 | After the deploy and `npm run db:seed`: `/plans/wall-mounted-wine-rack-metric` and `/plans/tile-headboard-queen-size` return 404 on notchplans.com; `/browse` says "610 plans"; `/plans/wall-mounted-wine-rack` returns 200 and its images load through `/_next/image` with status 200; signed-in `/designer` loads; the console shows no error other than Clerk's development-keys warning | evidence: manual
- [ ] M3 | The Vercel build log for the deployed commit names Next.js 15.5.x with x ≥ 28 | evidence: manual
