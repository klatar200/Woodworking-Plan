import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  planSchema,
  categorySchema,
  toolSchema,
  type PlanInput,
  type CategoryInput,
  type ToolInput,
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
  }

  assertUniqueSlugs(categories.map((c) => c.slug), 'category', refProblems);
  assertUniqueSlugs(tools.map((t) => t.slug), 'tool', refProblems);

  if (refProblems.length > 0) {
    throw new Error(
      `Seed content has broken references:\n${refProblems.map((p) => `  - ${p}`).join('\n')}`,
    );
  }

  return { categories, tools, plans };
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
