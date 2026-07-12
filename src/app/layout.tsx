import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { isClerkConfigured } from '@/env';
import './globals.css';

/**
 * Root layout.
 *
 * NOTE ON COPY: BUILD_PLAN.md §3 decision #8 (branding/app name) is still
 * OPEN, so nothing here is a branding commitment. "Woodworking Plan" is the
 * working name from BUSINESS_PLAN.md §1 used as a placeholder. No marketing
 * or public-facing copy ships until #8 is decided.
 */
export const metadata: Metadata = {
  title: 'Woodworking Plan',
  description: 'Environment and architecture baseline. Not a public release.',
  // Keeps the Sprint 0 scaffold out of search results while branding is open.
  robots: { index: false, follow: false },
};

// Mobile-first per BUSINESS_PLAN.md §5 — the viewport is set correctly from
// the very first commit rather than retrofitted at Sprint 8.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const shell = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  // Clerk is wired up but the vendor account may not be provisioned yet (see
  // DEPLOYMENT.md). Mounting ClerkProvider without a publishable key throws at
  // render, which would make the app unrunnable locally before the user has an
  // account. Guarding on config keeps Sprint 0 verifiable end to end.
  //
  // Sprint 2 (Accounts & Auth) makes Clerk mandatory and removes this guard.
  if (!isClerkConfigured()) {
    return shell;
  }

  return <ClerkProvider>{shell}</ClerkProvider>;
}
