import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { isClerkConfigured } from '@/env';

/**
 * Clerk middleware.
 *
 * SPRINT 0 SCOPE: Clerk is *configured and wired*, but NO route is protected
 * and no auth feature exists. Sign up / login / session handling / user profile
 * are Sprint 2 deliverables (BUILD_PLAN.md §4) — building them here would be
 * scope drift.
 *
 * `clerkMiddleware()` with no route matcher makes every route public by
 * default. Sprint 2 adds `createRouteMatcher` + `auth.protect()` here.
 *
 * The config guard exists for the same reason as the one in layout.tsx: the
 * Clerk account may not be provisioned yet (see DEPLOYMENT.md), and
 * clerkMiddleware throws without keys. Sprint 2 removes the guard.
 */
export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!isClerkConfigured()) {
    return NextResponse.next();
  }
  return clerkMiddleware()(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes.
    '/(api|trpc)(.*)',
  ],
};
