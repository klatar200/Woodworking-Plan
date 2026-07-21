'use client';

import { themeCookie, type Theme } from './theme';

/**
 * Theme store — Sprint 37 (audit D1).
 *
 * WHY A STORE AND NOT `useState` IN THE TOGGLE. Sprint 37 puts the toggle in three places
 * at once (mobile drawer, footer, account modal), and on a phone at least two of them are
 * in the DOM together. With per-instance state, toggling from the drawer would leave the
 * footer button still reading "Dark mode" on an already-dark page — a control lying about
 * system status, which is the class of bug this whole remediation plan is closing. A module
 * singleton read through `useSyncExternalStore` keeps every instance in step.
 *
 * Same shape as `install-store.ts`, deliberately — one established pattern for "browser
 * state several chrome components must agree on", not two.
 *
 * `<html class="dark">` remains the SOURCE OF TRUTH. This module never guesses the current
 * theme: it adopts the class the server (from the cookie) or the init script (from the OS
 * preference) already stamped. See `syncThemeFromDom`.
 */

let current: Theme = 'light';
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** `useSyncExternalStore` subscribe function. */
export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `useSyncExternalStore` snapshot. */
export function getTheme(): Theme {
  return current;
}

/**
 * Server snapshot. Always `light` — SSR cannot know the OS preference, and the toggle
 * renders nothing until mounted anyway, so this value is never shown to anyone.
 */
export function getThemeServer(): Theme {
  return 'light';
}

/**
 * Adopt whatever `<html>` is already carrying. Called by every toggle on mount, so the
 * store agrees with the document however the class got there — cookie (server-stamped) or
 * OS preference (init script). Idempotent: no listeners fire when nothing changed.
 */
export function syncThemeFromDom(): void {
  const next: Theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  if (next === current) return;
  current = next;
  emit();
}

/**
 * Flip the theme, and PIN it. Writing the cookie on every toggle is what makes an explicit
 * choice beat the OS from then on — including the case a naive `prefers-color-scheme`
 * implementation gets wrong: choosing LIGHT on an OS-dark machine must stick.
 */
export function toggleTheme(): void {
  const nowDark = document.documentElement.classList.toggle('dark');
  current = nowDark ? 'dark' : 'light';
  document.cookie = themeCookie(current);
  emit();
}
