import { describe, it, expect, afterEach, vi } from 'vitest';
import { parseEnv } from '@/env';

/**
 * These tests exercise the real validation logic in src/env.ts against
 * controlled inputs. They guard the two failure modes that actually bite:
 * (a) a production deploy silently missing a secret, and (b) a malformed
 * connection string or key sneaking through.
 */

const BASE = {
  DATABASE_URL: 'postgresql://u:p@ep-x-pooler.aws.neon.tech/neondb?sslmode=require',
  CLERK_SECRET_KEY: 'sk_test_abc123',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123',
};

const asEnv = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe('parseEnv', () => {
  it('allows a completely empty env in development, so the app runs before vendors are provisioned', () => {
    const env = parseEnv(asEnv({ NODE_ENV: 'development' }));
    expect(env.NODE_ENV).toBe('development');
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.CLERK_SECRET_KEY).toBeUndefined();
  });

  it('defaults NODE_ENV to development when unset', () => {
    expect(parseEnv(asEnv({})).NODE_ENV).toBe('development');
  });

  it('accepts a fully-configured production env', () => {
    const env = parseEnv(asEnv({ NODE_ENV: 'production', ...BASE }));
    expect(env.DATABASE_URL).toBe(BASE.DATABASE_URL);
  });

  it('throws in production when required vars are missing, and names EVERY missing one', () => {
    let message = '';
    try {
      parseEnv(asEnv({ NODE_ENV: 'production' }));
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('Missing required environment variables in production');
    expect(message).toContain('DATABASE_URL');
    expect(message).toContain('CLERK_SECRET_KEY');
    expect(message).toContain('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  });

  it('throws in production when only SOME required vars are present', () => {
    expect(() =>
      parseEnv(asEnv({ NODE_ENV: 'production', DATABASE_URL: BASE.DATABASE_URL })),
    ).toThrow(/CLERK_SECRET_KEY/);
  });

  it('rejects a DATABASE_URL that is a valid URL but not a postgres one', () => {
    expect(() => parseEnv(asEnv({ DATABASE_URL: 'mysql://u:p@host/db' }))).toThrow(
      /postgres/,
    );
  });

  it('rejects a DATABASE_URL that is not a URL at all', () => {
    expect(() => parseEnv(asEnv({ DATABASE_URL: 'not-a-url' }))).toThrow(/DATABASE_URL/);
  });

  it('rejects a Clerk secret key with the wrong prefix (a publishable key pasted by mistake)', () => {
    expect(() => parseEnv(asEnv({ CLERK_SECRET_KEY: 'pk_test_oops' }))).toThrow(
      /must start with sk_/,
    );
  });

  it('rejects a Clerk publishable key with the wrong prefix', () => {
    expect(() =>
      parseEnv(asEnv({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'sk_test_oops' })),
    ).toThrow(/must start with pk_/);
  });

  it('rejects an unknown NODE_ENV rather than silently treating it as development', () => {
    expect(() => parseEnv(asEnv({ NODE_ENV: 'staging' }))).toThrow();
  });
});

describe('isClerkConfigured', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is false when neither key is set', async () => {
    vi.resetModules();
    const { isClerkConfigured } = await import('@/env');
    expect(isClerkConfigured()).toBe(false);
  });

  it('is FALSE when only one of the two keys is set - a half-configured Clerk must not count as configured', async () => {
    vi.stubEnv(
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      BASE.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    );
    vi.resetModules();
    const { isClerkConfigured } = await import('@/env');
    expect(isClerkConfigured()).toBe(false);
  });

  it('is true only when both keys are set', async () => {
    vi.stubEnv(
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      BASE.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    );
    vi.stubEnv('CLERK_SECRET_KEY', BASE.CLERK_SECRET_KEY);
    vi.resetModules();
    const { isClerkConfigured } = await import('@/env');
    expect(isClerkConfigured()).toBe(true);
  });
});
