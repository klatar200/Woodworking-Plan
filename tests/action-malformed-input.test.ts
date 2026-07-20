import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * SERVER ACTIONS MUST NOT THROW ON MALFORMED INPUT (2026-07-19).
 *
 * A server action is a PUBLIC HTTP ENDPOINT — Next generates an id and anyone can POST
 * anything to it, including nothing at all. Four action files each carried a private
 * `requiredString` that threw on a missing field, and an uncaught throw out of an action
 * is an HTTP 500 plus a client "Application error" boundary. That is not a theoretical
 * shape: it is precisely what the rate limiter did before it was fixed to no-throw, and
 * the fix never propagated to the field readers sitting one line below it.
 *
 * Every case below POSTs a deliberately broken FormData and asserts three things:
 *   1. the only thing thrown is the framework's redirect signal (never a real error),
 *   2. NO database work happened,
 *   3. the bounce target is app-relative — a bail path is still an open-redirect risk.
 */

const saves = {
  savePlan: vi.fn(),
  unsavePlan: vi.fn(),
  createCollection: vi.fn(),
  deleteCollection: vi.fn(),
  renameCollection: vi.fn(),
  addPlanToCollection: vi.fn(),
  removePlanFromCollection: vi.fn(),
};
const likes = { likePlan: vi.fn(), unlikePlan: vi.fn() };
const shopping = { addToShoppingList: vi.fn(), removeFromShoppingList: vi.fn() };
const reviews = {
  upsertReview: vi.fn(),
  deleteReview: vi.fn(),
  deleteBuildPhoto: vi.fn(),
  MAX_PHOTOS_PER_REVIEW: 3,
};
const checkRateLimit = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn();
const unstableRethrow = vi.fn();

vi.mock('@/lib/saves', () => saves);
vi.mock('@/lib/likes', () => likes);
vi.mock('@/lib/shopping-list', () => shopping);
vi.mock('@/lib/reviews', () => reviews);
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit }));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('next/navigation', () => ({ redirect, unstable_rethrow: unstableRethrow }));

/** Mirrors NEXT_REDIRECT: a throw the framework handles, not a 500. */
class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}

const allDataFns = [
  ...Object.values(saves),
  ...Object.values(likes),
  ...Object.values(shopping),
  reviews.upsertReview,
  reviews.deleteReview,
  reviews.deleteBuildPhoto,
].filter((fn): fn is ReturnType<typeof vi.fn> => typeof fn === 'function');

beforeEach(() => {
  vi.resetModules();
  for (const fn of allDataFns) fn.mockReset().mockResolvedValue(undefined);
  revalidatePath.mockReset();
  // The limiter ALLOWS every request here — this suite is about what happens after it.
  checkRateLimit.mockReset().mockResolvedValue(true);
  redirect.mockReset().mockImplementation((url: string) => {
    throw new RedirectSignal(url);
  });
  // Mirrors the real `unstable_rethrow`: framework control-flow signals (our
  // RedirectSignal stands in for NEXT_REDIRECT) pass through; real errors do not.
  unstableRethrow.mockReset().mockImplementation((error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  });
});

function form(entries: Record<string, string> = {}): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

/** Every action, with FormData that omits a field it needs. */
const CASES: Array<{
  name: string;
  load: () => Promise<(fd: FormData) => Promise<void>>;
  data: FormData;
}> = [
  {
    name: 'savePlanAction without planId',
    load: async () => (await import('@/app/actions/saves')).savePlanAction,
    data: form(),
  },
  {
    name: 'unsavePlanAction without planId',
    load: async () => (await import('@/app/actions/saves')).unsavePlanAction,
    data: form(),
  },
  {
    name: 'createCollectionAction with a blank name',
    load: async () => (await import('@/app/actions/saves')).createCollectionAction,
    data: form({ name: '   ' }),
  },
  {
    name: 'deleteCollectionAction without collectionId',
    load: async () => (await import('@/app/actions/saves')).deleteCollectionAction,
    data: form(),
  },
  {
    name: 'renameCollectionAction without a name',
    load: async () => (await import('@/app/actions/saves')).renameCollectionAction,
    data: form({ collectionId: 'c1' }),
  },
  {
    name: 'addToCollectionAction without collectionId',
    load: async () => (await import('@/app/actions/saves')).addToCollectionAction,
    data: form({ planId: 'p1' }),
  },
  {
    name: 'removeFromCollectionAction without planId',
    load: async () => (await import('@/app/actions/saves')).removeFromCollectionAction,
    data: form({ collectionId: 'c1' }),
  },
  {
    name: 'likePlanAction without planId',
    load: async () => (await import('@/app/actions/likes')).likePlanAction,
    data: form(),
  },
  {
    name: 'unlikePlanAction without planId',
    load: async () => (await import('@/app/actions/likes')).unlikePlanAction,
    data: form(),
  },
  {
    name: 'addToShoppingListAction without planId',
    load: async () => (await import('@/app/actions/shopping-list')).addToShoppingListAction,
    data: form(),
  },
  {
    name: 'removeFromShoppingListAction without planId',
    load: async () =>
      (await import('@/app/actions/shopping-list')).removeFromShoppingListAction,
    data: form(),
  },
  {
    name: 'submitReviewAction without planId',
    load: async () => (await import('@/app/actions/reviews')).submitReviewAction,
    data: form({ rating: '4' }),
  },
  {
    name: 'submitReviewAction without a rating (THE reported 500)',
    load: async () => (await import('@/app/actions/reviews')).submitReviewAction,
    data: form({ planId: 'p1' }),
  },
  {
    name: 'deleteReviewAction without reviewId',
    load: async () => (await import('@/app/actions/reviews')).deleteReviewAction,
    data: form(),
  },
  {
    name: 'deletePhotoAction without photoId',
    load: async () => (await import('@/app/actions/reviews')).deletePhotoAction,
    data: form(),
  },
];

describe('no server action 500s on malformed input', () => {
  for (const testCase of CASES) {
    it(`${testCase.name}: redirects, does no work, stays on-site`, async () => {
      const action = await testCase.load();

      await expect(action(testCase.data)).rejects.toThrow(/NEXT_REDIRECT/);

      // (1) The ONLY throw is the framework's control-flow signal.
      const thrown = redirect.mock.results[0];
      expect(redirect).toHaveBeenCalledTimes(1);
      expect(thrown).toBeTruthy();

      // (2) Nothing touched the database.
      for (const fn of allDataFns) expect(fn).not.toHaveBeenCalled();

      // (3) The bounce is app-relative. A bail path is an open redirect if it is not.
      const target = redirect.mock.calls[0]![0] as string;
      expect(target.startsWith('/')).toBe(true);
      expect(target.startsWith('//')).toBe(false);
    });
  }
});

describe('the rating bail is the one that explains itself', () => {
  it('carries ?notice=rating-required — a real person can reach this case', async () => {
    // The star input is visually-hidden radios; a browser that failed to enforce their
    // `required` attribute submits this form empty. That person pressed "Post review"
    // and needs to know why nothing happened. The structural ids bounce silently,
    // because only a hand-built request can omit them.
    const { submitReviewAction } = await import('@/app/actions/reviews');

    await expect(
      submitReviewAction(form({ planId: 'p1', slug: 'oak-bench' })),
    ).rejects.toThrow(/NEXT_REDIRECT/);

    const target = redirect.mock.calls[0]![0] as string;
    expect(target).toContain('/plans/oak-bench');
    expect(target).toContain('notice=rating-required');
  });

  it('a missing planId bounces SILENTLY — no field names leaked to a crafted POST', async () => {
    const { submitReviewAction } = await import('@/app/actions/reviews');

    await expect(submitReviewAction(form({ rating: '4' }))).rejects.toThrow(
      /NEXT_REDIRECT/,
    );

    expect(redirect.mock.calls[0]![0]).not.toContain('notice=');
  });

  /**
   * The range check the action never had. `Number.parseInt` accepts "5abc" as 5 and
   * "0" as 0; nothing downstream re-validates, and the catalog's ratings are computed
   * on read from these rows — so a junk value poisons every average silently.
   */
  it('refuses an out-of-range or junk rating instead of storing it', async () => {
    for (const rating of ['0', '6', '-1', '5abc', '1e9']) {
      vi.resetModules();
      redirect.mockClear();
      reviews.upsertReview.mockClear();

      const { submitReviewAction } = await import('@/app/actions/reviews');

      await expect(
        submitReviewAction(form({ planId: 'p1', rating })),
      ).rejects.toThrow(/NEXT_REDIRECT/);

      expect(reviews.upsertReview, `rating=${rating}`).not.toHaveBeenCalled();
    }
  });

  it('SECURITY: a forged returnTo cannot turn a bail into an open redirect', async () => {
    const { submitReviewAction } = await import('@/app/actions/reviews');

    await expect(
      submitReviewAction(form({ planId: 'p1', returnTo: 'https://evil.example/login' })),
    ).rejects.toThrow(/NEXT_REDIRECT/);

    const target = redirect.mock.calls[0]![0] as string;
    expect(target).not.toContain('evil.example');
    expect(target.startsWith('/')).toBe(true);
  });
});

describe('a WELL-FORMED request still works', () => {
  it('submitReviewAction stores a valid rating and revalidates', async () => {
    const { submitReviewAction } = await import('@/app/actions/reviews');

    await submitReviewAction(form({ planId: 'p1', slug: 'oak-bench', rating: '4' }));

    expect(reviews.upsertReview).toHaveBeenCalledWith(
      expect.objectContaining({ planId: 'p1', rating: 4 }),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/plans/oak-bench');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('savePlanAction still saves', async () => {
    const { savePlanAction } = await import('@/app/actions/saves');

    await savePlanAction(form({ planId: 'p1', slug: 'oak-bench' }));

    expect(saves.savePlan).toHaveBeenCalledWith('p1');
    expect(redirect).not.toHaveBeenCalled();
  });
});
