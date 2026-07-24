/**
 * Settings → Terms — Sprint 47 placeholder.
 *
 * Live Terms / Privacy content is out of scope (legal copy needs Keagan). Links
 * are inert placeholders so the rail destination exists.
 */
export const dynamic = 'force-dynamic';

const CARD =
  'bg-surface border border-border rounded-[0.5rem] shadow-e1 p-[1.25rem]';

export default function SettingsTermsPage() {
  return (
    <div>
      <h1 className="!text-[1.5rem] !mt-0 !mb-[0.25rem]">Terms</h1>
      <p className="subtitle !mt-0 !mb-[1.5rem]">
        Legal documents for Notch. Full text is coming soon.
      </p>

      <section className={CARD}>
        <ul className="list-none p-0 m-0 grid gap-[0.75rem]">
          <li>
            <span className="text-fg font-medium">Terms of Service</span>
            <span className="muted text-[0.875rem] block">Coming soon</span>
          </li>
          <li>
            <span className="text-fg font-medium">Privacy Policy</span>
            <span className="muted text-[0.875rem] block">Coming soon</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
