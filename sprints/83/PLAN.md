# Sprint 83 — PLAN

Executor: **Claude Code** (implementing session, on `main`). Do T1, then T2. Grading is done by a
fresh-context subagent (`AGENTS.md` `Grade sprint NN`), never by the implementing session.

Read `GOAL.md` first — its "Out of scope" list is enforced by the `R` gates.

---

## T1 · Checkerboard is 8 strips

`src/lib/board-designer/templates.ts:105` — `mapleWalnutAlternating(12, 'cb')` becomes
`mapleWalnutAlternating(8, 'cb')`. Directly above that line, inside `panels: [`, add exactly these
two comment lines:

```ts
        // 8 × 1½″ = a 12″ panel, under a 13″ benchtop planer (Sprint 83; was 12 strips = 18″).
        // Keep the count even: rot180 of an odd count repeats the colour order and gives stripes.
```

Nothing else in the entry changes. `rowCount` stays 8, so the board is 12″ × 12″. Leave
`sourceLengthIn`, `sliceThicknessIn`, `rowPattern`, and the `rowCount` comment at `:108` as they are.

Why 8: 8 × 1½″ = 12″ ≤ 13″. 9 strips would be 13½″, and an odd count also breaks the pattern:
alternating M-W-…-M reversed is the same sequence, so every row would match and the board would be
stripes. 8 strips keep the rows alternating.

**Guardrail:** no other template changes, and no file under `src/` other than `templates.ts`.

---

## T2 · Tests

New file `tests/designer-checkerboard-83.test.ts` covering A1–A9. Use `getTemplate('checkerboard')`
for the config. Use the same helpers the existing tests use:
- `calculateMetrics`
- `layoutTopFace`
- `designCutPieces(config, metrics.panelPlan)`
- `cutPlanGroupsForConfig` (`@/components/designer/optimizer-panel`) + `totalBoards`
- `defaultCutPlanStockWidthIn`
- `designBuildSteps` + `formatBuildQuantity`
- `saveBlockers`
- `parseConfig`
- `formatBoardFeet`
- `PLANER_WIDTH_WARNING`

For A5 ("no two neighbouring squares match"), index cells by `` `${xIn},${yIn}` `` and compare each
cell with the cell at `xIn + 1.5` and at `yIn + 1.5` when one exists.

### Authorised test changes — exactly these, nothing else
Line numbers are at baseline.

1. `tests/board-3d-layout.test.ts`
   - `:26` `toHaveLength(96)` → `toHaveLength(64)`
   - `:32`–`:33` `48,` `48,` → `32,` `32,`
2. `tests/board-designer-cut-pieces.test.ts`
   - `:44` title `Checkerboard: 12 strip pieces` → `Checkerboard: 8 strip pieces` (rest of title unchanged)
   - `:46` `toHaveLength(12)` → `toHaveLength(8)`
   - `:144` Checkerboard's pinned total `'3.19'` → `'2.12'`. The other eight stay.
3. `tests/board-designer-guide-strings.test.ts`
   - `:70` `— for 6 strips` → `— for 4 strips`
   - `:73` `'6× Hard Maple strips · 14 1/4" long × 1 11/16" wide'` → `'4× Hard Maple strips · 14 1/4" long × 1 11/16" wide'`
   - `:197` (`formatBuildQuantity` with a literal `count: 6`) is NOT template-driven and stays.
4. `tests/board-designer-layout.test.ts`
   - `:9` title → `returns 8 strips × 8 rows = 64 cells, and row 1 reverses via rot180`
   - `:17` `toHaveLength(96); // 12 × 8` → `toHaveLength(64); // 8 × 8`
   - `:22` and `:23` `toHaveLength(12)` → `toHaveLength(8)`
5. `tests/board-designer-metrics.test.ts`
   - `:227` title `finished 18 × 12 × 1.5` → `finished 12 × 12 × 1.5`
   - `:232` `expect(m.finishedLengthIn).toBe(18)` → `toBe(12)`
   - `:244` `checkerboard: { length: 18,` → `checkerboard: { length: 12,`
6. `tests/board-designer-miter.test.ts` — the frozen oracle keeps its old 12-strip shape. Do not
   rewrite it to the new template; the test proves layout code, not the template.
   - `:25`–`:44` (`CHECKERBOARD_SOLID_ORACLE`) stays byte-identical.
   - `:22` doc line → `Frozen solid-strip Cell[] oracle for Sprint 57's checkerboard shape (12 strips × 8 rows).`
   - Below the oracle, add `SPRINT57_CHECKERBOARD`:
     ```ts
     /** Sprint 83 shrank the template to 8 strips, so the oracle test builds the old shape itself. */
     const SPRINT57_CHECKERBOARD: BoardDesignConfig = makeV2Config({
       name: 'Checkerboard',
       sourceLengthIn: 14,
       panels: [
         makePanel(
           'panel-1',
           'Panel 1',
           1.5,
           Array.from({ length: 12 }, (_, i) =>
             makeStrip(`cb-${i + 1}`, i % 2 === 0 ? 'hard-maple' : 'walnut', 1.5),
           ),
         ),
       ],
       rowPattern: [
         { panelId: 'panel-1', transform: 'none' },
         { panelId: 'panel-1', transform: 'rot180' },
       ],
       rowCount: 8,
     });
     ```
   - `:48`–`:52` — the test body (inside the `it(` at `:47`) becomes
     `const cells = layoutTopFace(SPRINT57_CHECKERBOARD, calculateMetrics(SPRINT57_CHECKERBOARD));`
     `expect(cells).toEqual(CHECKERBOARD_SOLID_ORACLE);`. The title stays.
   - `:17` — delete the `getTemplate` import. `:48` was its only use, and lint fails on an unused import.
7. `tests/board-designer-v2-migration.test.ts`
   - `:101` `expect(chm.finishedLengthIn).toBe(18)` → `toBe(12)`
   - Above `:99`, add `// Sprint 83: Checkerboard is 8 strips (12″). The golden-fixture test above still pins the v1 shape.`
8. `tests/board-diagram.test.tsx`
   - `:18` title `renders 96 rects` → `renders 64 rects`
   - `:29` `toBe(96)` → `toBe(64)`
   - `:43` `viewBox="0 0 18 12"` → `viewBox="0 0 12 12"`
   - `:44`–`:49` stay. Row 1 still starts Walnut, because the reverse of 8 alternating strips starts
     on strip 8.
9. `tests/designer-polish-82.test.tsx`
   - `:46` title → `fires on no template`
   - `:49` `expect(hits, t.id).toBe(t.id === 'checkerboard' ? 1 : 0)` → `expect(hits, t.id).toBe(0)`
   - The firing cases at `:61`–`:65` (14″ panel) and `:68`–`:77` (14″ edge grain) keep proving that
     the warning fires.

Verified before locking:
- Applying T1 alone turns exactly 12 tests in these 9 files red, and nothing else.
- The item-6 `SPRINT57_CHECKERBOARD` config reproduces `CHECKERBOARD_SOLID_ORACLE` exactly.
- Measured on the new template:
  - warnings `[]`; finished 12 × 12 × 1.5, 8 slices; panel `widthIn` 12, `requiredLengthIn` 12.875
  - board feet `2.12`
  - default cut plan 2 boards, stock width 3.5
  - 8 pieces at rip 1.675 × 14.275
  - 64 cells, 32 per species
  - `saveBlockers` `[]`

---

## Invariants this sprint must not break

- **Saved designs are stored whole** — no migration. The template id and the `/designer` page
  (`getTemplate('checkerboard')`, `src/app/designer/page.tsx:35`) are unchanged.
- **Dimensions = tape fractions** (CLAUDE.md §7). No new user-facing string.
- **D7 gated.** No planer or technique copy changes.

## Verification
```
npm run verify -- --out sprints/83/verify.txt
```
Then `git diff <lock-sha> HEAD --output=sprints/83/changes.diff`, where `<lock-sha>` is the commit
that added `sprints/83/ACCEPTANCE.sha256`. A fresh-context grader subagent writes
`sprints/83/SCORECARD.md`. Do not edit `ACCEPTANCE.md`.
