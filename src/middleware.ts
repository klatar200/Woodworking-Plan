import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isPublicRoute } from '@/lib/public-routes';

/**
 * Middleware — the authorization boundary AND the Content-Security-Policy.
 *
 * ── AUTHORIZATION (Sprint 2) ─────────────────────────────────────────────
 * Routes are private by DEFAULT. `src/lib/public-routes.ts` is an ALLOWLIST;
 * everything not on it requires a session. An allowlist fails CLOSED (forget a
 * public route → it demands a login). A denylist fails OPEN (forget a private
 * route → it's world-readable).
 *
 * ── CONTENT-SECURITY-POLICY (Sprint 9) ───────────────────────────────────
 * CSP is the last line of defence against XSS: even if an injection got through
 * React's escaping, the browser refuses to execute the injected script.
 *
 * It is set HERE, not in next.config.ts, because a strong CSP needs a **per-request
 * nonce** — and a static config file cannot generate one. `script-src` with
 * `'unsafe-inline'` would be a CSP in name only; it permits exactly the thing CSP
 * exists to stop.
 *
 * Next.js picks the nonce up from the CSP header on the request and stamps it onto
 * its own <script> tags automatically.
 *
 * `'strict-dynamic'`: scripts loaded BY a nonce'd script inherit trust. This is
 * what lets Clerk's loader pull in its own bundle without us allowlisting every
 * URL it might ever use — and it means the `https:` fallback below is ignored by
 * any browser that understands strict-dynamic (it exists only for older ones).
 *
 * `style-src 'unsafe-inline'`: kept, deliberately. Next.js and Clerk both inject
 * inline styles, and there is no nonce plumbing for them. Inline *styles* are a
 * far smaller risk than inline *scripts* — the attack surface is CSS exfiltration,
 * not code execution — and refusing them would break the app for no real gain.
 * A `style-src` nonce is worth revisiting; a `script-src` compromise is not.
 */
export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // Redirects anonymous browsers to sign-in; 404s/401s API routes.
    await auth.protect();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Plan photos re-hosted on Cloudflare R2 (DECISIONS_LOG 2026-07-17). Host is
  // env-driven so dev (pub-xxxx.r2.dev) and a launch custom domain are one env
  // change apart. MUST match `remotePatterns` in next.config.ts — two independent
  // gates, miss either and images 404 while everything "looks" fine.
  // Normalised: a value pasted WITH the scheme would emit `https://https://…`
  // into the CSP, which matches nothing and blocks every image silently.
  const r2Host = process.env.R2_PUBLIC_HOST?.trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  const r2ImgSrc = r2Host ? ` https://${r2Host}` : '';

  const csp = [
    // Nothing loads from anywhere unless a directive below says otherwise.
    `default-src 'self'`,

    // Scripts: only ours, only with this request's nonce. Everything Clerk loads
    // is trusted transitively via strict-dynamic rather than by URL allowlist.
    //
    // DEV ONLY (2026-07-16): `next dev`'s react-refresh runtime calls eval(), so
    // under the strict CSP every client component silently fails to hydrate in
    // dev — no filter auto-open, no tabs, no step walker — which had us testing
    // interactivity against a page whose JS was dead. `'unsafe-eval'` is added
    // ONLY when NODE_ENV !== 'production'; the production header is unchanged.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:${
      process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''
    }`,

    // See the note above — inline styles are permitted, inline scripts are not.
    `style-src 'self' 'unsafe-inline'`,

    // Clerk serves user avatars; `data:` covers inlined SVG/PNG.
    //
    // SPRINT 10: `*.public.blob.vercel-storage.com` is where build photos live. Miss
    // this and every uploaded photo is silently blocked by the browser while the
    // upload itself "works" — the exact failure shape as the Clerk CSP bug, which
    // shipped twice. It must ALSO be allowlisted in next.config.ts for next/image;
    // either one alone is not enough.
    `img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://*.public.blob.vercel-storage.com${r2ImgSrc}`,

    `font-src 'self' data:`,

    // Clerk's API and telemetry. Nothing else may be contacted from the browser —
    // this is what stops an injected script from exfiltrating to its own server.
    `connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com`,

    // Clerk renders parts of its UI in an iframe.
    `frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com`,

    // The service worker (Sprint 8).
    // `blob:` is required: Clerk spawns its workers from blob URLs. Without it the
    // browser blocks them and Clerk's session handling degrades silently.
    //
    // The risk is acceptable and bounded — a blob worker can only be created by
    // script that was ALREADY allowed to run, and script-src is nonce-gated. So
    // this widens what trusted code may do; it does not widen what code is trusted.
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,

    // No Flash/Java/embeds, ever.
    `object-src 'none'`,

    // An injected <base> tag would silently re-point every relative URL on the
    // page — including our form actions. Cheap to forbid; nasty if forgotten.
    `base-uri 'self'`,

    // Forms may only submit to us. Blocks an injected form from posting a user's
    // input to an attacker's endpoint.
    `form-action 'self'`,

    // Clickjacking. Belt-and-braces with X-Frame-Options for older browsers.
    `frame-ancestors 'none'`,

    `upgrade-insecure-requests`,
  ].join('; ');

  // Next.js reads the nonce from the CSP on the REQUEST headers.
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers } });

  // ...and the browser needs it on the RESPONSE.
  response.headers.set('content-security-policy', csp);

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes.
    '/(api|trpc)(.*)',
  ],
};
