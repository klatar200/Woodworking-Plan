import Link from 'next/link';
import { Check } from 'lucide-react';
import {
  addToShoppingListAction,
  removeFromShoppingListAction,
} from '@/app/actions/shopping-list';
import { btnGhost } from '@/lib/ui'; // Sprint 29: shared button class

interface Props {
  planId: string;
  slug: string;
  isOnList: boolean;
  isSignedIn: boolean;
  /**
   * QOL-B — the call site's look. Defaults to the standalone ghost button it has
   * always been; the plan page passes `menuItem` because this now lives inside the
   * "…" overflow menu, where an outlined button would read as a control in a pile of
   * controls rather than a row in a menu. Presentation only — the form, the action,
   * and the `returnTo` are identical either way.
   */
  className?: string;
}

/**
 * Add / remove this plan on the shopping list — Sprint 22.
 *
 * A plain <form> posting to a server action, like every other write in this app — works
 * with JavaScript off, no client state. (Unlike SaveButton it needs no offline pre-cache,
 * so it is a server component.)
 *
 * For anonymous visitors it renders a sign-in link, not a disabled button: the plan page
 * is public by design (§12 gates participation, not content), so a stranger reaching this
 * needs a door, not a wall. `redirect_url` brings them back to the plan afterward.
 *
 * `returnTo` is submitted so a rate-limited denial bounces back HERE (to the plan) with
 * the slow-down notice, rather than to the site root — see denialTarget / safeReturnTo.
 */
export function ShoppingListButton({
  planId,
  slug,
  isOnList,
  isSignedIn,
  className = btnGhost,
}: Props) {
  if (!isSignedIn) {
    return (
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent(`/plans/${slug}`)}`}
        className={className}
      >
        Add to shopping list
      </Link>
    );
  }

  const action = isOnList ? removeFromShoppingListAction : addToShoppingListAction;

  return (
    <form action={action}>
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="returnTo" value={`/plans/${slug}`} />
      <button
        type="submit"
        className={`${className} gap-[0.35rem]`}
        aria-pressed={isOnList}
      >
        {isOnList ? (
          <>
            <Check size={15} aria-hidden="true" /> On shopping list
          </>
        ) : (
          'Add to shopping list'
        )}
      </button>
    </form>
  );
}
