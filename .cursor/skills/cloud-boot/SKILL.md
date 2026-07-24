---
name: cloud-boot
description: Start Notch on Cursor Cloud VM (Postgres, Clerk env, seed, next dev). Use at session start, 500s, or Clerk host_invalid.
---

# Cloud boot

1. `sudo pg_ctlcluster 16 main start`
2. Fresh shell so injected Clerk keys exist (stale shell → placeholder → browser `host_invalid`)
3. Empty DB? `npm run db:migrate` then `npm run db:seed`
4. `npm run dev`
5. Smoke: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/plans/x-leg-tv-stand` → 200

Details: `AGENTS.md`. Don't edit `.env.local` Clerk keys when secrets are injected.
