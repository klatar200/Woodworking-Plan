# Sprint 82 — Designer polish (audit P2)

## Objective
Four things a consumer notices that are wrong or unhelpful:
- **The planer warning is wrong.** It fires only above 24″, which is industrial planers, and it
  checks the finished board's width, which is the wrong axis for end grain. The default Checkerboard
  builds an 18″ panel that no hobby planer takes, and nothing says so.
- **Saved Boards.** Real end-grain designs show "Too many pieces to preview" instead of a picture,
  and the page's tab title says "Board designer".
- **The 3D-lost message is jargon.** "WebGL context lost; showing SVG preview." is never retried
  until the page reloads.
- **The Harlequin template is coaster-sized.** It builds a 7″ × 8″ board.

## Why now
BUILD_PLAN §4 Sprint 82 — Keagan 2026-10-17 chose the designer audit's P2 list after Sprint 81
closed the P0/P1 items.

## Definition of done
- The planer warning fires whenever a panel that must be flattened is wider than a 13″ benchtop
  planer, and never otherwise.
- Every saved board has a thumbnail.
- The library tab title begins "Saved Boards" (the root layout appends " · Notch").
- The fallback messages read as plain English, and a lost 3D preview can be retried in place.
- Harlequin builds a 12¼″ × 14″ board that still closes with no warnings.

## In scope
- `src/lib/board-designer/panel-geometry.ts` — the planer rule and its message
- `src/lib/board-designer/library-thumb.ts`, `src/components/designer/design-thumbnail.tsx` —
  downsampled thumbnails
- `src/app/designer/library/page.tsx` — the page title
- `src/components/designer/board-preview.tsx` — fallback copy and the retry
- `src/lib/board-designer/templates.ts` — Harlequin size
- `tests/` — new coverage plus exactly the test changes PLAN T6 authorises

## Out of scope — do not touch
- **Any other template.** Checkerboard keeps its 18″ panel and will now warn. That warning is true;
  resizing the default board is not this sprint.
- **D7 safety guidance.** The planer message keeps its existing "plan to hand-flatten" and adds no
  tool or technique advice (no drum sander, no router sled, no end-grain-in-a-planer warning).
- Board-feet maths, cut-plan maths, the build guide, the schema, server actions, `public/`,
  `prisma/`, `content/`, `src/lib/public-routes.ts`, `src/lib/cut-optimizer.ts`.
- A configurable planer width — the 13″ figure is a named constant, not a setting.

## Non-goal
Not a redesign of the library or the preview. Copy, a cap, a threshold, and one template.
