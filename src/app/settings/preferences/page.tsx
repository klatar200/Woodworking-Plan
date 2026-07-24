import { ThemeToggle } from '@/components/theme-toggle';
import { InstallMenuItem } from '@/components/install-prompt';
import { btnGhost } from '@/lib/ui';

/**
 * Settings → Preferences — Sprint 47.
 *
 * Theme toggle + PWA install control. Both are JS enhancements (they render
 * nothing until the browser can actually offer them) — same components the
 * retired account modal used.
 */
export const dynamic = 'force-dynamic';

const CARD =
  'bg-surface border border-border rounded-[0.5rem] shadow-e1 p-[1.25rem]';

export default function SettingsPreferencesPage() {
  return (
    <div>
      <h1 className="!text-[1.5rem] !mt-0 !mb-[0.25rem]">Preferences</h1>
      <p className="subtitle !mt-0 !mb-[1.5rem]">
        Display and install options for this device.
      </p>

      <section className={CARD}>
        <h2 className="!text-[1.125rem] !mt-0 !mb-[1rem]">Appearance</h2>
        <div className="flex flex-wrap gap-[0.5rem]">
          <ThemeToggle className={`${btnGhost} gap-[0.5rem]`} />
          <InstallMenuItem className={btnGhost} />
        </div>
      </section>
    </div>
  );
}
