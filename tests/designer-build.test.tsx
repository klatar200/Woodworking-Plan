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

describe('designer build guide route', () => {
  it('is private, noindex, and owner-scoped through getDesign', async () => {
    const pageSource = source('src/app/designer/[id]/build/page.tsx');
    const { metadata } = await import('@/app/designer/[id]/build/page');

    expect(metadata).toMatchObject({
      robots: { index: false, follow: false },
    });
    expect(metadata.title).toMatch(/Board designer/);
    expect(pageSource).toContain("dynamic = 'force-dynamic'");
    expect(pageSource).toContain('requireUser()');
    expect(pageSource).toContain('getDesign(id)');
    expect(pageSource).toContain('notFound()');
    expect(pageSource).not.toContain('prisma.boardDesign');
    expect(pageSource).not.toMatch(/params\.[a-zA-Z]*[Uu]ser|searchParams.*user/i);
  });

  it('renders every build step in order with details, numbers, and tape fractions', async () => {
    const { getDesign } = await import('@/lib/board-designs');
    vi.mocked(getDesign).mockResolvedValue({
      id: 'design-1',
      name: 'Golden end-grain',
      config: designConfig,
      createdAt: new Date('2026-07-25T00:00:00Z'),
      updatedAt: new Date('2026-07-25T00:00:00Z'),
    });

    const { calculateMetrics } = await import('@/lib/board-designer/metrics');
    const { designBuildSteps } = await import(
      '@/lib/board-designer/build-steps'
    );
    const metrics = calculateMetrics(designConfig);
    const steps = designBuildSteps(designConfig, metrics);

    const { default: BuildPage } = await import(
      '@/app/designer/[id]/build/page'
    );
    const html = renderToStaticMarkup(
      await BuildPage({ params: Promise.resolve({ id: 'design-1' }) }),
    );

    expect(html).toContain('Back to the designer');
    expect(html).toContain('href="/designer/design-1"');

    // Inch marks from formatInches render as &quot; in static HTML.
    const asHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

    let cursor = 0;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const numIdx = html.indexOf(`${i + 1}. `, cursor);
      expect(numIdx).toBeGreaterThanOrEqual(0);
      const titleIdx = html.indexOf(step.title, numIdx);
      expect(titleIdx).toBeGreaterThan(numIdx);
      const detailHtml = asHtml(step.detail);
      const detailIdx = html.indexOf(detailHtml, titleIdx);
      expect(detailIdx).toBeGreaterThan(titleIdx);
      cursor = detailIdx + detailHtml.length;
    }

    expect(html).toContain('As cut');
    expect(html).toContain('Turned end-for-end');
    expect(html).not.toMatch(/rot180|mirrorX|mirrorY/);
    expect(html).not.toMatch(/\bPPE\b|safety glasses|ear protection/i);
    expect(html).not.toContain('$');

    // Dimensions go through formatInches — no raw decimal inches in guide output.
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
    expect(text).not.toMatch(/\d+\.\d+/);
  });

  it('guide and print sheet share the same transform wording', async () => {
    const { getDesign } = await import('@/lib/board-designs');
    const design = {
      id: 'design-1',
      name: 'Golden end-grain',
      config: designConfig,
      createdAt: new Date('2026-07-25T00:00:00Z'),
      updatedAt: new Date('2026-07-25T00:00:00Z'),
    };
    vi.mocked(getDesign).mockResolvedValue(design);

    const { default: BuildPage } = await import(
      '@/app/designer/[id]/build/page'
    );
    const { default: PrintPage } = await import(
      '@/app/designer/[id]/print/page'
    );
    const buildHtml = renderToStaticMarkup(
      await BuildPage({ params: Promise.resolve({ id: 'design-1' }) }),
    );
    const printHtml = renderToStaticMarkup(
      await PrintPage({ params: Promise.resolve({ id: 'design-1' }) }),
    );

    for (const label of [
      'As cut',
      'Turned end-for-end',
      'Flipped over',
      'Flipped top to bottom',
    ]) {
      if (buildHtml.includes(label)) {
        expect(printHtml).toContain(label);
      }
    }
    expect(buildHtml).toContain('As cut');
    expect(printHtml).toContain('As cut');
    expect(buildHtml).toContain('Turned end-for-end');
    expect(printHtml).toContain('Turned end-for-end');
    expect(printHtml).toContain('Build plan');
    expect(printHtml).not.toMatch(/rot180|mirrorX|mirrorY/);
    expect(printHtml).not.toMatch(/\bPPE\b|safety glasses|ear protection/i);
  });

  it('quantities include count, label, and formatInches dimensions', async () => {
    const { getDesign } = await import('@/lib/board-designs');
    vi.mocked(getDesign).mockResolvedValue({
      id: 'design-1',
      name: 'Golden end-grain',
      config: designConfig,
      createdAt: new Date('2026-07-25T00:00:00Z'),
      updatedAt: new Date('2026-07-25T00:00:00Z'),
    });
    const { calculateMetrics } = await import('@/lib/board-designer/metrics');
    const { designBuildSteps } = await import(
      '@/lib/board-designer/build-steps'
    );
    const { formatInches } = await import('@/lib/format');
    const steps = designBuildSteps(
      designConfig,
      calculateMetrics(designConfig),
    );
    const withQty = steps.find((s) => s.quantities.length > 0);
    expect(withQty).toBeTruthy();
    const q = withQty!.quantities[0]!;

    const { default: BuildPage } = await import(
      '@/app/designer/[id]/build/page'
    );
    const html = renderToStaticMarkup(
      await BuildPage({ params: Promise.resolve({ id: 'design-1' }) }),
    );

    expect(html).toContain(`${q.count}×`);
    expect(html).toContain(q.label);
    for (const dim of [q.lengthIn, q.widthIn, q.thicknessIn]) {
      if (dim !== undefined) {
        expect(html).toContain(formatInches(dim).replace(/"/g, '&quot;'));
      }
    }
  });

  it('404s when getDesign returns null', async () => {
    const { getDesign } = await import('@/lib/board-designs');
    vi.mocked(getDesign).mockResolvedValue(null);
    const { default: BuildPage } = await import(
      '@/app/designer/[id]/build/page'
    );

    await expect(
      BuildPage({ params: Promise.resolve({ id: 'foreign-design' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('does not register the route on the public allowlist', () => {
    const publicRoutes = source('src/lib/public-routes.ts');
    expect(publicRoutes).not.toMatch(/\/designer\/.*\/build/);
  });
});

describe('DesignerShell Build Plan control', () => {
  it('renders Build Plan linking to /designer/<id>/build when designId is set', async () => {
    const { DesignerShell } = await import(
      '@/components/designer/designer-shell'
    );
    const html = renderToStaticMarkup(
      <DesignerShell
        designId="design-saved"
        initialConfig={designConfig}
        saveAction={async () => {}}
        updateAction={async () => {}}
      />,
    );
    expect(html).toContain('Build Plan');
    expect(html).toContain('href="/designer/design-saved/build"');
  });

  it('omits Build Plan entirely when designId is null', async () => {
    const { DesignerShell } = await import(
      '@/components/designer/designer-shell'
    );
    const html = renderToStaticMarkup(
      <DesignerShell
        designId={null}
        initialConfig={designConfig}
        saveAction={async () => {}}
        updateAction={async () => {}}
      />,
    );
    expect(html).not.toContain('Build Plan');
    expect(html).not.toContain('/build');
  });

  it('keeps Build Plan as second child of the ml-auto group', () => {
    const shell = source('src/components/designer/designer-shell.tsx');
    expect(shell).toMatch(
      /ml-auto flex flex-wrap items-center gap-\[0\.5rem\]">\s*\{shoppingListControl\}\s*\{designId \? \(/,
    );
  });
});
