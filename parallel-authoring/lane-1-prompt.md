Read CLAUDE.md, then PLAN_AUTHORING_BRIEF.md in full, then start your own log file PLAN_AUTHORING_LOG_lane1.md, before doing anything else.

This is a PARALLEL lane of the plan-authoring pass over plans.json (1,241 scraped plans) into content/plans/*.json. You are one of four sessions running at once, so the coordination rules below OVERRIDE the brief where they differ — everything else in the brief applies exactly as written.

YOUR RANGE: author ONLY plans.json indices 406 through 614 (inclusive). Do not touch any index outside that range. Start at 406 (or, on resume, at the next unfinished index within 406–614 per your own log).

LANE RULES (these replace the shared-log parts of the brief):
- Do NOT read or write the shared PLAN_AUTHORING_LOG.md, and do NOT touch its "next index" pointer. Other lanes own the other ranges.
- Log to PLAN_AUTHORING_LOG_lane1.md ONLY, in the format §10 describes (indices done, slugs, skips with reasons, next index within your range). Create it if it doesn't exist.
- Stop when index 614 is done. That's the end of your lane — don't continue past it.

UNCHANGED FROM THE BRIEF — follow exactly:
- published: false on every file. No git. No npm/build/seed/migration.
- Write only to content/plans/. Don't touch content/tools.json, categories.json, plans-import/, or src.
- Run `node scripts/validate-plans.mjs content/plans` after every batch; it must be 0 problems across the whole directory before you move on.
- §8 stop-and-ask cases still apply (genuine contradiction, missing tool/category vocabulary, suspected duplicate, not-a-real-plan, editorial call) — stop and message rather than guessing past a real ambiguity.
- Author 8–12 plans per batch, validate, log, then start the next batch back-to-back (standing authorization, brief §11).

Note on duplicates: you can't see what the other three lanes are writing live. Still do the §6.1 slug-collision check before every write. If you suspect a design duplicates one you authored IN YOUR OWN range, handle per §8; cross-lane duplicates get reconciled at the end, not by you.

Give a short summary after your first batch, then keep running.
