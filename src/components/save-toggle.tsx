'use client';

import Link from 'next/link';
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
  /**
   * QOL-B. Anonymous viewers get a sign-in LINK wearing the same icon, not a
   * disabled button — the plan page is public by design (§12 gates the save, not
   * the content) and a stranger reaching this needs a door, not a wall.
   *
   * Defaults to `true` because the catalog card only ever renders this component
   * for a signed-in viewer (plan-card.tsx), which is how it behaved before the
   * plan page started using it.
   */
  isSignedIn?: boolean;
  /**
   * Positioning, supplied by the call site. The default is the catalog card's
   * absolute overlay; the plan page passes its own so the icon sits in the header
   * row instead. Kept as a prop rather than a variant enum — there are two call
   * sites and they differ by nothing except where the box goes.
   */
  className?: string;
}

/**
 * The icon box itself — identical for the form button and the sign-in link.
 *
 * QOL-F (2026-07-19): the save is the one write on the catalog grid, so it gets the
 * clearest feedback of anything in this pass — the icon grows slightly under the pointer
 * and pops IN on press, then the server re-render swaps the glyph. Done with `:active`
 * rather than a JS-triggered keyframe (which is what the mockup showed) because a form
 * submit already re-renders this button: adding client state to animate something the
 * server is about to replace would be two sources of truth for one control's appearance.
 *
 * `scale`, not `transform` — Tailwind v4 emits it as its own property, so the transition
 * has to name it or nothing moves.
 */
const iconButton =
  'flex items-center justify-center w-[2.5rem] h-[2.5rem] border border-border rounded-[50%] bg-surface text-[0.9375rem] no-underline cursor-pointer shadow-e2 transition-[scale,box-shadow] duration-150 ease-[cubic-bezier(0.2,0.7,0.3,1)] hover:scale-105 hover:shadow-e3 active:scale-90 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';

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
 * QOL-B: this is now the plan-detail page's save control too, replacing the old
 * text `SaveButton` (deleted — a second component doing the same write, with its
 * own offline pre-cache call to keep in step, was a drift risk for no gain). The
 * only differences between the two call sites are POSITION and whether an
 * anonymous door is needed, so both are props.
 *
 * Still a plain <form> posting to a server action: **the save works with
 * JavaScript disabled.** The one thing JS adds is the Sprint 8 offline
 * pre-cache — you save at home on wifi and the plan is on your phone before you
 * reach the workshop — and if that fails you lose nothing but the early copy.
 */
export function SaveToggle({
  planId,
  slug,
  isSaved,
  returnTo,
  isSignedIn = true,
  className = 'absolute top-[0.5rem] right-[0.5rem] z-[1] m-0',
}: Props) {
  if (!isSignedIn) {
    return (
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent(`/plans/${slug}`)}`}
        className={`${className} ${iconButton}`}
        aria-label="Sign in to save this plan"
        title="Save this plan"
      >
        🏷️
      </Link>
    );
  }

  const action = isSaved ? unsavePlanAction : savePlanAction;

  return (
    <form
      action={action}
      className={className}
      onSubmit={() => {
        // Pre-cache on save, not on unsave. Fire-and-forget: the server action is
        // the thing that actually saves, and it is already on its way.
        if (!isSaved) cachePlanForOffline(slug);
      }}
    >
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="slug" value={slug} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <button
        type="submit"
        className={iconButton}
        aria-pressed={isSaved}
        aria-label={isSaved ? 'Remove from saved plans' : 'Save this plan'}
        title={isSaved ? 'Remove from saved plans' : 'Save this plan'}
      >
        {isSaved ? '🔖' : '🏷️'}
      </button>
    </form>
  );
}
