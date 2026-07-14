import type { Metadata } from 'next';

/**
 * FAQ — standard trust-nav page (2026-07-14).
 *
 * STUB, deliberately — see src/app/about/page.tsx for the reasoning. Public
 * (see src/lib/public-routes.ts).
 */
export const metadata: Metadata = {
  title: 'FAQ',
  robots: { index: false, follow: false }, // Branding decision #8 still open.
};

export default function FaqPage() {
  return (
    <main id="main" className="page">
      <h1>FAQ</h1>
      <p className="subtitle">Content coming soon.</p>
    </main>
  );
}
