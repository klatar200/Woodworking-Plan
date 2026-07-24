import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { AccountMenu } from '@/components/account-menu';
import { MobileNav } from '@/components/mobile-nav';
import { HeaderSearch } from '@/components/header-search';
import { NavLink } from '@/components/nav-current';
import { InstallMenuItem } from '@/components/install-prompt';
import { ThemeToggle } from '@/components/theme-toggle';
import { CATALOG_PATH } from '@/lib/routes';
import { BRAND_NAME } from '@/lib/brand';
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
// Sprint 46 (Direction C, Ink & Oak): the header keyline is a 2px OAK rule, not a 1px
// border-border hairline — the structural line that gives every page its chrome authority.
// Oak is graphic-only here (a rule, not text) and the same hex in both themes; the print
// stylesheet hides `.site-header` by class, so it never prints.
const siteHeader =
  'site-header relative flex items-center justify-between gap-[1rem] px-[1.25rem] py-[0.625rem] border-b-2 border-oak sticky top-0 z-10 bg-surface pt-[calc(0.625rem+env(safe-area-inset-top))]';
// Sprint 45: the brand is a LOCKUP now — mark + wordmark in one link. `inline-flex
// min-h-[2.75rem]` keeps the 44px hit area the text-only link satisfied by line-height.
const brand =
  'inline-flex items-center gap-[0.5rem] min-h-[2.75rem] font-bold text-[1.125rem] text-fg no-underline whitespace-nowrap focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';

// Desktop nav link: quiet by default. Sprint 46 (Direction C): hover goes FOREST, the
// direction's single "interactive" signal — green means "do/go", ink means "read", oak is
// structure. (The active page is marked separately: ink + semibold + an oak underline, see
// nav-current.tsx.) 44px tall for touch.
const navLink =
  'inline-flex items-center gap-[0.375rem] min-h-[2.75rem] px-[0.625rem] rounded-[0.375rem] text-[0.9375rem] font-medium text-muted no-underline whitespace-nowrap hover:text-accent-text hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';

// Drawer link: a full-width row with a generous tap target.
const drawerLink =
  'flex items-center gap-[0.5rem] w-full min-h-[2.75rem] px-[0.75rem] rounded-[0.375rem] text-[1rem] font-medium text-fg no-underline text-left bg-transparent border-none cursor-pointer hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-[-2px]';

/**
 * One source for the nav links — the desktop row and the drawer render the same lists
 * with different styling, so they cannot drift.
 *
 * Sprint 49: "Plans" is a plain link to the catalog (matches the `/browse` `<h1>`). The
 * category mega-menu is gone — categories stay on `/browse` and in the footer.
 */
const PUBLIC_NAV = [
  { href: '/', label: 'Home' },
  { href: CATALOG_PATH, label: 'Plans' },
  // QOL-E: "Paths" → "Learning" is a DISPLAY-NAME change only. The URL stays /paths.
  { href: '/paths', label: 'Learning' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
] as const;

// QOL-D: Workshop was REMOVED from this row (Keagan, DECISIONS_LOG.md 2026-07-19).
// Sprint 47: it lives at /settings/workshop.
const SIGNED_IN_NAV = [
  { href: '/saved', label: 'Saved' },
  { href: '/builds', label: 'Builds' }, // Sprint 27
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
        <div className="flex items-center gap-[1.5rem] min-w-0">
          <Link href="/" className={brand}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local brand SVG */}
            <img
              src="/brand/notch-logo.svg"
              alt=""
              width={26}
              height={28}
              className="h-[1.75rem] w-auto"
            />
            {BRAND_NAME}
          </Link>

          <nav className="hidden lg:flex items-center gap-[0.25rem]" aria-label="Main">
            {PUBLIC_NAV.map((item) => (
              <NavLink key={item.href} href={item.href} className={navLink}>
                {item.label}
              </NavLink>
            ))}

            <SignedIn>
              <span className="w-px h-[1.5rem] bg-border mx-[0.5rem]" aria-hidden="true" />
              {SIGNED_IN_NAV.map((item) => (
                <NavLink key={item.href} href={item.href} className={navLink}>
                  {item.label}
                </NavLink>
              ))}
            </SignedIn>
          </nav>
        </div>

        <div className="flex items-center gap-[0.5rem]">
          <HeaderSearch />
          <SignedIn>
            {/* Sprint 47: plain avatar link to /settings/profile (modal retired). */}
            <AccountMenu />
          </SignedIn>

          <SignedOut>
            <div className="hidden lg:flex items-center gap-[0.5rem]">
              <Link href="/sign-in" className={navLink}>
                Log in
              </Link>
              <Link href="/sign-up" className={btnPrimary}>
                Sign up
              </Link>
            </div>
          </SignedOut>

          <MobileNav>
            <form
              action={CATALOG_PATH}
              method="get"
              role="search"
              className="flex items-center gap-[0.375rem] mb-[0.5rem]"
            >
              <label htmlFor="drawer-q" className="visually-hidden">
                Search plans
              </label>
              <input
                id="drawer-q"
                name="q"
                type="search"
                placeholder="Search plans…"
                autoComplete="off"
                className="flex-1 min-w-0 min-h-[2.75rem] px-[0.75rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-1"
              />
              <button
                type="submit"
                className="inline-flex items-center min-h-[2.75rem] px-[0.875rem] rounded-[0.375rem] border border-border bg-transparent text-fg text-[1rem] font-medium whitespace-nowrap cursor-pointer hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
              >
                Search
              </button>
            </form>

            <nav className="flex flex-col gap-[0.125rem]" aria-label="Main menu">
              {PUBLIC_NAV.map((item) => (
                <NavLink key={item.href} href={item.href} className={drawerLink}>
                  {item.label}
                </NavLink>
              ))}

              <SignedIn>
                <span className="block h-px bg-border my-[0.5rem]" aria-hidden="true" />
                {SIGNED_IN_NAV.map((item) => (
                  <NavLink key={item.href} href={item.href} className={drawerLink}>
                    {item.label}
                  </NavLink>
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

              <span className="block h-px bg-border my-[0.5rem]" aria-hidden="true" />
              <ThemeToggle className={drawerLink} />

              <InstallMenuItem className={`${drawerLink} flex-col items-start gap-0! py-[0.5rem]`} />
            </nav>
          </MobileNav>
        </div>
      </header>
    </>
  );
}
