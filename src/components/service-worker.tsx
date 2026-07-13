'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker — Sprint 8.
 *
 * The ONLY client component in the app, and it renders nothing. Everything else
 * is server-rendered and works with JavaScript off; this is the one thing that
 * genuinely cannot be (a service worker must be registered from the client).
 *
 * Registration is deliberately non-blocking and failure-tolerant: if it throws —
 * private browsing, an unsupported browser, a blocked origin — the app carries on
 * working exactly as it did before, just without offline support. An offline
 * *enhancement* must never become an online *dependency*.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Wait for load: registering during hydration competes with the resources the
    // user is actually waiting for.
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        // Non-fatal, by design. Log it and move on.
        console.warn('[sw] registration failed:', error);
      });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}

/**
 * Asks the service worker to pre-cache a plan the user just saved.
 *
 * This is what makes BUSINESS_PLAN.md §5's promise real: you save a plan at home
 * on wifi and it is on the device before you reach the workshop. Waiting for the
 * user to open the plan while offline would be too late — that is exactly the
 * moment they have no signal.
 *
 * Fire-and-forget. If there is no service worker, or the message fails, the save
 * itself already succeeded server-side; only the offline copy is missed, and it
 * will be cached the next time the plan is opened with signal.
 */
export function cachePlanForOffline(slug: string): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({
        type: 'CACHE_PLAN',
        url: `/plans/${slug}`,
      });
    })
    .catch(() => {
      // Non-fatal. See above.
    });
}
