import { PrismaClient } from '@prisma/client';
import { loadCatalog } from '../src/content/load';

/**
 * Seeds the plan catalog from content/ into Postgres.
 *
 * IDEMPOTENT BY DESIGN. Everything upserts on its natural key (slug), and a
 * plan's children (tools/materials/cut list/steps/images) are deleted and
 * rewritten inside a transaction. Running `npm run db:seed` ten times leaves the
 * database in exactly the same state as running it once.
 *
 * Why that matters: the alternative — a create-only seeder — either explodes on
 * the second run or silently duplicates the catalog. Content will be edited and
 * re-seeded constantly during Sprints 3–5, so re-runnability is the whole job.
 *
 * SAFETY: this script never drops a table and never deletes a plan that is not
 * in content/. It is additive/updating only. Removing a plan from the catalog is
 * an irreversible data action and stays a deliberate, separate decision.
 */

const prisma = new PrismaClient();

/**
 * Prints the database host this run is about to write to.
 *
 * Cheap, and it exists because dev and production were briefly pointed at the
 * same Neon database. The separation (a Neon dev branch) is the real fix; this
 * is the seatbelt. You should never have to wonder which database you just
 * seeded — and the password is stripped, so this is safe to paste into a chat.
 */
function describeTarget(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'UNKNOWN (DATABASE_URL not set)';
  try {
    const { host, pathname } = new URL(url);
    return `${host}${pathname}`;
  } catch {
    return 'UNPARSEABLE DATABASE_URL';
  }
}

async function main() {
  const { categories, tools, plans } = loadCatalog();

  console.log(`Target database: ${describeTarget()}`);
  console.log(
    `Seeding: ${categories.length} categories, ${tools.length} tools, ${plans.length} plans`,
  );

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: category,
    });
  }

  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { slug: tool.slug },
      create: tool,
      update: tool,
    });
  }

  // Resolve slugs → ids once, rather than querying inside the plan loop.
  const categoryIds = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [
      c.slug,
      c.id,
    ]),
  );
  const toolIds = new Map(
    (await prisma.tool.findMany({ select: { id: true, slug: true } })).map((t) => [
      t.slug,
      t.id,
    ]),
  );

  for (const plan of plans) {
    const categoryId = categoryIds.get(plan.category);
    if (!categoryId) {
      // loadCatalog() already proved this cannot happen. Belt and braces.
      throw new Error(`Unknown category "${plan.category}" for plan "${plan.slug}"`);
    }

    const scalars = {
      title: plan.title,
      summary: plan.summary,
      description: plan.description,
      categoryId,
      difficulty: plan.difficulty,
      timeMinMinutes: plan.timeMinMinutes,
      timeMaxMinutes: plan.timeMaxMinutes,
      timeLabel: plan.timeLabel,
      costTier: plan.costTier,
      costMinCents: plan.costMinCents,
      costMaxCents: plan.costMaxCents,
      tags: plan.tags,
      published: plan.published,
      publishedAt: plan.published ? new Date() : null,
    };

    // One transaction per plan: a plan is either fully rewritten or untouched.
    // A plan with its old steps and its new cut list would be worse than no plan.
    await prisma.$transaction(async (tx) => {
      const saved = await tx.plan.upsert({
        where: { slug: plan.slug },
        create: { slug: plan.slug, ...scalars },
        update: scalars,
      });

      // Children are owned entirely by the content file — rewrite, don't merge.
      // Merging would strand rows that the author deleted from the JSON.
      await tx.planTool.deleteMany({ where: { planId: saved.id } });
      await tx.material.deleteMany({ where: { planId: saved.id } });
      await tx.cutListItem.deleteMany({ where: { planId: saved.id } });
      await tx.step.deleteMany({ where: { planId: saved.id } });
      await tx.image.deleteMany({ where: { planId: saved.id } });

      await tx.planTool.createMany({
        data: plan.tools.map((t) => ({
          planId: saved.id,
          toolId: toolIds.get(t.slug)!,
          essential: t.essential,
          note: t.note ?? null,
        })),
      });

      await tx.material.createMany({
        data: plan.materials.map((m, i) => ({
          planId: saved.id,
          name: m.name,
          unit: m.unit,
          quantity: m.quantity,
          species: m.species ?? null,
          costCents: m.costCents ?? null,
          note: m.note ?? null,
          sortOrder: i,
        })),
      });

      await tx.cutListItem.createMany({
        data: plan.cutList.map((c, i) => ({
          planId: saved.id,
          part: c.part,
          quantity: c.quantity,
          thicknessIn: c.thicknessIn,
          widthIn: c.widthIn,
          lengthIn: c.lengthIn,
          material: c.material ?? null,
          note: c.note ?? null,
          sortOrder: i,
        })),
      });

      await tx.step.createMany({
        data: plan.steps.map((s, i) => ({
          planId: saved.id,
          stepNumber: i + 1,
          title: s.title,
          body: s.body,
        })),
      });

      await tx.image.createMany({
        data: plan.images.map((img, i) => ({
          planId: saved.id,
          url: img.url,
          alt: img.alt,
          isPrimary: img.isPrimary,
          sortOrder: i,
        })),
      });
    });

    console.log(`  ✓ ${plan.slug}`);
  }

  const total = await prisma.plan.count();
  console.log(`Done. ${total} plans in the catalog.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
