/**
 * Rate-limit feedback — closes the "open follow-up" from the rate-limit incident.
 *
 * The limiter itself (src/lib/rate-limit.ts) DROPS a request and must never
 * throw. But a silent drop left the user with a button that just didn't move.
 * The fix: a denied action redirects back to the page the user was on with
 * `?notice=slow-down`, and that page renders a one-line banner.
 *
 * Why a REDIRECT and not useActionState: every write in this app is a plain
 * <form> posting to a server action, deliberately — saves and likes work with
 * JavaScript disabled. `useActionState` feedback only exists for hydrated
 * clients; a redirect carrying a query param renders the notice for everyone,
 * including the no-JS case, through the same server-rendered path as the rest
 * of the page. And `redirect()` is a framework-handled control-flow signal —
 * a 303 response, NOT the uncaught throw that caused the original HTTP-500
 * incident.
 *
 * This module is pure (no 'use server', no next imports) so it can be tested
 * directly.
 */

export const RATE_LIMIT_NOTICE_PARAM = 'notice';
export const RATE_LIMIT_NOTICE_VALUE = 'slow-down';

/**
 * A second notice code (2026-07-19), for a review submitted without a rating.
 *
 * WHY ONLY THIS ONE. Most malformed submissions can only come from a hand-built POST —
 * a missing `planId` or `collectionId` is not something our own forms can produce — so
 * those bail SILENTLY: the request is dropped, the user is redirected, and an attacker
 * learns nothing from a message. A missing RATING is different: it is reachable by a
 * real person, because the star widget is a set of `visually-hidden` radios whose
 * `required` attribute a browser could conceivably fail to enforce (flagged in QOL-B).
 * Someone in that position pressed "Post review" and watched nothing happen; they are
 * owed a sentence explaining why.
 */
export const RATING_NOTICE_VALUE = 'rating-required';

/**
 * A third notice code (AUDIT FIX 2026-07-19), for a review whose photo failed the
 * upload pipeline.
 *
 * Same test as the rating notice: is it reachable by a REAL person? Yes — a corrupt
 * file, an exotic format the pipeline refuses, an over-size upload that slipped past
 * the client downscale. That used to be an uncaught `UploadError` out of the action —
 * an HTTP 500 with the review text lost. Now it bounces back with this notice.
 */
export const UPLOAD_NOTICE_VALUE = 'upload-failed';

/**
 * Validates an untrusted `returnTo` from FormData.
 *
 * A redirect target read from a form is ATTACKER INPUT — anyone can POST any
 * value to a server action. Without this check it is an open redirect:
 * `returnTo=https://evil.example/sign-in` bounces a user to a phishing page
 * from our own domain. So the rule is: a single leading slash (an app-relative
 * path) or it is discarded for the fallback.
 *
 * `//evil.example` is the trap: it starts with '/' but the browser reads it as
 * protocol-relative and leaves the site. `/\` is the same trick for parsers
 * that normalize backslashes. Both rejected.
 */
export function safeReturnTo(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string' || raw === '') return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  return raw;
}

/**
 * Appends the slow-down notice to an app-relative path, preserving whatever
 * query string (filters, search, page) is already on it.
 */
export function rateLimitNoticeUrl(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${RATE_LIMIT_NOTICE_PARAM}=${RATE_LIMIT_NOTICE_VALUE}`;
}

/**
 * True when a page's searchParams carry the notice. Accepts the raw
 * (string | string[] | undefined) shape Next.js hands to pages.
 */
export function hasRateLimitNotice(raw: string | string[] | undefined): boolean {
  return raw === RATE_LIMIT_NOTICE_VALUE;
}

/**
 * Where a denied request bounces back to, notice included.
 *
 * `returnTo` is attacker-controlled FormData, so it goes through
 * `safeReturnTo`. When absent, fall back to the plan page IF the form carried
 * a well-formed slug — the slug is regex-checked before being embedded in a
 * path, because it, too, comes from the form — else to the given default.
 */
export function denialTarget(formData: FormData, fallback: string): string {
  return rateLimitNoticeUrl(bounceTarget(formData, fallback));
}

/**
 * Where a request bounces back to, WITHOUT any notice — the same safe-target logic
 * `denialTarget` uses, minus the message.
 *
 * Extracted 2026-07-19 for the malformed-input bail. It matters that this reuses the
 * identical target resolution rather than re-deriving it: `returnTo` is attacker input
 * on this path too, and a second, subtly different implementation is how one of two
 * bail routes ends up an open redirect while the other stays safe.
 */
export function bounceTarget(formData: FormData, fallback: string): string {
  const slug = formData.get('slug');
  const slugFallback =
    typeof slug === 'string' && /^[a-z0-9-]+$/.test(slug)
      ? `/plans/${slug}`
      : fallback;
  return safeReturnTo(formData.get('returnTo'), slugFallback);
}

/** Appends an arbitrary notice code, preserving any existing query string. */
export function noticeUrl(path: string, value: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${RATE_LIMIT_NOTICE_PARAM}=${value}`;
}

/** True when a page's searchParams carry the "you didn't pick a rating" notice. */
export function hasRatingNotice(raw: string | string[] | undefined): boolean {
  return raw === RATING_NOTICE_VALUE;
}

/** True when a page's searchParams carry the "photo couldn't be processed" notice. */
export function hasUploadNotice(raw: string | string[] | undefined): boolean {
  return raw === UPLOAD_NOTICE_VALUE;
}
