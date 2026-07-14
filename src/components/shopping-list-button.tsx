import Link from 'next/link';
import {
  addToShoppingListAction,
  removeFromShoppingListAction,
} from '@/app/actions/shopping-list';

interface Props {
  planId: string;
  slug: string;
  isOnList: boolean;
  isSignedIn: boolean;
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
export function ShoppingListButton({ planId, slug, isOnList, isSignedIn }: Props) {
  if (!isSignedIn) {
    return (
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent(`/plans/${slug}`)}`}
        className="btn btn-ghost"
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
      <button type="submit" className="btn btn-ghost" aria-pressed={isOnList}>
        {isOnList ? '✓ On shopping list' : 'Add to shopping list'}
      </button>
    </form>
  );
}
