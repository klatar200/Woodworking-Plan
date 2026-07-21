'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useUser, useClerk } from '@clerk/nextjs';
import { Hammer, Bookmark, Download, Settings, Wrench, X } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { btnGhost } from '@/lib/ui';
import {
  subscribeInstallable,
  isInstallable,
  isInstallableServer,
  promptInstall,
} from '@/lib/install-store';

const sectionLabel =
  'text-[0.75rem] uppercase tracking-[0.06em] text-muted mt-[1.25rem] mb-[0.5rem]';

/**
 * The account modal — QOL-L (2026-07-20 decision, `DECISIONS_LOG.md`).
 *
 * OUR OWN modal, not Clerk's pre-built `<UserProfile>`: a native `<dialog>` (free focus
 * trap, Esc-to-close, top-layer stacking, `::backdrop`) whose content and behaviour we
 * control. Opened from the header avatar (`account-menu.tsx`).
 *
 * WHAT WE OWN: presentation + our data. Account summary comes from Clerk's `useUser()`
 * (name/email/avatar/member-since); the theme toggle and install action moved here from
 * the old `UserButton` dropdown.
 *
 * ⚖️ Sprint 41.4 (audit H4, Keagan 2026-07-21): THE WORKSHOP PICKER IS NOT HERE ANY MORE.
 * It existed twice — this modal's client-side copy (fetch `/api/workshop`, save through
 * `saveWorkshopModalAction`) and the real form at `/profile#workshop` — with two save
 * paths free to drift, and the plan page's "Update your workshop" prompt already pointed
 * at the profile one. The modal now LINKS there. What that deleted: ~90 lines of
 * fetch/state/save plumbing, a server action, and an authenticated API route, i.e. a
 * whole endpoint's worth of attack surface for a screen that already existed.
 *
 * WHAT STAYS WITH CLERK: every credential/security operation. "Manage account & security"
 * opens Clerk's own UI (`clerk.openUserProfile()`) and sign-out is `clerk.signOut()`. We do
 * NOT reimplement password/email/MFA/session/delete flows — that boundary is the whole
 * point of using Clerk (security decision, logged 2026-07-20).
 *
 * The no-JS path is `/profile` (unchanged): the header avatar is a real `<a href="/profile">`
 * that this modal only enhances, so a visitor without JS still reaches account + workshop.
 */
export function AccountModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { user } = useUser();
  const clerk = useClerk();

  // Drive the native dialog from the `open` prop. showModal() is what puts it in the top
  // layer with a backdrop and a focus trap; a plain `open` attribute would not.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open]);

  // --- theme: see <ThemeToggle> in Preferences below. Sprint 37.1 extracted this modal's
  // inline toggle into a shared component so the mobile drawer and the footer can render
  // the SAME control — dark mode was signed-in-only until then (audit D1). It is a shared
  // store, not local state, so all three instances agree at once.

  // --- install (moved from UserMenu) ---
  const installable = useSyncExternalStore(
    subscribeInstallable,
    isInstallable,
    isInstallableServer,
  );

  const memberSince = user?.createdAt
    ? user.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // Close on a backdrop click (native <dialog> doesn't do this on its own): a click
      // whose target is the dialog element itself landed outside the inner content.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-label="Account"
      // Sprint 41.1 (audit V1): `shadow-e3`. The `::backdrop` stays a literal — a scrim
      // is not elevation, it is a dimmed page, and it must read the same in both themes.
      className="w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100vh-4rem)] overflow-y-auto p-0 border border-border rounded-[0.75rem] bg-surface text-fg shadow-e3 [&::backdrop]:bg-[rgba(0,0,0,0.45)]"
    >
      <div className="p-[1.25rem]">
        <div className="flex items-center justify-between gap-[1rem]">
          <h2 className="m-0 text-[1.125rem]">Account</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center min-h-[2.75rem] min-w-[2.75rem] rounded-[0.375rem] border border-border bg-transparent text-fg cursor-pointer hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* --- Account summary (Clerk data) --- */}
        <div className="flex items-center gap-[0.875rem] mt-[1rem]">
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk avatar, not a plan image
            <img
              src={user.imageUrl}
              alt=""
              width={48}
              height={48}
              className="rounded-[50%] border border-border"
            />
          ) : null}
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {user?.fullName ?? <span className="muted">Your account</span>}
            </div>
            <div className="text-[0.9375rem] text-muted truncate">
              {user?.primaryEmailAddress?.emailAddress ?? ''}
            </div>
            {memberSince ? (
              <div className="text-[0.8125rem] text-muted">Member since {memberSince}</div>
            ) : null}
          </div>
        </div>

        {/* --- Activity --- */}
        <h3 className={sectionLabel}>Your activity</h3>
        <div className="flex flex-wrap gap-[0.5rem]">
          <Link href="/builds" className={`${btnGhost} gap-[0.5rem]`} onClick={onClose}>
            <Hammer size={16} aria-hidden="true" /> Your builds
          </Link>
          <Link href="/saved" className={`${btnGhost} gap-[0.5rem]`} onClick={onClose}>
            <Bookmark size={16} aria-hidden="true" /> Saved plans
          </Link>
        </div>

        {/* --- Workshop: a POINTER to the one picker, not a second one (41.4) --- */}
        <h3 className={sectionLabel}>Your workshop</h3>
        <p className="mt-0 mb-[0.625rem] text-[0.875rem] text-muted">
          The tools you own pre-fill the &ldquo;tools you own&rdquo; filter, so the
          catalog can show you what you can build today.
        </p>
        <div className="flex flex-wrap gap-[0.5rem]">
          <Link
            href="/profile#workshop"
            className={`${btnGhost} gap-[0.5rem]`}
            onClick={onClose}
          >
            <Wrench size={16} aria-hidden="true" /> Manage your workshop
          </Link>
        </div>

        {/* --- Preferences --- */}
        <h3 className={sectionLabel}>Preferences</h3>
        <div className="flex flex-wrap gap-[0.5rem]">
          <ThemeToggle className={`${btnGhost} gap-[0.5rem]`} />
          {installable ? (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className={`${btnGhost} gap-[0.5rem]`}
            >
              <Download size={16} aria-hidden="true" /> Install app
            </button>
          ) : null}
        </div>

        {/* --- Account & security (deferred to Clerk) --- */}
        <h3 className={sectionLabel}>Account &amp; security</h3>
        <div className="flex flex-wrap gap-[0.5rem]">
          <button
            type="button"
            onClick={() => {
              onClose();
              clerk.openUserProfile();
            }}
            className={`${btnGhost} gap-[0.5rem]`}
          >
            <Settings size={16} aria-hidden="true" /> Manage account &amp; security
          </button>
          <button
            type="button"
            onClick={() => void clerk.signOut()}
            className={btnGhost}
          >
            Sign out
          </button>
        </div>
      </div>
    </dialog>
  );
}
