import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

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

const goldenStrips = Array.from({ length: 12 }, (_, i) =>
  makeStrip(`golden-${i + 1}`, i % 2 === 0 ? 'walnut' : 'hard-maple'),
);

const designConfig: BoardDesignConfig = makeV2Config({
  name: 'Golden end-grain',
  grain: 'end',
  sourceLengthIn: 20,
  sliceThicknessIn: 1.5,
  panels: [makePanel('panel-1', 'Panel 1', 1.5, goldenStrips)],
  rowPattern: [
    { panelId: 'panel-1', transform: 'none' },
    { panelId: 'panel-1', transform: 'rot180' },
  ],
  rowCount: 12,
});

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
    expect(html).toContain('4.18 bd ft');
    expect(html).toContain('12');
    expect(html).toContain('Slices');
    expect(html).not.toContain('leftover');
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
    expect(pageSource).toContain('data-label');
    expect(css).toMatch(/\.print-table tr,[\s\S]{0,120}break-inside:\s*avoid/);
    expect(css).toMatch(/\.print-table thead[\s\S]{0,120}table-header-group/);
    // Screen-only stacked rows for phone legibility — must not live in @media print.
    expect(css).toMatch(
      /@media screen and \(max-width: 40rem\)[\s\S]*\.print-page \.print-table td::before/,
    );
  });

  it('shows miter column and offcut note for a mitered design', async () => {
    const { getTemplate } = await import('@/lib/board-designer/templates');
    const hex = getTemplate('hexagon')!.config;
    const { getDesign } = await import('@/lib/board-designs');
    vi.mocked(getDesign).mockResolvedValue({
      id: 'design-hex',
      name: 'Hexagon',
      config: hex,
      createdAt: new Date('2026-07-26T00:00:00Z'),
      updatedAt: new Date('2026-07-26T00:00:00Z'),
    });
    const { default: PrintPage } = await import('@/app/designer/[id]/print/page');
    const html = renderToStaticMarkup(
      await PrintPage({ params: Promise.resolve({ id: 'design-hex' }) }),
    );
    expect(html).toContain('Miter');
    expect(html).toContain('Top right');
    expect(html).toContain('print-miter-note');
    expect(html).toContain('two composite strips');
    expect(html).toContain('Walnut');
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
