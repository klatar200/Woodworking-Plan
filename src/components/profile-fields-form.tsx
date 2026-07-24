'use client';

import { useEffect, useState } from 'react';
import { SquarePen } from 'lucide-react';
import { btnGhost, btnPrimary, searchInput } from '@/lib/ui';
import { updateProfileFields } from '@/app/actions/profile';

/**
 * Editable profile fields — Sprint 47.
 *
 * Progressive enhancement: SSR / no-JS render the forms open. After hydration,
 * they collapse to a read-only summary until "Edit" (`btnGhost` + `SquarePen`).
 *
 * Two forms (Personal / Professional), each posting ALL four keys — the card you
 * are not editing rides along as hidden inputs carrying the current values, so a
 * save never wipes the other card.
 */

const LABEL = 'block text-[0.8125rem] text-muted mb-[0.25rem]';
const VALUE = 'text-[0.9375rem] text-fg break-words';
const FIELD = 'mb-[1rem] last:mb-0';
const CARD =
  'bg-surface border border-border rounded-[0.5rem] shadow-e1 p-[1.25rem]';
const BADGE =
  'ml-[0.5rem] text-[0.75rem] uppercase tracking-[0.04em] text-muted-2';

export function ProfileFieldsForm({
  phone,
  company,
  jobTitle,
  website,
}: {
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  website: string | null;
}) {
  // null = not yet mounted (SSR / no-JS → show forms). After mount, false = summary.
  const [editingPersonal, setEditingPersonal] = useState<boolean | null>(null);
  const [editingProfessional, setEditingProfessional] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    setEditingPersonal(false);
    setEditingProfessional(false);
  }, []);

  const personalOpen = editingPersonal !== false;
  const professionalOpen = editingProfessional !== false;

  return (
    <>
      <section className={`${CARD} mb-[1.25rem]`}>
        <div className="flex items-center justify-between gap-[1rem] mb-[1rem]">
          <h2 className="!text-[1.125rem] !m-0">Personal Information</h2>
          {!personalOpen ? (
            <button
              type="button"
              className={`${btnGhost} gap-[0.5rem]`}
              onClick={() => setEditingPersonal(true)}
            >
              <SquarePen size={16} aria-hidden="true" />
              Edit
            </button>
          ) : null}
        </div>

        {personalOpen ? (
          <form action={updateProfileFields} className="grid gap-[1rem]">
            <input type="hidden" name="returnTo" value="/settings/profile" />
            <input type="hidden" name="company" value={company ?? ''} />
            <input type="hidden" name="jobTitle" value={jobTitle ?? ''} />
            <input type="hidden" name="website" value={website ?? ''} />

            <ReadOnlyManaged label="Name" />
            <ReadOnlyManaged label="Email" />

            <div className={FIELD}>
              <label htmlFor="profile-phone" className={LABEL}>
                Phone{' '}
                <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                defaultValue={phone ?? ''}
                maxLength={40}
                className={searchInput}
                autoComplete="tel"
              />
            </div>

            <FormActions onCancel={() => setEditingPersonal(false)} />
          </form>
        ) : (
          <>
            <ReadOnlyManaged label="Name" />
            <ReadOnlyManaged label="Email" />
            <div className={FIELD}>
              <span className={LABEL}>Phone</span>
              <p className={`${VALUE} m-0`}>
                {phone ?? <span className="muted">Not set</span>}
              </p>
            </div>
          </>
        )}
      </section>

      <section className={CARD}>
        <div className="flex items-center justify-between gap-[1rem] mb-[1rem]">
          <h2 className="!text-[1.125rem] !m-0">Professional Information</h2>
          {!professionalOpen ? (
            <button
              type="button"
              className={`${btnGhost} gap-[0.5rem]`}
              onClick={() => setEditingProfessional(true)}
            >
              <SquarePen size={16} aria-hidden="true" />
              Edit
            </button>
          ) : null}
        </div>

        {professionalOpen ? (
          <form action={updateProfileFields} className="grid gap-[1rem]">
            <input type="hidden" name="returnTo" value="/settings/profile" />
            <input type="hidden" name="phone" value={phone ?? ''} />

            <div className={FIELD}>
              <label htmlFor="profile-company" className={LABEL}>
                Company{' '}
                <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input
                id="profile-company"
                name="company"
                type="text"
                defaultValue={company ?? ''}
                maxLength={120}
                className={searchInput}
                autoComplete="organization"
              />
            </div>
            <div className={FIELD}>
              <label htmlFor="profile-job-title" className={LABEL}>
                Job title{' '}
                <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input
                id="profile-job-title"
                name="jobTitle"
                type="text"
                defaultValue={jobTitle ?? ''}
                maxLength={120}
                className={searchInput}
                autoComplete="organization-title"
              />
            </div>
            <div className={FIELD}>
              <label htmlFor="profile-website" className={LABEL}>
                Website{' '}
                <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input
                id="profile-website"
                name="website"
                type="url"
                defaultValue={website ?? ''}
                maxLength={200}
                placeholder="https://"
                className={searchInput}
                autoComplete="url"
              />
            </div>

            <FormActions onCancel={() => setEditingProfessional(false)} />
          </form>
        ) : (
          <>
            <div className={FIELD}>
              <span className={LABEL}>Company</span>
              <p className={`${VALUE} m-0`}>
                {company ?? <span className="muted">Not set</span>}
              </p>
            </div>
            <div className={FIELD}>
              <span className={LABEL}>Job title</span>
              <p className={`${VALUE} m-0`}>
                {jobTitle ?? <span className="muted">Not set</span>}
              </p>
            </div>
            <div className={FIELD}>
              <span className={LABEL}>Website</span>
              <p className={`${VALUE} m-0`}>
                {website ? (
                  <a href={website} rel="nofollow noopener" target="_blank">
                    {website}
                  </a>
                ) : (
                  <span className="muted">Not set</span>
                )}
              </p>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function ReadOnlyManaged({ label }: { label: string }) {
  return (
    <div className={FIELD}>
      <span className={LABEL}>{label}</span>
      <p className={`${VALUE} muted m-0`}>
        Managed in Security
        <span className={BADGE}>read-only</span>
      </p>
    </div>
  );
}

function FormActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex gap-[0.5rem] flex-wrap">
      <button type="submit" className={btnPrimary}>
        Save
      </button>
      {/* Cancel is a JS enhancement — no-JS visitors just submit or navigate away. */}
      <button type="button" className={btnGhost} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
