# Sprint 79 — PLAN

Executor: **Cursor**. Tasks are ordered; do not reorder. **T2 before T3** is binding — T3's control
links to the route T2 creates. T1 first because both T2 and T4 render the wording it settles.

**Model: `Auto`.** One import swap, one new route modelled on an existing one, one control, one
print section. Do not spend premium usage on this sprint.

Read `GOAL.md` first. Its "Out of scope" list and its Security paragraph are enforced by the `R`
gates in `ACCEPTANCE.md`.

**Sprint 78's lesson governs this bar.** That sprint passed its ACCEPTANCE 23/23 and still scored
93/100, because the bar graded ids, counts, and ordering on a feature whose entire output is prose.
This sprint puts that prose on a screen, so the checks assert **what the rendered text says**, not
merely that something rendered.

---

## T1 · One vocabulary for row transforms

`src/lib/board-designer/build-steps.ts:37`

`TRANSFORM_NAME` is a duplicate. `ROW_TRANSFORM_LABELS`
(`src/lib/board-designer/row-transform.ts:4`) already exists, is already shop language, and is
already what the print sheet renders (`src/app/designer/[id]/print/page.tsx:177`). Two maps for one
concept means the guide and the print sheet can word the same row differently.

- Import `ROW_TRANSFORM_LABELS` in `build-steps.ts`; delete `TRANSFORM_NAME` entirely.
- `arrangeRowsDetail` uses the shared labels. Its sentence shape does not change — pattern length
  first, then the transforms.
- **TWO assertions in one test go red, and both are authorised.** In
  `tests/board-designer-build-steps.test.ts`, the `arrange-rows` case asserts both old strings:
  - line 167 `toContain('as designed')` → **`'As cut'`** (`row-transform.ts:5`)
  - line 168 `toContain('turned 180°')` → **`'Turned end-for-end'`** (`row-transform.ts:6`)

  Line 169's `not.toMatch(/rot180|mirrorX|mirrorY/)` stays exactly as it is — it still holds and it
  is the assertion that keeps raw enum names out. These two lines are the only test changes T1
  authorises.

`designer-print.test.tsx:201` already asserts `'As cut'` against the print sheet, which is the
proof that `ROW_TRANSFORM_LABELS` is the established vocabulary and `TRANSFORM_NAME` was the
outlier.

**Guardrail:** wording changes; **logic does not**. `arrange-rows` still states the pattern length
and every distinct transform, ids and ordering are untouched, and `/\d+\.\d+/` still must not match
any `detail` — note "Turned end-for-end" removes the `180°`, so this gets easier, not harder.

---

## T2 · The build guide route

**Create** `src/app/designer/[id]/build/page.tsx`

Model it on `src/app/designer/[id]/print/page.tsx` — that route is already correct on every point
that matters here.

- `export const dynamic = 'force-dynamic'` (`designer/[id]/print/page.tsx:22`).
- `metadata` with `robots: { index: false, follow: false }` (`designer/[id]/print/page.tsx:24`–`27`).
- `await requireUser()`, then `await getDesign(id)`, then `notFound()` when absent
  (`designer/[id]/print/page.tsx:33`–`37`). **Take no user id from params, query, or body.**
- Compute `calculateMetrics(config)` and call `designBuildSteps(config, metrics)`.
- Render steps **in array order**, numbered from 1, each with its `title`, its `detail`, and its
  `quantities`.
- A quantity renders its `count`, its `label`, and whichever of `lengthIn` / `widthIn` /
  `thicknessIn` are present — **every dimension through `formatInches`** (`@/lib/format`).
- Include a "Back to the designer" link, as the print route does
  (`designer/[id]/print/page.tsx:53`–`55`).

**Guardrail — CLAUDE.md §7 IDOR.** Ownership comes from the session via `getDesign`, never from the
URL beyond the design id itself. Copy the print route's shape rather than inventing one.

**Guardrail:** do **not** add this path to `src/lib/public-routes.ts` — that allowlist fails closed
and adding an entry is a security decision. Do **not** add a service-worker prefix either;
`/designer` is already on `NEVER_CACHE_PREFIXES` (`public/sw-policy.js:70`) and the check is
`path === prefix || path.startsWith(prefix + '/')` (`public/sw-policy.js:126`), so this route is
already denied. Adding a redundant entry would imply the existing one is insufficient.

---

## T3 · Build Plan control in the reserved slot

`src/components/designer/designer-shell.tsx:188`

Sprint 76 built the right action group to hold two children and shipped one. Add the second.

- A link to `/designer/${designId}/build`, labelled **Build Plan**, styled with an existing
  button class from `@/lib/ui` — do not invent a variant.
- It renders **only when `designId` is non-null**. An unsaved draft has nothing to build a guide
  from, and Sprint 76's GOAL is explicit: ship no dead control.
- It sits inside the existing `ml-auto` group. Adding it must not change that group's layout
  classes — that was the whole point of reserving the slot.
- **Update the comment at `designer-shell.tsx:187`.** It reads "shopping only this sprint;
  structured for a second child later". That is now false. A stale comment that argues against the
  code is worse than none (CLAUDE.md §7).

**Guardrail — Tailwind source order (CLAUDE.md §8):** this is a nav row, which is exactly where
these bite. Put `border` **and** its colour on each variant; use `pt-`/`pb-` rather than `py-`
alongside them; two `shadow-*` do not compose.

**Do NOT edit `tests/designer-shell.test.tsx:408`.** Its regex is
`/ml-auto flex flex-wrap items-center gap-\[0\.5rem\]">\s*\{shoppingListControl\}/` — it requires
`{shoppingListControl}` to follow the group's opening tag, and it does **not** anchor the group's
end. Appending Build Plan as the second child leaves it green. It only breaks if you put Build Plan
first, which A14 forbids anyway. If you believe it has gone red, that is a signal you ordered the
children wrong — fix the order, not the test. Editing it is an out-of-scope change and an `R` FAIL.

---

## T4 · Build steps on the print sheet

`src/app/designer/[id]/print/page.tsx`

Add a build-steps section using the **same** `designBuildSteps(config, metrics)` output, so the
sheet and the screen cannot drift.

- Use the existing print structure: a `<section className="print-section">` with an `<h2>`, matching
  the sections already there (`designer/[id]/print/page.tsx:87` and `:187`).
- Steps numbered, each with title, detail, and quantities.

**Guardrail — CLAUDE.md §8, broken three times.** Any class inside an `@media print` block MUST
stay on its element. `print-section`, `print-table`, `print-header`, `no-print` are retained
component classes and unlayered — converting one to a utility makes it print (or stop printing).
Add classes; do not rename or "modernise" the existing ones.

**Guardrail:** `break-inside: avoid` behaviour on rows is part of the print sheet's contract. A step
that splits across a page break is a bug in a shop document.

---

## T5 · Tests

Cover, at minimum:
- The route renders every step title in `designBuildSteps` order, numbered.
- Each step's `detail` text appears.
- Quantities render with tape fractions; no raw decimal in the rendered output.
- The rendered output contains none of `rot180`, `mirrorX`, `mirrorY`.
- The guide and the print sheet render the **same** transform wording.
- The Build Plan control appears with a `designId` and is absent without one.
- No safety/PPE sentence and no `$` in either rendered surface.

Mirror how `tests/designer-print.test.tsx` exercises the print route for the auth/owner-scoping
shape.

**Guardrail:** assert the behaviour the user gets, not the shape of the implementation.

---

## Scope note — tests

Exactly one existing test change is authorised: the `'turned 180°'` assertion named in T1. Any
other red test is a signal to report in SCORECARD, not to loosen. Deleting a test, weakening an
assertion, or skipping it to get green is an out-of-scope change and an `R` FAIL.

## Invariants this sprint must not break

- **`src/lib/public-routes.ts` is an ALLOWLIST that fails closed.** Adding an entry is a security
  decision. This route does not get one.
- **Never accept a user id from client input** — `getDesign` scopes by session.
- **D7 safety guidance gated; D2 cost = tiers only.** No PPE copy, no dollar figures.
- **Dimensions are tape-measure fractions** (CLAUDE.md §7), never decimals.
- **`@media print` classes stay on their elements** (CLAUDE.md §8) — T4 is the exposure.
- **Elevation** — `shadow-e1/e2/e3` only, never a `shadow-[…]` literal; a guard scans components.
- **Desktop-only (`lg+`)** — the designer shell gate is unchanged; do not touch the narrow path.
- **Sprint 78 logic is settled** — `build-steps.ts` changes only which label map it imports.

## Verification

```
npm run verify -- --out sprints/79/verify.txt
```
Never a shell redirect — `>` writes UTF-16LE on Windows and breaks every downstream parser.
Grade every `ACCEPTANCE.md` id in `sprints/79/SCORECARD.md`, citing `verify.txt:<line>` or
`<file>:<line>`, and state the branch name at the top. Do not edit `ACCEPTANCE.md`. Commit to
`cursor/sprint-79-<slug>`; do not push or merge.
