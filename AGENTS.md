<!-- AGENTS.md — agent-optimized. SCOPE: Cursor agent (Cursor Cloud VM) ONLY. Claude Code/Cowork agent → CLAUDE.md §5. Shared product/engineering/security rules bind both (AGENTS_CONTEXT.md §"Two agents"); apply the local-Postgres/next-build/Cursor-secrets steps below only as the Cursor agent. -->

# AGENTS.md — Cursor Cloud env

Standard commands: `package.json` scripts + `.github/workflows/ci.yml`: `npm run dev|lint|typecheck|test|build`. Env/DB docs: `.env.example`, `DEPLOYMENT.md`. Durable caveats only:

## Database (local Postgres stands in for Neon)
- Prod = Neon; local dev = Postgres 16 in the VM. Does NOT auto-start — each session: `sudo pg_ctlcluster 16 main start`.
- Role/db = `notch`/`notch`; `DATABASE_URL`+`DIRECT_URL` in `.env.local` (gitignored) already point at it.
- Schema+catalog persist in the VM snapshot. If DB empty/reset: `npm run db:migrate` then `npm run db:seed` (~1128 plans from `content/`; idempotent, prints target host).
- `npm test` mocks Prisma (no DB/env). `lint`/`typecheck`/`build` need no DB (build only needs a well-formed Clerk publishable key, already in `.env.local`).

## Clerk required to open in a real browser
- Root layout renders `<ClerkProvider>`; `src/middleware.ts` wraps `clerkMiddleware()` → every route needs a valid Clerk instance.
- Real `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`+`CLERK_SECRET_KEY` = Cursor secrets, injected into `process.env` per fresh VM; Next gives `process.env` precedence over `.env.local` → injected keys override placeholders, no edit. Just start `next dev`.
- Caveat: secrets injected only at VM startup. In an already-running pre-secrets shell they're absent → `next dev` falls back to placeholder; `curl` returns 200 (SSR ok) but a real-browser nav triggers Clerk dev handshake → 302 to `example.clerk.accounts.dev` → `{"code":"host_invalid"}` even for public pages. Fix: fresh shell, restart `next dev`.
- Anonymous browse/search/plan-detail need no login (`src/lib/public-routes.ts`); login only for saves/likes/collections/reviews.
- Server-side verify w/o real keys: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/plans/x-leg-tv-stand`.

## Optional (safe unset locally)
Upstash Redis (rate limit, fails open), Vercel Blob (build-photo uploads), Cloudflare R2 (`R2_PUBLIC_HOST`, plan images; placeholders when unset), Clerk webhook secret.
