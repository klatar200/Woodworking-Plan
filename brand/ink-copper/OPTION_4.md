# Brand — Ink & Copper (Option 4) — archived

**Status:** Not active. Archived 2026-07-21 so we can revive it without re-deriving
the palette if Oak & Forest is reversed.

**Active brand:** Notch / Oak & Forest — see `brand/oak-forest/` and `DECISIONS_LOG.md`.

## Lockup direction

Same interlocking half-lap **N** mark as Oak & Forest, recolored:

| Role | Hex | Notes |
|---|---|---|
| Paper / page bg | `#FAFAF8` | Near-white, less creamy than Option 1 |
| Ink / text | `#141210` | Near-black |
| Accent (copper) | `#C87941` | Primary accent |
| Accent strong | `#A35A28` | Hover / emphasis |
| Tint | `#F3E6D8` | Soft copper wash |

## Why it was a contender

- Matched the early lockup mock (ink + warm metal) more closely than forest green
- Higher contrast paper/ink pairing
- Still craft-adjacent without the generic “warm cream DIY” look

## Why it was not chosen

Keagan selected **Option 3 — Oak & Forest** as the primary logo + palette
(2026-07-21).

## If reactivating

1. Recolor `public/brand/notch-mark.svg` (and PWA icons) to copper/ink.
2. Replace `:root` / `.dark` tokens in `src/app/globals.css` with an AA-audited
   Ink & Copper set (do **not** paste the mock hexes blindly — run the same
   contrast pass used for Oak & Forest; copper-as-text likely needs a darkened
   `--accent-text`, and `--accent-fg` may need to be ink again if copper stays light).
3. Mirror hexes in `src/lib/clerk-appearance.ts` and `THEME_CHROME_COLOR` in
   `src/lib/theme.ts`.
4. Confirm `tests/contrast.test.ts` + `tests/clerk-appearance.test.ts` green.
5. Update this file’s status and the decisions log.

See `palette-board.png` in this folder for the original mock board.
