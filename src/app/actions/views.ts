'use server';

import { recordPlanView } from '@/lib/views';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Record-a-view server action — Sprint 19.
 *
 * SECURITY: a server action is a PUBLIC HTTP ENDPOINT. Anyone can POST to this in a
 * loop, and unlike a like or a save it needs NO SESSION — a view is a view. So this
 * is the most abusable write path in the app, and it is treated that way:
 *
 *   - `checkRateLimit()` runs FIRST, before any database work. Avoiding the work is
 *     the point: every hit is a Neon query on a free tier with a hard compute budget.
 *   - The slug is validated against a PUBLISHED plan inside `recordPlanView()`. An
 *     unknown or staged slug writes nothing, and returns nothing — the two cases are
 *     indistinguishable to the caller, so this cannot be used to probe for unreleased
 *     content.
 *   - The row carries no user id (see prisma/schema.prisma), so a flood of forged
 *     views can inflate a ranking but cannot touch anyone's data.
 *
 * WHAT IT IS STILL VULNERABLE TO, stated plainly: someone determined can inflate a
 * plan's view count by rotating IPs. That buys them a higher position in a sort. It
 * is the same exposure every view counter on the internet has, the blast radius is a
 * list order, and the honest mitigation (bot detection) is not a free-tier thing.
 * Worth knowing before anyone treats a view count as a metric to report.
 *
 * A DENIED REQUEST NO-OPS. It does not throw (an uncaught throw out of a server
 * action is an HTTP 500 and a crashed page — see src/lib/rate-limit.ts for the
 * incident), and unlike the like/save actions it does NOT redirect: this fires from
 * an effect on page load, and yanking a reader to a different URL because a
 * BACKGROUND BEACON was throttled would be a bizarre thing to do to someone who is
 * just reading a plan. Nobody is owed a notice for a view that didn't get logged.
 *
 * No `revalidatePath()` either: the catalog is `force-dynamic` and recomputes its
 * order on every request anyway, so revalidating on every view would be pure churn.
 */
export async function recordPlanViewAction(slug: string): Promise<void> {
  if (!(await checkRateLimit('toggle'))) return;

  await recordPlanView(slug);
}
