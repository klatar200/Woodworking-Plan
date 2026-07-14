import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { env, isClerkWebhookConfigured } from '@/env';
import { deleteUserByClerkId } from '@/lib/user-deletion';

/**
 * POST /api/webhooks/clerk — reacts to a user being DELETED in Clerk.
 *
 * See src/lib/user-deletion.ts for WHY deletion (unlike creation) needs a webhook.
 *
 * ── SECURITY: unauthenticated-by-SESSION, on purpose ──────────────────────────
 * Clerk's servers call this with no user session, so it is on the public-route
 * allowlist. That does NOT make it open:
 *
 *   - Its only defence is the Svix signature. `verifyWebhook` checks the request
 *     against CLERK_WEBHOOK_SIGNING_SECRET, and we act on NOTHING that fails it.
 *   - It FAILS CLOSED. No secret configured → 500, no deletion. Bad/absent
 *     signature → 400, no deletion. An unverified body is never trusted.
 *   - The only mutation is deleting OUR mirror row, keyed by the clerkId found
 *     INSIDE the signed payload. There is no client-supplied id path here.
 *
 * ── Status codes are a contract with Clerk's retry logic ──────────────────────
 *   200 → handled (or deliberately ignored); do not retry.
 *   400 → we could not verify you; retrying will not help.
 *   500 → verified, but WE failed (e.g. DB down mid-delete); please RETRY.
 */
export async function POST(request: NextRequest) {
  // Misconfiguration should be LOUD, not look like a bad signature. A 500 surfaces
  // in Clerk's dashboard as a failing endpoint — which is exactly the signal we want
  // if the secret was never set before going live.
  if (!isClerkWebhookConfigured()) {
    console.error(
      '[clerk-webhook] CLERK_WEBHOOK_SIGNING_SECRET is not set — refusing to process (fail closed).',
    );
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event;
  try {
    event = await verifyWebhook(request, {
      signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
    });
  } catch (error) {
    // Unverifiable. Do not trust a single byte of the body.
    console.warn('[clerk-webhook] signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'user.deleted') {
      const clerkId = event.data.id;
      if (!clerkId) {
        // A deletion event with no id is nothing we can act on. Acknowledge so Clerk
        // does not retry a payload we can never process.
        console.warn('[clerk-webhook] user.deleted with no id; ignoring.');
        return NextResponse.json({ ok: true, ignored: 'no-id' });
      }

      const result = await deleteUserByClerkId(clerkId);
      console.info(
        `[clerk-webhook] user.deleted ${clerkId}: removed ${result.usersDeleted} row(s), ` +
          `${result.blobsDeleted} blob(s).`,
      );
      return NextResponse.json({ ok: true, ...result });
    }

    // Any other event type: acknowledge and ignore. We subscribe to user.deleted;
    // a 200 keeps Clerk from retrying events we deliberately do not handle.
    return NextResponse.json({ ok: true, ignored: event.type });
  } catch (error) {
    // Verified, but processing failed (e.g. the database is down). Return 500 so
    // Clerk RETRIES — the entire point is that the deletion eventually happens.
    console.error('[clerk-webhook] failed to process event:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
