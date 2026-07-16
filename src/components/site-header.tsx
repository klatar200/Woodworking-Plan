import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { UserMenu } from '@/components/user-menu';
import { MobileNav } from '@/components/mobile-nav';
import { InstallMenuItem } from '@/components/install-prompt';
import { btnPrimary } from '@/lib/ui';

// Sprint 29 (UI migration, wave 1): the header moved to Tailwind utilities.
// REDESIGNED 2026-07-16 (Keagan): cleaner desktop nav — quiet text links with ONE
// primary CTA instead of a row of eight identical outlined buttons — and, below
// `lg`, a hamburger that opens a drawer (mobile-nav.tsx) instead of a scrolling
// button row.
const skipLink =
  'absolute left-[0.5rem] top-[-3rem] z-[100] inline-flex items-center min-h-[2.75rem] px-[1rem] py-0 bg-fg text-surface rounded-b-[0.375rem] no-underline font-medium transition-[top] duration-150 ease-[ease-in-out] focus:top-0';
// `site-header` class RETAINED — the print stylesheet still targets it. `relative`
// is load-bearing: the mobile drawer positions itself against the header
// (absolute + top-full in mobile-nav.tsx).
const siteHeader =
  'site-header relative flex items-center justify-between gap-[1rem] px-[1.25rem] py-[0.625rem] border-b border-border sticky top-0 z-10 bg-surface pt-[calc(0.625rem+env(safe-area-inset-top))]';
const brand =
  'font-bold text-[1.125rem] text-fg no-underline whitespace-nowrap focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';

// Desktop nav link: quiet by default, ink on hover. 44px tall for touch.
const navLink =
  'inline-flex items-center gap-[0.375rem] min-h-[2.75rem] px-[0.625rem] rounded-[0.375rem] text-[0.9375rem] font-medium text-muted no-underline whitespace-nowrap hover:text-fg hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';

// Drawer link: a full-width row with a generous tap target.
const drawerLink =
  'flex items-center gap-[0.5rem] w-full min-h-[2.75rem] px-[0.75rem] rounded-[0.375rem] text-[1rem] font-medium text-fg no-underline text-left bg-transparent border-none cursor-pointer hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-[-2px]';

/** One source for the nav links — the desktop row and the drawer render the
 *  same lists with different styling, so they cannot drift. */
const PUBLIC_NAV = [
  // Standard trust nav (2026-07-14). Public navigation, not account state —
  // paths especially are the best argument for signing up the site has.
  { href: '/', label: 'Home' },
  { href: '/paths', label: 'Paths' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
] as const;

const SIGNED_IN_NAV = [
  { href: '/saved', label: 'Saved', icon: '🔖' },
  { href: '/builds', label: 'Builds', icon: '🔨' }, // Sprint 27
  { href: '/workshop', label: 'Workshop', icon: '🧰' }, // Sprint 25
] as const;

/**
 * Site header with auth state.
 *
 * `SignedIn` / `SignedOut` render on the server based on the verified session.
 * Hiding a link is NOT access control — the protection is `auth.protect()` in
 * the middleware plus `requireUser()` on each private page. This header is
 * navigational sugar over boundaries enforced elsewhere.
 */
export function SiteHeader() {
  return (
    <>
      {/* Skip link — WCAG 2.4.1. Visually hidden until focused. */}
      <a href="#main" className={skipLink}>
        Skip to content
      </a>

      <header className={siteHeader}>
        <Link href="/" className={brand}>
          Woodworking Plan
        </Link>

        {/* ---- Desktop nav (≥ lg): quiet text links, one primary CTA ---- */}
        <nav className="hidden lg:flex items-center gap-[0.25rem]" aria-label="Main">
          {PUBLIC_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={navLink}>
              {item.label}
            </Link>
          ))}

          <SignedIn>
            {/* A hairline divider separates "the site" from "your stuff". */}
            <span className="w-px h-[1.5rem] bg-border mx-[0.5rem]" aria-hidden="true" />
            {SIGNED_IN_NAV.map((item) => (
              <Link key={item.href} href={item.href} className={navLink}>
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </SignedIn>

          <SignedOut>
            <Link href="/sign-in" className={navLink}>
              Log in
            </Link>
            <Link href="/sign-up" className={`${btnPrimary} ml-[0.5rem]`}>
              Sign up
            </Link>
          </SignedOut>
        </nav>

        {/* ---- Right cluster on mobile: avatar (signed in) + hamburger ---- */}
        <div className="flex items-center gap-[0.5rem]">
          <SignedIn>
            {/* Clerk's account menu + theme toggle + install action, as a client
                island (Sprint 31 / 2026-07-16). Outside the drawer so the avatar
                is always one tap away at any width. */}
            <UserMenu />
          </SignedIn>

          {/* The drawer (below lg). Server-rendered links passed through the
              client island — see mobile-nav.tsx. */}
          <MobileNav>
            <nav className="flex flex-col gap-[0.125rem]" aria-label="Main menu">
              {PUBLIC_NAV.map((item) => (
                <Link key={item.href} href={item.href} className={drawerLink}>
                  {item.label}
                </Link>
              ))}

              <SignedIn>
                <span className="block h-px bg-border my-[0.5rem]" aria-hidden="true" />
                {SIGNED_IN_NAV.map((item) => (
                  <Link key={item.href} href={item.href} className={drawerLink}>
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </SignedIn>

              <SignedOut>
                <span className="block h-px bg-border my-[0.5rem]" aria-hidden="true" />
                <Link href="/sign-in" className={drawerLink}>
                  Log in
                </Link>
                <Link href="/sign-up" className={`${btnPrimary} mt-[0.25rem] justify-center`}>
                  Sign up
                </Link>
              </SignedOut>

              {/* Install the PWA — renders only while the browser offers it.
                  Signed-out mobile users get their affordance here; signed-in
                  users have it in the profile dropdown too. */}
              <InstallMenuItem className={`${drawerLink} flex-col items-start gap-0 py-[0.5rem]`} />
            </nav>
          </MobileNav>
        </div>
      </header>
    </>
  );
}
