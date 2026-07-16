'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { btnPrimary } from '@/lib/ui'; // Sprint 29: shared button class

interface Props {
  /** The dedicated build page — /plans/[slug]/build. */
  href: string;
  /** The server-rendered Instructions section (heading + full step list). */
  children: React.ReactNode;
}

/**
 * "Start building →" — REWORKED 2026-07-16 (Keagan's direction).
 *
 * Sprint 20 made this a disclosure that expanded the step walker inline; the
 * instructions now get a dedicated page (/plans/[slug]/build), so this is a
 * LINK, not a toggle. The step-by-step is the product's main content and a
 * corner of the plan page undersold it.
 *
 * The progressive-enhancement contract of the plan page is UNCHANGED —
 * `children` (the complete Instructions section) is still always in the DOM:
 *
 *   - NO-JS / crawler: the effect never runs, the full instructions render
 *     open below the link, and the link ALSO works — a link needs no JS,
 *     which is strictly better than Sprint 20's dead-without-JS button.
 *   - ENHANCED: the region collapses after mount and the link is the one
 *     path to the steps — full-page, as intended.
 *   - PRINT (Sprint 13): `@media print` forces `.instructions-region`
 *     visible and hides `.instructions-open` by class, so a printed plan
 *     page still carries every step and no stray CTA.
 *   - OFFLINE: the build page is pre-cached when a plan is saved (see
 *     service-worker.tsx), so the link works with no signal too.
 */
export function InstructionsDisclosure({ href, children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="instructions-disclosure">
      {/* `instructions-open` class retained — the print stylesheet hides it. */}
      <p className="instructions-open mt-[1.5rem] mb-0">
        <Link href={href} className={btnPrimary}>
          Start building &rarr;
        </Link>
      </p>

      {/* The no-JS / print fallback: the full step list, hidden only once JS
          has mounted (when the link becomes the way in). */}
      <div id="instructions-region" className="instructions-region" hidden={mounted}>
        {children}
      </div>
    </div>
  );
}
