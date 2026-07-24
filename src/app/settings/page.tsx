import { redirect } from 'next/navigation';

/** `/settings` → `/settings/profile` — Sprint 47. The hub has no index pane. */
export default function SettingsIndexPage(): never {
  redirect('/settings/profile');
}
