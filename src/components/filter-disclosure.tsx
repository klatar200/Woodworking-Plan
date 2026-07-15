'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Must match the `--desktop` breakpoint the catalog grid uses in globals.css. */
export const DESKTOP_QUERY = '(min-width: 64rem)';

interface Props {
  /** Number of active filters — drives the "(3)" badge and the initial open state. */
  count: number;
  children: ReactNode;
}

/**
 * The filter panel's <details> shell — Sprint 5's mobile collapse, plus Sprint 18's
 * desktop behaviour.
 *
 * On a phone the panel stays COLLAPSED unless filters are active: five filter groups
 * and thirty tool checkboxes above the results would bury the plans, and the plans are
 * what people came for. On desktop the panel lives in its own right rail where nothing
 * is buried, so a collapsed accordion there is just an extra click for no benefit — it
 * opens.
 *
 * Why JS at all, on a page that is otherwise entirely GET forms and links: viewport is
 * not something the server knows. It could be faked with `open` + a CSS override, but
 * `::details-content` is the only reliable way to reveal a closed <details> and its
 * browser support is too new to bet the filter UI on.
 *
 * PROGRESSIVE ENHANCEMENT, and it matters here: with JS off (or before hydration) the
 * summary is still rendered and still clickable at every width, so the filters remain
 * reachable — the panel is merely closed. The summary is therefore never hidden by CSS
 * on desktop; hiding it would turn "JS is off" into "the filters are gone".
 *
 * The effect only ever FORCES OPEN. It does not force closed when the viewport narrows,
 * because by then the user may have closed the panel themselves and reopening it would
 * be the component overriding a deliberate choice.
 */
export function FilterDisclosure({ count, children }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);

    const openOnDesktop = () => {
      if (media.matches && ref.current) ref.current.open = true;
    };

    openOnDesktop();
    media.addEventListener('change', openOnDesktop);
    return () => media.removeEventListener('change', openOnDesktop);
  }, []);

  return (
    <details
      ref={ref}
      className="bg-surface border border-border rounded-[0.5rem] mb-[0.75rem]"
      open={count > 0}
    >
      <summary className="px-[1rem] py-[0.75rem] cursor-pointer font-medium min-h-[2.75rem] flex items-center focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-[-2px]">
        Filters{count > 0 ? ` (${count})` : ''}
      </summary>
      {children}
    </details>
  );
}
