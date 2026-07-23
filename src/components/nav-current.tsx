'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isNavActive } from '@/lib/nav-active';

/**
 * Sprint 36 (audit A2) — a nav link that marks the current section, visually and for
 * assistive tech. A tiny client wrapper around the existing `<Link>`: it does not re-own the
 * nav lists (PUBLIC_NAV / SIGNED_IN_NAV in site-header.tsx stay the single source), it only
 * adds `aria-current="page"` and an active class when `usePathname()` matches (see
 * isNavActive for the exact/prefix rule). Pathname only — NO `useSearchParams`, which would
 * force a Suspense boundary on the statically-prerendered `/_not-found` (this renders in the
 * always-present header). Active marker: ink + semibold + a 2px OAK underline bar (Sprint 46,
 * Direction C — oak is the structural "you are here" line; forest stays reserved for
 * hover/CTAs), used identically in the desktop row and the drawer. The bar is supplementary:
 * the state is also carried by `aria-current="page"` and the ink+semibold weight, so oak's
 * low on-cream contrast is fine — it never has to stand alone.
 */
const ACTIVE = 'text-fg font-semibold shadow-[inset_0_-2px_0_var(--oak)]';

export function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = isNavActive(pathname, href);
  return (
    <Link
      href={href}
      className={active ? `${className} ${ACTIVE}` : className}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
