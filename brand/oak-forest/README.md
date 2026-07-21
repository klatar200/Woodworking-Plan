# Brand — Oak & Forest (active)

**Brand name:** Notch  
**Long form / SEO:** Notch Plans  
**Domain:** notchplans.com  
**Mark:** Interlocking half-lap **N** (forest + oak)  
**Chosen:** 2026-07-21 (Keagan)

## Assets

| File | Use |
|---|---|
| `mark-1024.png` | Master mark |
| `lockup.png` | Icon + wordmark reference |
| `icon-192.png` / `icon-512.png` / `icon-maskable-512.png` / `apple-touch-icon.png` | PWA (also copied to `public/icons/`) |
| `../public/brand/notch-mark.png` | Header condensed icon (PNG from Option 3 art) |
| `../public/brand/notch-mark.svg` | Vector fallback / editable source |
| `palette-board.png` | Original Option 3 mock board |

## Refined tokens (AA-audited — not raw mock hexes)

Mock Option 3 hues were audited against WCAG AA before shipping. Changes vs the
mock board:

- **`--accent-fg` is parchment/light**, not ink — forest green is dark enough for
  light-on-accent (chips/pills). The old orange system needed dark ink on accent.
- **`--danger` / `--ok` / `--pending`** slightly darkened so they still clear 4.5:1
  on the new parchment `--bg` (`#f6f1e7` is a hair darker than the old cream).
- **Oak `#C4A574` is logo-only** — it fails as body text on parchment (~2:1). Do
  not use it for UI text.

### Light (`:root`)

| Token | Hex |
|---|---|
| `--bg` | `#f6f1e7` |
| `--surface` | `#fffefb` |
| `--fg` | `#1e2420` |
| `--muted` | `#5c6560` |
| `--muted-2` | `#66706a` |
| `--border` | `#ddd6c8` |
| `--border-strong` | `#c9c0ae` |
| `--accent` | `#3d6b4f` |
| `--accent-strong` | `#2a4f3a` |
| `--accent-text` | `#2a4f3a` |
| `--accent-fg` | `#f6f1e7` |
| `--accent-tint` | `#e8f0ea` |
| `--accent-tint-border` | `#b5c9ba` |
| `--accent-soft` | `#e8f0ea` |
| `--danger` | `#a84d18` |
| `--ok` | `#157538` |
| `--pending` | `#a64c08` |
| `--err` | `#b3261e` |

### Dark (`.dark`)

| Token | Hex |
|---|---|
| `--bg` | `#141a16` |
| `--surface` | `#1c2420` |
| `--fg` | `#eef0ec` |
| `--muted` | `#a8b0aa` |
| `--muted-2` | `#8e978f` |
| `--border` | `#2e3832` |
| `--border-strong` | `#3d4840` |
| `--accent` | `#6fa888` |
| `--accent-strong` | `#8fbf9a` |
| `--accent-text` | `#8fbf9a` |
| `--accent-fg` | `#141a16` |
| `--accent-tint` | `#1e2e26` |
| `--accent-tint-border` | `#3d5a48` |
| `--accent-soft` | `#1e2e26` |

Functional dark values for danger/ok/pending/err stay the lightened set already
used in dark mode (see `globals.css`).

## Alternate archive

Ink & Copper (Option 4) is preserved under `brand/ink-copper/` in case we switch later.
