<!-- AGENTS.md — agent-optimized. SCOPE: Cursor agent ONLY (running locally in Keagan's Cursor by default; Cursor Cloud VM only when he says so). Claude Code/Cowork agent → CLAUDE.md §5. Shared product/engineering/security rules bind both (AGENTS_CONTEXT.md §"Two agents"); apply the local-Postgres/next-build/Cursor-secrets steps below only as the Cursor agent. -->

# AGENTS.md — Cursor env

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

## Sprint pack protocol (Sprint 00 — binding)
Work arrives as a folder, never as a pasted prompt. Full loop + formats: `sprints/README.md`, `sprints/_template/README.md`.

**DEFAULT: you run LOCALLY, in Keagan's Cursor, in his working tree.** Cursor Cloud is metered and local is not, so local is the standing mode (decided 2026-07-28). Consequences, all of which simplify the loop:

- The pack is **already on disk**. No pull. If `sprints/NN/` is absent it genuinely does not exist yet — say "no pack for NN", do not improvise one.
- Nothing you write needs pushing to be seen. Claude reads the same files you write.
- **You own exactly four git verbs: `checkout -b`, `add`, `commit`, `status`.** Create `cursor/sprint-NN-<slug>` off `main` before your first edit and commit there.
- **NEVER: `push`, `merge`, `rebase`, `reset`, `checkout main`, `stash`, anything `--force`.** There is one working tree and no remote copy of your work — a destructive verb here loses Keagan's repo state, not a disposable VM's. Merging to `main` is his, after the audit passes.
- Windows box: **never `>` to produce `verify.txt`** — PowerShell 5.1 redirection writes UTF-16LE and every downstream parser then fails. Use the `--out` flag in step 4; it writes UTF-8 from Node and does not involve a shell.

**Only if Keagan explicitly puts you in Cursor Cloud**: you are in a different clone, `origin/main` is the transport, so pull before reading a pack and push a `cursor/sprint-NN-*` branch when done — and there, an absent pack folder usually means "not pushed yet". Determine which mode you are in before step 1 rather than assuming; if you are local and a git command is blocked (read-only mode, auto-review), say so explicitly rather than grading around it.

### Triggers — the whole prompt is two words plus a number

Keagan types one of these and NOTHING else. The procedure below is the prompt; do not ask him to
restate it, and do not treat a short trigger as an underspecified request.

**`Run sprint NN`** — implement round:
1. `git checkout -b cursor/sprint-NN-<slug>` off `main`. If `sprints/NN/` is absent, stop and say
   "no pack for NN". Do not improvise one.
2. Read `sprints/NN/GOAL.md`, then `PLAN.md`, then `ACCEPTANCE.md`. GOAL's "Out of scope" list and
   PLAN's per-task **Guardrail** lines are binding — they are the sprint-specific rules and they
   override any general instinct about what "obviously" should also change.
3. Implement `PLAN.md` tasks in the order written. The order is load-bearing; do not reorder.
4. `npm run verify -- --out sprints/NN/verify.txt` — full run, never a `--only` subset, and never
   a shell redirect (`>` writes UTF-16LE on Windows).
5. Write `sprints/NN/SCORECARD.md`: every id in `ACCEPTANCE.md`, exactly once, `PASS`/`FAIL`, with
   `verify.txt:<line>` or `<file>:<line>` as evidence. State the branch name at the top.
6. `git add -A` + `git commit` on that branch. **Stop there** — no push, no merge, no return to
   `main`. Keagan cuts the diff and merges after the audit.

**`Check sprint NN`** — pre-flight, **read-only**. Write no code, edit no file, commit nothing,
push nothing. Answer in chat. Run this before `Run sprint NN`; it is cheap and it has already
caught two sprint-breaking defects (Sprint 76).
1. Read `AGENTS.md`, then `sprints/NN/GOAL.md`, `PLAN.md`, `ACCEPTANCE.md`.
2. State what the pack obligates you to do, in order, in your own words.
3. Answer with specifics, not paraphrase: how many scored ids and what the denominator excludes ·
   the pass gate · which tasks have a mandatory order and why · every guardrail that forbids
   something · the exact verify command and grade-file path.
4. For each, say what you would do and cite the rule: an ACCEPTANCE check you think is wrong or
   impossible · a verify step failing for a cause you did not create · a `Fix` request when
   `FIXES.md` already has Round 3 · a file outside PLAN's paths that seems to need changing ·
   a sprint folder that is not in the repo.
5. **Most important — name everything ambiguous, contradictory, or that you would likely get
   wrong.** Be specific and critical. Check the pack against the repo, not just against itself:
   file paths and line numbers that no longer match, occurrence counts that are off, tests that
   assert something the PLAN changes, checks that need human judgment instead of being binary,
   and any check that is impossible to PASS as written. A clean bill of health is a FAILED audit
   if real gaps exist.

Findings go back to Keagan for Claude to fix. **Never fix the pack yourself** — you are the graded
actor and the bar is not yours to move.

**`Fix sprint NN`** — fix round:
1. Stay on the sprint branch. Read `sprints/NN/FIXES.md` **only** — not GOAL, not PLAN, not the diff.
2. Apply exactly the deltas in the newest `## Round N` heading. Nothing else.
3. Re-run verify with `--out` (overwriting `verify.txt`), update `SCORECARD.md`, commit to the same
   branch. Still no push, no merge.

If either trigger arrives with no number, ask for the number — that is the one legitimate question.

Hard rules (each is enforced by `tests/sprint-pack.test.ts`, which runs inside `npm run verify` — violating one turns the suite red, it is not a style note):
- NEVER edit `ACCEPTANCE.md` or `ACCEPTANCE.sha256`. Claude authors the bar before implementation and locks it; the actor being graded does not get to move it. A bar that is genuinely wrong = re-scope = Keagan's call (CLAUDE.md §4) — say so, don't edit.
- Grade EVERY id in `ACCEPTANCE.md` exactly once, `PASS` or `FAIL`, with concrete evidence (`verify.txt:<line>` or `<file>:<line>`). An omitted id fails the guard. A FAIL is fine — an ungraded check is not.
- Never mark PASS without evidence. "Looks correct" is not evidence.
- **`evidence: manual` on an ACCEPTANCE line** means the check is confirmed by doing something rather than by reading a file — cite the command you ran and its result, or what you inspected. It is never a licence to assert PASS unsupported. **`M`-prefixed ids** are excluded from the score denominator (the pack states the denominator explicitly); grade them anyway, and mark `FAIL | not run — Keagan` for any you cannot run here. That costs nothing and keeps the guard green.
- `verify.txt` = raw unedited output of a FULL `npm run verify`, produced by `--out` so it is UTF-8. Never hand-edit it; never grade from a `--only` subset run (it self-labels and the guard rejects it).
- Stay inside the file paths PLAN.md names. Out-of-scope edits are caught by the `R` gates in ACCEPTANCE.
- On a fix round read `FIXES.md` ONLY — not the original PLAN. Applying more than the delta is how a passing sprint regresses.
- Model routing: Auto for rote work and fix rounds; premium only for the genuinely hard slice.
- `npm run verify` proves CODE, not content shipped. Content changes still need `npm run db:seed` against prod (CLAUDE.md §6) — that belongs in ACCEPTANCE as a manual check.
