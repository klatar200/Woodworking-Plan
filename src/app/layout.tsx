import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

/**
 * Root layout.
 *
 * SPRINT 2: ClerkProvider is now unconditional. The Sprint 0 "only mount Clerk if
 * it's configured" guard is gone — auth is a real feature now, and `src/env.ts`
 * refuses to boot in production without Clerk's keys. Failing to start is the
 * correct behaviour; silently serving unprotected pages is not.
 *
 * NOTE ON COPY: BUILD_PLAN.md §3 decision #8 (branding/app name) is still OPEN.
 * "Woodworking Plan" is the working name from BUSINESS_PLAN.md §1, used as a
 * placeholder. No marketing copy ships until #8 is decided.
 */
export const metadata: Metadata = {
  title: 'Woodworking Plan',
  description: 'A searchable repository of woodworking plans.',
  // Still not a public release. Keep it out of search results while branding is open.
  robots: { index: false, follow: false },
};

// Mobile-first per BUSINESS_PLAN.md §5.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <SiteHeader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
