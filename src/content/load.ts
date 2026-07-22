import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  planSchema,
  categorySchema,
  toolSchema,
  pathSchema,
  type PlanInput,
  type CategoryInput,
  type ToolInput,
  type PathInput,
} from './plan-schema';

/**
 * Loads and validates the entire seed catalog from content/.
 *
 * Shared deliberately between the seed script and the test suite, so CI proves
 * the exact same content the seeder will push to Neon — rather than testing a
 * fixture and hoping the real files agree with it.
 *
 * Fails loudly with every problem at once. A half-valid catalog is worse than a
 * refused one: it produces a database where some filters quietly return nothing.
 */

export const CONTENT_DIR = join(process.cwd(), 'content');

export interface Catalog {
  categories: CategoryInput[];
  tools: ToolInput[];
  plans: PlanInput[];
  paths: PathInput[];
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read/parse ${path}: ${(error as Error).message}`);
  }
}

export function loadCatalog(contentDir: string = CONTENT_DIR): Catalog {
  const problems: string[] = [];

  // --- categories ---
  const rawCategories = readJson(join(contentDir, 'categories.json'));
  const categoriesResult = categorySchema.array().safeParse(rawCategories);
  if (!categoriesResult.success) {
    problems.push(`categories.json: ${categoriesResult.error.issues.map(fmt).join('; ')}`);
  }

  // --- tools ---
  const rawTools = readJson(join(contentDir, 'tools.json'));
  const toolsResult = toolSchema.array().safeParse(rawTools);
  if (!toolsResult.success) {
    problems.push(`tools.json: ${toolsResult.error.issues.map(fmt).join('; ')}`);
  }

  // --- plans: one file per plan, so content diffs stay reviewable ---
  const plansDir = join(contentDir, 'plans');
  const planFiles = readdirSync(plansDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const plans: PlanInput[] = [];
  for (const file of planFiles) {
    const result = planSchema.safeParse(readJson(join(plansDir, file)));
    if (!result.success) {
      problems.push(`plans/${file}: ${result.error.issues.map(fmt).join('; ')}`);
      continue;
    }
    plans.push(result.data);
  }

  // --- paths (Sprint 16): one file per path, like the plans ---
  //
  // The directory is OPTIONAL. A catalog with no paths is a valid catalog — the loader
  // must not explode on a fresh checkout that predates this sprint, and it must not
  // require an empty directory to exist for the sake of it.
  const pathsDir = join(contentDir, 'paths');
  const paths: PathInput[] = [];

  let pathFiles: string[] = [];
  try {
    pathFiles = readdirSync(pathsDir)
      .filter((f) => f.endsWith('.json'))
      .sort();
  } catch {
    // No paths/ directory. Fine.
  }

  for (const file of pathFiles) {
    const result = pathSchema.safeParse(readJson(join(pathsDir, file)));
    if (!result.success) {
      problems.push(`paths/${file}: ${result.error.issues.map(fmt).join('; ')}`);
      continue;
    }
    paths.push(result.data);
  }

  if (problems.length > 0) {
    throw new Error(`Invalid seed content:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }

  const categories = categoriesResult.success ? categoriesResult.data : [];
  const tools = toolsResult.success ? toolsResult.data : [];

  // --- referential integrity ---
  // Zod validates each file in isolation. These checks catch the errors that only
  // exist BETWEEN files — a plan pointing at a category or tool that doesn't
  // exist. Postgres would catch it too, but only halfway through a seed run, with
  // a far worse error message.
  const refProblems: string[] = [];

  const categorySlugs = new Set(categories.map((c) => c.slug));
  const toolSlugs = new Set(tools.map((t) => t.slug));

  const seenPlanSlugs = new Set<string>();
  for (const plan of plans) {
    if (seenPlanSlugs.has(plan.slug)) {
      refProblems.push(`duplicate plan slug "${plan.slug}"`);
    }
    seenPlanSlugs.add(plan.slug);

    if (!categorySlugs.has(plan.category)) {
      refProblems.push(`plan "${plan.slug}" references unknown category "${plan.category}"`);
    }

    for (const tool of plan.tools) {
      if (!toolSlugs.has(tool.slug)) {
        refProblems.push(`plan "${plan.slug}" references unknown tool "${tool.slug}"`);
      }
    }

    /**
     * Sprint 21 — a step's tools/materials must be a SUBSET of the plan's own.
     *
     * This is the check the database deliberately does NOT do (see schema.prisma):
     * a step tagged with a tool the plan never lists would tell a builder to fetch
     * something the project doesn't use — the exact trust bug BUSINESS_PLAN.md §12
     * warns about. Caught here, at load, naming the plan and step, rather than
     * halfway through a seed with a foreign-key error that names neither.
     */
    const planToolSlugs = new Set(plan.tools.map((t) => t.slug));
    const planMaterialNames = new Set(plan.materials.map((m) => m.name));
    const planImageUrls = new Set(plan.images.map((img) => img.url));

    plan.steps.forEach((step, i) => {
      for (const toolSlug of step.tools) {
        if (!planToolSlugs.has(toolSlug)) {
          refProblems.push(
            `plan "${plan.slug}" step ${i + 1} uses tool "${toolSlug}", ` +
              `which is not in the plan's tools`,
          );
        }
      }
      for (const materialName of step.materials) {
        if (!planMaterialNames.has(materialName)) {
          refProblems.push(
            `plan "${plan.slug}" step ${i + 1} uses material "${materialName}", ` +
              `which is not in the plan's materials`,
          );
        }
      }
      // Sprint 21 pattern — a step's image must be one of the plan's own images.
      if (step.image !== undefined && !planImageUrls.has(step.image)) {
        refProblems.push(
          `plan "${plan.slug}" step ${i + 1} references image "${step.image}", ` +
            `which is not one of the plan's images`,
        );
      }
    });
  }

  assertUniqueSlugs(categories.map((c) => c.slug), 'category', refProblems);
  assertUniqueSlugs(tools.map((t) => t.slug), 'tool', refProblems);

  /**
   * PATHS (Sprint 16) — the checks that only exist BETWEEN files.
   *
   * A path is a list of plan slugs. Zod cannot know whether those plans exist; only this
   * pass can. Postgres would catch it too — halfway through a seed run, with a far worse
   * message, and after having already written half the catalog.
   */
  const planSlugs = new Set(plans.map((p) => p.slug));

  for (const path of paths) {
    const seenPlans = new Set<string>();

    /**
     * QOL-E — a path's category, when it declares one, must be a real category.
     *
     * Same check plans get, and for the same reason: an unknown slug would seed a null
     * FK and silently turn an "about Furniture" path into an uncategorised one, which
     * looks exactly like the deliberate "spans several categories" case. `null` IS the
     * legitimate value for that; a typo must not be able to impersonate it.
     */
    if (path.category !== null && !categorySlugs.has(path.category)) {
      refProblems.push(
        `path "${path.slug}" references unknown category "${path.category}"`,
      );
    }

    for (const step of path.steps) {
      if (!planSlugs.has(step.plan)) {
        refProblems.push(`path "${path.slug}" references unknown plan "${step.plan}"`);
      }

      // A plan twice in one path is a content error, not a feature. The DB enforces it
      // too (@@unique([pathId, planId])), but failing here names the FILE.
      if (seenPlans.has(step.plan)) {
        refProblems.push(`path "${path.slug}" lists plan "${step.plan}" more than once`);
      }
      seenPlans.add(step.plan);
    }

    /**
     * A path whose difficulty goes DOWN is not a learning path.
     *
     * This is a warning, not an error — a deliberate dip is defensible (the Crosscut Sled
     * is difficulty 3 but you want it early because it makes everything after it easier).
     * So it prints rather than throws. But it prints, because an accidental dip is a
     * broken promise: the user was told this sequence builds skill.
     */
    const difficulties = path.steps
      .map((step) => plans.find((p) => p.slug === step.plan)?.difficulty)
      .filter((d): d is number => d !== undefined);

    for (let i = 1; i < difficulties.length; i += 1) {
      if (difficulties[i]! < difficulties[i - 1]!) {
        console.warn(
          `[content] path "${path.slug}" step ${i + 1} is EASIER than step ${i} ` +
            `(difficulty ${difficulties[i]} after ${difficulties[i - 1]}). ` +
            `Deliberate? The step's reason should say why.`,
        );
      }
    }
  }

  assertUniqueSlugs(paths.map((p) => p.slug), 'path', refProblems);

  if (refProblems.length > 0) {
    throw new Error(
      `Seed content has broken references:\n${refProblems.map((p) => `  - ${p}`).join('\n')}`,
    );
  }

  return { categories, tools, plans, paths };
}

function assertUniqueSlugs(slugs: string[], label: string, out: string[]): void {
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) out.push(`duplicate ${label} slug "${slug}"`);
    seen.add(slug);
  }
}

function fmt(issue: { path: (string | number)[]; message: string }): string {
  const path = issue.path.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}
