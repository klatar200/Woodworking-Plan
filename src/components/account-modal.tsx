'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useUser, useClerk } from '@clerk/nextjs';
import { Hammer, Bookmark, Sun, Moon, Download, Settings, X, Check } from 'lucide-react';
import { btnPrimary, btnGhost, checkbox, checkboxInput } from '@/lib/ui';
import {
  subscribeInstallable,
  isInstallable,
  isInstallableServer,
  promptInstall,
} from '@/lib/install-store';
import {
  saveWorkshopModalAction,
  type WorkshopSaveResult,
} from '@/app/actions/workshop';

interface Tool {
  slug: string;
  name: string;
  category: string | null;
}

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
 * (name/email/avatar/member-since); the Workshop tool picker is rebuilt to work in-modal
 * (fetch `/api/workshop`, save via the result-returning `saveWorkshopModalAction`, show an
 * in-modal result — never a full-page redirect); the theme toggle and install action moved
 * here from the old `UserButton` dropdown.
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

  // --- theme (moved from UserMenu) ---
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);
  const toggleTheme = () => {
    const nowDark = document.documentElement.classList.toggle('dark');
    document.cookie = `theme=${nowDark ? 'dark' : 'light'}; path=/; max-age=31536000; SameSite=Lax`;
    setIsDark(nowDark);
  };

  // --- install (moved from UserMenu) ---
  const installable = useSyncExternalStore(
    subscribeInstallable,
    isInstallable,
    isInstallableServer,
  );

  // --- workshop (fetched the first time the modal opens) ---
  const [tools, setTools] = useState<Tool[] | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<WorkshopSaveResult | null>(null);

  useEffect(() => {
    if (!open || tools !== null) return; // fetch once, on first open
    let cancelled = false;
    fetch('/api/workshop')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((data: { tools: Tool[]; owned: string[] }) => {
        if (cancelled) return;
        setTools(data.tools);
        setOwned(new Set(data.owned));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tools]);

  const toggleTool = (slug: string) => {
    setOwned((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    setSaveResult(null); // a change invalidates the last "Saved"
  };

  const saveWorkshop = async () => {
    setSaving(true);
    setSaveResult(null);
    const result = await saveWorkshopModalAction([...owned]);
    setSaveResult(result);
    setSaving(false);
  };

  const memberSince = user?.createdAt
    ? user.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Group tools by category, same as the workshop form / filter panel.
  const grouped = new Map<string, Tool[]>();
  for (const tool of tools ?? []) {
    const key = tool.category ?? 'Other';
    const list = grouped.get(key) ?? [];
    list.push(tool);
    grouped.set(key, list);
  }

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
      className="w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100vh-4rem)] overflow-y-auto p-0 border border-border rounded-[0.75rem] bg-surface text-fg shadow-[0_16px_48px_rgba(0,0,0,0.28)] [&::backdrop]:bg-[rgba(0,0,0,0.45)]"
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

        {/* --- Workshop --- */}
        <h3 className={sectionLabel}>Your workshop</h3>
        <p className="mt-0 mb-[0.625rem] text-[0.875rem] text-muted">
          Tick the tools you own. We&rsquo;ll pre-fill the &ldquo;tools you own&rdquo;
          filter on the catalog. Saving replaces your list.
        </p>

        {loadError ? (
          <p className="text-[0.875rem] text-err" role="alert">
            Couldn&rsquo;t load your tools. Manage them on your{' '}
            <Link href="/profile#workshop" onClick={onClose}>
              profile page
            </Link>{' '}
            instead.
          </p>
        ) : tools === null ? (
          <p className="text-[0.875rem] text-muted">Loading your tools…</p>
        ) : (
          <>
            {[...grouped.entries()].map(([group, groupTools]) => (
              <div key={group} className="mb-[0.75rem]">
                <span className="block text-[0.8125rem] text-muted mb-[0.375rem]">
                  {group}
                </span>
                <div className="flex flex-wrap gap-[0.375rem]">
                  {groupTools.map((tool) => (
                    <label key={tool.slug} className={checkbox}>
                      <input
                        type="checkbox"
                        checked={owned.has(tool.slug)}
                        onChange={() => toggleTool(tool.slug)}
                        className={checkboxInput}
                      />
                      <span>{tool.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-[0.75rem] flex-wrap mt-[0.25rem]">
              <button
                type="button"
                onClick={saveWorkshop}
                disabled={saving}
                className={btnPrimary}
              >
                {saving ? 'Saving…' : 'Save my workshop'}
              </button>
              {saveResult?.ok ? (
                <span
                  className="inline-flex items-center gap-[0.25rem] text-[0.875rem] text-ok"
                  role="status"
                >
                  <Check size={14} aria-hidden="true" /> Saved
                </span>
              ) : saveResult && !saveResult.ok ? (
                <span className="text-[0.875rem] text-err" role="alert">
                  {saveResult.error === 'rate-limited'
                    ? 'Too many changes — try again in a moment.'
                    : saveResult.error === 'unauthorized'
                      ? 'Your session expired — sign in again.'
                      : 'Couldn’t save. Please try again.'}
                </span>
              ) : null}
            </div>
          </>
        )}

        {/* --- Preferences --- */}
        <h3 className={sectionLabel}>Preferences</h3>
        <div className="flex flex-wrap gap-[0.5rem]">
          <button
            type="button"
            onClick={toggleTheme}
            className={`${btnGhost} gap-[0.5rem]`}
          >
            {isDark ? (
              <Sun size={16} aria-hidden="true" />
            ) : (
              <Moon size={16} aria-hidden="true" />
            )}
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
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
