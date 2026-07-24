<!-- DESIGN_BRIEF.md — agent-optimized. Authoritative for design tokens + design invariants. A redesign = visual reskin over existing machinery, not a rewrite. Everything = hard constraint unless Keagan says otherwise. Light=Oak & Forest (Notch); dark=legacy warm/orange DELIBERATELY (separate unopened re-palette sprint). -->

# DESIGN_BRIEF.md — Notch

## 1. App + styling architecture
Mobile-first PWA catalog of woodworking plans; structured metadata is the differentiator, not imagery. Stack: Next.js 15 (App Router/RSC), TS, Prisma/Postgres, Clerk, Vercel.
Styling = two-part, order matters: (1) CSS custom-property tokens in `src/app/globals.css` = single source for every colour/elevation/surface (nothing copies a hex). (2) Tailwind v4 utilities reference tokens — `src/app/tailwind.css` maps each via `@theme inline` so `bg-surface`→`var(--surface)`. This is what makes dark a token flip with no `dark:` utilities.
Consequences: `globals.css` is UNLAYERED → its rules beat layered utilities regardless of specificity (prefer utilities; plain CSS only for the residual below). Same-property utilities apply in Tailwind's fixed source order, not className order (`border-transparent`+`border-border`; variants emitted after base → `shadow-e3 lg:shadow-none` coexist). Documented component-CSS residual in `globals.css` (permanent, Keagan 2026-07-14): descendant selectors on dynamic rows (`.data-table th/td`, `.detail-row dt/dd`, `.prose p`), step/path chrome, skeleton `@keyframes`, base element typography, whole print stylesheet — restyle in place, don't inline.

## 2. Tokens — complete set
Every colour token exists in BOTH `:root` and `.dark`, reset again in `@media print`. **24 tokens/theme** (Sprint 44 added `--oak`); `tests/dark-theme.test.ts` fails if the sets differ. Light value first.

| Token | Light (Oak & Forest) | Dark (legacy) | Use |
|---|---|---|---|
| `--bg` | `#f6f1e7` | `#17140f` | page |
| `--surface` | `#fffdf8` | `#221e17` | cards/panels/popovers (warmed off-white) |
| `--fg` | `#1e2420` | `#f0ece4` | ink |
| `--muted` | `#5f665f` | `#b3ab9f` | secondary text |
| `--muted-2` | `#6f6a59` | `#8f8578` | tertiary text — AA-safe as text both themes |
| `--border` | `#e3dcc9` | `#38332b` | hairlines |
| `--border-strong` | `#cec5ad` | `#4b453a` | emphasised edges |
| `--accent` | `#3d6b4f` | `#e9a86c` | brand accent — ⚠️ DARK green in light, LIGHT orange in dark |
| `--accent-strong` | `#2a4f3a` | `#f2b884` | accent as GRAPHIC (glyphs/borders/fills) |
| `--accent-text` | `#3d6b4f` | `#f2b884` | accent as body-size TEXT (≥4.5:1); =`--accent` in light, split kept for dark |
| `--accent-fg` | `#f6f1e7` | `#1a1a1a` | text/icons ON `--accent` — THEME-DIVERGENT (cream-on-forest / ink-on-orange) |
| `--accent-tint` | `#e4ebdd` | `#2b2318` | tinted accent bg |
| `--accent-tint-border` | `#a9beab` | `#5c4a2c` | its edge |
| `--accent-soft` | `#e4ebdd` | `#2b2318` | soft accent wash |
| `--oak` | `#c4a574` | `#c4a574` | brand Secondary — ⚠️ GRAPHIC-ONLY on light (2.08:1); text-safe on dark panels only (6.76–7.86:1) |
| `--danger` | `#ac511b` | `#e58a5c` | destructive |
| `--ok` / `--pending` / `--err` | `#17803d`/`#b45309`/`#b3261e` | `#5cc27a`/`#d99b3f`/`#e8756c` | functional status (`--ok` also focus-ring; sharing green w/ accent ACCEPTED) |
| `--elev-1/2/3` | warm-tinted layered | opaque + inset top light-catch | elevation scale (`rgba(60,42,24,…)` warm tint survives rebrand) |
| `--card-bg`, `--bevel` | raised gradient + bevel | dark equivalents | landing depth |

Rules (each broken once, or would have been):
- `--accent-strong` = GRAPHIC colour; `--accent-text` = TEXT colour. Accent text at body size uses `text-accent-text` (so a future palette can't break every accent sentence).
- Anything ON `--accent` uses `--accent-fg`, never `--fg`/literal (polarity differs by theme; no test sees a literal — load-bearing).
- `--oak` not a text colour on light surfaces (2.08:1 on `--bg`); the always-dark landing CTA uses it as text legitimately.
- Every token in `:root` AND `.dark` (one-side = silently un-themed). `dark-theme.test` = parity; `contrast.test` = WCAG on 15 usage pairs × both themes (sub-AA text token fails red).
- Paper moves ⇒ re-check everything "for contrast against `--bg`" (Sprint 44 silently broke `--danger`/`--muted-2`; computed contrast tests caught pre-ship).
Elevation is a scale: cards `e1`, popovers/menus `e2`, drawers/modals `e3` → `shadow-e1/e2/e3`. Never a `shadow-[…]` literal on a floating surface (invisible on dark near-black, no inset light-catch, ignores print `--elev-*:none`); `elevation.test` scans. Two `shadow-*` don't compose (share `--tw-shadow`).

## 2.2 Dark mode
`.dark` on `<html>` flips tokens (re-themes utilities + residual). Server-stamped from `theme` cookie in root layout (no flash). No cookie → follows `prefers-color-scheme` (cookie = explicit override) — needs the app's ONLY inline script `THEME_INIT_SCRIPT` (`src/lib/theme.ts`), first `<body>` child, carrying nonce from `x-nonce`. Toggles in 3 places (mobile drawer/footer/account modal) share one store, all OUTSIDE `<SignedIn>`. Clerk themed once on `<ClerkProvider>` via `clerkAppearanceDark`; `clerk-appearance.test` asserts each Clerk var == its token. Print forced light (token reset under `@media print`).

## 2.3 Type + scale
UI = system-ui stack. Fraunces (`--font-display`, `next/font/google`) = display face, scoped to marketing headings via `.font-display` (landing only). Ramp (Sprint 40, `landing-scale.test`): `0.75/0.875/0.9375/1/1.0625/1.125/1.25/1.5rem` + `clamp()` for hero. Radii: `0.375/0.5/0.75/1rem` + `2px`/`50%`/`999px` (shapes). No radius tokens. May extend the ramp; may not eyeball a 9th value into one page.

## 3. Responsive (non-negotiable)
Mobile-first, ONE DOM: desktop = CSS (`grid-template-areas`, `order`) over same markup/source order, never a separate desktop tree. Breakpoints: `34rem`(`xs`), `40rem`(`sm`), `64rem`(`lg`=desktop), `80rem`(`xl`), `96rem`(`2xl`); desktop rules inside `min-width`; below `lg` grids collapse to one column in DOM order. Touch targets ≥44px (`2.75rem`, `touch-targets.test` over `src/lib/ui.ts` constants; only sub-44px = visually-hidden no-JS controls + inputs inside a 44px label). Form inputs ≥16px font (else iOS Safari zooms). `hover:` compiles inside `@media(hover:hover)` (dead on phone) → touch feedback uses `active:`.

## 4. Progressive-enhancement contract (do NOT break)
Components render the COMPLETE document server-side and only hide parts after mount (keeps print/offline/no-JS/crawlers working):
- `StepWalker`: full `<ol>` server-rendered, JS adds progress + hides inactive; each `<li>` has `data-step`; progress = localStorage, NOT `?step=`.
- `PlanTabs` (Tools/Materials/Cut List): all 3 `<section data-tab>` server-rendered, JS shows one + adds `tabpanel` roles only once tablist exists.
- `InstructionsDisclosure`: fully in DOM, JS collapses behind a server-rendered `<Link>`.
- `FilterDisclosure`/`MobileNav`: native `<details>` (open/close w/o JS); `<summary>` stays visible; scrim + ✕ render only after mount; containment via `inert` from `src/lib/drawer-guard.ts` (walks UP from `<details>`, never `inert` on `main`).
- Filters/search/sort/pagination/chips/category nav = plain GET forms + links (shareable URL). Writes (save/like/review/add-to-shopping-list/view) = server actions from plain `<form>`s, work JS-off. Don't convert to client-only fetch.
Any class named in an `@media print` block MUST stay on its element (dropping to utilities broke print 4×). Print force-shows every hidden panel/step.

## 5. Content/correctness rules
Cost = tiers `$`–`$$$$$` only, never dollar amounts anywhere incl. print; `formatCents` deleted (`format.test` asserts); tier scale anchor `COST_TIER_ANCHOR` has no digits (by test). Dimensions = tape fractions (13/16″), never decimals. No AI-generated plan images (real photo or honest empty placeholder). Print = black-on-white, `break-inside:avoid` on cut-list rows, repeated headers. Copy numbers come from the query not memory (landing states real catalog size; below a floor drops the claim).
A11y (WCAG AA, implemented): skip link to `#main`; correct heading order; labelled controls; visible focus rings. `aria-current="page"` on active header nav (`nav-current.tsx`), category nav, saved/shopping-list/print tabs, pagination; `aria-current="step"` in step walker. Sort = `<select>`, no `aria-current`; during keyword search it's a DISABLED "Relevance" w/ reason in `title`. Results count = `role="status"` live region. `aria-expanded` on every disclosure trigger. Test-enforced: `contrast.test` (AA), `touch-targets.test` (44px). Motion: every animation needs `prefers-reduced-motion` + print escape (`animation-fill-mode:both` + killed animation = invisible content).

## 6. Fair game to redesign
Layout, spacing, typography, card/component styling, catalog grid, plan-detail composition, empty states, install prompt, shopping-list + print appearance, polish, responsiveness. App-page heading hierarchy (`h1`/`h2`) reviewed Sprint 42, left alone (declined not overlooked; open for a future mockup-first pass; global `h2` is unlayered so changing it shrinks the `!`-override workarounds).

## 7. Placeholders/pending (don't design around as final)
Branding #8 RESOLVED: Notch/notchplans.com; identity in `src/lib/brand.ts` (`brand.test` cross-checks manifest); contact `support@notchplans.com`. Pending: logo/PWA icons (placeholder tiles until Keagan's SVG), dark-theme re-palette (still legacy orange deliberately), tagline/description copy (DRAFT). Site is now indexable (`SITE_INDEXABLE=true`; `noindex` no longer sitewide). All agent-added user-facing copy ships DRAFT, Keagan approves.

## 8. Gate before shipping a design change
`npx tsc --noEmit` · `npx vitest run` · `npx eslint .` · `npm run build`, then manual: print (`Ctrl+P`), no-JS, both themes, 375px viewport all still show full content. Guards `contrast`/`touch-targets`/`dark-theme`/`elevation`/`landing-scale`/`clerk-appearance`/`tailwind-setup`/`brand` = real regressions when red, not tests to update. Apply changes as edits to existing components/CSS, not wholesale replacements.
