import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { ClerkProvider } from '@clerk/nextjs';
import { SiteHeader } from '@/components/site-header';
import { InstallCapture } from '@/components/install-prompt';
import {
  ServiceWorkerRegistration,
  PrivateCacheGuard,
} from '@/components/service-worker';

/**
 * Perf (2026-07-16): preconnect to Clerk's frontend API. clerk.browser.js is
 * the single biggest third-party fetch on every page, from an origin the
 * browser hasn't touched yet — a preconnect overlaps its DNS+TLS handshake
 * with our HTML parse. The origin is DERIVED from the publishable key (its
 * third segment is the base64 frontend-API host, trailing '$'), so this stays
 * correct when the key changes between dev/prod instances. Fails soft: no
 * key, malformed key → no hint, nothing breaks.
 */
function clerkFrontendOrigin(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;
  try {
    const encoded = key.split('_')[2];
    if (!encoded) return null;
    const host = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '');
    // A hostname, not a URL with a path — anything else means the key format
    // changed and this hint should silently stand down.
    return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : null;
  } catch {
    return null;
  }
}
// Sprint 28: Tailwind is imported FIRST, then globals.css. Tailwind's output is
// wrapped in @layer (theme/utilities); globals.css is unlayered and therefore wins
// any conflict regardless of order — so the existing hand-written system keeps full
// control this sprint. No component uses a utility class yet; this is foundation only.
import './tailwind.css';
import './globals.css';

/**
 * Root layout.
 *
 * NOTE ON COPY AND ICONS: BUILD_PLAN.md §3 decision #8 (branding/app name) is still
 * OPEN. "Woodworking Plan" is the working name from BUSINESS_PLAN.md §1, and the PWA
 * icons are deliberately plain placeholders — not a logo. **Both must be replaced
 * before launch.** Inventing a brand is not the build agent's call.
 */
export const metadata: Metadata = {
  title: 'Woodworking Plan',
  description:
    'A searchable repository of woodworking plans, with full cut lists, material lists, and cost estimates.',
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Sprint 31 — theme is read SERVER-SIDE from a cookie and stamped onto <html> before the
  // page paints, so there is NO flash of the wrong theme (the trap with a localStorage read
  // that only runs after hydration). Default is light: no cookie ⇒ no `dark` class. The
  // toggle (theme-toggle.tsx) writes the cookie and flips the class live, no reload.
  const theme = (await cookies()).get('theme')?.value;
  const isDark = theme === 'dark';
  const clerkOrigin = clerkFrontendOrigin();

  return (
    /**
     * `dynamic` IS THE CSP NONCE SWITCH. It is not optional here, and it is not
     * what its name suggests.
     *
     * Our CSP (src/middleware.ts) uses `'strict-dynamic'`, which DISABLES
     * host-based allowlisting entirely — a URL in `script-src` means nothing once
     * it is present. A script runs only if it carries this request's nonce, or was
     * loaded BY a script that did. Next stamps the nonce onto its OWN script tags;
     * Clerk renders its own <script> for clerk.browser.js and needs the nonce too.
     *
     * Passing `nonce={...}` to ClerkProvider DOES NOT WORK, and fails silently.
     * Read @clerk/nextjs' own source:
     *
     *     const { children, dynamic, ...rest } = props;   // our nonce → rest
     *     async function generateNonce() {
     *       if (!dynamic) return Promise.resolve('');      // ← empty string
     *     }
     *     <ClientClerkProvider {...propsWithEnvs} nonce={await generateNonce()} />
     *                          ^ our nonce        ^ overwrites it, because the
     *                                              explicit prop comes AFTER the
     *                                              spread.
     *
     * With `dynamic` set, Clerk reads the `x-nonce` request header our middleware
     * already sets, and stamps it on its script itself. Without it, Clerk's script
     * is blocked by the browser and Clerk degrades quietly — which is how this
     * shipped to production twice.
     *
     * Cost of `dynamic`: the tree opts out of static prerendering. Nil for us —
     * every route is already `force-dynamic`.
     */
    <ClerkProvider dynamic>
      <html lang="en" className={isDark ? 'dark' : undefined} suppressHydrationWarning>
        <body>
          {/* React 19 hoists resource links to <head>. See clerkFrontendOrigin. */}
          {clerkOrigin ? <link rel="preconnect" href={clerkOrigin} /> : null}
          <SiteHeader />
          {children}
          {/* Renders nothing. Captures `beforeinstallprompt` app-wide so the
              install actions in the profile dropdown and the mobile drawer work
              from ANY landing page — the old catalog-only listener missed every
              deep link. */}
          <InstallCapture />
          {/* Renders nothing. Registers the service worker, and fails silently if
              it can't — an offline enhancement must never become an online
              dependency. */}
          <ServiceWorkerRegistration />
          {/* Sprint 14. Wipes the private offline cache on sign-out. Watches the
              SESSION STATE rather than hanging off a sign-out button, because there is
              more than one way to sign out (our button, Clerk's menu, an expired or
              revoked session) and a wipe wired to one of them would silently keep the
              data for all the others. */}
          <PrivateCacheGuard />
        </body>
      </html>
    </ClerkProvider>
  );
}
