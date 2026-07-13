'use client';

import { useEffect, useState } from 'react';

/**
 * "Make available offline" — Sprint 14. The consented download.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * THIS BUTTON IS THE CONSENT. It is the only thing that writes a user's private data
 * to the device, and that is why it exists as an explicit action rather than as a
 * silent optimisation.
 *
 * The service worker will not put anything in the private cache on its own initiative —
 * browsing to /shopping-list while online caches nothing. Only this action does.
 *
 * It also says, in plain words, what the user is agreeing to: the data goes on THIS
 * DEVICE, unencrypted, and is removed when they sign out. People cannot consent to
 * something nobody told them.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A client component, unavoidably — a service worker can only be messaged from the
 * client. It degrades to nothing without JavaScript, which is correct: offline caching
 * is an enhancement, and the app works without it.
 */

type Status = 'idle' | 'downloading' | 'done' | 'unsupported';

interface Props {
  /** Slugs of every saved plan. Their pages AND print views get cached. */
  slugs: string[];
  /** Collection ids, so each collection's shopping list is downloaded too. */
  collectionIds: string[];
}

export function OfflineDownload({ slugs, collectionIds }: Props) {
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DOWNLOAD_COMPLETE') setStatus('done');
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  if (status === 'unsupported' || slugs.length === 0) return null;

  const download = async () => {
    setStatus('downloading');

    /**
     * Everything the user needs in a workshop or a hardware store, and nothing else.
     *
     * Note what is NOT here: `/profile`. An account page is not something anyone needs
     * with no signal, and the service worker's allowlist would refuse it anyway — but
     * the right place to not ask for it is here, at the point where we decide.
     */
    const urls = [
      ...slugs.map((slug) => `/plans/${slug}`),
      // The print view is the sheet that actually goes to the shop (Sprint 13).
      ...slugs.map((slug) => `/plans/${slug}/print`),
      ...slugs.map((slug) => `/plans/${slug}/print?view=cutlist`),
      // The board plan — what to buy. This is the one you want at the lumberyard,
      // which is a warehouse with no signal (Sprint 15).
      ...slugs.map((slug) => `/plans/${slug}/boards`),

      // The whole-library shopping list, and one per collection. THIS is the thing
      // that finally closes the BUSINESS_PLAN.md §5 hardware-store gap.
      '/shopping-list',
      ...collectionIds.map((id) => `/shopping-list?collection=${id}`),

      // The saved list itself, so the app is navigable offline rather than being a
      // set of pages you can only reach if you already know their URLs.
      '/saved',
    ];

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: 'DOWNLOAD_LIBRARY', urls });
    } catch {
      // Non-fatal. The app still works online; the user can retry.
      setStatus('idle');
    }
  };

  return (
    <div className="offline-download">
      <button
        type="button"
        className="btn"
        onClick={download}
        disabled={status === 'downloading'}
      >
        {status === 'downloading'
          ? 'Downloading…'
          : status === 'done'
            ? 'Downloaded ✓'
            : 'Make available offline'}
      </button>

      {/* Say plainly what is being agreed to. Consent to something nobody explained is
          not consent. */}
      <p className="muted small">
        Stores your saved plans, their cut lists, and your shopping list{' '}
        <strong>on this device</strong> so they work with no signal. This data is{' '}
        <strong>removed when you sign out</strong>.
      </p>

      {status === 'done' ? (
        <p className="muted small">
          Ready. Your saved plans and shopping list will now open with no signal.
        </p>
      ) : null}
    </div>
  );
}
