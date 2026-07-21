import Link from 'next/link';
import { Heart } from 'lucide-react';
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
 *
 * QOL-B — PRESENTATION ONLY. It now reads as a COUNTER (heart + number, in a pill)
 * rather than a button captioned "3 likes", because it sits next to a real primary
 * CTA ("Start building") and two equally-weighted buttons make neither look primary.
 * Nothing about the mechanism changed: still a plain <form> → server action, still
 * `aria-pressed`, still no JS. The full phrase survives in `aria-label` and `title`,
 * so a screen reader hears "Like this plan (3 likes)" rather than "heart, 3" — the
 * visible text got shorter, the accessible name did not.
 */
export function LikeButton({ planId, slug, isLiked, likeCount, isSignedIn }: Props) {
  const label = `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`;
  // Same source order gotcha as everywhere else in this migration: `rounded-[999px]`
  // and btnBase's `rounded-[0.375rem]` are the same property, so the pill needs `!`.
  const counter = 'rounded-[999px]! gap-[0.35rem]';

  if (!isSignedIn) {
    return (
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent(`/plans/${slug}`)}`}
        className={`${btnGhost} ${counter}`}
        aria-label={`Sign in to like this plan (${label})`}
        title={`Sign in to like this plan (${label})`}
      >
        <Heart size={16} aria-hidden="true" /> {likeCount}
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
        className={`${isLiked ? btnLiked : btnGhost} ${counter}`}
        aria-pressed={isLiked}
        aria-label={isLiked ? `Unlike this plan (${label})` : `Like this plan (${label})`}
        title={isLiked ? `Unlike this plan (${label})` : `Like this plan (${label})`}
      >
        <Heart size={16} aria-hidden="true" fill={isLiked ? 'currentColor' : 'none'} />{' '}
        {likeCount}
      </button>
    </form>
  );
}
