'use client';

import { useUser } from '@clerk/nextjs';
import { User } from 'lucide-react';

/**
 * Header account control — Sprint 47.
 *
 * Plain avatar link to `/settings/profile`. The account modal is retired; settings
 * is the destination (profile, security, tools, preferences). No dialog/state.
 */
export function AccountMenu() {
  const { user } = useUser();

  return (
    <a
      href="/settings/profile"
      aria-label="Account settings"
      className="inline-flex items-center justify-center min-w-[2.75rem] min-h-[2.75rem] rounded-[50%] text-fg no-underline cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
    >
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
  );
}
