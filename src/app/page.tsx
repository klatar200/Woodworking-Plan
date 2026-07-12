/**
 * Sprint 0 status page.
 *
 * This is deliberately NOT a landing page, a marketing page, or any part of
 * the product UI. It is the "hello world" surface BUILD_PLAN.md §4 asks Sprint
 * 0 to deploy end to end, and it reports the health of the provisioned stack
 * so a deploy can be verified from a phone.
 *
 * Sprint 3 (Plan Repository & Browse) replaces this route entirely.
 */
import { checkDatabase } from '@/lib/db';
import { isClerkConfigured } from '@/env';

export const dynamic = 'force-dynamic';

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <li className="status-row">
      <span className="status-dot" data-ok={ok} aria-hidden="true" />
      <span className="status-label">{label}</span>
      <span className="status-value">{value}</span>
    </li>
  );
}

export default async function Home() {
  const database = await checkDatabase();

  const databaseValue =
    database.status === 'ok'
      ? `connected (${database.latencyMs}ms)`
      : database.status === 'not_configured'
        ? 'not configured'
        : 'connection failed';

  const clerkConfigured = isClerkConfigured();

  return (
    <main className="page">
      <h1>Woodworking Plan</h1>
      <p className="subtitle">
        Sprint 0 — environment &amp; architecture. No product features yet.
      </p>

      <h2>Stack status</h2>
      <ul className="status-list">
        <StatusRow label="Next.js (Vercel)" value="running" ok />
        <StatusRow
          label="Neon Postgres"
          value={databaseValue}
          ok={database.status === 'ok'}
        />
        <StatusRow
          label="Clerk"
          value={clerkConfigured ? 'configured' : 'not configured'}
          ok={clerkConfigured}
        />
      </ul>

      <p className="footnote">
        Unconfigured services are expected until the vendor accounts are
        provisioned — see <code>DEPLOYMENT.md</code>.
      </p>
    </main>
  );
}
