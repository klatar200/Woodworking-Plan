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

**🛑 Standing rule for every phase in this document (added 2026-07-20, applies
retroactively to any phase not yet started): if anything is ambiguous, missing,
or contradicts what you find in the actual code — stop and ask Keagan
immediately. Do not guess, do not assume a "probably intended" behavior, and do
not fill a gap with invented content (copy, data, numbers) to keep moving. A
wrong guess that ships is much more expensive than a question that costs one
reply. This is not a suggestion — treat a hesitation as a hard stop.**

**Verification rule for every phase in this document (added 2026-07-20):**
`localhost:3000` is a running dev server with a Chrome tab already open on it.
Before self-scoring any phase against `BUILD_PLAN.md` §6 category 2
(Correctness & functionality), actually navigate there (or the specific route
you changed) and take a screenshot / read the rendered page — do not score
"Correctness" from reading your own diff alone. If the dev server needs a
restart or shows stale output, say so rather than scoring against what you
expect it to show. Check both a desktop-width and a mobile-width viewport
screenshot for anything touching layout, and check both light and dark theme
for anything touching color/surfaces.

**Decisions locked 2026-07-19 (Keagan):**

- QOL-F visual direction: **Modern SaaS depth** (clean cards, soft shadows,
  subtle hover-tilt/parallax, smooth micro-animations) — not skeuomorphic
  workshop textures or an illustrative/editorial style.
- QOL-B cut-list visual: **embed inline** in the Cut List tab (not a
  link/preview only) — accepted the trade-off of a second render path.
- QOL-G: **proceed** with the 5-plan pilot as scoped.
- The 8 new-feature ideas below (parking lot) are **recorded in
  `FUTURE_IDEAS.md`** ("Parked 2026-07-19") — nothing there is scheduled.

**Decisions locked 2026-07-20 (Keagan) — full reasoning in `DECISIONS_LOG.md`:**

- **QOL-M landing page: replaces `/`.** The catalog moves to `/browse`; `/`
  becomes the new marketing/landing page. This is the highest-blast-radius
  phase in this document — see QOL-M for the full inventory of what currently
  assumes `/` is the catalog.
- **QOL-H sort "Apply" button: visually hidden, not deleted.** Keeps the
  no-JS/keyboard submit path alive; only the pointer/touch-visible button goes
  away.
- **QOL-K page widths: widen to the existing `.page-wide` (64rem) treatment,
  not the catalog's edge-to-edge `lg:max-w-none`.** Reuses a token that already
  exists (Saved/Builds use it today) rather than inventing a new one.

**Also flagged 2026-07-20, not a decision — read before touching any sprint
below that cites a plan count:** `CLAUDE.md` §7 says the catalog is 85 plans.
The live app right now (`localhost:3000`, verified in-browser) serves **948
published plans** (1,115 total files in `content/plans/`, 948
`published: true`). Every phase below is written against **948**, not 85.
`CLAUDE.md`'s catalog-size line is stale and should get corrected as routine
hygiene while you're in this area — not a blocker, just don't trust that one
number if you cross-reference it.

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

## Phase QOL-H — Soft-navigation infrastructure + sort control — ✅ **COMPLETE 2026-07-20 (pushed, CI green)**

**Outcome:** shared soft-GET-form client hook (`use-soft-get-form`) + `SoftGetForm`
wrapper; the sort control auto-submits via `router.push(url, { scroll: false })` with the
Apply button hidden when JS is on (kept as the no-JS commit path). The form itself stays
server-rendered. See `SPRINT_LOG.md` (2026-07-20 consolidated entry) and git history.

**Scope:** `src/components/sort-select.tsx`, `src/components/sort-select-control.tsx`,
one new small shared client hook.

**Root cause (verify this yourself before writing code — don't take it on
faith):** QOL-A already made the sort `<select>` auto-submit on a pointer/touch
change (`sort-select-control.tsx`, `onChange` → `event.currentTarget.form?.requestSubmit()`).
But the form it submits is a plain `<form action="/" method="get">`
(`sort-select.tsx`) — `requestSubmit()` on that is a **native browser form
submission**, i.e. a full document navigation: new HTTP GET, full HTML
response, header/footer/everything re-fetched and repainted. QOL-A removed the
extra click; it did not remove the reload. That's Keagan's item 1.

1. **Build a small reusable client hook** — e.g.
   `src/lib/use-soft-get-form.ts` — that takes a form ref, intercepts `submit`
   (`event.preventDefault()`), builds the target URL from the form's own
   `FormData` (reuse `buildQueryString` from `src/lib/filters.ts` if the shape
   fits rather than re-deriving query-string logic), and calls
   `useRouter().push(url, { scroll: false })` (`next/navigation`) instead of
   letting the browser submit natively. `scroll: false` matters — resorting a
   long results list must not throw you back to the top.
2. **Wire it into `sort-select.tsx`'s form**, and only that form, for this
   phase — sort is the simplest case (no checkbox groups, no repeated hidden
   inputs beyond the existing filter passthroughs) and is the right place to
   prove the mechanism before QOL-I reuses it on the heavier filter form.
3. **Hide the "Apply" button, don't delete it** (2026-07-20 decision,
   `DECISIONS_LOG.md`). Use the same `visually-hidden` utility class already
   used elsewhere in this codebase for exactly this "reachable by keyboard/
   no-JS, invisible to a mouse user" case (check `search-box.tsx`'s label for
   the existing pattern) — not `display: none`, which would also remove it
   from the no-JS submit path. With JS on, a click on the (hidden) button
   should go through the *same* intercepted-submit code path as the `<select>`
   change, not bypass it.
4. **Verify with the actual browser, not just a read of the diff.** Navigate
   to `localhost:3000`, change the sort, and confirm in the Network panel that
   you see a soft client-side transition (no full-document reload, no white
   flash, scroll position held) rather than a fresh navigation. Screenshot
   before/after.

**Not in scope:** the filter panel's Apply/Clear (QOL-I), the page-size control
(QOL-I). Don't touch those forms yet — prove the hook on sort first.

**Session prompt:**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-H only. Verify the stated root cause yourself by reading
> `src/components/sort-select.tsx` and `sort-select-control.tsx` before writing
> anything. Build a small reusable client hook that intercepts a GET form's
> submit and does a Next.js client-side `router.push` instead of a native
> browser navigation (no full reload, `scroll: false`), wire it into the sort
> form only, and visually hide (not delete) the Apply button using this
> repo's existing `visually-hidden` pattern — it must stay reachable by
> keyboard and functional with JS off. Verify in an actual browser at
> `localhost:3000` (Network panel, no full navigation on sort change) before
> self-scoring. Do not touch the filter panel or add a page-size control —
> those are QOL-I. Self-score against `BUILD_PLAN.md` §6.

---

## Phase QOL-I — Live filter apply, configurable page size, de-duplicated "clear" controls — ✅ **COMPLETE 2026-07-20 (pushed, CI green)**

**Outcome:** the filter panel auto-applies on change (reusing QOL-H's soft-nav hook), the
Apply button and the duplicate Clear control are hidden when JS is on, and a configurable
page size (`PageSizeSelect`) is threaded through `queryPlans` + `buildQueryString` (`perPage`
now flows through page/chips/nav/sort). Keyboard/no-JS paths preserved.

**Scope:** `src/components/filter-panel.tsx`, `filter-chips.tsx`,
`src/app/page.tsx` (the catalog — file path may have moved to `src/app/browse/page.tsx`
if QOL-M has already shipped; check first), `src/lib/filters.ts`,
`src/lib/pagination.ts`, `src/lib/plans.ts` (`queryPlans`'s paging argument).
Depends on QOL-H's hook existing.

1. **Reuse QOL-H's soft-navigation hook on `FilterPanel`'s form.** Same
   mechanism, second call site — if it isn't cleanly reusable here, that's a
   sign QOL-H's hook needs a small API adjustment, not a reason to write a
   second one.
2. **Auto-apply per field, but not with one blanket rule — the input types
   behave differently:**
   - **Checkboxes** (difficulty, cost, tools-you-own): safe to auto-submit on
     every native `change` event. A checkbox toggle is one discrete action —
     it doesn't have the "stranded mid-scroll" failure mode a `<select>` has
     via arrow keys, which is specifically why `SortSelectControl` had to be
     pointer/touch-only.
   - **The two `<select>` fields** (Category, Time available): reuse
     `SortSelectControl`'s exact pointer-vs-keyboard detection pattern
     (`onKeyDown` flags "from keyboard," `onPointerDown` clears it, `onChange`
     submits only when the change didn't come from a key) — don't write a
     second implementation of the same logic. If this pattern is now used in
     3+ places (sort, category, time, and soon page-size below), extract it
     into one shared component instead of copy-pasting the hook body a third
     and fourth time.
   - Once every field auto-applies, "Apply filters" is visually redundant for
     the same reason sort's was — apply the same visually-hidden treatment
     from QOL-H (not delete), for the same accessibility reason.
3. **Guardrail — this runs against 948 plans, not the ~85 some docs still
   say.** Every auto-apply click/keystroke is now a live database round trip
   through `queryPlans()`. Before calling this done, actually check response
   time in the browser's Network panel against the real catalog size — don't
   guess it's fine. If it's slow, that's a query/index problem to name
   explicitly (don't paper over it silently). A short debounce (~150-250ms) on
   rapid checkbox clicking is reasonable defense regardless of what you find.
4. **Configurable page size.** Add a `perPage` GET param alongside the
   existing `page` param. **This is not a free-text field:**
   - A **fixed allowlist** of values only (recommend 12 / 24 / 48 / 96 — pick
     numbers that divide evenly into the existing 3/4/5-column card grid from
     Sprints 18/30a; confirm the actual column counts before finalizing the
     list rather than assuming these numbers).
   - A **hard server-side clamp** to that allowlist — never trust the query
     string, same doctrine as every other filter param in this codebase. An
     out-of-list or garbage value degrades to the current default, silently,
     same pattern as the existing `page` param's garbage-handling in
     `src/app/page.tsx`.
   - Render it as a `<select>` using the same pointer/touch auto-apply pattern
     as Category/Time (see above).
5. **De-duplicate the "clear" controls.** There are currently three doing two
   distinct jobs:
   - `FilterPanel`'s "Clear filters" link (`filter-panel.tsx`) and
     `FilterChips`' "Clear all filters" link (`filter-chips.tsx`) do the
     **identical** thing — clear filters, keep the search term — from two
     different components rendered on the page at once. That's duplication,
     not two features.
   - The catalog subtitle's "Clear all" link (`src/app/page.tsx`, the
     `isNarrowed` branch) does a **different** thing — clears everything,
     search included.
   - **Fix:** keep exactly one filters-only "Clear" control. Recommend
     keeping `FilterChips`' version (it only renders when a filter is
     actually active — `FilterPanel`'s renders unconditionally even with
     nothing to clear, which is the weaker of the two) and remove the
     duplicate from `FilterPanel`. Rename the subtitle's "Clear all" to
     something that doesn't collide in meaning with the filters-only control
     — e.g. "Clear search and filters."
6. **Not in scope:** the filter panel's drawer/layout behavior (QOL-A already
   built the mobile off-canvas drawer) — this phase only changes *when* and
   *how* the form submits and what the clear controls say, not its visual
   structure.

**Session prompt:**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-I only. Requires QOL-H's soft-navigation hook to already exist —
> if it doesn't, stop and say so rather than building a second one. Wire the
> hook into `filter-panel.tsx`'s form. Auto-submit checkboxes on every
> `change`; for the Category and Time `<select>` fields, reuse
> `SortSelectControl`'s pointer-vs-keyboard pattern exactly (extract to a
> shared component if reused 3+ times now). Hide (not delete) "Apply filters"
> the same way QOL-H hid sort's Apply. Add a `perPage` GET param with a fixed
> allowlist (confirm real grid column counts before picking the numbers) and a
> hard server-side clamp — never trust the query string. Consolidate the
> three "clear" controls (`filter-panel.tsx`, `filter-chips.tsx`,
> `src/app/page.tsx`'s subtitle) into exactly two: one filters-only "Clear
> filters" (keep `FilterChips`' conditional version, remove `FilterPanel`'s
> unconditional duplicate) and one "Clear search and filters" for the
> subtitle. Check actual filter-change response time in the browser's Network
> panel against the real ~948-plan catalog before calling this done — name
> any performance problem you find rather than ignoring it. Self-score
> against `BUILD_PLAN.md` §6.

---

## Phase QOL-J — Header nav position + sitewide search — ✅ **COMPLETE 2026-07-20 (pushed, CI green)**

**Outcome:** a compact desktop header search (`role=search` GET form, `Search` text button)
that works from any page, nav regrouped beside the logo with auth links to the right, and a
shared `CATALOG_PATH` constant (`src/lib/routes.ts`) introduced as the single seam for where
search/browse point — the same constant QOL-M later flipped to `/browse`.

**Scope:** `src/components/site-header.tsx`; a shared "where does search/
browse go" constant (new, small); `search-box.tsx` may be reused or adapted.

1. **Move the desktop nav to sit immediately after the logo.** Today's header
   is a `justify-between` row of three children (brand link, `<nav>`, right
   cluster) — that spacing rule is exactly what pushes the nav away from the
   logo toward the middle of the bar. **Fix:** group the brand link and the
   `<nav>` together as one flex item (e.g. wrap both in a single
   `<div className="flex items-center gap-...">`), then push the second group
   (new search box + `UserMenu`/hamburger) to the far right with `ml-auto` (or
   restructure to two `justify-between` pairs — either works, your call).
   Scope this to the desktop-only markup (`hidden lg:flex`); the mobile
   drawer is a separate tree and must not change.
2. **Add a search box to the desktop header, right side.** This is more than
   moving a div: `SearchBox` (`search-box.tsx`) today only renders on the
   catalog page and posts to `/` — a header-level search has to work from
   *every* page (About, a plan-detail page, Saved, a 404, etc.). Define the
   catalog/search destination **once**, as a single exported constant (this
   codebase already has this pattern for other nav-wide values, e.g.
   `NAV_CATEGORIES` in `src/lib/nav-categories.ts` — put the new constant
   somewhere equally central), and have the header's new search form target
   it. Decide whether the catalog page keeps its own inline search box too
   (recommend yes — a page-level label like "Search plans, tools,
   materials…" carries context the header's compact version won't, and
   having both isn't a conflict, just two entry points to the same query
   param) — note your reasoning either way rather than silently picking one.
3. **⚠️ Sequencing dependency — check this before hardcoding anything.** If
   QOL-M (the landing-page migration) has already shipped, the catalog lives
   at `/browse`, not `/`. Check `PUBLIC_ROUTES` (`src/lib/public-routes.ts`)
   and `site-header.tsx`'s own nav array for the current truth before writing
   the destination — and route through the shared constant from item 2 either
   way, so a later route rename doesn't require finding this again.
4. **Not in scope:** the Browse category mega-menu (QOL-D, already built and
   unaffected by this) and the mobile drawer's link structure (`mobile-nav.tsx`).

**Session prompt:**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-J only. In `src/components/site-header.tsx`'s desktop nav
> (`hidden lg:flex` block), group the brand link and the nav links into one
> left-aligned flex group, and add a search box on the far right of the same
> row (`ml-auto`), working from any page. Before hardcoding the search
> destination, check whether `QOL_UI_BUILD_PLAN.md` Phase QOL-M has already
> shipped — if the catalog now lives at `/browse` rather than `/`, target
> that. Either way, define the destination as one shared exported constant
> so it isn't hardcoded in two places. Do not touch the mobile drawer
> (`mobile-nav.tsx`) or the Browse category menu (`browse-menu.tsx`) — both
> stay exactly as they are. Self-score against `BUILD_PLAN.md` §6.

---

## Phase QOL-K — Page-width consistency + footer pinned to the bottom — ✅ **COMPLETE 2026-07-20 (pushed, CI green)**

**Outcome:** About/FAQ/Profile/Learning widened to the shared page-wide container for
consistent measure, and the body made a full-height flex column (`min-h-screen flex-col`, in
`layout.tsx`) so the footer sits at the bottom of the viewport on short pages instead of
leaving a band of raw background beneath it.

**Scope:** `src/app/about/page.tsx`, `faq/page.tsx`, `profile/page.tsx`,
`paths/page.tsx`, `paths/[slug]/page.tsx`, `src/app/layout.tsx`.

1. **Bring About, FAQ, Profile, and Learning to the existing `.page-wide`
   (64rem) treatment** already used by `saved/page.tsx` and `builds/page.tsx`
   — per the 2026-07-20 decision (widen, don't go edge-to-edge like the
   catalog). Concretely: change each of those five files' `<main>` from
   `className={page}` to `` className={`${page} page-wide`} ``, matching
   `saved/page.tsx`'s existing pattern exactly.
2. **Verify prose readability — don't just apply the class and move on.**
   About and FAQ are long-form text; a 64rem shell with paragraphs running
   its full width produces a long line length on a large monitor. Screenshot
   the rendered pages at a wide desktop viewport before calling this done. If
   body copy is genuinely harder to read edge-to-edge within the 64rem shell,
   constrain paragraph text specifically to a narrower inner column (e.g.
   wrap prose in a `max-w-[42rem]` div while the outer shell stays at 64rem)
   rather than reverting the page width. If it's a close call, screenshot
   both options and ask Keagan rather than deciding silently — this is
   exactly the kind of visual judgment call the standing rule at the top of
   this document means to catch.
3. **Footer pinned to the bottom of the viewport on short pages.** Root
   cause: `src/app/layout.tsx`'s `<body>` has no `min-height`/flex-column
   setup, so on a short page (e.g. `/builds` for an account with no builds
   yet) the footer sits directly under the sparse content instead of at the
   bottom of the viewport — the visible symptom is a gap of raw background
   below the footer. **Fix, scoped to one file:** give `<body>`
   `className="flex min-h-screen flex-col"` and wrap `{children}` in one
   `<div className="flex-1">{children}</div>`; keep `<SiteHeader />` and
   `<SiteFooter />` as direct siblings outside that div so neither gets
   stretched. No individual page file should need to change for this part.
   Verify on `/builds` with zero builds (short-content case) and on the
   catalog/home (tall-content case) to confirm no new gap or scroll issue
   either direction.
4. **Not in scope:** plan-detail's width (already `.page-wide.plan-detail` at
   84rem, untouched by the 2026-07-20 decision) and the catalog's own width
   (already `lg:max-w-none`, untouched).

**Session prompt:**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-K only. Apply the existing `page-wide` class (already used by
> `src/app/saved/page.tsx` and `builds/page.tsx`) to
> `src/app/about/page.tsx`, `faq/page.tsx`, `profile/page.tsx`,
> `paths/page.tsx`, and `paths/[slug]/page.tsx`. Screenshot About/FAQ at a
> wide desktop viewport and judge prose readability — if body text reads
> poorly at the full 64rem width, constrain the paragraph text to a narrower
> inner column instead of reverting the page width; if it's a close call,
> screenshot both and ask Keagan. Separately, fix the footer-not-pinned-to-
> bottom bug by making `<body>` a `flex min-h-screen flex-col` in
> `src/app/layout.tsx` and wrapping `{children}` in a `flex-1` div — verify
> on `/builds` with no builds (short page) and the catalog (tall page). Do
> not touch plan-detail's width or the catalog's width — both are already
> correct per the 2026-07-20 decision. Self-score against `BUILD_PLAN.md` §6.

---

## Phase QOL-L — Profile folds into a custom account modal — ✅ **COMPLETE 2026-07-20 (pushed, CI green)**

**Outcome (with a deviation from the original plan — logged in `DECISIONS_LOG.md` 2026-07-20):**
Clerk's `<UserButton.UserProfilePage>` is client-only and couldn't host our server-action
`WorkshopForm`, so instead of folding into Clerk's modal we built **our own** account modal —
a native `<dialog>` (`account-modal.tsx`, opened from `account-menu.tsx`) with account summary
(Clerk `useUser()`), the workshop tool picker (fetches the new **private** `GET /api/workshop`,
saves via `saveWorkshopModalAction` which returns a result rather than redirecting), theme +
install actions, and "Manage account & security" / "Sign out" deferred to Clerk. `/profile`
stays intact as the no-JS fallback. Same session-derived-owner security (no `userId` params).

**Scope:** `src/components/user-menu.tsx`, `src/app/profile/page.tsx`
(becomes a redirect), `src/components/workshop-form.tsx` (reused, not
rewritten).

1. **Today's split:** Clerk's own "Manage account" (opened from the
   `UserButton` dropdown) and this app's own `/profile` page (account summary
   + activity links + the Workshop tool picker, per QOL-D) are two separate
   destinations. Requested: fold `/profile`'s content into the same modal
   "Manage account" already opens, as additional left-nav sections inside
   that modal, not a second full-page destination.
2. **Confirm the API before building against it — do not assume.**
   `@clerk/nextjs` is `^6.12.0` (checked in `package.json` this session).
   Recent Clerk versions support custom pages inside the `UserButton`'s
   profile modal via `<UserButton.UserProfilePage>` (label + url + icon +
   children), rendered as additional entries in the modal's own left nav
   alongside Clerk's built-in tabs — which is the exact "sections separated
   by a left nav inside a popup" structure requested. **Verify this surface
   actually exists and behaves this way for the installed version via a live
   documentation check (`WebSearch`/Clerk's own docs), not from memory** —
   API surfaces shift between minor versions. If it doesn't work as expected,
   stop and report back rather than approximating a different structure and
   calling it done.
3. **Add the custom page(s)**, reusing `WorkshopForm` and the account/
   activity content from today's `profile/page.tsx` **unchanged** — same
   `saveWorkshopAction`, same session-derived-owner security posture (still
   no `userId` params anywhere; that doesn't change because the UI moved into
   a modal).
4. **`/profile` becomes a redirect**, following the exact precedent QOL-D
   already set for `/workshop → /profile#workshop` — don't hard-delete the
   route. Grep for existing links to `/profile` (at minimum
   `user-menu.tsx`'s own `UserButton.Link` and the plan-detail page's
   workshop prompts) and update them to open the modal directly instead of
   bouncing through a redirect where a direct link is possible.
5. **Verify inside the actual modal, not just in isolation.** Clerk's custom
   pages render inside Clerk's own modal/portal — confirm (a real interaction
   in the browser, screenshotted, not just a code read) that the Workshop
   form's checkboxes, its rate-limited submit, and any redirect-on-save
   behavior still work correctly in that context. A modal/portal can change
   focus handling and where a server action's redirect actually lands — if
   `saveWorkshopAction`'s current redirect target (e.g. a `?saved=1` query
   param on a full page) doesn't make sense inside a modal, say so rather
   than forcing the old pattern to fit.
6. **Not in scope:** any other Clerk-hosted screens (sign-in/sign-up pages,
   Clerk's built-in security settings tab) — those stay exactly as Clerk
   already renders them.

**Session prompt:**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-L only. First, verify via a live Clerk-docs check (not memory)
> that `@clerk/nextjs@^6.12.0`'s `UserButton.UserProfilePage` custom-pages API
> works the way this phase assumes (a left-nav entry inside the "Manage
> account" modal) — stop and report back if it doesn't. If confirmed, move
> `/profile`'s account summary, activity links, and `WorkshopForm` into one or
> more custom `UserButton.UserProfilePage` entries in
> `src/components/user-menu.tsx`, reusing `saveWorkshopAction` and every
> existing security property unchanged (no `userId` params). Turn
> `/profile/page.tsx` into a redirect, matching the existing `/workshop`
> redirect precedent, and update every existing link to `/profile` you find.
> Verify the Workshop form's submit/redirect behavior actually works inside
> Clerk's modal in a real browser session — don't assume it carries over
> unchanged. Self-score against `BUILD_PLAN.md` §6.

---

## Phase QOL-M — New landing page; catalog moves to `/browse` — ✅ **COMPLETE 2026-07-20 (pushed, CI green)**

**Outcome (all three steps + a hardening pass + a carousel fix, 2026-07-20):**

- **Step 1 — route migration.** The catalog moved to `src/app/browse/page.tsx`
  (+ `browse/loading.tsx`); `CATALOG_PATH` flipped to `/browse` and
  `buildQueryString` rebased on it, so pagination/chips/nav/clear followed for free.
  `public-routes.ts` gained `/browse(.*)`; the four catalog forms and every
  catalog-intent `href="/"` were repointed (brand/logo + "Home" stayed `/`). The PWA
  `start_url` stayed `/` (2026-07-20 decision). `/` became an interim redirect.
- **Step 2 — landing page.** Built the approved design at `src/app/page.tsx`: hero
  with a **real** showcase plan (its actual cut list + a real board count from the same
  `optimize()` the catalog uses), a Fraunces display heading font (self-hosted via
  `next/font`, no CSP hole), differentiators, how-it-works, a **featured carousel of real
  Trending plans**, a category carousel, who-it's-for, FAQ, and a dark closing CTA. One
  prominent primary CTA into `/browse`. Placeholder brand name only (branding #8 open);
  no fabricated data. `root-redirect.test.ts` repurposed into a landing render test.
- **Hardening pass (same day).** Audit of the QOL-A→M surfaces caught a real regression:
  eight `revalidatePath('/')` calls meant "the catalog" but `/` is now the landing —
  retargeted through `CATALOG_PATH` (`saves`/`likes`/`reviews` keep `/` for the landing's
  featured cards **and** add `/browse`; `workshop` retargets to `/browse`). Also: landing
  marquee loop-duplicates marked `inert` + `aria-hidden` (new `PlanCard decorative` prop)
  so they aren't a second tab stop / screen-reader echo; decorative SVGs `aria-hidden`.
- **Carousel seam fix (same day).** The trust + category marquees only rendered 2 copies,
  and one copy is narrower than a wide viewport, so the loop showed a gap and "jerked" on
  reset. Now each narrow marquee repeats enough (`MARQUEE_COPIES`) that a full screen of
  content always sits behind the loop point; the featured (wide) marquee uses fewer
  (`PLAN_MARQUEE_COPIES`); `--speed` scaled with the copy count to hold the visual speed.
  The category carousel scrolls the OPPOSITE direction to the featured one (`reverse`).

The original phase plan (steps, session prompts, inventory) is retained below as the
historical record of how it was executed.

---

**Scope: effectively sitewide.** This is the highest-blast-radius phase in
this document — it changes what `/` means everywhere that currently assumes
`/` is the catalog. Run it after QOL-H through QOL-L, once the smaller wins
have already shipped, per the 2026-07-20 decision recorded in
`DECISIONS_LOG.md`.

**This phase has three steps. Do not skip from Step 0 straight to code.**

### Step 0 — Content & structure proposal (Keagan's sign-off required before Step 1)

Keagan's own framing: a landing page "similar to ana-white" — featured plans,
what the site is, what sets it apart, who it serves, and a reason to look
further, with the explicit note that this "would need further clarification
and discussion." Treat that sentence as binding, not as color commentary.

1. Propose a section outline (e.g.: hero + a small set of featured/rotating
   plans; 3-4 "what makes this different" callouts — grounded in things that
   actually exist, like the cut-list/board-footage optimizer, tool-aware
   filtering, cost tiers, offline/print support — not invented claims; who
   it's for). **The landing page must carry a primary CTA into `/browse`**
   (2026-07-20 decision, `DECISIONS_LOG.md`) — this is the main path from
   marketing page to the actual product, not an optional nice-to-have, since
   the PWA's `start_url` is staying on the landing page rather than jumping
   straight to the catalog (see Step 1). A secondary CTA to sign-up is fine
   alongside it. This is a **starting point for discussion, not a final
   spec** — present it as such.
2. **Do not write final marketing copy.** Per the standing rule already
   established for About/FAQ (Sprint 23: "public copy is Keagan's to approve"
   — `BUILD_PLAN.md` §2), draft placeholder/skeleton copy at most, the same
   way Sprint 23 shipped About/FAQ as an explicit DRAFT rather than final. Any
   claim about "featured" plans, user counts, or comparisons to other sites
   needs to be either true today or clearly marked as a placeholder — nothing
   fabricated ships live.
3. Produce this as a static mockup or a short written proposal — Keagan's
   call which is more useful — and **wait for explicit sign-off before Step 1
   starts.** This mirrors exactly how QOL-F's mockup step preceded its
   rollout step.

### Step 1 — Route migration (after Step 0 sign-off)

The mechanical move: today's catalog (`src/app/page.tsx`) becomes
`src/app/browse/page.tsx` (and its `loading.tsx`), and everything that
currently assumes `/` is the catalog gets updated. **The list below is what a
single grep pass found this session — treat it as a confirmed starting
inventory, not as exhaustive; re-run the searches yourself, since the
codebase will have changed by the time you run this.**

- `src/lib/public-routes.ts` — the `/` entry's comment says "The catalog
  landing page." Add `/browse(.*)` as the new public catalog route; decide
  whether `/` (now the marketing page) also needs an entry (yes — it's
  public, no user data) with an updated comment.
- `public/manifest.webmanifest` — **decided 2026-07-20 (`DECISIONS_LOG.md`):
  `start_url` stays `/` (the new landing page), NOT `/browse`.** `scope`
  stays `/` regardless (it must cover both routes either way). This is why
  Step 0's landing page must carry a real, working CTA into `/browse` — an
  installed PWA opening to a marketing page with no obvious way into the
  actual catalog would be a dead end. Verify that CTA works before closing
  this step out.
- The offline service worker's cacheable-route policy
  (`public/sw-policy.js`) and its paired test
  (`tests/offline.test.ts`) — `/` is currently cached as public catalog
  content; after the move, `/browse` (plus its query-string variants for
  category/filter/sort/page) needs the same treatment, and `/` keeps it as
  the new marketing page (still public, still no user data).
- **Eleven files with a literal `href="/"`** found this session: `about`,
  `builds`, `dev/diagrams`, `faq`, `offline`, `page.tsx` itself,
  `plans/[slug]/page.tsx`, `profile`, `saved`, `shopping-list/page.tsx`, and
  `site-header.tsx` (the brand/logo link). **Do not blind find-and-replace
  these.** Open each one and judge intent: most mean "go to the catalog" and
  should become `/browse`; the header's brand-logo link most likely should
  stay `/` (logo-click-to-home is the standard convention, and "home" is now
  the landing page) — but confirm that's actually what's wanted rather than
  assuming.
- **Three forms with `action="/"`**: `filter-panel.tsx`, `search-box.tsx`,
  `sort-select.tsx`. All three need to target `/browse`. If QOL-H/QOL-I/QOL-J
  already shipped a shared destination constant (recommended in those
  phases' write-ups), this is a one-line change per file instead of three
  separate hardcoded edits — use it if it exists.
- `src/lib/nav-categories.ts`'s category links (used by `site-header.tsx`'s
  Browse menu) and `site-footer.tsx`'s `SITE_LINKS` — both currently build
  `href="/"` / `href="/?category=..."` and need the same update.
- `src/app/page.tsx`'s own `loading.tsx` sibling moves with it.
- Root layout (`src/app/layout.tsx`) metadata and the new `/browse`'s own
  metadata — decide whether each route should carry its own `title`/
  `description` now that they mean different things (marketing vs. catalog)
  rather than both inheriting the current single description.
- **Run the full test suite in a throwaway `/tmp` clone** (per `CLAUDE.md`'s
  sandbox rules — never against the mounted repo) after the move, not just a
  visual check. A route-level file move breaks any test that imports
  `src/app/page.tsx` directly or asserts against `/` as a route by path.

### Step 2 — Build the landing page (after Step 1 is verified working)

Build the approved (Step 0) content at the new `src/app/page.tsx`, using
real, already-existing data for anything presented as fact (e.g. "featured
plans" pulled from real `queryPlans()` results — recommend Trending or a
curated slug list, not a fabricated "staff picks" claim unless that's
something Keagan actually wants to curate). Reuse existing components where
they fit (`PlanCard` for any featured-plans grid) rather than building
parallel one-off markup.

**Not in scope for this phase:** any change to the actual catalog's filtering/
sorting behavior — QOL-H/I already own that, and this phase should only be
moving the file, not touching its internals.

**Session prompt (Step 0 — run this one first, alone):**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-M, Step 0 only. Propose a section outline and either a static
> mockup or a short written proposal for a new marketing landing page at `/`
> (ana-white-style: featured plans, what the site is, what sets it apart, who
> it's for, a CTA to browse/sign up) — grounded in features that actually
> exist in this codebase, not invented claims. Do not write final marketing
> copy or touch any live route. Present it and wait for Keagan's explicit
> sign-off before doing anything else in this phase.

**Session prompt (Step 1 — only after Step 0 is signed off):**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-M, Step 1 only. Move today's catalog from `src/app/page.tsx` to
> `src/app/browse/page.tsx` (with its `loading.tsx`). Re-run a fresh search
> for every place that assumes `/` is the catalog — `src/lib/public-routes.ts`,
> `public/manifest.webmanifest`, the service-worker policy
> (`public/sw-policy.js`) + `tests/offline.test.ts`, every literal `href="/"`
> across the codebase (found 11 files this session — re-check, don't trust
> that count), the three `action="/"` forms, `nav-categories.ts`, and
> `site-footer.tsx`. Judge each `href="/"` on its own merits — most should
> become `/browse`, but the header's logo link may legitimately stay `/`; ask
> if genuinely unsure. `start_url` in `public/manifest.webmanifest` stays `/`
> (decided 2026-07-20 — do not change it to `/browse`); `scope` stays `/`
> either way. Run the full test suite in a throwaway `/tmp` clone
> (`CLAUDE.md`'s sandbox rules) after the move, not just a visual check.
> Self-score against `BUILD_PLAN.md` §6 for this step alone.

**Session prompt (Step 2 — only after Step 1 is verified working):**
> Read `CLAUDE.md` and `BUILD_PLAN.md` first, then `QOL_UI_BUILD_PLAN.md`
> Phase QOL-M, Step 2 only. Build the approved landing-page content (from
> Step 0's signed-off proposal) at `src/app/page.tsx`. Use real data for
> anything presented as fact — pull any "featured plans" from an actual
> `queryPlans()` call, reuse `PlanCard` for any plans grid — do not fabricate
> numbers or claims. The page MUST include a working, prominent primary CTA
> into `/browse` — the PWA's `start_url` stays on this landing page (decided
> 2026-07-20), so this CTA is the main door into the actual catalog, not
> decoration. Do not touch the catalog's filtering/sorting internals at
> `/browse` — that belongs to QOL-H/I, not this phase. Screenshot the result
> at `localhost:3000/` on both desktop and mobile viewports, and click the
> `/browse` CTA to confirm it actually works, before self-scoring against
> `BUILD_PLAN.md` §6.

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

**Added 2026-07-20 — QOL-H through QOL-M, run in this order:**

QOL-H → QOL-I → QOL-J → QOL-K → QOL-L → QOL-M (Step 0, then Step 1, then Step
2, each gated on the previous). Reasoning: **H before I** because I reuses H's
soft-navigation hook and proving it once on the simpler sort form de-risks
reusing it on the heavier filter form. **I before J** is not a hard
dependency, but J's new header search box should point at whatever
`CATALOG_PATH`-style constant emerges from H/I's work rather than adding a
third hardcoded destination. **K is independent** of H/I/J and could run
anywhere in this range. **L is independent** and Clerk-API-specific — its
main risk is external (confirming the `UserButton.UserProfilePage` surface
actually behaves as expected), not sequencing. **M runs last, deliberately**
— it is the highest-blast-radius phase in this document (effectively
sitewide: routes, the service worker, the PWA manifest, ~11+ files with a
literal `href="/"`), and every other phase above should already be stable
before something this invasive starts. Running M first would also mean H/I/J
have to guess at a not-yet-real `/browse` path instead of building against
whichever URL is actually live at the time.
