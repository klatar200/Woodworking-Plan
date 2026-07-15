import Link from 'next/link';
import { page } from '@/lib/ui'; // Sprint 29: page-shell utilities (retains `page` class)
import { requireUser } from '@/lib/auth';

/**
 * User profile — the Sprint 2 deliverable "user profile".
 *
 * Kept thin. It renders the user's own account record plus a small "activity"
 * section that LINKS to the user-owned surfaces (builds, saves, workshop) — links,
 * not embedded data, so this page stays a cheap account view and each surface keeps
 * owning its own reads and access checks (Sprint 27 added the builds link).
 *
 * DEFENCE IN DEPTH: the middleware already blocks anonymous access to /profile.
 * `requireUser()` is a second, independent check at the point of data access. If
 * the middleware matcher is ever mis-edited, this page still fails closed rather
 * than rendering someone's account to a stranger.
 *
 * Note there is no `userId` parameter anywhere in this file. The user is derived
 * from the verified session. A page that took `/profile/[userId]` would be an
 * IDOR waiting to happen.
 */
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await requireUser();

  const memberSince = user.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main id="main" className={page}>
      <h1>Your profile</h1>
      <p className="subtitle">Account details. Managed through your Clerk account.</p>

      <h2>Account</h2>
      <dl className="detail-list">
        <div className="detail-row">
          <dt>Name</dt>
          <dd>{user.displayName ?? <span className="muted">Not set</span>}</dd>
        </div>
        <div className="detail-row">
          <dt>Email</dt>
          <dd>{user.email ?? <span className="muted">Not set</span>}</dd>
        </div>
        <div className="detail-row">
          <dt>Member since</dt>
          <dd>{memberSince}</dd>
        </div>
      </dl>

      <h2>Your activity</h2>
      <p>
        <Link href="/builds">Your builds</Link> &mdash; every plan you&rsquo;ve reviewed.{' '}
        <Link href="/saved">Saved plans</Link> and{' '}
        <Link href="/workshop">your workshop</Link>.
      </p>

      <p className="footnote">
        Use the account menu in the header to change your name, email, or password.
      </p>
    </main>
  );
}
