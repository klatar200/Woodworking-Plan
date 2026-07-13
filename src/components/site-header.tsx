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
 * navigational sugar on top of boundaries that are enforced elsewhere.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        Woodworking Plan
      </Link>

      <nav className="site-nav">
        <SignedOut>
          <Link href="/sign-in" className="btn btn-ghost">
            Log in
          </Link>
          <Link href="/sign-up" className="btn btn-primary">
            Sign up
          </Link>
        </SignedOut>

        <SignedIn>
          <Link href="/profile" className="btn btn-ghost">
            Profile
          </Link>
          {/* Clerk's menu: account settings, sign out. */}
          <UserButton />
        </SignedIn>
      </nav>
    </header>
  );
}
