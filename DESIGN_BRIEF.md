# Design brief — Notch

**Purpose.** Paste this into Claude Design when connecting the repo, and keep it in the
repo for Claude Code to read on handoff. It defines what a UI/UX redesign may change
(look, layout, responsiveness, polish) and what it **must not** break (the architecture
and guarantees underneath the visuals). The goal is a **visual reskin over the existing
machinery**, not a rewrite — the first prototype was adopted on exactly these terms
(`DECISIONS_LOG.md` 2026-07-13).

Treat everything below as a hard constraint unless Keagan says otherwise.

> **Rewritten Sprint 42.1 (2026-07-21)** against the shipped code, closing audit finding
> D3. The previous version described a system that had stopped existing: it said "no
> Tailwind" (Sprints 28–32 migrated the app to it), "there is no dark mode by decision"
> (Sprint 31 re-added it; Sprint 37 made it reachable by everyone), and listed 14 tokens
> when there are 23. **A brief that argues against the evidence is worse than no brief** —
> anyone following it would have written plain CSS and hard-coded a light-only palette.
> Every claim below was re-read out of the source, not carried forward.
>
> **Updated Sprint 45 (2026-07-21) for the Notch rebrand.** The product is **Notch**
> (notchplans.com; branding #8 RESOLVED) and the LIGHT theme is the "Oak & Forest"
> palette (Sprint 44). ⚠️ **The dark theme still runs the pre-rebrand warm/orange
> system on purpose** — its re-palette is a separate, not-yet-opened sprint (Keagan's
> call, `DECISIONS_LOG.md` 2026-07-21). The token table below shows both as they ARE.

---

## 1. What this app is

A mobile-first PWA catalog of woodworking plans. Every plan carries the same structured
data (difficulty, time, cost tier, tools, materials, cut list, steps). People use it on a
phone, in a workshop, often with no signal and sometimes with gloves on. The
differentiator is the structured, comparable metadata — not imagery.

Stack: Next.js 15 (App Router, RSC), TypeScript, Prisma/Postgres, Clerk auth, deployed on
Vercel.

**Styling is a two-part system, and the order matters:**

1. **CSS custom-property tokens in `src/app/globals.css` are the single source of truth**
   for every colour, elevation and surface value. Nothing copies a hex out of them.
2. **Tailwind v4 utilities are how components are styled**, and they *reference* the
   tokens: `src/app/tailwind.css` maps each one with `@theme inline`, so `bg-surface`
   emits `var(--surface)` rather than minting a duplicate. This is what lets the dark
   theme be a token flip with no `dark:` utilities.

Three consequences a redesign must respect:

- **`globals.css` is UNLAYERED, so its rules beat layered Tailwind utilities** regardless
  of specificity. A new plain-CSS rule silently overrides a utility on the same property.
  Prefer utilities for component styling; add plain CSS only for the documented residual
  below.
- **Same-property utilities apply in Tailwind's fixed source order, not className order.**
  `border-transparent` + `border-border` on one element resolves by Tailwind's ordering,
  not by which you wrote last. Variants (`lg:`) are emitted *after* their base, which is
  how `shadow-e3 lg:shadow-none` coexist.
- **A documented component-CSS residual remains** in `globals.css`: descendant selectors
  on dynamic rows (`.data-table th/td`, `.detail-row dt/dd`, `.prose p`), the step and
  path chrome, skeleton `@keyframes`, the base element typography, and the whole print
  stylesheet. Keagan accepted this as permanent (2026-07-14) — there is no clean
  per-element utility form for mapped content. Restyle it in place; don't inline it.

## 2. The visual system

### 2.1 Tokens — the complete set

Every colour token exists in **both** `:root` and `.dark`, and both are reset again inside
`@media print`. **24 tokens in each theme** (Sprint 44 added `--oak`) — counted from the
source, and `tests/dark-theme.test.ts` fails if the two sets ever differ. Light value
first. ⚠️ **Light = Oak & Forest (the Notch brand); dark = the legacy warm/orange
system, pending its own re-palette.**

| Token | Light (Oak & Forest) | Dark (legacy) | What it is |
|---|---|---|---|
| `--bg` | `#f6f1e7` | `#17140f` | page (brand cream / warm near-black) |
| `--surface` | `#fffdf8` | `#221e17` | cards, panels, popovers (warmed off-white — pure white would glow on the deeper cream) |
| `--fg` | `#1e2420` | `#f0ece4` | ink (brand Ink / warm off-white) |
| `--muted` | `#5f665f` | `#b3ab9f` | secondary text (green-grey in the ink family) |
| `--muted-2` | `#6f6a59` | `#8f8578` | tertiary text — **AA-safe as text in both** (re-derived twice: Sprint 33, Sprint 44) |
| `--border` | `#e3dcc9` | `#38332b` | hairlines |
| `--border-strong` | `#cec5ad` | `#4b453a` | emphasised edges |
| `--accent` | `#3d6b4f` | `#e9a86c` | the brand accent — **⚠️ DARK green in light, LIGHT orange in dark** |
| `--accent-strong` | `#2a4f3a` | `#f2b884` | accent as a **graphic** (glyphs, borders, fills) |
| `--accent-text` | `#3d6b4f` | `#f2b884` | accent as **body-size text** (≥4.5:1). In light it now EQUALS `--accent` (forest is text-safe); kept separate because dark needs the split |
| `--accent-fg` | `#f6f1e7` | `#1a1a1a` | text/icons sitting **on** `--accent` — **THEME-DIVERGENT by design** (cream-on-forest / ink-on-orange) |
| `--accent-tint` | `#e4ebdd` | `#2b2318` | tinted accent background (sage wash) |
| `--accent-tint-border` | `#a9beab` | `#5c4a2c` | its edge |
| `--accent-soft` | `#e4ebdd` | `#2b2318` | soft accent wash |
| `--oak` | `#c4a574` | `#c4a574` | brand Secondary. **⚠️ GRAPHIC-ONLY on light backgrounds (2.08:1); text-safe on dark panels only** (6.76–7.86:1) |
| `--danger` | `#ac511b` | `#e58a5c` | destructive (Sprint 44 re-derivation — the old value fell under AA on the new paper) |
| `--ok` / `--pending` / `--err` | `#17803d` / `#b45309` / `#b3261e` | `#5cc27a` / `#d99b3f` / `#e8756c` | functional status — chosen for contrast, not for look. `--ok` sharing green with the accent is ACCEPTED (logged) |
| `--elev-1/2/3` | warm-tinted, layered | opaque + **inset top light-catch** | the elevation scale — the `rgba(60,42,24,…)` warm tint deliberately survived the rebrand (shade, not brand) |
| `--card-bg`, `--bevel` | raised card gradient + bevel | dark equivalents | landing depth |

**Rules about this table that have each been broken once (or would have been):**

- **`--accent-strong` is a GRAPHIC colour, `--accent-text` is a TEXT colour.** The
  orange system's `--accent-strong` failed AA as text (3.57:1); the forest one happens
  to pass, but the rule stands — accent-coloured text at body size uses
  `text-accent-text`, so a future palette can't silently break every accent sentence.
- **Anything drawn ON `--accent` uses `--accent-fg`, never `--fg` and never a literal.**
  The accent's polarity DIFFERS BY THEME now (dark green vs light orange) — only the
  token knows. Sprint 44 found one hardcoded `text-[#1a1a1a]` on an accent fill that
  would have shipped invisible; there is no test that can see a literal, so this rule
  is load-bearing.
- **`--oak` is not a text colour on light surfaces.** 2.08:1 on `--bg`. The landing's
  always-dark CTA uses it as text legitimately; a `text-oak` caption on cream is a
  contrast failure the PAIRS table does not guard.
- **Every colour token must be added to `:root` AND `.dark`.** A token added to one is a
  silently un-themed colour. `tests/dark-theme.test.ts` fails on any mismatch, and
  `tests/contrast.test.ts` computes WCAG on 15 usage pairs × both themes, so a sub-AA
  *text* token fails red rather than shipping.
- **When the paper moves, everything chosen "for contrast against --bg" must be
  re-checked.** Sprint 44's palette change silently broke `--danger` and `--muted-2`
  (4.36:1 / 4.40:1 on the new bg) — the contrast tests caught both before a pixel
  shipped, which is exactly why the values live in a computed test and not a checklist.

**Elevation is a scale, not a value.** `--elev-1/2/3` → the `shadow-e1/e2/e3` utilities.
Cards rest at `e1`; popovers and menus sit at `e2`; drawers and modals at `e3`. **Never
write a `shadow-[…]` literal on a floating surface** — a flat-black literal is invisible
on dark's near-black surfaces, carries none of the inset top-edge light-catch the dark
tokens use, and ignores the print block's `--elev-*: none`. `tests/elevation.test.ts`
scans the floating components for literals. Two `shadow-*` utilities on one element do
**not** compose — they share `--tw-shadow`, so each token carries its complete value.

### 2.2 Dark mode — how it actually works

Dark mode exists, is reachable by everyone (signed in or not), and is not a `dark:`
utility sweep:

- **`.dark` on `<html>` flips the tokens.** That re-themes every utility *and* the
  component-CSS residual at once, because everything reads `var(--token)`.
- **Server-stamped from a `theme` cookie** in the root layout, so there is no flash.
- **With no cookie the app follows `prefers-color-scheme`** (Sprint 37, ⚖️ Keagan
  2026-07-21, reversing the earlier "cookie, not OS" call). The cookie is the explicit
  override. This needs the app's **one and only inline script** (`THEME_INIT_SCRIPT` in
  `src/lib/theme.ts`), first child of `<body>`, carrying the CSP nonce from `x-nonce` —
  the server cannot see the OS preference, and a `useEffect` would flip after paint.
- **Toggles live in three places** (mobile drawer, footer, account modal) sharing one
  module store, so flipping one updates the others. All are **outside `<SignedIn>`**.
- **Clerk is themed once**, on `<ClerkProvider>` via `clerkAppearanceDark`; per-page
  `appearance` props were removed. `tests/clerk-appearance.test.ts` parses `globals.css`
  and asserts each Clerk variable equals its token — a comment saying "update this by
  hand" had already failed once.
- **Print is forced light** by resetting the tokens under `@media print`, whatever is on
  screen. Printing the dark palette wastes toner and is unreadable.

### 2.3 Typography and scale

- **UI type is the system-ui stack.** **Fraunces** (`--font-display`, loaded via
  `next/font/google`) is the display face and is **scoped to marketing headings** through
  the `.font-display` class — the landing page, not the app.
- **The ramp** (normalized in Sprint 40, guarded by `tests/landing-scale.test.ts`):
  `0.75 / 0.875 / 0.9375 / 1 / 1.0625 / 1.125 / 1.25 / 1.5rem`, plus `clamp()` for
  genuinely fluid hero type.
- **Radii:** `0.375 / 0.5 / 0.75 / 1rem`, plus `2px` (hairline), `50%` (circle) and
  `999px` (pill) — those three are shapes, not scale steps. There are **no radius
  tokens** and one step does not deserve one.
- A redesign may extend the ramp; it may not eyeball a ninth value into one page.

## 3. Responsive rules (non-negotiable)

- **Mobile-first, ONE DOM.** Desktop layouts are produced by CSS (`grid-template-areas`,
  `order`) over the *same* markup in the *same* source order — never a separate desktop
  tree or duplicated components. This is how the catalog (Sprint 18) and plan detail
  (Sprint 20) work today.
- **Breakpoints in use:** `34rem` (`xs`, project-specific), `40rem` (`sm`), `64rem`
  (`lg`, desktop), `80rem` (`xl`), `96rem` (`2xl`). Desktop rules live inside `min-width`
  queries so the phone layout is unchanged by construction. Below `lg` the grids collapse
  to a single column in DOM order.
- **Touch targets ≥ 44px** (`2.75rem`), enforced by `tests/touch-targets.test.ts` over the
  shared constants in `src/lib/ui.ts`. The only sub-44px elements left are intentional:
  `visually-hidden` no-JS controls and inputs nested inside a 44px label.
- **Form inputs use ≥16px font** — smaller makes iOS Safari zoom on focus.
- **`hover:` compiles inside `@media (hover:hover)`**, so it does nothing on a phone.
  Touch feedback uses `active:`.

## 4. The progressive-enhancement contract (do NOT break this)

Several components render the **complete document server-side** and only *hide* parts
after mount with JS. This is what keeps print, offline, no-JS, and crawlers working. A
redesign may restyle them freely but must preserve the pattern:

- **`StepWalker`** — the full `<ol>` of steps is server-rendered; JS adds the progress
  bar/rail and hides inactive steps. Each `<li>` carries `data-step`. Progress is
  `localStorage` only — deliberately **not** a `?step=` URL, which would fragment the
  offline cache and share a stranger's place in the build.
- **`PlanTabs`** (Tools / Materials / Cut List) — all three `<section data-tab>` panels
  are server-rendered; JS shows one at a time and adds the `tabpanel` roles **only once
  the tablist exists**, so no-JS has no ARIA orphan.
- **`InstructionsDisclosure`** — instructions are fully in the DOM; JS collapses them
  behind a server-rendered `<Link>` (not a dead button).
- **`FilterDisclosure` / `MobileNav`** — native `<details>`, so they open and close with
  no JS. The `<summary>` must stay visible. The scrim and ✕ render **only after mount** —
  a scrim on a no-JS page would cover the control used to close it. Background
  containment uses `inert` applied by `src/lib/drawer-guard.ts`, which walks *up* from
  the `<details>` inerting each level's other children — **never `inert` on `main`, which
  contains the drawer.**
- **Filters, search, sort, pagination, filter-chips, category nav** are **plain GET forms
  and links** — no client state. A sorted/filtered view is a shareable URL. Keep it.
- **Writes** (save, like, review, add-to-shopping-list, view logging) are **server actions
  posted from plain `<form>`s** and work with JS off. Don't convert them to client-only
  fetch flows.

If a redesigned component drops server rendering or removes a `data-*`/`<summary>` hook,
it has broken print/offline/no-JS. **Any class named in an `@media print` block must stay
on its element** — converting a class to utilities and dropping it has silently broken
print four times. Print CSS force-shows every hidden panel and step; keep those rules
working.

## 5. Content & correctness rules the UI must respect

- **Cost is shown as tiers only (`$`–`$$$$$`), never dollar amounts** — anywhere,
  including print. `formatCents` is deliberately deleted, and `tests/format.test.ts`
  asserts it stays deleted. The tier scale carries a plain-language anchor
  (`COST_TIER_ANCHOR`), which contains no digits by test.
- **Dimensions render as tape-measure fractions** (13/16″), never decimals.
- **No AI-generated plan images.** The plan image slot shows a real photo or an honest
  empty placeholder.
- **Print views are black-on-white**, with `break-inside: avoid` on cut-list rows and
  repeated table headers.
- **Numbers in copy come from the query, not from memory.** The landing states the real
  catalog size; below a floor it drops the claim rather than softening it.
- **Accessibility baseline (WCAG AA), as actually implemented:**
  - skip link to `#main`; correct heading order; labelled controls; visible focus rings.
  - **`aria-current="page"` on the active header nav link** (`nav-current.tsx`), on
    category nav, on the saved/shopping-list/print view tabs and on pagination;
    `aria-current="step"` in the step walker. **Sort is a `<select>` and takes no
    `aria-current`** — during a keyword search it is a *disabled* "Relevance" control
    with the reason in `title`, not a vanished one.
  - the results count is a `role="status"` live region, so auto-applied filters announce.
  - `aria-expanded` on every disclosure trigger.
  - **Two invariants are enforced by tests, not by review:** AA contrast
    (`tests/contrast.test.ts`) and the 44px rule (`tests/touch-targets.test.ts`).
  - Motion: every animation needs a `prefers-reduced-motion` and a print escape.
    `animation-fill-mode: both` plus a killed animation renders content **invisible** —
    that is how a whole catalog grid nearly shipped blank.

## 6. What's fair game to redesign

Layout, spacing, typography, card and component styling, the catalog grid, the plan-detail
composition, empty states, the install prompt, the shopping list and print sheets'
*appearance*, and overall visual polish and responsiveness. Make it feel modern and
cohesive. (PWA icons are still placeholder tiles — they get regenerated from Keagan's
Notch logo SVG in Sprint 45's asset half, which is gated on him supplying the file.)

The app-page heading hierarchy (`h1`/`h2` sizes) was reviewed in Sprint 42 and left
alone — **declined, not overlooked** (⚖️ Keagan 2026-07-21). It is open for a future pass,
mockup first; note that the global `h2` rule is unlayered, so changing it also shrinks the
`!`-override workarounds in the catalog rail and footer.

## 7. Known placeholders and pending pieces (don't design around them as final)

- **Branding #8 is RESOLVED** (2026-07-21): the product is **Notch** at
  **notchplans.com**; identity strings live in `src/lib/brand.ts` (the static manifest
  is cross-checked against it by `tests/brand.test.ts`). Contact is the real
  `support@notchplans.com`.
- **Still pending:** the logo/PWA icons (placeholder tiles until Keagan's SVG lands —
  Sprint 45 asset half), the **dark-theme re-palette** (dark is still the legacy orange
  system, deliberately), and the tagline/description copy which ships as DRAFT.
- The site stays `robots: noindex` sitewide — **not** a branding leftover anymore:
  indexing is a de facto public launch, which is Keagan's explicit go-live call.
- **All user-facing copy added by an agent ships as DRAFT** and is Keagan's to approve
  (`BUILD_PLAN.md` §2).

## 8. Handoff mechanics

1. In Claude Design, connect this GitHub repo so it reads the components, `globals.css`
   and `tailwind.css`.
2. Prototype screens as a reskin (catalog, plan detail, shopping list are the
   highest-value targets), honoring sections 2–5 above.
3. Export the handoff bundle to Claude Code. On the code side, apply changes as edits to
   the existing components/CSS — not wholesale replacements — and run the gate before
   shipping:
   ```powershell
   npx tsc --noEmit
   npx vitest run
   npx eslint .
   npm run build
   ```
   then a manual check that **print (`Ctrl+P`), no-JS, both themes, and a 375px viewport**
   all still show the full content. The automated guards
   (`contrast`, `touch-targets`, `dark-theme`, `elevation`, `landing-scale`,
   `clerk-appearance`, `tailwind-setup`, `brand`) are the design system's teeth — a red
   one is a real regression, not a test to update.
