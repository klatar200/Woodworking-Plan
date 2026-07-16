'use client';

/**
 * PWA install-prompt store — 2026-07-16 (Keagan: move install out of the
 * catalog banner, into the profile dropdown + mobile drawer).
 *
 * `beforeinstallprompt` is a ONE-SHOT, capture-early event: the browser fires
 * it once per page load, and only a listener that is already attached gets it.
 * The old banner attached its listener in a catalog-only component, so a
 * visitor landing on a deep link never got an install affordance at all. The
 * listener now attaches from the ROOT LAYOUT (see InstallCapture in
 * install-prompt.tsx), and this module is the single place the captured event
 * lives — a module singleton with a tiny subscribe API, read by the menu
 * items via `useSyncExternalStore`.
 *
 * No nag state: the old banner needed a localStorage "dismissed forever" flag
 * because it interrupted the page. A menu item interrupts nothing — it simply
 * exists while the browser says installing is possible, and disappears when
 * it isn't (unsupported browser, already installed, or the prompt was used).
 */

/** Chrome/Edge-specific event, not yet in TypeScript's DOM lib types. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Called by InstallCapture when the browser offers installability. */
export function setDeferredPrompt(event: BeforeInstallPromptEvent | null): void {
  deferred = event;
  emit();
}

/** `useSyncExternalStore` subscribe function. */
export function subscribeInstallable(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `useSyncExternalStore` snapshot: can we offer an install right now? */
export function isInstallable(): boolean {
  return deferred !== null;
}

/** Server snapshot: SSR can never install. Keeps hydration consistent. */
export function isInstallableServer(): boolean {
  return false;
}

/**
 * Fire the browser's install prompt. Whatever the user chooses, the captured
 * event is spent (the browser only honours `prompt()` once), so availability
 * is cleared and the menu items disappear rather than offering a dead prompt.
 */
export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (!event) return;
  setDeferredPrompt(null);
  await event.prompt();
  await event.userChoice;
}
