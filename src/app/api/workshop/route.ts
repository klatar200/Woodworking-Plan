import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listFilterableTools } from '@/lib/plans';
import { getOwnedToolSlugs } from '@/lib/workshop';

/**
 * GET /api/workshop — the data the AccountModal's Workshop section needs — QOL-L.
 *
 * PRIVATE. Not on `PUBLIC_ROUTES`, so the middleware `auth.protect()`s it (401 for an
 * anonymous request). The `getCurrentUser()` gate below is a second, independent check
 * that returns a clean JSON 401 rather than relying on the middleware alone — same
 * fail-closed posture as every private surface here.
 *
 * Returns the SAME tool list the catalog filter/workshop form use (tools some published
 * plan requires) plus the caller's own owned-tool slugs. No `userId` is accepted; the
 * owner is the verified session (`getOwnedToolSlugs` derives it). Fetched client-side
 * when the modal opens so the header doesn't pay a DB round-trip on every page render.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [tools, owned] = await Promise.all([
    listFilterableTools(),
    getOwnedToolSlugs(),
  ]);

  return NextResponse.json({ tools, owned });
}
