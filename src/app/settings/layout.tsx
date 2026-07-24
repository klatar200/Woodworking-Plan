import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { page } from '@/lib/ui';
import { SettingsRail, SettingsMobileNav } from '@/components/settings-nav';

/**
 * Settings hub shell — Sprint 47.
 *
 * Private by default (not on the PUBLIC_ROUTES allowlist) + `requireUser()` as a
 * second gate. Layout: 64rem page, `lg:grid-cols-[16rem_1fr]` with a persistent left
 * rail and a card pane on the right. Mobile gets a sub-bar with a sections hamburger
 * (`<details>`, no-JS) instead of the rail.
 */
export const dynamic = 'force-dynamic';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <main id="main" className={`${page} page-wide`}>
      <p className="breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true"> / </span>
        <span>Settings</span>
      </p>

      <div className="lg:hidden mb-[1rem]">
        <SettingsMobileNav />
      </div>

      <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-[1.5rem] lg:items-start">
        <SettingsRail />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
