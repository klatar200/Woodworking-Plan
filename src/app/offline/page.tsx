import Link from 'next/link';

/**
 * Offline fallback — Sprint 8, rewritten in Sprint 14.
 *
 * Shown by the service worker when a navigation fails and there is no stored copy of
 * that page.
 *
 * Static on purpose: it is pre-cached at service-worker install, so it must not depend
 * on the network, the database, or a session. It is the one page in this app that is
 * NOT `force-dynamic`.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * IT MUST TELL THE TRUTH, and what is true CHANGED in Sprint 14.
 *
 * The previous version said the saved list and shopping list were "not stored on the
 * device on purpose". That is no longer accurate: a user who taps "Make available
 * offline" now has both. Leaving the old copy up would be the same class of failure as
 * a stale code comment — a confident claim that argues against the evidence — except
 * this one is aimed at users rather than developers, which makes it worse.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main id="main" className="page">
      <h1>You&rsquo;re offline</h1>

      <p className="subtitle">
        No signal &mdash; which, in a workshop or the back of a hardware store, is
        exactly what we expected.
      </p>

      <h2>What still works</h2>
      <ul className="detail-list">
        <li className="detail-row">
          <strong>Plans you&rsquo;ve opened or saved.</strong> Stored on this device
          &mdash; the full cut list, materials, and every step.
        </li>
        <li className="detail-row">
          <strong>Cut lists and print sheets for those plans.</strong> Open one and
          print it, with no signal at all.
        </li>
        <li className="detail-row">
          <strong>Your saved list and shopping list</strong> &mdash; but only if you
          tapped <strong>Make available offline</strong> on the Saved page while you had
          a connection. That is the one thing that puts them on this device, and it is
          deliberately something you choose rather than something we do quietly.
        </li>
      </ul>

      <h2>What doesn&rsquo;t</h2>
      <ul className="detail-list">
        <li className="detail-row">
          <strong>Browsing, searching, saving, and reviewing.</strong> These need the
          network. Anything you save or write now won&rsquo;t stick &mdash; do it again
          when you have a bar.
        </li>
      </ul>

      <p className="footnote">
        <Link href="/">Try again</Link> once you have a bar of signal.
      </p>
    </main>
  );
}
