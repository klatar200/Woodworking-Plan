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
import { enforceRateLimit } from '@/lib/rate-limit';

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
 */

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== 'string' || value === '') {
    throw new Error(`Missing ${key}`);
  }
  return value;
}

export async function savePlanAction(formData: FormData): Promise<void> {
  // FIRST — before any database work. Avoiding the database work is the point.
  await enforceRateLimit('toggle');

  const planId = requiredString(formData, 'planId');
  const slug = formData.get('slug');

  await savePlan(planId);

  // Refresh the plan page (its save button flips) and the saved list.
  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  revalidatePath('/saved');
}

export async function unsavePlanAction(formData: FormData): Promise<void> {
  await enforceRateLimit('toggle');

  const planId = requiredString(formData, 'planId');
  const slug = formData.get('slug');

  await unsavePlan(planId);

  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  revalidatePath('/saved');
}

export async function createCollectionAction(formData: FormData): Promise<void> {
  // 'create', not 'toggle' — this makes a ROW that persists, and a spammed row is
  // something a human eventually has to look at.
  await enforceRateLimit('create');

  await createCollection(requiredString(formData, 'name'));
  revalidatePath('/saved');
}

export async function deleteCollectionAction(formData: FormData): Promise<void> {
  await enforceRateLimit('create');

  await deleteCollection(requiredString(formData, 'collectionId'));

  // The user may have been viewing the folder they just deleted.
  revalidatePath('/saved');
  redirect('/saved');
}

export async function renameCollectionAction(formData: FormData): Promise<void> {
  await enforceRateLimit('create');

  await renameCollection(
    requiredString(formData, 'collectionId'),
    requiredString(formData, 'name'),
  );
  revalidatePath('/saved');
}

export async function addToCollectionAction(formData: FormData): Promise<void> {
  await enforceRateLimit('toggle');

  await addPlanToCollection(
    requiredString(formData, 'planId'),
    requiredString(formData, 'collectionId'),
  );
  revalidatePath('/saved');
}

export async function removeFromCollectionAction(formData: FormData): Promise<void> {
  await enforceRateLimit('toggle');

  await removePlanFromCollection(
    requiredString(formData, 'planId'),
    requiredString(formData, 'collectionId'),
  );
  revalidatePath('/saved');
}
