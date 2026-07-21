/**
 * Step-walker progress — Sprint 38 (audit H3/M3).
 *
 * Pure decisions + the three thin storage wrappers behind them, extracted from
 * `step-walker.tsx` so the parts that can be wrong are the parts that get tested. The
 * component keeps the DOM work; this module keeps the rules.
 *
 * WHY DEVICE STATE AND NOT THE DATABASE. Where you are *within* a build session is
 * exactly the kind of thing the derived-data rule says not to store: it belongs to this
 * phone, this session, and it changes every few minutes. Persisting it server-side would
 * mean a write per step tap, a row per user per plan, and — the part that actually
 * matters — a mid-build step change that does NOT work in a garage with no signal, which
 * is the entire scenario this feature exists for (BUSINESS_PLAN.md §5).
 *
 * WHY NOT `?step=N`. A URL-encoded step would make every step a distinct service-worker
 * cache entry (Sprint 8/14 match URLs exactly), so an offline plan would only have the
 * one step you happened to be on cached, and every shared link would carry a stranger's
 * place in the build. The audit asked for memory, not deep links.
 */

/**
 * localStorage key for a plan's remembered step. Namespaced because localStorage is a
 * flat per-origin bucket shared with anything else this app ever stores.
 */
export function stepStorageKey(slug: string): string {
  return `step:${slug}`;
}

/**
 * Turn whatever came back out of storage into a step number that is safe to render.
 *
 * STORED INPUT IS FOREIGN INPUT. It is not user-hostile the way a form field is — nobody
 * else can write it — but it is *stale* input, and that is enough: content edits change
 * step counts, so yesterday's "step 9" can outlive the plan's ninth step. It is also
 * hand-editable in devtools, so it gets the same posture as a form field either way.
 *
 * `Number.parseInt` is deliberately NOT used, for the reason recorded in
 * `src/lib/form-fields.ts`: it reads `"9abc"` as 9 and `"1e9"` as 1, i.e. it invents a
 * plausible answer out of garbage. A digits-only test rejects both, plus floats
 * (`"2.5"`), signs (`"-3"`), whitespace, and `null`.
 *
 * Out-of-range CLAMPS rather than resetting: if a plan lost two steps since you were last
 * here, the last step is a far better guess at where you were than step 1.
 */
export function clampStep(raw: unknown, total: number): number {
  if (!Number.isInteger(total) || total < 1) return 1;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return 1;
  // Digits-only, so this is an integer, `Infinity` (an absurdly long string), or 0.
  // Precision loss past Number.MAX_SAFE_INTEGER is irrelevant: anything that large is
  // getting clamped to `total` regardless of which exact wrong number it decoded to.
  const parsed = Number(raw);
  if (!(parsed >= 1)) return 1;
  return Math.min(parsed, total);
}

/**
 * What to persist for the step now showing — or `null` meaning "forget this plan".
 *
 * Reaching the last step IS the finish state (the Next button becomes a disabled
 * "Finish", and the share-your-build CTA appears), so the key is dropped there. Coming
 * back to a plan you finished should start at step 1: the next visit is a *rebuild*, not
 * a resumption, and being dumped on the final step of a plan you already completed is a
 * worse default than the obvious one.
 *
 * Split out from the component because it is the one piece of 38.1 that can be asserted
 * without a DOM — the write itself is an effect, but the DECISION is arithmetic.
 */
export function stepToPersist(active: number, total: number): number | null {
  if (total <= 1) return null;
  return active >= total ? null : active;
}

/**
 * Should advancing a step move the viewport?
 *
 * `containerTop` is the walker container's `getBoundingClientRect().top`. Negative means
 * the top of the walker has scrolled off above the viewport — i.e. the reader is down
 * inside a long step, which is precisely the audit's complaint: tap Next at the bottom of
 * step 6 and the next thing on screen is wherever that scroll offset happens to land in
 * step 7, so you scroll back up to find the step you just asked for.
 *
 * When the walker's top is still on screen, everything worth seeing already is — this is
 * the desktop rail case, where clicking step 9 in a fully-visible sidebar must not yank
 * the page. A scroll nobody asked for is its own usability bug, so the guard errs toward
 * doing nothing.
 */
export function shouldScroll(containerTop: number, viewportHeight: number): boolean {
  return containerTop < 0 || containerTop > viewportHeight;
}

/**
 * The three storage calls, each swallowing its own failure.
 *
 * localStorage THROWS, and not only in exotic setups: Safari's private mode, a
 * storage-disabled profile, and an over-quota origin all throw on access, and merely
 * *reading* `localStorage` throws when cookies are blocked. This is the offline rule
 * applied to memory — an enhancement must never become a dependency. A walker that
 * white-screens because it could not remember your place has traded the whole feature
 * for the nice-to-have.
 */
export function readStoredStep(slug: string, total: number): number {
  try {
    return clampStep(localStorage.getItem(stepStorageKey(slug)), total);
  } catch {
    return 1;
  }
}

export function writeStoredStep(slug: string, step: number): void {
  try {
    localStorage.setItem(stepStorageKey(slug), String(step));
  } catch {
    // Storage unavailable — the walker just won't remember. Nothing else changes.
  }
}

export function clearStoredStep(slug: string): void {
  try {
    localStorage.removeItem(stepStorageKey(slug));
  } catch {
    // Same as above: forgetting to forget is not worth a broken page.
  }
}
