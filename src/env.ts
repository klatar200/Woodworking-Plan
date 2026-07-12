import { z } from 'zod';

/**
 * Runtime environment validation.
 *
 * Why this exists: secrets and connection strings are the single easiest way
 * to ship a broken or insecure deploy. Validating them at startup turns a
 * silent production misconfiguration into a loud, immediate failure.
 *
 * Sprint 0 rules:
 *  - DATABASE_URL (Neon) and the Clerk keys are OPTIONAL in development and
 *    test, so the app can be run and verified locally before the user has
 *    provisioned the vendor accounts (see DEPLOYMENT.md).
 *  - They are REQUIRED in production. A production deploy missing them fails
 *    fast rather than serving a half-working app.
 *
 * Sprint 2 (Accounts & Auth) should tighten the Clerk keys to required
 * everywhere once auth is actually a feature.
 */

const isProduction = process.env.NODE_ENV === 'production';

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Neon Postgres. Must be a postgres connection string when present.
  DATABASE_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'DATABASE_URL must be a postgres:// or postgresql:// connection string',
    })
    .optional(),

  // Clerk secret key. Server-side only — must never reach the browser.
  CLERK_SECRET_KEY: z
    .string()
    .startsWith('sk_', { message: 'CLERK_SECRET_KEY must start with sk_' })
    .optional(),

  // Clerk publishable key. Safe to expose to the browser by design.
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith('pk_', { message: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_' })
    .optional(),
});

export type Env = z.infer<typeof serverSchema>;

/** Keys that are optional in dev/test but mandatory in production. */
const REQUIRED_IN_PRODUCTION = [
  'DATABASE_URL',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
] as const;

/**
 * Parses and validates an environment object. Exported (rather than only
 * running on the module-level `process.env`) so tests can exercise the real
 * validation logic against controlled inputs.
 *
 * @throws if validation fails, with every problem listed at once.
 */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = serverSchema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${problems}`);
  }

  const env = result.data;

  if (env.NODE_ENV === 'production') {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables in production:\n` +
          missing.map((key) => `  - ${key}`).join('\n') +
          `\nSee DEPLOYMENT.md for how to provision these.`,
      );
    }
  }

  return env;
}

/**
 * Skipped during `next build`, which imports modules without real runtime env.
 * Validation still runs on every real server start and in tests.
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

export const env: Env = isBuildPhase
  ? (process.env as unknown as Env)
  : parseEnv(process.env);

/** True when the app has enough config to talk to Neon. */
export const isDatabaseConfigured = (): boolean => Boolean(env.DATABASE_URL);

/** True when the app has enough config to mount Clerk. */
export const isClerkConfigured = (): boolean =>
  Boolean(env.CLERK_SECRET_KEY && env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export { isProduction };
