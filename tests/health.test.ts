import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Sprint 0's core behaviour is "can the deployed app prove it reached Neon".
 * These tests cover the three states that matter — not configured, connected,
 * and broken — plus the security property that a driver error must never leak
 * the Neon connection string (which contains the password) to a caller.
 */

const queryRaw = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    $queryRaw = queryRaw;
  },
}));

const DB_URL = 'postgresql://u:hunter2@ep-x-pooler.aws.neon.tech/neondb?sslmode=require';

beforeEach(() => {
  queryRaw.mockReset();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('checkDatabase', () => {
  it('reports not_configured (not an error) when DATABASE_URL is absent', async () => {
    const { checkDatabase } = await import('@/lib/db');
    const result = await checkDatabase();

    expect(result).toEqual({ status: 'not_configured' });
    // The important part: it must not even attempt a query.
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('reports ok with a latency measurement when the SELECT 1 succeeds', async () => {
    vi.stubEnv('DATABASE_URL', DB_URL);
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const { checkDatabase } = await import('@/lib/db');
    const result = await checkDatabase();

    expect(result.status).toBe('ok');
    expect(queryRaw).toHaveBeenCalledOnce();
    if (result.status === 'ok') {
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('reports error instead of throwing when the database is unreachable', async () => {
    vi.stubEnv('DATABASE_URL', DB_URL);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    queryRaw.mockRejectedValue(new Error('ECONNREFUSED'));

    const { checkDatabase } = await import('@/lib/db');
    const result = await checkDatabase();

    expect(result.status).toBe('error');
  });

  it('SECURITY: never leaks the connection string or password in the returned error', async () => {
    vi.stubEnv('DATABASE_URL', DB_URL);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // A real Prisma connection error embeds the connection string.
    queryRaw.mockRejectedValue(new Error(`Can't reach database server at ${DB_URL}`));

    const { checkDatabase } = await import('@/lib/db');
    const result = await checkDatabase();

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('hunter2');
    expect(serialized).not.toContain('neon.tech');
    expect(result).toEqual({ status: 'error', message: 'Database connection failed' });
  });
});

describe('GET /api/health', () => {
  it('returns 200 and status ok when the database is not configured', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.services.database).toEqual({ status: 'not_configured' });
    expect(body.services.clerk).toEqual({ configured: false });
  });

  it('returns 200 and status ok when the database is reachable', async () => {
    vi.stubEnv('DATABASE_URL', DB_URL);
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.services.database.status).toBe('ok');
  });

  it('returns 503 and status degraded when the database is broken', async () => {
    vi.stubEnv('DATABASE_URL', DB_URL);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    queryRaw.mockRejectedValue(new Error('ECONNREFUSED'));

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
  });

  it('SECURITY: reports only WHETHER Clerk is configured, never the key values', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_supersecret');
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_public');

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const body = await response.json();

    expect(body.services.clerk).toEqual({ configured: true });
    expect(JSON.stringify(body)).not.toContain('supersecret');
  });
});
