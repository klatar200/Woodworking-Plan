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
