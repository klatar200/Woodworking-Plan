import { clerkMiddleware } from '@clerk/nextjs/server';
import { isPublicRoute } from '@/lib/public-routes';

/**
 * Clerk middleware — the primary authorization boundary.
 *
 * SPRINT 2. The Sprint 0 "is Clerk configured?" guard is gone: Clerk is now a
 * hard dependency, and `src/env.ts` fails the boot in production if its keys are
 * missing. An app that silently runs without auth because a key was absent is a
 * far worse failure than an app that refuses to start.
 *
 * Routes are protected by DEFAULT — see src/lib/public-routes.ts for the
 * allowlist and the reasoning behind that direction.
 */
export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // Redirects anonymous browsers to sign-in; returns 404/401 for API routes.
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes.
    '/(api|trpc)(.*)',
  ],
};
