'use client';

import { useEffect, useState } from 'react';
import { btnGhost, btnPrimary } from '@/lib/ui'; // Sprint 29: shared button classes

/**
 * Chrome/Edge-specific event, not yet in TypeScript's DOM lib types.
 * https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'ww_install_dismissed';
const SHOW_DELAY_MS = 3000;

/**
 * "Install Woodworking Plan" banner — closes a real Sprint 8 gap. The app has
 * been installable (manifest + service worker) since Sprint 8, but nothing
 * ever surfaced an install AFFORDANCE; the browser's own mini-infobar is easy
 * to miss and easy to dismiss by accident. BUSINESS_PLAN.md §5 calls "faster
 * access, works offline in the shop" the whole point of being a PWA, so it is
 * worth asking for directly rather than leaving it to chance.
 *
 * Mounted on the catalog page only (matches the mockup — see
 * src/app/page.tsx). Known, stated limitation: the `beforeinstallprompt`
 * listener has to be attached BEFORE the browser decides to fire the event,
 * so a visitor who lands on a deep link (e.g. a shared plan URL) before ever
 * hitting `/` may not get this banner on that visit. Not worth solving by
 * mounting a listener on every page for one edge case.
 *
 * `event.preventDefault()` suppresses the browser's own mini-infobar so this
 * banner is the only install prompt shown, matching the mockup.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const dismissForever = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Private browsing or storage disabled. Non-fatal — worst case the
      // banner can reappear on a later visit.
    }
  };

  useEffect(() => {
    let alreadyDismissed = false;
    try {
      alreadyDismissed = localStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
      // Treat as "not dismissed" if storage isn't available.
    }
    if (alreadyDismissed) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      // Same delay as the mockup — let the page settle before asking.
      setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };

    // Already installed via some other path (browser UI, another visit) —
    // stop asking.
    const onInstalled = () => dismissForever();

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // Whether accepted or dismissed, don't ask again this browser — asking on
    // every visit after someone already answered is exactly the kind of nag
    // that gets a PWA's install prompt permanently ignored.
    dismissForever();
  };

  if (!visible || !deferred) return null;

  return (
    <div
      className="flex items-center gap-[0.75rem] flex-wrap my-[1rem] mx-0 px-[1rem] py-[0.75rem] bg-accent-tint border border-accent-tint-border rounded-[0.5rem]"
      role="region"
      aria-label="Install this app"
    >
      <span
        className="flex-none flex items-center justify-center w-[2.375rem] h-[2.375rem] bg-surface border border-accent-tint-border rounded-[0.5625rem] text-[1rem]"
        aria-hidden="true"
      >
        🪚
      </span>
      <div className="flex-1 min-w-[12rem]">
        <p className="m-0 font-bold text-[0.9375rem]">Install Woodworking Plan</p>
        <p className="m-0 text-[0.8125rem] text-[#7a5316]">
          Faster access, works offline in the shop
        </p>
      </div>
      <button type="button" className={btnGhost} onClick={dismissForever}>
        Not now
      </button>
      <button type="button" className={btnPrimary} onClick={install}>
        Install
      </button>
    </div>
  );
}
