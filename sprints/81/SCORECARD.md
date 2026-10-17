# Sprint 81 — SCORECARD

Grader: fresh-context subagent (`AGENTS.md` `Grade sprint NN`). Baseline = lock commit `c3cec59`;
graded HEAD = `76ba0c3` (working tree clean). Evidence: `sprints/81/verify.txt` (full run, all four
steps, `=== EXIT: 0 ===`), `sprints/81/changes.diff` (byte-identical to `git diff c3cec59 HEAD`),
and a native re-run at HEAD of the 9 sprint-relevant test files (9/9 files, 156/156 tests pass).

## Save readiness (T1)

- A1 | PASS | verify.txt:113 tests/board-designer-save-readiness.test.ts:77 loops TEMPLATES (9 entries), toEqual([]) for each
- A2 | PASS | verify.txt:113 tests/board-designer-save-readiness.test.ts:81 it.each over the six configs (cases at :37-67, incl. 3×27 strips and rowPattern panelId 'missing'), toEqual the exact one-element arrays
- A3 | PASS | verify.txt:113 tests/board-designer-save-readiness.test.ts:68-71 rowCount: 0 → toEqual(["This design can't be saved — undo your last change."]); source save-readiness.ts:42
- A4 | PASS | verify.txt:113 tests/board-designer-save-readiness.test.ts:85 for templates + all invalidCases, (saveBlockers(c).length === 0) toBe parseConfig(c).ok
- A5 | PASS | verify.txt:182 tests/designer-shell-save-safety.test.tsx:63 designId 'd1', copyAction, name '' → Save and Save a copy disabled; role=alert textContent contains "Can't save yet:" and 'Give the board a name.'
- A6 | PASS | verify.txt:182 tests/designer-shell-save-safety.test.tsx:73 container textContent lacks "Can't save yet:", Save disabled === false

## Panels, strips, caps (T2)

- A7 | PASS | verify.txt:113 tests/board-designer-save-readiness.test.ts:134 add-panel→delete-panel leaves no step on removed id; all-rows-on-'b' delete → toEqual([{ panelId: 'a', transform: 'none' }]); also verify.txt:10 designer-history.test.ts:522; source history.ts:280-289
- A8 | PASS | verify.txt:113 tests/board-designer-save-readiness.test.ts:100 add-strip and duplicate-strip toBe(same state) on a 40-strip panel and on a 30+30+20 = 80-strip design; source history.ts:149, :163
- A9 | PASS | verify.txt:113 tests/board-designer-save-readiness.test.ts:120 add-panel on 40+40 toBe(state); source history.ts:249
- A10 | PASS | verify.txt:113 tests/board-designer-save-readiness.test.ts:93 MAX_STRIPS_PER_PANEL toBe(40), MAX_STRIPS_TOTAL toBe(80), parseConfig(...).ok false for the 41-strip and 81-strip cases; source config-limits.ts:16-17
- A11 | PASS | verify.txt:139 tests/designer-controls.test.tsx:113 canAdd={false}: Add a strip + every Duplicate disabled, 2-strip Deletes enabled, 1-strip Delete disabled; :124 PanelEditor 40-strip panel Add a strip disabled, 40+40 Add a panel disabled
- A12 | PASS | src/lib/board-designer/history.ts:264 comment now "delete-panel removes this step again with the panel (Sprint 81)"; `git grep -n "deliberately does NOT clean" -- src/` returns nothing; guard test board-designer-save-readiness.test.ts:157 (verify.txt:113)

## No nested form (T3)

- A13 | PASS | verify.txt:182 tests/designer-shell-save-safety.test.tsx:81 walks static markup from id="designer-save-form" to its matching </form>, nested toBe(0); Save a copy form="designer-copy-form"; that form holds hidden designId/config/returnTo; source designer-shell.tsx:312-318, :191

## Drafts (T4)

- A14 | PASS | verify.txt:145 tests/designer-draft-store.test.ts:46 round-trip toEqual(parseConfig config); :57 invalid save keeps previous draft; :64 null for missing key and '{not json'
- A15 | PASS | verify.txt:145 tests/designer-draft-store.test.ts:71 Proxy storage throwing on every access: save/clear/clearAll/draftKey do not throw, loadDraft toBeNull
- A16 | PASS | verify.txt:145 tests/designer-draft-store.test.ts:79 two draft keys removed, 'notch:step:plan-x' kept; DRAFT_KEY_PREFIX toBe('notch:designer-draft:')
- A17 | PASS | verify.txt:182 tests/designer-shell-save-safety.test.tsx:119 Board name input shows 'Draft name' + restore text; Discard them → 'Checkerboard', key null, notice gone
- A18 | PASS | verify.txt:182 tests/designer-shell-save-safety.test.tsx:134 identical 'd1' and 'new' drafts: no notice, both keys null
- A19 | PASS | verify.txt:182 tests/designer-shell-save-safety.test.tsx:143 after name edit, stored draft under draftKey('d1') (= notch:designer-draft:d1, draft-store test :53) has name 'Edited board'; after Reset key null
- A20 | PASS | src/components/service-worker.tsx:147 clearAllDrafts() on the signed-in→signed-out branch (after :140/:143), before the :149 `if (!('serviceWorker' in navigator)) return;`; guard board-designer-save-readiness.test.ts:180 (verify.txt:113)
- A21 | PASS | src/lib/board-designer/draft-store.ts:25 uses window.sessionStorage; grep "localStorage" in draft-store.ts and designer-shell.tsx returns nothing; guard board-designer-save-readiness.test.ts:180 (verify.txt:113)

## Leaving with unsaved changes (T5)

- A22 | PASS | verify.txt:182 tests/designer-shell-save-safety.test.tsx:163 cancelable beforeunload defaultPrevented false while clean, true after a name edit; source designer-shell.tsx:133-142

## Error boundary (T6)

- A23 | PASS | verify.txt:139 tests/designer-controls.test.tsx:203 exactly one main, id 'main', h1 text, exact paragraph text, Reload button, Saved Boards href /designer/library; :221 source startsWith("'use client'")

## Number fields (T7)

- A24 | PASS | verify.txt:139 tests/designer-controls.test.tsx:83 '' → onValue not called, input.value '', role=status textContent toBe('Enter a number from 1/16" to 24".'); '2.25' → onValue(2.25)
- A25 | PASS | verify.txt:139 tests/designer-controls.test.tsx:93 '30' → onValue not called; blur → input.value '1.5', onCommit toHaveBeenCalledTimes(1)
- A26 | PASS | verify.txt:139 tests/designer-controls.test.tsx:102 integer, '3.6' → onValue(4)
- A27 | PASS | src/components/designer/strip-list.tsx:250 width, :268 repeat, :545 miter angle; board-settings.tsx:197 defects, :295 NumberField (used :138 panel length, :151 slice thickness, :180 plane buffer); panel-editor.tsx:208 thickness; row-pattern-editor.tsx:41 rows = 9 fields; no `function boundedNumber` in strip-list.tsx or board-settings.tsx (guard test :191, verify.txt:113)

## Collapse (T8)

- A28 | PASS | verify.txt:139 tests/designer-controls.test.tsx:142 Collapse → aria-expanded 'false', Add a strip absent; Expand → Add a strip present; source panel-editor.tsx:32, :88

## Edge-grain miters (T9)

- A29 | PASS | verify.txt:139 tests/designer-controls.test.tsx:154 edge + unmitered → queryByText('Mitered') null; edge + mitered → Mitered + exact removal text, queryByText('Wedge species') null (label exists in end-grain branch strip-list.tsx:508); checkbox at strip-list.tsx:470-477
- A30 | PASS | verify.txt:113 tests/board-designer-save-readiness.test.ts:163 edge config with mitered strip: no warning matching /lattice|Miter pattern does not close/; harlequin warnings toEqual([]); source metrics.ts:111

## Phone read path (T10)

- A31 | PASS | verify.txt:139 tests/designer-controls.test.tsx:174 Build Plan href /designer/d1/build, hint text present, Build Plan precedes Print sheet; notices toBe exact strings (board-designer-save-readiness.test.ts:209, verify.txt:113); designer-narrow.tsx:9-13 unchanged vs c3cec59 (not in diff hunk)

## Library delete (T11)

- A32 | PASS | verify.txt:139 tests/designer-controls.test.tsx:188 no submit button initially; after Delete click textContent contains `Delete "Golden"? This can't be undone.`, Delete board type=submit; Cancel → no submit, Delete back
- A33 | PASS | src/app/designer/library/page.tsx:51 `<DeleteDesignButton ... action={deleteBoardDesignAction} />`; `<form action={deleteBoardDesignAction}>` absent (guard board-designer-save-readiness.test.ts:203, verify.txt:113)

## Regression gate

- R1 | PASS | verify.txt:266-271 typecheck/lint/test/content all PASS, `=== EXIT: 0 ===`; no SUBSET RUN marker; 131 files / 1515 tests passed (verify.txt:201-202)
- R2 | PASS | src/lib/board-designer/types.ts:66 BoardDesignConfig unchanged; `git diff c3cec59 HEAD -- src/app/actions/board-designs.ts src/lib/board-designs.ts src/lib/board-designer/serialize.ts src/lib/board-designer/types.ts` is empty
- R3 | PASS | src/lib/cut-optimizer.ts:1 unchanged; `git diff --stat c3cec59 HEAD -- prisma content public src/lib/public-routes.ts src/lib/cut-optimizer.ts` is empty; no migration in changes.diff
- R4 | PASS | tests/designer-history.test.ts:522-535 (authorised #1: title, true→false, + length ≥ 1), tests/strip-drag.test.tsx:236 (authorised #2), tests/board-designer-reachability.test.ts:46-47 (authorised #3, comment only, witness unchanged); no other existing test file in changes.diff; no skip/only/todo added
- R5 | PASS | package.json:1 unchanged (package.json and package-lock.json absent from changes.diff)
- R6 | PASS | sprints/81/changes.diff:1 grep for `shadow-[` across the whole diff finds nothing
- R7 | PASS | src/app/designer/[id]/build/ and src/app/designer/[id]/print/ absent from `git diff --name-status c3cec59 HEAD`

## Manual — graded, not scored

- M1 | FAIL | not run — Keagan (npm run build writes .next; grader may create no file)
- M2 | FAIL | not run — Keagan (signed-in browser walkthrough not possible here)

---

PASS ÷ 40 = 40 ÷ 40 = 100% (A and R ids only). Gate ≥95% (38/40) met. No R id failed.
