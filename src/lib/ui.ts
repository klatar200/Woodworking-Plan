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
const btnBase =
  'inline-flex items-center min-h-[2.75rem] px-[0.875rem] py-0 rounded-[0.375rem] text-[0.9375rem] font-medium no-underline cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed';

/** Bare `.btn` — transparent border, inherited text. Used where a caller sets its own look. */
export const btn = `${btnBase} border border-transparent`;

/** Formerly `.btn.btn-ghost` — outlined, ink text. The default nav/secondary button. */
export const btnGhost = `${btnBase} border border-border text-fg`;

/** Formerly `.btn.btn-primary` — solid ink fill, surface text, transparent border. One CTA per view. */
export const btnPrimary = `${btnBase} border border-transparent bg-fg text-surface`;

/** Formerly `.btn.btn-ghost.btn-danger` — ghost's ink border with error-red text. */
export const btnDanger = `${btnBase} border border-border text-err`;

/** Formerly `.btn.btn-ghost.btn-liked` — the "liked" state: ink border + ink text. */
export const btnLiked = `${btnBase} border border-fg text-fg`;

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
export const page =
  'page max-w-[40rem] mx-auto pt-[2rem] px-[1.25rem] pb-[calc(2rem+env(safe-area-inset-bottom))]';

/**
 * Text input, 44px tall / 16px font (small enough and iOS zooms the viewport on
 * focus). Formerly `.search-input`, reused by the catalog search box and the
 * "new collection" field on the saved page — hence shared. The focus ring matches
 * the buttons'. The `search-box` flex wrapper stays inline in `SearchBox` (used once).
 */
export const searchInput =
  'flex-auto min-w-0 min-h-[2.75rem] px-[0.875rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-1';

/**
 * The small uppercase category eyebrow. Formerly `.plan-card-category`, reused
 * verbatim on the catalog card, the plan-detail header, and the builds list —
 * hence a shared constant rather than three inline copies.
 */
export const categoryLabel =
  'inline-block text-[0.75rem] uppercase tracking-[0.06em] text-muted mb-[0.375rem]';
