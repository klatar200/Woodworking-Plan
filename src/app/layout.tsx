import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { SiteHeader } from '@/components/site-header';
import { ServiceWorkerRegistration } from '@/components/service-worker';
import './globals.css';

/**
 * Root layout.
 *
 * NOTE ON COPY AND ICONS: BUILD_PLAN.md §3 decision #8 (branding/app name) is
 * still OPEN. "Woodworking Plan" is the working name from BUSINESS_PLAN.md §1,
 * and the PWA icons are deliberately plain placeholders — not a logo. **Both must
 * be replaced before launch.** Inventing a brand is not the build agent's call.
 */
export const metadata: Metadata = {
  title: 'Woodworking Plan',
  description:
    'A searchable repository of woodworking plans, with full cut lists, material lists, and cost estimates.',
  // Sprint 8 — installable to the home screen (BUSINESS_PLAN.md §5).
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Plans',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  // Still not a public release — branding is open, so keep it out of search.
  robots: { index: false, follow: false },
};

// Mobile-first per BUSINESS_PLAN.md §5.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1a1a1a',
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
          {/* Renders nothing. Registers the service worker, and fails silently if
              it can't — an offline enhancement must never become an online
              dependency. */}
          <ServiceWorkerRegistration />
        </body>
      </html>
    </ClerkProvider>
  );
}
