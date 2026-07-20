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

  /**
   * AUDIT FIX 2026-07-19 — review photo uploads were capped at 1 MB, silently.
   *
   * Next's default `bodySizeLimit` for server actions is 1 MB, applied to the WHOLE
   * multipart request BEFORE the action runs — the failure never reaches our code, so
   * it cannot be caught or turned into a friendly notice. With the default in place,
   * `MAX_UPLOAD_BYTES` in src/lib/storage.ts was unreachable dead code and any review
   * photo over ~1 MB (i.e. most phone photos) failed with a framework error.
   *
   * 4 MB, not more, because Vercel's platform caps a serverless request body at
   * ~4.5 MB regardless of this setting — configuring above that would just move the
   * failure to an opaque platform 413. Our own per-file cap (also 4 MB) is what a user
   * actually hits, with a message. The real fix for big photos is client-side: the
   * review form downscales images to the stored size before upload
   * (src/components/photo-input.tsx), so a typical submission is well under 1 MB.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },

  /**
   * SPRINT 10 — build photos on Vercel Blob.
   *
   * next/image refuses any remote host not listed here, and it is an ALLOWLIST, which
   * is the right shape: without it, next/image would be an open image proxy that
   * anyone could point at any URL on the internet and make us pay to fetch and cache.
   *
   * This must be kept in step with `img-src` in src/middleware.ts. They are two
   * independent gates and BOTH must permit the host — miss either and photos are
   * silently blocked while the upload appears to succeed.
   */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      // Plan photos re-hosted on Cloudflare R2 (DECISIONS_LOG 2026-07-17). The host
      // is env-driven (`R2_PUBLIC_HOST`, e.g. `pub-xxxx.r2.dev` in dev, a custom
      // domain at launch) so repointing is one env change, not a re-migration.
      // MUST be set at BUILD time on Vercel or every plan image is silently blocked.
      // Kept in step with `img-src` in src/middleware.ts — BOTH gates or nothing.
      // Normalised: a value pasted WITH the scheme ("https://pub-x.r2.dev") would
      // otherwise be an invalid hostname here and silently match nothing.
      ...(process.env.R2_PUBLIC_HOST
        ? [
            {
              protocol: 'https' as const,
              hostname: process.env.R2_PUBLIC_HOST.trim()
                .replace(/^https?:\/\//i, '')
                .replace(/\/+$/, ''),
              pathname: '/**',
            },
          ]
        : []),
    ],
  },

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
      {
        // sw.js loads its policy via `importScripts('/sw-policy.js')`, so this file is
        // effectively part of the worker. It gets the SAME no-store rule: a cached copy
        // would let a stale policy keep running after a deploy shipped a new one — the
        // exact failure the /sw.js rule exists to prevent.
        source: '/sw-policy.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
