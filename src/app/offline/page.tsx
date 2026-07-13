import Link from 'next/link';

/**
 * Offline fallback — Sprint 8.
 *
 * Shown by the service worker when a navigation fails and there is no cached copy
 * of that page.
 *
 * Static on purpose: it is pre-cached at service-worker install, so it must not
 * depend on the network, the database, or a session. It is the one page in this
 * app that is NOT `force-dynamic`.
 *
 * It also has to be honest about a real limitation: `/saved` is deliberately never
 * cached (see src/lib/offline.ts — a service worker cache is unencrypted and
 * survives sign-out, so a user's private library does not go on disk). So the
 * page tells the truth: your saved *plans* are here, the saved *list* is not.
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
          <strong>Plans you&rsquo;ve already opened or saved.</strong> They&rsquo;re
          stored on this device. Open one from your history, or navigate straight to
          it &mdash; the full cut list, materials, and steps are all there.
        </li>
      </ul>

      <h2>What doesn&rsquo;t</h2>
      <ul className="detail-list">
        <li className="detail-row">
          <strong>Browsing, searching, and your saved list.</strong> These need the
          network. Your saved list isn&rsquo;t stored on the device on purpose
          &mdash; a phone&rsquo;s offline cache isn&rsquo;t encrypted, and your
          library is yours.
        </li>
      </ul>

      <p className="footnote">
        <Link href="/">Try again</Link> once you have a bar of signal.
      </p>
    </main>
  );
}
