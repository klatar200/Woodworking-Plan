'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  type BeforeInstallPromptEvent,
  setDeferredPrompt,
  subscribeInstallable,
  isInstallable,
  isInstallableServer,
  promptInstall,
} from '@/lib/install-store';

/**
 * PWA install affordance — REWORKED 2026-07-16 (Keagan's direction).
 *
 * The Sprint-era `<InstallPrompt>` BANNER on the catalog is gone. Install now
 * lives where chrome belongs: the profile dropdown (user-menu.tsx) for a
 * signed-in user, and the mobile drawer (site-header.tsx) for everyone. This
 * file keeps its name — it is still "the install prompt" — but now exports:
 *
 *   - `InstallCapture` — renders nothing; mounted ONCE in the root layout so
 *     the `beforeinstallprompt` listener is attached on EVERY page, before the
 *     browser fires it. The old banner only listened on the catalog, so deep
 *     links never got an install affordance (a known, documented gap — closed
 *     by moving the capture here).
 *   - `InstallMenuItem` — a drawer/menu entry that renders ONLY while the
 *     browser says installing is possible (see src/lib/install-store.ts).
 *
 * `event.preventDefault()` still suppresses the browser's own mini-infobar,
 * so our affordance is the only install prompt shown.
 */

export function InstallCapture() {
  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    // Installed via any path (our prompt, browser UI, another tab): the offer
    // is no longer meaningful, so withdraw it everywhere at once.
    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return null;
}

/**
 * The mobile drawer's "Install app" row. Renders nothing when the browser
 * hasn't offered installability — an install button that cannot install is a
 * dead control, and this one simply doesn't exist instead.
 *
 * `className` comes from the caller so the row styles like its sibling drawer
 * links (the drawer owns its own look; this component owns the behaviour).
 */
export function InstallMenuItem({ className }: { className?: string }) {
  const installable = useSyncExternalStore(
    subscribeInstallable,
    isInstallable,
    isInstallableServer,
  );

  if (!installable) return null;

  return (
    <button type="button" className={className} onClick={() => void promptInstall()}>
      📲 Install app
      <span className="block text-[0.8125rem] text-muted font-normal">
        Faster access, works offline in the shop
      </span>
    </button>
  );
}
