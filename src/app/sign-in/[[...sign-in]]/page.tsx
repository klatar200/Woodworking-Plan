import { SignIn } from '@clerk/nextjs';

/**
 * Sign-in. Clerk's prebuilt component handles email/password and Google OAuth
 * (per DECISIONS_LOG.md, 2026-07-12) plus password reset, email verification,
 * and bot protection.
 *
 * Using Clerk's component rather than building a custom form is the entire point
 * of buying auth instead of building it (BUILD_PLAN.md §3, decision #5): auth
 * bugs are high-severity and low-differentiation. A hand-rolled login form is a
 * liability with no upside for this product.
 *
 * The catch-all `[[...sign-in]]` segment is required — Clerk routes its own
 * sub-steps (verification, factor-two, reset) under this path.
 *
 * NO `appearance` PROP (Sprint 37.2). It is set once on `<ClerkProvider>` in the root
 * layout, which picks light or dark from the theme; passing it here again would pin this
 * page to one theme — the white-flashbang-inside-dark-mode bug the sprint fixed.
 */
export default function SignInPage() {
  return (
    <main id="main" className="auth-page">
      <SignIn />
    </main>
  );
}
