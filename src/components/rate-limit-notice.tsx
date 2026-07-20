import Link from 'next/link';

interface Props {
  /** Pass `hasRateLimitNotice(searchParams.notice)` from the page. */
  show: boolean;
  /** Where "Dismiss" goes — the same page without the notice param. */
  dismissHref: string;
}

/**
 * The banner a rate-limited user actually sees — the other half of the
 * rate-limit rule. The limiter drops the request server-side; this tells the
 * human WHY their click didn't take, instead of a button that silently
 * doesn't move.
 *
 * `role="status"` (polite live region): announced by screen readers without
 * interrupting, which is the right urgency for "wait a moment" — it is not an
 * error and must not be announced like one.
 */
export function RateLimitNotice({ show, dismissHref }: Props) {
  if (!show) return null;

  return (
    <p className="rate-limit-notice" role="status">
      You&rsquo;re going a bit fast &mdash; that last action was skipped. Wait a
      few seconds and try again.{' '}
      <Link href={dismissHref}>Dismiss</Link>
    </p>
  );
}

/**
 * "You didn't pick a rating" — 2026-07-19, the visible half of the review-action fix.
 *
 * `submitReviewAction` used to THROW on a missing rating, which is an HTTP 500. It now
 * drops the request and redirects back with `?notice=rating-required`; this is what the
 * person then reads. Without it the fix would trade a crash for a silent no-op, and a
 * button that does nothing is its own kind of broken.
 *
 * Deliberately its own component rather than a `variant` prop on the one above: the two
 * differ only in a sentence, and threading a discriminator through four existing call
 * sites to save ten lines of JSX would have put churn on the rate-limit path — which is
 * the path with an actual production incident behind it — for no benefit.
 *
 * `role="status"` (polite), like its sibling: this is a correction, not an error to
 * interrupt someone with.
 */
export function RatingRequiredNotice({ show, dismissHref }: Props) {
  if (!show) return null;

  return (
    <p className="rate-limit-notice" role="status">
      Your review wasn&rsquo;t posted &mdash; please pick a star rating first.{' '}
      <Link href={dismissHref}>Dismiss</Link>
    </p>
  );
}

/**
 * "That photo couldn't be processed" — AUDIT FIX 2026-07-19, the visible half of the
 * action-guard fix (src/lib/action-guard.ts).
 *
 * A photo the upload pipeline refuses (corrupt bytes, an unsupported format, over
 * the 4 MB cap) used to escape `submitReviewAction` as an uncaught `UploadError` —
 * an HTTP 500 and a lost review. It now bounces back with `?notice=upload-failed`,
 * and this is the sentence the person reads. Same shape and reasoning as its two
 * siblings above; `role="status"` because it is a correction, not an alarm.
 */
export function UploadFailedNotice({ show, dismissHref }: Props) {
  if (!show) return null;

  return (
    <p className="rate-limit-notice" role="status">
      Your review wasn&rsquo;t posted &mdash; one of the photos couldn&rsquo;t be
      processed. Photos must be JPEG, PNG, WebP, or AVIF and under 4&nbsp;MB; try
      again without that photo or with a smaller copy.{' '}
      <Link href={dismissHref}>Dismiss</Link>
    </p>
  );
}
