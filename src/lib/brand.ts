/**
 * Brand constants — the single source for the product's identity (Sprint 43).
 *
 * Branding decision #8 is RESOLVED (DECISIONS_LOG.md 2026-07-21): the product is
 * Notch, at notchplans.com. Every user-visible occurrence of the name, the domain,
 * and the contact address reads from here — a rename is one file plus the static
 * `public/manifest.webmanifest`, which cannot import this module and is therefore
 * cross-checked against it by `tests/brand.test.ts`.
 *
 * NOTE: `robots: noindex` did NOT lift with the rename — indexing is a de facto
 * public launch, and going publicly live is Keagan's explicit call (CLAUDE.md §5).
 */

export const BRAND_NAME = 'Notch';

/** PWA `short_name` / `appleWebApp.title` — must stay ≤ 12 chars for launchers. */
export const BRAND_SHORT_NAME = 'Notch';

/** DRAFT copy (footer + landing) — Keagan approves on the browser pass. */
export const BRAND_TAGLINE = 'Built naturally. Made to last.';

export const SITE_ORIGIN = 'https://notchplans.com';

/** Bare host for printed provenance lines — a URL you can retype from paper. */
export const SITE_HOST = new URL(SITE_ORIGIN).host;

export const CONTACT_EMAIL = 'support@notchplans.com';

/**
 * Shared meta description. "Cost band", never a dollar figure — the tiers-only
 * rule (DECISIONS_LOG.md 2026-07-13) applies to metadata as much as to the UI.
 */
export const BRAND_DESCRIPTION =
  'Notch is a searchable catalog of woodworking plans — every plan with a full cut list, material list, tools, and a cost band.';
