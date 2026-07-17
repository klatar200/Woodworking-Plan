import { describe, it, expect } from 'vitest';
import { loadCatalog } from '@/content/load';
import {
  planSchema,
  pathSchema,
  COST_TIER_BOUNDS,
  costTierSymbol,
} from '@/content/plan-schema';

/**
 * These tests run against the REAL content in content/ — not fixtures.
 *
 * That is the whole point. BUSINESS_PLAN.md §12 names an inconsistent catalog as
 * a top risk to user trust, and §6 requires editorial QC so that "search and
 * filters remain trustworthy." A plan whose cost tier contradicts its dollar
 * range, or that references a tool that doesn't exist, would silently break the
 * filters we build in Sprints 4–5.
 *
 * CI runs this on every push. A bad plan file cannot reach main unnoticed.
 */

const catalog = loadCatalog();

describe('seed catalog', () => {
  it('loads and every file passes the schema (this throws if any file is invalid)', () => {
    expect(catalog.plans.length).toBeGreaterThan(0);
    expect(catalog.categories.length).toBeGreaterThan(0);
    expect(catalog.tools.length).toBeGreaterThan(0);
  });

  it('meets the Sprint 1 requirement of ~20 real plans', () => {
    // BUILD_PLAN.md §4, Sprint 1: "sufficient to load ~20 real test plans".
    expect(catalog.plans.length).toBeGreaterThanOrEqual(20);
  });

  it('has no duplicate plan slugs', () => {
    const slugs = catalog.plans.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every plan references a category that exists', () => {
    const categorySlugs = new Set(catalog.categories.map((c) => c.slug));
    for (const plan of catalog.plans) {
      expect(categorySlugs, `plan "${plan.slug}"`).toContain(plan.category);
    }
  });

  it('every tool a plan references exists in tools.json', () => {
    const toolSlugs = new Set(catalog.tools.map((t) => t.slug));
    for (const plan of catalog.plans) {
      for (const tool of plan.tools) {
        expect(toolSlugs, `plan "${plan.slug}" tool "${tool.slug}"`).toContain(tool.slug);
      }
    }
  });
});

describe('catalog data integrity — what keeps the filters honest', () => {
  it('every plan cost tier agrees with its actual dollar range', () => {
    for (const plan of catalog.plans) {
      const bound = COST_TIER_BOUNDS[plan.costTier].maxUpToCents;
      expect(
        plan.costMaxCents,
        `plan "${plan.slug}" claims ${costTierSymbol(plan.costTier)} but costs up to $${plan.costMaxCents / 100}`,
      ).toBeLessThanOrEqual(bound);
    }
  });

  it('no plan has an inverted cost or time range', () => {
    for (const plan of catalog.plans) {
      expect(plan.costMaxCents, plan.slug).toBeGreaterThanOrEqual(plan.costMinCents);
      expect(plan.timeMaxMinutes, plan.slug).toBeGreaterThanOrEqual(plan.timeMinMinutes);
    }
  });

  it('every plan requires at least one essential tool', () => {
    for (const plan of catalog.plans) {
      expect(
        plan.tools.some((t) => t.essential),
        `plan "${plan.slug}" has no essential tools — the tools-I-own filter would wrongly match it for everyone`,
      ).toBe(true);
    }
  });

  it('every plan has materials and at least one step', () => {
    for (const plan of catalog.plans) {
      expect(plan.materials.length, plan.slug).toBeGreaterThan(0);
      expect(plan.steps.length, plan.slug).toBeGreaterThan(0);
    }
  });

  it('difficulty is always within the 1-5 scale from BUSINESS_PLAN.md §4.6', () => {
    for (const plan of catalog.plans) {
      expect(plan.difficulty, plan.slug).toBeGreaterThanOrEqual(1);
      expect(plan.difficulty, plan.slug).toBeLessThanOrEqual(5);
    }
  });
});

describe('catalog spread — the seed data must actually exercise the filters', () => {
  /**
   * Twenty plans that are all "intermediate, $$, 4 hours" would pass every test
   * above and still be useless: Sprints 3-5 build browse, search, and filtering,
   * and they need data that varies along the axes being filtered. These tests
   * assert the catalog is a real test bed, not twenty clones.
   */

  it('spans at least 4 of the 5 difficulty levels', () => {
    const levels = new Set(catalog.plans.map((p) => p.difficulty));
    expect(levels.size).toBeGreaterThanOrEqual(4);
  });

  it('spans at least 4 of the 5 cost tiers', () => {
    const tiers = new Set(catalog.plans.map((p) => p.costTier));
    expect(tiers.size).toBeGreaterThanOrEqual(4);
  });

  it('covers every category defined in categories.json', () => {
    const used = new Set(catalog.plans.map((p) => p.category));
    for (const category of catalog.categories) {
      expect(
        used,
        `category "${category.slug}" has no plans — it would render an empty browse page`,
      ).toContain(category.slug);
    }
  });

  it('has both quick projects and multi-weekend builds', () => {
    const times = catalog.plans.map((p) => p.timeMaxMinutes);
    expect(Math.min(...times)).toBeLessThanOrEqual(180); // something under 3 hrs
    expect(Math.max(...times)).toBeGreaterThanOrEqual(1440); // something over 24 hrs
  });

  it('uses a broad range of tools, not the same three every time', () => {
    const used = new Set(catalog.plans.flatMap((p) => p.tools.map((t) => t.slug)));
    expect(used.size).toBeGreaterThanOrEqual(15);
  });
});

describe('planSchema rejects bad content', () => {
  const valid = catalog.plans[0]!;

  it('rejects a cost tier that lies about the cost', () => {
    // Claims "$" (up to $50) while actually costing $700.
    const result = planSchema.safeParse({
      ...valid,
      costTier: 'TIER_1',
      costMinCents: 60_000,
      costMaxCents: 70_000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an inverted cost range', () => {
    const result = planSchema.safeParse({
      ...valid,
      costMinCents: 9_000,
      costMaxCents: 1_000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a difficulty outside 1-5', () => {
    expect(planSchema.safeParse({ ...valid, difficulty: 7 }).success).toBe(false);
    expect(planSchema.safeParse({ ...valid, difficulty: 0 }).success).toBe(false);
  });

  it('rejects an unknown key — a typo must fail loudly, not be silently dropped', () => {
    const result = planSchema.safeParse({ ...valid, dificulty: 3 });
    expect(result.success).toBe(false);
  });

  it('rejects an image with no alt text', () => {
    const result = planSchema.safeParse({
      ...valid,
      images: [{ url: 'https://example.com/a.jpg', alt: '', isPrimary: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a plan whose tools are all optional', () => {
    const result = planSchema.safeParse({
      ...valid,
      tools: valid.tools.map((t) => ({ ...t, essential: false })),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-kebab-case slug', () => {
    expect(planSchema.safeParse({ ...valid, slug: 'Not A Slug' }).success).toBe(false);
  });
});

describe('costTierSymbol', () => {
  it('maps tiers to the $ - $$$$$ scale in BUSINESS_PLAN.md §4.8', () => {
    expect(costTierSymbol('TIER_1')).toBe('$');
    expect(costTierSymbol('TIER_3')).toBe('$$$');
    expect(costTierSymbol('TIER_5')).toBe('$$$$$');
  });
});

/**
 * Learning paths — Sprint 16.
 *
 * The real risk in path content is REFERENTIAL: a path is a list of plan slugs, and zod
 * cannot know whether those plans exist. Only the cross-file pass in load.ts can, and it
 * has to catch it BEFORE the seeder starts writing — Postgres would catch it too, halfway
 * through a run, with a far worse message and half the catalog already written.
 */
describe('learning paths (Sprint 16)', () => {
  it('every path step points at a plan that actually exists', () => {
    const planSlugs = new Set(catalog.plans.map((plan) => plan.slug));

    for (const path of catalog.paths) {
      for (const step of path.steps) {
        expect(planSlugs.has(step.plan), `path "${path.slug}" → "${step.plan}"`).toBe(true);
      }
    }
  });

  it('EVERY step has a reason — the reason IS the feature', () => {
    // An ordered list of plans with no explanation of why each one comes where it does is
    // not a learning path. It is a collection with a number next to each item.
    for (const path of catalog.paths) {
      for (const step of path.steps) {
        expect(step.reason.trim().length, `${path.slug} → ${step.plan}`).toBeGreaterThan(20);
      }
    }
  });

  it('no path lists the same plan twice', () => {
    for (const path of catalog.paths) {
      const slugs = path.steps.map((step) => step.plan);
      expect(new Set(slugs).size, `path "${path.slug}"`).toBe(slugs.length);
    }
  });

  it('a path has at least two steps — a "path" of one plan is a plan', () => {
    for (const path of catalog.paths) {
      expect(path.steps.length, `path "${path.slug}"`).toBeGreaterThanOrEqual(2);
    }
  });

  it('pathSchema rejects a step with no reason', () => {
    const valid = {
      slug: 'a-path',
      title: 'A Path',
      summary: 'Summary.',
      description: 'Description.',
      steps: [
        { plan: 'plan-one', reason: 'Because it teaches the first thing.' },
        { plan: 'plan-two', reason: 'Because it builds on the first.' },
      ],
    };

    expect(pathSchema.safeParse(valid).success).toBe(true);

    // A missing or empty reason must be a hard failure, not a shrug.
    expect(
      pathSchema.safeParse({
        ...valid,
        steps: [{ plan: 'plan-one', reason: '' }, valid.steps[1]],
      }).success,
    ).toBe(false);

    expect(
      pathSchema.safeParse({ ...valid, steps: [{ plan: 'plan-one' }, valid.steps[1]] })
        .success,
    ).toBe(false);
  });

  it('pathSchema rejects a one-step path', () => {
    expect(
      pathSchema.safeParse({
        slug: 'a-path',
        title: 'A Path',
        summary: 'Summary.',
        description: 'Description.',
        steps: [{ plan: 'plan-one', reason: 'The only one.' }],
      }).success,
    ).toBe(false);
  });
});

describe('unresolvedImages — dead-source-image annotation (content-ops 2026-07-17)', () => {
  // A validated catalog plan is itself a valid planSchema input; reuse one as a base.
  const base = catalog.plans[0];

  it('planSchema accepts an optional unresolvedImages array (empty images + preserved URL)', () => {
    const withField = {
      ...base,
      images: [],
      unresolvedImages: [
        {
          url: 'https://www.ana-white.com/sites/default/files/example.jpg',
          alt: 'example',
          isPrimary: true,
        },
      ],
    };
    expect(planSchema.safeParse(withField).success).toBe(true);
  });

  it('unresolvedImages is optional — a plan without it still validates', () => {
    expect(planSchema.safeParse(base).success).toBe(true);
  });

  it('strict mode still rejects an unknown key (a typo must fail loudly)', () => {
    expect(planSchema.safeParse({ ...base, notARealKey: true }).success).toBe(false);
  });
});
