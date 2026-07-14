'use client';

import { useEffect, useRef } from 'react';
import { recordPlanViewAction } from '@/app/actions/views';

/**
 * Logs one view of a plan — Sprint 19. Renders nothing.
 *
 * WHY THIS IS A CLIENT EFFECT AND NOT A SERVER-SIDE WRITE (the design, in short):
 * `next/link` PREFETCHES the RSC payload of every catalog card in the viewport, which
 * renders the plan page on the server. Logging the view during that render would count
 * a hover as a view — and Trending would degenerate into "whatever was near the top of
 * the grid", a loop that entrenches its own output. Crawlers would count too. An effect
 * runs only when a real browser really rendered the page. See src/lib/views.ts.
 *
 * FIRES ONCE PER MOUNT. React 18 runs effects twice in dev StrictMode, and without the
 * ref every local page load would log two views — a 2× inflation that would look like
 * real traffic and be invisible in production, where it doesn't happen.
 *
 * NEVER THROWS. Offline (the plan page is service-worker cached — Sprint 8) the action's
 * fetch fails, and an unhandled rejection in an effect is a console error on a page the
 * user is reading in a workshop with no signal. A view we couldn't log is a non-event:
 * swallow it. It is a ranking signal, not an audit trail.
 */
export function ViewLogger({ slug }: { slug: string }) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;

    void recordPlanViewAction(slug).catch(() => {
      // Offline, throttled, or the action id changed under a stale cached page.
      // None of these are worth telling the reader about.
    });
  }, [slug]);

  return null;
}
