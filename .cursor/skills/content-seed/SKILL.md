---
name: content-seed
description: Validate/publish plan JSON and seed the target DB. Use after content/plans edits, publish flags, step tags, or catalog scripts.
---

# Content → DB

1. Edit live JSON under `content/plans/` (drafts stay in `content/plans-draft/`)
2. `published:true` only with full cutList + ≥1 live image
3. Confirm seed target host, then `npm run db:seed`
4. Smoke one published + one hidden plan

Schema migrates on deploy; data does not. Prefer existing `scripts/*` over ad-hoc SQL.
