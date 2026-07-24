# AGENTS.md

## Cursor Cloud specific instructions

Notch is a single Next.js 15 (App Router) app. Standard commands live in
`package.json` scripts and the CI job (`.github/workflows/ci.yml`): `npm run dev`,
`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Full env-var and
DB docs are in `.env.example` and `DEPLOYMENT.md`. Only the non-obvious, durable
setup caveats are captured below.

### Database (local Postgres stands in for Neon)
- Production uses Neon; local dev uses a Postgres 16 cluster installed in the VM.
  It does **not** auto-start — start it each session before running the app or any
  DB-backed work: `sudo pg_ctlcluster 16 main start`.
- Connection is a `notch`/`notch` role + `notch` database; `DATABASE_URL` and
  `DIRECT_URL` in `.env.local` (gitignored) already point at it.
- The schema and catalog persist in the VM snapshot. If the DB is ever empty or
  reset, re-apply with `npm run db:migrate` then `npm run db:seed` (seeds ~1128
  plans from `content/`; the seed is idempotent and prints its target host).
- `npm test` mocks Prisma — no database or env vars needed. `npm run lint`,
  `npm run typecheck`, and `npm run build` also need no DB (build only needs a
  well-formed Clerk publishable key, already in `.env.local`).

### Clerk auth is required to open the app in a real browser (big gotcha)
- The root layout renders `<ClerkProvider>` and `src/middleware.ts` wraps
  `clerkMiddleware()`, so every route depends on a valid Clerk instance.
- Real `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` are provided as
  **Cursor secrets**, injected into `process.env` on each fresh VM. Next.js gives
  `process.env` precedence over `.env.local` (verified with `@next/env`), so those
  injected keys automatically override the `.env.local` placeholders — no manual
  edit needed. Just start `next dev` and the app is browsable, including auth.
- Caveat: secrets are injected only at VM startup. In an **already-running** shell
  from before the secrets were added they are absent, so `next dev` there falls
  back to the `.env.local` placeholder. With the placeholder, `next dev` returns
  200 to `curl` (SSR works), but a **real browser** navigation triggers Clerk's
  dev-browser handshake, which 302s to the FAPI host encoded in the key
  (`example.clerk.accounts.dev`) and dead-ends on `{"code":"host_invalid"}` — even
  for public pages. Fix: start a fresh shell (so the injected keys are present)
  and restart `next dev`.
- Anonymous browse/search/plan-detail work with no login (see the allowlist in
  `src/lib/public-routes.ts`); a login is only needed for saves/likes/collections/
  reviews.
- Server-side verification without real keys: `curl` public routes (e.g.
  `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/plans/x-leg-tv-stand`)
  returns real seeded data.

### Optional services (safe to leave unset)
- Upstash Redis (rate limiting, fails open), Vercel Blob (build-photo uploads),
  Cloudflare R2 (`R2_PUBLIC_HOST` — plan images; placeholders shown when unset),
  and the Clerk webhook secret are all optional locally.
