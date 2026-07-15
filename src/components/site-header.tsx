import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { UserMenu } from '@/components/user-menu';
import { btnGhost, btnPrimary } from '@/lib/ui';

// Sprint 29 (UI migration, wave 1): the header, brand, nav, skip link and buttons
// moved from hand-written `globals.css` rules to Tailwind utilities. The class
// strings below compile to the same CSS the deleted rules produced (verified in
// SPRINT_LOG.md Sprint 29). Buttons come from the shared `@/lib/ui` constants.
const skipLink =
  'absolute left-[0.5rem] top-[-3rem] z-[100] inline-flex items-center min-h-[2.75rem] px-[1rem] py-0 bg-fg text-surface rounded-b-[0.375rem] no-underline font-medium transition-[top] duration-150 ease-[ease-in-out] focus:top-0';
// `site-header` class RETAINED — the print stylesheet and the desktop layout rule
// (both out of scope this sprint) still target it by class. Utilities added alongside.
const siteHeader =
  'site-header flex items-center justify-between gap-[1rem] px-[1.25rem] py-[0.75rem] border-b border-border sticky top-0 z-10 bg-surface pt-[calc(0.75rem+env(safe-area-inset-top))]';
const brand =
  'font-bold text-[1.125rem] text-fg no-underline focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';
const siteNav = 'flex items-center gap-[0.5rem]';

/**
 * Site header with auth state.
 *
 * `SignedIn` / `SignedOut` render on the server based on the verified session —
 * they are not a client-side "is there a token in localStorage" check. An
 * anonymous visitor never receives the signed-in markup at all.
 *
 * To be explicit, because it's the kind of thing that gets misunderstood: hiding
 * a link is NOT access control. The protection is `auth.protect()` in the
 * middleware, plus `requireUser()` on the page itself. This header is purely
 * navigational sugar on top of boundaries enforced elsewhere.
 */
export function SiteHeader() {
  return (
    <>
      {/*
        Skip link — Sprint 9 accessibility pass. WCAG 2.1 AA, 2.4.1 (Bypass
        Blocks). A keyboard or screen-reader user must not have to tab through
        the header, the search box, and thirty tool checkboxes on every page just
        to reach the plan they came for. Visually hidden until focused.
      */}
      <a href="#main" className={skipLink}>
        Skip to content
      </a>

      <header className={siteHeader}>
        <Link href="/" className={brand}>
          Woodworking Plan
        </Link>

        <nav className={siteNav} aria-label="Main">
          {/* Standard trust nav (2026-07-14) — every stable app has this; the site
              had no Home/About/FAQ at all before. Stub pages for now (About/FAQ
              copy is Keagan's call — public-facing brand voice, not a routine
              engineering decision). OUTSIDE SignedIn/SignedOut: same reasoning as
              Paths below, this is public navigation, not account state. */}
          <Link href="/" className={btnGhost}>
            Home
          </Link>
          {/* Sprint 16. OUTSIDE the SignedIn/SignedOut split on purpose — paths are
              public content, and they are the best argument for signing up that the
              site has. Hiding them behind a login would be exactly backwards. */}
          <Link href="/paths" className={btnGhost}>
            Paths
          </Link>
          <Link href="/about" className={btnGhost}>
            About
          </Link>
          <Link href="/faq" className={btnGhost}>
            FAQ
          </Link>

          <SignedOut>
            <Link href="/sign-in" className={btnGhost}>
              Log in
            </Link>
            <Link href="/sign-up" className={btnPrimary}>
              Sign up
            </Link>
          </SignedOut>

          <SignedIn>
            <Link href="/saved" className={btnGhost}>
              🔖 Saved
            </Link>
            {/* Sprint 27 — the build log. Signed-in only, private route (off the
                allowlist + requireUser); hiding it while signed out is nav sugar, not
                access control. */}
            <Link href="/builds" className={btnGhost}>
              🔨 Builds
            </Link>
            {/* Sprint 25 — the owned-tools profile. Signed-in only (it's a private,
                per-account screen); hiding it from signed-out users is nav sugar, not
                access control — /workshop is off the allowlist and requires a session. */}
            <Link href="/workshop" className={btnGhost}>
              🧰 Workshop
            </Link>
            {/* Clerk's account menu + the theme toggle + our /profile link, as a client
                island (Sprint 31). Onclick can't cross the server boundary, so the menu
                lives in user-menu.tsx; this header stays a server component. */}
            <UserMenu />
          </SignedIn>
        </nav>
      </header>
    </>
  );
}
