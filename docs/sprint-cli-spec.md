<!-- TEMPORARY LOCATION. This spec belongs to a SEPARATE repo (`sprint-cli`), not to Notch.
     It lives here only until that repo exists on day one, then `git rm` it from this one.
     It is not a Notch feature and must never appear in BUSINESS_PLAN or BUILD_PLAN §4. -->

# `sprint` — orchestrator CLI for the Claude ↔ Cursor pack loop

**Status:** spec, not built. **Repo:** new, separate from Notch. **Name:** placeholder, Keagan's call.

## Why this exists

The pack loop works — Sprint 75 ran end to end. What it does not do is protect the human in the
middle. Every failure in the first full cycle was a scripted-step error, not a thinking error:

| What broke | Root cause |
|---|---|
| `changes.diff` unreadable | PowerShell `>` wrote UTF-16LE |
| `HEAD@{1}` → `fatal: ambiguous argument 'HEAD@'` | PowerShell parsed `@{` as a hashtable literal |
| `git pull` returned "Already up to date" | Cursor pushed a `cursor/*` branch, not `main` |
| `fatal: unknown revision 'sprint-NN-xxxx'` | A template was pasted as a literal command |
| Sprint numbered 47 instead of 75 | Stale number read from a doc instead of BUILD_PLAN §4 |
| `git pull --rebase` refused | An abandoned rebase from a prior session |

Six failures, zero of them about the code being written. **This tool exists to make that class
impossible**, not to save tokens — the file-backed loop already captured those.

## Non-goals

- Not a token-saver. Say so plainly; the savings were banked in Sprint 00.
- Not a replacement for either agent's own UI.
- Not multi-user, not hosted, not authenticated. One developer, one machine.
- Not a Notch feature.

---

## Phase 0 — RESOLVED 2026-07-27: the Cursor leg is economically disqualified

**Finding.** The Cursor SDK requires a `CURSOR_API_KEY` and, per Cursor's SDK release changelog,
"is billed based on standard, token-based consumption pricing." Cursor's pricing page states every
plan includes a set amount of model usage, with on-demand usage beyond it "billed in arrears."

**Unresolved from official docs:** whether SDK usage draws Pro's included pool first or meters
separately. Neither `/pricing` nor `/docs/account/pricing` says.

**Why that ambiguity does not matter.** The cost lever on Cursor Pro is **Auto mode** — unlimited,
and it does not consume the included pool. The SDK is token-metered at model API rates. Routing
sprint work through the SDK therefore converts unlimited-Auto usage into metered usage *regardless
of which pool it lands in*. That is a strict economic downgrade for this workflow, whose entire
premise is staying inside flat-rate subscriptions.

### Consequence — Phase 3 is re-scoped, not built

**The Cursor dispatch stays manual.** `sprint dispatch <NN>` does not call the SDK. It:

1. resolves and validates the sprint number and pack state,
2. renders the exact standing prompt for that sprint,
3. copies it to the clipboard and prints it,
4. records the expected branch name in `.state.json` so `pull` knows what to fetch.

Keagan pastes it into Cursor and picks Auto. That is one paste — it captures nearly all of the
ergonomics at **zero metered cost**, and it keeps the model-routing decision where the savings
actually are. The same applies to `sprint fix`.

Revisit only if Cursor ships subscription-included programmatic dispatch, or if a measured month
shows Auto-mode headroom going unused.

### Still to verify (2 min, gates Phase 2 only)

**Does headless `claude -p` draw on the Max 5× subscription or on API credits?** The CLI uses its
own stored auth, so it should be Max — but confirm before Phase 2:

```
claude -p "reply with the single word: ok"
```

Then check Claude usage vs the Anthropic Console. If it bills as API, Phase 2 gets the same
clipboard treatment as Phase 3 and the tool ends at Phase 1 + prompt rendering.

Phase 1 makes no AI calls and is unaffected by either answer.

---

## Architecture

Node + TypeScript. A single binary, no server, no database.

**The pack folder remains the source of truth.** The CLI reads state from `sprints/<NN>/`; it
never holds authoritative state of its own. If the CLI crashes, is killed, or is skipped for a
manual step, the sprint is unaffected — that resumability is the property Sprint 00 was built for
and this tool must not weaken it.

Per-sprint scratch state (current branch name, round count, last command) lives in
`sprints/<NN>/.state.json`, gitignored, and is **derivable** — a lost state file degrades to a
prompt, never to a wrong action.

Config in `.sprintrc.json` at the target repo root:

```json
{
  "verifyCommand": "npm run verify",
  "branchPrefix": "cursor/sprint-",
  "models": { "plan": "opus", "audit": "sonnet", "close": "opus" },
  "packDir": "sprints",
  "maxRounds": 3
}
```

Repo-agnostic by design: nothing about Notch is hardcoded.

---

## Commands

```
sprint open <NN> "<change list>"    Claude/Opus writes GOAL+PLAN+ACCEPTANCE, then locks the bar
sprint dispatch <NN>                Launch a Cursor agent against the pack; record the branch
sprint pull <NN>                    Fetch the branch, cut changes.diff correctly
sprint audit <NN>                   Claude/Sonnet audits diff+verify.txt, writes FIXES.md
sprint fix <NN>                     Dispatch a fix round to Cursor (delta only)
sprint merge <NN>                   ff-only merge the branch after a passing audit
sprint close <NN>                   Claude/Opus writes BUILD_PLAN §4 + SPRINT_LOG entries
sprint status [NN]                  Where the sprint is, what the next command is
sprint verify                       Wrap the configured verify command
sprint doctor                       Pre-flight the git working tree
```

Every command supports `--dry-run` (print what it would do, touch nothing).

### The one that matters most: `sprint status`

Prints the current step and **the exact next command to run**, derived from what is on disk:

```
sprint 76 — awaiting audit
  ✓ pack written, bar locked (27 checks)
  ✓ dispatched → cursor/sprint-76-a1b2
  ✓ pulled, changes.diff 412 lines (UTF-8)
  ✓ SCORECARD 24/27 — FAIL: A9, A14, R2
  → next:  sprint audit 76
```

This is the answer to "which sprint am I on and what do I do next", which is where the wrong
sprint number came from in the first place.

---

## Guardrails — the point of the tool

Each maps to a real failure, and each **refuses** rather than warns.

| Guard | Refuses when | Failure it prevents |
|---|---|---|
| Encoding | always — writes via `git diff --output=` or `fs.writeFileSync`, never shell redirection | UTF-16 diff |
| Shell | always — `spawn` with an argv array, never a shell string | PowerShell brace parsing |
| Branch resolution | branch not found on `origin` | diffing against the wrong ref |
| No placeholders | any argument matches `NN`, `xxxx`, `<...>` | pasting a template literally |
| Sprint number | `<NN>` is not `max(BUILD_PLAN §4 closed) + 1`, unless `--force` | the 47-vs-75 error |
| Bar locked | `dispatch` with no `ACCEPTANCE.sha256` | Cursor grading an unlocked bar |
| Bar intact | any step where the hash no longer matches | a tampered bar |
| Graded | `audit` with no `SCORECARD.md`, or `SCORECARD` missing ids | auditing an incomplete grade |
| Round cap | `fix` at round 4 — hard stop, prints the escalation | grinding past CLAUDE.md §4 |
| Clean tree | any step with a dirty tree, detached HEAD, or `.git/rebase-merge` present | the abandoned-rebase block |
| Merge gate | `merge` before an audit recorded a pass | shipping an ungraded sprint |

`sprint doctor` runs the git guards standalone — the fast "why is git being weird" check.

---

## Build phases

| Phase | Contents | Est. | AI calls | Value |
|---|---|---|---|---|
| **0** | Billing gate | ✅ done | — | Cursor SDK disqualified; `claude -p` still to confirm |
| **1** | `doctor` · `pull` · `verify` · `status` · `dispatch`/`fix` (prompt render + clipboard) · `merge` · config · all git guards | ~5 h | **none** | Kills every failure in the table above, and closes the loop end to end |
| **2** | `open` · `audit` · `close` — the Claude leg via `claude -p` | ~4 h | yes | Removes the last 3 manual prompts. Gated on the `claude -p` check |
| **3** | ~~Cursor leg via `@cursor/sdk`~~ | — | — | **Cut.** Metered token billing replaces unlimited Auto mode |
| **4** | Local web dashboard over the same core | later | — | Ergonomics, not capability |

**Phase 1 is now the whole tool**, not a first slice. With Cursor dispatch reduced to
render-and-clipboard, Phase 1 covers every step of the loop, makes no AI calls, needs no API key,
and costs nothing per run. Build it, use it for Sprint 76, decide on Phase 2 with real experience.

## Testing

Vitest. The git guards are the part that must not be wrong, so they get fixture repos in a temp
dir — a dirty tree, a detached HEAD, a planted `.git/rebase-merge`, a missing branch — and each
guard is asserted to **refuse**. Same discipline as `tests/sprint-pack.test.ts`: assert the
behaviour the workflow needs, not that a function was called.

No test may touch the real Notch repo.

## Open questions for Keagan

1. Name and repo. `sprint-cli` is a placeholder.
2. Public or private repo. Private is the obvious default; it encodes your workflow.
3. Should Phase 4's dashboard be part of this repo or a separate front end.
