/**
 * Landing-page copy that depends on live data — Sprint 40.2 (audit C1).
 *
 * ⚖️ Keagan, 2026-07-21: the landing states the REAL catalog size. It read "Hundreds of
 * plans" while the catalog held 948 — understating the single most checkable claim on the
 * page by roughly 3x, in a product whose whole pitch is that its numbers are honest.
 *
 * A pure module rather than a literal inside `page.tsx` for the usual reason: the branch
 * that matters is the one nobody will ever see in a browser (a small or half-seeded
 * database), so it has to be assertable without rendering the page.
 *
 * THE FLOOR IS THE POINT. Under it the size claim is DROPPED, not softened back to
 * "Hundreds of plans" — with 40 plans seeded that sentence is false, and a stale hardcoded
 * brag is exactly the kind of thing that ships unnoticed because it never changes. Same
 * doctrine as the cost-display rule: say the true thing, or say nothing; never a
 * confident approximation.
 *
 * PUBLIC COPY IS A DRAFT (BUILD_PLAN.md §2) — the wording is Keagan's to approve.
 */

/** Below this, the catalog is too small for a count to read as a selling point. */
export const COUNT_FLOOR = 100;

export interface PlanCountCopy {
  /** Standalone trust chip — has to make sense with no sentence around it. */
  chip: string;
  /** Full sentence for the closing CTA. */
  sentence: string;
}

export function planCountCopy(total: number): PlanCountCopy {
  // Guards a fresh, failed or partial seed: `total` is whatever the query returned, and
  // 0 must not render "0 plans".
  if (!Number.isFinite(total) || total < COUNT_FLOOR) {
    return { chip: 'Every plan fully specified', sentence: 'Every plan fully specified.' };
  }
  // Thousands separator: "1,204 plans", not "1204 plans". Fixed locale — this is English
  // marketing copy on a page with no i18n, so a machine-dependent default would be the
  // only thing here that varies by server.
  const phrase = `${total.toLocaleString('en-US')} plans`;
  return { chip: phrase, sentence: `${phrase}, each fully specified.` };
}
