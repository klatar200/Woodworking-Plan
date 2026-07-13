import { describe, it, expect } from 'vitest';
import nextConfig from '../next.config';

/**
 * Sprint 9 — security headers.
 *
 * These are asserted rather than eyeballed because headers are exactly the kind
 * of thing that silently disappears in a refactor and nobody notices until a
 * pentest — or a breach. A header you cannot prove is set is a header you should
 * assume is not.
 *
 * The Content-Security-Policy is NOT here: it needs a per-request nonce and so
 * lives in src/middleware.ts. This file covers the request-independent headers.
 */

async function headersFor(path: string): Promise<Record<string, string>> {
  const groups = await nextConfig.headers!();
  const out: Record<string, string> = {};

  for (const group of groups) {
    const source = group.source;
    const matches =
      source === '/:path*' || source === path || source.replace(/\/:path\*/, '') === '';
    if (source === path || (source === '/:path*' && true)) {
      if (source !== path && !matches) continue;
    }
    if (source === '/:path*' || source === path) {
      for (const header of group.headers) out[header.key.toLowerCase()] = header.value;
    }
  }

  return out;
}

describe('security headers (all routes)', () => {
  it('sets HSTS so the BROWSER refuses plain HTTP before it ever contacts us', async () => {
    const headers = await headersFor('/:path*');
    const hsts = headers['strict-transport-security'];

    expect(hsts).toBeDefined();
    // Two years. A short max-age leaves a window an active attacker can use.
    expect(hsts).toMatch(/max-age=\d{7,}/);
    expect(hsts).toContain('includeSubDomains');

    // `preload` is deliberately ABSENT — it hard-codes the domain into browser
    // binaries and is painful to reverse. That is a decision for a real,
    // permanent domain, and branding (decision #8) is still open.
    expect(hsts).not.toContain('preload');
  });

  it('blocks MIME sniffing — a text/plain response must not execute as script', async () => {
    const headers = await headersFor('/:path*');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  it('blocks clickjacking (belt and braces with CSP frame-ancestors)', async () => {
    const headers = await headersFor('/:path*');
    expect(headers['x-frame-options']).toBe('DENY');
  });

  it('does not leak the full URL — a search query — to third parties', async () => {
    const headers = await headersFor('/:path*');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('denies powerful browser APIs the app never uses', async () => {
    const headers = await headersFor('/:path*');
    const policy = headers['permissions-policy'];

    // An injected script must not be able to silently ask for these either.
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment']) {
      expect(policy, feature).toContain(`${feature}=()`);
    }
  });

  it('isolates the origin from cross-origin popups (Spectre / window.opener)', async () => {
    const headers = await headersFor('/:path*');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  });

  it('does not advertise the framework version to CVE scanners', async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});

describe('service worker headers', () => {
  it('is never cached — otherwise a broken worker cannot be fixed by a deploy', async () => {
    const groups = await nextConfig.headers!();
    const sw = groups.find((g) => g.source === '/sw.js');

    expect(sw, '/sw.js must have its own header rule').toBeDefined();

    const cacheControl = sw!.headers.find(
      (h) => h.key.toLowerCase() === 'cache-control',
    )?.value;

    // If the browser caches sw.js, the OLD worker keeps serving from the OLD
    // cache and there is no way to reach the user with a fix. This is the single
    // most important header on the site.
    expect(cacheControl).toContain('no-store');
  });
});
