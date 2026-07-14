import { SignUp } from '@clerk/nextjs';
import { clerkAppearance } from '@/lib/clerk-appearance';

/**
 * Sign-up. See sign-in/page.tsx — same reasoning.
 */
export default function SignUpPage() {
  return (
    <main id="main" className="auth-page">
      <SignUp appearance={clerkAppearance} />
    </main>
  );
}
