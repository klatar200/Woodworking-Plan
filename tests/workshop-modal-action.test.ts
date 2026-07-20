import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * QOL-L — `saveWorkshopModalAction`, the AccountModal's result-returning save.
 *
 * The whole reason it exists (vs the redirecting `saveWorkshopAction`) is that it must
 * return a VALUE for the modal to render, and — like every server action here — must
 * NEVER throw (an uncaught throw out of a server action is an HTTP 500). These tests pin
 * the rate-limit drop, the two error mappings, and the success revalidations.
 */

const checkRateLimit = vi.fn();
const setOwnedTools = vi.fn();
const revalidatePath = vi.fn();

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit }));
vi.mock('@/lib/workshop', () => ({ setOwnedTools }));
vi.mock('next/cache', () => ({ revalidatePath }));
// Imported by the module for the OTHER (redirecting) action — mocked so importing the
// module doesn't pull in the real auth/navigation chain.
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/rate-limit-feedback', () => ({ denialTarget: vi.fn() }));
vi.mock('@/lib/action-guard', () => ({ guardAction: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  checkRateLimit.mockReset().mockResolvedValue(true);
  setOwnedTools.mockReset().mockResolvedValue(undefined);
  revalidatePath.mockReset();
});

describe('saveWorkshopModalAction', () => {
  it('saves the cleaned slug set and returns {ok:true}, revalidating catalog + profile', async () => {
    const { saveWorkshopModalAction } = await import('@/app/actions/workshop');
    const res = await saveWorkshopModalAction(['table-saw', '', 'router']);

    // Empty strings dropped before the write.
    expect(setOwnedTools).toHaveBeenCalledWith(['table-saw', 'router']);
    expect(res).toEqual({ ok: true });
    // QOL-M: the catalog (tools-owned filter prefill) is at /browse now, not `/`.
    expect(revalidatePath).toHaveBeenCalledWith('/browse');
    expect(revalidatePath).toHaveBeenCalledWith('/profile');
  });

  it('DROPS a rate-limited save and returns a typed result — never throws (no 500)', async () => {
    checkRateLimit.mockResolvedValue(false);
    const { saveWorkshopModalAction } = await import('@/app/actions/workshop');
    const res = await saveWorkshopModalAction(['table-saw']);

    expect(res).toEqual({ ok: false, error: 'rate-limited' });
    expect(setOwnedTools).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('maps an expired session (UnauthorizedError) to {unauthorized}, not a throw', async () => {
    const err = new Error('no session');
    err.name = 'UnauthorizedError';
    setOwnedTools.mockRejectedValue(err);
    const { saveWorkshopModalAction } = await import('@/app/actions/workshop');

    await expect(saveWorkshopModalAction(['table-saw'])).resolves.toEqual({
      ok: false,
      error: 'unauthorized',
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('maps any other failure to {error}, not a throw', async () => {
    setOwnedTools.mockRejectedValue(new Error('db down'));
    const { saveWorkshopModalAction } = await import('@/app/actions/workshop');

    await expect(saveWorkshopModalAction(['table-saw'])).resolves.toEqual({
      ok: false,
      error: 'error',
    });
  });
});
