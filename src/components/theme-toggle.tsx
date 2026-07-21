'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';
import {
  subscribeTheme,
  getTheme,
  getThemeServer,
  syncThemeFromDom,
  toggleTheme,
} from '@/lib/theme-store';

/**
 * The theme toggle — Sprint 37.1 (audit D1).
 *
 * Before this sprint the toggle existed in exactly ONE place: inside the account modal,
 * behind the avatar, which only renders for signed-in users. A signed-out visitor could not
 * turn dark mode on at all. This is that same logic extracted once and rendered in three
 * places — the mobile drawer and the footer (both public), and the account modal.
 *
 * `className` comes from the caller, the same contract as `InstallMenuItem`: the drawer,
 * the footer and the modal each own their own look; this component owns the behaviour. All
 * three call sites pass a ≥44px target (Sprint 34's rule).
 *
 * NO-JS TRUTH-TELLING: it renders NOTHING until mounted. The toggle is a JavaScript
 * enhancement — a cookie flip could in principle be a POST form, but a whole server action
 * and rate-limit key for a display preference is out of proportion. A dead button that
 * looks live is worse than no button, so a no-JS visitor simply sees neither.
 *
 * `data-theme-toggle` is load-bearing, not decoration: the mobile drawer closes on any
 * click inside it (see mobile-nav.tsx), and this attribute is how it knows a theme flip is
 * a preference change, not a navigation — the drawer stays open and re-themes under your
 * thumb, which is also the fastest possible feedback that the toggle worked.
 */
export function ThemeToggle({
  className,
  iconSize = 16,
}: {
  className?: string;
  iconSize?: number;
}) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getThemeServer);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Adopt the class already on <html> — set by the server from the cookie, or by the
    // init script from the OS preference. Never guess it.
    syncThemeFromDom();
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      data-theme-toggle=""
    >
      {isDark ? (
        <Sun size={iconSize} aria-hidden="true" />
      ) : (
        <Moon size={iconSize} aria-hidden="true" />
      )}
      {/* The label names the DESTINATION, not the current state ("Dark mode" = switch to
          dark). That is why there is no `aria-pressed` — a toggle whose label already
          changes would then announce two contradictory states. */}
      {isDark ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
