# Oak &amp; Forest visual authority — 3 homepage directions (A1)

Sprint 46, Workstream A. **Options only — nothing shipped.** Three self-contained HTML
mockups of the landing first viewport + one below-fold band, so you can judge *authority*,
not a grid of swatches. Open each in a browser:

| File | Direction |
|---|---|
| `01-forest-weight.html` | **A · Forest Weight** — forest carries the chrome |
| `02-sage-atmosphere.html` | **B · Sage Atmosphere** — the page sits inside the green |
| `03-ink-and-oak.html` | **C · Ink &amp; Oak** — ink hierarchy + oak structure, forest reserved |

All three use **only** the Oak &amp; Forest anchors from `DESIGN_BRIEF.md` / `:root` — cream
`#f6f1e7`, surface `#fffdf8`, ink `#1e2420`, forest `#3d6b4f` / `#2a4f3a`, sage `#e4ebdd`,
oak `#c4a574`. No orange, no invented palette, no dark theme touched. `--oak` is
graphic-only on light (lines, fills, bevels, glyph-on-ink) — never text on a light surface
(2.08:1). Every text pair was contrast-checked; all land ≥ 4.5:1 (AA). No banned AI-default
looks (no purple gradients, no terracotta-on-cream serif, no broadsheet hairlines).

## The problem each one answers

Today's live `/` already uses the forest hexes — but as *thin text and faint tints over
near-white*, so the page reads as "generic white + a hint of green." Your note: the old
orange theme had authority through **accent weight, washes, and chrome**. Each direction
puts the same forest/oak/sage into more load-bearing places, differently.

### A · Forest Weight
Forest becomes the chrome: a **solid forest primary CTA**, a **forest nav underline**, a
**forest keyline under the header**, a **forest-weighted hero wash**, and forest-filled
component surfaces (the icon squares) below the fold. Cream paper stays the ground; oak is a
bevel/rail accent (the panel's left rail, the mark's inset edge). This is the most literal
translation of "the orange authority, in green" — the accent lives in fills and chrome, so
the brand reads at a glance.
*Risk:* the closest to the current page, so the smallest leap — if you want a bigger visual
shift, it's B.

### B · Sage Atmosphere
The page sits *inside* the green. A **deep sage wash + faint forest hatch** behind the hero,
an **oak glow** like the brand sheet, badges and icon tiles on sage, and a **full
sage-tinted band** below. Cream surfaces become raised paper on a forest field.
*Risk:* the most atmospheric and the biggest departure; sage-everywhere can read *soft* if
we're not careful, which is the opposite of authority. The oak glow + hatch are what keep it
from going flat — worth seeing in person before judging.

### C · Ink &amp; Oak
Authority from **ink** (heavy ink headlines, ink icon tiles, an oak-underlined emphasis
word) and **oak structural lines** (a 3px oak header keyline, oak section rules, an oak
offset frame around the plan panel, oak top-lines on cards). **Forest is reserved** for CTAs
and interactive state only — green means "do something," ink means "read this," oak draws
the structure.
*Risk:* it makes *oak and ink* the stars and forest a minor action color — the most
confident/editorial, but the least "green," so it may under-answer "forest barely reads."

## Recommendation → **A · Forest Weight**, with two grafts

A is the most direct answer to what you actually asked for: the old theme's authority came
from accent *weight + washes + chrome*, and A is the only one that puts forest in exactly
those three places. It also carries the least risk — it reuses `--accent` (forest) the way
the token system already intends, just heavier, so the token/contrast guards
(`contrast.test.ts`, `dark-theme.test.ts`) stay green with the smallest surface of change,
and it leaves the dark theme's separate re-palette untouched.

Two things worth stealing from the others when we implement:

- **From B:** the **oak glow behind the hero plan panel** (the brand-sheet touch) — richer
  than A's forest halo and unmistakably "Oak &amp; Forest."
- **From C:** the **oak structural rules** under section headers and the offset panel frame
  — a little craft that reads as intentional, not decorative, and keeps oak earning its
  place as *structure* rather than filler.

If you'd rather make a bolder move than a faithful translation, **B** is the one to pick; if
you want the catalog to feel like a confident print publication and are fine with green
receding, **C**. A hybrid is easy from here either way.

## After you pick

Reply with **A**, **B**, **C**, or a hybrid, and I'll implement the chosen direction as
token/utility changes in `globals.css` + the landing + chrome, re-run the AA contrast guards,
and re-score — per the brief, no palette code ships until you've picked. Dark theme stays out
of scope (its re-palette is a separate sprint).
