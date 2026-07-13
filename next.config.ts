import type { NextConfig } from 'next';

/**
 * Next.js config.
 *
 * SECURITY HEADERS (Sprint 9 hardening pass).
 *
 * Content-Security-Policy is NOT here — it lives in src/middleware.ts, because a
 * strong CSP needs a per-request nonce and a static config cannot generate one.
 * Everything below is request-independent and therefore belongs here.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Don't advertise the framework to attackers scanning for known Next.js CVEs.
  // Security through obscurity is not security — but there is no reason to hand
  // out a free hint either.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Stops the browser from second-guessing a Content-Type. Without it, a
          // response we serve as text/plain can be sniffed as executable script.
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // Clickjacking. CSP's frame-ancestors supersedes this in modern
          // browsers; this covers the older ones that ignore it.
          { key: 'X-Frame-Options', value: 'DENY' },

          // Don't leak the full URL (which can carry a search query) to third
          // parties on outbound navigation.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // The app needs none of these. Denying them means an injected script
          // cannot silently ask for them either.
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },

          // HSTS — Sprint 9.
          //
          // Tells the browser to refuse plain HTTP to this origin for two years,
          // which closes the first-request window an active attacker could use to
          // strip TLS. Vercel serves HTTPS regardless, but HSTS is what makes the
          // BROWSER enforce it before it ever contacts us.
          //
          // `preload` is deliberately OMITTED. Preloading hard-codes the domain
          // into browser binaries and is painful to reverse — it is a decision to
          // make on a real, permanent domain, and BUILD_PLAN.md §3 decision #8
          // (branding/domain) is still open. Revisit at launch.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },

          // Isolate this origin from cross-origin popups and embeds (Spectre-class
          // side channels, and window.opener tampering).
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
      {
        // The service worker must never be cached by a CDN or the browser, or a
        // deploy cannot fix a broken worker — the old one keeps serving from
        // cache and there is no way to reach the user.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
