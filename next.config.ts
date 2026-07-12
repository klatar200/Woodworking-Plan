import type { NextConfig } from 'next';

/**
 * Sprint 0 baseline Next.js config.
 *
 * PWA/service-worker configuration is deliberately NOT here — that is a
 * Sprint 8 deliverable (BUILD_PLAN.md §4). This config carries only what
 * Sprint 0 needs: strict React checks and baseline security headers.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Baseline hardening. Sprint 9 does the full OWASP pass; these are the
  // no-brainer headers that cost nothing to set correctly from day one.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
