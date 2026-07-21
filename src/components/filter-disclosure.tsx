'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { guardOpenDrawer } from '@/lib/drawer-guard';

/** Must match the `--desktop` breakpoint the catalog grid uses (Sprint 18). */
export const DESKTOP_QUERY = '(min-width: 64rem)';

interface Props {
  /** Number of active filters — drives the "(3)" badge and the initial open state. */
  count: number;
  children: ReactNode;
}

/**
 * The filter panel's <details> shell — Sprint 5's mobile collapse, Sprint 18's
 * desktop rail, and QOL-A's mobile off-canvas drawer.
 *
 * ── Desktop (≥64rem) is UNCHANGED by construction ────────────────────────────
 * Every class this component gained for the drawer is either mobile-only or has an
 * `lg:` counterpart restoring the previous value, and the effect that force-opens the
 * panel on desktop is the same one it has always had. The panel still sits inline in
 * its own right rail, opened, with the card chrome (surface/border/rounded) around it.
 *
 * ── Mobile (<64rem) is now a drawer ──────────────────────────────────────────
 * The summary is a small pill trigger (icon + label + count) instead of a full-width
 * bar, and the panel is an off-canvas sheet pinned to the right edge. Same
 * `<details>` mechanism as `MobileNav` and for the same reason: it opens and closes
 * WITHOUT JavaScript, so a no-JS visitor still reaches every filter. Nothing about the
 * form inside changed — it is still a plain GET form (filter-panel.tsx).
 *
 * PROGRESSIVE ENHANCEMENT, and it matters here: with JS off (or before hydration) the
 * summary is rendered and clickable at every width, so the filters remain reachable —
 * the panel is merely closed. The summary is therefore never hidden by CSS on desktop;
 * hiding it would turn "JS is off" into "the filters are gone".
 *
 * The scrim and the ✕ are rendered ONLY once `enhanced` is true (i.e. after mount).
 * They are the two affordances that need JS to do anything, and a scrim painted over a
 * no-JS page would cover the very trigger used to close the drawer — a dead overlay is
 * worse than no overlay.
 *
 * The media-query effect only ever FORCES OPEN. It does not force closed when the
 * viewport narrows, because by then the user may have closed the panel themselves and
 * reopening it would be the component overriding a deliberate choice.
 *
 * ── One deliberate behaviour change: `count > 0` no longer opens the panel ────
 * Sprint 5 opened the panel on load whenever filters were active, so you could see
 * WHICH ones. As an inline accordion that was helpful; as a drawer it would mean every
 * Apply bounces you back to a filtered catalog with a full-height overlay parked on top
 * of the results you just asked for — on the exact tap that was supposed to show them.
 * The information it existed to convey is now on the page anyway: the count rides in
 * the trigger, and FilterChips (2026-07-14) lists every active filter above the results
 * as removable chips. The cost is that a no-JS DESKTOP visitor with active filters now
 * starts with the rail collapsed rather than open — still one click away, never hidden.
 *
 * ── Sprint 39: it now behaves like the modal surface it looks like ───────────
 * Escape closes it and returns focus to the trigger, the page behind it goes `inert`
 * (so neither Tab nor a screen reader's virtual cursor can wander into results the user
 * cannot see), and the body stops scrolling underneath. All three live in `drawer-guard.ts`
 * and are applied ONLY while `enhanced && open && !desktop` — the desktop rail is a plain
 * inline panel and must never inert anything, and the no-JS path never runs any of it.
 *
 * `filters` CLASS RETAINED (re-added here): the print stylesheet hides the panel with
 * `.filters { display: none !important }`. Sprint 30b moved this chrome to utilities and
 * dropped the class, which silently orphaned that print rule — a printed catalog page
 * would have carried the whole filter form. Per the standing rule: any class named in an
 * `@media print` block must stay on its element.
 */
export function FilterDisclosure({ count, children }: Props) {
  const [open, setOpen] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setEnhanced(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);

    const openOnDesktop = () => {
      // Tracking `desktop` separately from `open` on purpose: the force-open below only
      // ever opens (see the file doc), but the drawer guard must switch OFF the moment
      // the viewport is wide enough that the panel is an inline rail again.
      setDesktop(media.matches);
      if (media.matches) setOpen(true);
    };

    openOnDesktop();
    media.addEventListener('change', openOnDesktop);
    return () => media.removeEventListener('change', openOnDesktop);
  }, []);

  /**
   * Sprint 39.3 — Escape, focus containment and the scroll lock, mobile-open only.
   *
   * `detailsRef` is the anchor rather than the drawer element itself so the `<summary>`
   * stays live: it is the drawer's own trigger, and Escape hands focus straight back to
   * it. Everything outside the `<details>` goes inert; see drawer-guard.ts for why the
   * walk goes up through siblings instead of inerting `<main>`.
   */
  useEffect(() => {
    if (!enhanced || !open || desktop) return;
    return guardOpenDrawer({
      anchor: detailsRef.current,
      root: document.body,
      keyTarget: document,
      scrollTarget: document.body,
      onEscape: () => {
        setOpen(false);
        summaryRef.current?.focus();
      },
    });
  }, [enhanced, open, desktop]);

  return (
    <details
      ref={detailsRef}
      className="filters mb-[0.75rem] lg:bg-surface lg:border lg:border-border lg:rounded-[0.5rem]"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      {/*
        Mobile: a horizontally-compact pill — narrow padding (px-[0.625rem]) keeps it from
        eating a band of viewport above the plans, but Sprint 34 (audit M1) restored the
        HEIGHT to 44px (2.75rem) and the text to 14px so it meets the app's touch-target
        rule; the pill stays visually small by being tight left-to-right, not short.
        Desktop: every value is (still) restored at `lg:` to the 44px / 16px / 1rem-padded row.
      */}
      <summary
        ref={summaryRef}
        className="list-none [&::-webkit-details-marker]:hidden inline-flex items-center gap-[0.375rem] min-h-[2.75rem] px-[0.625rem] text-[0.875rem] font-medium cursor-pointer select-none bg-surface border border-border rounded-[999px] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2 lg:flex lg:min-h-[2.75rem] lg:px-[1rem] lg:py-[0.75rem] lg:text-[1rem] lg:bg-transparent lg:border-0 lg:rounded-none lg:focus-visible:outline-offset-[-2px]"
      >
        {/* Decorative funnel — the label carries the meaning, so it is aria-hidden.
            Desktop keeps the plain text bar it has always had. */}
        <svg
          className="lg:hidden"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M1.5 2.5h13l-5 6v5l-3 1.5v-6.5z" />
        </svg>
        Filters{count > 0 ? ` (${count})` : ''}
      </summary>

      {/* Scrim: JS-only (see the file doc). Tapping it closes the drawer. */}
      {enhanced && open ? (
        <div
          className="fixed inset-0 z-30 bg-[rgba(0,0,0,0.45)] lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/*
        The drawer. Mobile: fixed to the right edge, its own scroll container.
        Desktop: `lg:static` puts it straight back into normal flow inside the rail
        card, with every mobile-only surface (width, border, shadow, padding) reset —
        so what desktop renders is a plain block wrapper around the same form.
      */}
      <div className="fixed inset-y-0 right-0 z-40 w-[min(20rem,88vw)] overflow-y-auto overscroll-contain bg-surface border-l border-border shadow-[-8px_0_24px_rgba(0,0,0,0.18)] pt-[0.5rem] pb-[calc(1rem+env(safe-area-inset-bottom))] lg:static lg:w-auto lg:overflow-y-visible lg:bg-transparent lg:border-l-0 lg:shadow-none lg:pt-0 lg:pb-0">
        {enhanced ? (
          <div className="flex justify-end px-[1rem] lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center min-h-[2.75rem] min-w-[2.75rem] bg-transparent border-0 text-fg text-[1rem] cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
              aria-label="Close filters"
            >
              &times;
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </details>
  );
}
