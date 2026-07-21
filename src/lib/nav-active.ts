/**
 * Sprint 36 (audit A2) — which top-nav item is the current section.
 *
 * Extracted as a pure function so the matching rule is unit-tested rather than buried in a
 * client island. Home (`/`) matches EXACTLY — a prefix match would light Home on every page.
 * Every other section matches its own path or a descendant (`/paths`, `/paths/x`), with the
 * trailing slash guarding against `/about` lighting up on `/aboutus`. Plan pages (`/plans/*`)
 * are content, not a section, so they match nothing. A null pathname (SSR before the client
 * has a router context) is never active.
 */
export function isNavActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
