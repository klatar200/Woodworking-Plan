# UX Remediation Plan — Sprints 33–42

**Source:** `UX_AUDIT_2026-07-21.md` (the independent UI/UX audit). Every finding in that
audit maps to exactly one sprint below, or to an explicit "no action" entry — see the
Coverage Matrix in §2. Nothing from the audit is dropped silently.

**Who executes this:** the build agent (Claude), one sprint at a time, in order, under the
standing rules of `CLAUDE.md`, `BUILD_PLAN.md` §§1–2 and §§5–7, and `DECISIONS_LOG.md`.
This document is scoped like `QOL_UI_BUILD_PLAN.md` was: it says *what* each sprint
delivers and *how it will be judged*; it does not override any standing rule.

**Sprint numbering:** continues from the completed Tailwind migration (Sprints 28–32).
Sprints 33–42 are the scheduled work once Keagan opens this plan.

---

## 1. Operating rules for every sprint in this plan

These are restated (not invented) from `CLAUDE.md` / `BUILD_PLAN.md`, because every one of
them has been violated once before and re-learned. Read them at the start of *each* sprint.

### 1.1 Environment
1. **All file writes go through Write/Edit. Never write through the bash mount** — it has
   truncated source files mid-identifier and reported success. Bash is for *running*
   things only.
2. **Tests/typecheck/lint run in a `/tmp` git clone** (`npm ci` → `npx prisma generate` →
   `npx tsc --noEmit` → `npx vitest run` → `npx eslint .`), reproducing uncommitted
   working-tree changes from content you hold — never by copying off the mount.
3. **`next build` / `next dev` cannot run in the sandbox** (SWC SIGBUS). The build, the
   real-browser pass, and the push are Keagan's, listed at the end of each sprint as
   exact PowerShell steps.
4. **Never run `git` from the sandbox against this repo.** Any file deletion is delivered
   as a `git rm` line in Keagan's command block.
5. **Check CI after every push** (`curl -s "https://api.github.com/repos/klatar200/Woodworking-Plan/actions/runs?per_page=5"`).

### 1.2 Architecture invariants (violating any of these fails the sprint outright)
6. **One DOM, mobile-first.** Desktop layouts via CSS only; every new rule below `lg`
   needs an `lg:` counterpart or must be justified as a deliberate mobile change.
7. **Progressive enhancement is load-bearing.** Server-rendered complete content; JS only
   hides/animates after mount. No plain-GET filter/sort/search becomes client-only state.
   Writes stay `<form>` + server actions and work with JS off.
8. **Print contract:** any class named in an `@media print` block stays on its element.
   New print-relevant UI must be added to the print stylesheet *and* checked in a real
   print preview (Keagan's step).
9. **Offline contract:** any new private route goes on `NEVER_CACHE_PREFIXES` +
   `tests/offline.test.ts`; any new public plan-adjacent URL a saved user needs goes in
   `offline-urls.ts` + the cross-check test. (No sprint below adds a route, but Sprint 36
   touches `start_url` — see its notes.)
10. **Security posture:** no function takes a `userId`; owner from session; server actions
    never throw (guardAction / no-throw rule); `safeReturnTo` on every bounce target; no
    dollar figures anywhere; tape-measure fractions.
11. **Tailwind gotchas (from Sprints 29–32, all hit before):** same-property utilities
    apply in *source* order, not className order; two `shadow-*` utilities on one element
    overwrite each other; `translate`/`scale` are their own properties (name them in
    transitions); unlayered `globals.css` beats layered utilities; `hover:` compiles
    inside `@media (hover:hover)` so touch feedback uses `active:`;
    `animation-fill-mode: both` + a killed animation = invisible content, so every new
    animation needs print + `motion-reduce` escapes, tested.

### 1.3 Escalation
12. **Decisions marked ⚖️ below are Keagan's.** Present the options with a recommended
    choice, wait, record the answer in `DECISIONS_LOG.md`, *then* build. Sprints are
    ordered so decision-free work comes first; each ⚖️ item lists a default fallback so a
    sprint is never silently blocked.
13. **Public copy is Keagan's** (`BUILD_PLAN.md` §2): any user-facing sentence added or
    changed in these sprints ships as DRAFT and is flagged in the sprint log for his
    review — same convention as Sprint 23.

### 1.4 Self-scoring (mandatory, per BUILD_PLAN.md §§6–7 — with audit-specific evidence)
Every sprint is self-scored on the §6 rubric (Requirements fidelity 25 / Correctness 20 /
Tests 15 / Security 15 / Code quality 10 / Mobile-offline 10 / Documentation 5; **pass
≥95**, up to 3 remediation attempts, then stop and escalate; every attempt logged in
`SPRINT_LOG.md`). This plan adds four evidence rules on top, because the audit's core
criticism was that prior scores asserted polish without measuring it:

- **E1 — Traceability.** Category 1 evidence must cite this plan's deliverable numbers
  (e.g. "33.2") *and* the audit finding IDs closed (e.g. "A1"). A finding claimed closed
  must be re-verified against the shipped code, not the intention.
- **E2 — Measured, not asserted.** Where a deliverable has a numeric acceptance criterion
  (a contrast ratio, a pixel target size, a debounce value), category 2 evidence must
  state the *measured* number from the final code (computed ratio, resolved rem→px), not
  "passes" / "fixed".
- **E3 — Honest deferral.** Anything only verifiable on a real device/browser (print
  preview, iOS zoom, phone Lighthouse, actual screen-reader output) is listed as
  **deferred to Keagan** in the log — it earns no points and must not be claimed.
  Category 6 scores only what was actually exercised (mobile-viewport reasoning + the
  automated escapes/tests), and says so.
- **E4 — Constraint audit.** Every sprint's category 2 evidence ends with a one-line
  check against the two constraints this codebase keeps breaking: "all new/changed
  interactive targets ≥44px: yes/no (list exceptions)" and "all new text ≥4.5:1 in BOTH
  themes: yes/no (worst pair + ratio)". A "no" without a logged decision is a failed
  category.

---

## 2. Coverage matrix — every audit finding, its sprint, its fate

| Audit ID | Finding (short) | Sprint | Notes |
|---|---|---|---|
| A1 | Light-theme AA failures (`--accent-strong`, `--muted-2` as text) | **33** | |
| M1 | Sub-44px targets (dots, filter trigger/close, avatar, modal close, pagination, chips/pills, saved ✕, shopping checkbox, breadcrumb) | **34** | Step-dot *behavioral* work is Sprint 38; the dot *size* is 34 |
| V3 | Pagination visual family + 38px targets | **34** | Folded into the target sweep |
| H1 | Review delete: no confirm, hidden consequences | **35** | |
| A4 | Shopping-list checkbox ids invalid | **35** | Same file as H2 |
| H2 | No remove-plan on `/shopping-list` | **35** | |
| A2 | No `aria-current`/active state on header nav | **36** | |
| A5 | Silent result updates on auto-apply | **36** | |
| H7 | Sort control vanishes during search | **36** | |
| H11 | No mobile search outside `/browse` | **36** | |
| H6 | PWA `start_url` opens marketing | **36** | ⚖️ decision |
| Polish: no-JS `tabpanel` ARIA orphan | Roles added with tablist | **36** | |
| D1 | Dark mode reachability, Clerk light flash, themeColor/manifest | **37** | ⚖️ decision on `prefers-color-scheme` |
| H3 / M3 | Step walker: no memory, no scroll, wandering nav | **38** | |
| H5 | Pre-ticked-inactive prefill; 200ms per-tick queries | **39** | ⚖️ decision on prefill |
| M2 | Filter drawer: no Esc, no focus containment | **39** | |
| A6 (polish) | `aria-expanded` on avatar trigger | **39** | Trivial rider |
| A3 | Marquees unpausable on touch; moving focus targets | **40** | ⚖️ decision on touch treatment |
| C1 | "Hundreds of plans" vs 948 | **40** | ⚖️ copy |
| V2 | Landing micro-scale + accordion mismatch + 6px lift | **40** | |
| D2 | Tailwind off-token drift (type/radius/shadows) | **40** (landing values) + **41** (shadows) + **42** (brief) | Split by file locality |
| V1 | Floating surfaces bypass elevation tokens | **41** | |
| V4 (polish) | `compactOnMobile` dead code + stale comment | **41** | |
| C3 | Cost-tier pills lack an anchor | **41** | ⚖️ copy |
| H4 | Workshop picker duplicated (modal + `/profile`) | **41** | ⚖️ IA decision |
| D3 | Brief wrong on typography; app h1/h2 hierarchy flat | **42** (brief) ; hierarchy change is ⚖️ opt-in **42.6** | |
| M4 (polish) | Header-search input 15px (iPad-at-lg zoom edge) | **36** | One-value rider |
| C2, A8, A9, print architecture, PE contract, CAD pilot containment | Verified fine in audit | **No action** | CAD pilot: optional deletion offered in 42 |

Audit items the audit itself marked acceptable-as-is (collection-delete disclosure,
overflow-menu outside-click trade, "Learning" label vs `/paths` URL) are **deliberately
not scheduled** — re-litigating settled trades is scope creep.

---

## 3. Sprint order and dependencies

33 → 34 are decision-free and unblock everything visual. 35 is independent. 36 needs one
small decision (start_url) with a safe fallback. 37 depends on 33 (uses the new token
names) and carries the plan's biggest decision. 38–39 are independent of each other.
40–41 depend on 33 (tokens) and 34 (target rules). 42 is last on purpose: it documents
what *shipped*, not what was planned.

---

## Sprint 33 — Light-theme contrast: make the default theme pass AA (audit A1)

**Objective.** Every piece of text the app renders meets WCAG AA (≥4.5:1 normal text,
≥3:1 large text/graphics) in **both** themes, enforced by a unit test so it cannot
silently regress. Today the light theme fails on `--accent-strong`-as-text (3.57:1 on
`--bg`) and `--muted-2`-as-text (3.64:1); dark already passes everywhere (worst 4.58:1).

**Decisions required: none.** This is a functional accessibility fix to token *values*,
squarely inside the redesign mandate. The palette's character (warm orange accent) is
preserved — nothing here changes which things are orange, only how dark the orange used
*as text* is.

### Deliverables

- **33.1 — New token `--accent-text`.** A text-safe darkening of the accent family for
  use wherever accent-colored *text at body size* appears. Target value ≈ `#a85413`
  (compute and record the exact final ratios; acceptance: ≥4.5:1 against `--bg`
  `#faf9f6`, `--surface` `#ffffff`, *and* `--accent-tint` `#fdf1e0`, since eyebrows and
  tool-fit text sit on the tint). Define in `:root` **and** `.dark` (dark can simply
  reuse `--accent-strong` `#f2b884`, which already measures 8.8–10.5:1) and expose as
  `--color-accent-text` in `tailwind.css`'s `@theme inline`.
- **33.2 — Re-point text usages of `accent-strong` at `accent-text`.** Verified list from
  the audit (re-grep before editing; do not trust this list blindly):
  `src/app/page.tsx` (`eyebrow` const; the hero `<em>`), `src/app/browse/page.tsx`
  ("Clear search and filters" link). **Leave as `accent-strong`:** star-rating glyphs
  (graphics, 3:1, passes at 3.76), the saved-bookmark icon color, hover states on
  the rating labels, and every `bg-`/`border-` use — those are not text.
- **33.3 — Darken `--muted-2` (light theme only).** Target ≈ `#75705f`; acceptance
  ≥4.5:1 on both `--bg` and `--surface`. Dark theme's `--muted-2` (`#8f8578`,
  4.58–5.07:1) is untouched. Confirm the four text call sites (landing trust marquee,
  hero footnote, step-rail label, review-star resting tint) render acceptably — if the
  darker value reads too heavy for the star resting state, that one may move to
  `--muted` instead; record whichever was done.
- **33.4 — Contrast guard test: `tests/contrast.test.ts`.** A pure unit test that (a)
  parses `:root` and `.dark` token hex values out of `globals.css` (string extraction,
  same technique as `tests/dark-theme.test.ts`), (b) implements WCAG relative-luminance
  contrast in ~15 lines, and (c) asserts a named table of *usage pairs* — every
  token-on-token combination the app uses as text, each with its threshold (4.5 or 3.0)
  and a comment naming a real call site. Minimum pairs: `fg/bg`, `fg/surface`,
  `muted/bg`, `muted/surface`, `muted-2/bg`, `muted-2/surface`, `accent-text/bg`,
  `accent-text/surface`, `accent-text/accent-tint`, `accent-fg/accent`, `danger/bg`,
  `err/surface`, `ok/surface`, `surface/fg` (btnPrimary), `pending/surface` — **each in
  both themes** (30+ assertions). This test is the sprint's real deliverable: it turns
  "aimed at AA" into a red/green fact for every future palette edit.
- **33.5 — `tests/dark-theme.test.ts` update.** The light/dark same-token-set guard
  currently locks 17 tokens; `--accent-text` makes it 18. Update the count and list.
- **33.6 — Doc breadcrumbs.** One-line comments at the token definitions ("text-safe
  accent — see UX_AUDIT_2026-07-21 A1; guarded by tests/contrast.test.ts") and a
  `CLAUDE.md` §7 entry. (The full `DESIGN_BRIEF.md` rewrite waits for Sprint 42.)

### Explicit non-goals
No layout, spacing, or component changes; no dark-theme value changes beyond defining
`--accent-text`; no change to `--accent` / `--accent-strong` themselves (backgrounds,
borders, glyphs keep their current look).

### Verification
Sandbox: `/tmp` clone gate green including the two new/updated test files; category 2
evidence lists the final computed ratio for **every** changed pair (E2). Keagan:
`npm run build`, then a light-theme browser pass of `/`, `/browse` (with active filters,
for the Clear link), and one plan page; push; CI check. Print is token-reset to pure
black/white already — unaffected, state as much.

---

## Sprint 34 — The 44px sweep: every touch target meets the app's own rule (audit M1, V3)

**Objective.** No interactive control the app ships is smaller than 44×44 CSS px
(2.75rem), matching the hard constraint `DESIGN_BRIEF.md` §3 and `CLAUDE.md` already
state. Where a *visual* element is deliberately smaller (an 18px checkbox glyph), the
*hit area* still reaches 44px via padding or the wrapping label.

**Decisions required: none** — with one flag: **34.7** (pagination restyle) changes a
visual treatment, which is within the redesign mandate but is called out in the sprint
log so Keagan sees it in the browser pass, same convention as prior visual sprints.

### Deliverables (each lists file · current size → target)

- **34.1 — Step dots** (`step-walker.tsx`, `dotBase`): 32px → `w-[2.75rem] h-[2.75rem]`.
  Keep `flex-wrap`; verify a 14-step plan's dot block height on a 375px viewport is
  acceptable (≤3 rows at 14 steps; note the measured wrap count in the log). Gap stays
  `0.5rem`. The dots' print-hidden class stays.
- **34.2 — Mobile filter trigger** (`filter-disclosure.tsx`, `<summary>`): 36px/13px →
  `min-h-[2.75rem]` / `text-[0.875rem]` on mobile. The QOL-A history says the 36px pill
  was chosen to give the plans back vertical space — preserve that *intent* by keeping
  the pill compact horizontally (inline-flex, unchanged padding) while restoring the
  height; the `lg:` overrides already restore desktop and must remain byte-identical.
- **34.3 — Filter drawer close ✕** (`filter-disclosure.tsx`): 36px → `min-h-[2.75rem]
  min-w-[2.75rem]`.
- **34.4 — Account avatar trigger** (`account-menu.tsx`): 36px → 44px hit area. Keep the
  36px visual circle (a 44px avatar unbalances the header): wrap the 36px `<img>`/icon
  circle inside the anchor and give the anchor `min-w-[2.75rem] min-h-[2.75rem]
  inline-flex items-center justify-center` with transparent padding. Same for **modal
  close ✕** (`account-modal.tsx`): 36 → 44.
- **34.5 — Chips and checkbox pills** (`src/lib/ui.ts`: `chipBase`, `checkbox`):
  `min-h-[2.5rem]` (40px) → `min-h-[2.75rem]`. This single edit fixes filter pills,
  workshop pills, collection tabs, shopping-list view toggles, and print-page layout
  chips at once — re-check each surface for wrap regressions at 375px (the filter
  drawer's tool groups are the dense case).
- **34.6 — Saved-page collection-remove ✕** (`saved/page.tsx`): a ~20px glyph button →
  `min-h-[2.75rem] min-w-[2.75rem] inline-flex items-center justify-center` with the
  glyph centered; the badge grows — verify the badge row still wraps cleanly.
- **34.7 — Pagination** (`globals.css` `.pagination-number*` → Tailwind at the call site,
  or edited in place — implementer's choice, but *one* system): min 38px → 44px, and
  restyle into the app's chip family: resting = `border-border` on `surface`, current
  page = the `chipActive` treatment (orange fill, `--accent-fg` ink, `aria-current`
  unchanged). Prev/Next already use `btnGhost` (44px) — unchanged. If converting to
  utilities, the `.pagination*` rules must be deleted in the same sprint (no orphans)
  and nothing in a print block names them (verified: nothing does — the whole
  `.pagination` is print-hidden by its parent rule; keep the `pagination` class since
  the print block *does* name `.pagination` itself).
- **34.8 — Breadcrumb back-pill** (`globals.css` `.breadcrumb a`): `min-height: 2.25rem`
  → `2.75rem`.
- **34.9 — Shopping-list checkbox** (`shopping-list/page.tsx`): box 18.4px → `w-[1.5rem]
  h-[1.5rem]` (24px, still a paper-like box) and make the whole line the target: the
  label already stretches (`flex-1`); add `min-h-[2.75rem] items-center` to the line's
  flex row so the row itself is a 44px target. Print appearance (empty square) must be
  re-checked — the `@media print` checkbox rule keys on `.shopping-line-main input`,
  which is untouched.
- **34.10 — Guard test: `tests/touch-targets.test.ts`.** String-level assertions that the
  shared constants (`btnBase`, `chipBase`, `checkbox`, `searchInput`, `selectControl`)
  and the sprint's edited class strings contain `min-h-[2.75rem]` (or larger), so a
  future "compact" refactor of a shared constant fails a named test instead of shipping.
  Also assert `compactOnMobile` **does not exist** once Sprint 41 deletes it — leave a
  TODO marker for 41 rather than asserting early.

### Explicit non-goals
No behavioral changes (step persistence is Sprint 38, drawer Esc is 39); no `btnBase`
changes (it is already 44px, ~80 call sites — do not touch); no redesign of the header.

### Verification
Sandbox gate green + updated component tests (`filter-disclosure.test`,
`install-prompt.test` etc. — update any assertion that encoded the old sizes). Category
2 evidence: a table of every deliverable with before → after resolved px (E2). Keagan:
build + a **real phone** pass tapping each fixed control with the device held one-handed
(the audit's gloves test), print preview of a plan page and the shopping list; push; CI.

---

## Sprint 35 — Data safety: destructive-action confirmation and shopping-list control (audit H1, H2, A4)

**Objective.** No single tap destroys user data, the destruction's full blast radius is
stated before it happens, and the shopping list can be managed *from* the shopping list.
All of it works with JavaScript off.

**Decisions required: none.** (Confirmation UIs for destructive actions are routine
engineering; the copy inside them is flagged DRAFT per rule 13.)

### Deliverables

- **35.1 — Review-delete confirmation (no-JS-safe).** In `reviews-section.tsx`, replace
  the immediate `deleteReviewAction` form with a **server-rendered two-step**: the
  "Delete" control becomes a GET link to the same plan page with
  `?confirm-delete=<reviewId>` (validated server-side against *the session user's own
  review id* — an arbitrary id renders nothing; never reflect the raw param into
  markup). When the param matches, that review card renders an inline confirm block:
  the consequence sentence — *"This permanently removes your review, its photos, and
  this plan's entry in Your builds — and un-marks it in any learning path."* (DRAFT) —
  plus a real `<form action={deleteReviewAction}>` "Yes, delete" (`btnDanger`) and a
  "Keep it" link back to the clean URL. Why this shape: it is the same
  URL-driven-state pattern as every other control in the app, needs zero client JS,
  survives no-JS, and the confirm state is shareable/back-button-safe. The action
  itself is unchanged (already session-scoped, no-throw, rate-limited).
- **35.2 — Photo-remove confirmation, same pattern** (`?confirm-photo=<photoId>`), with
  the lighter consequence copy ("Removes this photo from your review"). Admin deletes go
  through the same confirm (admins mis-tap too).
- **35.3 — Remove-from-list on `/shopping-list`.** In the **by-plan** view, each plan
  section header gets a small `btnGhost` form posting the existing
  `removeFromShoppingListAction` (`planId` + `returnTo=/shopping-list?view=by-plan`),
  labeled "Remove from list". In the **merged** view, add a compact "Plans on this list"
  block above the groups: one row per plan (title link + the same remove form,
  `returnTo=/shopping-list`). Both are `no-print` (a remove button on the paper list is
  noise). The action already exists — **no new write path, no new rate-limit key.**
  After removal the page re-renders naturally; the empty-list state already exists.
- **35.4 — Fix checkbox ids (A4).** Replace `have-${line.name}` with a slugified,
  namespaced id: `have-${view}-${slugify(group.unit ?? plan.slug)}-${slugify(line.name)}-${slugify(line.species ?? '')}`.
  Add `slugify` as a tiny pure function in `src/lib/format.ts` (lowercase, non-alnum →
  `-`, collapse) with unit tests including the collision cases the audit named ("Wood
  glue" in two unit groups; same name different species).
- **35.5 — Tests.**
  - `tests/reviews-confirm.test.tsx` (or extend the existing reviews tests): confirm
    block renders only for the session user's own review id; a forged/foreign id renders
    nothing; the destructive form appears *only* inside the confirm state; the
    consequence copy names builds + paths.
  - Shopping list: remove-forms render per plan in both views with correct `returnTo`;
    ids are valid (`/^[A-Za-z][\w-]*$/`) and unique across a fixture with the audit's
    collision cases.
  - **Assert the behavior the app needs, not the code written** (the standing
    rate-limit-test lesson): the delete test drives the *confirm → post* sequence, not
    just "a button exists".

### Explicit non-goals
No undo/soft-delete system (a decision + schema change — out of scope; the confirm is
the mitigation). No changes to what deletion cascades to (the derived builds/paths
behavior is a settled design; this sprint *discloses* it). No confirmation on
non-destructive toggles (save/like/shopping-toggle stay one-tap).

### Verification
Sandbox gate green. Security evidence (category 4): confirm-param validation is
scoped-to-session, nothing reflected, `returnTo` still through `safeReturnTo`. Keagan:
build + browser pass — delete a test review with JS off *and* on, remove a plan from
both list views, print preview of the shopping list (no remove buttons on paper); push;
CI.

---

## Sprint 36 — Wayfinding & announcements: nav state, live results, mobile search, PWA entry (audit A2, A5, H7, H11, H6, M4, tabpanel polish)

**Objective.** The chrome tells the truth about where you are and what just changed: the
header marks the current section (visually and via `aria-current`), auto-applied filter
changes are announced to screen readers, search is reachable from every page on mobile,
and the installed app opens where its users actually go.

**⚖️ Decision required before 36.5 (`start_url`):** recommend `start_url: "/browse"`
(the installed app opens the catalog; the marketing page is for people who haven't
installed). Options: (a) `/browse` — recommended; (b) keep `/`. Fallback if unanswered:
build everything else, leave 36.5 out, and list it as blocked in the log. Record the
answer in `DECISIONS_LOG.md`.

### Deliverables

- **36.1 — Header nav current-state.** New tiny client island `nav-current.tsx` (or
  extend the existing pattern — `MobileNav` already uses `usePathname`): a `NavLink`
  wrapper that renders the existing `<Link>` with `aria-current="page"` and an active
  class when `usePathname()` matches (exact match for `/`, prefix match for
  `/paths`, `/saved`, `/builds`, `/about`, `/faq`; `/plans/*` marks nothing — plan pages
  are content, not a section). Active style: `text-fg font-semibold` over the quiet
  `text-muted` resting state, plus a 2px `bg-accent` underline bar
  (`shadow-[inset_0_-2px_0_var(--accent)]` or a border — implementer picks ONE and uses
  it in both the desktop row and the drawer). Constraints: the links stay
  server-rendered children where possible — the island wraps, it does not re-own, the
  nav lists (`PUBLIC_NAV` / `SIGNED_IN_NAV` stay the single source). No `useSearchParams`
  (the documented `/_not-found` Suspense trap) — pathname only.
- **36.2 — Results announcement (A5).** In `browse/page.tsx`, the results-count
  `<p className="subtitle">` gains `role="status"` (polite live region). It re-renders
  with the new sentence on every soft navigation, which is exactly what a live region
  announces. Verify the *initial* render doesn't double-announce with the page title
  (acceptable; note it). Do the same for the paths page's count if trivially applicable
  — otherwise out of scope.
- **36.3 — Sort visibility during search (H7).** `SortSelect` stops returning `null`
  during a keyword search; instead it renders the same layout with a **disabled**
  select showing one option, "Relevance", plus `title`/visually-hidden text "Search
  results are ordered by relevance". The hidden Apply button renders `disabled` too so
  the no-JS form can't submit a dead control. (System-status honesty: the control's
  disappearance was the finding; a disabled, labeled control is the fix.)
- **36.4 — Mobile drawer search (H11).** At the top of the `MobileNav` drawer, the same
  plain GET `role="search"` form as `HeaderSearch`, drawer-styled: `min-h-[2.75rem]`
  input, **`text-[1rem]`** (16px — iOS zoom rule), full-width, submit button labeled
  "Search". Server-rendered in `site-header.tsx` and passed through `children` like the
  nav links (the drawer island stays markup-free). Submitting navigates to
  `/browse?q=…`; `usePathname` change closes the drawer — verify the query-only case
  (searching *from* `/browse`) also closes it via the drawer's click-close handler.
- **36.5 — `start_url` (⚖️, decision above).** `public/manifest.webmanifest`:
  `"start_url": "/browse"`. Confirm `/browse` is reachable offline-cold: it is
  `force-dynamic` and *not* pre-cached — the SW serves the offline fallback when
  cold-offline, same as today's `/`; note this honestly in the log (the change improves
  the online launch; offline-cold behavior is unchanged either way).
- **36.6 — Header-search input to 16px (M4).** `header-search.tsx`: `text-[0.9375rem]` →
  `text-[1rem]` on the input only (kills the iPad-at-lg zoom edge; visual delta is 1px).
- **36.7 — Tabpanel ARIA timing (polish).** In `plan-tabs.tsx`, stop server-rendering
  `role="tabpanel"`/`aria-labelledby` on the panels (they reference a tablist that may
  never exist): the enhancement effect that shows/hides panels adds
  `role="tabpanel"` + `aria-labelledby` + `tabindex` when (and only when) the tablist is
  rendered, and removes them if not enhanced. The panels' `data-tab` attributes and
  server-rendered content are untouched — the PE contract holds. Update the tabs test.
- **36.8 — Tests.** `nav-current`: pure matcher function unit-tested (exact vs prefix,
  `/` special case, `/plans/x` → none); results region asserts `role="status"`;
  sort-during-search renders disabled-with-Relevance (updating the test that asserted
  `null`); drawer search asserts 16px class + GET semantics; tabs test asserts roles
  absent pre-mount, present post-mount.

### Explicit non-goals
No redesign of header layout/grouping; no breadcrumb changes; no `useSearchParams`
anywhere in the header tree; no service-worker changes.

### Verification
Sandbox gate green. Keagan: build + browser — walk every top-nav section and confirm
the marker follows (desktop row and drawer); search from a plan page on a phone
viewport; toggle a filter with a screen reader running if available (else defer per
E3); if 36.5 approved, reinstall the PWA and confirm it opens the catalog; push; CI.

---

## Sprint 37 — Dark mode for everyone (audit D1)

**Objective.** Dark mode becomes a first-class, reachable feature: toggleable by anyone
(signed in or not) from the places people look, with no light-mode flashbang inside the
dark experience (Clerk), and with browser chrome that follows the theme. The theme
engine itself (cookie + `.dark` class, token flip, dual elevation) is already right and
is **not** rebuilt.

**⚖️ Decision required before 37.1 (OS preference as default):** when **no cookie
exists**, should the server honor `prefers-color-scheme: dark`? Recommendation: **yes**
— the cookie remains the explicit override either way, and the audit's workshop-at-night
argument is strong; but this reverses the logged "cookie, not OS" call (2026-07-16), so
it is Keagan's. Implementation note for the recommended option: the server cannot see
`prefers-color-scheme`, so honoring it FOUC-free means a 3-line inline `<script>` in
`<head>` (before paint, nonce'd — it must carry the CSP nonce from the `x-nonce` header,
same mechanism Clerk uses) that adds `.dark` when `(no cookie) && matchMedia(dark)`, plus
`suppressHydrationWarning` (already present). Options: (a) OS default + cookie override —
recommended; (b) keep light-default, cookie-only. Fallback if unanswered: build (b)'s
world (everything below works under either).

### Deliverables

- **37.1 — Shared `ThemeToggle` component** (`theme-toggle.tsx`, client): extracts the
  toggle logic currently inlined in `account-modal.tsx` (classList toggle + cookie write
  `theme=…; path=/; max-age=31536000; SameSite=Lax` + local state). One component,
  three renders: (a) the account modal (replacing the inline code), (b) the **mobile
  drawer** — a full-width `drawerLink`-styled row with Sun/Moon icon + "Dark mode"/"Light
  mode" label, rendered for everyone (it sits outside `<SignedIn>`), (c) the **footer** —
  a small `footerLink`-styled button in the "Site" column. All three ≥44px. No-JS
  truth-telling: the toggle is a JS-only enhancement (a cookie toggle *can* be a no-JS
  form, but that's a POST endpoint for a preference — out of proportion); render the
  buttons only after mount (same `enhanced` pattern as the drawer scrim) so a no-JS user
  never sees a dead control.
- **37.2 — Clerk dark appearance.** `clerk-appearance.ts` exports a second object,
  `clerkAppearanceDark`, mapping the dark tokens (`colorBackground: '#221e17'`,
  `colorText: '#f0ece4'`, `colorInputBackground: '#17140f'`,
  `colorTextSecondary: '#8f8578'`, `colorPrimary: '#f0ece4'`, `colorDanger: '#e58a5c'`,
  same radius/font) — literal hexes, same rationale as the light object, same "update
  both when tokens change" comment, **plus a unit test** (`tests/clerk-appearance.test.ts`)
  asserting the two objects' values equal the corresponding hexes parsed from
  `globals.css` `:root`/`.dark` — closing the "must be updated by hand" drift hole with
  a red test instead of a comment. Wire it: `layout.tsx` already knows `isDark` — pass
  `appearance={isDark ? clerkAppearanceDark : clerkAppearance}` to `<ClerkProvider>`
  (sign-in/sign-up pages and `clerk.openUserProfile()` inherit from the provider;
  remove the per-page `appearance` props so there is one source). Known honest limit:
  a *live* toggle doesn't re-theme an already-open Clerk modal until next render —
  note it, don't chase it.
- **37.3 — Browser chrome follows the theme.** `layout.tsx` viewport export: `themeColor`
  becomes an array with media queries — but since the app's theme is class-based, not
  media-based, the correct move is: set `themeColor` from `isDark`
  (`#17140f` dark / `#faf9f6` light) at request time — it renders per-request like the
  `.dark` class does. Manifest: `background_color` → `#faf9f6` (the light splash matches
  the light default; manifests are static — note that a dark-preference user gets a
  light splash, acceptable). If 37.-⚖️ option (a) was chosen, the inline script also
  can't change the meta — accept and note.
- **37.4 — Signed-out reachability check.** With 37.1(b,c) shipped, verify by grep+
  reasoning (and Keagan by browser) that a signed-out phone user can: open drawer →
  toggle dark → cookie persists across pages and sessions. This is the acceptance test
  for D1's core complaint.
- **37.5 — Dark sweep of the two audit stragglers.** The five floating-surface shadows
  are Sprint 41; here, only confirm no *new* hardcoded colors were introduced by
  Sprints 33–36 (grep for `#[0-9a-f]{3,8}` in changed files; landing's deliberate
  `#ffe6c4`/`#7a4a12` accent panel and the always-dark final CTA stay, per audit).

### Explicit non-goals
No re-architecture of the cookie/class mechanism; no `dark:` utility sprawl (the token
flip stays the engine); no attempt to theme Clerk's hosted-domain pages beyond the
appearance API; no elevation work (Sprint 41).

### Verification
Sandbox gate green including the new appearance-parity test. Keagan: build + browser —
toggle from drawer signed-out, from footer, from modal; open sign-in and the Clerk
account modal in dark and confirm no white flash; check the Android/OS toolbar color
follows; if option (a): set OS dark, clear the cookie, hard-reload, confirm dark with no
flash *and* that an explicit light choice sticks; push; CI.

---

## Sprint 38 — The mid-build experience: step walker memory, scroll, and reachable controls (audit H3, M3)

**Objective.** The build page survives the realities of a workshop: the phone sleeping,
an accidental reload, a long step. Your place is remembered, advancing a step shows you
the step, and Prev/Next sit in a fixed, thumb-reachable position on a phone. All of it
remains a pure enhancement over the server-rendered full step list.

**Decisions required: none.**

### Deliverables

- **38.1 — Step persistence.** In `step-walker.tsx`: on step change, write
  `localStorage['step:' + slug] = String(active)` (the component needs the `slug` — add
  it to `Props`; the build page has it). On mount, restore: parse, clamp to
  `[1, totalSteps]` (the standing "never trust stored/foreign input" posture — content
  edits can change step counts), fall back to 1 on anything invalid, and wrap all
  storage access in `try/catch` (private-mode Safari throws; the walker must never die
  for a storage error — the offline-enhancement rule: an enhancement must not become a
  dependency). Restore happens in the same effect that sets `mounted`, so the no-JS
  document is untouched and there is no flash of step 1 → step N *content* (the list is
  fully visible pre-mount anyway). Clearing: reaching the **Finish** state (last step +
  CTA shown) removes the key — a finished build restarts at step 1 next time, which is
  the correct default.
- **38.2 — Scroll on advance.** In the `goTo` path (effect on `active`), after
  visibility toggling, scroll the active step's element into view:
  `el.scrollIntoView({ block: 'start', behavior: prefersReducedMotion ? 'auto' : 'smooth' })`
  — but **only when the walker's container top is out of the viewport** (guard so
  tapping a rail item on desktop, where everything is visible, doesn't yank the page).
  Account for the sticky header + the new sticky nav (scroll-margin-top on `.step`,
  ~`5.5rem`). `prefersReducedMotion` via `matchMedia` at call time.
- **38.3 — Sticky mobile Prev/Next.** Below `lg`, the `step-walker-nav` row becomes
  sticky at the viewport bottom: `sticky bottom-0` + surface background + top hairline +
  `pb-[env(safe-area-inset-bottom)]`, full-width within the content column; at `lg:` it
  reverts to the current in-flow row (`lg:static lg:border-0 …`). The row keeps the
  `step-walker-nav` class — it is named in the print stylesheet (print-hidden), which is
  exactly why the class must stay (standing rule 8). Buttons unchanged (`btnGhost` /
  `btnPrimary`, already 44px; dots were fixed in Sprint 34). Verify the sticky bar
  doesn't cover the finish CTA (add bottom padding to the content column equal to the
  bar height below `lg`).
- **38.4 — Pure helpers + tests.** Extract `clampStep(raw: unknown, total: number): number`
  and the storage key builder into `src/lib/step-progress.ts`; unit-test clamp
  (garbage, negative, `"1e9"`, float strings, > total, valid), key shape, and — via the
  existing component-test setup — that restore only runs after mount and Finish clears
  the key. The scroll behavior gets a unit-tested *decision* function
  (`shouldScroll(containerTop, viewportH)`) rather than an untestable DOM assertion.
- **38.5 — Print/no-JS re-verification.** Explicitly re-run the print-contract checks in
  the suite (`.step` force-show, walker chrome hidden) — this sprint touches the most
  print-sensitive component in the app, and the print stylesheet has been silently
  orphaned twice before (the standing Sprint 30b/QOL-A lesson).

### Explicit non-goals
No URL-based step state (`?step=N` would make every step a distinct SW cache entry and
pollute shareable URLs — the audit asked for memory, not deep links); no server-side
progress storage (the derived-data rule: progress *within* a build session is device
state); no walker redesign.

### Verification
Sandbox gate green. Keagan: build + **real phone** — advance to step 7 of a long plan,
lock the phone, wait, reopen → step 7; kill the tab, reopen → step 7; finish the plan,
reopen → step 1; tap Next at the bottom of a long step → next step's top is visible
below the header; airplane mode mid-build (the Sprint 14 scenario) → everything above
still true; print preview → all steps, no bar; push; CI.

---

## Sprint 39 — Filter honesty and drawer manners (audit H5, M2, A6)

**Objective.** The filter panel never *looks* applied when it isn't, multi-selecting
doesn't hammer the server, and the mobile drawer behaves like a modal surface (Esc
closes it, focus stays in it) without giving up its no-JS `<details>` soul.

**⚖️ Decision required before 39.1 (prefill behavior):** the workshop prefill currently
renders checkboxes *checked but not applied*. Options: (a) **stop pre-ticking** — boxes
render unchecked; the existing "🧰 Show plans I can build" CTA (already URL-driven,
already shared-link-safe) becomes the one prefill affordance, and the panel hint becomes
"Tip: 'Show plans I can build' fills these from your workshop" — recommended, because it
makes control state always equal system state with zero new machinery; (b) tick *and
apply* on first load via redirect when URL has no `?tools=` — rejected by the audit's
own logic (a shared clean link would render differently for different users, violating
the standing URL-driven rule; include this in the write-up so the option is honestly
presented); (c) keep as-is. Fallback if unanswered: (c) + build everything else.

### Deliverables

- **39.1 — Prefill per the decision** (recommended: remove `prefillTools` from the
  checkbox `defaultChecked` path in `filter-panel.tsx`; keep `ownedTools` feeding the
  CTA in `browse/page.tsx`; simplify the hint copy — DRAFT flag; delete the now-unused
  `showingPrefill` branch; update `filter-panel` tests).
- **39.2 — Debounce 200ms → 650ms** (`use-soft-get-form.ts` `debounceMs` default, or the
  call site in `SoftGetForm` — one place). Rationale recorded at the constant: median
  inter-tap for deliberate multi-select is 300–600ms; 650ms coalesces a burst into one
  navigation while still feeling live after the *last* tick. The trailing-edge behavior
  (existing) is correct — keep it; add a unit test for the coalescing using fake timers
  (three change events 200ms apart → exactly one `requestSubmit`).
- **39.3 — Drawer Esc + focus containment** (`filter-disclosure.tsx`, mobile-open state
  only): a `keydown` listener (attached only while `enhanced && open && !desktop`)
  closing on `Escape` and returning focus to the summary pill; while open, set `inert`
  on the page's other top-level regions — implement by giving the drawer effect access
  to `document.querySelector('main')`/header/footer and setting/removing the `inert`
  attribute (React 19 supports the prop, but these nodes are outside the component —
  attribute manipulation in the effect with full cleanup, and a guard so desktop never
  gets inerted). Body scroll lock while the drawer is open (`overflow:hidden` on
  `document.body`, restored on close — with cleanup on unmount). All of it JS-only: the
  no-JS `<details>` path is byte-identical.
- **39.4 — A6 rider:** `account-menu.tsx` trigger gains `aria-expanded={open}`.
- **39.5 — Tests.** Fake-timer debounce test (39.2); disclosure tests: Esc closes +
  focus returns, `inert` set/removed symmetric (assert cleanup on unmount — a leaked
  `inert` main is a bricked page, this is THE test that matters in 39.3), no listeners
  attached when JS-off semantics are simulated (pre-`enhanced`).

### Explicit non-goals
No batch-apply redesign of the drawer (auto-apply stays; the debounce is the fix); no
changes to `AutoSubmitSelect`'s pointer/keyboard gating (settled, correct); no desktop
rail changes.

### Verification
Sandbox gate green. Keagan: build + phone — open drawer, tick 5 tools quickly → network
tab shows ONE navigation; Esc on a keyboard closes; VoiceOver/TalkBack if available
(else defer per E3): focus cannot escape the open drawer; background doesn't scroll;
push; CI.

---

## Sprint 40 — Landing integrity: motion you can stop, numbers that are true, one design system (audit A3, C1, V2, D2-landing)

**Objective.** The landing page keeps its polish but stops being its own dialect: motion
is pausable by everyone, the headline number is the real one, its accordion matches
`/faq`, and its one-off type/radius values collapse onto the system scale.

**⚖️ Decisions required before 40.1 / 40.2:**
- **Marquee treatment on touch (A3).** Options: (a) **below `lg`, the featured-plans
  marquee becomes a static horizontally-scrollable row** (native swipe *is* the
  marquee; kills the unpausable-motion and moving-focus problems in one move; trust +
  category text marquees keep animating but gain the focus-pause and a pause control) —
  recommended; (b) keep all marquees animated everywhere + add a visible pause/play
  button per band. Fallback: (b) is strictly additive; build (b) if unanswered.
- **Plan-count copy (C1)** — public copy, Keagan's: (a) live count, "**948 plans**, each
  fully specified" (number rendered from the same `queryPlans` total the page already
  could fetch; format with a threshold — below some floor say "Hundreds") —
  recommended; (b) keep "Hundreds of plans". Fallback: keep current copy.

### Deliverables

- **40.1 — Marquee a11y (per decision).** Unconditionally (both options): pause on
  `:focus-within` — one `globals.css` rule next to the existing hover-pause
  (`.landing-marquee:focus-within .landing-marquee-track { animation-play-state: paused; }`);
  keep `prefers-reduced-motion` kill. Option (a) additionally: below `lg` the featured
  track loses the animation and becomes `overflow-x-auto` with scroll-snap
  (`snap-x snap-mandatory`, cards `snap-start`), rendering **one** copy (no duplicates
  needed when not looping — the `PLAN_MARQUEE_COPIES` loop renders copy 0 only below
  `lg`… since copies are DOM, gate by rendering: copies 1+ get `hidden lg:flex`-
  equivalent classes on the `<li>`/card wrapper so mobile ships one interactive set;
  note the DOM-order/one-DOM rule is preserved — same markup, CSS-hidden). Option (b):
  a 44px pause/play toggle button per animated band (client island, `aria-pressed`,
  toggles a class the CSS reads).
- **40.2 — Plan count (per decision).** If (a): the landing already awaits
  `queryPlans({ sort:'trending', perPage: 8 })` — extend to read `total` from that same
  call (it returns it; no extra query) and thread it into the trust chip + final CTA
  copy. Guard: if `total < 100` render the current wording (a fresh DB must not brag
  "12 plans"). DRAFT flag on the wording.
- **40.3 — Accordion parity (V2).** The landing FAQ (`page.tsx` `details` block) adopts
  the `/faq` summary treatment: same chevron SVG + rotate-on-open + `motion-reduce`
  escape, same padding rhythm. (Height animation optional — if added, it is the same
  `::details-content` pattern with the same graceful-degradation argument; if not,
  state so.) One accordion dialect across the site.
- **40.4 — Hover-lift standardization (V2).** The "how it works" cards' `-translate-y-[6px]`
  → `-translate-y-[4px]`, matching cards everywhere else.
- **40.5 — Landing scale normalization (D2).** Collapse the landing's off-system values
  onto the shared scale, preserving visual intent within ±1px: text
  `[0.72rem]→0.75rem`, `[0.9rem]/[0.93rem]/[0.95rem]→0.9375rem`, `[1.02rem]→1rem`,
  `[1.1rem]/[1.15rem]→1.125rem`; radius `[0.6rem]/[0.7rem]→0.5rem` (icon squares) or
  `0.75rem` (cards) — judged per element against the core scale (0.375/0.5/0.75/1.1→
  keep `1.1rem` panels? No: `[1.1rem]→0.75rem` is a visible change on the big panels —
  instead add ONE new real token step `--radius-xl: 1rem` used by the landing panels
  and the account modal (which is already `0.75rem` — leave it) — implementer judgment,
  with the acceptance rule: **after this sprint, `src/app/page.tsx` contains no
  arbitrary font-size or radius value that is not part of a documented scale**, and the
  sprint log lists every substitution old→new. Spacing one-offs (`py-[0.6rem]` etc.)
  may stay where they are genuinely one-off *layout* tuning — the scale rule is for
  type and radius, where drift compounds.
- **40.6 — Guard:** extend `tests/ui-classes.test.ts` (or a new `tests/landing-scale.test.ts`)
  asserting `page.tsx`'s class strings contain no `text-[0.9…]`-style off-scale
  font-size arbitraries (regex allowlist of the sanctioned sizes). Keeps 40.5 from
  regressing the first time someone tweaks the hero.

### Explicit non-goals
No landing redesign, no new sections, no copy rewrites beyond 40.2's number, no change
to the marquee's seam-hiding copy mechanics on desktop, no Fraunces changes.

### Verification
Sandbox gate green. Keagan: build + browser — keyboard-Tab through the featured cards
(focus visibly parks the band / or sits in a static row per decision); phone: swipe the
featured row; confirm the count renders and matches `/browse`'s; both themes; push; CI.

---

## Sprint 41 — Consistency sweep: elevation tokens, dead code, cost anchor, one workshop picker (audit V1, V4, C3, H4)

**Objective.** The floating layer joins the elevation system, dead code dies, the cost
tiers get a beginner anchor, and the workshop picker exists exactly once.

**⚖️ Decisions required:**
- **H4 (before 41.4) — canonical workshop picker.** Options: (a) **the account modal's
  Workshop section becomes a link** ("Manage your workshop →" → `/profile#workshop`),
  deleting the modal's fetch/save duplication (~120 lines, `/api/workshop` GET becomes
  unused → flag for removal, `saveWorkshopModalAction` retired) — recommended: one
  surface, one save flow, and the plan page already deep-links there; (b) the modal is
  canonical and the plan page's "Update your workshop" opens it (requires a
  cross-component modal-open mechanism — more machinery for the same outcome); (c) keep
  both. Fallback: (c), log as deferred.
- **C3 (before 41.3) — cost-anchor copy** (public copy): recommended one muted line in
  the filter's Cost fieldset and a `title` on the tier badges:
  "$ = scrap-wood cheap · $$$$$ = a serious lumber budget" (DRAFT — Keagan words it).
  Fallback: skip, log as blocked-on-copy.

### Deliverables

- **41.1 — Elevation tokens on the floating layer (V1).** Replace the five ad-hoc
  shadows: `browsePanel` (site-header) → `shadow-e2`; overflow menu → `shadow-e2`;
  mobile drawer panel → `shadow-e3`; account modal → `shadow-e3`; filter drawer →
  `shadow-e3`. The side-drawer's directional `-8px 0` shadow is the one case where a
  token substitution changes the look meaningfully — accept `shadow-e3` (the audit's
  recommendation) unless the browser pass shows it worse, in which case mint
  `--elev-drawer` (+ dark variant + print `none` + dark-theme guard-test entry) rather
  than keeping a literal. Acceptance: `grep -rn "shadow-\[0" src` returns **no floating
  surface** (the skip-link's `transition` and any non-elevation shadows are named
  exceptions in the log). Both themes checked — in dark these five gain the inset edge
  highlight for the first time; that is the point.
- **41.2 — Dead code (V4).** Delete `compactOnMobile` from `src/lib/ui.ts` (verified
  zero call sites) + its stale doc comment; complete the Sprint 34 TODO in
  `tests/touch-targets.test.ts` asserting its absence. Also `git rm
  src/components/save-button.tsx` if still pending (long-standing QOL-B leftover —
  goes in Keagan's command block).
- **41.3 — Cost anchor (per decision).** Filter panel Cost fieldset gains the muted hint
  line; `plan-card.tsx` badge `title` and the glance-strip Cost cell `title` get the
  anchored wording. No dollar figures — the hard rule stands; the anchor is
  comparative language only, and the sprint log states this check explicitly.
- **41.4 — One workshop picker (per decision, recommended (a)).** Account modal:
  Workshop section becomes heading + one-line description + `btnGhost` link to
  `/profile#workshop` (closing the modal on click, like the Activity links). Remove the
  modal's tools state/fetch/save plumbing; retire `saveWorkshopModalAction` and the
  `/api/workshop` route **via Keagan's `git rm`/deletion list** with the standing
  security note (one fewer authenticated endpoint = smaller surface); update
  `tests/` accordingly. `/profile#workshop` is confirmed reachable no-JS and JS
  (36.1's active-state work does not intercept plain anchors).
- **41.5 — Tests.** Elevation: extend the dark-theme/ui-classes guards to assert the
  five surfaces reference `shadow-e2|e3` (string-level); workshop: modal test asserts
  the link and the *absence* of checkbox plumbing; route-removal reflected in
  offline/public-routes tests if `/api/workshop` was on any list (it is not on
  PUBLIC_ROUTES — verify and state).

### Explicit non-goals
No new elevation levels beyond the possible `--elev-drawer`; no modal redesign; no
changes to `WorkshopForm` itself (it is already the good copy).

### Verification
Sandbox gate green. Keagan: build + browser both themes — open every floating surface
in dark (Browse menu, drawer, "…" menu, account modal, filter drawer) and confirm the
edge highlight reads; tooltip/hint wording approved; workshop flow: plan page →
"Update your workshop" → save → catalog CTA reflects it; push; CI.

---

## Sprint 42 — Documentation truth pass + close-out (audit D1/D2/D3 docs, plan hygiene)

**Objective.** The documents an agent or human reads first tell the truth about the
system that now exists — the audit's core "documentation drift" complaint — and this
remediation plan is closed out with a verified coverage check. **This sprint is last on
purpose: it documents what shipped, not what was intended.**

### Deliverables

- **42.1 — `DESIGN_BRIEF.md` rewrite** (the three drifts + the audit's corrections):
  - §2 Tokens: full real table — add `--muted-2`, `--accent-fg`, `--accent-soft`,
    `--accent-text` (33), `--elev-1/2/3`, `--card-bg`, `--bevel`, and any 41 additions;
    state the dual-theme rule ("every color token exists in `:root` AND `.dark`;
    guarded by `tests/dark-theme.test.ts` + `tests/contrast.test.ts`").
  - §2 Dark mode: replace "there is no dark mode" with the mechanism (cookie →
    `.dark` on `<html>`, server-stamped; toggle locations; Clerk appearance pairing;
    the OS-preference decision as recorded in 37).
  - §1/§2 Styling: replace "no Tailwind" with the real system ("CSS custom-property
    tokens are the source of truth; Tailwind v4 utilities *reference* them via
    `@theme inline`; `globals.css` is unlayered and wins — new plain-CSS rules
    override utilities, so prefer utilities for component styling; arbitrary values
    only for documented scales; the print-class and source-order rules").
  - Typography: "system-ui for UI; Fraunces (`--font-display`) scoped to marketing
    headings via `.font-display`".
  - §5 A11y baseline: correct the `aria-current` sentence to match reality post-36
    (nav marks current page; sort is a `<select>` — no `aria-current`; live-region on
    results count) and add the two enforced invariants (AA contrast test; 44px rule +
    its guard test).
- **42.2 — `CLAUDE.md` §7 updates**: entries for Sprints 33–41 in the house style
  (what/why/traps), and mark this plan's file as the governing doc for the phase.
- **42.3 — Coverage-matrix audit.** Re-walk §2 of this plan against the shipped code:
  for every audit ID, one line of *evidence from the final code* (file + the thing that
  proves it). Any finding that slipped gets logged as OPEN with a reason — the explicit
  anti-goal is a close-out that claims completeness it didn't verify (the audit's
  critique of the 95–97 scores, applied to this plan itself).
- **42.4 — Full-suite regression gate** in the `/tmp` clone (all tests incl. the new
  guards: contrast, touch-targets, clerk-parity, landing-scale, dark-theme) + the
  standing checks: orphan-class grep against both `@media print` blocks; hardcoded-hex
  grep on every file touched in 33–41; `NEVER_CACHE_PREFIXES` unchanged-and-tested.
- **42.5 — Housekeeping riders (from the prior audits, so they stop being loose ends):**
  Keagan's command block includes the pending deletions — `_to_delete/` folders,
  `save-button.tsx` (if not done in 41), and the ⚖️ offer from the audit: delete the
  CAD pilot (`/dev/diagrams`, `part-diagram.*`) or keep it gated — his call, default
  keep.
- **42.6 — ⚖️ OPTIONAL, only if Keagan opts in: app-page type hierarchy** (audit D3/V4's
  "flat h1/h2"). Presented as a decision with a mockup-first approach (h1 →
  1.875–2rem, real section headings at 1.125–1.25rem non-uppercase, eyebrow style
  reserved for actual eyebrows; the unlayered-`h2` cascade implications enumerated —
  this touches the `.catalog-nav-heading`/footer `!` workarounds, which would *shrink*,
  not grow). **Not built without an explicit yes**; if declined, record and close.

### Verification
Sandbox: 42.4 green. Keagan: read the brief top-to-bottom once as "the new contributor"
(the persona it exists for), build + push; CI. Scoring note: category 1 for this sprint
is the coverage matrix itself — every row cited or honestly OPEN.

---

## 4. Standing scoring reminder (applies to every sprint above)

Per `BUILD_PLAN.md` §§6–7, with this plan's E1–E4 evidence rules (§1.4): score all seven
categories with a sentence of *evidence* each; measured numbers where the deliverable
is numeric; device-bound checks explicitly deferred to Keagan, never claimed; below 95
→ fix the issue (not the score), re-verify, re-score, max 3 attempts, then stop and
escalate with specifics; every attempt logged in `SPRINT_LOG.md` with the scorecard
breakdown and commit SHAs. A sprint that ships code violating §1.2's invariants cannot
pass category 1 regardless of polish — check them first, not last.
