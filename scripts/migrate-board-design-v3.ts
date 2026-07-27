/**
 * migrate-board-design-v3.ts — optional tidiness: persist schemaVersion 3 configs
 * for BoardDesign rows still stored as v1/v2. On-read parseConfig already upgrades
 * every load (Sprint 74); this script only rewrites JSON in the DB.
 *
 * SAFETY: dry-run by DEFAULT. Requires --yes to write. Prints target DB host and
 * per-row counts. Every write goes through parseConfig so invalid configs are
 * skipped (never persisted).
 *
 * Prisma CLI / PrismaClient need DATABASE_URL from .env.local via dotenv-cli.
 *
 * RUN (PowerShell, repo root):
 *   npx dotenv -e .env.local -- npx tsx scripts/migrate-board-design-v3.ts
 *   npx dotenv -e .env.local -- npx tsx scripts/migrate-board-design-v3.ts --yes
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { parseConfig } from '../src/lib/board-designer/serialize';

const YES = process.argv.includes('--yes');
const url = process.env.DATABASE_URL || '';
if (!url) {
  console.error(
    '✗ DATABASE_URL not set. Run via:\n' +
      '  npx dotenv -e .env.local -- npx tsx scripts/migrate-board-design-v3.ts',
  );
  process.exit(1);
}

let host = '(unparseable)';
try {
  host = new URL(url).host;
} catch {
  /* keep placeholder */
}

const prisma = new PrismaClient();

function storedVersion(config: Prisma.JsonValue): number | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
  const v = (config as { schemaVersion?: unknown }).schemaVersion;
  return typeof v === 'number' ? v : null;
}

async function main() {
  console.log(`Target DB host : ${host}`);
  console.log(`Mode          : ${YES ? 'WRITE (--yes)' : 'DRY-RUN (default)'}`);

  const rows = await prisma.boardDesign.findMany({
    select: { id: true, name: true, config: true },
    orderBy: { updatedAt: 'asc' },
  });

  let alreadyV3 = 0;
  let wouldUpdate = 0;
  let wasteZeroed = 0;
  let invalid = 0;
  let unchangedAfterParse = 0;

  for (const row of rows) {
    const beforeVersion = storedVersion(row.config);
    const parsed = parseConfig(row.config);
    if (!parsed.ok) {
      invalid += 1;
      console.log(`  SKIP invalid  ${row.id}  ${row.name}  (${parsed.error})`);
      continue;
    }

    if (beforeVersion === 3) {
      alreadyV3 += 1;
      continue;
    }

    const beforeWaste =
      row.config &&
      typeof row.config === 'object' &&
      !Array.isArray(row.config) &&
      typeof (row.config as { wasteFactor?: unknown }).wasteFactor === 'number'
        ? (row.config as { wasteFactor: number }).wasteFactor
        : null;

    const after = parsed.config;
    const sameJson =
      JSON.stringify(row.config) === JSON.stringify(after);
    if (sameJson) {
      unchangedAfterParse += 1;
      continue;
    }

    wouldUpdate += 1;
    if (beforeWaste === 0.15 && after.wasteFactor === 0) wasteZeroed += 1;
    console.log(
      `  ${YES ? 'UPDATE' : 'WOULD'}  ${row.id}  v${beforeVersion ?? '?'}→3` +
        (beforeWaste === 0.15 && after.wasteFactor === 0
          ? '  waste 0.15→0'
          : `  waste ${beforeWaste}→${after.wasteFactor}`) +
        `  ${row.name}`,
    );

    if (YES) {
      await prisma.boardDesign.update({
        where: { id: row.id },
        data: { config: after as unknown as Prisma.InputJsonValue },
      });
    }
  }

  console.log('\nCounts:');
  console.log(`  rows scanned     : ${rows.length}`);
  console.log(`  already v3       : ${alreadyV3}`);
  console.log(`  ${YES ? 'updated' : 'would update'}     : ${wouldUpdate}`);
  console.log(`  waste 0.15→0     : ${wasteZeroed}`);
  console.log(`  invalid skipped  : ${invalid}`);
  console.log(`  parse no-op      : ${unchangedAfterParse}`);

  if (!YES && wouldUpdate > 0) {
    console.log(
      '\nDry-run only. Re-run with --yes to persist (confirm host above first).',
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
