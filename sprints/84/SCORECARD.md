# Sprint 84 — SCORECARD

Grader: fresh-context subagent (`AGENTS.md` `Grade sprint NN`). Baseline = lock commit `e8d4a73`;
graded HEAD = `3b159e9` (working tree clean). Evidence: `sprints/84/verify.txt` (full run, all four
steps at :1,:3,:5,:244, no subset marker, `=== EXIT: 0 ===`), `sprints/84/changes.diff` (byte-identical
to `git diff e8d4a73 HEAD`, checked with `cmp`), `sprints/84/audit.txt`. Baseline package files read
with `git show e8d4a73:package.json` / `git show e8d4a73:package-lock.json` and compared key-by-key
with a throwaway script (deleted).

## Dependencies (T1)

- A1 | PASS | package-lock.json:7918-7919 `node_modules/next` version 15.5.28 (≥15.5.28, <16); package.json:54 `"next": "^15.5.28"`
- A2 | PASS | package-lock.json:8970-8971 sharp 0.35.5; :9978-9979 undici 6.29.1; :9129-9130 source-map-js 1.2.2; :8382-8383 postcss 8.5.30
- A3 | PASS | sprints/84/audit.txt:4 only severity line is `Severity: high` (no `critical`); advisory packages named are deepmerge-ts (:3,:7), @prisma/config (:8,:10), prisma (:11,:13) only
- A4 | PASS | sprints/84/changes.diff:1656-1667 package.json has one hunk, one `-`/`+` pair: `"next": "^15.2.0"` → `"^15.5.28"`
## Catalog (T2)

- A5 | PASS | sprints/84/changes.diff:1-319 has 29 content file headers, exactly the 29 PLAN T2 slugs (20 metric + 9); 29 hunks, every changed line is `-  "published": true` / `+  "published": false` (29 each, `uniq -c`), e.g. :8-9
- A6 | PASS | manual: `grep -l '"published": true' content/plans/*.json | wc -l` → 610 (node fs count agrees: 610 of 1128)

## Guard (T3)

- A7 | PASS | verify.txt:84 tests/content.test.ts (42 tests) passed; tests/content.test.ts:142 bounds 4/48/120, :144-151 implausibleParts flags any dim not in (0, bound], :154-162 published plans' offenders toEqual([])
- A8 | PASS | verify.txt:84; tests/content.test.ts:165-170 published slugs ending `-metric` toEqual([])
- A9 | PASS | verify.txt:84; tests/content.test.ts:181 part(19,140,775) toHaveLength(1), :182 part(0.75,3.5,0) toHaveLength(1), :183 part(4,48,120) toEqual([])

## Regression gate

- R1 | PASS | verify.txt:250-254 typecheck/lint/test/content PASS and `=== EXIT: 0 ===`; verify.txt:180-181 134/134 files, 1565/1565 tests; :246 1128 files, 0 problems
- R2 | PASS | sprints/84/changes.diff:1,12,…,309,320,1656,1669,1693,1953 are the 34 file headers: 29 PLAN content files, package-lock.json, package.json, sprints/84/audit.txt, sprints/84/verify.txt, tests/content.test.ts; none under src/, prisma/, public/, scripts/
- R3 | PASS | sprints/84/changes.diff:1953-2026 tests/content.test.ts has zero removed lines (grep `^-[^-]` count 0), only added lines (import at :9, block at :134-185 of the file); no other tests/ file in the diff; no skip/only added
- R4 | PASS | package.json dependencies (14), devDependencies (18), overrides (1) key sets identical to `git show e8d4a73:package.json` (script compare: SAME ×3); changes.diff:1663-1664 only changed line
- R5 | PASS | package-lock.json:7919 next 15 (15.5.20→15.5.28), :8587 react 19.2.7, :8596 react-dom 19.2.7, :521 @clerk/nextjs 6.39.5, :2213 @prisma/client 6.19.3, :8462 prisma 6.19.3 — all identical to baseline lock

## Manual (not scored)

- M1 | FAIL | not run — Keagan (npm run build writes .next; grader may write only SCORECARD.md)
- M2 | FAIL | not run — Keagan (post-deploy + db:seed live check on notchplans.com not possible here)
- M3 | FAIL | not run — Keagan (Vercel build log for the deployed commit not available before push)

---

PASS ÷ 14 = 14 ÷ 14 = 100% (A and R ids only). Gate ≥95% (14/14) met. No R id failed.
