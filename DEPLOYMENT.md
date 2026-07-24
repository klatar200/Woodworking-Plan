<!-- DEPLOYMENT.md — agent-optimized. Deploy/migrate/backfill invariants + commands. See CLAUDE.md §7 for the full why on each. -->

# DEPLOYMENT.md

## Env vars
- `DATABASE_URL` = pooled (`-pooler`, app runtime; serverless would exhaust a direct conn).
- `DIRECT_URL` = direct (used ONLY by `prisma migrate`; the pooled PgBouncer endpoint fails migrations with P1017).
- Both MUST point at the SAME db (migrate uses directUrl, queries use url; mismatch = green build/deploy + every page 500). `scripts/check-db-urls.mjs` runs first in `vercel-build`, fails on mismatch — don't remove.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` needed at build time (`next build` prerenders `/_not-found`→`ClerkProvider`). `R2_PUBLIC_HOST` needed at Vercel build time or plan images blocked. Never `NEXT_PUBLIC_`-prefix a secret.
- Prisma CLI reads `.env` not `.env.local` → db scripts via `dotenv-cli`.
- `vercel.json` has NO `buildCommand` (it would override `package.json` `vercel-build` and disable the check-db-urls guard).

## Migrate vs data
- Vercel runs `prisma migrate deploy` in `vercel-build` → prod SCHEMA catches up automatically from committed `prisma/migrations/`. That is the only path to prod schema.
- DATA does not flow. A migration adding a column computed from existing rows needs a **prod backfill** — creating a column ≠ populating it (Sprint 4 `searchVector` shipped empty → prod search dead while dev worked). Run new raw SQL against a real Postgres and smoke-check `/` after deploy.
- Prefer compute-on-read over denormalized columns (no backfill/drift); denormalize only when measured, with txn + backfill.

## Current DB topology (STANDING, 2026-07-14)
ONE Neon branch `sparkling-band` = production; dev + prod SHARE it during development on purpose (catalog rebuildable from `content/*.json`). `npm run db:seed` runs against **prod**. Do not re-flag "prod==dev".

## Step 5.5 — separate dev branch: PRE-GO-LIVE, NOT YET ACTIVE
Do NOT do this yet. Becomes a real task the day a real person saves a plan (see AGENTS_CONTEXT §"Settled"). Procedure kept for that day:
1. Neon → Branches → New Branch, parent `production`, name `dev` (copy-on-write, $0).
2. Copy the `dev` pooled connection string; set `DATABASE_URL` in `.env.local` to it. Leave Vercel vars pointing at `production`.
3. Verify: `npm run db:seed` prints target host — confirm it's `dev`, not prod. Then hit `<vercel-url>/api/health` → `database.status:"ok"`.
Once active: `db:migrate`/`db:seed`/`db:push`/`migrate reset` hit dev only; prod schema changes exclusively via `prisma migrate deploy` on deploy.

## Deploy discipline
Deploy early every sprint. Green deploy/suite ≠ proof — read the build log. Check GH Actions after every push: `curl -s "https://api.github.com/repos/klatar200/Woodworking-Plan/actions/runs?per_page=5"`. `git rm` renamed/superseded test files in the repo, in the sprint's commit block (a sandbox delete doesn't reach the repo).

## Content → prod
Content never deploys with code. Any content change (publish flags/plans/step tags/paths) needs `npm run db:seed` against prod. Seed per-plan txn `{maxWait:15000,timeout:60000}` (P2028 fix).

## Runbooks (exact commands)
Local first run: `npm run db:generate` → `npm run dev`.
Prod backfill (deliberate, rare — for a migration whose column must be computed from existing rows): point `.env.local` at the prod branch (already the case under the single-DB setup), then:
```
npm exec -- dotenv -e .env.local -- prisma migrate deploy
npm exec -- dotenv -e .env.local -- tsx prisma/seed.ts
```
(In the future two-branch world: swap `.env.local` back to dev IMMEDIATELY after.)
R2 image re-host (DECISIONS_LOG 2026-07-17; run natively, network/CPU heavy — downloads→sanitises(strip EXIF/re-encode webp)→uploads keyed by content-URL hash→rewrites each plan JSON `images[].url`):
```
npm run images:migrate -- --dry-run     # preview only
npm run images:migrate                   # apply
git diff --stat content/plans            # only image URLs should change
```
Null out dead/unresolved images (format-preserving, minimal diff):
```
npm run images:null-unresolved -- --dry-run
npm run images:null-unresolved
```
Clerk user-deletion webhook (before launch): set `CLERK_WEBHOOK_SIGNING_SECRET` in Vercel + add a `user.deleted` endpoint → `/api/webhooks/clerk` in the Clerk dashboard (see CLAUDE.md §7).
One-time provisioning (Neon/Clerk/Vercel account creation, GitHub repo settings) is Keagan's handoff — original step-by-step in git history if ever needed again.
