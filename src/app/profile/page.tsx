import { requireUser } from '@/lib/auth';

/**
 * User profile — the Sprint 2 deliverable "user profile".
 *
 * Kept deliberately thin. It renders the user's own account record and nothing
 * else. Saved plans, category folders, and likes belong here eventually, but
 * they are Sprints 6 and 7 — building placeholder UI for them now would be scope
 * drift and would age badly.
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
    <main className="page">
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

      <p className="footnote">
        Saved plans, category folders, and likes arrive in later sprints. Use the
        account menu in the header to change your name, email, or password.
      </p>
    </main>
  );
}
