import { PrismaClient } from '@prisma/client';
import { env, isDatabaseConfigured } from '@/env';

/**
 * Prisma client for Neon Postgres.
 *
 * Next.js hot-reloads modules in development, which would otherwise create a
 * new PrismaClient (and a new connection pool) on every reload until Neon
 * refuses connections. Caching on globalThis is the standard fix.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type DatabaseStatus =
  | { status: 'ok'; latencyMs: number }
  | { status: 'not_configured' }
  | { status: 'error'; message: string };

/**
 * Sprint 0's end-to-end database proof: can the deployed app actually reach
 * Neon? Uses a raw `SELECT 1` because Sprint 0 has no tables yet by design
 * (see prisma/schema.prisma).
 *
 * Never throws — a health check that crashes the process it is meant to report
 * on is useless. Returns a discriminated union the caller maps to a status code.
 */
export async function checkDatabase(): Promise<DatabaseStatus> {
  if (!isDatabaseConfigured()) {
    return { status: 'not_configured' };
  }

  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Date.now() - startedAt };
  } catch (error) {
    // Deliberately does NOT return the raw driver error: it can contain the
    // Neon connection string, including the password. Log it server-side,
    // return something safe to the caller.
    console.error('[health] database check failed:', error);
    return { status: 'error', message: 'Database connection failed' };
  }
}
