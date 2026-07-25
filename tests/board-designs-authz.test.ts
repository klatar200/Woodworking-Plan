import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

const mocks = vi.hoisted(() => {
  const redirect = vi.fn((url: string) => {
    const error = new Error('NEXT_REDIRECT') as Error & {
      digest: string;
      status: number;
      url: string;
    };
    error.digest = `NEXT_REDIRECT;replace;${url};303;`;
    error.status = 303;
    error.url = url;
    throw error;
  });

  return {
    redirect,
    revalidatePath: vi.fn(),
    checkRateLimit: vi.fn(),
    requireUser: vi.fn(),
    prisma: {
      boardDesign: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
  };
});

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
  unstable_rethrow: (error: unknown) => {
    if (
      error instanceof Error &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_')
    ) {
      throw error;
    }
  },
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock('@/lib/auth', () => ({
  requireUser: mocks.requireUser,
}));

vi.mock('@/lib/db', () => ({
  prisma: mocks.prisma,
}));

import {
  createDesign,
  deleteDesign,
  getDesign,
  listDesigns,
  updateDesign,
} from '@/lib/board-designs';
import {
  createBoardDesignAction,
  deleteBoardDesignAction,
  updateBoardDesignAction,
} from '@/app/actions/board-designs';

const validConfig: BoardDesignConfig = {
  schemaVersion: 1,
  name: 'Weekend checkerboard',
  grain: 'end',
  sourceLengthIn: 14,
  stockThicknessIn: 1.5,
  sliceThicknessIn: 1.5,
  kerfIn: 0.125,
  wasteFactor: 0.15,
  flipEveryOtherSlice: true,
  strips: [
    { id: 'a', speciesId: 'hard-maple', widthIn: 1.5, repeat: 1 },
    { id: 'b', speciesId: 'walnut', widthIn: 1.5, repeat: 1 },
  ],
};

const now = new Date('2026-07-25T18:00:00.000Z');

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

async function expectRedirect(work: Promise<unknown>, url: string) {
  await expect(work).rejects.toMatchObject({ status: 303, url });
  expect(mocks.redirect).toHaveBeenLastCalledWith(url);
}

function unauthorized() {
  const error = new Error('Unauthorized: no authenticated user');
  error.name = 'UnauthorizedError';
  return error;
}

describe('BoardDesign auth gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue(true);
    mocks.requireUser.mockResolvedValue({ id: 'user-a' });
    mocks.prisma.boardDesign.findMany.mockResolvedValue([]);
    mocks.prisma.boardDesign.findFirst.mockResolvedValue(null);
    mocks.prisma.boardDesign.create.mockResolvedValue({
      id: 'design-a',
      name: validConfig.name,
      config: validConfig,
      createdAt: now,
      updatedAt: now,
    });
    mocks.prisma.boardDesign.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.boardDesign.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('signed-out designer data paths fail closed through requireUser', async () => {
    mocks.requireUser.mockRejectedValue(unauthorized());

    await expect(listDesigns()).rejects.toMatchObject({ name: 'UnauthorizedError' });
    await expect(getDesign('design-a')).rejects.toMatchObject({ name: 'UnauthorizedError' });
    await expect(createDesign(validConfig)).rejects.toMatchObject({ name: 'UnauthorizedError' });
  });

  it('designer pages use the private auth/data pattern and foreign detail pages 404', () => {
    const designer = readFileSync(resolve(process.cwd(), 'src/app/designer/page.tsx'), 'utf8');
    const library = readFileSync(
      resolve(process.cwd(), 'src/app/designer/library/page.tsx'),
      'utf8',
    );
    const detail = readFileSync(
      resolve(process.cwd(), 'src/app/designer/[id]/page.tsx'),
      'utf8',
    );

    expect(designer).toContain('await requireUser()');
    expect(library).toContain('listDesigns()');
    expect(detail).toContain('getDesign(id)');
    expect(detail).toContain('if (!design) notFound()');
  });

  it('User B cannot get, update, or delete User A design because queries scope by session user', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'user-b' });

    await expect(getDesign('design-a')).resolves.toBeNull();
    await updateDesign('design-a', validConfig);
    await deleteDesign('design-a');

    expect(mocks.prisma.boardDesign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'design-a', userId: 'user-b' } }),
    );
    expect(mocks.prisma.boardDesign.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'design-a', userId: 'user-b' } }),
    );
    expect(mocks.prisma.boardDesign.deleteMany).toHaveBeenCalledWith({
      where: { id: 'design-a', userId: 'user-b' },
    });
  });

  it('posted userId is ignored; create uses only the authenticated session user', async () => {
    await expectRedirect(
      createBoardDesignAction(
        form({
          config: JSON.stringify(validConfig),
          userId: 'user-b',
        }),
      ),
      '/designer/design-a',
    );

    expect(mocks.prisma.boardDesign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-a',
          name: validConfig.name,
        }),
      }),
    );
    expect(JSON.stringify(mocks.prisma.boardDesign.create.mock.calls)).not.toContain('user-b');
  });

  it('rate-limited actions redirect with slow-down 303 and do no write work', async () => {
    mocks.checkRateLimit.mockResolvedValue(false);
    const config = JSON.stringify(validConfig);

    await expectRedirect(
      createBoardDesignAction(form({ config, returnTo: '/designer' })),
      '/designer?notice=slow-down',
    );
    await expectRedirect(
      updateBoardDesignAction(
        form({ designId: 'design-a', config, returnTo: '/designer/design-a' }),
      ),
      '/designer/design-a?notice=slow-down',
    );
    await expectRedirect(
      deleteBoardDesignAction(form({ designId: 'design-a', returnTo: '/designer/library' })),
      '/designer/library?notice=slow-down',
    );

    expect(mocks.prisma.boardDesign.create).not.toHaveBeenCalled();
    expect(mocks.prisma.boardDesign.updateMany).not.toHaveBeenCalled();
    expect(mocks.prisma.boardDesign.deleteMany).not.toHaveBeenCalled();
  });

  it('9KB config bounces before JSON.parse and never writes', async () => {
    const parseSpy = vi.spyOn(JSON, 'parse');

    await expectRedirect(
      createBoardDesignAction(form({ config: '{'.repeat(9 * 1024), returnTo: '/designer' })),
      '/designer',
    );

    expect(parseSpy).not.toHaveBeenCalled();
    expect(mocks.prisma.boardDesign.create).not.toHaveBeenCalled();
    parseSpy.mockRestore();
  });

  it('designer is not added to the public route allowlist', () => {
    const publicRoutes = readFileSync(resolve(process.cwd(), 'src/lib/public-routes.ts'), 'utf8');

    expect(publicRoutes).not.toContain("'/designer'");
    expect(publicRoutes).not.toContain('"/designer"');
  });
});
