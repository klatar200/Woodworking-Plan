'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { User } from 'lucide-react';
import { AccountModal } from '@/components/account-modal';

/**
 * The header account control — QOL-L. Replaces the old Clerk `UserButton` dropdown
 * (`user-menu.tsx`).
 *
 * PROGRESSIVE ENHANCEMENT: the trigger is a real `<a href="/profile">`, so a visitor
 * without JavaScript navigates to the server-rendered profile page (account + workshop).
 * With JS, the click is intercepted and opens the AccountModal instead — same doctrine as
 * every other JS-optional control in this app. The avatar image comes from Clerk's
 * `useUser()` (Clerk always supplies one, a generated initial-avatar if no photo).
 */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();

  return (
    <>
      <a
        href="/profile"
        aria-label="Account"
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        className="inline-flex items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-[50%] text-fg no-underline cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
      >
        {/* Sprint 34 (audit M1): the hit area is 44px (the anchor above), but the visual
            avatar stays a 36px circle — a 44px avatar unbalances the header.

            Sprint 37.5 (dark sweep) fixed two things here. The fill was a literal
            `bg-[#e9a86c]` — the value of `--accent`, so it looked right but had stopped
            tracking the token. Worse, the fallback <User> glyph inherited `text-fg` from
            the anchor: dark ink on orange in light mode (8.5:1), but near-white on orange
            in DARK mode — 1.7:1, an invisible icon. `--accent` is light in BOTH themes,
            which is exactly what `--accent-fg` (dark ink, both themes) exists for. Same
            fix as the active chips and checkbox pills in ui.ts. */}
        <span className="inline-flex items-center justify-center w-[36px] h-[36px] rounded-[50%] overflow-hidden border border-border bg-accent text-accent-fg">
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk avatar, not a plan image
            <img
              src={user.imageUrl}
              alt=""
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={20} aria-hidden="true" />
          )}
        </span>
      </a>

      <AccountModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
