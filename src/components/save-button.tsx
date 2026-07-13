import Link from 'next/link';
import { savePlanAction, unsavePlanAction } from '@/app/actions/saves';

interface Props {
  planId: string;
  slug: string;
  isSaved: boolean;
  isSignedIn: boolean;
}

/**
 * Save / unsave toggle — Sprint 6.
 *
 * A plain <form> posting to a server action. No client component, no useState,
 * no optimistic UI. It works with JavaScript disabled and on a bad connection,
 * which is where this app is actually used (BUSINESS_PLAN.md §5).
 *
 * FOR ANONYMOUS VISITORS it renders a link to sign-in, not a disabled button.
 * The plan page is public by design (§12 gates saves, not content), so a stranger
 * reaching this needs a door, not a wall. `?redirect_url` brings them back to the
 * plan they were looking at — losing their place would be the one thing
 * guaranteed to make them not sign up.
 */
export function SaveButton({ planId, slug, isSaved, isSignedIn }: Props) {
  if (!isSignedIn) {
    return (
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent(`/plans/${slug}`)}`}
        className="btn btn-primary"
      >
        Save this plan
      </Link>
    );
  }

  const action = isSaved ? unsavePlanAction : savePlanAction;

  return (
    <form action={action}>
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className={isSaved ? 'btn btn-ghost' : 'btn btn-primary'}
        aria-pressed={isSaved}
      >
        {isSaved ? '✓ Saved' : 'Save this plan'}
      </button>
    </form>
  );
}
