import Link from 'next/link';
import { WorkshopForm } from '@/components/workshop-form';
import { RateLimitNotice } from '@/components/rate-limit-notice';
import { hasRateLimitNotice } from '@/lib/rate-limit-feedback';

/**
 * Settings → Tools — Sprint 47.
 *
 * DISPLAY LABEL is "Tools"; route/slug/code stay `workshop` (same precedent as
 * Paths → Learning). Do not rename lib/workshop.ts, the DB, or the plan-page
 * prompt target.
 */
export const dynamic = 'force-dynamic';

const CARD =
  'bg-surface border border-border rounded-[0.5rem] shadow-e1 p-[1.25rem]';

export default async function SettingsWorkshopPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; notice?: string }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <h1 className="!text-[1.5rem] !mt-0 !mb-[0.25rem]">Tools</h1>
      <p className="subtitle !mt-0 !mb-[1.5rem]">
        Tell us which tools you own. We&rsquo;ll pre-tick the &ldquo;tools you
        own&rdquo; filter on the catalog so you can see what you can build in one
        click.
      </p>

      <RateLimitNotice
        show={hasRateLimitNotice(params.notice)}
        dismissHref="/settings/workshop"
      />

      {params.saved === '1' ? (
        <p
          className="px-[1rem] py-[0.75rem] my-[1rem] mx-0 border-l-[3px] border-border bg-surface text-[0.9rem]"
          role="status"
        >
          Workshop saved. Your tools are ready on the{' '}
          <Link href="/browse">catalog filter</Link>.
        </p>
      ) : null}

      <section className={CARD}>
        <WorkshopForm />
      </section>
    </div>
  );
}
