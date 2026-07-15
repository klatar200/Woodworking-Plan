'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { setOwnedTools } from '@/lib/workshop';
import { checkRateLimit } from '@/lib/rate-limit';
import { denialTarget } from '@/lib/rate-limit-feedback';

/**
 * Save the owned-tools profile — Sprint 25.
 *
 * SECURITY: a server action is a PUBLIC HTTP ENDPOINT. No user id is read from the form —
 * `setOwnedTools` derives the owner from the verified session and validates every
 * submitted slug against real tools, so a forged POST can neither target another user nor
 * create dangling rows. `requireUser()` inside it throws for an anonymous POST.
 *
 * RATE LIMIT: the `create` bucket (this writes rows), checked FIRST. A denial no-ops and
 * redirects back to /workshop with the slow-down notice — never throws (an uncaught throw
 * out of a server action is an HTTP 500). `returnTo` runs through `safeReturnTo`.
 *
 * On success it PRG-redirects to `/workshop?saved=1` so a refresh doesn't re-post, and
 * revalidates `/` because the catalog's tool-filter prefill now reflects the new set.
 */
export async function saveWorkshopAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, '/workshop'));

  const slugs = formData
    .getAll('tools')
    .filter((value): value is string => typeof value === 'string' && value !== '');

  await setOwnedTools(slugs);

  revalidatePath('/workshop');
  revalidatePath('/');
  redirect('/workshop?saved=1');
}
