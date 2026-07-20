import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * QOL-D item 3 — the Workshop moved into the profile page (`DECISIONS_LOG.md`
 * 2026-07-19), and `/workshop` was kept as a redirect rather than deleted.
 *
 * What has to stay true after a move like this is not "the form renders" — it is that
 * nothing that used to work stopped working. There were at least three inbound paths to
 * `/workshop`: the header link (deliberately removed), the plan page's "Update your
 * workshop" prompt, and any bookmark. The first two are updated; the third is why the
 * route still exists. And every redirect target in the save action had to move with it,
 * or a save would land somewhere that cannot show its own confirmation.
 */

const redirect = vi.fn();
const unstableRethrow = vi.fn();
const revalidatePath = vi.fn();
const checkRateLimit = vi.fn();
const setOwnedTools = vi.fn();

vi.mock('next/navigation', () => ({ redirect, unstable_rethrow: unstableRethrow }));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit }));
vi.mock('@/lib/workshop', () => ({ setOwnedTools }));

/** Mirrors NEXT_REDIRECT: a throw the framework handles, not a 500. */
class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}

beforeEach(() => {
  vi.resetModules();
  revalidatePath.mockReset();
  setOwnedTools.mockReset().mockResolvedValue(undefined);
  checkRateLimit.mockReset().mockResolvedValue(true);
  redirect.mockReset().mockImplementation((url: string) => {
    throw new RedirectSignal(url);
  });
  // Mirrors the real `unstable_rethrow` (used by the action guard): framework
  // control-flow signals pass through; real errors do not.
  unstableRethrow.mockReset().mockImplementation((error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  });
});

describe('/workshop is kept as a redirect, not deleted', () => {
  it('sends visitors to the profile page’s workshop section', async () => {
    const { default: WorkshopPage } = await import('@/app/workshop/page');

    expect(() => WorkshopPage()).toThrow('NEXT_REDIRECT:/profile#workshop');
    expect(redirect).toHaveBeenCalledWith('/profile#workshop');
  });
});

describe('saveWorkshopAction follows the form to /profile', () => {
  it('PRG-redirects to the profile section with the saved flag', async () => {
    const { saveWorkshopAction } = await import('@/app/actions/workshop');

    const formData = new FormData();
    formData.append('tools', 'table-saw');
    formData.append('tools', 'router');

    await expect(saveWorkshopAction(formData)).rejects.toThrow(
      'NEXT_REDIRECT:/profile?saved=1#workshop',
    );

    // Replace-all: the whole checked set is written, exactly as before the move.
    expect(setOwnedTools).toHaveBeenCalledWith(['table-saw', 'router']);
    // The catalog's tool-filter prefill is now stale.
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/profile');
    // …and NOT the route that is now only a redirect.
    expect(revalidatePath).not.toHaveBeenCalledWith('/workshop');
  });

  /**
   * The standing rule: a limiter DROPS a request, it must never THROW — an uncaught
   * throw out of a server action is an HTTP 500. The denial has to land somewhere that
   * can render the notice, which after this move is /profile; bouncing to /workshop
   * would hop through the redirect and lose the `?notice=` query on the way.
   */
  it('a rate-limited save lands on /profile with the slow-down notice, doing no work', async () => {
    checkRateLimit.mockResolvedValue(false);
    const { saveWorkshopAction } = await import('@/app/actions/workshop');

    await expect(saveWorkshopAction(new FormData())).rejects.toThrow(/NEXT_REDIRECT/);

    const target = redirect.mock.calls[0]![0] as string;
    expect(target).toContain('/profile');
    expect(target).toContain('notice=slow-down');
    expect(setOwnedTools).not.toHaveBeenCalled();
  });

  /**
   * `returnTo` is attacker-controlled FormData. `safeReturnTo` rejects absolute and
   * protocol-relative targets — remove that and every denial is an open redirect.
   */
  it('SECURITY: a forged returnTo cannot bounce the user off-site', async () => {
    checkRateLimit.mockResolvedValue(false);
    const { saveWorkshopAction } = await import('@/app/actions/workshop');

    const formData = new FormData();
    formData.set('returnTo', 'https://evil.example/sign-in');

    await expect(saveWorkshopAction(formData)).rejects.toThrow(/NEXT_REDIRECT/);

    const target = redirect.mock.calls[0]![0] as string;
    expect(target).not.toContain('evil.example');
    expect(target.startsWith('/profile')).toBe(true);
  });
});
