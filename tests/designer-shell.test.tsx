import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DesignerShell } from '@/components/designer/designer-shell';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const goldenConfig: BoardDesignConfig = {
  schemaVersion: 1,
  name: 'Golden checkerboard',
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

const actions = {
  saveAction: async () => {},
  updateAction: async () => {},
};

function render(config: BoardDesignConfig, designId: string | null = null) {
  return renderToStaticMarkup(
    <DesignerShell designId={designId} initialConfig={config} {...actions} />,
  );
}

function visibleMarkup(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/g, '');
}

describe('DesignerShell static render', () => {
  it('renders the golden config with finished dimensions as tape fractions and no invalid UI values', () => {
    const html = render(goldenConfig);
    const visible = visibleMarkup(html);

    expect(visible).toContain('Board designer');
    expect(visible).toContain('Finished');
    expect(visible).toContain('18&quot; x 18&quot; x 1 1/2&quot;');
    expect(visible).not.toMatch(/\bNaN\b|undefined|\$/);
  });

  it('renders zero strips with an Add a strip CTA and the exact warning without crashing', () => {
    const html = render({ ...goldenConfig, strips: [] });
    const visible = visibleMarkup(html);

    expect(visible).toContain('Add a strip');
    expect(visible).toContain('Add a strip to see your board.');
    expect(visible).not.toMatch(/\bNaN\b|undefined|\$/);
  });

  it('renders zero-slice warning prominently while controls remain editable', () => {
    const html = render({
      ...goldenConfig,
      sourceLengthIn: 1,
      sliceThicknessIn: 4,
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('No slices fit — increase panel length or reduce slice thickness.');
    expect(html).toContain('name="sourceLengthIn"');
    expect(html).toContain('name="sliceThicknessIn"');
  });

  it('hides slice/leftover rows for edge grain while metrics still return zeros', () => {
    const html = render({
      ...goldenConfig,
      grain: 'edge',
      stockThicknessIn: 0.75,
      sliceThicknessIn: 0.75,
      strips: Array.from({ length: 7 }, (_, i) => ({
        id: `edge-${i + 1}`,
        speciesId: i % 2 === 0 ? 'hard-maple' : 'walnut',
        widthIn: 1.5,
        repeat: 1,
      })),
    });
    expect(html).not.toContain('Slices');
    expect(html).not.toContain('Leftover length');
  });

  it('species swatches use radiogroup semantics', () => {
    const stripList = source('src/components/designer/strip-list.tsx');
    expect(stripList).toContain('role="radiogroup"');
    expect(stripList).toContain('role="radio"');
    expect(stripList).toContain('aria-checked');
    expect(stripList).not.toContain('aria-pressed');
  });

  it('keeps preview behind BoardPreview and uses 44px controls with no arbitrary elevation', () => {
    const shell = source('src/components/designer/designer-shell.tsx');
    const files = [
      shell,
      source('src/components/designer/strip-list.tsx'),
      source('src/components/designer/board-settings.tsx'),
      source('src/components/designer/template-picker.tsx'),
      source('src/components/designer/metrics-panel.tsx'),
      source('src/components/designer/board-diagram.tsx'),
      source('src/components/designer/board-preview.tsx'),
    ].join('\n');

    expect(shell).toContain("from './board-preview'");
    expect(shell).not.toContain("from './board-diagram'");
    expect(files).toContain('min-h-[2.75rem]');
    expect(files).not.toContain('shadow-[');
  });

  it('Sprint 53 chrome: sticky full-width preview, one-line Export, diagram move labels, species nowrap', () => {
    const shell = source('src/components/designer/designer-shell.tsx');
    const preview = source('src/components/designer/board-preview.tsx');
    const stripList = source('src/components/designer/strip-list.tsx');
    const canvas = source('src/components/designer/r3f-canvas.tsx');
    const newPage = source('src/app/designer/page.tsx');
    const editPage = source('src/app/designer/[id]/page.tsx');
    const libraryPage = source('src/app/designer/library/page.tsx');

    expect(newPage).toContain('lg:max-w-none');
    expect(editPage).toContain('lg:max-w-none');
    expect(libraryPage).not.toContain('lg:max-w-none');

    expect(shell).toMatch(/lg:sticky/);
    expect(shell).toMatch(/lg:grid-cols-\[minmax\(0,1fr\)_minmax\(20rem,26rem\)\]/);

    // Preview heading + Export PNG share one flex row (heading left, button right).
    expect(preview).toMatch(
      /flex items-center justify-between[\s\S]*Preview[\s\S]*Export PNG/,
    );
    expect(shell).not.toMatch(/<h2[^>]*>Preview<\/h2>/);

    expect(stripList).toContain('Toward top');
    expect(stripList).toContain('Toward bottom');
    expect(stripList).toContain('Toward left');
    expect(stripList).toContain('Toward right');
    expect(stripList).not.toMatch(/>\s*Up\s*</);
    expect(stripList).not.toMatch(/>\s*Down\s*</);
    expect(stripList).toContain('whitespace-nowrap');
    expect(stripList).toContain('text-ellipsis');
    expect(stripList).toContain('grid-cols-2');
    expect(stripList).not.toContain('sm:grid-cols-4');

    expect(canvas).toContain('designer-canvas-host');
    expect(canvas).toMatch(/min-h-\[18rem\]/);
    expect(canvas).toMatch(/h-\[min\(60vh,32rem\)\]/);

    const endHtml = render(goldenConfig);
    expect(endHtml).toContain('Toward left');
    expect(endHtml).toContain('Toward right');
    const edgeHtml = render({ ...goldenConfig, grain: 'edge' });
    expect(edgeHtml).toContain('Toward top');
    expect(edgeHtml).toContain('Toward bottom');
  });
});
