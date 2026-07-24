import { UserProfile } from '@clerk/nextjs';

/**
 * Settings → Security — Sprint 47.
 *
 * Optional catch-all `[[...rest]]` is REQUIRED — Clerk routes its own sub-steps
 * (email verify, MFA, sessions, delete) under this path when `routing="path"`.
 *
 * Appearance is inherited from `<ClerkProvider>` — do NOT re-pass `appearance`.
 * Do NOT reimplement password/email/MFA/session/delete — Clerk owns them.
 * The rail's "Delete Account" item deep-links here.
 */
export const dynamic = 'force-dynamic';

export default function SettingsSecurityPage() {
  return (
    <div>
      <h1 className="!text-[1.5rem] !mt-0 !mb-[0.25rem]">Security</h1>
      <p className="subtitle !mt-0 !mb-[1.5rem]">
        Password, email, sessions, and account deletion — managed by Clerk.
      </p>

      <UserProfile routing="path" path="/settings/security" />
    </div>
  );
}
