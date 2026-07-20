import { redirect, unstable_rethrow } from 'next/navigation';
import { bounceTarget, noticeUrl } from '@/lib/rate-limit-feedback';

/**
 * The action-boundary catch — AUDIT FIX 2026-07-19.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * A SERVER ACTION MUST NOT THROW — and until this file, the rule stopped one layer
 * too high.
 *
 * The rate limiter was fixed to no-throw. The FormData readers were fixed to
 * no-throw (src/lib/form-fields.ts). But the DATA LAYER underneath still throws —
 * `savePlan()` on an unknown planId, `upsertReview()` on an over-length body or a
 * failed upload, and `requireUser()` for ANY anonymous caller — and every action
 * awaited those calls bare. An uncaught throw out of a server action is an HTTP 500
 * and a client "Application error" boundary: the exact incident shape this codebase
 * has now fixed three separate times, sitting one call deeper each time.
 *
 * The user-reachable case that makes this matter: a plan page is PUBLIC, so the
 * middleware does not intercept a POST to its actions. A signed-in user whose
 * session expires mid-page clicks Save → `requireUser()` throws → the page crashes.
 * With this guard they land on sign-in with a return URL instead.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * WHAT IT DOES with a failure, in order:
 *   1. `unstable_rethrow()` — Next's own control-flow signals (NEXT_REDIRECT from a
 *      nested `redirect()`, notFound, etc.) pass through untouched. Swallowing
 *      those would break the framework, not protect it.
 *   2. `UnauthorizedError` (matched by NAME, so this module never imports the
 *      Clerk/Prisma chain behind src/lib/auth.ts) → redirect to sign-in, carrying
 *      the page the user was on.
 *   3. Everything else → log it (a swallowed DB outage must still be visible in the
 *      Vercel logs) and bounce back via the SAME `bounceTarget()` the rate-limit and
 *      malformed-input paths use — `returnTo` is attacker input on this path too,
 *      and a second target resolver is how one bail route becomes an open redirect.
 *
 * Notices are opt-in per error, via `noticeFor`. Default is SILENT: most failures
 * here can only be produced by a hand-built POST (an unknown planId, a 5000-char
 * body past the UI's maxLength), and an attacker learns nothing from our messages.
 * A failure a real person can reach (a photo that won't process) passes a
 * `noticeFor` that names it.
 */
export async function guardAction(
  work: Promise<unknown>,
  formData: FormData,
  fallback: string,
  noticeFor?: (error: unknown) => string | null,
): Promise<void> {
  try {
    await work;
  } catch (error) {
    // Framework control flow is not a failure. NEVER handle it.
    unstable_rethrow(error);

    if (error instanceof Error && error.name === 'UnauthorizedError') {
      redirect(
        `/sign-in?redirect_url=${encodeURIComponent(bounceTarget(formData, fallback))}`,
      );
    }

    // Visible in the server logs; invisible to the caller. A dropped request must
    // not become a silent outage.
    console.error('[action] request dropped:', error);

    const target = bounceTarget(formData, fallback);
    const notice = noticeFor?.(error) ?? null;
    redirect(notice ? noticeUrl(target, notice) : target);
  }
}
