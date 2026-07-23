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
const url = process.env.DATABASE_URL || '';
if (!url) {
  console.error('✗ DATABASE_URL not set. Run via:  npx dotenv -e .env.local -- node scripts/reset-plans-db.mjs');
  process.exit(1);
}
let host = '(unparseable)';
try { host = new URL(url).host; } catch { /* keep placeholder */ }

const prisma = new PrismaClient();

async function main() {
  const n = await prisma.plan.count();
  console.log(`Target DB host : ${host}`);
  console.log(`Plans in DB    : ${n}`);
  console.log(
    'This will DELETE ALL plans — steps, images, materials, cut lists, tool links, and any\n' +
      'user rows tied to plans (reviews, likes, saves, shopping-list, views) via ON DELETE CASCADE.',
  );
  if (!YES) {
    console.log('\n[dry-run] nothing deleted. CONFIRM the host above is the intended DB, then re-run with --yes.');
    return;
  }
  const res = await prisma.plan.deleteMany({});
  console.log(`\n✓ Deleted ${res.count} plans (children + user rows cascaded). Now run:  npm run db:seed`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
