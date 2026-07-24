/**
 * Settings → Billing — Sprint 47 placeholder.
 *
 * No payment processor. Copy states "no charges active". Real billing requires
 * leaving Vercel Hobby for a commercial-use-permitted host FIRST (Hobby
 * enforcement = account suspension) — see DECISIONS_LOG.md launch economics
 * (2026-07-13) and CLAUDE.md launch gate. Do not wire Stripe/Clerk Billing here
 * until that host move lands.
 */
export const dynamic = 'force-dynamic';

const CARD =
  'bg-surface border border-border rounded-[0.5rem] shadow-e1 p-[1.25rem] mb-[1.25rem]';
const LABEL = 'block text-[0.8125rem] text-muted mb-[0.25rem]';
const VALUE = 'text-[0.9375rem] text-fg m-0';

export default function SettingsBillingPage() {
  return (
    <div>
      <h1 className="!text-[1.5rem] !mt-0 !mb-[0.25rem]">Billing</h1>
      <p className="subtitle !mt-0 !mb-[1.5rem]">
        Notch is free during development. There are no charges active on your
        account.
      </p>

      <section className={CARD}>
        <h2 className="!text-[1.125rem] !mt-0 !mb-[1rem]">Current plan</h2>
        <p className={VALUE}>
          <strong>Free</strong>
        </p>
        <p className="muted text-[0.875rem] mb-0 mt-[0.5rem]">
          Full catalog access. No tiers, no limits.
        </p>
      </section>

      <section className={CARD}>
        <h2 className="!text-[1.125rem] !mt-0 !mb-[1rem]">Payment method</h2>
        <span className={LABEL}>On file</span>
        <p className={VALUE}>None</p>
      </section>

      <section className={CARD}>
        <h2 className="!text-[1.125rem] !mt-0 !mb-[1rem]">Invoices</h2>
        <p className={`${VALUE} muted`}>No invoices yet.</p>
      </section>
    </div>
  );
}
