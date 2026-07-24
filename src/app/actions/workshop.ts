'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CATALOG_PATH } from '@/lib/routes';
import { setOwnedTools } from '@/lib/workshop';
import { checkRateLimit } from '@/lib/rate-limit';
import { denialTarget } from '@/lib/rate-limit-feedback';
import { guardAction } from '@/lib/action-guard';

/**
 * Save the owned-tools profile — Sprint 25; retargeted Sprint 47.
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
 * Sprint 47: the form lives at `/settings/workshop` (rail label "Tools"). Every target
 * here — success PRG, revalidate, rate-limit fallback — points there. `/workshop` and
 * `/profile#workshop` still redirect in, so bouncing to those would hop and drop
 * `?saved=1` / `?notice=`.
 */
export async function saveWorkshopAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) {
    redirect(denialTarget(formData, '/settings/workshop'));
  }

  const slugs = formData
    .getAll('tools')
    .filter((value): value is string => typeof value === 'string' && value !== '');

  // AUDIT FIX 2026-07-19: an expired session used to escape as an HTTP 500 —
  // now it lands on sign-in with a return URL. See src/lib/action-guard.ts.
  await guardAction(setOwnedTools(slugs), formData, '/settings/workshop');

  revalidatePath('/settings/workshop');
  // QOL-M: the tools-owned filter prefill lives on the catalog, now at /browse (not `/`).
  revalidatePath(CATALOG_PATH);
  redirect('/settings/workshop?saved=1');
}

/*
 * RETIRED Sprint 41.4 (audit H4, ⚖️ Keagan 2026-07-21): `saveWorkshopModalAction` and its
 * `WorkshopSaveResult` type, together with `GET /api/workshop`.
 *
 * They existed only so the account modal could hold a SECOND copy of the workshop picker.
 * The modal now links to `/settings/workshop`, which is the picker — so this was a second
 * write path to the same rows, kept in step by nothing but attention, plus an
 * authenticated endpoint whose sole reason to exist was the duplicate UI.
 *
 * SECURITY NOTE, deliberately recorded: deleting an authenticated server action and an
 * authenticated route removes attack surface. Both were correctly built (owner from
 * session, `create` bucket, slugs validated, no-throw) — the point is that the safest
 * endpoint is the one that isn't there. Do not reintroduce either to put a tool picker
 * back in a modal; `saveWorkshopAction` above serves the one real form.
 */
