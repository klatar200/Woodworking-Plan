/**
 * Search-engine indexing switch — the single source of truth for whether the PUBLIC
 * pages (landing, catalog, plan detail, about, faq) may be crawled.
 *
 * `false` until the public-launch call: letting crawlers in is a de facto public launch,
 * which is Keagan's explicit decision (`brand.ts`, DECISIONS_LOG). `scripts/go-live.ps1`
 * flips this to `true` as part of going live, and the change deploys with the merge.
 *
 * Genuinely-private routes (print / build / boards / dev / offline / shopping-list) keep
 * their OWN hardcoded `{ index: false, follow: false }` regardless of this flag — they are
 * never meant to be indexed.
 */
export const SITE_INDEXABLE = true;

/** Robots policy for public pages — follows SITE_INDEXABLE. */
export const publicRobots = SITE_INDEXABLE
  ? { index: true, follow: true }
  : { index: false, follow: false };
