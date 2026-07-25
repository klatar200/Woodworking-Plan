import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BoardDiagram } from '@/components/designer/board-diagram';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { getTemplate } from '@/lib/board-designer/templates';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

function templateConfig(id: string) {
  const template = getTemplate(id);
  if (!template) throw new Error(`Missing template ${id}`);
  return template.config;
}

describe('BoardDiagram', () => {
  it('renders 96 rects for the checkerboard template and 7 for classic-stripe', () => {
    const checkerboard = templateConfig('checkerboard');
    const stripe = templateConfig('classic-stripe');

    const checkerboardHtml = renderToStaticMarkup(
      <BoardDiagram config={checkerboard} metrics={calculateMetrics(checkerboard)} />,
    );
    const stripeHtml = renderToStaticMarkup(
      <BoardDiagram config={stripe} metrics={calculateMetrics(stripe)} />,
    );

    expect(checkerboardHtml.match(/<rect\b/g)?.length).toBe(96);
    expect(stripeHtml.match(/<rect\b/g)?.length).toBe(7);
  });

  it('offsets every other end-grain row when flipEveryOtherSlice is enabled', () => {
    const checkerboard = templateConfig('checkerboard');
    const html = renderToStaticMarkup(
      <BoardDiagram config={checkerboard} metrics={calculateMetrics(checkerboard)} />,
    );

    expect(html).toContain('viewBox="0 0 18 12"');
    expect(html).toMatch(
      /<rect[^>]*x="0"[^>]*y="0"[^>]*width="1\.5"[^>]*height="1\.5"[^>]*fill="#E7D3A9"/,
    );
    expect(html).toMatch(
      /<rect[^>]*x="0"[^>]*y="1\.5"[^>]*width="1\.5"[^>]*height="1\.5"[^>]*fill="#4A3524"/,
    );
  });

  it('keeps BoardPreview as the U4 seam that only renders BoardDiagram', () => {
    const preview = source('src/components/designer/board-preview.tsx');

    expect(preview).toContain('BoardDiagram');
    expect(preview).not.toContain('layoutTopFace');
    expect(preview).not.toContain('<svg');
  });
});
