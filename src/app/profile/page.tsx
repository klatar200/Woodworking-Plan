import Link from 'next/link';
import { page } from '@/lib/ui'; // Sprint 29: page-shell utilities (retains `page` class)
import { requireUser } from '@/lib/auth';
import { WorkshopForm } from '@/components/workshop-form';
import { RateLimitNotice } from '@/components/rate-limit-notice';
import { hasRateLimitNotice } from '@/lib/rate-limit-feedback';

/**
 * User profile — the Sprint 2 deliverable "user profile".
 *
 * Kept thin. It renders the user's own account record plus a small "activity"
 * section that LINKS to the user-owned surfaces (builds, saves) — links, not embedded
 * data, so this page stays a cheap account view and each surface keeps owning its own
 * reads and access checks (Sprint 27 added the builds link).
 *
 * QOL-D (2026-07-19, `DECISIONS_LOG.md`) added ONE embedded section: the Workshop tool
 * picker, which used to be the standalone `/workshop` screen. Keagan's call — a tool
 * list you set once is settings, not a destination, so it lost its header slot and
 * moved here. It is still the same form, the same action and the same security
 * posture; `WorkshopForm` owns its own reads, so this page did not become a data page.
 * `/workshop` still exists as a redirect, so bookmarks and the plan page's "Update your
 * workshop" prompt keep working.
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

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; notice?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);

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
        <Link href="/saved">Saved plans</Link>.
      </p>

      {/* QOL-D item 3 — the Workshop, formerly /workshop. `id` is the redirect target
          (/workshop → /profile#workshop) and the anchor the plan page links to, so it
          must not be renamed without updating both. */}
      <h2 id="workshop">🧰 Your workshop</h2>
      <p className="subtitle">
        Tell us which tools you own. We&rsquo;ll pre-tick the &ldquo;tools you own&rdquo;
        filter on the catalog so you can see what you can build in one click.
      </p>

      <RateLimitNotice
        show={hasRateLimitNotice(params.notice)}
        dismissHref="/profile#workshop"
      />

      {params.saved === '1' ? (
        <p
          className="px-[1rem] py-[0.75rem] my-[1rem] mx-0 border-l-[3px] border-border bg-surface text-[0.9rem]"
          role="status"
        >
          Workshop saved. Your tools are ready on the{' '}
          <Link href="/">catalog filter</Link>.
        </p>
      ) : null}

      <WorkshopForm />

      <p className="footnote">
        Use the account menu in the header to change your name, email, or password.
      </p>
    </main>
  );
}
