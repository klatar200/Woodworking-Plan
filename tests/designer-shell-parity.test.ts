import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DesignerShell } from '@/components/designer/designer-shell';
import {
  cutPlanHasImpossible,
  OptimizerPanel,
} from '@/components/designer/optimizer-panel';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

const root = process.cwd();
const src = (path: string) => readFileSync(join(root, path), 'utf8');

const actions = {
  saveAction: async () => {},
  updateAction: async () => {},
  addToShoppingListAction: async () => {},
};

const endConfig = makeV2Config({
  name: 'Parity board',
  grain: 'end',
  panels: [
    makePanel('panel-1', 'Panel 1', 1.5, [
      makeStrip('s1', 'hard-maple', 1.5, 2),
      makeStrip('s2', 'walnut', 1.5, 2),
    ]),
  ],
  rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
  rowCount: 4,
});

describe('Sprint 68 — designer shell PARITY_INVENTORY', () => {
  it('desktop tree keeps dock panels mounted (hidden) and inventory strings', () => {
    const html = renderToStaticMarkup(
      createElement(DesignerShell, {
        designId: 'design-1',
        initialConfig: endConfig,
        ...actions,
      }),
    );

    for (const id of [
      'designer-dock-panel-templates',
      'designer-dock-panel-pattern',
      'designer-dock-panel-metrics',
      'designer-dock-panel-cut-plan',
    ]) {
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain(`data-dock-panel=`);
    }

    // PARITY_INVENTORY — top / settings / dock / preview / right rail
    expect(html).toMatch(/Name|name=/);
    expect(html).toContain('Edge');
    expect(html).toContain('End');
    expect(html).toContain('Undo');
    expect(html).toContain('Redo');
    expect(html).toContain('Reset');
    expect(html).toContain('Save');
    expect(html).toContain('Add to shopping list');
    expect(html).toContain('Save a copy');
    expect(html).toContain('Board settings');
    expect(html).toContain('Kerf (in)');
    expect(html).toContain('Waste allowance (%)');
    expect(html).toContain('Slice thickness (in)');
    expect(html).toContain('Templates');
    expect(html).toContain('Row pattern');
    expect(html).toContain('Finished');
    expect(html).toContain('Total board feet');
    expect(html).toContain('By species');
    expect(html).toContain('Cut plan — what to buy');
    expect(html).toContain('Board length');
    expect(html).toContain('Board width');
    expect(html).toContain('Panels');
    expect(html).toContain('Add a strip');
    expect(html).toContain('Export PNG');
    expect(html).toContain('Preview');

    // Cut plan expanded in dock (Board settings ⋯ may still use <details>).
    const cutPanel = html.match(
      /data-dock-panel="cut-plan"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/,
    );
    expect(cutPanel?.[1] ?? '').toContain('Cut plan — what to buy');
    expect(cutPanel?.[1] ?? '').not.toContain('<details');
    expect(src('src/components/designer/optimizer-panel.tsx')).not.toContain(
      '<details',
    );
    expect(src('src/components/designer/optimizer-panel.tsx')).not.toContain(
      '<summary',
    );

    // Dock panels remain in DOM source when inactive (mounted/hidden)
    expect(src('src/components/designer/designer-dock.tsx')).toContain(
      'hidden={tab !==',
    );
    expect(src('src/components/designer/designer-dock.tsx')).toContain(
      '<OptimizerPanel config={config} />',
    );
  });

  it('edge grain hides Pattern tab control; panels stay in DOM', () => {
    const html = renderToStaticMarkup(
      createElement(DesignerShell, {
        designId: null,
        initialConfig: makeV2Config({
          ...endConfig,
          grain: 'edge',
          sourceLengthIn: 18,
        }),
        ...actions,
      }),
    );
    expect(html).toContain('id="designer-dock-panel-pattern"');
    expect(html).not.toContain('id="designer-dock-tab-pattern"');
    expect(html).toContain('Panel length (in)');
  });

  it('badges: Metrics when warnings; Cut plan when impossible', () => {
    const dock = src('src/components/designer/designer-dock.tsx');
    expect(dock).toContain('metrics.warnings.length');
    expect(dock).toContain('cutPlanHasImpossible');
    expect(dock).toContain('Needs attention');

    const warnConfig = makeV2Config({
      grain: 'end',
      panels: [makePanel('panel-1', 'Panel 1', 1.5, [])],
      rowPattern: [{ panelId: 'missing', transform: 'none' }],
      rowCount: 2,
    });
    const warnHtml = renderToStaticMarkup(
      createElement(DesignerShell, {
        designId: null,
        initialConfig: warnConfig,
        ...actions,
      }),
    );
    expect(warnHtml).toContain('Needs attention');

    const impossibleConfig = makeV2Config({
      grain: 'edge',
      sourceLengthIn: 100,
      panels: [
        makePanel('p1', 'P', 1.5, [makeStrip('s1', 'hard-maple', 1.5, 1)]),
      ],
    });
    expect(cutPlanHasImpossible(impossibleConfig)).toBe(true);
    const cutHtml = renderToStaticMarkup(
      createElement(OptimizerPanel, { config: impossibleConfig }),
    );
    expect(cutHtml).toMatch(/do not fit/);
  });
});
