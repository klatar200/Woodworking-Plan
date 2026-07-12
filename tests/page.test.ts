import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ReactElement } from 'react';

/**
 * Drives the Sprint 0 status page component itself (not just the API route),
 * so the page's reporting logic is covered even though `next build` / `next dev`
 * cannot be executed in every environment.
 *
 * Home() is an async server component: calling it returns a React element tree,
 * which we can walk and assert on directly — no DOM or renderer required.
 */

const queryRaw = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    $queryRaw = queryRaw;
  },
}));

const DB_URL = 'postgresql://u:hunter2@ep-x-pooler.aws.neon.tech/neondb?sslmode=require';

/** Collects every string of rendered text in the element tree. */
function textOf(node: unknown, out: string[] = []): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => textOf(child, out));
    return out;
  }

  const element = node as ReactElement<Record<string, unknown>>;
  const props = element.props ?? {};

  // StatusRow passes its content via props rather than children.
  for (const key of ['label', 'value'] as const) {
    if (typeof props[key] === 'string') out.push(props[key] as string);
  }
  if ('children' in props) textOf(props.children, out);

  return out;
}

beforeEach(() => {
  queryRaw.mockReset();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Sprint 0 status page', () => {
  it('reports both services as not configured before any vendor account exists', async () => {
    const { default: Home } = await import('@/app/page');
    const text = textOf(await Home()).join(' | ');

    expect(text).toContain('Neon Postgres');
    expect(text).toContain('Clerk');
    // Two "not configured" rows: Neon and Clerk.
    expect(text.match(/not configured/g)?.length).toBe(2);
  });

  it('reports Neon as connected once DATABASE_URL works', async () => {
    vi.stubEnv('DATABASE_URL', DB_URL);
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const { default: Home } = await import('@/app/page');
    const text = textOf(await Home()).join(' | ');

    expect(text).toMatch(/connected \(\d+ms\)/);
  });

  it('reports a connection failure without crashing the page', async () => {
    vi.stubEnv('DATABASE_URL', DB_URL);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    queryRaw.mockRejectedValue(new Error('ECONNREFUSED'));

    const { default: Home } = await import('@/app/page');
    const text = textOf(await Home()).join(' | ');

    expect(text).toContain('connection failed');
  });

  it('SECURITY: never renders the connection string or Clerk secret to the page', async () => {
    vi.stubEnv('DATABASE_URL', DB_URL);
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_supersecret');
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_public');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    queryRaw.mockRejectedValue(new Error(`Can't reach database server at ${DB_URL}`));

    const { default: Home } = await import('@/app/page');
    const text = textOf(await Home()).join(' | ');

    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('supersecret');
    expect(text).not.toContain('neon.tech');
  });
});
