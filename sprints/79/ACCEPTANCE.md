# Sprint 79 — ACCEPTANCE

Bar author: Claude Code. Written before implementation. Grader: Cursor.
Locked by `ACCEPTANCE.sha256`.

Grade = PASS ÷ **26** — the `A` and `R` ids only (A1–A20 + R1–R6). Gate = **≥95%** (25/26). Any
`R` FAIL voids the sprint regardless of grade.

`M` ids are **excluded from the denominator**. They are graded, not scored: grade every one of them
like any other id, and if you cannot run it here, mark it `FAIL` with evidence `not run — Keagan`.
(`M1` is a plain `npm run build`; only `M2` needs a human at a browser.)

Evidence format: `verify.txt:<line>` or `<file>:<line>` for every `A`/`R` id. For an id whose
ACCEPTANCE line says `evidence: manual`, cite what you actually did — the command you ran and its
result, or the file:line you inspected. "Manual" names how the check is confirmed, never a licence
to assert PASS without saying what confirmed it.

Baseline for every "before" comparison: the merge-base of this branch and `main` —
`git show $(git merge-base main HEAD):<file>`. Do not use `main` alone; it moves.

**This bar grades rendered text, not just structure** — Sprint 78 passed 23/23 while scoring 93/100
because its bar graded ids and counts on a feature that emits prose.

---

## One vocabulary (T1)

- [ ] A1 | `TRANSFORM_NAME` no longer exists anywhere in `build-steps.ts`; it imports `ROW_TRANSFORM_LABELS` | evidence: file:line
- [ ] A2 | The `arrange-rows` detail renders `Turned end-for-end` for a `rot180` step — the exact string from `row-transform.ts` | evidence: verify.txt
- [ ] A3 | The strings `rot180`, `mirrorX`, and `mirrorY` appear in neither the guide's nor the print sheet's rendered output | evidence: verify.txt
- [ ] A4 | The guide and the print sheet render the SAME wording for the same transform | evidence: verify.txt

## The route (T2)

- [ ] A5 | `src/app/designer/[id]/build/page.tsx` exists, sets `dynamic = 'force-dynamic'`, and sets `robots: { index: false, follow: false }` | evidence: file:line
- [ ] A6 | It calls `requireUser()` then `getDesign(id)` and `notFound()` when absent — no user id is read from params, query, or body | evidence: file:line
- [ ] A7 | The path is NOT added to `src/lib/public-routes.ts` | evidence: file:line
- [ ] A8 | No prefix is added to `public/sw-policy.js`, and `tests/offline.test.ts` still passes unchanged | evidence: verify.txt
- [ ] A9 | Every step title from `designBuildSteps` renders, in array order | evidence: verify.txt
- [ ] A10 | Every step's `detail` string renders | evidence: verify.txt
- [ ] A11 | Steps are numbered from 1 in document order | evidence: verify.txt
- [ ] A12 | Quantities render count, label, and every present dimension, each through `formatInches` | evidence: verify.txt
- [ ] A13 | No rendered dimension on the guide matches `/\d+\.\d+/` | evidence: verify.txt

## The control (T3)

- [ ] A14 | A `Build Plan` control renders inside the header's existing `ml-auto` group as its second child | evidence: file:line
- [ ] A15 | It links to `/designer/<designId>/build` | evidence: verify.txt
- [ ] A16 | With `designId === null` no Build Plan control renders at all — not a disabled one | evidence: verify.txt
- [ ] A17 | The right group's layout classes are byte-identical to baseline — the reserved slot absorbed the second child with no relayout | evidence: file:line

## Print (T4)

- [ ] A18 | The print sheet renders a build-steps section from the same `designBuildSteps` output | evidence: verify.txt
- [ ] A19 | Every class used inside an `@media print` rule still sits on an element — none converted to a utility | evidence: file:line

## Copy gates

- [ ] A20 | Neither rendered surface contains a safety/PPE sentence (D7 gated) or a `$` / price (D2) | evidence: verify.txt

---

## Regression gate — any FAIL voids the sprint

- [ ] R1 | `npm run verify` reports all four steps PASS and `=== EXIT: 0 ===` | evidence: verify.txt
- [ ] R2 | No change under `prisma/`, `content/`, or `src/lib/cut-optimizer.ts`; no migration added | evidence: file:line
- [ ] R3 | `build-steps.ts` changes ONLY the transform-label import and its use — step ids, ordering, quantity maths, plane-buffer counts, and slice sourcing are byte-identical to baseline | evidence: file:line
- [ ] R4 | No schema change: `serialize.ts` and the `BoardDesignConfig` shape in `types.ts` are unchanged | evidence: file:line
- [ ] R5 | No `shadow-[…]` literal introduced; elevation stays on `shadow-e1/e2/e3` | evidence: file:line
- [ ] R6 | No new dependency in `package.json` | evidence: file:line

## Manual — graded, not scored (outside the 26)

- [ ] M1 | `npm run build` succeeds | evidence: manual
- [ ] M2 | Signed-in walkthrough at `lg`: open a saved end-grain design, press Build Plan, confirm the ordered guide renders with tape fractions; open the print sheet and confirm the same steps appear | evidence: manual
