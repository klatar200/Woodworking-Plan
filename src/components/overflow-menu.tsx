import type { ReactNode } from 'react';

interface Props {
  /** Accessible name for the trigger — e.g. "More actions for this plan". */
  label: string;
  children: ReactNode;
}

/**
 * The "…" overflow menu — QOL-B item 3.
 *
 * A native `<details>`, not a JS dropdown. Same reasoning as `FilterDisclosure`,
 * `MobileNav` and `InstructionsDisclosure`: it opens and closes with no JavaScript,
 * gets correct keyboard and screen-reader behaviour for free, and cannot end up in a
 * state where the menu exists but nothing can open it. A hand-rolled dropdown would
 * cost more code for strictly less.
 *
 * NO CLIENT COMPONENT AT ALL, deliberately — which means no click-outside-to-close.
 * The trade is worth it: the menu holds two navigational items (Print, shopping list),
 * both of which navigate away and therefore close it by leaving the page, and a stray
 * open menu costs a second click at most. Buying outside-click for that would turn a
 * server component into a hydrated island on every plan page.
 *
 * PRINT: this lives inside `.plan-actions`, which the print stylesheet hides by class,
 * so nothing here reaches paper whether it was open or shut.
 */
export function OverflowMenu({ label, children }: Props) {
  return (
    <details className="relative">
      {/* list-none kills the default marker; the ⋯ is the affordance. 44px target. */}
      <summary
        className="list-none [&::-webkit-details-marker]:hidden inline-flex items-center justify-center min-h-[2.75rem] min-w-[2.75rem] px-[0.5rem] text-[1.25rem] leading-none text-fg bg-transparent border border-border rounded-[0.375rem] cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
        aria-label={label}
        title={label}
      >
        <span aria-hidden="true">&hellip;</span>
      </summary>

      {/* Right-aligned so the panel never runs off the edge of a phone: the trigger is
          the last item in the actions row, so the panel grows leftward from it. */}
      <div className="absolute top-full right-0 z-20 mt-[0.25rem] min-w-[15rem] flex flex-col gap-[0.375rem] p-[0.5rem] bg-surface border border-border rounded-[0.5rem] shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
        {children}
      </div>
    </details>
  );
}
