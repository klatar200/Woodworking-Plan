import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

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
              Saved
            </Link>
            <Link href="/profile" className="btn btn-ghost">
              Profile
            </Link>
            {/* Clerk's menu: account settings, sign out. */}
            <UserButton />
          </SignedIn>
        </nav>
      </header>
    </>
  );
}
