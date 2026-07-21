'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

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
 * Closing needs JS: with client-side routing the header persists across
 * navigations, so a tapped link would leave the drawer hanging open over the
 * new page. Two triggers close it:
 *   1. `usePathname` — closes on any route change (covers programmatic nav).
 *   2. a click anywhere in the panel — its contents are links and the install item,
 *      so a tap that navigates also closes the drawer. This is what covers a
 *      QUERY-ONLY change: tapping "Home" from a filtered catalog (`/?tools=…`)
 *      changes only the search params, which `usePathname` does NOT observe.
 *      (Reading `useSearchParams` here instead would force a Suspense boundary on
 *      the statically-prerendered /_not-found, since this island lives in the
 *      always-rendered header.)
 *
 *      ⚠️ EXCEPT A `<summary>` (QOL-D). The drawer now contains a nested disclosure
 *      — the "Browse by category" section — and "close on any click inside" would
 *      shut the whole drawer the instant someone tried to expand it. A tap on a
 *      summary toggles a section; it does not navigate, so it must not close the
 *      drawer. Anything else inside still does.
 * The `open` state is otherwise uncontrolled-in-spirit — `onToggle` mirrors
 * native toggles back into state, so the two never fight.
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
      {/* list-none kills the default marker; the menu icon is the affordance. */}
      <summary
        className="list-none [&::-webkit-details-marker]:hidden inline-flex items-center justify-center min-h-[2.75rem] min-w-[2.75rem] px-[0.625rem] border border-border rounded-[0.375rem] cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
        aria-label="Menu"
      >
        <Menu size={22} aria-hidden="true" />
      </summary>

      {/* The drawer: a full-width panel pinned under the (sticky) header. The
          header is the containing block, so top-full lands exactly on its
          bottom edge whatever height the header wrapped to. onClick closes the
          drawer on any tap inside it — including a query-only navigation. */}
      <div
        className="absolute top-full left-0 right-0 z-20 flex flex-col gap-[0.125rem] p-[0.75rem] bg-surface border-b border-border shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-h-[calc(100vh-4rem)] overflow-y-auto"
        onClick={(event) => {
          // A summary toggles a nested section (Browse by category); everything else
          // in here navigates. See the note in the file doc.
          const target = event.target as HTMLElement;
          if (target.closest('summary')) return;
          // Sprint 36 (audit H11): the drawer now hosts a search field. Tapping the input to
          // type must NOT close the drawer — only exempt the field itself; the "Search" submit
          // button is not an input, so it still closes the drawer AND navigates (which is what
          // makes a query-only search from /browse close it, since usePathname won't change).
          if (target.closest('input, select, textarea, label')) return;
          // Sprint 37 (audit D1): the drawer now hosts the theme toggle, which is a
          // PREFERENCE, not a navigation — closing on it would hide the very surface
          // showing the result, and make toggling back a two-tap trip. Staying open lets
          // the drawer itself re-theme, which is the fastest confirmation there is.
          if (target.closest('[data-theme-toggle]')) return;
          setOpen(false);
        }}
      >
        {children}
      </div>
    </details>
  );
}
