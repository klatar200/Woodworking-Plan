'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * The mobile drawer — 2026-07-16 (Keagan: "a mobile navbar that opens a drawer").
 *
 * Visible below `lg`; the desktop nav is a plain inline row (site-header.tsx).
 * Built on a native `<details>`, the same pattern as FilterDisclosure and for
 * the same reason: it opens and closes WITHOUT JavaScript, so no-JS visitors
 * still have navigation. The links themselves are server-rendered — they come
 * in through `children` from the server-component header, so this island adds
 * no data or markup of its own.
 *
 * The one thing that needs JS: with client-side routing the header persists
 * across navigations, so a tapped link would leave the drawer hanging open
 * over the new page. `usePathname` closes it whenever the route changes. The
 * `open` state is otherwise uncontrolled-in-spirit — `onToggle` mirrors native
 * toggles back into state, so the two never fight.
 */
export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <details
      className="lg:hidden"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      {/* list-none kills the default marker; the ☰ is the affordance. */}
      <summary
        className="list-none [&::-webkit-details-marker]:hidden inline-flex items-center justify-center min-h-[2.75rem] min-w-[2.75rem] px-[0.625rem] border border-border rounded-[0.375rem] cursor-pointer text-[1.125rem] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
        aria-label="Menu"
      >
        ☰
      </summary>

      {/* The drawer: a full-width panel pinned under the (sticky) header. The
          header is the containing block, so top-full lands exactly on its
          bottom edge whatever height the header wrapped to. */}
      <div className="absolute top-full left-0 right-0 z-20 flex flex-col gap-[0.125rem] p-[0.75rem] bg-surface border-b border-border shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-h-[calc(100vh-4rem)] overflow-y-auto">
        {children}
      </div>
    </details>
  );
}
