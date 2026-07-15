'use client';

import { savePlanAction, unsavePlanAction } from '@/app/actions/saves';
import { cachePlanForOffline } from '@/components/service-worker';

interface Props {
  planId: string;
  slug: string;
  isSaved: boolean;
  /**
   * Where a rate-limit denial bounces back to — the page this card sits on,
   * filters and all. Without it the denied redirect falls back to the plan's
   * detail page, which is not where the user was. Validated server-side
   * (attacker-controlled FormData) — see src/lib/rate-limit-feedback.ts.
   */
  returnTo?: string;
}

/**
 * Icon-only bookmark toggle overlaid on a catalog card — the mockup's "tap a
 * bookmark from the grid, no need to open the plan first" affordance.
 *
 * Deliberately a SIBLING of the card's `<Link>` in the DOM (see plan-card.tsx),
 * not a descendant of it. A `<button>` nested inside an `<a>` is invalid HTML
 * and produces a broken tab order for keyboard/screen-reader users. Being a
 * sibling means there's no click-bubbling-into-navigation to guard against
 * either — positioning this absolutely over the card image gets the mockup's
 * visual result without any of that.
 *
 * Only ever rendered for a SIGNED-IN viewer (see plan-card.tsx) — an anonymous
 * visitor gets no bookmark affordance on the grid, same as before this
 * component existed. The sign-in-and-redirect path already lives on the detail
 * page's `SaveButton` and isn't duplicated here.
 */
export function SaveToggle({ planId, slug, isSaved, returnTo }: Props) {
  const action = isSaved ? unsavePlanAction : savePlanAction;

  return (
    <form
      action={action}
      className="absolute top-[0.5rem] right-[0.5rem] z-[1] m-0"
      onSubmit={() => {
        if (!isSaved) cachePlanForOffline(slug);
      }}
    >
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="slug" value={slug} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <button
        type="submit"
        className="flex items-center justify-center w-[2.5rem] h-[2.5rem] border border-border rounded-[50%] bg-surface text-[0.9375rem] cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
        aria-pressed={isSaved}
        aria-label={isSaved ? 'Remove from saved plans' : 'Save this plan'}
      >
        {isSaved ? '🔖' : '🏷️'}
      </button>
    </form>
  );
}
