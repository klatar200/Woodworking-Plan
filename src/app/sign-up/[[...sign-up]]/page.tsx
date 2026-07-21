import { SignUp } from '@clerk/nextjs';

/**
 * Sign-up. See sign-in/page.tsx — same reasoning, including why there is no `appearance`
 * prop (Sprint 37.2: the root layout's `<ClerkProvider>` is the single theme source).
 */
export default function SignUpPage() {
  return (
    <main id="main" className="auth-page">
      <SignUp />
    </main>
  );
}
