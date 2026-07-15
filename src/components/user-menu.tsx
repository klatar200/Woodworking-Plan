'use client';

import { useEffect, useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { clerkAppearance } from '@/lib/clerk-appearance';

/**
 * The signed-in account menu — Sprint 31.
 *
 * A client island so the theme toggle can live INSIDE Clerk's `UserButton` dropdown, per
 * Keagan's placement decision (DECISIONS_LOG.md 2026-07-16). `UserButton.Action` with an
 * `onClick` is the v6 (`@clerk/nextjs` ^6.12) way to add a custom item to that menu — the
 * whole thing has to be a client component because `onClick` can't cross the server→client
 * boundary. `SiteHeader` stays a server component and renders this island.
 *
 * The toggle flips the `dark` class on <html> AND writes the `theme` cookie, so the change
 * is instant (no reload) and the SERVER picks it up on the next render (root layout reads
 * the cookie) — which is what keeps there from being a flash of the wrong theme.
 */
export function UserMenu() {
  const [isDark, setIsDark] = useState(false);

  // Sync the label to whatever the server already applied (read after mount to avoid a
  // hydration mismatch — the server rendered from the cookie, this reads the live class).
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const nowDark = document.documentElement.classList.toggle('dark');
    // 1-year cookie; Lax so it rides normal navigations. Not HttpOnly — it's a display
    // preference the client must set, and it carries nothing sensitive.
    document.cookie = `theme=${nowDark ? 'dark' : 'light'}; path=/; max-age=31536000; SameSite=Lax`;
    setIsDark(nowDark);
  };

  return (
    <UserButton
      appearance={{
        ...clerkAppearance,
        elements: {
          avatarBox: {
            width: '36px',
            height: '36px',
            backgroundColor: '#e9a86c',
          },
        },
      }}
    >
      <UserButton.MenuItems>
        {/* The theme toggle. Label reflects the ACTION (what tapping it does), so it reads
            correctly whichever theme you're in. */}
        <UserButton.Action
          label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          labelIcon={<span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>}
          onClick={toggleTheme}
        />
        {/* Our own /profile route (memberSince etc.) isn't part of Clerk's hosted account
            UI, so it needs its own menu entry. */}
        <UserButton.Link
          label="Profile"
          href="/profile"
          labelIcon={<span aria-hidden="true">👤</span>}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
