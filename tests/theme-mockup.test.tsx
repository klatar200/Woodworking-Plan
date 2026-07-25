import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Luxury light-theme mockup — design review surface.
 * 404 on Vercel production; allowlisted for anonymous local/preview review.
 */

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('next/link', () => ({
  default: ({ children }: { children: unknown }) => children,
}));

beforeEach(() => {
  vi.resetModules();
  notFound.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function render() {
  const { default: Page } = await import('@/app/dev/theme-mockup/page');
  return Page();
}

describe('GATE 1: luxury theme mockup is off live production', () => {
  it('renders when not on Vercel production', async () => {
    await expect(render()).resolves.toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('404s when VERCEL_ENV is production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });
});

describe('allowlist: theme mockup is anonymous-reviewable; other /dev is not', () => {
  it('allows /dev/theme-mockup and keeps /dev/diagrams private', async () => {
    const { isPublicRoute } = await import('@/lib/public-routes');
    expect(isPublicRoute({ nextUrl: { pathname: '/dev/theme-mockup' } } as never)).toBe(
      true,
    );
    expect(isPublicRoute({ nextUrl: { pathname: '/dev/diagrams' } } as never)).toBe(
      false,
    );
  });
});
