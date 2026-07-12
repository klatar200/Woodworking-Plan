import { NextResponse } from 'next/server';
import { checkDatabase } from '@/lib/db';
import { isClerkConfigured } from '@/env';

/**
 * GET /api/health
 *
 * Sprint 0's "hello world, end to end" proof: this single endpoint exercises
 * the whole provisioned stack — a Next.js API route (Vercel) reaching Neon
 * Postgres, and reporting whether Clerk is configured.
 *
 * Never cached: a cached health check reports the past, not the present.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const database = await checkDatabase();

  const body = {
    status: database.status === 'error' ? 'degraded' : 'ok',
    // Reports *whether* Clerk is configured, never the key values themselves.
    services: {
      database,
      clerk: { configured: isClerkConfigured() },
    },
    timestamp: new Date().toISOString(),
  };

  // 503 when a dependency we depend on is actually broken. 'not_configured'
  // is a valid pre-provisioning state during Sprint 0, not a failure.
  const httpStatus = database.status === 'error' ? 503 : 200;

  return NextResponse.json(body, { status: httpStatus });
}
