# Sprint 81 — ACCEPTANCE

Bar author: Claude Code. Written before implementation. Grader: a fresh-context subagent
(`AGENTS.md` `Grade sprint NN`) — never the implementing session.
Locked by `ACCEPTANCE.sha256`.

Grade = PASS ÷ **40** — the `A` and `R` ids only (A1–A33 + R1–R7). Gate = **≥95%** (38/40). Any
`R` FAIL voids the sprint regardless of grade.

`M` ids are **excluded from the denominator**. Grade them like any other id; if one cannot be run,
mark it `FAIL` with evidence `not run — Keagan`.

Evidence format: `verify.txt:<line>` or `<file>:<line>` for every `A`/`R` id. For `evidence: manual`,
cite what was actually done. For `evidence: verify.txt`, cite the line where the test file that
asserts the statement passed; a statement no test asserts is a FAIL.

Baseline for every "before" comparison: the commit that added this pack's `ACCEPTANCE.sha256`
(`git log --format=%H -1 -- sprints/81/ACCEPTANCE.sha256`) — `git show <lock-sha>:<file>`.
`changes.diff` is cut against the same SHA.

"The 9 templates" = `TEMPLATES` from `src/lib/board-designer/templates.ts`.

---

## Save readiness (T1)

- [ ] A1 | `saveBlockers` returns `[]` for each of the 9 templates | evidence: verify.txt
- [ ] A2 | For six configs — empty name; a panel labelled `''`; panel "Panel 1" with 0 strips; panel "Panel 1" with 41 strips; three panels of 27 strips; a row step pointing at a missing panel id — `saveBlockers` returns exactly `['Give the board a name.']`, `['Give every panel a label.']`, `['"Panel 1" needs at least one strip.']`, `['"Panel 1" has more than 40 strips.']`, `['A board can have at most 80 strips.']`, `['A row in the pattern uses a deleted panel.']` respectively | evidence: verify.txt
- [ ] A3 | A config with `rowCount: 0` returns exactly `["This design can't be saved — undo your last change."]` | evidence: verify.txt
- [ ] A4 | For every config used in A1–A3, `saveBlockers(c).length === 0` equals `parseConfig(c).ok` | evidence: verify.txt
- [ ] A5 | `DesignerShell` rendered in jsdom with a design id, a `copyAction`, and a config with `name: ''` has the Save and Save a copy buttons `disabled`, and a `role="alert"` element whose `textContent` contains `Can't save yet:` and `Give the board a name.` | evidence: verify.txt
- [ ] A6 | `DesignerShell` rendered in jsdom with a valid config has no `Can't save yet:` in its `textContent` and an enabled Save button | evidence: verify.txt

## Panels, strips, caps (T2)

- [ ] A7 | After `add-panel` then `delete-panel` on the new panel, no row step references the removed id; and deleting a panel that every row used leaves `rowPattern` equal to `[{ panelId: <first remaining id>, transform: 'none' }]` | evidence: verify.txt
- [ ] A8 | `add-strip` and `duplicate-strip` leave the state unchanged (same object) on a panel holding 40 strips, and on a design holding 80 strips | evidence: verify.txt
- [ ] A9 | `add-panel` leaves the state unchanged when the copy would take the design past 80 strips | evidence: verify.txt
- [ ] A10 | `MAX_STRIPS_PER_PANEL === 40`, `MAX_STRIPS_TOTAL === 80`, and `parseConfig` rejects a 41-strip panel and an 81-strip design | evidence: verify.txt
- [ ] A11 | `StripList` with `canAdd={false}` renders "Add a strip" and every "Duplicate" disabled; on a one-strip panel the strip's "Delete" is disabled, on a two-strip panel both are enabled; `PanelEditor` with a 40-strip panel renders that panel's "Add a strip" disabled, and with 80 strips in total renders "Add a panel" disabled | evidence: verify.txt
- [ ] A12 | `history.ts` no longer contains a comment stating that delete-panel leaves dangling steps deliberately (`git grep -n "deliberately does NOT clean"` finds nothing in `src/`) | evidence: file:line

## No nested form (T3)

- [ ] A13 | The static render of `DesignerShell` with a design id and a `copyAction` contains no `<form` between the save form's opening tag and its matching `</form>`; the "Save a copy" button's `form` attribute equals the id of a form holding hidden `designId`, `config`, and `returnTo` inputs | evidence: verify.txt

## Drafts (T4)

- [ ] A14 | With a fake storage: `saveDraft` of a valid config then `loadDraft` returns that config after `parseConfig`; `saveDraft` of an invalid config leaves the previous draft in place; `loadDraft` returns `null` for a missing key and for malformed JSON | evidence: verify.txt
- [ ] A15 | With a storage whose every method throws, `saveDraft`, `loadDraft`, `clearDraft`, `clearAllDrafts` and `draftKey` all return without throwing, and `loadDraft` returns `null` | evidence: verify.txt
- [ ] A16 | `clearAllDrafts` removes every key starting with `notch:designer-draft:` and leaves a key that does not | evidence: verify.txt
- [ ] A17 | Rendered (jsdom) with `sessionStorage` holding a valid draft for its design id whose name differs from `initialConfig`, `DesignerShell` shows the draft's name in the Board name input and the text `Restored unsaved changes from earlier in this tab.`; clicking `Discard them` shows `initialConfig`'s name again and removes the stored key | evidence: verify.txt
- [ ] A18 | Rendered with a stored draft equal to `initialConfig`, the shell shows no restore notice and removes the key; a shell for a saved design removes a stored `new` draft equal to its `initialConfig` | evidence: verify.txt
- [ ] A19 | After changing the Board name in a rendered shell, `sessionStorage` holds the edited config under `notch:designer-draft:<id>`; after Reset the key is absent | evidence: verify.txt
- [ ] A20 | `PrivateCacheGuard` calls `clearAllDrafts()` on the signed-in → signed-out transition, before the `'serviceWorker' in navigator` early return | evidence: file:line
- [ ] A21 | Neither `draft-store.ts` nor `designer-shell.tsx` contains `localStorage` | evidence: file:line

## Leaving with unsaved changes (T5)

- [ ] A22 | In a rendered shell, a dispatched `beforeunload` event is not `defaultPrevented` while the design is unchanged, and is `defaultPrevented` after an edit | evidence: verify.txt

## Error boundary (T6)

- [ ] A23 | `src/app/designer/error.tsx` starts with `'use client'` and renders exactly one `<main id="main">` containing the heading `Something went wrong on this page.`, the paragraph `This usually means Notch was updated while the page was open. Reload to carry on — unsaved board changes in this tab are kept.`, a `Reload` button, and a `Saved Boards` link to `/designer/library` | evidence: verify.txt

## Number fields (T7)

- [ ] A24 | `BoundedNumberInput` (min 0.0625, max 24, `formatBound: formatInches`): changing the text to `''` calls `onValue` zero times, leaves the input empty, and shows `Enter a number from 1/16" to 24".`; changing it to `2.25` then calls `onValue(2.25)` | evidence: verify.txt
- [ ] A25 | Changing the text to `30` (max 24) does not call `onValue`; blurring while the text is invalid restores `String(value)` and calls `onCommit` once | evidence: verify.txt
- [ ] A26 | With `integer`, changing the text to `3.6` calls `onValue(4)` | evidence: verify.txt
- [ ] A27 | No `function boundedNumber` remains in `strip-list.tsx` or `board-settings.tsx`, and each of the nine fields in PLAN T7 renders a `BoundedNumberInput` | evidence: file:line

## Collapse (T8)

- [ ] A28 | In `PanelEditor`, clicking "Collapse" on the open panel sets its `aria-expanded` to `"false"` and removes its "Add a strip" button from the document; clicking "Expand" brings it back | evidence: verify.txt

## Edge-grain miters (T9)

- [ ] A29 | `StripList` with `grain="edge"` and an unmitered selected strip renders no `Mitered` checkbox; with a mitered selected strip it renders the checkbox, the text `Miters only apply to end-grain boards. Uncheck Mitered to remove it.`, and no `Wedge species` control | evidence: verify.txt
- [ ] A30 | `calculateMetrics` on an edge-grain config containing a mitered strip returns no warning containing `lattice` or `Miter pattern does not close`, and the Harlequin template's warnings are still `[]` | evidence: verify.txt

## Phone read path (T10)

- [ ] A31 | `DesignerNarrowSurface` with a design id renders a link with text `Build Plan` to `/designer/<id>/build` and the text `Every cut, glue-up and slice, in order.`, before the `Print sheet` link; `DESIGNER_NEW_NARROW_NOTICE` and `DESIGNER_EDIT_NARROW_NOTICE` are byte-identical to baseline | evidence: verify.txt

## Library delete (T11)

- [ ] A32 | `DeleteDesignButton` (jsdom) for a design named `Golden` first renders a `Delete` button and no submit button; after it is clicked its `textContent` contains `Delete "Golden"? This can't be undone.`, it renders a submit button `Delete board`, and a `Cancel` button that restores the first state | evidence: verify.txt
- [ ] A33 | `src/app/designer/library/page.tsx` renders `DeleteDesignButton` and no longer contains `<form action={deleteBoardDesignAction}>` | evidence: file:line

---

## Regression gate — any FAIL voids the sprint

- [ ] R1 | `npm run verify` reports all four steps PASS and `=== EXIT: 0 ===` | evidence: verify.txt
- [ ] R2 | `src/app/actions/board-designs.ts`, `src/lib/board-designs.ts`, and `src/lib/board-designer/serialize.ts` are byte-identical to baseline, and the `BoardDesignConfig` type is unchanged | evidence: file:line
- [ ] R3 | No change under `prisma/`, `content/`, or `public/`, to `src/lib/public-routes.ts`, or to `src/lib/cut-optimizer.ts`; no migration added | evidence: file:line
- [ ] R4 | No existing test assertion is changed, deleted, or skipped except the three listed in PLAN T12 "Authorised test changes" | evidence: file:line
- [ ] R5 | No new dependency in `package.json` | evidence: file:line
- [ ] R6 | No `shadow-[…]` literal is introduced | evidence: file:line
- [ ] R7 | No file under `src/app/designer/[id]/build/` or `src/app/designer/[id]/print/` changes (Sprint 80's surfaces) | evidence: file:line

## Manual — graded, not scored (outside the 40)

- [ ] M1 | `npm run build` succeeds | evidence: manual
- [ ] M2 | Signed in at `lg` on a saved board: clear the Board name — Save and Save a copy disable and `Can't save yet:` appears; restore the name, change the rows count, reload — the restore notice appears with the change kept; Collapse closes the panel; on the library, Delete asks before deleting; the console shows no React error #418 on load | evidence: manual
