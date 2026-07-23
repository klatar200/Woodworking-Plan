# Run 1 Plan Audit — Handoff for a Cursor Agent

**Repo:** `C:\Users\latar\Desktop\Woodworking-Plan` (Next.js 15 + TypeScript + Prisma + Postgres/Neon).
**You:** the lead engineer continuing an in-progress content audit. **Keagan:** the PM (product/business/branding/money calls are his).
**This file is uncommitted working notes.** Read it fully before you touch anything.

> Read next, in order: `CLAUDE.md` (esp. §3 "keep replies short", §6 "environment gotchas"),
> then `PLAN_AUDIT_BRIEF.md` (the governing contract for this work). This handoff does not replace them.

---

## 0. Mission in one paragraph

Run 1 rewrites the **step-by-step instructions** of woodworking plans in `content/plans/*.json` so a
beginner can build from them without guessing, and fixes **correctness defects** (cut lists that don't
close, unsourced fasteners, wrong geometry) found along the way. A full pipeline already exists. **133
rewrite patches are written and pass the structural gate but are NOT yet applied to content, and are
almost entirely unverified.** Your job: verify them adversarially, apply the ones that pass, re-fix the
ones that don't, keep the test suite green, commit per batch, and stop at a green pushed branch. **Never
seed production.**

---

## 1. Environment & how you run commands

- Windows. The integrated terminal may be **PowerShell** — all commands below use `node`, `npx`, and
  `git`, which behave identically in PowerShell and bash. Avoid bash-only heredocs.
- **Do all file edits with the editor, never by echoing through a shell.** A prior session corrupted a
  regex by writing `\b` through a shell→node string chain, producing a literal backspace byte (0x08)
  that only `cat -A` revealed. Editor edits only.
- Node scripts are the safe way to do bulk JSON edits. When you must transform many patch objects, write
  a small `.mjs` under `run1-work/` and run it with `node`.
- `next build` / `next dev` and the DB seed require Keagan's machine or CI, **not** this environment for
  the seed. `node`, `npx tsc`, `npx vitest`, `npx eslint`, and all `scripts/run1-*.mjs` run fine locally.

---

## 2. GUARDRAILS — do not cross these

### 2A. Content rules (a patch violating any is rejected whole)
1. **Never invent a measurement.** Every number in prose must trace to that plan's own `cutList`,
   `materials`, or `description`, or be sound arithmetic on those. If you can't source it, write the
   technique without the number and put it in `flags`.
2. **No dollar figures, ever.** Cost is shown as tiers elsewhere in the app.
3. **Tape-measure fractions only.** `23-1/2"`, never `23.5"`. `13/16"`, never `0.8125"`.
4. **`step.tools` ⊆ the plan's own `tools[].slug`** — exact slugs, verbatim.
5. **`step.materials` ⊆ the plan's own `materials[].name`** — verbatim, character-for-character. These
   are shopping-list merge keys; a renamed key silently breaks merging.
6. **Change nothing outside each plan's `steps` array.** No cut-list edits, no material edits, no
   description edits, no `published` changes.
7. **No HTML or markdown in `body`** — plain prose. Step object keys are exactly `title`, `body`,
   `tools`, `materials`, `image` (schema is `.strict()`).
8. **Never contradict the box-geometry solver** (`scripts/run1-box-geometry.mjs`). If it is **silent**
   for a plan, the data does not determine the assembly — describe the joint without asserting which
   member is captured, and flag it. Do not guess.
9. **A false lumber shortfall is as damaging as a missed one.** Use `packBoards` (below). It is an
   upper bound: it can prove *sufficiency*, but a board count above the length lower bound is **not** a
   provable shortfall — the packet labels this `provable:true/false`. Never assert a shortfall from a
   `provable:false` number.
10. **No duplicate step bodies, no destroyed steps.** Two steps with identical bodies, or an original
    step that vanished, are defects (see §9 — this exact bug cost a whole batch).

### 2B. Process rules
11. **Never mutate `content/plans/*.json` while patches written against it are outstanding.** A scaffold
    pass once renumbered 311 plans under 34 in-flight patches; every `replace` index then pointed one
    step late. This is why every patch carries `baseStepTitles` and the applier refuses a patch whose
    plan has moved. Sequence content passes; never interleave.
12. **`baseStepTitles` is required on every rewrite patch** — the verbatim titles of the plan's steps as
    read, in order. The applier (`checkPatchBase`) blocks the patch if the live plan differs.
13. **A prose rewrite NEVER auto-applies.** It must pass adversarial verification first. Applying is a
    separate, explicit step with `--write --verified` (see §5), and `--verified` is your assertion that
    verification happened.
14. **Apply only CONFIRMED patches.** `--verified` forces *every* structurally-valid patch in the file
    to apply. So build a `<group>-confirmed.json` containing only the patches that passed verification,
    and apply that — never a whole raw group file after a mixed verdict.
15. **Do not re-run `scripts/run1-cut-step.mjs`** (the scaffold) casually. It already ran on 311 plans.
    Re-running it while patches are outstanding is exactly the collision in rule 11.
16. **Green tests are not proof.** Assert the behaviour the app needs. Any raw-SQL or device/browser
    claim needs real verification, not a passing mock.
17. **Machine gate after every applied group** (§6, step 6). If `run1-step-integrity.mjs` reports any
    destroyed/duplicated step, revert that group and investigate — do not commit over it.

### 2C. Ship-gate rules (binding — `PLAN_AUDIT_BRIEF.md` §6.1)
18. **NEVER run `npm run db:seed`** or otherwise seed production. Content reaches prod only via a manual
    seed Keagan runs; the dev/prod Neon split exists so automation cannot touch live users.
19. **Run autonomous up to a green, verified, PUSHED branch — then STOP.** At the end, hand Keagan the
    exact prod-seed command and a one-page summary. Do not seed, do not "go live".
20. **Escalate business/branding/irreversible calls to Keagan** with a recommendation; don't decide them.
21. **Do not touch** the already-committed 85-plan unpublish, or `kreg-plans.json` (Keagan's, uncommitted).

---

## 3. Repo & branch state at handoff

- HEAD is at commit `3308316`. Keagan merged the prior audit commits into `main` and added Sprint 46
  work on top, so `main` and `run1-plan-audit` have **converged** at the same commit. Your audit
  infrastructure (the `scripts/run1-*.mjs`, guard tests, the 85-plan unpublish `73cbe4c`, the crash-fix
  `25b3dfb`) is all in that history.
- **First thing: verify this yourself** — `git status`, `git log --oneline -6`, and confirm CI is green
  (`curl -s "https://api.github.com/repos/klatar200/Woodworking-Plan/actions/runs?per_page=3"`). Ask
  Keagan which branch he wants new audit commits on now that `main` and `run1-plan-audit` are identical.
- Working tree is clean except untracked files that are Keagan's (`PLAN_AUDIT_REPORT_2026-07-23.md`,
  `missing-images-review-2026-07-23.csv`) and `run1-work/` (yours, gitignored). **`content/plans` is
  unchanged except the committed unpublish** — nothing from this batch is applied yet.

---

## 4. Where the work lives (exact paths)

All in-flight artifacts are staged in **`run1-work/`** at the repo root (gitignored — never commit it).
A backup copy is at `C:\Users\latar\AppData\Local\Temp\claude\run1-handoff\`.

| File | What it is |
|---|---|
| `run1-work/b4g1.json … b4g10.json` | 100 batch-4 rewrite patches (10 groups × 10 plans) |
| `run1-work/s1.json … s4.json` | 34 re-rewritten "stale-batch" plans (9+9+9+7) |
| `run1-work/rewrite-agent-brief.md` | Standing brief for producing a rewrite patch (depth target, box-geometry + lumber + `baseStepTitles` rules, output format) |
| `run1-work/verifier-brief.md` | Standing brief for the adversarial verification pass — **your checklist in §7** |
| `run1-work/stale-hints.md` | Verified defect leads for the 34 stale plans (already baked into s1–s4; keep for reference) |
| `run1-work/verdicts-so-far.md` | The only batch-4 verdicts that landed (w10: 4 rejects, all in `b4g4.json`) |
| `run1-work/split-packet.mjs` | `node run1-work/split-packet.mjs <combined.md> <prefix> <perChunk>` → chunk a packet |
| `run1-work/backfill-base.mjs` | Backfills `baseStepTitles` (only sound if content hasn't moved since the patch was written — check `git diff content/` first) |
| `run1-ledger.json` (repo root, committed) | Per-plan resume record: `status` = `pending \| verified \| returned`. This is the committed source of truth for progress. |

Every patch object looks like:
```json
{
  "slug": "1x3-blanket-ladder",
  "score": 2,
  "action": "rewrite",                          // or "pass"
  "shortfallClaim": false,                        // true routes to the strictest verification
  "baseStepTitles": ["Cut the parts", "Assemble", "Finish"],
  "flags": ["Rung spacing DERIVED from 72\" rail / 5 rungs, not stated in source."],
  "ops": [
    { "op": "insert", "index": 0, "step": { "title": "...", "body": "...", "tools": ["circular-saw"], "materials": ["1x3 furring strips, 8 ft"] } },
    { "op": "replace", "index": 0, "title": "...", "body": "...", "tools": ["tape-measure"], "materials": [] }
  ]
}
```
`insert` `index` = position in the ORIGINAL step array; `replace` `index` = ORIGINAL index (supply only
changed fields). The applier handles the shifting. All indices are against the original array.

---

## 5. The pipeline scripts (exact invocations)

Run from the repo root.

| Command | Purpose |
|---|---|
| `node scripts/run1-apply-patch.mjs run1-work/<file>.json` | **Dry run.** Prints per-patch verdict + verification tier (`1-vote`/`3-VOTE`), no writes. |
| `node scripts/run1-apply-patch.mjs run1-work/<file>.json --write --verified` | **Applies** every structurally-valid patch in the file to `content/plans`. Only run on a **confirmed-only** file (rule 14). |
| `node scripts/run1-verify-packet.mjs run1-work/<file>.json` | Prints the compact verification packet for a group: cut list, materials, precomputed board packing (`PROVABLY MINIMAL` vs `⚠ HEURISTIC`), solved BOX GEOMETRY, and the changed prose. Redirect to a file. |
| `node scripts/run1-box-geometry.mjs <slug>` | Solve "which member runs full length" for one plan. Silence = data doesn't determine it. |
| `node -e "import('./scripts/run1-verify-packet.mjs').then(m=>console.log(m.packBoards([58.25,37.5,37.5],96)))"` | Board-packing check: `{boards, lowerBound, provable, worstSlack}`, 1/8" kerf, or `null` if a part exceeds the stock. Group parts by thickness×width first. |
| `node scripts/run1-number-lint.mjs run1-work/<file>.json` | Deterministic no-invented-number + fastener-contradiction lint. |
| `node scripts/run1-step-integrity.mjs` | Sweeps every changed plan for a destroyed/duplicated step. **Must show `0 destroyed` after any apply.** |
| `node scripts/validate-plans.mjs` | Validates all 1115 content files against the schema. |
| `npx vitest run tests/run1-guards.test.ts` | The pipeline's own guard tests (31 at handoff). |
| `npx vitest run tests/content.test.ts` | The content-load test (part of the per-group gate). |
| `npx tsc --noEmit` / `npx eslint scripts/` | Typecheck / lint. |

**Applier status meanings:** `would-apply`/`applied` = passed; `needs-verify` = routed to verification
(you resolve this by verifying, then applying a confirmed file with `--verified`); `rejected` = a hard
structural failure (fix the patch); `errored` (exit code 2) = a **pipeline bug**, not a content verdict —
fix the script and re-run (see §9).

---

## 6. The per-group workflow (run this loop for each of the 14 files)

Groups touch disjoint plans, so order doesn't matter for correctness — only for clean commits. Do one
file at a time.

1. **Confirm the gate is clean:** `node scripts/run1-apply-patch.mjs run1-work/<file>.json`
   → expect `0 rejected`. If a patch rejects, fix that patch object (usually a non-subset tool/material
   or a stale numeric step reference — name the step instead of numbering it) and re-run.
2. **Build the packet:** `node scripts/run1-verify-packet.mjs run1-work/<file>.json > run1-work/p-<file>.md`
3. **Verify adversarially** — see §7. Produce a verdict per plan: `CONFIRM` or `REJECT` + the proving numbers.
4. **Split verdicts:** write `run1-work/<file>-confirmed.json` = only the CONFIRMED patch objects
   (valid JSON array). Leave REJECTs out.
5. **Apply the confirmed subset:**
   `node scripts/run1-apply-patch.mjs run1-work/<file>-confirmed.json --write --verified`
6. **Machine gate (all must pass, or revert the group and investigate):**
   `node scripts/validate-plans.mjs` → clean;
   `npx tsc --noEmit` → clean;
   `npx vitest run tests/content.test.ts` → green;
   `node scripts/run1-step-integrity.mjs` → **0 destroyed**.
7. **Update the ledger** (`scripts/run1-ledger.mjs` — read its header for usage) so applied plans become
   `verified` and rejects become `returned`.
8. **Commit** the applied content + ledger, e.g.
   `git add content/plans run1-ledger.json && git commit -m "run1 <file>: N verified plans applied"`.
   (End commit messages with the Co-Authored-By line if that's the repo convention — check recent log.)
9. **Re-fix the REJECTs:** for each returned plan, make the specific correction the verifier named
   (targeted edit to that patch object — usually one op), then re-verify just that plan. Do **not**
   full-rewrite a plan that was already well-attempted; only the named defect needs fixing.

---

## 7. How to verify adversarially (you have no separate verifier fleet)

The prior session used independent subagents so the verifier never saw the rewriter's reasoning. As a
single Cursor agent you must reconstruct that independence:

- **These 134 patches were written by a *different* prior agent, so verifying them is genuinely
  independent** — you did not write them. Be a hostile reader, default to **REJECT**, and find what is
  wrong. Read `run1-work/verifier-brief.md` and apply its checklist to each plan:
  1. Every changed number re-derived from the cut list — no invented measurements, no decimals-with-inch-mark.
  2. Lumber claims checked with `packBoards` (never hand-binned); a shortfall only asserted when `provable:true`.
  3. Geometry not contradicting `run1-box-geometry.mjs`; nothing asserted where it is silent.
  4. Counts correct ("all eleven pieces" vs a 9-row cut list).
  5. Fasteners exist in `materials` at the stated size.
  6. `step.tools`/`step.materials` are verbatim subsets.
  7. No duplicate step bodies; no original step destroyed.
  8. Parts declared but installed by no step → flag.
- **When you write your OWN new rewrites** (re-fixes in §6 step 9, or any new plans), you lose that
  independence. Mitigate: verify in a **deliberately separate pass** — ideally a fresh Cursor
  conversation/agent whose only inputs are the packet + `verifier-brief.md`, not your rewrite reasoning.
  If Cursor offers background/parallel agents, spawn a dedicated verification agent per group with only
  those two inputs. Treat the patch as a stranger's.
- **Majority is a floor, not a ceiling:** a single, specific, verified, load-bearing defect is enough to
  REJECT, even if other checks pass.

---

## 8. What is done vs. pending (precise)

**Done and committed:**
- Whole pipeline built + guard-tested (`scripts/run1-*.mjs`, `tests/run1-guards.test.ts` — 31 tests).
- Deterministic scaffold already inserted a cut step into 311 plans (`617ae2a`).
- 85 photo-less plans + their 5 learning paths unpublished (`73cbe4c`, Keagan's call). Do not re-touch.
- Guardrail scripts hardened: `checkPatchBase`, duplicate-body check, `errored` status, box-geometry
  outside-dimension output, `run1-step-integrity.mjs`.

**Written, gate-clean, NOT applied, NOT verified — your queue (134 patch objects; 133 rewrites + 1 pass):**
- `b4g1–b4g10.json` — 100 patches. **`b4g4.json` is special:** its 4 plans were the only batch-4 plans
  verified, and **all 4 were REJECTED** (`kitchen-island-open-shelving`, `layered-wood-christmas-tree-trio`,
  `round-outdoor-adirondack-side-table`, `rustic-bathroom-vanity-three-drawer` — exact defects in
  `run1-work/verdicts-so-far.md`). Re-fix those 4 first (§6 step 9); verify the other 6 in b4g4 normally.
- `s1–s4.json` — 34 plans, re-written after an earlier batch was invalidated by the collision (rule 11).
  Their verified defect leads are in `stale-hints.md` and already reflected in the patches. Verify fresh.
- `b4g9.json` includes 1 `action: "pass"` plan (`charcuterie-serving-board`) — no verification needed;
  mark it `verified` in the ledger.

**Scope context:** Keagan's standing instruction was "worst ~250 flagged plans, then reassess." ~250 were
ranked by severity; batch 4 (these ~130) is the worst slice. After batch 4 + the 34 stale plans are
applied and green, **reassess with Keagan** before pulling more.

---

## 9. Hard-won lessons (why the guardrails exist — each cost real work)

- **The collision (rule 11/12).** A scaffold inserted a step into 311 plans while 34 patches sat written
  against the pre-scaffold arrays. Every `replace` then overwrote the *following* step and duplicated its
  target. Four independent verifiers misread it as "the rewrite agent destroyed a step." It was neither
  the agents' nor the applier's fault — the indices were correct for a *different* array. Fix:
  `baseStepTitles` + `checkPatchBase`. **Never interleave a content pass with outstanding patches.**
- **A crash is not a verdict.** A missing `import` made `run1-apply-patch.mjs` throw, and the catch block
  filed 17 good patches as "REJECT". Now a thrown error is status `errored`, exit code 2 — if you see it,
  fix the *pipeline* and re-run, don't discard the patches.
- **The backspace-byte bug.** A regex written through a shell→node→JS-string chain turned `\b` into a
  literal 0x08 byte that matched nothing; only `cat -A` showed it. **Edit source with the editor.**
- **False shortfalls (rule 9).** Three plans were once told to buy a board they didn't need because parts
  were binned by length separately instead of cross-packed. `packBoards` + the `provable` flag exist to
  stop this. A confident wrong buying list is worse than none.
- **Plans whose cut lists don't close.** The real value of Run 1: drawer boxes wider than their carcass,
  face-frame openings summing larger than their parts, a picnic table with no legs in the cut list,
  fasteners named that the plan doesn't sell. If the plan's own data determines the fix, make it in prose
  AND flag it; if it doesn't, describe the joint without asserting, and flag it. Never invent a number to
  paper over a broken plan.

---

## 10. Finalize & ship gate

When batch 4 + the 34 stale plans are applied and the suite is green:
1. Full suite: `npm test` (i.e. `npx vitest run`) — all green.
2. `npx tsc --noEmit` and `npx eslint .` — clean.
3. `next build` — this must run on Keagan's machine or CI, not necessarily here; confirm CI is green.
4. The `PLAN_AUDIT_BRIEF.md` §6 **completeness-critic sweep**: re-check a random sample of "verified"
   plans with a fresh critical read; feed any findings back into the loop until it comes back dry.
5. Push the branch (confirm with Keagan which branch, since `main`/`run1-plan-audit` converged).
6. **STOP.** Deliver to Keagan: a one-page summary (plans verified / returned / applied, notable
   correctness defects found) and the **exact prod-seed command** for him to run himself:
   ```
   npm run db:seed          # run against the PRODUCTION Neon env — Keagan runs this, not you
   ```
   Content does not reach production on deploy; only this manual seed publishes the rewritten steps.
   **You never run it.**

---

## 11. First-actions checklist

1. Read `CLAUDE.md`, `PLAN_AUDIT_BRIEF.md`, `run1-work/verifier-brief.md`, `run1-work/verdicts-so-far.md`.
2. `git status && git log --oneline -6`; confirm CI green; ask Keagan which branch for new commits.
3. `npx vitest run tests/run1-guards.test.ts` → expect 31 passing.
4. `node scripts/run1-apply-patch.mjs run1-work/b4g1.json` → confirm `0 rejected`, see the tier split.
5. Start the §6 loop on `b4g1.json`. Handle `b4g4.json`'s 4 known rejects (§8) with the §6-step-9 re-fix.
6. Keep chat replies short (CLAUDE.md §3): **Done / Next**. Detail goes in the ledger and `SPRINT_LOG.md`.
