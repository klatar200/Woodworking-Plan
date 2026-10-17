import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { cutPlanGroupsForConfig } from '@/components/designer/optimizer-panel';
import { DesignThumbnail } from '@/components/designer/design-thumbnail';
import { layoutTopFace } from '@/lib/board-designer/layout';
import {
  MAX_THUMB_CELLS,
  THUMB_GRID,
  thumbModelFromConfig,
} from '@/lib/board-designer/library-thumb';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import {
  miterLatticeCloses,
  speciesComponents,
  wedgeWebContinuous,
} from '@/lib/board-designer/miter-geometry';
import {
  BENCHTOP_PLANER_WIDTH_IN,
  PLANER_WIDTH_WARNING,
} from '@/lib/board-designer/panel-geometry';
import { getSpecies } from '@/lib/board-designer/species';
import { TEMPLATES, getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig, Strip } from '@/lib/board-designer/types';
import { totalBoards } from '@/lib/cut-optimizer';
import { formatBoardFeet } from '@/lib/format';
import { buildSchemaMaxConfig, makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

vi.mock('@/lib/board-designs', () => ({ listDesigns: vi.fn(async () => []) }));
vi.mock('@/app/actions/board-designs', () => ({ deleteBoardDesignAction: vi.fn() }));

/** Sprint 82 — designer polish from the audit's P2 list. */

const warnings = (config: BoardDesignConfig) => calculateMetrics(config).warnings;
const strips = (n: number, width: number, species = 'walnut'): Strip[] =>
  Array.from({ length: n }, (_, i) => makeStrip(`s${i}`, species, width));

describe('planer warning', () => {
  it('names a 13″ benchtop planer', () => {
    expect(BENCHTOP_PLANER_WIDTH_IN).toBe(13);
    expect(PLANER_WIDTH_WARNING).toBe('Wider than a 13" benchtop planer — plan to hand-flatten.');
  });

  it('fires on no template', () => {
    for (const t of TEMPLATES) {
      const hits = warnings(t.config).filter((w) => w === PLANER_WIDTH_WARNING).length;
      expect(hits, t.id).toBe(0);
    }
  });

  it('end grain checks the panel width, not the stack of rows', () => {
    const narrowPanelTallBoard = makeV2Config({
      panels: [makePanel('p1', 'P1', 1.5, strips(8, 1.5))], // 12″ panel
      rowCount: 20, // 30″ of rows
    });
    expect(calculateMetrics(narrowPanelTallBoard).finishedWidthIn).toBe(30);
    expect(warnings(narrowPanelTallBoard)).not.toContain(PLANER_WIDTH_WARNING);

    const widePanel = makeV2Config({
      panels: [makePanel('p1', 'P1', 1.5, strips(7, 2))], // 14″ panel
      rowCount: 20,
    });
    expect(warnings(widePanel)).toContain(PLANER_WIDTH_WARNING);
  });

  it('edge grain warns past 13″ and not at 13″', () => {
    const edge = (width: number) =>
      makeV2Config({
        grain: 'edge',
        sourceLengthIn: 18,
        panels: [makePanel('p1', 'P1', 0.75, strips(1, width))],
      });
    expect(warnings(edge(14))).toContain(PLANER_WIDTH_WARNING);
    expect(warnings(edge(13))).not.toContain(PLANER_WIDTH_WARNING);
  });

  it('ignores a wide panel no row uses', () => {
    const config = makeV2Config({
      panels: [
        makePanel('used', 'Used', 1.5, strips(4, 1.5)),
        makePanel('spare', 'Spare', 1.5, strips(7, 2)), // 14″, unused
      ],
      rowPattern: [{ panelId: 'used', transform: 'none' }],
    });
    expect(warnings(config)).not.toContain(PLANER_WIDTH_WARNING);
  });
});

describe('thumbnails', () => {
  const spansBoard = (model: Extract<ReturnType<typeof thumbModelFromConfig>, { kind: 'ok' }>) => {
    const minX = Math.min(...model.cells.map((c) => c.xIn));
    const minY = Math.min(...model.cells.map((c) => c.yIn));
    const maxX = Math.max(...model.cells.map((c) => c.xIn + c.wIn));
    const maxY = Math.max(...model.cells.map((c) => c.yIn + c.hIn));
    expect(minX).toBe(0);
    expect(minY).toBe(0);
    expect(maxX).toBeCloseTo(model.widthIn, 9);
    expect(maxY).toBeCloseTo(model.heightIn, 9);
  };

  it('draws the design exactly at or under the cap', () => {
    const config = getTemplate('checkerboard')!.config;
    const model = thumbModelFromConfig(config);
    expect(model.kind).toBe('ok');
    if (model.kind !== 'ok') return;
    expect(model.approximate).toBe(false);
    expect(model.cells).toEqual(layoutTopFace(config, calculateMetrics(config)));
    expect(model.cells.length).toBeLessThanOrEqual(MAX_THUMB_CELLS);
  });

  const dense = makeV2Config({
    grain: 'end',
    rowCount: 26,
    panels: [
      makePanel(
        'panel-1',
        'Panel 1',
        1.5,
        Array.from({ length: 20 }, (_, i) =>
          makeStrip(`s${i}`, i % 2 === 0 ? 'hard-maple' : 'walnut', 1),
        ),
      ),
    ],
    rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
  });

  it('downsamples an over-cap board to the whole board', () => {
    const model = thumbModelFromConfig(dense);
    expect(model.kind).toBe('ok');
    if (model.kind !== 'ok') return;
    expect(model.approximate).toBe(true);
    expect(model.cells.length).toBeLessThanOrEqual(THUMB_GRID * THUMB_GRID);
    spansBoard(model);
  });

  it('handles the schema-max board', () => {
    const model = thumbModelFromConfig(buildSchemaMaxConfig());
    expect(model.kind).toBe('ok');
    if (model.kind !== 'ok') return;
    expect(model.approximate).toBe(true);
    expect(model.cells.length).toBeLessThanOrEqual(1024);
    spansBoard(model);
  });

  it('a single-species board downsamples to its own colour, one rect per grid row', () => {
    const allWalnut = makeV2Config({
      panels: [makePanel('p1', 'P1', 1.5, strips(30, 1.5))],
      rowCount: 20,
    });
    expect(layoutTopFace(allWalnut, calculateMetrics(allWalnut)).length).toBe(600);
    const model = thumbModelFromConfig(allWalnut);
    if (model.kind !== 'ok') throw new Error('expected ok');
    const walnut = getSpecies('walnut')!.colorHex;
    expect(model.cells.every((c) => c.colorHex === walnut)).toBe(true);
    const gridRows = new Set(model.cells.map((c) => c.yIn)).size;
    expect(model.cells).toHaveLength(gridRows);
  });

  it('renders the downsample as an unoutlined SVG', () => {
    const html = renderToStaticMarkup(
      createElement(DesignThumbnail, { name: 'Dense', configJson: dense }),
    );
    expect(html).toContain('<svg');
    expect(html).not.toContain('Too many pieces to preview');
    const rects = html.match(/<rect\b[^>]*>/g) ?? [];
    expect(rects.length).toBeGreaterThan(0);
    for (const rect of rects) {
      expect(rect).not.toMatch(/\sstroke=/);
      expect(rect).not.toMatch(/\sstroke-width=/);
    }
  });
});

describe('library page title', () => {
  it('is "Saved Boards"', async () => {
    const { metadata } = await import('@/app/designer/library/page');
    expect(metadata.title).toBe('Saved Boards');
  });
});

describe('Harlequin is a cutting board', () => {
  const harlequin = () => getTemplate('harlequin')!.config;

  it('finishes 12¼″ × 14″ × 1½″ with no warnings', () => {
    const m = calculateMetrics(harlequin());
    expect([m.finishedLengthIn, m.finishedWidthIn, m.finishedThicknessIn]).toEqual([12.25, 14, 1.5]);
    expect(m.warnings).toEqual([]);
  });

  it('keeps its construction: 14 alternating strips, 1″ panel, [none, mirrorY], 14 rows', () => {
    const c = harlequin();
    const panel = c.panels[0]!;
    expect(panel.strips).toHaveLength(14);
    expect(panel.strips.map((s) => s.miter?.corner)).toEqual(
      Array.from({ length: 14 }, (_, i) => (i % 2 === 0 ? 'tr' : 'tl')),
    );
    expect(panel.thicknessIn).toBe(1);
    expect(c.rowPattern.map((s) => s.transform)).toEqual(['none', 'mirrorY']);
    expect(c.rowCount).toBe(14);
  });

  it('still closes, with the same rhombus count at two resolutions', () => {
    const c = harlequin();
    const cells = layoutTopFace(c, calculateMetrics(c));
    expect(wedgeWebContinuous(cells)).toBe(true);
    expect(miterLatticeCloses(cells, c.panels)).toBe(true);
    expect(speciesComponents(cells, 40).get('walnut')!.count).toBe(56);
    expect(speciesComponents(cells, 48).get('walnut')!.count).toBe(56);
  });

  it('buys 2.84 bd ft and 4 boards', () => {
    expect(formatBoardFeet(calculateMetrics(harlequin()).totalBoardFeet)).toBe('2.84');
    expect(totalBoards(cutPlanGroupsForConfig(harlequin()))).toBe(4);
  });
});

describe('copy gate', () => {
  it('new user-facing strings carry no decimals, dollars, or technique advice', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/designer/board-preview.tsx'), 'utf8');
    const fallback = [...source.matchAll(/const PREVIEW_[A-Z_]+ =\s*\n?\s*['"](.+?)['"];/g)].map((m) => m[1]!);
    expect(fallback).toHaveLength(3);
    for (const text of [PLANER_WIDTH_WARNING, ...fallback]) {
      expect(text).not.toMatch(/\d+\.\d+/);
      expect(text).not.toContain('$');
      expect(text).not.toMatch(/drum sander|router sled|tear-out|blowout/i);
    }
  });
});
