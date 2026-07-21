import type { Metadata, Viewport } from 'next';
import { Fraunces } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { ClerkProvider } from '@clerk/nextjs';
import { clerkAppearance, clerkAppearanceDark } from '@/lib/clerk-appearance';
import {
  THEME_COOKIE,
  THEME_CHROME_COLOR,
  THEME_INIT_SCRIPT,
} from '@/lib/theme';

/**
 * QOL-M Step 2 (2026-07-20, Keagan-approved brand element): Fraunces — a warm display
 * serif for headings, fitting the craft/woodworking tone. Self-hosted by next/font (no
 * external CDN request, so no CSP `font-src` hole — the mockup's Google-Fonts <link> is
 * NOT used in production). Exposed as `--font-display`; applied via the `.font-display`
 * helper in globals.css (the landing today; extend to site-wide h1s if wanted).
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal'],
  variable: '--font-display',
  display: 'swap',
});
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
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

/**
 * Mobile-first per BUSINESS_PLAN.md §5.
 *
 * Sprint 37.3 (audit D1): this became a FUNCTION so `themeColor` can follow the theme.
 * It used to be a fixed `#1a1a1a` — a dark OS toolbar sitting above a cream page in the
 * default theme, and a mismatch in dark mode too. The app's theme is class-based, not
 * media-based, so a `media`-keyed themeColor array would be wrong; the honest source is
 * the same cookie the `.dark` class is stamped from, read per request.
 *
 * ACCEPTED LIMIT (logged in DECISIONS_LOG.md 2026-07-21): on an OS-dark visitor's FIRST
 * visit there is no cookie, so the init script darkens the page while this meta stays
 * light for that one render. Chasing it would mean either mutating the meta from script
 * after paint or dropping the server stamp and reintroducing the FOUC. It self-corrects
 * the first time the toggle is used.
 */
export async function generateViewport(): Promise<Viewport> {
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: THEME_CHROME_COLOR[theme === 'dark' ? 'dark' : 'light'],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Sprint 31 — an EXPLICIT theme choice is read SERVER-SIDE from a cookie and stamped onto
  // <html> before the page paints, so there is NO flash of the wrong theme (the trap with a
  // localStorage read that only runs after hydration). The toggle (theme-toggle.tsx) writes
  // the cookie and flips the class live, no reload.
  //
  // Sprint 37 — NO COOKIE NO LONGER MEANS LIGHT. It means "no explicit choice", and the
  // inline script below decides from the OS `prefers-color-scheme` (Keagan's reversal of the
  // 2026-07-16 call, DECISIONS_LOG.md 2026-07-21). So `isDark` here is specifically "the
  // visitor asked for dark", which is exactly what themeColor and Clerk's appearance want —
  // it is NOT a reliable answer to "is the page currently dark".
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  const isDark = theme === 'dark';
  const clerkOrigin = clerkFrontendOrigin();
  // Sprint 37: the CSP nonce for the theme init script. Our script-src is
  // `'strict-dynamic'` + nonce, so an un-nonced inline script is silently blocked — the
  // same failure mode that took Clerk down twice. Middleware sets this on every request.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

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
    /* Sprint 37.2: appearance is set ONCE, here. Every Clerk surface (the sign-in and
       sign-up pages, and `clerk.openUserProfile()` from the account modal) inherits it,
       which is why the per-page `appearance` props were removed — a second source is how
       a Clerk page ends up white inside a dark app. */
    <ClerkProvider dynamic appearance={isDark ? clerkAppearanceDark : clerkAppearance}>
      <html
        lang="en"
        className={`${fraunces.variable}${isDark ? ' dark' : ''}`}
        suppressHydrationWarning
      >
        {/* QOL-K: the body is a full-height flex column so the footer sits at the bottom of
            the viewport on short pages (e.g. /builds with no builds) instead of leaving a
            band of raw background beneath it. `{children}` grows to fill via `flex-1`;
            header and footer stay direct siblings so neither is stretched. The globals.css
            body reset sets no display/min-height, so these utilities apply cleanly (no
            unlayered-wins conflict). */}
        <body className="flex min-h-screen flex-col">
          {/* Sprint 37 — OS-preference default (Keagan, DECISIONS_LOG.md 2026-07-21).
              FIRST CHILD OF <body> ON PURPOSE: it is parser-blocking, so it runs before
              any body content renders (no flash), and unlike an inline <script> floating
              in the layout above <body> it needs no React 19 hoisting behaviour to land
              somewhere useful. The App Router owns <head>, so this is the supported spot.
              It only acts when NO cookie exists — an explicit choice always wins. See
              src/lib/theme.ts for the full reasoning and the `\s` escaping trap. */}
          {/* ⚠️ `suppressHydrationWarning` IS REQUIRED HERE, and it is not papering over a
              bug. React deliberately does NOT serialize `nonce` into the client vdom (it
              would ship the nonce to the client bundle), so hydration compares the
              server's real `nonce="…"` against a client `nonce=""` and logs a mismatch on
              every page load. The one on <html> does not cover it — it only applies one
              level deep. Verified in a real browser: without this, the console carries a
              hydration error site-wide. "It works" is not "the console is clean." */}
          <script
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
          />
          {/* React 19 hoists resource links to <head>. See clerkFrontendOrigin. */}
          {clerkOrigin ? <link rel="preconnect" href={clerkOrigin} /> : null}
          <SiteHeader />
          <div className="flex-1">{children}</div>
          {/* QOL-D item 2. Links only — no data fetching, so it adds nothing to the
              cost of a page render and cannot fail. Hidden in print by class. */}
          <SiteFooter />
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
