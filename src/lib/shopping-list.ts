import { prisma } from '@/lib/db';
import { requireUser, getCurrentUser } from '@/lib/auth';

/**
 * Shopping list generator — Sprint 12. BUSINESS_PLAN.md §10.
 *
 * Aggregates materials across the plans a user has EXPLICITLY added to their shopping
 * list into one consolidated list they can take to a lumberyard.
 *
 * SPRINT 22: the source changed from "everything you saved" to an explicit
 * `ShoppingListEntry` set (DECISIONS_LOG.md 2026-07-14). Saving is "maybe someday";
 * the shopping list is "buying for these now" — different intents, so a different table.
 * The merge machinery below is UNCHANGED; only where the plans come from changed.
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
  /** Cost in INTEGER CENTS — the sum of the contributors we DO have a price for. */
  costCents: number;
  /** How many contributing materials had no price. Drives the "≈" and the caveat. */
  unpricedCount: number;
  /** Which saved plans need this. The user asked for a list; they still own the why. */
  plans: { slug: string; title: string }[];
}

/** One plan on the shopping list, with its own (unmerged) material lines. */
export interface ShoppingListPlan {
  slug: string;
  title: string;
  /** THIS plan's materials, in author order — not merged with other plans. */
  lines: ShoppingListLine[];
}

export interface ShoppingList {
  /**
   * MERGED view — combined across every plan, grouped by unit. This is the "one buyable
   * list" that Sprint 12 built, and the merge rule (exact only) is unchanged.
   */
  groups: { unit: string; lines: ShoppingListLine[] }[];
  /**
   * BY-PLAN view — each plan's materials on their own, UNMERGED (Sprint 22). Same
   * underlying data, presented so you can see what each project contributes and shop for
   * one build at a time. Two views of one list, chosen in the UI by `?view=`.
   */
  byPlan: ShoppingListPlan[];
  planCount: number;
  lineCount: number;
  /**
   * Total in INTEGER CENTS across everything we have a price for.
   *
   * ALWAYS A NUMBER — never null. This is a BALLPARK, and its job is to stop someone
   * expecting to build an end-grain butcher block for $10. An earlier version returned
   * `null` the moment any single line was unpriced, on the grounds that a partial sum
   * is "a lie". That was over-engineering: it threw away the useful signal to avoid a
   * precision nobody asked for, and left the user with nothing at all.
   *
   * The honest presentation is a number with an "≈" and a count of what's missing —
   * not silence. `unpricedCount` below is what makes it honest.
   */
  totalCents: number;
  /** How many materials across the list have no price. Zero means the total is complete. */
  unpricedCount: number;
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
        // A price we don't have contributes 0 to the sum and 1 to the caveat.
        costCents: material.costCents ?? 0,
        unpricedCount: material.costCents === null ? 1 : 0,
        plans: [material.plan],
      });
      continue;
    }

    existing.quantity += material.quantity;

    /**
     * COST IS A BALLPARK. Sum what we know; COUNT what we don't.
     *
     * An earlier version made null CONTAGIOUS — one unpriced contributor and the whole
     * line, and then the whole list total, became `null`. The reasoning was that a
     * partial sum shown as a total is a lie. That reasoning was right about the danger
     * and wrong about the remedy: it threw away a genuinely useful number to avoid a
     * precision nobody ever asked for, and handed the user silence instead.
     *
     * The point of this figure is to stop someone expecting to build an end-grain
     * butcher block for $10. A "≈ $180, and 2 items have no estimate" does that job
     * honestly. A blank does not.
     *
     * The honesty lives in `unpricedCount` and in the UI's "≈" — NOT in refusing to
     * answer. `Material.costCents` is nullable by schema for materials that genuinely
     * vary ("scrap you already have"); every one of the 148 rows in today's catalog is
     * priced, so this path is future-proofing rather than a live case.
     */
    if (material.costCents === null) {
      existing.unpricedCount += 1;
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

// ──────────────────────── membership (Sprint 22) ────────────────────────
//
// Same security rule as the rest of this file and all of saves.ts: NO function takes a
// `userId`. The owner is the verified session, and every write is scoped by `userId` in
// its WHERE clause — not by row id — so a guessed id affects zero rows.

/** Adds a plan to the session user's shopping list. Idempotent (DB `@@unique`). */
export async function addToShoppingList(planId: string): Promise<void> {
  const user = await requireUser();
  await prisma.shoppingListEntry.upsert({
    where: { userId_planId: { userId: user.id, planId } },
    create: { userId: user.id, planId },
    update: {},
  });
}

/** Removes a plan from the session user's shopping list. */
export async function removeFromShoppingList(planId: string): Promise<void> {
  const user = await requireUser();
  // deleteMany scoped by userId — NOT delete({ where: { id } }), which would let anyone
  // who guesses a row id delete anyone's entry. This silently affects zero rows for a
  // plan that isn't the caller's, which is exactly right.
  await prisma.shoppingListEntry.deleteMany({ where: { userId: user.id, planId } });
}

/** Whether a plan is on the current user's shopping list. False for anonymous visitors. */
export async function isOnShoppingList(planId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const row = await prisma.shoppingListEntry.findUnique({
    where: { userId_planId: { userId: user.id, planId } },
    select: { id: true },
  });
  return row !== null;
}

/** An empty list. */
function emptyList(): ShoppingList {
  return {
    groups: [],
    byPlan: [],
    planCount: 0,
    lineCount: 0,
    totalCents: 0,
    unpricedCount: 0,
  };
}

/**
 * Generates the signed-in user's shopping list from the plans they've explicitly added.
 *
 * TAKES NO ARGUMENTS — and never an identity. The owner is the verified session. Both
 * views (merged and by-plan) are computed here from one query; the UI picks which to
 * show. Presentation is a `?view=` concern, deliberately kept out of this signature so
 * there is no argument an attacker could aim at someone else's data.
 */
export async function getShoppingList(): Promise<ShoppingList> {
  const user = await requireUser();

  const entries = await prisma.shoppingListEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
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

  // An unpublished plan contributes nothing — even to someone who added it before it was
  // unpublished. `published: true` on every read, per the standing rule.
  const plans = entries.map((entry) => entry.plan).filter((plan) => plan.published);

  if (plans.length === 0) return emptyList();

  // --- BY-PLAN view: each plan's own materials, unmerged, in author order. ---
  const byPlan: ShoppingListPlan[] = plans.map((plan) => ({
    slug: plan.slug,
    title: plan.title,
    lines: plan.materials.map((m) => ({
      name: m.name.trim(),
      unit: m.unit,
      species: m.species,
      quantity: m.quantity,
      costCents: m.costCents ?? 0,
      unpricedCount: m.costCents === null ? 1 : 0,
      plans: [{ slug: plan.slug, title: plan.title }],
    })),
  }));

  // --- MERGED view: combined across plans, grouped by unit (Sprint 12, unchanged). ---
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

  return {
    groups,
    byPlan,
    planCount: plans.length,
    lineCount: lines.length,
    // Sum what we know. The UI marks it "≈" and says how many items are missing a
    // price — that is what makes a ballpark honest, rather than refusing to give one.
    totalCents: lines.reduce((sum, line) => sum + line.costCents, 0),
    unpricedCount: lines.reduce((sum, line) => sum + line.unpricedCount, 0),
  };
}
