import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DesignThumbnail } from '@/components/designer/design-thumbnail';
import {
  MAX_THUMB_CELLS,
  thumbModelFromConfig,
  thumbModelFromStored,
} from '@/lib/board-designer/library-thumb';
import { getSpecies } from '@/lib/board-designer/species';
import { getTemplate } from '@/lib/board-designer/templates';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

describe('library thumbnails — from config, no stored image', () => {
  it('MAX_THUMB_CELLS is well under the editor 5_000 budget', () => {
    expect(MAX_THUMB_CELLS).toBe(500);
    expect(MAX_THUMB_CELLS).toBeLessThan(5_000);
  });

  it('classic-stripe yields expected cell count and species colours', () => {
    const t = getTemplate('classic-stripe');
    expect(t).toBeDefined();
    const model = thumbModelFromConfig(t!.config);
    expect(model.kind).toBe('ok');
    if (model.kind !== 'ok') return;

    expect(model.cells).toHaveLength(7);
    const maple = getSpecies('hard-maple')!.colorHex;
    const walnut = getSpecies('walnut')!.colorHex;
    expect(model.cells.map((c) => c.colorHex)).toEqual([
      maple,
      walnut,
      maple,
      walnut,
      maple,
      walnut,
      maple,
    ]);

    const html = renderToStaticMarkup(
      createElement(DesignThumbnail, {
        name: 'Stripe',
        configJson: t!.config,
      }),
    );
    expect(html).toContain('<svg');
    expect(html).toContain(maple);
    expect(html).toContain(walnut);
    expect(html.match(/<rect\b/g)?.length).toBe(7);
  });

  it('over-budget designs degrade to a placeholder — never a partial board', () => {
    // 20 strips × 26 rows = 520 cells > MAX_THUMB_CELLS (500).
    const strips = Array.from({ length: 20 }, (_, i) =>
      makeStrip(`s${i}`, i % 2 === 0 ? 'hard-maple' : 'walnut', 1),
    );
    const config = makeV2Config({
      grain: 'end',
      rowCount: 26,
      panels: [makePanel('panel-1', 'Panel 1', 1.5, strips)],
      rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
    });

    const model = thumbModelFromConfig(config);
    expect(model).toEqual({ kind: 'placeholder', reason: 'too-complex' });

    const html = renderToStaticMarkup(
      createElement(DesignThumbnail, { name: 'Dense', configJson: config }),
    );
    expect(html).toContain('Too many pieces to preview');
    expect(html).not.toContain('<svg');
    expect(html).not.toMatch(/<rect\b/);
  });

  it('unparseable stored config → placeholder; empty strips → empty placeholder', () => {
    expect(thumbModelFromStored({ not: 'a config' })).toEqual({
      kind: 'placeholder',
      reason: 'invalid',
    });
    expect(thumbModelFromStored(null)).toEqual({
      kind: 'placeholder',
      reason: 'invalid',
    });

    const emptyStrips = makeV2Config({
      grain: 'edge',
      panels: [makePanel('panel-1', 'Panel 1', 1.5, [])],
      rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
      rowCount: 1,
    });
    // Bypass parse (schema requires ≥1 strip); layout yields zero cells.
    expect(thumbModelFromConfig(emptyStrips)).toEqual({
      kind: 'placeholder',
      reason: 'empty',
    });

    const badHtml = renderToStaticMarkup(
      createElement(DesignThumbnail, {
        name: 'Broken',
        configJson: { schemaVersion: 99 },
      }),
    );
    expect(badHtml).toContain('Could not read this board');
    expect(badHtml).not.toContain('<svg');
  });

  it('library page keeps every row even when a config is junk', () => {
    // Page maps designs → DesignThumbnail(configJson); thumbnail never throws.
    expect(() =>
      renderToStaticMarkup(
        createElement(DesignThumbnail, {
          name: 'Junk',
          configJson: 'not-json-object',
        }),
      ),
    ).not.toThrow();

    const page = readFileSync('src/app/designer/library/page.tsx', 'utf8');
    expect(page).toContain('DesignThumbnail');
    expect(page).toContain('design.config');
    expect(page).toContain('Delete');

    const lib = readFileSync('src/lib/board-designs.ts', 'utf8');
    expect(lib).toMatch(/listDesigns[\s\S]*config:\s*true/);
  });

  it('thumbnail markup has no currency string and no decimal-inch labels', () => {
    const t = getTemplate('classic-stripe')!;
    const html = renderToStaticMarkup(
      createElement(DesignThumbnail, { name: 'Stripe', configJson: t.config }),
    );
    expect(html).not.toMatch(/\$/);
    // No human-facing inch labels — geometry stays in SVG attrs, not "0.8125″" text.
    expect(html).not.toMatch(/>\s*\d+\.\d+\s*(?:″|&Prime;|in)\b/i);
    expect(html).not.toMatch(/formatCents|formatCostRange/);

    const thumbSrc = readFileSync('src/components/designer/design-thumbnail.tsx', 'utf8');
    expect(thumbSrc).not.toContain('formatCents');
    expect(thumbSrc).not.toContain('@vercel/blob');
    expect(thumbSrc).not.toMatch(/from ['"]@\/lib\/storage['"]/);
  });
});
