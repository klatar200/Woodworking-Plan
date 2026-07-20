'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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
  revalidatePath('/');
  redirect('/profile?saved=1#workshop');
}

/** The result of a modal workshop save — a value, not a redirect (QOL-L). */
export type WorkshopSaveResult =
  | { ok: true }
  | { ok: false; error: 'rate-limited' | 'unauthorized' | 'error' };

/**
 * Save the owned-tools profile from the AccountModal — QOL-L.
 *
 * Same security and rate-limit posture as `saveWorkshopAction` (owner from session,
 * `create` bucket, slugs validated in `setOwnedTools`), but RETURNS A RESULT instead of
 * redirecting — a `redirect()` inside the modal would navigate the whole page out of it.
 * The client shows an in-modal "Saved" / error from this value (`useActionState`).
 *
 * Takes the slug array directly (the client collects the checked boxes), not a FormData —
 * a server action may take any serialisable argument, and there's no no-JS form behind
 * this one (that path is `/profile`'s `saveWorkshopAction`, kept intact above).
 *
 * NEVER THROWS: an uncaught throw out of a server action is an HTTP 500. An expired
 * session (`UnauthorizedError`, matched by NAME to keep this off the Clerk/Prisma import
 * chain) → a typed `unauthorized`; anything else → `error`. Both render a message in the
 * modal rather than crashing it.
 */
export async function saveWorkshopModalAction(
  slugs: string[],
): Promise<WorkshopSaveResult> {
  if (!(await checkRateLimit('create'))) return { ok: false, error: 'rate-limited' };

  const clean = slugs.filter(
    (value): value is string => typeof value === 'string' && value !== '',
  );

  try {
    await setOwnedTools(clean);
  } catch (error) {
    if (error instanceof Error && error.name === 'UnauthorizedError') {
      return { ok: false, error: 'unauthorized' };
    }
    return { ok: false, error: 'error' };
  }

  // The catalog's tool-filter prefill and the /profile fallback both reflect the new set.
  revalidatePath('/');
  revalidatePath('/profile');
  return { ok: true };
}
