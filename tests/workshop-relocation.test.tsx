import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * QOL-D item 3 — Workshop relocated; Sprint 47 retargeted to `/settings/workshop`.
 *
 * `/workshop` stays as a redirect. Save action targets, rate-limit bounces, and
 * revalidate paths must follow the form — bouncing to a redirect hops and drops
 * `?saved=` / `?notice=`.
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
  unstableRethrow.mockReset().mockImplementation((error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  });
});

describe('/workshop is kept as a redirect, not deleted', () => {
  it('sends visitors to /settings/workshop', async () => {
    const { default: WorkshopPage } = await import('@/app/workshop/page');

    expect(() => WorkshopPage()).toThrow('NEXT_REDIRECT:/settings/workshop');
    expect(redirect).toHaveBeenCalledWith('/settings/workshop');
  });
});

describe('saveWorkshopAction follows the form to /settings/workshop', () => {
  it('PRG-redirects with the saved flag', async () => {
    const { saveWorkshopAction } = await import('@/app/actions/workshop');

    const formData = new FormData();
    formData.append('tools', 'table-saw');
    formData.append('tools', 'router');

    await expect(saveWorkshopAction(formData)).rejects.toThrow(
      'NEXT_REDIRECT:/settings/workshop?saved=1',
    );

    expect(setOwnedTools).toHaveBeenCalledWith(['table-saw', 'router']);
    expect(revalidatePath).toHaveBeenCalledWith('/browse');
    expect(revalidatePath).toHaveBeenCalledWith('/settings/workshop');
    expect(revalidatePath).not.toHaveBeenCalledWith('/workshop');
  });

  it('a rate-limited save lands on /settings/workshop with the slow-down notice', async () => {
    checkRateLimit.mockResolvedValue(false);
    const { saveWorkshopAction } = await import('@/app/actions/workshop');

    await expect(saveWorkshopAction(new FormData())).rejects.toThrow(/NEXT_REDIRECT/);

    const target = redirect.mock.calls[0]![0] as string;
    expect(target).toContain('/settings/workshop');
    expect(target).toContain('notice=slow-down');
    expect(setOwnedTools).not.toHaveBeenCalled();
  });

  it('SECURITY: a forged returnTo cannot bounce the user off-site', async () => {
    checkRateLimit.mockResolvedValue(false);
    const { saveWorkshopAction } = await import('@/app/actions/workshop');

    const formData = new FormData();
    formData.set('returnTo', 'https://evil.example/sign-in');

    await expect(saveWorkshopAction(formData)).rejects.toThrow(/NEXT_REDIRECT/);

    const target = redirect.mock.calls[0]![0] as string;
    expect(target).not.toContain('evil.example');
    expect(target.startsWith('/settings/workshop')).toBe(true);
  });
});
