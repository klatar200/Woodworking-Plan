'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  savePlan,
  unsavePlan,
  createCollection,
  deleteCollection,
  renameCollection,
  addPlanToCollection,
  removePlanFromCollection,
} from '@/lib/saves';
import { checkRateLimit } from '@/lib/rate-limit';
import { denialTarget } from '@/lib/rate-limit-feedback';

/**
 * Server actions — the write boundary for saves and collections.
 *
 * SECURITY. Server actions are PUBLIC HTTP ENDPOINTS. Next.js generates an id
 * for each one and anybody can POST to it; the fact that no button in your UI
 * calls it means nothing. So every action here is treated as hostile input:
 *
 *   1. It reads only opaque ids and strings from the FormData.
 *   2. It NEVER reads a user id from anywhere — not the form, not a header, not
 *      a cookie. Every function it calls in src/lib/saves.ts derives the owner
 *      from the verified Clerk session, and none of them accept a `userId`
 *      parameter. That is what makes forging one impossible rather than merely
 *      difficult.
 *   3. Authentication is enforced by `requireUser()` inside those functions, so
 *      an anonymous POST throws rather than silently writing an orphan row.
 *
 * The middleware also protects /saved, but middleware protects PAGES. It is not
 * the thing standing between an attacker and a server action, and treating it as
 * such is how people ship an action that anyone on the internet can call.
 *
 * RATE LIMITING. Every action calls `checkRateLimit()` FIRST, before any database
 * work — avoiding that work is the entire point. A denied request does NO WORK and
 * never throws a real error: an uncaught throw out of a server action is an HTTP
 * 500 and a crashed page (see src/lib/rate-limit.ts for the incident). What it
 * does instead is `redirect()` back to the page with `?notice=slow-down` so the
 * user learns why their click didn't take — `redirect()` is a framework-handled
 * control-flow signal (a 303), not an unhandled exception. See
 * src/lib/rate-limit-feedback.ts.
 */

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== 'string' || value === '') {
    throw new Error(`Missing ${key}`);
  }
  return value;
}

export async function savePlanAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/'));

  const planId = requiredString(formData, 'planId');
  const slug = formData.get('slug');

  await savePlan(planId);

  // Refresh the plan page (its save button flips), the saved list, and the
  // catalog (its per-card bookmark overlay — see save-toggle.tsx).
  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  revalidatePath('/saved');
  revalidatePath('/');
}

export async function unsavePlanAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/'));

  const planId = requiredString(formData, 'planId');
  const slug = formData.get('slug');

  await unsavePlan(planId);

  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  revalidatePath('/saved');
  revalidatePath('/');
}

export async function createCollectionAction(formData: FormData): Promise<void> {
  // 'create', not 'toggle' — this makes a ROW that persists, and a spammed row is
  // something a human eventually has to look at.
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, '/saved'));

  await createCollection(requiredString(formData, 'name'));
  revalidatePath('/saved');
}

export async function deleteCollectionAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, '/saved'));

  await deleteCollection(requiredString(formData, 'collectionId'));

  // The user may have been viewing the folder they just deleted.
  revalidatePath('/saved');
  redirect('/saved');
}

export async function renameCollectionAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, '/saved'));

  await renameCollection(
    requiredString(formData, 'collectionId'),
    requiredString(formData, 'name'),
  );
  revalidatePath('/saved');
}

export async function addToCollectionAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/saved'));

  await addPlanToCollection(
    requiredString(formData, 'planId'),
    requiredString(formData, 'collectionId'),
  );
  revalidatePath('/saved');
}

export async function removeFromCollectionAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/saved'));

  await removePlanFromCollection(
    requiredString(formData, 'planId'),
    requiredString(formData, 'collectionId'),
  );
  revalidatePath('/saved');
}
