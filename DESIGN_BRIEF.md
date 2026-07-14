# Design brief — Woodworking Plan

**Purpose.** Paste this into Claude Design when connecting the repo, and keep it in the
repo for Claude Code to read on handoff. It defines what a UI/UX redesign may change
(look, layout, responsiveness, polish) and what it **must not** break (the architecture
and guarantees underneath the visuals). The goal is a **visual reskin over the existing
machinery**, not a rewrite — the first prototype was adopted on exactly these terms
(`DECISIONS_LOG.md` 2026-07-13).

Treat everything below as a hard constraint unless Keagan says otherwise.

---

## 1. What this app is

A mobile-first PWA catalog of woodworking plans. Every plan carries the same structured
data (difficulty, time, cost tier, tools, materials, cut list, steps). People use it on a
phone, in a workshop, often with no signal and sometimes with gloves on. The
differentiator is the structured, comparable metadata — not imagery.

Stack: Next.js 15 (App Router, RSC), TypeScript, Prisma/Postgres, Clerk auth, deployed on
Vercel. Styling is **plain CSS with design tokens** in `src/app/globals.css` — no Tailwind,
no CSS-in-JS. Keep it that way unless a migration is explicitly agreed.

## 2. Design tokens (already in `globals.css` — reuse, don't reinvent)

```
--bg: #faf9f6      (cream page)      --fg: #1a1a1a   (ink text)
--surface: #ffffff (cards)           --muted: #6b6b6b
--border: #e4e4e4                    --border-strong: #d8d3c6
--accent: #e9a86c  (warm orange)     --accent-strong: #c96a2e
--accent-tint: #fdf1e0               --accent-tint-border: #e9c98a
--danger: #b5551c
--ok / --pending / --err            (functional status colors — leave alone)
```

Warm cream/ink/orange system. Font is the system-ui stack. **There is no dark mode by
decision** — the palette has no dark variant; don't add one uncommissioned.

A redesign may refine spacing, type scale, component styling, and layout. If it introduces
new tokens, add them here rather than hard-coding values.

## 3. Responsive rules (non-negotiable)

- **Mobile-first, ONE DOM.** Desktop layouts are produced by CSS (`grid-template-areas`,
  `order`) over the *same* markup in the *same* source order — never a separate desktop
  tree or duplicated components. This is how the catalog (Sprint 18) and plan detail
  (Sprint 20) work today.
- **Breakpoints in use:** `34rem`, `40rem`, `64rem` (desktop), `80rem`, `96rem`. Desktop
  rules live inside `min-width` queries so the phone layout is unchanged by construction.
  Below the desktop breakpoint the grids collapse to a single column in DOM order.
- **Touch targets ≥ 44px; form inputs use 16px font** (smaller makes iOS Safari zoom on
  focus). Keep both.

## 4. The progressive-enhancement contract (do NOT break this)

Several components render the **complete document server-side** and only *hide* parts
after mount with JS. This is what keeps print, offline, no-JS, and crawlers working. A
redesign may restyle them freely but must preserve the pattern:

- **`StepWalker`** — the full `<ol>` of steps is server-rendered; JS adds the progress
  bar/rail and hides inactive steps. Each `<li>` carries `data-step`.
- **`PlanTabs`** (Tools / Materials / Cut List) — all three `<section data-tab>` panels
  are server-rendered; JS shows one at a time.
- **`InstructionsDisclosure`** — instructions are fully in the DOM; JS collapses them
  behind a button.
- **`FilterDisclosure`** — filters are a `<details>`; the `<summary>` must stay visible so
  no-JS users can open it.
- **Filters, search, sort, pagination, filter-chips, category nav** are **plain GET forms
  and links** — no client state. A sorted/filtered view is a shareable URL. Keep it.
- **Writes** (save, like, review, add-to-shopping-list, view logging) are **server actions
  posted from plain `<form>`s** and work with JS off. Don't convert them to client-only
  fetch flows.

If a redesigned component drops server rendering or removes a `data-*`/`<summary>` hook,
it has broken print/offline/no-JS. Print CSS (`@media print`) force-shows every hidden
panel and step — keep those rules working.

## 5. Content & correctness rules the UI must respect

- **Cost is shown as tiers only (`$`–`$$$$$`), never dollar amounts** — anywhere, including
  print. `formatCents` is deliberately deleted. Do not reintroduce dollar figures.
- **Dimensions render as tape-measure fractions** (13/16″), never decimals.
- **No AI-generated plan images.** The plan image slot shows a real photo or an honest
  empty placeholder.
- **Print views are black-on-white**, with `break-inside: avoid` on cut-list rows and
  repeated table headers.
- **Accessibility baseline (WCAG AA):** skip link to `#main`, correct heading order,
  labelled controls, visible focus rings, `aria-current` on active nav/sort. Don't
  regress these.

## 6. What's fair game to redesign

Layout, spacing, typography, card and component styling, the catalog grid, the plan-detail
composition, empty states, the install prompt, the shopping list and print sheets'
*appearance*, iconography (PWA icons are still placeholders — branding decision #8 is
open), and overall visual polish and responsiveness. Make it feel modern and cohesive.

## 7. Known placeholders (don't design around them as final)

- **Brand name / logo / domain** — "Woodworking Plan" is a working placeholder (#8 open).
- **Contact** — the About/FAQ contact line is a marked placeholder.
- The site is `robots: noindex` sitewide until branding lands.

## 8. Handoff mechanics

1. In Claude Design, connect this GitHub repo so it reads the components and `globals.css`
   token system.
2. Prototype screens as a reskin (catalog, plan detail, shopping list are the highest-value
   targets), honoring sections 3–5 above.
3. Export the handoff bundle to Claude Code. On the code side, apply changes as edits to the
   existing components/CSS — not wholesale replacements — and run the gate before shipping:
   `npx tsc --noEmit`, `npx vitest run`, `npx eslint .`, and a manual check that print
   (`Ctrl+P`), no-JS, and a mobile viewport all still show the full content.
