/**
 * Shared Tailwind class strings — Sprint 29 (UI migration, wave 1).
 *
 * These are the classes that appeared many times as hand-written CSS
 * (`.btn`/`.btn-*` alone was used ~80 times across 17 files) and would drift if
 * the utility string were copy-pasted into each call site. Centralising them
 * keeps ONE source of truth to get right — the strings below were verified to
 * compile to byte-identical CSS against the deleted `globals.css` rules (see
 * SPRINT_LOG.md Sprint 29 for the declaration-level diff).
 *
 * These are plain utility classes, not a component abstraction: no variants
 * engine, no `clsx`, nothing to learn. Compose with a template literal when a
 * call site needs extra utilities, e.g. `` `${btnGhost} w-full` ``.
 *
 * Arbitrary values (`px-[0.875rem]`) are used deliberately over the nearest
 * spacing-scale token so the emitted CSS matches the old rule exactly — this
 * sprint's acceptance bar is pixel-parity, not idiomatic rounding.
 */

/**
 * Base button (everything EXCEPT the border and text color). Formerly the shared
 * bits of `.btn`. 44px min touch target (phones, gloves, sawdust) and the shared
 * focus-visible ring. The `disabled:` styles fold in the old
 * `.step-walker-nav .btn:disabled` rule — step-walker's Prev/Next are the only
 * buttons that are ever `disabled`, so this is identical in practice and no
 * longer needs a component-scoped selector.
 *
 * The `border` and text/background COLOR live on each variant, never here, on
 * purpose: Tailwind emits same-property utilities in a fixed source order, not
 * className order, so a base `border-transparent` would beat a variant's
 * `border-border` (they are both `border-color`) and silently erase the ghost
 * outline. Giving every variant its own single border-color + text-color avoids
 * that entirely.
 */
// 2026-07-16: `whitespace-nowrap` added — a button label that wraps mid-phrase
// ("Log\nin", "Add to shopping\nlist") on a narrow phone reads broken; buttons
// shrink by dropping to the next flex row, never by folding their own label.
/**
 * QOL-F (2026-07-19, variant A) — PRESS FEEDBACK, and it lives on every button on
 * purpose.
 *
 * This is the one motion change applied globally rather than per-surface, because it is
 * the cheapest "this is a real control" signal there is: the button settles 1px on
 * `:active` and its shadow collapses, so a press looks like it lands. Two properties,
 * no JavaScript, no layout shift (`translate` does not reflow), and it is the piece of
 * variant B that survived the A/B call because it never cost anything.
 *
 * `:active` — deliberately NOT `:hover`. Tailwind compiles `hover:` inside
 * `@media (hover: hover)`, so a hover-based effect does nothing on a phone; `active:`
 * has no such guard and fires on touch, which is where most of these taps happen.
 *
 * TRANSITION `translate`, NOT `transform`. Tailwind v4 emits `translate:` / `scale:` as
 * their own properties, so `transition-[transform,…]` would animate nothing — verified
 * by compiling with the real toolchain, not assumed.
 *
 * `motion-reduce:` returns it to a plain state change (WCAG 2.3.3), matching the house
 * rule already used by the skeletons and the FAQ accordion.
 */
const btnPress =
  'transition-[translate,box-shadow] duration-150 ease-[cubic-bezier(0.2,0.7,0.3,1)] active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0';

const btnBase =
  `inline-flex items-center min-h-[2.75rem] px-[0.875rem] py-0 rounded-[0.375rem] text-[0.9375rem] font-medium whitespace-nowrap no-underline cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${btnPress}`;

// 2026-07-16: every non-primary variant carries an explicit `bg-transparent`. globals.css
// excludes Tailwind preflight and has no `button` reset, so a bare `<button>` kept the UA
// default `ButtonFace` fill — invisible in dark mode (measured ≈1.0:1: near-white fill under
// near-white text). `bg-transparent` can't live on `btnBase` because it and `btnPrimary`'s
// `bg-fg` are the same property and Tailwind emits them in fixed source order, not className
// order (the documented gotcha) — so each variant declares exactly one background, mirroring
// the border-color/text-color pattern above.

/** Bare `.btn` — transparent fill + border, inherited text. Used where a caller sets its own look. */
export const btn = `${btnBase} border border-transparent bg-transparent`;

/** Formerly `.btn.btn-ghost` — outlined, ink text. The default nav/secondary button. */
export const btnGhost = `${btnBase} border border-border bg-transparent text-fg`;

/**
 * Formerly `.btn.btn-primary` — solid ink fill, surface text, transparent border. One CTA
 * per view.
 *
 * QOL-F: the primary CTA is the ONE button that also carries elevation — it is the thing
 * the page wants you to press, and a raised surface says that without another colour or a
 * size increase. Ghost/danger/liked stay flat: if everything is elevated, nothing is.
 */
export const btnPrimary = `${btnBase} border border-transparent bg-fg text-surface shadow-e2 hover:shadow-e3 active:shadow-e1`;

/** Formerly `.btn.btn-ghost.btn-danger` — ghost's ink border with error-red text. */
export const btnDanger = `${btnBase} border border-border bg-transparent text-err`;

/** Formerly `.btn.btn-ghost.btn-liked` — the "liked" state: ink border + ink text. */
export const btnLiked = `${btnBase} border border-fg bg-transparent text-fg`;

/**
 * QOL-B — a row inside the plan page's "…" overflow menu (`overflow-menu.tsx`).
 *
 * Deliberately NOT `btnGhost`: five outlined buttons stacked in a 15rem panel read as a
 * pile of controls, not a menu. Same 44px target and same focus ring as every other
 * control; borderless, full-width, left-aligned, with a hover tint. Written out rather
 * than composed from `btnBase` because it differs in four of `btnBase`'s own properties
 * (width, alignment, padding, border) and overriding four same-property utilities would
 * need four `!important`s — the source-order gotcha again.
 */
export const menuItem =
  'inline-flex items-center w-full min-h-[2.75rem] px-[0.75rem] py-0 rounded-[0.375rem] text-[0.9375rem] font-medium whitespace-nowrap no-underline cursor-pointer text-fg bg-transparent border border-transparent hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';

/*
 * DELETED Sprint 41.2 (audit V4): `compactOnMobile`, a QOL-A mobile-only override that
 * shrank a trigger button to 36px. Sprint 39 rebuilt the sort control and left it with
 * zero call sites — so what remained was a shared constant whose only content was six
 * `!important` utilities carrying the last sub-44px value in the file, sitting one
 * import away from any button. Dead code that contradicts a live rule is worse than
 * dead code. `tests/touch-targets.test.ts` now asserts it stays gone.
 */

/**
 * The mobile-first page container. Formerly the base `.page` rule.
 *
 * The literal `page` class is RETAINED (not just its utilities) because rules
 * that are out of scope for this migration still target it by class: the print
 * stylesheet (`.page { max-width: none; padding: 0 }`) and the desktop
 * width modifiers (`.page-wide`, `.page-catalog`). Those live unlayered in
 * `globals.css`, so they still override these layered utilities exactly as
 * before. Compose width modifiers as plain strings, e.g.
 * `` `${page} page-wide` `` or `` `${page} page-catalog` ``.
 */
// 2026-07-16: `lg:px-[2.5rem]` added — 1.25rem edge padding is right for a phone
// but reads as content glued to the window edge once the wider desktop shells
// (full-width catalog, 84rem plan detail) actually reach the viewport edges.
// The print rule (`.page { padding: 0 }`) is unlayered and still wins on paper.
export const page =
  'page max-w-[40rem] mx-auto pt-[2rem] px-[1.25rem] lg:px-[2.5rem] pb-[calc(2rem+env(safe-area-inset-bottom))]';

/**
 * Text input, 44px tall / 16px font (small enough and iOS zooms the viewport on
 * focus). Formerly `.search-input`, reused by the catalog search box and the
 * "new collection" field on the saved page — hence shared. The focus ring matches
 * the buttons'. The `search-box` flex wrapper stays inline in `SearchBox` (used once).
 */
export const searchInput =
  'flex-auto min-w-0 min-h-[2.75rem] px-[0.875rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-1';

/**
 * A `<select>` control (44px tall, 16px font so iOS doesn't zoom on focus). Formerly
 * `.filter-group select` / `.sort-form select` / `.inline-form select` / `.scope-form
 * select` — one shared rule. Add `w-full` where the original did (the filter panel).
 */
export const selectControl =
  'min-h-[2.75rem] px-[0.75rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem]';

/**
 * A filter checkbox pill (Sprint 5) — formerly `.checkbox`. The checked/focus styling
 * uses `:has()` on the nested input, which out-specifies the base so class order is safe.
 * Reused by the filter panel and the workshop screen.
 */
// When checked, the pill fills with --accent — its text goes to --accent-fg, the
// on-accent token. Since the 2026-07-24 dark re-palette --accent-fg is cream on a green
// --accent in BOTH themes (forest in light, deep emerald in dark), so this class string
// needs no per-theme handling.
export const checkbox =
  'inline-flex items-center gap-[0.4375rem] min-h-[2.75rem] py-0 pr-[0.75rem] pl-[0.625rem] border border-border rounded-[999px] text-[0.875rem] cursor-pointer has-[input:checked]:border-fg has-[input:checked]:bg-accent has-[input:checked]:text-accent-fg has-[input:checked]:font-bold has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-ok has-[input:focus-visible]:outline-offset-2';

/** The `<input>` inside a `.checkbox` pill — formerly `.checkbox input`. */
export const checkboxInput = 'm-0 accent-[var(--fg)]';

/**
 * A pill chip. Formerly `.chip` (+ `.chip-active`), reused by the collection tabs and the
 * active-filter chips. `chip` is the resting state; `chipActive` the selected one — they're
 * rendered as alternatives, so there's no same-element color conflict.
 */
// Text color lives per-state (not in the base) so the active chip's text can be
// `text-accent-fg` on the accent fill (cream on the green accent in both themes since the
// 2026-07-24 dark re-palette — see `checkbox` above), while the resting chip uses `text-fg`.
const chipBase =
  'inline-flex items-center gap-[0.25rem] min-h-[2.75rem] px-[0.875rem] border rounded-[999px] text-[0.875rem] no-underline focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';
export const chip = `${chipBase} border-border text-fg`;
export const chipActive = `${chipBase} border-fg bg-accent font-bold text-accent-fg`;

/**
 * The small uppercase category eyebrow. Formerly `.plan-card-category`, reused
 * verbatim on the catalog card, the plan-detail header, and the builds list —
 * hence a shared constant rather than three inline copies.
 */
export const categoryLabel =
  'inline-block text-[0.75rem] uppercase tracking-[0.06em] text-muted mb-[0.375rem]';
