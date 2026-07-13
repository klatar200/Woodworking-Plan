import { z } from 'zod';

/**
 * Runtime environment validation.
 *
 * Why this exists: secrets and connection strings are the single easiest way
 * to ship a broken or insecure deploy. Validating them at startup turns a
 * silent production misconfiguration into a loud, immediate failure.
 *
 * Rules:
 *  - DATABASE_URL (Neon) and the Clerk keys are OPTIONAL in development and
 *    test, so the app and its test suite can run without vendor credentials.
 *  - They are REQUIRED in production. A production deploy missing them fails
 *    fast rather than serving a half-working app.
 *
 * SPRINT 2 SECURITY NOTE: Clerk is now a hard dependency — auth is a real
 * feature, not a stub. The production check below is what guarantees the app
 * cannot boot in production without it. An app that silently serves unprotected
 * pages because a key was missing is far more dangerous than one that refuses
 * to start, so this fails closed on purpose.
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
  // Direct (non-pooled) Neon connection. Used ONLY by `prisma migrate` — the
  // pooled endpoint cannot run migrations. Not required by the running app, so
  // it is not in REQUIRED_IN_PRODUCTION: Vercel needs it at build time (for
  // `migrate deploy`), not at request time.
  DIRECT_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'DIRECT_URL must be a postgres:// or postgresql:// connection string',
    })
    .optional(),

  CLERK_SECRET_KEY: z
    .string()
    .startsWith('sk_', { message: 'CLERK_SECRET_KEY must start with sk_' })
    .optional(),

  // Clerk publishable key. Safe to expose to the browser by design.
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith('pk_', { message: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_' })
    .optional(),

  // Upstash Redis — rate limiting for server actions.
  //
  // OPTIONAL EVERYWHERE, including production. That is deliberate: the limiter
  // FAILS OPEN (see src/lib/rate-limit.ts). It is an abuse control, not an
  // authorization control — authorization is requireUser(), and that fails closed.
  // Making these required would mean a missing env var takes the whole app down,
  // which trades a real outage for a hypothetical abuse problem.
  //
  // They ARE required for the limiter to do anything, and their absence is logged.
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Vercel Blob — build-photo storage (Sprint 10). A SECRET: it grants write and
  // delete on the store. Never NEXT_PUBLIC_.
  //
  // Optional, and NOT in REQUIRED_IN_PRODUCTION. Without it, photo upload is
  // disabled and the rest of reviews still works — a missing storage token should
  // cost you the photo feature, not the site. Vercel injects this automatically once
  // a Blob store is linked to the project.
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),

  // Admin allowlist — comma-separated Clerk user ids (`user_xxx,user_yyy`).
  //
  // This is the ONLY thing that grants delete-any-review power (DECISIONS_LOG
  // 2026-07-13: UGC publishes immediately, owner can delete). It is an ALLOWLIST and
  // it fails CLOSED: unset means NOBODY is an admin, which is the safe direction to
  // fail. Ids, not emails — an email is mutable and, if Clerk ever allowed an
  // unverified one, forgeable. A Clerk user id is neither.
  ADMIN_USER_IDS: z.string().optional(),
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
