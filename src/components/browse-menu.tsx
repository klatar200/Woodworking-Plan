'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface Props {
  /** The trigger's visible label — "Browse". */
  label: string;
  className?: string;
  summaryClassName: string;
  panelClassName: string;
  /** Server-rendered category links, passed straight through. */
  children: React.ReactNode;
}

/**
 * The "Browse" category menu — QOL-D item 1 (`DECISIONS_LOG.md` 2026-07-19).
 *
 * A native `<details>`, like every other disclosure here, so it opens with no
 * JavaScript. The links inside are SERVER-RENDERED and passed through `children`;
 * this island adds no markup and no data of its own, exactly the arrangement
 * `MobileNav` uses.
 *
 * CLOSING is the only part that needs JS, and it needs it for a specific reason: the
 * header persists across client-side navigation, so a tapped category link would leave
 * the panel hanging open over the new page. Two triggers close it —
 *
 *   1. `usePathname`, for any route change;
 *   2. a click anywhere in the panel, which is what actually covers this menu, because
 *      every link here is a QUERY-ONLY navigation (`/?category=furniture` from `/`).
 *      `usePathname` does not observe search params, and reading `useSearchParams`
 *      instead would force a Suspense boundary onto the statically-prerendered
 *      `/_not-found`, since this island sits in the always-rendered header.
 *
 * It deliberately shares the PATTERN with `MobileNav` rather than the code: the common
 * part is six lines of state, while the trigger, the panel geometry and the placement
 * differ entirely — a shared component would need a props bag larger than either
 * caller. The reasoning above is the thing that must not drift, so it is written out
 * in both places.
 */
export function BrowseMenu({
  label,
  className,
  summaryClassName,
  panelClassName,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <details
      className={className}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      {/* list-none kills the default marker; the ▾ is the affordance. */}
      <summary className={summaryClassName}>
        {label}
        <span aria-hidden="true" className="text-[0.7em]">
          &#9662;
        </span>
      </summary>

      <div className={panelClassName} onClick={() => setOpen(false)}>
        {children}
      </div>
    </details>
  );
}
