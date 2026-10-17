'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { btnGhost, btnPrimary, page } from '@/lib/ui';

/**
 * Error boundary for /designer and everything under it (Sprint 81).
 *
 * The usual cause is version skew: the tab was opened before a deploy, so Save calls a server
 * action the new deployment no longer has and Next throws. Without this boundary that surfaced as
 * the bare "Application error" page. Unsaved work survives — the designer keeps a per-tab draft
 * (draft-store.ts) that a reload restores.
 *
 * Exactly one <main>: this replaces the page, which owns the document landmark.
 */
export default function DesignerError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className={page}>
      <h1>Something went wrong on this page.</h1>
      <p>
        This usually means Notch was updated while the page was open. Reload to carry on — unsaved
        board changes in this tab are kept.
      </p>
      <div className="flex flex-wrap items-center gap-[0.75rem]">
        <button type="button" className={btnPrimary} onClick={() => window.location.reload()}>
          Reload
        </button>
        <Link href="/designer/library" className={btnGhost}>
          Saved Boards
        </Link>
      </div>
    </main>
  );
}
