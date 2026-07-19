# QOL / UI Build Plan — Sprints 33+ (drafted, not started)

Planning artifact only. No code has been touched. Grounded in the actual repo
(paths, components, and rules cited below) as of 2026-07-19. Follows the same
sprint shape as `BUILD_PLAN.md` §4–7 (scorecard ≥95, `DECISIONS_LOG.md` for
anything that isn't a routine engineering call). Numbered as **QOL-A..QOL-G**
so it doesn't collide with `BUILD_PLAN.md`'s own Sprint 33 if one exists by
the time this is picked up — renumber when you fold it in.

Each phase below is scoped to be **one sprint** (one session, one scorecard,
one `SPRINT_LOG.md` entry). A phase's "Session prompt" is copy-paste-ready for
a fresh Claude session — it names the files, cites the existing pattern to
reuse, and states the scope boundary so the agent doesn't drift into an
adjacent phase.

**Decisions locked 2026-07-19 (Keagan):**

- QOL-F visual direction: **Modern SaaS depth** (clean cards, soft shadows,
  subtle hover-tilt/parallax, smooth micro-animations) — not skeuomorphic
  workshop textures or an illustrative/editorial style.
- QOL-B cut-list visual: **embed inline** in the Cut List tab (not a
  link/preview only) — accepted the trade-off of a second render path.
- QOL-G: **proceed** with the 5-plan pilot as scoped.
- The 8 new-feature ideas below (parking lot) are **recorded in
  `FUTURE_IDEAS.md`** ("Parked 2026-07-19") — nothing there is scheduled.

**Ground truth already established while planning this** (so the sprints
below don't re-litigate it):

- The **tools-you-own filter already exists** (`filter-panel.tsx`, "Tools you
  own" checkbox group, Sprints 5/25/26) and already narrows results to plans
  where every essential tool is checked. Your ask for a tools checklist filter
  is **already built** — nothing to do there except make it easier to reach on
  mobile (folded into QOL-A).
- A **bookmark-icon save toggle already exists** (`save-toggle.tsx`) and is
  already used on catalog cards. The plan-detail page just uses the older
  text-button `save-button.tsx` instead — QOL-B is mostly "use the pattern
  that already exists in this codebase," not new design.
- A **to-scale visual cut layout already exists**: `/plans/[slug]/boards`
  (`src/app/plans/[slug]/boards/page.tsx`) renders a proportional `board-bar`
  per board with each part sized by `flexGrow: lengthIn`. This is the
  reference for QOL-B's "make the cut list more visual" ask — extending it,
  not inventing a new visualization.
- **Difficulty numerals**: `plan-card.tsx` already shows word-only
  (`difficultyLabel`). The one numeral left is the plan-detail "at a glance"
  strip (`(plan.difficulty/5)`, `src/app/plans/[slug]/page.tsx` ~line 250).

---

## Phase QOL-A — Catalog filter & sort UX — ✅ **COMPLETE 2026-07-19, 95/100**

*(All four items shipped; see `SPRINT_LOG.md` for the scorecard and the two documented
behaviour changes — the restored `.filters` print class and the retirement of the
count-driven auto-open. Needs `npm run build` + a real-phone pass + push.)*

**Scope:** mobile filter drawer, smaller filter/sort triggers, sort
auto-apply, difficulty numeral removed from the glance strip.

1. **Filter as an off-canvas drawer on mobile.** Currently `FilterPanel` sits
   in normal flow inside a `<details>` (`filter-disclosure.tsx`) — collapsed
   by default on mobile, open by default on desktop (`DESKTOP_QUERY = '64rem'`).
   Reuse the **drawer pattern already built for `MobileNav`**
   (`mobile-nav.tsx`): a `<details>`-based panel so it still works with JS off,
   `usePathname`/click-inside closes it, positioned as an overlay instead of
   inline. Below `lg`, the "Filters" summary becomes a small icon+badge
   trigger (not the current full-width bar) that opens the drawer from the
   right or bottom; desktop keeps today's inline right-rail behavior
   unchanged (`DESKTOP_QUERY` already exists to key off).
2. **Shrink the filter/sort trigger buttons on mobile** — smaller
   min-height/padding below `lg` only (both currently sit at the standard
   44px `btn*` sizing from `src/lib/ui.ts`; a mobile-only compact variant, not
   a global button-size change — don't touch `btnBase` itself, that's used by
   ~80 call sites per Sprint 29's own comment).
3. **Sort auto-applies on change.** `sort-select.tsx` is a plain GET form with
   an Apply button (deliberate no-JS pattern, per its own comment). Add a
   client-side progressive enhancement: `onChange` submits the form via JS;
   the Apply button and full no-JS submit path **stay** as the fallback (same
   doctrine as `FilterDisclosure`'s JS-optional pattern) — don't delete the
   button.
4. **Difficulty numeral**: drop `(plan.difficulty/5)` in the glance strip;
   keep `difficultyLabel(plan.difficulty)` alone, matching `plan-card.tsx`.
   Grep for any other `/5` or raw `difficulty` numeral rendering before
   closing this out.

**Not in scope for this phase:** the tools-owned filter itself (already
built, see ground truth above) and the desktop filter layout (Sprint 18,
unchanged).

**Session prompt:**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-A only. Implement: (1) a mobile off-canvas filter drawer reusing
> the `<details>`-based pattern from `src/components/mobile-nav.tsx`, applied
> to `src/components/filter-disclosure.tsx` / `filter-panel.tsx` — desktop
> layout (≥64rem, `DESKTOP_QUERY`) stays exactly as-is; (2) a smaller
> filter-trigger and sort-trigger on mobile only; (3) sort auto-submits on
> `<select>` change in `src/components/sort-select.tsx` via a JS
> progressive enhancement, keeping the existing Apply button as the no-JS
> fallback (do not remove it); (4) remove the `(N/5)` numeral from the
> "at a glance" difficulty row in `src/app/plans/[slug]/page.tsx` — grep for
> any other place a raw difficulty numeral renders and fix those too. Do not
> touch the desktop filter rail, the tools-owned filter logic, or `btnBase`
> in `src/lib/ui.ts` globally — only mobile-scoped trigger sizing. Self-score
> against `BUILD_PLAN.md` §6 before calling this done.

---

## Phase QOL-B — Plan-detail page reorg — ✅ **COMPLETE 2026-07-19, 95/100**

*(All six items shipped; see `SPRINT_LOG.md` for the scorecard, the two stated
deviations, and one pre-existing 500 found and flagged. Needs
`git rm src/components/save-button.tsx` + `npm run build` + a browser pass + push.)*

**Scope:** move "Start building" up, bookmark-icon + plain like counter,
overflow menu for Print/Shopping-list, cut list gets a visual, board-foot
clarity, star-input for reviews.

1. **"Start building" CTA moved up.** Today it's a link inside
   `InstructionsDisclosure`, which renders after the Tools/Materials/Cut-list
   tabs. Add it as a **primary CTA in the header actions row**
   (`plan-actions`, top of the page, alongside Save/Like/Shopping-list) —
   additive, don't remove the existing lower placement or the full
   server-rendered instructions section (that's the no-JS/print/offline
   fallback per the Sprint 20 contract — don't break it).
2. **Bookmark icon top-right + a plain like counter.** Swap the plan-detail
   page's `SaveButton` (text button) for the **existing** `SaveToggle`
   pattern (`save-toggle.tsx`, already the bookmark-icon toggle used on
   catalog cards) — position top-right of the header or image slot. Restyle
   `LikeButton` so the count reads as a counter (icon + number) rather than a
   button with a "X likes" label; it must stay a real `<form>` toggle for
   signed-in users (same no-JS-required doctrine as every other write in this
   app) — only the visual treatment changes, not the semantics.
3. **"..." overflow menu.** New small menu (top-right of the page, a
   `<details>`-based disclosure — same no-JS-safe pattern as everything else
   here, not a JS-only dropdown) housing the existing `Print / PDF` link and
   `ShoppingListButton` — decluttering the primary actions row now that it
   also holds Save/Like/Build-now.
4. **Cut list gets a visual — embed inline (decided 2026-07-19).** Don't
   rebuild a new visualization — the to-scale `board-bar` component already
   exists at `/plans/[slug]/boards`. Render a compact, read-only version of
   that same layout directly inside the plan page's "Cut list" tab, using the
   same `optimize()`/`totalBoards()` functions from `src/lib/cut-optimizer.ts`
   (not a copy of the math — call the same module). This duplicates the
   *rendering* into a second call site, not the optimizer logic itself, since
   both call sites should share one function. Keep the full `/boards` page as
   the place to change stock length/width/kerf options — the inline version
   uses `DEFAULT_OPTIONS` and links out to `/boards` for anyone who wants to
   tune those.
5. **Board-foot clarity.** Add a tooltip/inline note next to any material row
   quantified in board feet, converting to an example L×W×T (or showing the
   arithmetic) — reuse `formatInches`/tape-measure-fraction formatting from
   `src/lib/format.ts`, don't introduce decimal inches anywhere (standing
   rule, `CLAUDE.md` "Money is integer cents. Dimensions render as
   tape-measure fractions").
6. **Star-rating input.** Replace the five radio buttons in
   `reviews-section.tsx` with a clickable 1–5 star widget (hover/click fills
   stars left-to-right) as a **progressive enhancement over the existing
   radio group** — the radios must still work with JS off per the form's own
   comment ("A rating that needs JavaScript to be entered is a rating some
   people cannot leave"). Visually hide the radios instead of removing them;
   the star UI drives them via label/click, same pattern as a native styled
   radio group.

**Session prompt:**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-B only. Files: `src/app/plans/[slug]/page.tsx`,
> `src/components/save-button.tsx`, `src/components/save-toggle.tsx`,
> `src/components/like-button.tsx`, `src/components/shopping-list-button.tsx`,
> `src/components/reviews-section.tsx`, `src/app/plans/[slug]/boards/page.tsx`,
> `src/lib/cut-optimizer.ts`. Implement items 1–6 exactly as scoped in the
> plan doc. Item 4 (cut-list visual) is decided: embed inline in the Cut List
> tab, reusing `optimize()`/`totalBoards()` from `src/lib/cut-optimizer.ts`
> directly — do not duplicate the layout math. Preserve
> every no-JS/print/offline contract already documented in this repo's
> component comments (the instructions section, the review radio fallback,
> the plain-form save/like/shopping-list actions) — these are load-bearing,
> not incidental. Self-score against `BUILD_PLAN.md` §6.

---

## Phase QOL-C — FAQ accordion — ✅ **COMPLETE 2026-07-19, 97/100**

*(Shipped as native `<details>` accordions; the `<dl>` could not be kept — see
`SPRINT_LOG.md` for why, plus the deliberate animation-degradation argument and one
accepted print limitation. Needs `npm run build` + push.)*

**Scope:** `src/app/faq/page.tsx` only.

Convert the `<dl>` of Q/A pairs into an animated accordion — native
`<details>`/`<summary>` per item (consistent with every other disclosure
pattern already in this codebase: `FilterDisclosure`, `MobileNav`,
`InstructionsDisclosure` — all `<details>`-based specifically so they work
without JS) with a CSS open/close transition (`prefers-reduced-motion`
respected, matching the existing skeleton-loading precedent). Keep the
semantic Q/A structure so screen readers still get question→answer, not just
a heading. This is copy-neutral — no FAQ content changes, `robots: noindex`
stays until branding decision #8.

**Session prompt:**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-C only. Convert `src/app/faq/page.tsx`'s `<dl>` into an animated
> `<details>`/`<summary>` accordion, one per FAQ item, respecting
> `prefers-reduced-motion` (see how skeleton loading states already handle
> this, Sprint 17-era). Do not change any FAQ copy — that's Keagan's content,
> not this sprint's. Self-score against `BUILD_PLAN.md` §6.

---

## Phase QOL-D — Navigation & profile/settings — ✅ **COMPLETE 2026-07-19, 95/100**

*(Item 1's IA options were put to Keagan first; he chose the **Browse menu** treatment
and to **drop Workshop from the header** — `DECISIONS_LOG.md` 2026-07-19. All three items
shipped; see `SPRINT_LOG.md` for the scorecard, the build-time-constant reasoning, and
two traps caught in construction. Needs `npm run build` + a browser pass + push.)*

**Scope:** category-aware nav for both breakpoints, footer, fold Workshop
into Profile as a settings page.

1. **Nav that scales to the real catalog size.** Today's nav
   (`site-header.tsx`) is Home/Paths/About/FAQ plus, signed-in,
   Saved/Builds/Workshop — flat, and doesn't surface categories at all
   despite the catalog having 6 categories and (per `CLAUDE.md` §7) 85 plans
   growing toward "950 plans." Options to brainstorm with Keagan before
   building (this is a real IA decision, not a routine one — recommend
   surfacing 2-3 concrete directions with a quick mockup rather than
   guessing): (a) a "Browse" mega-menu/dropdown off the desktop nav listing
   categories, reusing `CategoryNav`'s existing category data
   (`category-nav.tsx`, already used in the Sprint 18 desktop rail); (b) fold
   category browsing into the mobile drawer as a collapsible section; (c)
   leave top-nav minimal and rely on the catalog's own category rail/filter
   (today's approach) but add a quick "Browse by category" entry point site-
   wide (e.g. footer, or a nav item that jumps to the catalog with the rail
   focused). Recommendation: (a) + keep the existing catalog-page rail — a
   nav that only works once you're already on the catalog page under-serves
   someone landing on a plan-detail or FAQ page who wants to browse.
2. **Footer.** New shared footer (nav links, category links, About/FAQ,
   copyright) — straightforward, low-risk, add to root layout
   (`src/app/layout.tsx`) alongside `SiteHeader`.
3. **Workshop folds into Profile as a settings page.** `/workshop` is
   currently a standalone private route (Sprint 25). Move its tool-selection
   form into `/profile` as a new "Workshop" section/tab, keeping the same
   `saveWorkshopAction`, `getOwnedToolSlugs()`, grouped-checkbox UI, and every
   existing security property (no `userId` params, session-derived owner,
   `requireUser`). Decide: keep `/workshop` as a redirect to
   `/profile#workshop` (preserves the header nav link + any bookmarks/links
   already pointing at it, e.g. the plan-detail page's "Update your workshop"
   link in `src/app/plans/[slug]/page.tsx`) rather than a hard delete — a
   dead link on a signed-in-only page is a real regression, and there are at
   least two existing call sites linking to `/workshop`.

**Not in scope:** sitemap and SEO metadata — both explicitly blocked by the
open branding/domain decision (`BUILD_PLAN.md` §4.2 #3; `robots: noindex` is
set sitewide because of it). Don't build a sitemap that can't be indexed yet.

**Session prompt:**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-D only. Before writing nav code, present Keagan the 2-3 nav
> layout options in item 1 with a quick mockup/description and get a
> direction — this is an IA decision, not a routine one. Then: build the
> chosen nav treatment, add a shared footer to `src/app/layout.tsx`, and fold
> `/workshop`'s form into `/profile` (new section/tab) reusing
> `saveWorkshopAction`/`getOwnedToolSlugs()` unchanged — keep `/workshop` as a
> redirect to the new profile section rather than deleting the route (grep
> for existing links to `/workshop`, e.g. in `src/app/plans/[slug]/page.tsx`,
> and update them). Do not build a sitemap or touch `robots` metadata — both
> are blocked by the open branding decision, see `BUILD_PLAN.md` §4.2. Self-
> score against `BUILD_PLAN.md` §6.

---

## Phase QOL-E — Learning paths: rename + taxonomy — ✅ **COMPLETE 2026-07-19, 96/100**

*(Both open questions were put to Keagan first: the level vocabulary reuses the 1–5
`Plan.difficulty` scale, and **no new path content** was authored — the 5 existing paths
were tagged (`DECISIONS_LOG.md` 2026-07-19). Writing additional paths to fill the empty
taxonomy cells remains a separate content pass, Keagan's to schedule. Needs
`db:migrate` → **`db:seed`** → `build` → browser pass → push; see `SPRINT_LOG.md`.)*

**Scope:** `Paths` → `Learning` in nav/copy, add experience-level and
category grouping to the paths index, schema change.

1. Rename the nav item and page heading from "Paths" to "Learning" (keep the
   `/paths` URL — changing routes this late touches offline caching lists
   (`src/lib/offline-urls.ts`) and any existing links for no real benefit;
   this is a display-name change).
2. **Add taxonomy to `LearningPath`** (schema addition, migration required):
   an `experienceLevel` field (beginner/intermediate/advanced — reuse
   whatever enum shape `Plan.difficulty` already models, don't invent a
   second vocabulary) and a category grouping. For category, decide: reuse
   the existing `Category` model each path's plans already belong to
   (derive it, e.g. the category of the majority of a path's steps) versus a
   new explicit `category` field on `LearningPath` itself. Recommend the
   explicit field — a path can reasonably span categories (a "first five
   projects" path isn't one category), and deriving it would produce
   surprising labels. This is a routine schema call, not an escalation.
3. Rebuild `/paths` (`src/app/paths/page.tsx`) to group/filter by the two new
   dimensions, same GET-form/URL-driven philosophy as the catalog filters
   (no new client-state pattern — reuse `FilterPanel`'s approach).
4. **Content buildout** ("categorize them... let's build this out") is a
   content-authoring task, same category as the original 24-plan seed
   content — flag to Keagan whether new paths get authored by the build
   agent (following the existing `content/paths/*.json` + `reason`-required
   schema, `CLAUDE.md`'s learning-paths rule) or by Keagan directly. Either
   way: **remember paths are CONTENT — they don't reach production on
   deploy without a seed run**, per the standing rule.

**Session prompt:**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-E only. Rename "Paths" to "Learning" in nav copy only (URL stays
> `/paths` — check `src/lib/offline-urls.ts` and any hardcoded links before
> assuming this is safe to leave). Add `experienceLevel` and `category`
> fields to the `LearningPath` schema (migration), matching the existing
> `Plan.difficulty` vocabulary for level and an explicit field for category
> (a path can span categories). Rebuild `src/app/paths/page.tsx` to
> group/filter on both, GET-form/URL-driven like the catalog filters — no new
> client-state pattern. Stop and ask Keagan whether new path *content* gets
> authored this sprint or is a separate content pass — don't invent path
> content unprompted. Remember: schema ships on deploy, path content does
> not — it needs a seed run (`CLAUDE.md`'s learning-paths + deployment
> rules). Self-score against `BUILD_PLAN.md` §6.

---

## Phase QOL-F — Visual/motion pass ("less like reading a book") — ✅ **COMPLETE 2026-07-19, 96/100**

*(Both steps done. Keagan reviewed the mockup and chose **variant A** — CSS-only lift +
shadow, no client island on the catalog grid — keeping B's press feedback
(`DECISIONS_LOG.md` 2026-07-19). Rolled out to cards, buttons, the save toggle, a new
catalog hero, and a settle-in replacing the skeleton jump. One documented deviation: the
tab-underline slide was substituted with a colour transition, because the live tabs are
folder tabs. See `SPRINT_LOG.md` for the three traps caught in construction. Needs
`npm run build` + a browser pass — dark mode and print preview especially — + push.)*


**Scope:** apply a "Modern SaaS depth" treatment — clean cards, soft layered
shadows, subtle hover-tilt/parallax, smooth micro-animations — across the
existing surfaces. **Direction decided 2026-07-19 (Keagan):** this style over
skeuomorphic workshop textures or an illustrative/editorial look, specifically
because it's the lowest-risk fit against the current cream/ink/orange theme
and the education-first tone (the other two directions were live options and
were turned down).

Still recommend a **mockup checkpoint before a full rollout sprint** — not
because the direction is undecided anymore, but because "clean cards, soft
shadows, subtle tilt" still has a wide range of honest execution, and a
1-2-page static mockup is far cheaper to redirect than a full pass across
every surface.

1. **Mockup session** (run first): produce 1-2 static mockups (not wired into
   the live app) of a hero/landing treatment, one card depth/hover treatment,
   and one micro-animation (e.g. button feedback or a page transition),
   within the "Modern SaaS depth" direction and the existing color tokens
   (`src/app/tailwind.css`, `globals.css` `:root` — both light and dark).
   Keagan reviews and approves before anything touches a real page.
2. **Rollout sprint** (after approval): apply the approved treatment across
   real surfaces, same pixel-parity discipline as the Tailwind migration
   (Sprints 28-32). Motion must respect `prefers-reduced-motion` (already the
   house rule for skeletons), must not touch the print stylesheet (out of
   scope for any visual work per `BUILD_PLAN.md` §4.4's standing exclusion),
   and must not break the no-JS contracts documented throughout this
   codebase (step walker, disclosures, form-based writes).

**Session prompt (mockup step, run this one first):**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-F. Direction is decided: "Modern SaaS depth" — clean cards, soft
> layered shadows, subtle hover-tilt/parallax, smooth micro-animations. Not
> skeuomorphic/textured, not illustrative/editorial. Produce 1-2 static
> mockups (not wired into the live app) covering a hero/landing treatment,
> one card depth/hover treatment, and one micro-animation, using the existing
> cream/ink/orange palette and light/dark tokens (`src/app/tailwind.css`,
> `globals.css` `:root`). Do not touch any live page or component yet.
> Present the mockups for Keagan's approval before any rollout sprint starts.

*(Once approved, write the rollout-sprint prompt from the approved mockup —
naming the specific components it touches.)*

---

## Phase QOL-G — Step/plan visuals (CAD-style representations) — ✅ **PILOT COMPLETE 2026-07-19, 96/100 — verdict: DO NOT roll out catalog-wide**

*(Built and piloted at `/dev/diagrams`, dev-only. Findings in `SPRINT_LOG.md`: per-step
highlighting is blocked on a missing step→cut-list-row link (needs a `StepPart` join + a
content pass), the diagram's value only shows on plans with a wide part-size spread (2 of
5 pilot plans), and it partly duplicates the board plan. A cheaper narrow subset is
proposed. **Keagan's call: keep narrow, open a `StepPart` sprint, or drop.**)*

---

### Original plan, for reference


**Scope:** figure out what's actually buildable at catalog scale before
committing to an approach.

**A hand-modeled 2D/3D CAD render per step, across ~950 plans, is not
feasible** — that's the same maintenance-burden problem `FUTURE_IDEAS.md`
already rejected once for local lumber pricing ("too much to maintain").
Every plan already carries the data a diagram needs, though: `cutList`
(thickness/width/length per part — the same data the `boards` page already
renders as a to-scale bar) and, since Sprint 21, per-step `StepTool`/
`StepMaterial` tags. That's enough to **generate** a diagram, not draw one by
hand.

**Recommended approach, cheapest first:**

1. **Plan-level exploded/orthographic diagram, auto-generated from
   `cutList`.** A simple SVG (or `<canvas>`) layout — parts as labeled
   rectangles sized proportionally from `thicknessIn`/`widthIn`/`lengthIn`,
   same "to-scale, not artistic" honesty as the existing board-bar. This
   needs zero new content per plan — it's pure computation off data that
   already exists for every published plan. Ships as one generic renderer,
   not per-plan art.
2. **Per-step highlight, not a per-step 3D scene.** Reuse the plan-level
   diagram and highlight/outline just the parts + tools tagged to the
   *current* step (`StepTool`/`StepMaterial`, already joined and already used
   for the "owned tool" checkmark). This answers "what does this step
   involve" without modeling geometry changing over time — still zero new
   content per plan.
3. **True 3D/CAD** (actual assembly geometry, exploded views, rotate/orbit)
   is a different order of project — it needs a 3D asset per plan (or a
   parametric model generator far more sophisticated than the cut-list
   optimizer), which is a genuinely large content/tooling investment. Not
   ruled out permanently, but don't schedule it against ~85-950 plans without
   a pilot first.

**Decided 2026-07-19 (Keagan): proceed with the pilot as scoped.** (1) + (2)
on ~5 plans, reviewing whether the auto-generated diagram is actually
clearer than the existing table + board-bar combination, before deciding
whether to roll it out catalog-wide. This is the same "prove it before you
scale it" discipline the cut-list optimizer and the tool-fit feature already
followed.

**Session prompt (pilot):**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-G only. Build a generic SVG-based diagram renderer that takes a
> plan's `cutList` (same shape already used in
> `src/app/plans/[slug]/boards/page.tsx`) and draws parts as proportionally-
> sized labeled rectangles — no per-plan artwork, pure computation from
> existing data. Add step-level highlighting using the existing
> `StepTool`/`StepMaterial` joins (see `src/lib/workshop.ts`'s `toolFit` and
> `plan-steps.tsx` for how per-step tags are already read). Pilot on 5
> existing plans behind a flag or a dev-only route — do not wire this into
> the live plan-detail or build pages yet. Report back whether it reads as
> clearer than the existing cut-list table + board-plan link, so Keagan can
> decide on a catalog-wide rollout. Do not attempt true 3D/CAD modeling —
> out of scope per the plan doc's feasibility note. Self-score against
> `BUILD_PLAN.md` §6, redistributing category 6 if there's no mobile/offline-
> relevant surface for a dev-only pilot.

---

## Not scheduled — parking lot (new features, not QOL/UI fixes)

Per `CLAUDE.md` §5 ("No features that aren't in `BUSINESS_PLAN.md`"), the 8
new-feature ideas from the original brief (CNC plans, jig plans, cutting
board designer, sitemap, SEO, community plans, standalone board-foot
calculator, tool repository) are genuinely new product surfaces, not UI
polish, and none are in `BUSINESS_PLAN.md` today. **Recorded in
`FUTURE_IDEAS.md`, "Parked 2026-07-19"** (Keagan's decision, 2026-07-19) —
see that file for the per-item reasoning. Nothing in that list is scheduled;
moving an item out of it and into a real sprint is Keagan's call alone, per
that file's own standing rule.

---

## Suggested build order

QOL-A → QOL-B → QOL-C → QOL-D → QOL-E → QOL-F (mockup step first) → QOL-G
(pilot only). A/B/C are independent and low-risk; D touches every page's
chrome so doing it before F avoids animating something about to be
restructured; E is self-contained; F and G are both exploratory and
deliberately sequenced last so the cheaper, well-specified work ships first.
