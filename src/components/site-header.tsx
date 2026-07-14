import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { clerkAppearance } from '@/lib/clerk-appearance';

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
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="site-header">
        <Link href="/" className="brand">
          Woodworking Plan
        </Link>

        <nav className="site-nav" aria-label="Main">
          {/* Sprint 16. OUTSIDE the SignedIn/SignedOut split on purpose — paths are
              public content, and they are the best argument for signing up that the
              site has. Hiding them behind a login would be exactly backwards. */}
          <Link href="/paths" className="btn btn-ghost">
            Paths
          </Link>

          <SignedOut>
            <Link href="/sign-in" className="btn btn-ghost">
              Log in
            </Link>
            <Link href="/sign-up" className="btn btn-primary">
              Sign up
            </Link>
          </SignedOut>

          <SignedIn>
            <Link href="/saved" className="btn btn-ghost">
              🔖 Saved
            </Link>
            {/* Clerk's menu: profile, account settings, sign out. Re-themed
                (not rebuilt — see DECISIONS_LOG.md "UI redesign") to match the
                mockup's avatar chip: accent-orange circle, ink initial. */}
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
              {/* Our own /profile route (memberSince etc.) isn't part of Clerk's
                  hosted account UI, so it needs its own menu entry — otherwise
                  moving "Profile" out of the header nav and into this dropdown
                  would strand the page with no link to it. */}
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Profile"
                  href="/profile"
                  labelIcon={<span aria-hidden="true">👤</span>}
                />
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
        </nav>
      </header>
    </>
  );
}
