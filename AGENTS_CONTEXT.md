<!-- AGENTS_CONTEXT.md — agent-optimized. Orientation index for Claude Code/Cowork and the subagents it spawns. Dense; not prose. Map only — canonical files win. -->

# AGENTS_CONTEXT — entry point

Read order (each OVERRIDES CLAUDE.md on its domain): `BUSINESS_PLAN.md` (what to build) → `BUILD_PLAN.md` (how you operate: §2 escalation, §4 roadmap, §5 DoD, §6 scorecard, §7 self-score) → `DECISIONS_LOG.md` (business/vendor/cost/legal facts; treat as fact, don't re-derive) → `SPRINT_LOG.md` (history) → `CLAUDE.md` (operating manual + §6 state + §7–§8 invariants).

## Files
- `BUSINESS_PLAN.md` — product spec. §7 monetization = ORIGINAL, NOT approved.
- `BUILD_PLAN.md` — roadmap §4 (authoritative status), DoD §5, scorecard §6.
- `DECISIONS_LOG.md` — decision ledger (append-only; history, current state lives in CLAUDE.md §6).
- `SPRINT_LOG.md` — sprint ledger (append-only history; read counts/state from CLAUDE.md §6, not here).
- `CLAUDE.md` — how you work; §5 env (Claude Code/Cowork only); §6 current state; §7 code invariants; §8 design.
- `AGENTS.md` — briefs for the sprint pre-flight and grader subagents.
- `DEPLOYMENT.md` — deploy/migrate/backfill; §5.5 (dev-branch split) NOT active.
- `DESIGN_BRIEF.md` — full design tokens + design invariants (authoritative for design).
- `FUTURE_IDEAS.md` — do-NOT-build list + status.
- `.claude/settings.local.json` — pre-approved command allowlist (off-list ⇒ needs approval). `.claude/launch.json` — `notch-dev` = `npm run dev`, :3000.
- In-repo skills: `.claude/skills/naming`, `.agents/skills/neon`, `.agents/skills/neon-postgres`, `.ds-sync/storybook`.

## One agent, one project
Claude Code does all sprint work (Keagan 2026-10-16 — Cursor retired). Independent review comes from fresh-context subagents briefed by `AGENTS.md` (CLAUDE.md §9). Product, `BUILD_PLAN`, `DECISIONS_LOG`, and CLAUDE §7–§8 invariants bind every agent.

Runtime self-check before touching DB/git/build — CLAUDE.md §5 decides it: a NATIVE session (Windows desktop app: real filesystem, repo `node_modules` run, `git` authed) runs git, tests and the dev server directly; a SANDBOXED session (Cowork, Linux mount) follows every §5 sandbox rule. DB=Neon either way.

## Settled definitions (2026-07-24)
- **live ≠ launched.** `notchplans.com` is reachable + indexable (`SITE_INDEXABLE=true`) = LIVE (hosting). NOT launched: no marketing, subscriptions, commercialization, or users. Default posture = pre-launch, still in development.
- **Move-off-Hobby / pre-go-live triggers = MONETIZATION + real users, not reachability.** Public+non-monetized on Vercel Hobby is allowed. Gate fires when ads/affiliate/billing/paid-tiers appear (→ leave Hobby FIRST). Pre-go-live hardening (credential rotation, Clerk prod keys, separate dev branch) is due when real users arrive — neither has happened; both stay deferred, do not re-raise.

History of how these files were reconciled (2026-07-24) is in git; not needed as active context.
