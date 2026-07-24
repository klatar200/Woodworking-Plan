import { redirect } from 'next/navigation';

/**
 * `/workshop` → `/settings/workshop` — Sprint 47.
 *
 * Kept as a redirect so bookmarks and old links keep working. Still private (not
 * on the PUBLIC_ROUTES allowlist). Display label in settings is "Tools"; the
 * route slug stays `workshop`.
 */
export default function WorkshopPage(): never {
  redirect('/settings/workshop');
}
