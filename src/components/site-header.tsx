import { Fragment } from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { AccountMenu } from '@/components/account-menu';
import { MobileNav } from '@/components/mobile-nav';
import { BrowseMenu } from '@/components/browse-menu';
import { HeaderSearch } from '@/components/header-search';
import { InstallMenuItem } from '@/components/install-prompt';
import { NAV_CATEGORIES } from '@/lib/nav-categories';
import { CATALOG_PATH } from '@/lib/routes';
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
  // The Browse menu is rendered between Home and Paths; see below.
  { href: '/', label: 'Home' },
  // QOL-E: "Paths" → "Learning" is a DISPLAY-NAME change only. The URL stays /paths —
  // renaming the route would rewrite every saved library's offline download list
  // (src/lib/offline-urls.ts), invalidate the service-worker entries already holding
  // those URLs, and break existing links, all for a label.
  { href: '/paths', label: 'Learning' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
] as const;

// QOL-D: `🧰 Workshop` was REMOVED from this row (Keagan, DECISIONS_LOG.md
// 2026-07-19). The tool picker is settings — you set it once — so it does not earn a
// permanent nav slot; it lives at /profile#workshop and is prompted from the plan page
// where someone actually discovers they need it. /workshop still redirects there, so
// nothing anyone bookmarked broke.
const SIGNED_IN_NAV = [
  { href: '/saved', label: 'Saved', icon: '🔖' },
  { href: '/builds', label: 'Builds', icon: '🔨' }, // Sprint 27
] as const;

/**
 * QOL-D — the category menu (`DECISIONS_LOG.md` 2026-07-19).
 *
 * Categories used to exist ONLY on the catalog page (the Sprint 18 desktop rail and the
 * filter panel's `<select>`), so a reader on a plan, a path or the FAQ had no way to
 * browse by category at all. These are plain GET links into the catalog — the same
 * `?category=` the rail and the filter already produce — so results stay URL-driven and
 * a shared link renders identically for everyone. No new query path, no new capability.
 *
 * The links are built here, in the SERVER component, and passed into the client
 * disclosure islands as children. `NAV_CATEGORIES` is a build-time constant read from
 * the seed's own `content/categories.json` — deliberately NOT a database call, because
 * this renders in the root layout on every page including the prerendered `/_not-found`
 * (see src/lib/nav-categories.ts for the full reasoning).
 */
function categoryLinks(linkClass: string) {
  return (
    <>
      <Link href={CATALOG_PATH} className={linkClass}>
        All plans
      </Link>
      {NAV_CATEGORIES.map((category) => (
        <Link
          key={category.slug}
          href={`${CATALOG_PATH}?category=${category.slug}`}
          className={linkClass}
        >
          {category.name}
        </Link>
      ))}
    </>
  );
}

// The Browse trigger reuses `navLink`'s look so it sits in the row as a peer of the
// other items, with the marker suppressed (the ▾ in browse-menu.tsx is the affordance).
const browseSummary = `list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none ${navLink}`;
const browsePanel =
  'absolute top-full left-0 z-20 mt-[0.25rem] min-w-[14rem] flex flex-col gap-[0.125rem] p-[0.5rem] bg-surface border border-border rounded-[0.5rem] shadow-[0_8px_24px_rgba(0,0,0,0.14)]';
// Inside the mobile drawer the panel is not floating — it is an indented block, so the
// drawer keeps growing downward instead of overlaying itself.
const browsePanelMobile = 'flex flex-col gap-[0.125rem] pl-[0.75rem]';

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
        {/* ---- Left group: brand + desktop nav ----
            QOL-J: the brand and the nav are ONE flex group so the nav sits right beside
            the logo, instead of `justify-between` pushing it to the middle of the bar. */}
        <div className="flex items-center gap-[1.5rem] min-w-0">
        <Link href="/" className={brand}>
          Woodworking Plan
        </Link>

        {/* ---- Desktop nav (≥ lg): quiet text links, one primary CTA ---- */}
        <nav className="hidden lg:flex items-center gap-[0.25rem]" aria-label="Main">
          {PUBLIC_NAV.map((item) => (
            <Fragment key={item.href}>
              <Link href={item.href} className={navLink}>
                {item.label}
              </Link>
              {/* Browse sits directly after Home — it is the catalog, expanded. */}
              {item.href === '/' ? (
                <BrowseMenu
                  label="Browse"
                  className="relative"
                  summaryClassName={browseSummary}
                  panelClassName={browsePanel}
                >
                  {categoryLinks(drawerLink)}
                </BrowseMenu>
              ) : null}
            </Fragment>
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
          {/* QOL-J (2026-07-20, Keagan): Log in / Sign up moved OUT of this left nav group
              to the right of the search bar — see the right group below. */}
        </nav>
        </div>

        {/* ---- Right group: desktop search + account avatar + mobile hamburger ---- */}
        <div className="flex items-center gap-[0.5rem]">
          {/* QOL-J: a search reachable from every page, not just the catalog. Desktop-only
              (hidden below lg); mobile searches via the catalog page's own box. */}
          <HeaderSearch />
          <SignedIn>
            {/* QOL-L: our own account modal, opened from the avatar. Replaces the Clerk
                UserButton dropdown; theme toggle + install live inside the modal now.
                Outside the drawer so the avatar is always one tap away at any width. */}
            <AccountMenu />
          </SignedIn>

          {/* QOL-J (2026-07-20, Keagan): the signed-out auth links live here, to the RIGHT
              of the search bar. Desktop-only (`hidden lg:flex`) — on mobile they're in the
              drawer, unchanged. Sign up stays the one filled primary CTA. */}
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

          {/* The drawer (below lg). Server-rendered links passed through the
              client island — see mobile-nav.tsx. */}
          <MobileNav>
            <nav className="flex flex-col gap-[0.125rem]" aria-label="Main menu">
              {PUBLIC_NAV.map((item) => (
                <Fragment key={item.href}>
                  <Link href={item.href} className={drawerLink}>
                    {item.label}
                  </Link>
                  {/* Same six links as the desktop menu, as an inline collapsible
                      section rather than a floating panel — a drawer that overlays
                      itself is unusable. MobileNav is taught not to close when the
                      click was on a <summary>, or opening this would shut the drawer. */}
                  {item.href === '/' ? (
                    <BrowseMenu
                      label="Browse by category"
                      summaryClassName={`list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none ${drawerLink}`}
                      panelClassName={browsePanelMobile}
                    >
                      {categoryLinks(drawerLink)}
                    </BrowseMenu>
                  ) : null}
                </Fragment>
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
              {/* gap-0! (important): drawerLink's gap-[0.5rem] is emitted later in
                  Tailwind's fixed source order and would otherwise win. */}
              <InstallMenuItem className={`${drawerLink} flex-col items-start gap-0! py-[0.5rem]`} />
            </nav>
          </MobileNav>
        </div>
      </header>
    </>
  );
}
