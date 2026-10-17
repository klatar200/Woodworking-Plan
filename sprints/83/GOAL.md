# Sprint 83 — Checkerboard fits a 13″ planer

## Objective
Every new board opens on the Checkerboard template. Its 12 strips × 1½″ make an **18″ panel**. No
benchtop planer takes that, and since Sprint 82 the designer warns on the board it gives every new
user. Resize the template so a new board can go through a 13″ planer.

## Why now
Keagan 2026-10-17: "resize the default Checkerboard template so a new board fits a 13" planer
(e.g. 8 strips x 1 1/2" = 12")". Sprint 82's GOAL put this out of its scope.

## Definition of done
- Checkerboard is **8 strips × 1½″**, a 12″ panel. With its 8 rows unchanged, that finishes a
  **12″ × 12″ × 1½″** board.
- It is still a true checkerboard: no two neighbouring squares are the same wood.
- A new board shows no warnings, and every number derived from it (cut list, board feet, cut plan,
  build guide) follows from the new size.
- Saved boards are unaffected. Configs are stored whole, so no stored design changes.

## In scope
- `src/lib/board-designer/templates.ts` — the Checkerboard entry only
- `tests/` — a new test file, plus exactly the test changes PLAN T2 authorises

## Out of scope — do not touch
- **Any other template.** Thue-Morse is also 8 × 8 at 1½″; that overlap is fine.
- The planer rule or its message (`panel-geometry.ts`), board-feet or cut-plan maths, the build
  guide, the schema, server actions, the `/designer` page, `public/`, `prisma/`, `content/`,
  `src/lib/public-routes.ts`, `src/lib/cut-optimizer.ts`.
- Migrating saved designs or sessionStorage drafts. They hold their own config.

## Non-goal
Not a template redesign. One number changes in one template, plus the tests that pinned the old one.
