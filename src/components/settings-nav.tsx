'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { isNavActive } from '@/lib/nav-active';

/**
 * Settings left rail — Sprint 47.
 *
 * ONE link list, rendered twice: as the desktop rail (≥lg) and inside the mobile
 * `<details>` drawer. Active state via `usePathname()` + `isNavActive()` (prefix match
 * so `/settings/security/…` Clerk sub-routes still light Security).
 *
 * Sign out calls `clerk.signOut()` — Clerk owns the session. Delete Account is a plain
 * link into the Security pane (Clerk's UserProfile owns the actual delete flow).
 */

const ACTIVE = 'bg-accent-tint text-accent-text font-semibold';
const IDLE = 'text-fg hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)]';
const LINK =
  'block no-underline rounded-[0.375rem] px-[0.75rem] py-[0.5rem] text-[0.9375rem] min-h-[2.75rem] flex items-center focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';

const GROUP_LABEL =
  'px-[0.75rem] pt-[1rem] pb-[0.375rem] text-[0.6875rem] uppercase tracking-[0.06em] text-muted font-semibold';

type NavItem = { href: string; label: string };

const ACCOUNT: NavItem[] = [
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/security', label: 'Security' },
  { href: '/settings/billing', label: 'Billing' },
];

const USING: NavItem[] = [
  { href: '/settings/workshop', label: 'Tools' },
  { href: '/settings/preferences', label: 'Preferences' },
];

const LEGAL: NavItem[] = [{ href: '/settings/terms', label: 'Terms' }];

function NavLinks() {
  const pathname = usePathname();
  const clerk = useClerk();

  function linkClass(href: string): string {
    const active = isNavActive(pathname, href);
    return `${LINK} ${active ? ACTIVE : IDLE}`;
  }

  return (
    <nav aria-label="Settings" className="flex flex-col min-h-0">
      <p className={`${GROUP_LABEL} pt-0`}>Account</p>
      {ACCOUNT.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={linkClass(item.href)}
          aria-current={isNavActive(pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}

      <div className="my-[0.75rem] border-t border-border" role="presentation" />

      <p className={GROUP_LABEL}>Using Notch</p>
      {USING.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={linkClass(item.href)}
          aria-current={isNavActive(pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}

      <div className="my-[0.75rem] border-t border-border" role="presentation" />

      <p className={GROUP_LABEL}>Legal</p>
      {LEGAL.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={linkClass(item.href)}
          aria-current={isNavActive(pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}

      <div className="my-[0.75rem] border-t border-border" role="presentation" />

      <button
        type="button"
        className={`${LINK} ${IDLE} w-full text-left cursor-pointer bg-transparent border-0 font-inherit`}
        onClick={() => void clerk.signOut()}
      >
        Sign out
      </button>

      {/* Spacer pushes Delete Account to the bottom of the rail. */}
      <div className="flex-1 min-h-[1.5rem]" aria-hidden="true" />

      <Link
        href="/settings/security"
        className={`${LINK} text-err`}
      >
        Delete Account
      </Link>
    </nav>
  );
}

/** Desktop left rail — hidden below lg (mobile uses the drawer below). */
export function SettingsRail() {
  return (
    <aside className="hidden lg:flex flex-col border border-border rounded-[0.5rem] bg-surface shadow-e1 p-[0.75rem] self-start lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <NavLinks />
    </aside>
  );
}

/**
 * Mobile settings-sections drawer — a `<details>` so it works with no JS.
 * Rendered in the layout's mobile sub-bar.
 */
export function SettingsMobileNav() {
  return (
    <details className="lg:hidden relative">
      <summary
        className="list-none cursor-pointer inline-flex items-center gap-[0.5rem] min-h-[2.75rem] px-[0.75rem] rounded-[0.375rem] border border-border bg-surface text-fg text-[0.9375rem] font-medium focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
        aria-label="Settings sections"
      >
        <span aria-hidden="true" className="inline-flex flex-col gap-[3px]">
          <span className="block w-[1rem] h-[2px] bg-fg rounded-[1px]" />
          <span className="block w-[1rem] h-[2px] bg-fg rounded-[1px]" />
          <span className="block w-[1rem] h-[2px] bg-fg rounded-[1px]" />
        </span>
        Sections
      </summary>
      <div className="absolute z-10 left-0 right-0 mt-[0.5rem] border border-border rounded-[0.5rem] bg-surface shadow-e2 p-[0.75rem]">
        <NavLinks />
      </div>
    </details>
  );
}

/** Exported for unit tests — the rail's href set (excluding the Delete Account deep-link duplicate). */
export const SETTINGS_NAV_HREFS = [
  ...ACCOUNT.map((i) => i.href),
  ...USING.map((i) => i.href),
  ...LEGAL.map((i) => i.href),
] as const;
