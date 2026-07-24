import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { ProfileFieldsForm } from '@/components/profile-fields-form';

/**
 * Settings → Profile — Sprint 47.
 *
 * Three cards: Account (Clerk read-only), Personal Information, Professional
 * Information. Name/email/avatar stay with Clerk (Security pane); phone/company/
 * jobTitle/website are ours.
 */
export const dynamic = 'force-dynamic';

const CARD =
  'bg-surface border border-border rounded-[0.5rem] shadow-e1 p-[1.25rem]';
const LABEL = 'block text-[0.8125rem] text-muted mb-[0.25rem]';
const VALUE = 'text-[0.9375rem] text-fg break-words';

export default async function SettingsProfilePage() {
  const user = await requireUser();

  const memberSince = user.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <h1 className="!text-[1.5rem] !mt-0 !mb-[0.25rem]">Profile</h1>
      <p className="subtitle !mt-0 !mb-[1.5rem]">
        Your account details and optional contact info.
      </p>

      <section className={`${CARD} mb-[1.25rem]`}>
        <h2 className="!text-[1.125rem] !mt-0 !mb-[1rem]">Account</h2>
        <div className="flex items-center gap-[0.875rem] mb-[1rem]">
          {user.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk avatar
            <img
              src={user.imageUrl}
              alt=""
              width={56}
              height={56}
              className="rounded-[50%] border border-border"
            />
          ) : (
            <span
              className="inline-flex items-center justify-center w-[56px] h-[56px] rounded-[50%] border border-border bg-accent text-accent-fg text-[1.25rem] font-semibold"
              aria-hidden="true"
            >
              {(user.displayName ?? user.email ?? '?').slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {user.displayName ?? <span className="muted">Your account</span>}
            </div>
            <div className="text-[0.9375rem] text-muted truncate">
              {user.email ?? ''}
            </div>
          </div>
        </div>
        <div className="mb-[1rem]">
          <span className={LABEL}>Member since</span>
          <p className={`${VALUE} m-0`}>{memberSince}</p>
        </div>
        <p className="m-0">
          <Link href="/settings/security" className="text-accent-text">
            Manage in Security
          </Link>
        </p>
      </section>

      <ProfileFieldsForm
        phone={user.phone}
        company={user.company}
        jobTitle={user.jobTitle}
        website={user.website}
      />
    </div>
  );
}
