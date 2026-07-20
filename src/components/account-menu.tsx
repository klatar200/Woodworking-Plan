'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
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
        className="inline-flex items-center justify-center w-[36px] h-[36px] rounded-[50%] overflow-hidden border border-border bg-[#e9a86c] text-fg no-underline cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
      >
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
          <span aria-hidden="true">👤</span>
        )}
      </a>

      <AccountModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
