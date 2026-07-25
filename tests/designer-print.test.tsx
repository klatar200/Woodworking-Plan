import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(async () => ({ id: 'user-1' })),
}));

vi.mock('@/lib/board-designs', () => ({
  getDesign: vi.fn(),
}));

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const designConfig: BoardDesignConfig = {
  schemaVersion: 1,
  name: 'Golden end-grain',
  grain: 'end',
  sourceLengthIn: 20,
  stockThicknessIn: 1.5,
  sliceThicknessIn: 1.5,
  kerfIn: 0.125,
  wasteFactor: 0.15,
  flipEveryOtherSlice: true,
  strips: Array.from({ length: 12 }, (_, i) => ({
    id: `golden-${i + 1}`,
    speciesId: i % 2 === 0 ? 'walnut' : 'hard-maple',
    widthIn: 1.5,
    repeat: 1,
  })),
};

describe('designer print route', () => {
  it('is private, noindex, and owner-scoped through getDesign', async () => {
    const pageSource = source('src/app/designer/[id]/print/page.tsx');
    const { metadata } = await import('@/app/designer/[id]/print/page');

    expect(metadata).toMatchObject({
      robots: { index: false, follow: false },
    });
    expect(metadata.title).toMatch(/Board designer/);
    expect(pageSource).toContain('getDesign(id)');
    expect(pageSource).toContain('notFound()');
    expect(pageSource).not.toContain('prisma.boardDesign');
  });

  it('renders the owner design as a black-on-white workshop sheet with tape fractions', async () => {
    const { getDesign } = await import('@/lib/board-designs');
    vi.mocked(getDesign).mockResolvedValue({
      id: 'design-1',
      name: 'Golden end-grain',
      config: designConfig,
      createdAt: new Date('2026-07-25T00:00:00Z'),
      updatedAt: new Date('2026-07-25T00:00:00Z'),
    });
    const { default: PrintPage } = await import('@/app/designer/[id]/print/page');

    const html = renderToStaticMarkup(
      await PrintPage({ params: Promise.resolve({ id: 'design-1' }) }),
    );

    expect(html).toContain('Board diagram');
    expect(html).toContain('18&quot; × 18&quot; × 1 1/2&quot;');
    expect(html).toContain('Walnut');
    expect(html).toContain('Hard Maple');
    expect(html).toContain('2.16 bd ft');
    expect(html).toContain('12 slices');
    expect(html).toContain('5/8&quot; leftover');
    expect(html).not.toMatch(/\bNaN\b|undefined|\$/);
  });

  it('keeps print-only constraints in source and CSS', () => {
    const pageSource = source('src/app/designer/[id]/print/page.tsx');
    const css = source('src/app/globals.css');

    expect(pageSource).toContain('BoardDiagram');
    expect(pageSource).not.toMatch(/three|@react-three\/fiber|r3f-/i);
    expect(pageSource).not.toContain('shadow-[');
    expect(pageSource).toContain('print-table');
    expect(pageSource).toContain('print-page');
    expect(css).toMatch(/\.print-table tr,[\s\S]{0,120}break-inside:\s*avoid/);
    expect(css).toMatch(/\.print-table thead[\s\S]{0,120}table-header-group/);
  });

  it('404s when getDesign returns null for a missing or foreign id', async () => {
    const { getDesign } = await import('@/lib/board-designs');
    vi.mocked(getDesign).mockResolvedValue(null);
    const { default: PrintPage } = await import('@/app/designer/[id]/print/page');

    await expect(
      PrintPage({ params: Promise.resolve({ id: 'foreign-design' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
