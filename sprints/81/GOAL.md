# Sprint 81 — Designer save safety + controls

## Objective
A consumer never silently loses a board design, and every designer control does what it says.
Today: Save on an invalid-but-reachable design reloads the page and discards the work with no
message; Save after a deploy crashes the page; refresh or close loses everything; number fields
cannot be cleared and retyped; deleting a panel leaves a row that lies about its panel; library
Delete is one click and permanent; Collapse does nothing; Mitered is offered on edge grain; the
phone view of a saved board has no Build Plan link; and every saved-board load throws a hydration
error because one form sits inside another.

## Why now
BUILD_PLAN §4 Sprint 81, queued by Keagan 2026-10-16 from the designer consumer-readiness audit
(#1, #2, #6, #9, #10, #11, Collapse, edge-grain miter, mobile Build Plan link) plus the nested-form
hydration error found while closing Sprint 80.

## Definition of done
No reachable editor state can reach the server's silent bounce (Save is disabled with the reason
on screen), an unsaved valid design survives a reload, a crash, or an in-app navigation in the same
tab, every listed control behaves as labelled, and a saved board loads with no hydration error.

## In scope
- **New** `src/lib/board-designer/save-readiness.ts` — why a design cannot be saved, in words
- **New** `src/lib/board-designer/draft-store.ts` — per-tab draft persistence
- **New** `src/components/designer/bounded-number-input.tsx` — number input that can be cleared
- **New** `src/components/designer/delete-design-button.tsx` — two-step library delete
- **New** `src/app/designer/error.tsx` — the designer's error boundary
- `src/lib/board-designer/config-limits.ts` — strip caps as named constants
- `src/lib/board-designer/history.ts` — delete-panel cleans its rows; strip/panel caps
- `src/lib/board-designer/metrics.ts` — no lattice warnings on edge grain
- `src/components/designer/designer-shell.tsx`, `panel-editor.tsx`, `strip-list.tsx`,
  `board-settings.tsx`, `row-pattern-editor.tsx`, `designer-narrow.tsx`
- `src/app/designer/library/page.tsx`
- `src/components/service-worker.tsx` — `PrivateCacheGuard` also clears drafts on sign-out
- `tests/` — new coverage plus exactly the test changes PLAN T12 authorises

## Out of scope — do not touch
- **Server actions and data access.** `src/app/actions/board-designs.ts` and
  `src/lib/board-designs.ts` are byte-identical. The server keeps its silent bounce for structural
  failures (CLAUDE.md §7) — this sprint makes the client unable to send one, it does not add a
  server notice.
- **The schema.** `serialize.ts` and the `BoardDesignConfig` shape are unchanged. Caps live in the
  reducer and the UI; the schema already enforces them on the server.
- **Vercel Skew Protection** — plan-dependent, Keagan's call. This sprint survives skew in-app.
- `src/lib/public-routes.ts`, `public/sw-policy.js`, `prisma/`, `content/`, `src/lib/cut-optimizer.ts`,
  Sprint 80's build-guide/cut-plan files except where PLAN names them.
- Accepting fractions ("1 1/2") in number fields — a separate change; this sprint only stops the
  per-keystroke clamp.
- The planer-width warning, D7 safety copy, D2 dollars, the D1 allowance question.

## Privacy note — drafts hold a private design
Drafts go to **`sessionStorage`** (this tab only, gone when the tab closes), are written only for a
config the server would accept, and are wiped by `PrivateCacheGuard` on the signed-in → signed-out
transition, alongside the private service-worker cache (CLAUDE.md §7 Offline/SW). Never
`localStorage`: a private board would outlive the tab on a shared computer.

## Non-goal
Not autosave to the server, not multi-tab sync, not a server-side draft table.
