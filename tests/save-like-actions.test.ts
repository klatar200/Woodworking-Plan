import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Denial behaviour of the save/collection/like SERVER ACTIONS.
 *
 * The review actions got this coverage in Sprint 10 because production 500'd at
 * exactly this layer; the save and like actions carry the same denial branch and
 * had no test on it. Every action here must, when the limiter says no:
 *
 *   1. do NO database work,
 *   2. throw NOTHING except the framework's redirect signal, and
 *   3. redirect somewhere sensible with ?notice=slow-down.
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
const checkRateLimit = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn();
const unstableRethrow = vi.fn();

vi.mock('@/lib/saves', () => saves);
vi.mock('@/lib/likes', () => likes);
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit }));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('next/navigation', () => ({ redirect, unstable_rethrow: unstableRethrow }));

/** Mirrors NEXT_REDIRECT: a throw the framework handles, not a 500. */
class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}

beforeEach(() => {
  vi.resetModules();
  for (const fn of Object.values(saves)) fn.mockReset().mockResolvedValue(undefined);
  for (const fn of Object.values(likes)) fn.mockReset().mockResolvedValue(undefined);
  revalidatePath.mockReset();
  checkRateLimit.mockReset().mockResolvedValue(false); // every test here is a denial
  redirect.mockReset().mockImplementation((url: string) => {
    throw new RedirectSignal(url);
  });
  // Mirrors the real `unstable_rethrow` (used by the action guard): framework
  // control-flow signals pass through; real errors do not.
  unstableRethrow.mockReset().mockImplementation((error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  });
});

function form(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [k, v] of Object.entries(entries)) formData.set(k, v);
  return formData;
}

describe('denied save/collection actions redirect and do no work', () => {
  it('savePlanAction honours a returnTo — a denial on the catalog stays on the catalog', async () => {
    const { savePlanAction } = await import('@/app/actions/saves');

    await expect(
      savePlanAction(
        form({
          planId: 'p1',
          slug: 'oak-coat-rack',
          returnTo: '/?category=storage&page=2',
        }),
      ),
    ).rejects.toBeInstanceOf(RedirectSignal);

    expect(redirect).toHaveBeenCalledWith(
      '/?category=storage&page=2&notice=slow-down',
    );
    expect(saves.savePlan).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('savePlanAction REJECTS an off-site returnTo — open-redirect guard', async () => {
    const { savePlanAction } = await import('@/app/actions/saves');

    await expect(
      savePlanAction(
        form({ planId: 'p1', slug: 'oak-coat-rack', returnTo: '//evil.example' }),
      ),
    ).rejects.toBeInstanceOf(RedirectSignal);

    // Falls back to the plan page — never off-site.
    expect(redirect).toHaveBeenCalledWith('/plans/oak-coat-rack?notice=slow-down');
  });

  it('unsavePlanAction falls back to the plan page via slug', async () => {
    const { unsavePlanAction } = await import('@/app/actions/saves');

    await expect(
      unsavePlanAction(form({ planId: 'p1', slug: 'oak-coat-rack' })),
    ).rejects.toBeInstanceOf(RedirectSignal);

    expect(redirect).toHaveBeenCalledWith('/plans/oak-coat-rack?notice=slow-down');
    expect(saves.unsavePlan).not.toHaveBeenCalled();
  });

  it('collection actions fall back to /saved', async () => {
    const actions = await import('@/app/actions/saves');

    const cases: Array<[keyof typeof actions, FormData]> = [
      ['createCollectionAction', form({ name: 'Gifts' })],
      ['deleteCollectionAction', form({ collectionId: 'c1' })],
      ['renameCollectionAction', form({ collectionId: 'c1', name: 'x' })],
      ['addToCollectionAction', form({ planId: 'p1', collectionId: 'c1' })],
      ['removeFromCollectionAction', form({ planId: 'p1', collectionId: 'c1' })],
    ];

    for (const [name, formData] of cases) {
      redirect.mockClear();
      await expect(
        (actions[name] as (fd: FormData) => Promise<void>)(formData),
      ).rejects.toBeInstanceOf(RedirectSignal);
      expect(redirect).toHaveBeenCalledWith('/saved?notice=slow-down');
    }

    for (const fn of Object.values(saves)) expect(fn).not.toHaveBeenCalled();
  });
});

describe('denied like actions redirect and do no work', () => {
  it('likePlanAction and unlikePlanAction fall back to the plan page', async () => {
    const { likePlanAction, unlikePlanAction } = await import('@/app/actions/likes');

    await expect(
      likePlanAction(form({ planId: 'p1', slug: 'oak-coat-rack' })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(redirect).toHaveBeenCalledWith('/plans/oak-coat-rack?notice=slow-down');

    redirect.mockClear();
    await expect(
      unlikePlanAction(form({ planId: 'p1', slug: 'oak-coat-rack' })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(redirect).toHaveBeenCalledWith('/plans/oak-coat-rack?notice=slow-down');

    expect(likes.likePlan).not.toHaveBeenCalled();
    expect(likes.unlikePlan).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
