/**
 * Guard: DATABASE_URL and DIRECT_URL must point at the SAME database.
 *
 * WHY THIS EXISTS
 * ───────────────
 * Prisma uses two connection strings:
 *   • DATABASE_URL — pooled   → used by the running app
 *   • DIRECT_URL   — direct   → used by `prisma migrate` (PgBouncer can't migrate)
 *
 * They differ only by `-pooler` in the host. Nothing stops them pointing at two
 * *different databases* — and in Sprint 6 that is exactly what happened:
 * Vercel's DIRECT_URL was set to the **dev** branch while DATABASE_URL was
 * **production**. Every deploy dutifully ran `prisma migrate deploy`, reported
 * "No pending migrations to apply" (true — of dev), and left production's schema
 * frozen. The build was green. The deploy was green. Production 500'd on every
 * plan page because `SavedPlan` did not exist.
 *
 * It took reading a build log line-by-line to find, because every signal said OK.
 * That is the worst kind of bug, and it cost a sprint. So: assert it, at build
 * time, and fail loudly.
 *
 * A build that migrates one database and serves another is not a build worth
 * shipping.
 */

/** Strips `-pooler` so a pooled and a direct URL for the SAME db compare equal. */
function endpointOf(rawUrl, name) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${name} is not a valid URL`);
  }

  return {
    host: url.hostname.replace('-pooler', ''),
    database: url.pathname,
  };
}

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

// Both are required in a deploy. Locally, `npm run build` without them is fine —
// the app is not being migrated, so there is nothing to get wrong.
if (!databaseUrl || !directUrl) {
  console.log(
    '[check-db-urls] DATABASE_URL and/or DIRECT_URL not set — skipping check ' +
      '(expected for a local build or CI).',
  );
  process.exit(0);
}

const pooled = endpointOf(databaseUrl, 'DATABASE_URL');
const direct = endpointOf(directUrl, 'DIRECT_URL');

if (pooled.host !== direct.host || pooled.database !== direct.database) {
  console.error(
    [
      '',
      '╔══════════════════════════════════════════════════════════════════════╗',
      '║  DATABASE_URL and DIRECT_URL point at DIFFERENT DATABASES.           ║',
      '╚══════════════════════════════════════════════════════════════════════╝',
      '',
      `  DATABASE_URL (app runs here):     ${pooled.host}${pooled.database}`,
      `  DIRECT_URL   (migrations run here): ${direct.host}${direct.database}`,
      '',
      '  Migrations would be applied to one database while the app serves',
      '  another. The deploy would go green and production would break.',
      '',
      '  They must differ ONLY by "-pooler" in the hostname.',
      '  Fix the mismatched value in your environment (Vercel → Settings →',
      '  Environment Variables, or .env.local) and redeploy.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(
  `[check-db-urls] OK — both point at ${pooled.host}${pooled.database}`,
);

/**
 * AUDIT 2026-07-19 — R2_PUBLIC_HOST is a BUILD-TIME dependency for plan images.
 *
 * next.config.ts reads it into `images.remotePatterns` when the build runs; unset, the
 * pattern is simply absent and every R2-hosted plan photo is silently blocked by
 * next/image while everything else stays green — the same "two independent gates"
 * failure shape as the Clerk CSP bug. A WARNING, not a failure: a build without plan
 * images is degraded, not wrong (the image slot renders its honest placeholder), and
 * failing the deploy over it would take the whole site down instead.
 */
if (!process.env.R2_PUBLIC_HOST) {
  console.warn(
    '[check-db-urls] ⚠ R2_PUBLIC_HOST is not set. Plan photos hosted on R2 will be ' +
      'SILENTLY BLOCKED by next/image in this build (the CSP img-src and ' +
      'remotePatterns gates will both omit the host). Set it in Vercel → Settings → ' +
      'Environment Variables if plan images should render.',
  );
}
