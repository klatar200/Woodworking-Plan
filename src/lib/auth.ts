import { cache } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import type { User } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * The single server-side gateway between Clerk's identity and our User rows.
 *
 * SECURITY — the rule this file exists to enforce:
 *
 *   The current user is ALWAYS derived from Clerk's verified session, server-side.
 *   A user id is NEVER read from a request body, query string, path param, header,
 *   or cookie set by the client.
 *
 * Every "whose data is this?" question in this codebase must be answered through
 * `requireUser()` or `getCurrentUser()`. If a future sprint (saves, likes,
 * categories) ever takes a `userId` as an input parameter, that is an
 * authorization bug — an attacker just passes someone else's id. There is no
 * legitimate reason to accept one.
 */

/**
 * Resolves the signed-in Clerk user to our User row, creating it on first sight.
 *
 * Lazy-creates rather than syncing via a Clerk webhook. Rationale: a webhook adds
 * a public endpoint, a signing secret to manage, and a failure mode where a user
 * signs in successfully but has no row because a webhook was dropped. Creating on
 * first authenticated request has none of that and cannot get out of sync — if
 * the user is here, the row exists.
 *
 * (A webhook becomes worth adding when we need to react to *deletion* in Clerk.
 * Not a Sprint 2 requirement. Noted, not built.)
 *
 * Idempotent: safe to call on every request. `upsert` on the unique `clerkId`
 * means concurrent requests from the same user cannot create duplicate rows.
 *
 * PERF (Sprint 9): wrapped in React's `cache()`, memoized per REQUEST.
 *
 * This function is not cheap — it calls Clerk's API *and* upserts a row. A single
 * plan page used to invoke it three times (once directly, once inside
 * `isPlanSaved`, once inside `isPlanLiked`), so one page view meant three Clerk
 * round trips and three redundant writes. Now: one of each, per request.
 *
 * `cache()` is per-request, not global — so a stale session is impossible. Two
 * different users' requests never share a memo.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
    clerkUser.username ||
    null;

  // Refresh the cached display fields on every sign-in so a name change in Clerk
  // doesn't leave us rendering a stale one forever.
  //
  // Sprint 47: phone/company/jobTitle/website are USER-WRITTEN. Do NOT put them in
  // `update` — this upsert re-runs on every authenticated request from Clerk data and
  // would wipe profile edits on the next sign-in.
  return prisma.user.upsert({
    where: { clerkId: userId },
    create: {
      clerkId: userId,
      email,
      displayName,
      imageUrl: clerkUser.imageUrl ?? null,
    },
    update: {
      email,
      displayName,
      imageUrl: clerkUser.imageUrl ?? null,
    },
  });
});

/**
 * The error `requireUser()` throws for an anonymous caller — AUDIT FIX 2026-07-19.
 *
 * A NAMED class, because the action boundary needs to tell "no session" apart from
 * every other failure: an expired session clicking Save should land on the sign-in
 * page, not on a generic bounce (and before this fix, on an HTTP 500 — the plan page
 * is public, so the middleware never intercepted the POST and the bare throw escaped
 * the action). src/lib/action-guard.ts matches on `error.name` rather than importing
 * this class, so the guard stays free of this module's Clerk/Prisma import chain.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized: no authenticated user');
    this.name = 'UnauthorizedError';
  }
}

/**
 * Same as getCurrentUser, but throws when there is no session.
 *
 * Use this in any server component or route handler that must not run for an
 * anonymous visitor. It is a backstop, not the primary defence — middleware
 * already blocks unauthenticated access to protected routes. Defence in depth:
 * if a route is ever added to the app and someone forgets to add it to the
 * middleware matcher, this still fails closed rather than leaking data.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}
