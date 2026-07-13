'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';

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
      /**
       * Cache the plan page AND its print view (Sprint 13).
       *
       * The print view is the sheet that actually goes to the workshop, so caching the
       * plan but not the print view would leave the offline story with a hole exactly
       * where it matters most: you save a plan at home on wifi, drive to the shop, and
       * the one page you want to print is the one that needs a network.
       *
       * The worker re-checks both URLs against isCacheable() — a message from the page
       * is not a reason to trust it.
       */
      for (const url of [`/plans/${slug}`, `/plans/${slug}/print`]) {
        registration.active?.postMessage({ type: 'CACHE_PLAN', url });
      }
    })
    .catch(() => {
      // Non-fatal. See above.
    });
}

/**
 * Wipes the private offline cache on sign-out — Sprint 14.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * THIS IS THE MITIGATION THE WHOLE OFFLINE-LIBRARY DECISION RESTS ON.
 *
 * A service worker cache is unencrypted and survives sign-out by default. Storing a
 * user's saved library and shopping list on the device is only defensible because
 * signing out removes them: a shared, sold, or lost phone must not hand over a library
 * after the user has logged out.
 *
 * ═══ WHY IT WATCHES `isSignedIn` RATHER THAN HANGING OFF A SIGN-OUT BUTTON ═══
 *
 * There is more than one way to sign out: our button, Clerk's `<UserButton>` menu, a
 * session expiring, a session revoked from another device, a token going stale. Wiring
 * the wipe to one button would leave every other path silently keeping the data — and
 * "we forgot that sign-out could also happen *that* way" is exactly how this class of
 * bug ships. Watching the session state catches all of them, because it observes the
 * OUTCOME rather than one of the causes.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Renders nothing.
 */
export function PrivateCacheGuard() {
  const { isLoaded, isSignedIn } = useAuth();

  // Clerk reports `isSignedIn: false` briefly before it has loaded. Firing on that
  // would wipe the cache of a signed-in user on every page load — so we only act on a
  // TRANSITION from signed-in to signed-out, never on the initial value.
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      wasSignedIn.current = true;
      return;
    }

    if (!wasSignedIn.current) return;

    // Signed in a moment ago, signed out now. Wipe.
    wasSignedIn.current = false;

    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready
      .then((registration) => {
        registration.active?.postMessage({ type: 'CLEAR_PRIVATE' });
      })
      .catch(() => {
        // Best-effort. The worker also has no other way to be told, so if this fails
        // the data lingers until the next successful sign-out — which is why the
        // download UI tells the user the data lives on the device.
      });
  }, [isLoaded, isSignedIn]);

  return null;
}
