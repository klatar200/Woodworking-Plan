'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { likePlan, unlikePlan } from '@/lib/likes';
import { checkRateLimit } from '@/lib/rate-limit';
import { denialTarget } from '@/lib/rate-limit-feedback';

/**
 * Like/unlike server actions — Sprint 7.
 *
 * SECURITY: server actions are PUBLIC HTTP ENDPOINTS. Next generates an id for
 * each and anyone can POST to it; the fact that no button in the UI calls it
 * means nothing. So:
 *
 *   - No user id is read from the form, a header, or a cookie. `likePlan()` and
 *     `unlikePlan()` derive the owner from the verified Clerk session and take no
 *     `userId` parameter — there is nothing to forge.
 *   - `requireUser()` inside them throws for an anonymous POST, rather than
 *     silently writing an orphan row.
 *
 * The middleware protects PAGES. It is not what stands between an attacker and a
 * server action, and treating it as such is how people ship an action anyone on
 * the internet can call.
 *
 * RATE LIMITING: `checkRateLimit()` runs FIRST, before any database work —
 * avoiding that work is the point. A denied request does NO WORK and never
 * throws a real error (an uncaught throw out of a server action is an HTTP 500
 * and a crashed page; see src/lib/rate-limit.ts for the incident). It
 * `redirect()`s back with `?notice=slow-down` instead — a framework-handled
 * 303, not an exception. See src/lib/rate-limit-feedback.ts.
 */

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== 'string' || value === '') {
    throw new Error(`Missing ${key}`);
  }
  return value;
}

export async function likePlanAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/'));

  const planId = requiredString(formData, 'planId');
  const slug = formData.get('slug');

  await likePlan(planId);

  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  // The catalog shows like counts and offers a Popular sort — both are now stale.
  revalidatePath('/');
}

export async function unlikePlanAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/'));

  const planId = requiredString(formData, 'planId');
  const slug = formData.get('slug');

  await unlikePlan(planId);

  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  revalidatePath('/');
}
