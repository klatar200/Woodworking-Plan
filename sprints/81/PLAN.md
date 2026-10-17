# Sprint 81 — PLAN

Executor: **Claude Code** (implementing session, on `main`). Tasks are ordered; do not reorder.
T1 before T3 and T4 (both gate on save readiness). Grading is done by a fresh-context subagent
(`AGENTS.md` `Grade sprint NN`), never by the implementing session.

Read `GOAL.md` first — its "Out of scope" list and Privacy note are enforced by the `R` gates.
Every user-facing string below is exact; the bar asserts it.

**Guardrail — apostrophes and quotes (applies to every task):** write strings that contain `'` or
`"` as JavaScript string expressions in JSX — `{"Can't save yet:"}`, `` {`Delete "${name}"? This can't be undone.`} `` —
never as literal JSX text. Literal text trips `react/no-unescaped-entities` (lint fails), and the
repo's usual `&rsquo;` renders a curly quote that is not the ASCII string the bar asserts.

---

## T1 · Say why a design cannot be saved — and block the Save

**Create** `src/lib/board-designer/save-readiness.ts`

```ts
export function saveBlockers(config: BoardDesignConfig): string[]
```
Returns `[]` exactly when `parseConfig(config).ok` (the server's own gate, `src/app/actions/board-designs.ts:45`).
Otherwise it returns these messages, in this order, each at most once (B3/B4 once per offending panel):

| id | condition | message |
|---|---|---|
| B1 | `config.name.length === 0` | `Give the board a name.` |
| B2 | any panel `label.length === 0` | `Give every panel a label.` |
| B3 | a panel with 0 strips | `"<label>" needs at least one strip.` |
| B4 | a panel with more than 40 strips | `"<label>" has more than 40 strips.` |
| B5 | more than 80 strips in total | `A board can have at most 80 strips.` |
| B6 | a row-pattern step whose panel id is not in `config.panels` | `A row in the pattern uses a deleted panel.` |
| B7 | parse fails and none of B1–B6 applied | `This design can't be saved — undo your last change.` |

In B3/B4 `<label>` is the panel label, or `Panel <n>` (1-based index) when the label is empty.

**Edit** `src/components/designer/designer-shell.tsx`
- `const blockers = useMemo(() => saveBlockers(config), [config])`; `canSave = blockers.length === 0`.
- The Save button (`designer-shell.tsx:128`) and the Save a copy button get `disabled={!canSave}`.
- Directly after the `Unsaved changes` line (`designer-shell.tsx:200`), when `blockers.length > 0`,
  render a `role="alert"` block, `hidden lg:block` like that line: the text `Can't save yet:`
  followed by a `<ul>` with one `<li>` per blocker.

**Guardrail — CLAUDE.md §7, server actions never throw and structural bounces stay silent.** The
server is out of scope (GOAL). The client stops a legitimate user reaching the bounce; it does not
add a notice to it. Disabling the form's default button also blocks implicit (Enter-key)
submission — that is intended.

---

## T2 · Deleting a panel cleans up, and caps can't be overrun

**Edit** `src/lib/board-designer/config-limits.ts` — add `export const MAX_STRIPS_PER_PANEL = 40;`
and `export const MAX_STRIPS_TOTAL = 80;` with a comment that they mirror `serialize.ts`'s schema
(which stays untouched). Leave the existing `32 * 1024` line as it is (`tests/board-designer-v2-migration.test.ts:284`).

**Edit** `src/lib/board-designer/history.ts`
- `delete-panel` (`history.ts:261`): also remove every row-pattern step whose `panelId` is the
  deleted panel. If that empties `rowPattern`, set it to `[{ panelId: <first remaining panel id>,
  transform: 'none' }]`. Replace the comment that says dangling steps are left on purpose — it is now
  false (CLAUDE.md §7: a stale comment that argues against the code is worse than none). Also update
  the matching remark in `add-panel` (`history.ts:248`).
- `add-strip` (`history.ts:136`) and `duplicate-strip` (`history.ts:149`): return `config` unchanged
  when the panel already has `MAX_STRIPS_PER_PANEL` strips or the design has `MAX_STRIPS_TOTAL`.
- `add-panel` (`history.ts:228`): return `config` unchanged when total strips + the source panel's
  strip count would exceed `MAX_STRIPS_TOTAL`.

**Edit** `src/components/designer/panel-editor.tsx` and `src/components/designer/strip-list.tsx`
- `StripList` gains an optional prop `canAdd?: boolean` (default `true`). When false, both "Add a
  strip" buttons (`strip-list.tsx:178`, `:190`) and every "Duplicate" (`strip-list.tsx:399`) are
  `disabled`. `PanelEditor` passes `canAdd` = panel below 40 strips AND design below 80.
- A strip's "Delete" (`strip-list.tsx:402`) is `disabled` when its panel has exactly one strip.
  The zero-strip empty state stays (a test renders it).
- "Add a panel" (`panel-editor.tsx:42`) is also `disabled` when adding would exceed 80 strips,
  counting the strips of the panel it copies: the expanded panel, or the last panel when none is
  expanded (the reducer's own fallback).

---

## T3 · No form inside a form

`src/components/designer/designer-shell.tsx:109` renders "Save a copy" as `<form action={copyAction}>`,
and `previewHeaderActions` puts it inside the save `<form>` (`designer-shell.tsx:203`). The browser
drops the nested `<form>` from the server HTML, so React reports hydration error #418 on every
saved-board load.

- Add `const COPY_FORM_ID = 'designer-copy-form'`. When `designId && copyAction`, render
  `<form id={COPY_FORM_ID} action={copyAction} hidden>` holding the three hidden inputs the copy form
  has today (`designId`, `config` = `serializedConfig`, `returnTo`), **outside** the save form —
  immediately before it.
- `saveCopyControl` becomes `<button type="submit" form={COPY_FORM_ID} className={btnGhost}
  disabled={!canSave}>Save a copy</button>`; the unsaved-draft branch is unchanged.
- Keep the name `saveCopyControl` and its place first in `previewHeaderActions`
  (`tests/designer-shell.test.tsx:404`–`406` asserts that order).

**Guardrail:** do not use a `formAction` button inside the save form instead. It would become the
save form's first submit button, so Enter in any designer field would submit a copy.

---

## T4 · Keep an unsaved design for the life of the tab

**Create** `src/lib/board-designer/draft-store.ts` — no React. Every function takes an optional
`storage?: Storage` (tests pass a fake); the default is `window.sessionStorage`, **resolved inside
the `try`** — merely reading `window.sessionStorage` throws when cookies are blocked. Every storage
access is inside `try/catch` and never throws (`src/lib/step-progress.ts:94`).

```ts
export const DRAFT_KEY_PREFIX = 'notch:designer-draft:';
export function draftKey(designId: string | null): string        // prefix + (designId ?? 'new')
export function saveDraft(designId: string | null, config: BoardDesignConfig, storage?: Storage): void
export function loadDraft(designId: string | null, storage?: Storage): BoardDesignConfig | null
export function clearDraft(designId: string | null, storage?: Storage): void
export function clearAllDrafts(storage?: Storage): void
```
- `saveDraft` stores `JSON.stringify(parseConfig(config).config)` **only when the parse is ok**;
  otherwise it leaves any previous draft untouched.
- `loadDraft` returns `parseConfig(JSON.parse(raw)).config`, or `null` for missing, malformed, or
  invalid data.
- `clearAllDrafts` removes every key starting with `DRAFT_KEY_PREFIX` and no other key.

**Edit** `src/components/designer/designer-shell.tsx`
- Compare designs through `sameDesign(a, b)` = `configsEqual` on both after `parseConfig` (when a
  parse fails, compare the raw config). Templates may omit `planeBuffer`; the parse adds it.
- **Mount (one effect, runs once, after hydration):**
  1. If `designId` is set and `loadDraft(null)` is the same design as `initialConfig`, `clearDraft(null)` —
     that "new" draft was just saved as this design.
  2. `draft = loadDraft(designId)`. None → stop. Same design as `initialConfig` → `clearDraft(designId)`
     and stop. Otherwise `dispatch({ type: 'load', config: draft })` and show the restore notice.
- **Persist (an effect on `[serializedConfig, initialConfig]`, skipping the mount commit):** not
  dirty → `clearDraft(designId)`; dirty → `saveDraft(designId, config)`. `initialConfig` is in the
  dependencies because an update-save redirects to the same URL without remounting
  (`src/app/actions/board-designs.ts:92`): `config` does not change, `initialConfig` does, and the
  now-saved draft must be cleared.
- Restore notice: `role="status"`, **visible at every width** (a phone visit restores into the
  read-only view, which must say so), text `Restored unsaved changes from earlier in this tab.` and a
  button `Discard them` that dispatches `load` with `initialConfig`, calls `clearDraft(designId)`,
  and hides the notice.
- Accepted cost: `saveBlockers` and the draft store run `parseConfig`, which brings `zod` into the
  designer's client bundle. The designer is desktop-only authoring; do not hand-roll a second
  validator to avoid it — one gate, the server's.

**Edit** `src/components/service-worker.tsx` — in `PrivateCacheGuard`, call `clearAllDrafts()` at the
signed-in → signed-out transition (`service-worker.tsx:141`), **before** the service-worker early
return, so drafts are wiped even where no worker is registered.

**Guardrail — privacy (GOAL):** `sessionStorage` only. No `localStorage`, no cookie, no server.

---

## T5 · Warn before leaving with unsaved changes

`designer-shell.tsx` — while `dirty`, register a `beforeunload` listener that calls
`event.preventDefault()` and sets `event.returnValue = ''`; remove it when clean and on unmount.
In-app navigation is covered by T4's draft, not by this listener.

---

## T6 · A crash in the designer is recoverable

**Create** `src/app/designer/error.tsx` (`'use client'`, the Next.js segment error boundary for
`/designer` and its children). It renders exactly one `<main id="main">` with:
- `<h1>` `Something went wrong on this page.`
- `<p>` `This usually means Notch was updated while the page was open. Reload to carry on — unsaved board changes in this tab are kept.`
- a button `Reload` that calls `window.location.reload()`
- a link `Saved Boards` to `/designer/library`

It logs the error with `console.error` in an effect. This is what replaces the bare "Application
error" page when Save hits a server action from an older deploy.

**Guardrail — SSR (66):** this is `error.tsx`, not `loading.tsx`; it adds no Suspense boundary.

---

## T7 · Number fields you can clear and retype

**Create** `src/components/designer/bounded-number-input.tsx`

```tsx
export function BoundedNumberInput(props: {
  value: number; min: number; max: number; step: number;
  integer?: boolean;                    // round accepted values
  formatBound?: (n: number) => string;  // default String
  onValue: (n: number) => void;         // only ever called with an in-range value
  onCommit?: () => void;                // on blur
  name?: string; className?: string; 'aria-label'?: string;
})
```
(No explicit return type — `@types/react` 19 has no global `JSX` namespace.)
- Holds the typed text in local state. `onChange`: store the text; when it is non-empty, finite, and
  within `[min, max]`, call `onValue` (rounded when `integer`). Otherwise call nothing.
- While the text is not a valid in-range number, set `aria-invalid="true"` and render a
  `<span role="status">` reading `Enter a number from <formatBound(min)> to <formatBound(max)>.`
- `onBlur`: if the text is invalid, put back `String(value)`; then call `onCommit`.
- When `value` changes from outside (undo, template load) while the input is not focused, show it.

Replace the clamp-per-keystroke inputs with it — keep each field's existing `name`, label, `min`,
`max`, `step`, coalesce-on-blur, and the width field's snap to 1/16″ on blur:

| field | file | bounds | formatBound |
|---|---|---|---|
| Strip width | `strip-list.tsx:247` | 0.0625–24 | `formatInches` |
| Repeat | `strip-list.tsx:267` | 1–20, integer | `String` |
| Miter angle | `strip-list.tsx:511` | 5–85 | `` n => `${n}°` `` |
| Panel thickness | `panel-editor.tsx:187` | 0.125–4 | `formatInches` |
| Panel length / Slice thickness / Plane buffer | `board-settings.tsx:271` (`NumberField`) | as passed | `formatInches` |
| Defects & snipe (%) | `board-settings.tsx:198` | 0–100, integer | `String` |
| Rows (count) | `row-pattern-editor.tsx:40` | 1–60, integer | `String` |

Delete the `boundedNumber` helpers in `strip-list.tsx` and `board-settings.tsx` once unused.

---

## T8 · Collapse collapses

`src/components/designer/panel-editor.tsx:24` — `expandedId` becomes `string | null`, starting at
the first panel's id. `null` means the user collapsed it: nothing is expanded. A non-null id that
no longer matches a panel (a template load, a restored draft, a deleted panel — template panel ids
differ: `panel-1`, `wide-a`, `full`, `course`) falls back to the first panel, as today. The header
button (`panel-editor.tsx:71`) toggles: open → `null`; closed → that panel's id. With nothing
expanded, "Add a panel" still copies the last panel (the reducer's fallback).

---

## T9 · Miters are an end-grain feature

- `strip-list.tsx` `MiterControls` (`strip-list.tsx:432`) receives `grain`. Edge grain and no miter →
  render no miter section at all. Edge grain and a miter (left over from switching grain) → render
  the Mitered checkbox (checked, so it can be removed) and the text
  `Miters only apply to end-grain boards. Uncheck Mitered to remove it.` — no wedge, angle, corner,
  or closing-thickness controls.
- `src/lib/board-designer/metrics.ts:110` — run the miter closure warnings only when
  `config.grain === 'end'`.

---

## T10 · The phone view links to the build plan

`src/components/designer/designer-narrow.tsx` — export `BUILD_PLAN_HINT = 'Every cut, glue-up and
slice, in order.'` and, for a saved design, add a card before the Print sheet card
(`designer-narrow.tsx:109`) with a `btnPrimary` link `Build Plan` (the desktop control's casing,
`designer-shell.tsx:193`) to `/designer/<designId>/build` and
the hint beneath it, styled like the Print sheet card. Do not change the Sprint 54 notices
(`designer-narrow.tsx:9`–`13` are byte-exact by decision).

---

## T11 · Library delete asks first

**Create** `src/components/designer/delete-design-button.tsx` (`'use client'`), props
`{ designId, name, action }` where `action` is the server action.
- First state: a `btnGhost` button `Delete` (type `button`) — no form, nothing submits.
- After it is clicked: a form posting to `action` with hidden `designId` and
  `returnTo=/designer/library`, the text `Delete "<name>"? This can't be undone.`, a `btnDanger`
  submit `Delete board`, and a `btnGhost` button `Cancel` that returns to the first state.

`src/app/designer/library/page.tsx:50` — replace the inline delete form with
`<DeleteDesignButton designId={design.id} name={design.name} action={deleteBoardDesignAction} />`.

---

## T12 · Tests

New coverage for every check in ACCEPTANCE. RTL tests use `@vitest-environment jsdom` like
`tests/board-settings-target.test.tsx:2`; route/static renders follow `tests/designer-build.test.tsx`.

Rendering `DesignerShell` in jsdom (A5, A6, A17–A19, A22): stub `window.matchMedia`
(`matches: false`) — the shell's keydown effect calls it (`designer-shell.tsx:75`) and jsdom lacks
it — and mock `next/link` as `tests/designer-build.test.tsx:9` does. The 3D preview needs no mock:
without WebGL it falls back to the 2D diagram. Assert user-facing strings on `textContent`, not on
static markup (`renderToStaticMarkup` escapes `'` and `"`).

### Authorised test changes — exactly these three, nothing else
1. `tests/designer-history.test.ts:522`–`534` — "delete-panel still leaves dangling rowPattern
   entries" becomes "delete-panel removes its rows": after add-panel then delete-panel, no step
   references the removed id and `rowPattern.length >= 1`.
2. `tests/strip-drag.test.tsx:236` — its harness is edge grain (`strip-drag.test.tsx:81`), where T9
   removes the miter section: `getByText('Mitered')` becomes `queryByText('Mitered')` asserted
   `toBeNull()`.
3. `tests/board-designer-reachability.test.ts:46` — comment only: the editor can no longer produce
   that state after T2; say it is a data-level witness. The witness itself is unchanged.

Any other red test is a signal to report, not to loosen. Deleting, skipping, or weakening an
assertion outside this list is an `R` FAIL.

---

## Invariants this sprint must not break

- **Server actions never throw; structural bounces stay silent** (CLAUDE.md §7) — server untouched.
- **Never accept identity from the client** — drafts are keyed by design id in the browser only;
  nothing new reaches the server.
- **Offline/SW privacy** — private data that outlives a sign-out is wiped by `PrivateCacheGuard`;
  drafts join that wipe (T4).
- **Tailwind traps** (CLAUDE.md §8) — `border` + colour on each variant, `pt-`/`pb-` not `py-` beside
  them, `shadow-e1/e2/e3` only, `:active` not `:hover` for press.
- **Desktop-only designer (D6)** — authoring stays `lg+`; T10 only adds a read-path link.
- **One main landmark** — `error.tsx` renders exactly one `<main>` (`tests/main-landmark.test.ts`).

## Verification
```
npm run verify -- --out sprints/81/verify.txt
```
Never a shell redirect. Then `git diff <lock-sha> HEAD --output=sprints/81/changes.diff`, where
`<lock-sha>` is the commit that added `sprints/81/ACCEPTANCE.sha256`. A fresh-context grader subagent
writes `sprints/81/SCORECARD.md`. Do not edit `ACCEPTANCE.md`.
