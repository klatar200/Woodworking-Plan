import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The action-boundary catch (src/lib/action-guard.ts) — AUDIT FIX 2026-07-19.
 *
 * The rule under test: A SERVER ACTION MUST NOT THROW. The limiter was fixed to
 * no-throw, then the FormData readers, and each time the throw was sitting one call
 * deeper. This guard is where the rule finally covers the data layer — so its own
 * tests assert the behaviour the APP needs (a redirect, never a real throw), not
 * merely that the code does what it says.
 */

const redirect = vi.fn();
const unstableRethrow = vi.fn();

vi.mock('next/navigation', () => ({ redirect, unstable_rethrow: unstableRethrow }));

/** Mirrors NEXT_REDIRECT: a throw the framework handles, not a 500. */
class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}

beforeEach(() => {
  vi.resetModules();
  redirect.mockReset().mockImplementation((url: string) => {
    throw new RedirectSignal(url);
  });
  unstableRethrow.mockReset().mockImplementation((error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function form(entries: Record<string, string> = {}): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

describe('guardAction', () => {
  it('does nothing on success — the action continues past it', async () => {
    const { guardAction } = await import('@/lib/action-guard');

    await expect(
      guardAction(Promise.resolve('ok'), form(), '/'),
    ).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("lets the framework's own control-flow signals pass through untouched", async () => {
    const { guardAction } = await import('@/lib/action-guard');

    // A nested redirect() (e.g. from deeper library code) must NOT be converted
    // into a bounce — swallowing NEXT_REDIRECT breaks the framework.
    const signal = new RedirectSignal('/somewhere');
    await expect(
      guardAction(Promise.reject(signal), form(), '/'),
    ).rejects.toBe(signal);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('sends an EXPIRED SESSION to sign-in with a return URL — not to a crash page', async () => {
    const { guardAction } = await import('@/lib/action-guard');

    // The user-reachable case this guard exists for: the plan page is public, so
    // the middleware never intercepts the POST; requireUser() throws inside the
    // data layer; before the guard, that throw was an HTTP 500.
    const unauthorized = new Error('Unauthorized: no authenticated user');
    unauthorized.name = 'UnauthorizedError';

    await expect(
      guardAction(
        Promise.reject(unauthorized),
        form({ slug: 'oak-coat-rack' }),
        '/',
      ),
    ).rejects.toBeInstanceOf(RedirectSignal);

    expect(redirect).toHaveBeenCalledWith(
      `/sign-in?redirect_url=${encodeURIComponent('/plans/oak-coat-rack')}`,
    );
  });

  it('drops any other failure with a SILENT bounce — logged, never thrown', async () => {
    const { guardAction } = await import('@/lib/action-guard');

    await expect(
      guardAction(
        Promise.reject(new Error('Plan not found')),
        form({ slug: 'oak-coat-rack' }),
        '/',
      ),
    ).rejects.toBeInstanceOf(RedirectSignal);

    // Silent: only a hand-built POST reaches these throws, and it learns nothing.
    expect(redirect).toHaveBeenCalledWith('/plans/oak-coat-rack');
    expect(redirect.mock.calls[0]![0]).not.toContain('notice=');
    // But not invisible — a swallowed DB outage must still reach the logs.
    expect(console.error).toHaveBeenCalled();
  });

  it('carries a notice when the caller maps the error to one (the upload case)', async () => {
    const { guardAction } = await import('@/lib/action-guard');

    const uploadError = new Error('Image is too large.');
    uploadError.name = 'UploadError';

    await expect(
      guardAction(
        Promise.reject(uploadError),
        form({ slug: 'oak-coat-rack' }),
        '/',
        (error) =>
          error instanceof Error && error.name === 'UploadError'
            ? 'upload-failed'
            : null,
      ),
    ).rejects.toBeInstanceOf(RedirectSignal);

    expect(redirect).toHaveBeenCalledWith('/plans/oak-coat-rack?notice=upload-failed');
  });

  it('SECURITY: the bounce target rejects an off-site returnTo — same rule as every bail path', async () => {
    const { guardAction } = await import('@/lib/action-guard');

    await expect(
      guardAction(
        Promise.reject(new Error('boom')),
        form({ returnTo: '//evil.example', slug: 'oak-coat-rack' }),
        '/',
      ),
    ).rejects.toBeInstanceOf(RedirectSignal);

    // Falls back through safeReturnTo to the slug — never off-site.
    expect(redirect).toHaveBeenCalledWith('/plans/oak-coat-rack');
  });
});
