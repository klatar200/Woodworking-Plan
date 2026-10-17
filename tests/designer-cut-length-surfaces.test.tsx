import { describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MetricsPanel } from '@/components/designer/metrics-panel';
import {
  designBuildSteps,
  formatBuildQuantity,
} from '@/lib/board-designer/build-steps';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { MITER_COMPOSITE_METHOD } from '@/lib/board-designer/miter-labels';
import { TEMPLATES, getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

/**
 * Sprint 80 — every surface renders the same cut numbers through the same formatter, and the
 * rendered text stays inside the copy rules (tape fractions, no dollars, no safety coaching).
 */

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
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

const asHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Visible text: tags become spaces (so `Line 6.` and `9.` never join), entities decoded. */
const visibleText = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

async function render(page: 'build' | 'print', config: BoardDesignConfig): Promise<string> {
  const { getDesign } = await import('@/lib/board-designs');
  vi.mocked(getDesign).mockResolvedValue({
    id: 'design-1',
    name: config.name,
    config,
    createdAt: new Date('2026-10-16T00:00:00Z'),
    updatedAt: new Date('2026-10-16T00:00:00Z'),
  });
  const mod =
    page === 'build'
      ? await import('@/app/designer/[id]/build/page')
      : await import('@/app/designer/[id]/print/page');
  return renderToStaticMarkup(await mod.default({ params: Promise.resolve({ id: 'design-1' }) }));
}

describe('cut length is labelled and valued the same everywhere', () => {
  it('metrics panel and print sheet show Cut length 14 1/4" for Checkerboard', async () => {
    const checker = getTemplate('checkerboard')!.config;
    const metrics = calculateMetrics(checker);
    const panel = renderToStaticMarkup(
      createElement(MetricsPanel, { config: checker, metrics, grain: checker.grain }),
    );
    const print = await render('print', checker);
    for (const html of [panel, print]) {
      expect(html).toContain('Cut length');
      expect(html).toContain('14 1/4&quot;');
      expect(html).not.toContain('Required length');
    }
  });
});

describe('print sheet build steps use the shared formatter', () => {
  it('renders every quantity as formatBuildQuantity(q)', async () => {
    for (const id of ['checkerboard', 'plaid', 'harlequin']) {
      const config = getTemplate(id)!.config;
      const html = await render('print', config);
      for (const step of designBuildSteps(config, calculateMetrics(config))) {
        for (const q of step.quantities) {
          expect(html, `${id}: ${q.label}`).toContain(asHtml(formatBuildQuantity(q)));
        }
      }
    }
  });
});

describe('miter note shares the composite method text', () => {
  it('Harlequin print note begins with MITER_COMPOSITE_METHOD and keeps the mates caveat', async () => {
    const html = await render('print', getTemplate('harlequin')!.config);
    const note = html.match(/<p class="muted small print-miter-note">([\s\S]*?)<\/p>/)?.[1] ?? '';
    expect(note.startsWith(asHtml(MITER_COMPOSITE_METHOD))).toBe(true);
    expect(html).toContain('two composite strips');
    expect(html).toMatch(/discarding the mates means buying roughly twice/i);
  });
});

describe('copy gates on rendered text (all templates)', () => {
  it('no decimal inches or angles, no dollars, no safety coaching', async () => {
    for (const t of TEMPLATES) {
      const build = visibleText(await render('build', t.config));
      const print = visibleText(await render('print', t.config));
      expect(build, `${t.id} build`).not.toMatch(/\d+\.\d+/);
      expect(print, `${t.id} print`).not.toMatch(/\d+\.\d+\s*["″°]/);
      for (const text of [build, print]) {
        expect(text, t.id).not.toContain('$');
        expect(text, t.id).not.toMatch(/\bPPE\b|safety glasses|ear protection/i);
      }
    }
  });
});
