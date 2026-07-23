'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

interface Props {
  /** The trigger's visible label — "Browse". */
  label: string;
  className?: string;
  summaryClassName: string;
  panelClassName: string;
  /**
   * Desktop hover-open enhancement — Sprint 46 (Workstream B).
   *
   * Only the DESKTOP header menu passes this. The mobile drawer copy leaves it off and
   * stays pure tap `<details>`: hover is not a phone affordance, and the drawer's own
   * "don't close on a <summary> tap" wiring (MobileNav) must keep working untouched.
   */
  hoverEnabled?: boolean;
  /** Server-rendered category links, passed straight through. */
  children: React.ReactNode;
}

/** Hover-open only on a real pointer AND a desktop viewport — matches the `lg` breakpoint
 *  the header nav uses, so it can never fire while the mobile drawer copy is the one on
 *  screen. `(hover: hover)` keeps it off touch devices, mirroring how `hover:` utilities
 *  compile inside `@media (hover:hover)` (DESIGN_BRIEF.md §3). */
const DESKTOP_HOVER_QUERY = '(hover: hover) and (min-width: 64rem)';
/** A small grace period on pointer-leave so the cursor can cross the gap between the
 *  trigger and the panel without the menu flickering shut. */
const CLOSE_GRACE_MS = 150;

/**
 * The "Browse" category menu — QOL-D item 1 (`DECISIONS_LOG.md` 2026-07-19), with
 * Sprint 46's desktop hover-open (Workstream B).
 *
 * A native `<details>`, like every other disclosure here, so it opens with NO JavaScript —
 * a no-JS desktop visitor still gets click-to-open, which the brief accepts as the
 * fallback. The links inside are SERVER-RENDERED and passed through `children`; this island
 * adds no markup and no data of its own, exactly the arrangement `MobileNav` uses.
 *
 * TWO things need JS, and only after mount:
 *
 *   1. CLOSING on navigation — the header persists across client-side navigation, so a
 *      tapped category link would leave the panel hanging open over the new page. Two
 *      triggers close it: `usePathname` (any route change), and a click anywhere in the
 *      panel (every link here is a QUERY-ONLY navigation — `/?category=furniture` from `/`
 *      — which `usePathname` does not observe, and reading `useSearchParams` would force a
 *      Suspense boundary onto the statically-prerendered `/_not-found`).
 *
 *   2. HOVER-OPEN on desktop (`hoverEnabled`) — pointer-enter opens, pointer-leave closes
 *      after a grace delay. Gated behind `DESKTOP_HOVER_QUERY` evaluated after mount, so on
 *      touch / below `lg` the pointer handlers are simply absent and the native tap
 *      behaviour is exactly as before. Click and keyboard activation still toggle the
 *      `<details>` natively (so `aria-expanded`, which a `<summary>` reflects from the
 *      `open` state, stays accurate), and Esc dismisses the JS-enhanced menu.
 *
 * It deliberately shares the PATTERN with `MobileNav` rather than the code: the trigger,
 * the panel geometry and the placement differ entirely.
 */
export function BrowseMenu({
  label,
  className,
  summaryClassName,
  panelClassName,
  hoverEnabled = false,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);
  const pathname = usePathname();
  const summaryRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Turn hover on only for a desktop pointer device, and re-evaluate on viewport change so
  // rotating a hybrid device to a narrow width drops back to tap. Runs after mount, so SSR
  // and no-JS never attach pointer handlers (progressive enhancement).
  useEffect(() => {
    if (!hoverEnabled) return;
    const media = window.matchMedia(DESKTOP_HOVER_QUERY);
    const sync = () => setHoverActive(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [hoverEnabled]);

  const clearCloseTimer = () => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  // Never leave a timer running past unmount.
  useEffect(() => clearCloseTimer, []);

  const openNow = () => {
    clearCloseTimer();
    setOpen(true);
  };
  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_GRACE_MS);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDetailsElement>) => {
    // Esc dismisses the JS-enhanced menu and returns focus to the trigger. Native
    // <details> gives no keyboard close, so this is the a11y escape hatch the brief asks
    // for; it is a no-op when the menu is already closed.
    if (event.key === 'Escape' && open) {
      clearCloseTimer();
      setOpen(false);
      summaryRef.current?.focus();
    }
  };

  // Pointer handlers exist ONLY when hover is active (desktop pointer). On touch / below
  // lg they are absent, so tap-to-open through the native <details> is untouched.
  const hoverProps = hoverActive
    ? { onPointerEnter: openNow, onPointerLeave: scheduleClose }
    : {};

  return (
    <details
      className={className}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onKeyDown={handleKeyDown}
      {...hoverProps}
    >
      {/* list-none kills the default marker; the ▾ is the affordance. */}
      <summary ref={summaryRef} className={summaryClassName}>
        {label}
        <span aria-hidden="true" className="text-[0.7em]">
          &#9662;
        </span>
      </summary>

      <div
        className={panelClassName}
        onClick={() => setOpen(false)}
        // Cancel a pending close when the cursor reaches the panel — this covers the small
        // gap between the trigger and the panel, where pointer-leave on the <details> would
        // otherwise have already scheduled the close.
        onPointerEnter={hoverActive ? clearCloseTimer : undefined}
      >
        {children}
      </div>
    </details>
  );
}
