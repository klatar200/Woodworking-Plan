import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isNavActive } from '@/lib/nav-active';

/**
 * Sprint 47 — settings hub.
 *
 * `/settings` requires a session (allowlist fails closed). The rail's active
 * state uses `isNavActive` (prefix match so Clerk security sub-routes light
 * Security). `updateProfileFields` bails via redirect, never throws; rejects
 * non-http websites; ignores any injected `userId`.
 */

vi.mock('@clerk/nextjs', () => ({
  useClerk: () => ({ signOut: vi.fn() }),
  useUser: () => ({ user: null }),
  UserProfile: () => null,
}));

const redirect = vi.fn();
const unstableRethrow = vi.fn();
const revalidatePath = vi.fn();
const checkRateLimit = vi.fn();
const requireUser = vi.fn();
const prismaUserUpdate = vi.fn();

vi.mock('next/navigation', () => ({
  redirect,
  unstable_rethrow: unstableRethrow,
  usePathname: () => '/settings/profile',
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit }));
vi.mock('@/lib/auth', () => ({ requireUser }));
vi.mock('@/lib/db', () => ({
  prisma: { user: { update: (...args: unknown[]) => prismaUserUpdate(...args) } },
}));

class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}

beforeEach(() => {
  vi.resetModules();
  revalidatePath.mockReset();
  prismaUserUpdate.mockReset().mockResolvedValue({});
  requireUser.mockReset().mockResolvedValue({ id: 'user_session_1' });
  checkRateLimit.mockReset().mockResolvedValue(true);
  redirect.mockReset().mockImplementation((url: string) => {
    throw new RedirectSignal(url);
  });
  unstableRethrow.mockReset().mockImplementation((error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  });
});

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

const EMPTY_FIELDS = {
  phone: '',
  company: '',
  jobTitle: '',
  website: '',
};

describe('/settings requires a session', () => {
  it('is absent from the public-routes allowlist', async () => {
    const { PUBLIC_ROUTES } = await import('@/lib/public-routes');
    expect(PUBLIC_ROUTES.some((r) => String(r).includes('settings'))).toBe(false);
  });
});

describe('settings-nav active cases', () => {
  it('lists the expected panes in rail order', async () => {
    const { SETTINGS_NAV_HREFS } = await import('@/components/settings-nav');
    expect([...SETTINGS_NAV_HREFS]).toEqual([
      '/settings/profile',
      '/settings/security',
      '/settings/billing',
      '/settings/workshop',
      '/settings/preferences',
      '/settings/terms',
    ]);
  });

  it('lights Security for Clerk sub-routes under /settings/security', () => {
    expect(isNavActive('/settings/security', '/settings/security')).toBe(true);
    expect(
      isNavActive('/settings/security/security', '/settings/security'),
    ).toBe(true);
    expect(isNavActive('/settings/profile', '/settings/security')).toBe(false);
  });

  it('lights Profile only on the profile pane', () => {
    expect(isNavActive('/settings/profile', '/settings/profile')).toBe(true);
    expect(isNavActive('/settings/workshop', '/settings/profile')).toBe(false);
  });
});

describe('updateProfileFields', () => {
  it('bails via redirect (not throw) when a field is missing', async () => {
    const { updateProfileFields } = await import('@/app/actions/profile');
    const data = form({ phone: '555', company: '', jobTitle: '' }); // website missing

    await expect(updateProfileFields(data)).rejects.toThrow(/NEXT_REDIRECT/);
    expect(prismaUserUpdate).not.toHaveBeenCalled();
  });

  it('bails via redirect on oversized input', async () => {
    const { updateProfileFields } = await import('@/app/actions/profile');
    const data = form({
      ...EMPTY_FIELDS,
      phone: 'x'.repeat(41),
    });

    await expect(updateProfileFields(data)).rejects.toThrow(/NEXT_REDIRECT/);
    expect(prismaUserUpdate).not.toHaveBeenCalled();
  });

  it('rejects a non-http website', async () => {
    const { updateProfileFields } = await import('@/app/actions/profile');

    for (const bad of [
      'javascript:alert(1)',
      'data:text/html,hi',
      'ftp://example.com',
      'example.com',
    ]) {
      redirect.mockClear();
      prismaUserUpdate.mockClear();
      const data = form({ ...EMPTY_FIELDS, website: bad });
      await expect(updateProfileFields(data)).rejects.toThrow(/NEXT_REDIRECT/);
      expect(prismaUserUpdate).not.toHaveBeenCalled();
    }
  });

  it('ignores any injected userId and updates the session user only', async () => {
    const { updateProfileFields } = await import('@/app/actions/profile');
    const data = form({
      ...EMPTY_FIELDS,
      phone: '555-0100',
      website: 'https://example.com',
      userId: 'attacker_other_user',
    });

    await expect(updateProfileFields(data)).rejects.toThrow(
      'NEXT_REDIRECT:/settings/profile',
    );

    expect(requireUser).toHaveBeenCalled();
    expect(prismaUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user_session_1' },
      data: {
        phone: '555-0100',
        company: null,
        jobTitle: null,
        website: 'https://example.com',
      },
    });
    const arg = JSON.stringify(prismaUserUpdate.mock.calls[0]);
    expect(arg).not.toContain('attacker_other_user');
  });

  it('accepts a cleared website (empty → null)', async () => {
    const { updateProfileFields } = await import('@/app/actions/profile');
    const data = form(EMPTY_FIELDS);

    await expect(updateProfileFields(data)).rejects.toThrow(
      'NEXT_REDIRECT:/settings/profile',
    );
    expect(prismaUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user_session_1' },
      data: {
        phone: null,
        company: null,
        jobTitle: null,
        website: null,
      },
    });
  });
});
