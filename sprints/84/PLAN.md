# Sprint 84 — PLAN

Executor: **Claude Code** (implementing session, native, on `main`). Do T1, T2, T3 in order, then
verify and grade. T4 runs only after the graded sprint is pushed and its deploy is green. Grading is
done by a fresh-context subagent (`AGENTS.md` `Grade sprint NN`), never by the implementing session.

Read `GOAL.md` first — its "Out of scope" list is enforced by the `R` gates.

---

## T1 · Patch production dependencies (S-01)

0. Stop any running `next dev` first. `npm install` runs `prisma generate` on postinstall, and on
   Windows a held Prisma engine DLL fails with EPERM.
1. Run `npm audit fix` from the repo root. Never add `--force`: it would take Next 16 / Prisma 7.
   Measured before locking on a copy of the lockfile, it moves only lockfile versions:
   - `next` 15.5.20 → 15.5.28
   - `sharp` 0.35.3 → 0.35.5
   - `postcss` 8.5.18 → 8.5.30
   - `source-map-js` 1.2.1 → 1.2.2
   - `undici` 6.27.0 → 6.29.1
   - `nanoid` 3.3.16 → 3.3.20

   There are also incidental transitive bumps, all expected and not out of scope:
   - sharp-libvips 1.3.4
   - Next's nested sharp tree removed
   - dev lock entries such as brace-expansion, js-yaml, jsdom's undici, and eslint-config-next
     15.5.28

   A newer 15.5.x backport may exist by the time you run it. That is fine: A1–A2 state floors, not
   exact versions.
2. In `package.json`, change `"next": "^15.2.0"` to `"next": "^15.5.28"`, then run `npm install`.
   This keeps a fresh install from resolving a vulnerable 15.x. Change no other line in
   `package.json`, and leave the existing `overrides` / `comment:overrides` alone.
3. Save the audit as evidence, in Git Bash (UTF-8 — never PowerShell `>`):
   `npm audit --omit=dev > sprints/84/audit.txt`. It exits non-zero because of the accepted
   residual; that is expected.

**Residual, accepted (record in GO_LIVE_FIXES at close):** `deepmerge-ts <8.0.0` (high) via
`@prisma/config` via `prisma` — 3 entries. `@prisma/config` pins `deepmerge-ts` exactly at
`7.1.5`, and the patched line is 8.x only. An override to 7.1.6 was tried and is still flagged. It
runs only in the Prisma CLI, at build and migrate time, merging trusted config — never on a request
path. It is fixed by the Prisma 7 migration, which is out of scope. `audit.txt` will still say "fix
available via `npm audit fix`" for it. That is npm's generic line: rerunning `npm audit fix` is a
no-op (measured).

**Guardrail:** do not hand-edit `package-lock.json`. Do not add or remove a dependency.

---

## T2 · Unpublish the 29 plans (S-02)

In each file below, change the one line `"published": true` to `"published": false`. No other byte
changes, so `git diff` shows exactly one changed line per file. Do it with Edit or a
format-preserving single-token replace. Never re-serialise the JSON: it would reorder keys and
reformat 29 files.

Metric (20): `bench-with-built-in-storage-metric`, `coffee-table-metric`, `console-table-metric`,
`diy-padded-sofa-metric`, `diy-workbench-metric`, `easy-elegant-bench-metric`,
`easy-to-build-bookcase-metric`, `farmhouse-table-metric`, `firewood-rack-metric`,
`full-length-floor-mirror-metric`, `kids-step-stool-metric`, `one-of-a-kind-cutting-board-metric`,
`one-sheet-workbench-metric`, `outdoor-bar-stool-metric`, `platform-bed-metric`,
`simple-desk-with-style-metric`, `stacked-bookcase-metric`, `traditional-toolbox-metric`,
`wall-mounted-shoe-rack-metric`, `wall-mounted-wine-rack-metric`.

Impossible dimensions (9): `bathroom-stool`, `buffet-cabinet-with-circular-trim`,
`garden-planter`, `kids-school-desk`, `mobile-outdoor-cabinet`,
`porch-bed-swing-relaxing-times-ahead`, `router-table-w-tons-of-storage-woodworklife`,
`simple-nightstand-with-drawer`, `tile-headboard-queen-size`.

Each file is `content/plans/<slug>.json`. Measured before locking: these are exactly the published
plans the T3 guard rejects, and the published count goes 639 → 610.

---

## T3 · Content guard (S-02)

In `tests/content.test.ts`, add a new `describe` after the "published plans carry a photo" block,
titled `published plans have plausible cut lists (S-02, Sprint 84)`, with a short comment. The
comment should say: inch fields only; assemblies and millimetres are not lumber; to fix a plan,
correct it or unpublish it, never loosen the bounds.

- A local constant `CUT_PART_BOUNDS = { maxThicknessIn: 4, maxWidthIn: 48, maxLengthIn: 120 }`.
  - 4″ covers 4×4 posts, which the catalog uses at nominal 4.
  - 48″ is a plywood sheet.
  - 120″ is the longest legitimate part (`cedar-arbor` post).
- A local function `implausibleParts(cutList)` that returns the parts where any dimension is
  `<= 0` or above its bound.
- Tests:
  1. `every part of every published plan is within bounds`. Collect `slug: part` offenders across
     published plans and `expect(offenders, message).toEqual([])`. The message names each offender
     and says to unpublish or correct.
  2. `no published plan is a -metric plan`. Published slugs ending in `-metric` must equal `[]`.
     The message says the catalog is inch-only.
  3. `the bounds reject millimetres and accept the limits`. `implausibleParts` flags
     `{ thicknessIn: 19, widthIn: 140, lengthIn: 775 }` and `{ thicknessIn: 0.75, widthIn: 3.5,
     lengthIn: 0 }`. It returns `[]` for `{ thicknessIn: 4, widthIn: 48, lengthIn: 120 }`. Build the
     parts with the cut-list item shape the schema uses (`part`, `quantity` plus the three numbers).

**Guardrail:** no existing assertion in `content.test.ts` changes. That includes the
`toBeGreaterThan(500)` floor, which 610 still clears.

**Guardrail (typecheck + R3):**
- Type `implausibleParts`'s parameter as the schema's own cut-list type (`PlanInput['cutList']`
  or the inferred cut-list item type from `@/content/plan-schema`), so the test-3 literals with
  `part` and `quantity` typecheck.
- Any new import goes on its own added line. Never edit the existing import lines: R3 requires the
  file to only gain lines.

---

## Verification
```
npm run verify -- --out sprints/84/verify.txt
npm run build
```
Commit the implementation, including `sprints/84/verify.txt` and `sprints/84/audit.txt`. Then run
`git diff <lock-sha> HEAD --output=sprints/84/changes.diff`, where `<lock-sha>` is the commit that
added `sprints/84/ACCEPTANCE.sha256`. A fresh-context grader subagent writes
`sprints/84/SCORECARD.md`. Do not edit `ACCEPTANCE.md`.

## T4 · After the push (native, before close)

1. Check that CI and the Vercel deploy for the pushed commit are green. Read the deploy log for the
   Next version line. A red `P1001` deploy is a cold Neon compute: redeploy (CLAUDE.md §7).
2. `npm run db:seed`, which points at production through `.env.local`. Content never deploys with
   code (CLAUDE.md §6). Run it in the background; it rewrites ~1128 plans one transaction each.
3. Live check (M2): see ACCEPTANCE.
4. **Recording M1–M3.**
   - The grader runs before T4, so it marks M1–M3 `FAIL | not run — Keagan`, as AGENTS.md
     prescribes. Those ids are outside the denominator.
   - The implementing session runs them natively, `npm run build` included, and records the actual
     results in the Sprint 84 SPRINT_LOG entry at close. It never edits `SCORECARD.md`.

## Invariants this sprint must not break
- `published: true` stays the only read filter, in `src/lib/plans.ts`. No query-layer hide.
- Content JSON is the source of truth. Never flip `published` in the DB.
- Server actions, CSP nonce and Clerk behaviour are unchanged. The Next patch release must not need
  code changes; if it does, stop and report rather than editing `src/`.
