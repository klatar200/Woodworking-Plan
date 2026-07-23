// @ts-check
/**
 * reset-plans-db.mjs — delete ALL Plan rows so the next `db:seed` rebuilds the catalog
 * EXACTLY from content/plans. The seed upserts on slug and never prunes, so after a full
 * catalog swap the old plans would otherwise linger; this is the deliberate reset.
 *
 * Every Plan relation is ON DELETE CASCADE (verified in schema.prisma): deleting a plan
 * removes its steps, images, materials, cut-list, tool links, AND any user rows tied to
 * it (reviews, likes, saves, shopping-list entries, views, path steps). That is safe
 * pre-launch (no real users); after launch you would prune instead of reset.
 *
 * SAFETY: dry-run by DEFAULT (counts only). --yes to execute. It PRINTS THE DB HOST first
 * — confirm it is the DB you mean (dev vs prod) before passing --yes.
 *
 * RUN (PowerShell, repo root — DATABASE_URL comes from .env.local via dotenv):
 *   npx dotenv -e .env.local -- node scripts/reset-plans-db.mjs           # preview
 *   npx dotenv -e .env.local -- node scripts/reset-plans-db.mjs --yes     # execute, then: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';

const YES = process.argv.includes('--yes');
// --paths-only: clear just the learning-path rows (leave plans). Used to remove stale
// Path rows the plan-reset leaves behind (Path is not a child of Plan, so it doesn't
// cascade). A full reset (no flag) clears BOTH, so the seed rebuilds both from content.
const PATHS_ONLY = process.argv.includes('--paths-only');
const url = process.env.DATABASE_URL || '';
if (!url) {
  console.error('✗ DATABASE_URL not set. Run via:  npx dotenv -e .env.local -- node scripts/reset-plans-db.mjs');
  process.exit(1);
}
let host = '(unparseable)';
try { host = new URL(url).host; } catch { /* keep placeholder */ }

const prisma = new PrismaClient();

async function main() {
  const nPlans = await prisma.plan.count();
  const nPaths = await prisma.path.count();
  console.log(`Target DB host : ${host}`);
  console.log(`Plans in DB    : ${nPlans}`);
  console.log(`Paths in DB    : ${nPaths}`);
  console.log(
    PATHS_ONLY
      ? 'This will DELETE ALL learning paths (path steps cascade). Plans are left untouched.'
      : 'This will DELETE ALL plans — steps, images, materials, cut lists, tool links, and any user\n' +
          'rows tied to plans (reviews, likes, saves, shopping-list, views) via ON DELETE CASCADE —\n' +
          'AND all learning paths, so the seed rebuilds the catalog exactly from content.',
  );
  if (!YES) {
    console.log('\n[dry-run] nothing deleted. CONFIRM the host above is the intended DB, then re-run with --yes.');
    return;
  }
  if (!PATHS_ONLY) {
    const rp = await prisma.plan.deleteMany({});
    console.log(`Deleted ${rp.count} plans (children + user rows cascaded).`);
  }
  const rpath = await prisma.path.deleteMany({});
  console.log(`Deleted ${rpath.count} learning paths.`);
  console.log(PATHS_ONLY ? '\n✓ Stale paths cleared.' : '\n✓ Catalog reset. Now run:  npm run db:seed');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
