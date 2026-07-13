import { describe, it, expect } from 'vitest';
import { loadCatalog } from '@/content/load';
import { planSchema, COST_TIER_BOUNDS, costTierSymbol } from '@/content/plan-schema';

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
