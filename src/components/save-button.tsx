'use client';

import Link from 'next/link';
import { savePlanAction, unsavePlanAction } from '@/app/actions/saves';
import { cachePlanForOffline } from '@/components/service-worker';
import { btnGhost, btnPrimary } from '@/lib/ui'; // Sprint 29: shared button classes

interface Props {
  planId: string;
  slug: string;
  isSaved: boolean;
  isSignedIn: boolean;
}

/**
 * 🗑️ SUPERSEDED BY `save-toggle.tsx` (QOL-B, 2026-07-19) — DELETE THIS FILE.
 *
 * The plan-detail page now uses the bookmark-icon `SaveToggle` that the catalog
 * cards already use, so nothing imports this module any more. It is still on disk
 * only because the sandbox cannot delete files in the working tree (read-only
 * mount); Keagan removes it with `git rm src/components/save-button.tsx` alongside
 * this sprint's commit. Two components performing the same write, each with its own
 * offline pre-cache call to keep in step, is exactly the drift the repo's
 * "no dead code" rule exists to prevent.
 *
 * Save / unsave toggle.
 *
 * SPRINT 8: became a client component for exactly ONE reason — when you save a
 * plan, we ask the service worker to pre-cache it. That is what makes
 * BUSINESS_PLAN.md §5's promise real: you save a plan at home on wifi and it is
 * on your phone before you get to the workshop. Waiting until you *open* it
 * offline would be too late — that is precisely when you have no signal.
 *
 * It is still a plain <form> posting to a server action. **The save works with
 * JavaScript disabled**; only the offline pre-cache needs JS. The enhancement is
 * additive, and its failure costs you nothing but the offline copy — which gets
 * cached anyway the next time you open the plan with signal.
 *
 * For anonymous visitors it renders a sign-in link, not a disabled button. The
 * plan page is public by design (§12 gates saves, not content), so a stranger
 * reaching this needs a door, not a wall. `redirect_url` brings them back to the
 * plan they were reading.
 */
export function SaveButton({ planId, slug, isSaved, isSignedIn }: Props) {
  if (!isSignedIn) {
    return (
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent(`/plans/${slug}`)}`}
        className={btnPrimary}
      >
        Save this plan
      </Link>
    );
  }

  const action = isSaved ? unsavePlanAction : savePlanAction;

  return (
    <form
      action={action}
      onSubmit={() => {
        // Pre-cache on save, not on unsave. Fire-and-forget: the server action is
        // the thing that actually saves, and it is already on its way.
        if (!isSaved) cachePlanForOffline(slug);
      }}
    >
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className={isSaved ? btnGhost : btnPrimary}
        aria-pressed={isSaved}
      >
        {isSaved ? '✓ Saved' : 'Save this plan'}
      </button>
    </form>
  );
}
