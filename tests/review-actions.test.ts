import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The review SERVER ACTIONS — Sprint 10.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * THIS FILE EXISTS BECAUSE OF THE RATE-LIMIT INCIDENT.
 *
 * `checkRateLimit()` was correct and fully unit-tested, and production still 500'd —
 * because the BUG WAS IN THE CALLER. The action threw on a denial, and an uncaught
 * throw out of a server action is an unhandled server exception: HTTP 500 and a
 * client-side "Application error" boundary.
 *
 * A data layer can be perfect and the app still falls over at the action wrapper. So
 * the wrapper gets its own tests, and they assert the two things that actually broke:
 *
 *   1. A rate-limited request writes NOTHING and never throws a real error. (It now
 *      `redirect()`s back with ?notice=slow-down — a framework-handled control-flow
 *      signal, not an unhandled exception. See src/lib/rate-limit-feedback.ts.)
 *   2. FormData — which is attacker-controlled — is parsed defensively.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const upsertReview = vi.fn();
const deleteReview = vi.fn();
const deleteBuildPhoto = vi.fn();
const checkRateLimit = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn();

vi.mock('@/lib/reviews', () => ({
  upsertReview,
  deleteReview,
  deleteBuildPhoto,
  MAX_PHOTOS_PER_REVIEW: 4,
}));

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit }));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('next/navigation', () => ({ redirect }));

/**
 * The REAL `redirect()` throws a NEXT_REDIRECT control-flow signal that the
 * framework catches and turns into a 303 — it is not an unhandled exception.
 * The mock mirrors that: it throws a sentinel, so execution genuinely stops at
 * the denial branch (a non-throwing mock would let the action fall through and
 * do the database work the limiter was supposed to prevent).
 */
class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}

beforeEach(() => {
  vi.resetModules();
  upsertReview.mockReset().mockResolvedValue('review_1');
  deleteReview.mockReset().mockResolvedValue(undefined);
  deleteBuildPhoto.mockReset().mockResolvedValue(undefined);
  revalidatePath.mockReset();
  checkRateLimit.mockReset().mockResolvedValue(true);
  redirect.mockReset().mockImplementation((url: string) => {
    throw new RedirectSignal(url);
  });
});

function reviewForm(over: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set('planId', 'plan_1');
  formData.set('slug', 'cedar-raised-garden-bed');
  formData.set('rating', '5');
  for (const [key, value] of Object.entries(over)) formData.set(key, value);
  return formData;
}

describe('REGRESSION: a denied action never throws a REAL error — it redirects with a notice', () => {
  it('submitReviewAction does no work when denied, and redirects to the plan page', async () => {
    checkRateLimit.mockResolvedValue(false);

    const { submitReviewAction } = await import('@/app/actions/reviews');

    // The only thing allowed out of a denial is the framework's redirect
    // signal. A real throw here is an HTTP 500 and a crashed page — the
    // original incident.
    await expect(submitReviewAction(reviewForm())).rejects.toBeInstanceOf(
      RedirectSignal,
    );
    expect(redirect).toHaveBeenCalledWith(
      '/plans/cedar-raised-garden-bed?notice=slow-down',
    );

    // And it did no database work — avoiding that work is why the limiter runs first.
    expect(upsertReview).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('deleteReviewAction does no work when denied', async () => {
    checkRateLimit.mockResolvedValue(false);

    const { deleteReviewAction } = await import('@/app/actions/reviews');

    const formData = new FormData();
    formData.set('reviewId', 'review_1');

    await expect(deleteReviewAction(formData)).rejects.toBeInstanceOf(
      RedirectSignal,
    );
    // No slug in the form and no returnTo — falls back to the catalog.
    expect(redirect).toHaveBeenCalledWith('/?notice=slow-down');
    expect(deleteReview).not.toHaveBeenCalled();
  });

  it('deletePhotoAction does no work when denied', async () => {
    checkRateLimit.mockResolvedValue(false);

    const { deletePhotoAction } = await import('@/app/actions/reviews');

    const formData = new FormData();
    formData.set('photoId', 'photo_1');

    await expect(deletePhotoAction(formData)).rejects.toBeInstanceOf(
      RedirectSignal,
    );
    expect(deleteBuildPhoto).not.toHaveBeenCalled();
  });

  it('every review action uses the CREATE bucket, not the cheap toggle bucket', async () => {
    const actions = await import('@/app/actions/reviews');

    const forms: [keyof typeof actions, FormData][] = [
      ['submitReviewAction', reviewForm()],
      ['deleteReviewAction', (() => { const f = new FormData(); f.set('reviewId', 'r1'); return f; })()],
      ['deletePhotoAction', (() => { const f = new FormData(); f.set('photoId', 'p1'); return f; })()],
    ];

    for (const [name, formData] of forms) {
      await (actions[name] as (fd: FormData) => Promise<void>)(formData);
    }

    // A review is a ROW THAT PERSISTS and that a human has to look at if it turns out
    // to be spam — and an upload also costs CPU and storage quota. That is not the
    // same cost profile as a like, and it must not share the like's 30/min budget.
    for (const call of checkRateLimit.mock.calls) {
      expect(call[0]).toBe('create');
    }
    expect(checkRateLimit).toHaveBeenCalledTimes(3);
  });
});

describe('FormData is attacker-controlled and is parsed as such', () => {
  it('rejects a missing planId rather than writing a row without one', async () => {
    const { submitReviewAction } = await import('@/app/actions/reviews');

    const formData = new FormData();
    formData.set('rating', '5');

    await expect(submitReviewAction(formData)).rejects.toThrow(/planId/);
    expect(upsertReview).not.toHaveBeenCalled();
  });

  it('a non-numeric rating does not silently become NaN in the database', async () => {
    const { submitReviewAction } = await import('@/app/actions/reviews');

    await submitReviewAction(reviewForm({ rating: 'not-a-number' }));

    // parseInt('not-a-number') is NaN. It reaches upsertReview, whose range check
    // rejects it (NaN fails `Number.isFinite`) — asserted in reviews.test.ts. What
    // matters HERE is that the action does not quietly coerce it to 0 or 5 first.
    expect(upsertReview).toHaveBeenCalledWith(
      expect.objectContaining({ rating: NaN }),
    );
  });

  it('caps the number of files BEFORE buffering any of them into memory', async () => {
    const { submitReviewAction } = await import('@/app/actions/reviews');

    const formData = reviewForm();
    // A caller who POSTs 50 files should be truncated before we allocate for them.
    for (let i = 0; i < 50; i++) {
      formData.append('photos', new File([`bytes-${i}`], `p${i}.jpg`, { type: 'image/jpeg' }));
    }

    await submitReviewAction(formData);

    const call = upsertReview.mock.calls[0]![0];
    expect(call.photos).toHaveLength(4); // MAX_PHOTOS_PER_REVIEW
  });

  it('ignores empty file inputs — an unfilled <input type=file> is not a photo', async () => {
    const { submitReviewAction } = await import('@/app/actions/reviews');

    const formData = reviewForm();
    // A browser submits an empty File for an untouched file input. Treating that as a
    // photo would push a 0-byte upload through the pipeline on every review.
    formData.append('photos', new File([], '', { type: 'application/octet-stream' }));

    await submitReviewAction(formData);

    const call = upsertReview.mock.calls[0]![0];
    expect(call.photos).toHaveLength(0);
  });

  it('revalidates the plan page and the catalog on a successful write', async () => {
    const { submitReviewAction } = await import('@/app/actions/reviews');

    await submitReviewAction(reviewForm());

    // The catalog shows star ratings on cards; both are stale after a review lands.
    expect(revalidatePath).toHaveBeenCalledWith('/plans/cedar-raised-garden-bed');
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });
});
