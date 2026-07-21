'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { offlineDownloadUrls } from '@/lib/offline-urls';
import { btn } from '@/lib/ui'; // Sprint 29: shared button class (+ mb from old `.offline-download .btn`)

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
  /** Slugs of every published learning path (Sprint 16). Cached as public content. */
  pathSlugs: string[];
}

export function OfflineDownload({ slugs, collectionIds, pathSlugs }: Props) {
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
     * The list is built by a pure function (src/lib/offline-urls.ts) so it can be tested
     * against the real caching policy directly. Note what is NOT in it: `/profile`. An
     * account page is not something anyone needs with no signal, and the service worker's
     * allowlist would refuse it anyway — but the right place to not ask for it is at the
     * point where we decide.
     */
    const urls = offlineDownloadUrls({
      planSlugs: slugs,
      collectionIds,
      pathSlugs,
    });

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
        className={`${btn} mb-[0.5rem]`}
        onClick={download}
        disabled={status === 'downloading'}
      >
        {status === 'downloading' ? (
          'Downloading…'
        ) : status === 'done' ? (
          <span className="inline-flex items-center gap-[0.35rem]">
            <Check size={15} aria-hidden="true" /> Downloaded
          </span>
        ) : (
          'Make available offline'
        )}
      </button>

      {/* Say plainly what is being agreed to. Consent to something nobody explained is
          not consent. */}
      <p className="muted small">
        Stores your saved plans, their cut lists, your shopping list, and the learning
        paths <strong>on this device</strong> so they work with no signal. This data is{' '}
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
