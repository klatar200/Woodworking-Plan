'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addToShoppingList, removeFromShoppingList } from '@/lib/shopping-list';
import { checkRateLimit } from '@/lib/rate-limit';
import { denialTarget } from '@/lib/rate-limit-feedback';

/**
 * Add / remove a plan on the shopping list — Sprint 22.
 *
 * SECURITY: server actions are PUBLIC HTTP ENDPOINTS. Next generates an id for each and
 * anyone can POST to it; the fact that no button in the UI calls it means nothing. So no
 * user id is read from the form — `addToShoppingList`/`removeFromShoppingList` derive the
 * owner from the verified Clerk session and take no `userId`. `requireUser()` inside them
 * throws for an anonymous POST rather than writing an orphan row.
 *
 * RATE LIMITING mirrors like/save: `checkRateLimit('toggle')` runs FIRST, before any DB
 * work. A denied request does NO work and never throws (an uncaught throw out of a server
 * action is an HTTP 500 and a crashed page — see src/lib/rate-limit.ts). It `redirect()`s
 * back with `?notice=slow-down` instead, a framework-handled 303. `denialTarget` runs the
 * `returnTo` field through `safeReturnTo`, so the bounce cannot become an open redirect.
 */

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== 'string' || value === '') {
    throw new Error(`Missing ${key}`);
  }
  return value;
}

export async function addToShoppingListAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/'));

  const planId = requiredString(formData, 'planId');
  const slug = formData.get('slug');

  await addToShoppingList(planId);

  if (typeof slug === 'string' && slug !== '') revalidatePath(`/plans/${slug}`);
  revalidatePath('/shopping-list');
}

export async function removeFromShoppingListAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/'));

  const planId = requiredString(formData, 'planId');
  const slug = formData.get('slug');

  await removeFromShoppingList(planId);

  if (typeof slug === 'string' && slug !== '') revalidatePath(`/plans/${slug}`);
  revalidatePath('/shopping-list');
}
