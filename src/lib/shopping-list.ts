import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

/**
 * Shopping list generator — Sprint 12. BUSINESS_PLAN.md §10.
 *
 * Aggregates the materials across a user's saved plans into one consolidated list they
 * can actually take to a lumberyard.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO AFFILIATE LINKS. NOT AN OVERSIGHT — A CONSTRAINT.
 *
 * BUSINESS_PLAN.md §10 describes this feature as including affiliate links. It ships
 * WITHOUT them. Vercel's Hobby tier prohibits commercial use, affiliate links are
 * commercial use, and enforcement is account suspension (DECISIONS_LOG.md 2026-07-13).
 *
 * They cannot exist until the project moves to a commercial-use-permitted host. That
 * is the launch-economics conversation, not something to slip into a feature sprint.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MERGING IS EXACT. FUZZY MATCHING WOULD BE A SAFETY BUG, NOT A FEATURE.
 *
 * Material names are free text, and the catalog really does contain lines like:
 *
 *     Stainless steel screws, #8 x 1-1/4" and 2"
 *     Exterior screws, stainless or coated, 1-5/8"
 *
 * A clever aggregator notices both say "screws" and merges them. The result is a
 * shopping list that sends someone to a store to buy THE WRONG HARDWARE, with a
 * confident quantity printed next to it. **A shopping list that is confidently wrong
 * is worse than one that is merely long.**
 *
 * So two lines merge only when their normalized name, unit, AND species are all
 * identical. Exact merging under-merges sometimes — the user sees two similar lines
 * and applies judgement, which is visible and harmless. Fuzzy merging OVER-merges
 * silently, which is neither.
 *
 * And UNITS ARE NEVER COMBINED. `board feet` and `each` do not add up. A merge key
 * that ignored the unit would produce numbers that are not quantities of anything.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SECURITY: no function here takes a `userId`. The owner is the verified session, and
 * the collection filter is scoped by `userId` too — passing someone else's collection
 * id yields an empty list, not their contents.
 */

export interface ShoppingListLine {
  /** The display name, taken from the first occurrence. */
  name: string;
  unit: string;
  species: string | null;
  /** Summed across every plan that needs it. */
  quantity: number;
  /**
   * Total cost in INTEGER CENTS, or null.
   *
   * NULL WHEN ANY CONTRIBUTING LINE IS UNPRICED — see `mergeMaterials`. A partial sum
   * presented as a total is a lie, and this one would have a dollar sign in front of it.
   */
  costCents: number | null;
  /** Which saved plans need this. The user asked for a list; they still own the why. */
  plans: { slug: string; title: string }[];
}

export interface ShoppingList {
  /** Grouped by unit — you buy board feet at a lumberyard and screws by the box. */
  groups: { unit: string; lines: ShoppingListLine[] }[];
  planCount: number;
  lineCount: number;
  /**
   * Total across every line in integer cents — or null if ANY line is unpriced. Same
   * reasoning as the per-line cost: do not fake a total.
   */
  totalCents: number | null;
  /** True when at least one line had no price. The UI must say so out loud. */
  hasUnpricedLines: boolean;
  /** Null for the whole library; the collection's name when scoped to one. */
  collectionName: string | null;
}

export interface MaterialInput {
  name: string;
  unit: string;
  species: string | null;
  quantity: number;
  costCents: number | null;
  plan: { slug: string; title: string };
}

/**
 * Separator for the merge key.
 *
 * A NUL byte, NOT a space or a pipe — those can occur inside a material name, and a
 * separator that appears in the data is a separator that lets two DIFFERENT materials
 * collide into one key. That is exactly the silent over-merge this module exists to
 * prevent, so it must not sneak in through the key itself.
 *
 * Built with `fromCharCode` rather than written as a literal, so the character never
 * has to survive a copy-paste or an editor that would eat it.
 */
const KEY_SEPARATOR = String.fromCharCode(0);

/**
 * The merge key.
 *
 * Normalization is deliberately CONSERVATIVE: case, and collapsing runs of whitespace.
 * It does NOT strip punctuation, collapse plurals, or stem words — every one of those
 * is a step toward merging two different screws.
 *
 * Exported for testing: this one function is where the whole "confidently wrong"
 * failure mode would live.
 */
export function mergeKey(material: {
  name: string;
  unit: string;
  species: string | null;
}): string {
  const name = material.name.trim().toLowerCase().replace(/\s+/g, ' ');
  const unit = material.unit.trim().toLowerCase();
  const species = (material.species ?? '').trim().toLowerCase();

  return [name, unit, species].join(KEY_SEPARATOR);
}

/**
 * Merges material lines. PURE — no database, no session — so the rule that matters
 * most in this file can be tested directly rather than through a query.
 */
export function mergeMaterials(materials: MaterialInput[]): ShoppingListLine[] {
  const merged = new Map<string, ShoppingListLine>();

  for (const material of materials) {
    const key = mergeKey(material);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        name: material.name.trim(),
        unit: material.unit,
        species: material.species,
        quantity: material.quantity,
        costCents: material.costCents,
        plans: [material.plan],
      });
      continue;
    }

    existing.quantity += material.quantity;

    /**
     * COST: NULL IS CONTAGIOUS, and that is the point.
     *
     * If any contributing line has no price, the merged line has no price. The
     * alternative — summing the priced ones and showing the partial as though it were
     * the total — produces a number that is wrong in the direction of "cheaper than
     * reality", printed with a dollar sign, next to something a person is about to go
     * and buy. Say "we don't know" instead.
     *
     * ON WHETHER THIS PATH IS REACHABLE TODAY: it is not. All 148 material rows in the
     * current catalog are priced, and I checked rather than assuming — an earlier
     * draft of this comment claimed the null case was "real, not hypothetical", which
     * was simply false. `Material.costCents` is nullable by schema (Sprint 1, for
     * materials that genuinely vary — "scrap you already have"), the content is
     * hand-authored, and the first null will arrive without anyone touching this file.
     * The path is correct and tested for that day. It is not currently exercised in
     * production, and pretending otherwise is the stale-comment failure this project
     * has already been bitten by.
     */
    if (existing.costCents === null || material.costCents === null) {
      existing.costCents = null;
    } else {
      existing.costCents += material.costCents;
    }

    // Dedupe: one plan listing the same material twice must not appear twice here.
    if (!existing.plans.some((plan) => plan.slug === material.plan.slug)) {
      existing.plans.push(material.plan);
    }
  }

  return [...merged.values()];
}

/** An empty list. Returned for a collection that is empty OR is not the user's. */
function emptyList(collectionName: string | null): ShoppingList {
  return {
    groups: [],
    planCount: 0,
    lineCount: 0,
    totalCents: 0,
    hasUnpricedLines: false,
    collectionName,
  };
}

/**
 * Generates a shopping list from the signed-in user's saved plans.
 *
 * @param collectionId - Optional. Narrows to one collection. The collection lookup is
 *   ALSO scoped by the session user, so someone else's id yields an empty list rather
 *   than their contents — the same pattern as `listSavedPlans()`.
 *
 * Takes no `userId`. It never will.
 */
export async function getShoppingList(collectionId?: string): Promise<ShoppingList> {
  const user = await requireUser();

  let collectionName: string | null = null;

  if (collectionId) {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, userId: user.id },
      select: { name: true },
    });

    // Not found, or not theirs. INDISTINGUISHABLE ON PURPOSE — an empty list either
    // way. "That collection exists but is not yours" is an existence oracle.
    if (!collection) return emptyList(null);

    collectionName = collection.name;
  }

  const saved = await prisma.savedPlan.findMany({
    where: {
      userId: user.id,
      ...(collectionId
        ? { collections: { some: { collection: { id: collectionId, userId: user.id } } } }
        : {}),
    },
    select: {
      plan: {
        select: {
          slug: true,
          title: true,
          published: true,
          materials: {
            select: {
              name: true,
              unit: true,
              species: true,
              quantity: true,
              costCents: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  // An unpublished plan contributes nothing — even to someone who saved it before it
  // was unpublished. `published: true` on every read, per the standing rule.
  const plans = saved.map((entry) => entry.plan).filter((plan) => plan.published);

  const materials: MaterialInput[] = plans.flatMap((plan) =>
    plan.materials.map((material) => ({
      name: material.name,
      unit: material.unit,
      species: material.species,
      quantity: material.quantity,
      costCents: material.costCents,
      plan: { slug: plan.slug, title: plan.title },
    })),
  );

  const lines = mergeMaterials(materials);

  // Group by unit. You buy board feet at a lumberyard, screws by the box, and finish
  // by the can. A list sorted by name alone means walking the store three times.
  const byUnit = new Map<string, ShoppingListLine[]>();

  for (const line of lines) {
    const group = byUnit.get(line.unit) ?? [];
    group.push(line);
    byUnit.set(line.unit, group);
  }

  const groups = [...byUnit.entries()]
    .map(([unit, unitLines]) => ({
      unit,
      lines: unitLines.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.unit.localeCompare(b.unit));

  const hasUnpricedLines = lines.some((line) => line.costCents === null);

  return {
    groups,
    planCount: plans.length,
    lineCount: lines.length,
    // Same rule as a line: if anything is unpriced there IS no total. Never print a
    // dollar figure that is quietly missing items.
    totalCents: hasUnpricedLines
      ? null
      : lines.reduce((sum, line) => sum + (line.costCents ?? 0), 0),
    hasUnpricedLines,
    collectionName,
  };
}
