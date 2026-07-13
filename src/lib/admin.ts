import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { env } from '@/env';

/**
 * Admin authorization — Sprint 10.
 *
 * DECISIONS_LOG.md (2026-07-13): user reviews and photos publish immediately, and
 * the owner can delete anything. This module is the whole of "the owner".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * IT IS AN ALLOWLIST OF CLERK USER IDS, AND IT FAILS CLOSED.
 *
 *   - Unset `ADMIN_USER_IDS` → NOBODY is an admin. Not "everybody", not "the first
 *     user", not "anyone in dev". The safe direction to fail is closed, and an
 *     admin check that quietly grants power on a missing env var is worse than no
 *     admin check at all.
 *
 *   - IDS, NOT EMAILS. An email address is mutable, and it is only as trustworthy
 *     as the verification behind it. A Clerk user id is immutable, server-issued,
 *     and cannot be claimed by signing up with a lookalike address. Matching an
 *     admin on `email === 'me@example.com'` is a privilege-escalation bug waiting
 *     for the day someone can register an unverified address.
 *
 *   - The id compared is the CLERK id from the verified session — never anything
 *     the client sent.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Parsed once. Empty set when unset — see "fails closed" above. */
function adminClerkIds(): Set<string> {
  const raw = env.ADMIN_USER_IDS;
  if (!raw) return new Set();

  return new Set(
    raw
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  );
}

/**
 * Is the signed-in user an admin?
 *
 * Returns false for anonymous visitors rather than throwing — it is called from the
 * public plan page to decide whether to render a delete button.
 *
 * NOTE: this decides what to RENDER. It is not what protects the delete itself. The
 * server action re-checks. A hidden button is not authorization; anyone can POST to
 * a server action id whether or not the UI ever showed them a button.
 */
export async function isAdmin(): Promise<boolean> {
  const ids = adminClerkIds();
  if (ids.size === 0) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  // Our User row stores the clerkId that the verified session produced.
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { clerkId: true },
  });

  return row !== null && ids.has(row.clerkId);
}

/** Throws unless the caller is an admin. The real gate — call it inside the action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    // Deliberately identical to the message a non-admin sees for a missing row.
    // Confirming "this exists but you may not touch it" is an information leak.
    throw new Error('Not found');
  }
}
