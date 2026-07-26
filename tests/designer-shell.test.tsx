import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DesignerShell } from '@/components/designer/designer-shell';
import {
  DESIGNER_EDIT_NARROW_NOTICE,
  DESIGNER_NEW_NARROW_NOTICE,
  PRINT_SHEET_HINT,
} from '@/components/designer/designer-narrow';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const goldenStrips = Array.from({ length: 12 }, (_, i) =>
  makeStrip(`golden-${i + 1}`, i % 2 === 0 ? 'walnut' : 'hard-maple'),
);

const goldenConfig: BoardDesignConfig = makeV2Config({
  name: 'Golden checkerboard',
  sourceLengthIn: 20,
  sliceThicknessIn: 1.5,
  panels: [makePanel('panel-1', 'Panel 1', 1.5, goldenStrips)],
  rowPattern: [
    { panelId: 'panel-1', transform: 'none' },
    { panelId: 'panel-1', transform: 'rot180' },
  ],
  rowCount: 12,
});

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
    const html = render(
      makeV2Config({
        ...goldenConfig,
        panels: [makePanel('panel-1', 'Panel 1', 1.5, [])],
      }),
    );
    const visible = visibleMarkup(html);

    expect(visible).toContain('Add a strip');
    expect(visible).toContain('Add a strip to see your board.');
    expect(visible).not.toMatch(/\bNaN\b|undefined|\$/);
  });

  it('hides slice/leftover rows for edge grain while metrics still return zeros', () => {
    const html = render(
      makeV2Config({
        name: 'Edge stripe',
        grain: 'edge',
        sourceLengthIn: 18,
        sliceThicknessIn: 0.75,
        panels: [
          makePanel(
            'panel-1',
            'Panel 1',
            0.75,
            Array.from({ length: 7 }, (_, i) =>
              makeStrip(`edge-${i + 1}`, i % 2 === 0 ? 'hard-maple' : 'walnut'),
            ),
          ),
        ],
        rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
        rowCount: 1,
      }),
    );
    expect(html).not.toContain('Slices');
    expect(html).not.toContain('Leftover length');
  });

  it('selected strip detail uses a native species select with compact label rows', () => {
    const stripList = source('src/components/designer/strip-list.tsx');
    expect(stripList).toContain('<select');
    expect(stripList).not.toContain('role="radiogroup"');
    expect(stripList).not.toContain('role="radio"');
    expect(stripList).not.toContain('aria-checked');
    expect(stripList).not.toMatch(/ArrowLeft|ArrowRight/);

    const html = render(goldenConfig);
    const speciesSelects = [
      ...html.matchAll(
        /<select[^>]*name="strip-[^"]*-speciesId"[^>]*>([\s\S]*?)<\/select>/g,
      ),
    ];
    expect(speciesSelects).toHaveLength(1);
    for (const match of speciesSelects) {
      const body = match[1] ?? '';
      expect((body.match(/<option/g) ?? []).length).toBe(15);
    }
    expect([...html.matchAll(/id="strip-[^"]*-label"/g)]).toHaveLength(12);
    expect(html).toContain('Selected strip details for Strip 1');
    // First golden strip is walnut — its option must be selected.
    expect(speciesSelects[0]![1]).toMatch(
      /<option[^>]*value="walnut"[^>]*selected|<option[^>]*selected[^>]*value="walnut"/,
    );
  });

  it('unknown speciesId survives as a disabled selected option with the fallback footnote', () => {
    const html = render(
      makeV2Config({
        panels: [
          makePanel('panel-1', 'Panel 1', 1.5, [
            makeStrip('u1', 'not-a-wood'),
          ]),
        ],
      }),
    );
    const match = html.match(
      /<select[^>]*name="strip-u1-speciesId"[^>]*>([\s\S]*?)<\/select>/,
    );
    expect(match).not.toBeNull();
    const body = match![1]!;
    expect((body.match(/<option/g) ?? []).length).toBe(16);
    expect(body).toMatch(/<option[^>]*value="not-a-wood"[^>]*disabled/);
    expect(html).toContain('Unknown wood uses the fallback swatch.');
    expect(html).not.toMatch(/\bNaN\b|undefined/);
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

  it('Sprint 53 chrome: sticky full-width preview, one-line Export, diagram move labels', () => {
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
    // Sprint 67: preview column capped ~1200px; surplus width → right rail.
    expect(shell).toMatch(
      /lg:grid-cols-\[minmax\(0,1200px\)_minmax\(20rem,1fr\)\]/,
    );

    // A sticky element only travels inside its own containing block. `items-start`
    // shrink-wrapped the preview column to 732px against a 6749px page, so the
    // preview left the viewport after 130px of scroll while `lg:sticky` was still
    // in the markup and this suite was still green. Measured on prod 2026-07-25.
    // jsdom has no sticky layout, so the column stretch is guarded at source level.
    expect(shell).not.toContain('lg:items-start');
    expect(shell).toContain('lg:content-start');

    // Preview heading + Export PNG share one flex row (heading left, controls right).
    expect(preview).toMatch(
      /flex flex-wrap items-center justify-between[\s\S]*Preview[\s\S]*Export PNG/,
    );
    expect(shell).not.toMatch(/<h2[^>]*>Preview<\/h2>/);

    expect(stripList).toContain('Toward top');
    expect(stripList).toContain('Toward bottom');
    expect(stripList).toContain('Toward left');
    expect(stripList).toContain('Toward right');
    expect(stripList).not.toMatch(/>\s*Up\s*</);
    expect(stripList).not.toMatch(/>\s*Down\s*</);

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

  it('Sprint 55: Undo/Redo controls, no template confirm, history wiring uses DESIGNER_WIDE_MQ', () => {
    const shell = source('src/components/designer/designer-shell.tsx');
    const picker = source('src/components/designer/template-picker.tsx');
    const html = visibleMarkup(render(goldenConfig));

    expect(html).toContain('>Undo</button>');
    expect(html).toContain('>Redo</button>');
    expect(html).toContain('name="config"');
    expect(picker).not.toContain('window.confirm');
    expect(picker).not.toContain('Replace your current draft');
    expect(shell).toContain('DESIGNER_WIDE_MQ');

    // BUNDLE GUARD. r3f-canvas.tsx imports three.js at module scope and is meant
    // to be reached ONLY through dynamic(..., {ssr:false}). Sprint 55 imported the
    // gate constant from it into this statically-imported shell, which pulled the
    // whole 3D stack into the initial bundle: /designer First Load JS 114 kB ->
    // 358 kB, and three.js started downloading on phones — defeating the Sprint 54
    // gate the import existed to implement. Measured 2026-07-26. A bundle boundary
    // cannot be observed from vitest, so it is guarded at the import site.
    expect(shell).not.toMatch(/from '\.\/r3f-canvas'/);
    expect(shell).toContain("from '@/lib/board-designer/viewport'");
    expect(shell).toContain("type: 'undo'");
    expect(shell).toContain("type: 'redo'");
    expect(shell).toContain('historyReducer');
  });

  it('Sprint 54: desktop gate keeps authoring mounted, exact notices, no toParts, no WebGL below lg', () => {
    const shell = source('src/components/designer/designer-shell.tsx');
    const narrow = source('src/components/designer/designer-narrow.tsx');
    const canvas = source('src/components/designer/r3f-canvas.tsx');

    // Authoring tree stays in the React tree (CSS-hidden below lg) so resize
    // does not destroy an unsaved draft. Narrow surface is the lg:hidden sibling.
    expect(shell).toContain('hidden lg:grid');
    expect(shell).toContain('lg:hidden');
    expect(shell).toContain('DesignerNarrowSurface');
    // Sticky column stretch guard from Sprint 53 Attempt 2 — do not reintroduce.
    expect(shell).not.toContain('lg:items-start');
    expect(shell).toContain('lg:content-start');

    expect(DESIGNER_NEW_NARROW_NOTICE).toBe(
      'Designing a board needs a wider screen. Your saved boards are available here.',
    );
    expect(DESIGNER_EDIT_NARROW_NOTICE).toBe(
      'Editing needs a wider screen. You can still view this board and its print sheet.',
    );
    expect(PRINT_SHEET_HINT).toBe(
      'Includes the cut list, dimensions and diagram.',
    );

    const newHtml = visibleMarkup(render(goldenConfig, null));
    expect(newHtml).toContain(DESIGNER_NEW_NARROW_NOTICE);
    expect(newHtml).toContain('Your boards');
    expect(newHtml).toContain('href="/designer/library"');
    expect(newHtml).not.toContain(DESIGNER_EDIT_NARROW_NOTICE);

    const savedHtml = visibleMarkup(render(goldenConfig, 'design-1'));
    expect(savedHtml).toContain(DESIGNER_EDIT_NARROW_NOTICE);
    expect(savedHtml).toContain('Print sheet');
    expect(savedHtml).toContain(PRINT_SHEET_HINT);
    expect(savedHtml).toContain('href="/designer/design-1/print"');
    expect(savedHtml).not.toContain(DESIGNER_NEW_NARROW_NOTICE);

    // U6 — cut plan is desktop-only (OptimizerPanel in DesignerDock, lg authoring tree).
    // Narrow surface still must not import toParts / the optimizer.
    expect(narrow).not.toMatch(/\btoParts\s*\(/);
    expect(narrow).not.toMatch(/OptimizerPanel|designCutPlan|optimize\s*\(/);
    expect(shell).toContain('DesignerDock');
    expect(source('src/components/designer/designer-dock.tsx')).toContain(
      'OptimizerPanel',
    );
    expect(shell).toContain('hidden lg:grid');
    expect(narrow).not.toMatch(/userAgent|userAgentData|navigator\.platform/);

    // WebGL gate: matchMedia on Tailwind lg; Canvas only when wide enough.
    // Behaviour (canvas null below lg) is browser-only; guard the wiring here.
    // The MQ literal itself lives in @/lib/board-designer/viewport — three.js must
    // not be reachable from a statically-imported module (see the bundle guard in
    // the Sprint 55 case), so the constant cannot live in this file.
    expect(source('src/lib/board-designer/viewport.ts')).toContain("'(min-width: 64rem)'");
    expect(canvas).toContain("from '@/lib/board-designer/viewport'");
    expect(canvas).toContain('matchMedia');
    expect(canvas).toMatch(/if\s*\(\s*!wideEnough\s*\)\s*\{\s*return null/);
    expect(canvas).not.toMatch(/userAgent|userAgentData/);
  });

  it('Sprint 71: preview exposes 3D/2D toggle and view-only rotate copy', () => {
    const preview = source('src/components/designer/board-preview.tsx');
    expect(preview).toContain("useState<PreviewMode>('3d')");
    expect(preview).toContain('Rotate left');
    expect(preview).toContain('Rotate right');
    expect(preview).toContain('svgElementToPngBlob');
    expect(preview).toContain('Rotation is view-only');
    expect(preview).not.toMatch(/onClick=\{\(\) => setMode\('2d'\)\}[\s\S]*default/);
  });

  it('Sprint 72: Save a copy sibling form when designId; disabled otherwise', () => {
    const shell = source('src/components/designer/designer-shell.tsx');
    expect(shell).toContain('Save a copy');
    expect(shell).toContain('copyAction');
    expect(source('src/app/actions/board-designs.ts')).toContain(
      'copyBoardDesignAction',
    );
    expect(source('src/app/designer/[id]/page.tsx')).toContain('copyBoardDesignAction');

    const saved = visibleMarkup(render(goldenConfig, 'design-1'));
    expect(saved).toMatch(/Save a copy<\/button>/);
    const draft = visibleMarkup(render(goldenConfig, null));
    expect(draft).toContain('disabled');
    expect(draft).toContain('Save a copy');
  });

  it('Sprint 67: top bar + sticky preview/dock relocate; panels stay mounted', () => {
    const shell = source('src/components/designer/designer-shell.tsx');
    const dock = source('src/components/designer/designer-dock.tsx');
    const settings = source('src/components/designer/board-settings.tsx');
    const panelEditor = source('src/components/designer/panel-editor.tsx');
    const html = visibleMarkup(render(goldenConfig));

    expect(shell).toContain('BoardSettingsDisclosure');
    expect(shell).toContain('BoardGrainToggle');
    expect(shell).toContain('DesignerDock');
    expect(shell).toContain('Add to shopping list');
    expect(shell).toContain('form={SAVE_FORM_ID}');
    expect(shell).toMatch(/max-h-\[min\(55vh,32rem\)\]/);
    expect(shell).toContain('min-h-[12rem]');
    expect(settings).toContain('Waste allowance (%)');
    expect(settings).toContain('Kerf (in)');
    expect(settings).toContain('Panel length (in)');
    expect(settings).toContain('Slice thickness (in)');
    expect(panelEditor).not.toContain('RowPatternEditor');
    expect(dock).toContain('hidden={tab !==');
    expect(dock).toContain('OptimizerPanel');
    expect(dock).toContain('RowPatternEditor');
    expect(dock).toContain('MetricsPanel');
    expect(dock).toContain('TemplatePicker');

    // All dock bodies present in SSR tree (mounted); Pattern tabpanel exists for end grain.
    expect(html).toContain('id="designer-dock-panel-templates"');
    expect(html).toContain('id="designer-dock-panel-pattern"');
    expect(html).toContain('id="designer-dock-panel-metrics"');
    expect(html).toContain('id="designer-dock-panel-cut-plan"');
    expect(html).toContain('Row pattern');
    expect(html).toContain('Cut plan — what to buy');
    expect(html).toContain('Board settings');
    expect(html).toContain('>Edge</button>');
    expect(html).toContain('>End</button>');
  });

  it('Sprint 70: board settings explain kerf and waste allowance in-page', () => {
    const settings = source('src/components/designer/board-settings.tsx');
    const html = visibleMarkup(render(goldenConfig));

    expect(settings).toContain('material removed by the saw cut');
    expect(settings).toContain('mistakes/defects');
    expect(html).toContain('Blade kerf is material removed by the saw cut');
    expect(html).toContain('Extra % of board feet added for mistakes/defects');
    expect(html).toContain('Waste allowance (%)');
    expect(html).not.toContain('Waste allowance</span><input');
  });
});

describe('dockTabForGrain', () => {
  it('switches Pattern → Templates when grain becomes edge', async () => {
    const { dockTabForGrain, defaultDockTab } = await import(
      '@/components/designer/designer-dock'
    );
    expect(defaultDockTab('end')).toBe('pattern');
    expect(defaultDockTab('edge')).toBe('templates');
    expect(dockTabForGrain('edge', 'pattern')).toBe('templates');
    expect(dockTabForGrain('edge', 'metrics')).toBe('metrics');
    expect(dockTabForGrain('end', 'pattern')).toBe('pattern');
  });
});
