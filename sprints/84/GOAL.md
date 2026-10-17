# Sprint 84 — Patched dependencies + no impossible plans

## Objective
Two P1s from `GO_LIVE_FIXES.md` (site audit 2026-10-17):
- **S-01 — vulnerable production dependencies.** `npm audit --omit=dev`: 1 critical, 7 high,
  1 moderate. Next 15.5.20 is in range for several advisories, among them a Server Actions DoS, an
  Image Optimization RCE with AVIF, and unauthenticated disclosure of server function endpoints.
  `sharp`, `undici`, `source-map-js` and `postcss` are also flagged.
- **S-02 — 29 published, indexed plans have impossible cut lists.** 20 metric plans store
  millimetres in inch fields ("Back 19″ × 140″ × 775″"), so their board plans say "Buy 0 boards".
  9 imperial plans list assemblies or mis-parsed sizes as lumber, e.g. 9″-thick plywood, a 16″-thick
  "Main Base", or 60″-wide posts.

## Why now
Keagan 2026-10-17: "Plan a sprint for S-01 (dependency upgrade) and S-02 (unpublish or fix the 28
broken plans + content guard) first." The audit said 28; the guard thresholds below catch one more,
`garden-planter`, which lists 60″-wide posts.

## Definition of done
- `npm audit --omit=dev` reports no critical advisory. The only remaining advisories are the
  `deepmerge-ts` → `@prisma/config` → `prisma` chain. It is build-time CLI only with trusted input,
  and the fix needs deepmerge-ts 8 / Prisma ≥ 7.11, a major upgrade, so it is recorded as accepted.
- Next.js is on the patched 15.5 line, and the build, CI and the live site all work.
- The 29 plans are unpublished, and the live catalog drops from 639 to 610 plans.
- A content test fails CI if any published plan has an implausible cut-list part, or is a
  `-metric` plan. Neither can come back unnoticed.

## Fix or unpublish — decided: unpublish all 29
- **Metric plans:** the app is inch-only (tape fractions are a §7 invariant), and 17 of the 20
  duplicate a published imperial plan. Converting them would publish 19 mm stock as 3/4″ with odd
  fractions. Three have no published imperial twin (`bench-with-built-in-storage`,
  `farmhouse-table`, `simple-desk-with-style`), so those three designs leave the catalog for now.
- **The 9 imperial plans:** the bad rows are whole assemblies ("Drawers", "Desk Base", "Chair") or
  garbage sizes. Correct values cannot be recovered from the JSON, and would need a re-parse from
  the Kreg source.
- Unpublishing is one token per file and fully reversible.

## In scope
- `package.json` (`next` range only) and `package-lock.json`
- The 29 files in `content/plans/` that PLAN T2 lists (the `published` line only)
- `tests/content.test.ts` (new tests only)
- After the merge: `npm run db:seed` against production, so the live site matches the content

## Out of scope — do not touch
- `src/`, `prisma/` (schema and seed), `public/`, `scripts/`, every other content file
- Prisma 7 / Next 16 / any major upgrade; the `postcss` override already in `package.json`
- `devDependencies` advisories (vitest, brace-expansion) — they do not ship
- S-17 (the seed resets every plan's `publishedAt`) — logged, not fixed here
- Re-parsing or converting any plan

## Non-goal
Not a catalog clean-up beyond what the guard catches. It removes plans that are provably wrong,
and stops them coming back. The catalog is not certified clean afterwards. The pre-flight found
garbage rows that fall inside the bounds, such as `plywood-chair-set` "See Full Plans in Extras" at
0.75×48×96 and `rolling-lumber-sheet-goods-cart` "Support panels" at 3×45×46. They are logged for a
later content pass.
