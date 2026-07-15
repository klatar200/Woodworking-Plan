import Link from 'next/link';
import { likePlanAction, unlikePlanAction } from '@/app/actions/likes';
import { btnGhost, btnLiked } from '@/lib/ui'; // Sprint 29: shared button classes

interface Props {
  planId: string;
  slug: string;
  isLiked: boolean;
  likeCount: number;
  isSignedIn: boolean;
}

/**
 * Like / unlike toggle — Sprint 7.
 *
 * A plain <form> posting to a server action. No client component, no optimistic
 * UI, works with JavaScript off.
 *
 * The COUNT IS ALWAYS SHOWN, including to anonymous visitors and including when
 * it is zero. BUSINESS_PLAN.md §4.7 exists so community signal is visible; hiding
 * a zero would hide exactly the plans that most need someone to be first.
 *
 * Anonymous visitors get a link to sign-in, not a disabled button — the plan page
 * is public by design, and a stranger reaching this needs a door, not a wall.
 */
export function LikeButton({ planId, slug, isLiked, likeCount, isSignedIn }: Props) {
  const label = `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`;

  if (!isSignedIn) {
    return (
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent(`/plans/${slug}`)}`}
        className={btnGhost}
      >
        ♡ {label}
      </Link>
    );
  }

  const action = isLiked ? unlikePlanAction : likePlanAction;

  return (
    <form action={action}>
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className={isLiked ? btnLiked : btnGhost}
        aria-pressed={isLiked}
        aria-label={isLiked ? `Unlike this plan (${label})` : `Like this plan (${label})`}
      >
        {isLiked ? '♥' : '♡'} {label}
      </button>
    </form>
  );
}
