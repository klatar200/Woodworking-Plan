import type { Metadata } from 'next';

/**
 * About — standard trust-nav page (2026-07-14).
 *
 * STUB, deliberately. Keagan's call: ship the nav link and route now; real copy
 * is public-facing brand voice and is his to write/approve (BUILD_PLAN.md §2 —
 * branding/public-facing copy is an escalation category, not a routine call).
 * Public (see src/lib/public-routes.ts) — same trust-signal reasoning as the
 * catalog itself.
 */
export const metadata: Metadata = {
  title: 'About',
  robots: { index: false, follow: false }, // Branding decision #8 still open.
};

export default function AboutPage() {
  return (
    <main id="main" className="page">
      <h1>About</h1>
      <p className="subtitle">Content coming soon.</p>
    </main>
  );
}
