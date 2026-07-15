import { prisma } from '@/lib/db';
import { requireUser, getCurrentUser } from '@/lib/auth';

/**
 * "My Workshop" — the owned-tools profile (Sprint 25). BUSINESS_PLAN.md §10.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SECURITY — same rule as saves.ts / likes.ts / shopping-list.ts:
 *
 *   NO FUNCTION HERE TAKES A `userId`.
 *
 * The owner is always the verified session. Every write is scoped by `userId` in its
 * WHERE clause, so a guessed row id affects zero rows.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * WHAT THIS IS NOT: it is not a filter. The profile PRE-FILLS the catalog's "tools you
 * own" checkboxes for a signed-in user; it never silently narrows results. The URL stays
 * the source of truth for what the catalog shows, so a shared link renders the same
 * catalog for everyone (`DECISIONS_LOG.md` 2026-07-15). See src/app/page.tsx.
 */

/**
 * The slugs of the tools the signed-in user owns. Empty array for an anonymous visitor —
 * the catalog calls this on a PUBLIC page, so it must not throw for a stranger, and an
 * empty profile is indistinguishable from "not signed in" for prefill purposes (both
 * mean: pre-check nothing).
 */
export async function getOwnedToolSlugs(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await prisma.userTool.findMany({
    where: { userId: user.id },
    select: { tool: { select: { slug: true } } },
  });
  return rows.map((row) => row.tool.slug);
}

/**
 * Replaces the user's owned-tools set with exactly `slugs`.
 *
 * REPLACE-ALL, not merge: the /workshop form submits the complete set of checked tools,
 * so a tool the user un-ticked must be removed — merging would strand it. Delete + create
 * inside one transaction, so the set is either fully rewritten or untouched.
 *
 * `slugs` is untrusted form input, so it is validated against real `Tool` rows and
 * unknown slugs are dropped — a forged slug can never create a dangling row (the FK would
 * reject it anyway, but this fails quietly and correctly instead of erroring mid-write).
 */
export async function setOwnedTools(slugs: string[]): Promise<void> {
  const user = await requireUser();

  // Dedupe, then resolve to real tool ids. Unknown slugs simply don't resolve.
  const unique = [...new Set(slugs)];
  const tools =
    unique.length > 0
      ? await prisma.tool.findMany({
          where: { slug: { in: unique } },
          select: { id: true },
        })
      : [];

  // Clearing the whole set is a single delete — no transaction needed, and an empty
  // createMany would be a pointless op.
  if (tools.length === 0) {
    await prisma.userTool.deleteMany({ where: { userId: user.id } });
    return;
  }

  // Otherwise delete + create atomically: the set is either fully rewritten or untouched.
  await prisma.$transaction([
    prisma.userTool.deleteMany({ where: { userId: user.id } }),
    prisma.userTool.createMany({
      data: tools.map((tool) => ({ userId: user.id, toolId: tool.id })),
      skipDuplicates: true,
    }),
  ]);
}

/** How a user's workshop stacks up against a plan's essential tools — Sprint 26. */
export interface ToolFit {
  /** True when the user owns every essential tool. */
  ownsAll: boolean;
  /** Essential tools owned, out of `total`. */
  ownedCount: number;
  total: number;
  /** Names of the essential tools the user is missing. */
  missing: string[];
}

/**
 * Compares a plan's ESSENTIAL tools against the tools a user owns — Sprint 26.
 *
 * Pure, so the "can I build this?" logic is unit-tested directly rather than through a
 * page render. Essential-only, matching the owned-tools FILTER (optional tools never
 * exclude a plan), so the plan page and the catalog filter tell the same story. The
 * caller decides whether to show anything at all (only for a signed-in user with a
 * non-empty workshop — otherwise "missing everything" is just noise).
 */
export function toolFit(
  essential: Array<{ slug: string; name: string }>,
  owned: ReadonlySet<string>,
): ToolFit {
  const missing = essential.filter((t) => !owned.has(t.slug)).map((t) => t.name);
  return {
    ownsAll: missing.length === 0,
    ownedCount: essential.length - missing.length,
    total: essential.length,
    missing,
  };
}
