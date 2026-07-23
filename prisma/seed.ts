import { PrismaClient } from '@prisma/client';
import { loadCatalog } from '../src/content/load';
import type { PathInput } from '../src/content/plan-schema';

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
  const { categories, tools, plans, paths } = loadCatalog();

  console.log(`Target database: ${describeTarget()}`);
  console.log(
    `Seeding: ${categories.length} categories, ${tools.length} tools, ` +
      `${plans.length} plans, ${paths.length} learning paths`,
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

      // Materials are created one-by-one (not createMany) so we capture each row's id
      // by its name — Sprint 21's per-step material links resolve name → this id. The
      // name is unique within a plan (loadCatalog would surface a collision), so the map
      // is unambiguous.
      const materialIdByName = new Map<string, string>();
      for (const [i, m] of plan.materials.entries()) {
        const row = await tx.material.create({
          data: {
            planId: saved.id,
            name: m.name,
            unit: m.unit,
            quantity: m.quantity,
            species: m.species ?? null,
            costCents: m.costCents ?? null,
            note: m.note ?? null,
            sortOrder: i,
          },
        });
        materialIdByName.set(m.name, row.id);
      }

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

      // Steps created one-by-one too, so each step's id is available to link its tools
      // and materials (Sprint 21). load.ts has already proved every per-step tool slug
      // and material name is one the plan declares, so the lookups below cannot miss.
      for (const [i, s] of plan.steps.entries()) {
        const step = await tx.step.create({
          data: {
            planId: saved.id,
            stepNumber: i + 1,
            title: s.title,
            body: s.body,
          },
        });

        if (s.tools.length > 0) {
          await tx.stepTool.createMany({
            data: s.tools.map((toolSlug) => ({
              stepId: step.id,
              toolId: toolIds.get(toolSlug)!,
            })),
          });
        }

        if (s.materials.length > 0) {
          await tx.stepMaterial.createMany({
            data: s.materials.map((name) => ({
              stepId: step.id,
              materialId: materialIdByName.get(name)!,
            })),
          });
        }
      }

      await tx.image.createMany({
        data: plan.images.map((img, i) => ({
          planId: saved.id,
          url: img.url,
          alt: img.alt,
          isPrimary: img.isPrimary,
          sortOrder: i,
        })),
      });
      // Per-plan transaction: raised from Prisma's 5s default because the largest Kreg
      // plans (many steps, each with its own tool/material links) run past 5s against the
      // higher-latency production Neon branch (P2028). 60s is ample for a one-off seed.
    }, { maxWait: 15000, timeout: 60000 });

    console.log(`  ✓ ${plan.slug}`);
  }

  await refreshSearchVectors();

  await seedPaths(paths);

  const total = await prisma.plan.count();
  const totalPaths = await prisma.path.count();
  console.log(`Done. ${total} plans and ${totalPaths} learning paths in the catalog.`);
}

/**
 * Seeds the learning paths (Sprint 16).
 *
 * Runs AFTER the plans, because a path's steps are foreign keys into them. Same shape as
 * the plan seeder: upsert on slug, and rewrite the children wholesale inside a
 * transaction rather than merging them.
 *
 * REWRITE, DON'T MERGE — and here it matters more than anywhere else. Merging steps would
 * strand a step the author deleted from the JSON, leaving a path whose displayed order
 * silently disagrees with the file that is supposed to define it. A path that is half old
 * and half new is worse than no path.
 */
async function seedPaths(paths: PathInput[]): Promise<void> {
  if (paths.length === 0) return;

  const planIds = new Map(
    (await prisma.plan.findMany({ select: { id: true, slug: true } })).map((p) => [
      p.slug,
      p.id,
    ]),
  );

  /**
   * QOL-E — category slugs → ids, for the optional `Path.category` relation.
   *
   * Resolved up front, once, rather than per path: the categories were written at the
   * top of this seed and load.ts has already proved every non-null slug is real, so a
   * miss here is impossible rather than merely unlikely.
   */
  const categoryIds = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [
      c.slug,
      c.id,
    ]),
  );

  for (const path of paths) {
    const scalars = {
      title: path.title,
      summary: path.summary,
      description: path.description,
      sortOrder: path.sortOrder,
      published: path.published,
      // QOL-E. `null` is a real, authored value here ("this path spans categories"),
      // not a missing one — see plan-schema.ts.
      experienceLevel: path.experienceLevel,
      categoryId: path.category === null ? null : (categoryIds.get(path.category) ?? null),
    };

    await prisma.$transaction(async (tx) => {
      const saved = await tx.path.upsert({
        where: { slug: path.slug },
        create: { slug: path.slug, ...scalars },
        update: scalars,
      });

      await tx.pathStep.deleteMany({ where: { pathId: saved.id } });

      await tx.pathStep.createMany({
        data: path.steps.map((step, index) => ({
          pathId: saved.id,
          // load.ts already proved every slug resolves — a missing one throws there,
          // with the file name, rather than blowing up mid-transaction here.
          planId: planIds.get(step.plan)!,
          stepNumber: index + 1, // 1-based; the file's ORDER is the step order
          reason: step.reason,
        })),
      });
    });

    console.log(`  ✓ path: ${path.slug} (${path.steps.length} steps)`);
  }
}

/**
 * Rebuilds the full-text search index (Sprint 4).
 *
 * Runs AFTER all plans and their children are written — the vector aggregates
 * tools and materials from other tables, so it cannot be built until those rows
 * exist. One statement for the whole catalog rather than one per plan: it is a
 * set-based operation and Postgres is far better at it than a loop is.
 *
 * WEIGHTS decide ranking, and they are the whole difference between search that
 * feels right and search that feels random:
 *   A — title      (a plan *named* "Walnut Cutting Board" beats one that mentions walnut)
 *   B — summary + tags
 *   C — tools + materials  (BUSINESS_PLAN.md §4.5 requires these be searchable)
 *   D — description + step bodies (a passing mention should rank last, not first)
 *
 * The seed is the only write path for plan content, so refreshing here keeps the
 * index in step with the catalog by construction. If plans ever become editable
 * through an admin UI, that path must call this too — or better, this becomes a
 * database trigger.
 */
async function refreshSearchVectors(): Promise<void> {
  const updated = await prisma.$executeRaw`
    UPDATE "Plan" p
    SET "searchVector" =
        setweight(to_tsvector('english', coalesce(p.title, '')), 'A')
     || setweight(to_tsvector('english', coalesce(p.summary, '')), 'B')
     || setweight(to_tsvector('english', coalesce(array_to_string(p.tags, ' '), '')), 'B')
     || setweight(to_tsvector('english', coalesce((
            SELECT string_agg(t.name, ' ')
            FROM "PlanTool" pt
            JOIN "Tool" t ON t.id = pt."toolId"
            WHERE pt."planId" = p.id
          ), '')), 'C')
     || setweight(to_tsvector('english', coalesce((
            SELECT string_agg(concat_ws(' ', m.name, m.species), ' ')
            FROM "Material" m
            WHERE m."planId" = p.id
          ), '')), 'C')
     || setweight(to_tsvector('english', coalesce(p.description, '')), 'D')
     || setweight(to_tsvector('english', coalesce((
            SELECT string_agg(concat_ws(' ', s.title, s.body), ' ')
            FROM "Step" s
            WHERE s."planId" = p.id
          ), '')), 'D')
  `;

  console.log(`  ↳ search index rebuilt for ${updated} plans`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
