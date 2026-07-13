import { SignUp } from '@clerk/nextjs';

/**
 * Sign-up. See sign-in/page.tsx — same reasoning.
 */
export default function SignUpPage() {
  return (
    <main className="auth-page">
      <SignUp />
    </main>
  );
}
