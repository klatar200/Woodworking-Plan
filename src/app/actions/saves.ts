'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CATALOG_PATH } from '@/lib/routes';
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
import { denialTarget, bounceTarget } from '@/lib/rate-limit-feedback';
import { formString } from '@/lib/form-fields';
import { guardAction } from '@/lib/action-guard';

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

/**
 * MALFORMED INPUT IS DROPPED, NOT THROWN (2026-07-19) — see src/lib/form-fields.ts.
 *
 * The local `requiredString` this file used to declare THREW on a missing field, so a
 * POST omitting `planId` or `collectionId` produced an HTTP 500 and a client error
 * boundary. Same rule as the rate limiter directly above each of these: drop the
 * request, `redirect()` (a framework-handled 303), never throw.
 *
 * AND THE DATA LAYER'S THROWS ARE CAUGHT TOO (AUDIT FIX 2026-07-19). `savePlan()`
 * throws 'Plan not found' on a forged id; `createCollection()` throws on a >60-char
 * name; `requireUser()` throws for any anonymous or EXPIRED session — and this file's
 * public pages meant every one of those escaped as an HTTP 500. Every lib call now
 * goes through `guardAction()` (src/lib/action-guard.ts): expired session → sign-in
 * with a return URL; everything else → logged and bounced, silently (only a
 * hand-built POST reaches those throws).
 */
export async function savePlanAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/'));

  const planId = formString(formData, 'planId');
  if (planId === null) redirect(bounceTarget(formData, '/'));

  const slug = formData.get('slug');

  await guardAction(savePlan(planId), formData, '/');

  // Refresh the plan page (its save button flips), the saved list, and the
  // catalog (its per-card bookmark overlay — see save-toggle.tsx).
  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  revalidatePath('/saved');
  // QOL-M: the catalog (its per-card bookmark overlay) moved to /browse; `/` is now the
  // landing, whose featured carousel also shows these cards, so refresh both.
  revalidatePath('/');
  revalidatePath(CATALOG_PATH);
}

export async function unsavePlanAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/'));

  const planId = formString(formData, 'planId');
  if (planId === null) redirect(bounceTarget(formData, '/'));

  const slug = formData.get('slug');

  await guardAction(unsavePlan(planId), formData, '/');

  if (typeof slug === 'string' && slug !== '') {
    revalidatePath(`/plans/${slug}`);
  }
  revalidatePath('/saved');
  // QOL-M: the catalog (its per-card bookmark overlay) moved to /browse; `/` is now the
  // landing, whose featured carousel also shows these cards, so refresh both.
  revalidatePath('/');
  revalidatePath(CATALOG_PATH);
}

export async function createCollectionAction(formData: FormData): Promise<void> {
  // 'create', not 'toggle' — this makes a ROW that persists, and a spammed row is
  // something a human eventually has to look at.
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, '/saved'));

  const name = formString(formData, 'name');
  // An empty collection name is a real user mistake (submitting the "new collection"
  // field blank), not only a crafted POST — and the answer is the same either way:
  // do nothing and put them back on the page, rather than crash it.
  if (name === null) redirect(bounceTarget(formData, '/saved'));

  await guardAction(createCollection(name), formData, '/saved');
  revalidatePath('/saved');
}

export async function deleteCollectionAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, '/saved'));

  const collectionId = formString(formData, 'collectionId');
  if (collectionId === null) redirect(bounceTarget(formData, '/saved'));

  await guardAction(deleteCollection(collectionId), formData, '/saved');

  // The user may have been viewing the folder they just deleted.
  revalidatePath('/saved');
  redirect('/saved');
}

export async function renameCollectionAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, '/saved'));

  const collectionId = formString(formData, 'collectionId');
  const name = formString(formData, 'name');
  if (collectionId === null || name === null) redirect(bounceTarget(formData, '/saved'));

  await guardAction(renameCollection(collectionId, name), formData, '/saved');
  revalidatePath('/saved');
}

export async function addToCollectionAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/saved'));

  const planId = formString(formData, 'planId');
  const collectionId = formString(formData, 'collectionId');
  if (planId === null || collectionId === null) redirect(bounceTarget(formData, '/saved'));

  await guardAction(addPlanToCollection(planId, collectionId), formData, '/saved');
  revalidatePath('/saved');
}

export async function removeFromCollectionAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, '/saved'));

  const planId = formString(formData, 'planId');
  const collectionId = formString(formData, 'collectionId');
  if (planId === null || collectionId === null) redirect(bounceTarget(formData, '/saved'));

  await guardAction(removePlanFromCollection(planId, collectionId), formData, '/saved');
  revalidatePath('/saved');
}
