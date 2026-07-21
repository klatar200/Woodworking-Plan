'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CATALOG_PATH } from '@/lib/routes';
import { setOwnedTools } from '@/lib/workshop';
import { checkRateLimit } from '@/lib/rate-limit';
import { denialTarget } from '@/lib/rate-limit-feedback';
import { guardAction } from '@/lib/action-guard';

/**
 * Save the owned-tools profile — Sprint 25.
 *
 * SECURITY: a server action is a PUBLIC HTTP ENDPOINT. No user id is read from the form —
 * `setOwnedTools` derives the owner from the verified session and validates every
 * submitted slug against real tools, so a forged POST can neither target another user nor
 * create dangling rows. `requireUser()` inside it throws for an anonymous POST.
 *
 * RATE LIMIT: the `create` bucket (this writes rows), checked FIRST. A denial no-ops and
 * redirects back to the form with the slow-down notice — never throws (an uncaught throw
 * out of a server action is an HTTP 500). `returnTo` runs through `safeReturnTo`.
 *
 * QOL-D (2026-07-19): the form moved from `/workshop` to the profile page's Workshop
 * section, so every target here is `/profile` — the success PRG, the revalidate, and the
 * rate-limit fallback. `/workshop` now only redirects, so bouncing back to it would send
 * the user through a second hop and, worse, drop the `?saved=1` / `?notice=` query the
 * redirect target needs to render its banner.
 *
 * On success it PRG-redirects to `/profile?saved=1#workshop` so a refresh doesn't
 * re-post, and revalidates `/` because the catalog's tool-filter prefill now reflects
 * the new set.
 */
export async function saveWorkshopAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, '/profile'));

  const slugs = formData
    .getAll('tools')
    .filter((value): value is string => typeof value === 'string' && value !== '');

  // AUDIT FIX 2026-07-19: an expired session used to escape as an HTTP 500 —
  // now it lands on sign-in with a return URL. See src/lib/action-guard.ts.
  await guardAction(setOwnedTools(slugs), formData, '/profile');

  revalidatePath('/profile');
  // QOL-M: the tools-owned filter prefill lives on the catalog, now at /browse (not `/`).
  revalidatePath(CATALOG_PATH);
  redirect('/profile?saved=1#workshop');
}

/*
 * RETIRED Sprint 41.4 (audit H4, ⚖️ Keagan 2026-07-21): `saveWorkshopModalAction` and its
 * `WorkshopSaveResult` type, together with `GET /api/workshop`.
 *
 * They existed only so the account modal could hold a SECOND copy of the workshop picker.
 * The modal now links to `/profile#workshop`, which is the picker — so this was a second
 * write path to the same rows, kept in step by nothing but attention, plus an
 * authenticated endpoint whose sole reason to exist was the duplicate UI.
 *
 * SECURITY NOTE, deliberately recorded: deleting an authenticated server action and an
 * authenticated route removes attack surface. Both were correctly built (owner from
 * session, `create` bucket, slugs validated, no-throw) — the point is that the safest
 * endpoint is the one that isn't there. Do not reintroduce either to put a tool picker
 * back in the modal; `saveWorkshopAction` above serves the one real form.
 */
