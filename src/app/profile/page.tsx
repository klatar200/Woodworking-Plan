'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * `/profile` → settings — Sprint 47.
 *
 * Hash map: `#workshop` → `/settings/workshop`; everything else → `/settings/profile`.
 * Hash is client-only, so this is a tiny client redirect. A `<noscript>` meta refresh
 * covers the no-JS path (always to profile — no-JS cannot read the hash anyway).
 */
export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const target =
      window.location.hash === '#workshop'
        ? '/settings/workshop'
        : '/settings/profile';
    router.replace(target);
  }, [router]);

  return (
    <>
      <noscript>
        <meta httpEquiv="refresh" content="0;url=/settings/profile" />
      </noscript>
      <p className="p-[1.5rem] text-muted">Redirecting to settings…</p>
    </>
  );
}
