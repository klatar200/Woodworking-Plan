import { describe, expect, it } from 'vitest';
import {
  designBuildSteps,
  formatBuildQuantity,
  type BuildStep,
} from '@/lib/board-designer/build-steps';
import { designCutPieces } from '@/lib/board-designer/cut-pieces';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { MITER_COMPOSITE_METHOD } from '@/lib/board-designer/miter-labels';
import { getSpecies } from '@/lib/board-designer/species';
import { TEMPLATES, getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

/**
 * Sprint 80 — the guide says the numbers a builder cuts to. Exact strings, because a check that
 * passes on structure while the sentence is wrong is the Sprint 78 failure.
 */

const template = (id: string): BoardDesignConfig => getTemplate(id)!.config;
const stepsOf = (config: BoardDesignConfig): BuildStep[] =>
  designBuildSteps(config, calculateMetrics(config));
const detail = (config: BoardDesignConfig, id: string): string =>
  stepsOf(config).find((s) => s.id === id)!.detail;

describe('Checkerboard — verbatim', () => {
  const checker = template('checkerboard');

  it('crosscuts strips to the panel cut length', () => {
    expect(detail(checker, 'crosscut-strips')).toBe('Crosscut strips to 14 1/4".');
  });

  it('follows the row count — 20 rows need 35 7/8"', () => {
    expect(detail({ ...checker, rowCount: 20 }, 'crosscut-strips')).toBe(
      'Crosscut strips to 35 7/8".',
    );
  });

  it('cuts slices over finished thickness and flattens back to it', () => {
    expect(detail(checker, 'crosscut-slices')).toBe(
      'Crosscut the panel into 8 slices at 1 11/16" thick.',
    );
    expect(detail(checker, 'flatten-board')).toBe(
      'Flatten the board to 1 1/2" thick, removing about 3/16".',
    );
    expect(detail(checker, 'flatten-panel')).toBe('Flatten the panel to 1 1/2" thick.');
    expect(detail(checker, 'trim-ends')).toBe('Square both ends.');
  });

  it('states the row order', () => {
    expect(detail(checker, 'arrange-rows')).toBe(
      'Turn slices end-up and lay them out by repeating this 2-step row pattern: row 1 As cut; row 2 Turned end-for-end.',
    );
  });

  it('rips over finished width, or to it when the buffer is zero', () => {
    expect(detail(checker, 'rip-strips')).toBe(
      'Rip each strip 3/16" over its finished width, then joint the glue edges down to finished width.',
    );
    expect(detail({ ...checker, planeBuffer: 0 }, 'rip-strips')).toBe(
      'Rip strips to finished width.',
    );
  });

  it('mill and crosscut quantities read as a builder needs them (CARRY-1)', () => {
    const steps = stepsOf(checker);
    const mill = steps.find((s) => s.id === 'mill-stock')!;
    const crosscut = steps.find((s) => s.id === 'crosscut-strips')!;
    expect(formatBuildQuantity(mill.quantities[0]!)).toBe(
      'Hard Maple stock · 1 1/2" thick — for 4 strips',
    );
    expect(formatBuildQuantity(crosscut.quantities[0]!)).toBe(
      '4× Hard Maple strips · 14 1/4" long × 1 11/16" wide',
    );
  });

  it('dry fit names species and finished width in order', () => {
    expect(
      detail(checker, 'dry-fit').startsWith(
        'Lay strips out in order: Strip 1 (Hard Maple 1 1/2"), Strip 2 (Walnut 1 1/2"),',
      ),
    ).toBe(true);
  });
});

describe('Plaid — multi-panel forms, verbatim', () => {
  const plaid = template('plaid');

  it('gives each panel its own strip length', () => {
    expect(detail(plaid, 'crosscut-strips')).toBe(
      `Crosscut each panel's strips to its own length: Wide A 5 1/4"; Wide B 5 1/4"; Line 10 11/16".`,
    );
  });

  it('gives each panel its own slice count', () => {
    expect(detail(plaid, 'crosscut-slices')).toBe(
      'Crosscut each panel into slices at 1 11/16" thick: Wide A 3; Wide B 3; Line 6.',
    );
  });

  it('names the panel in each row', () => {
    expect(detail(plaid, 'arrange-rows')).toContain('row 2 Line — As cut');
  });
});

describe('Harlequin — the wedge species is in the guide', () => {
  const harlequin = template('harlequin');

  it('mills, rips and crosscuts Walnut, and makes composite strips', () => {
    const steps = stepsOf(harlequin);
    for (const id of ['mill-stock', 'rip-strips', 'crosscut-strips']) {
      const quantities = steps.find((s) => s.id === id)!.quantities;
      expect(quantities.some((q) => q.label.includes('Walnut')), id).toBe(true);
    }
    const composite = steps.find((s) => s.id === 'make-composite-strips')!;
    expect(composite.detail.startsWith(MITER_COMPOSITE_METHOD)).toBe(true);
    expect(composite.quantities.map((q) => q.label)).toContain(
      'Strip 1: Hard Maple with Walnut wedge, Top right corner at 30°',
    );
  });
});

describe('step ids without a miter are exactly Sprint 78’s', () => {
  it('edge 8, end 12, no composite step', () => {
    expect(stepsOf(template('classic-stripe')).map((s) => s.id)).toEqual([
      'mill-stock',
      'rip-strips',
      'crosscut-strips',
      'dry-fit',
      'glue-up-panel',
      'flatten',
      'trim-ends',
      'sand-finish',
    ]);
    expect(stepsOf(template('checkerboard')).map((s) => s.id)).toEqual([
      'mill-stock',
      'rip-strips',
      'crosscut-strips',
      'dry-fit',
      'glue-up-panel',
      'flatten-panel',
      'crosscut-slices',
      'arrange-rows',
      'glue-up-board',
      'flatten-board',
      'trim-ends',
      'sand-finish',
    ]);
  });
});

describe('the guide and the cut pieces agree (all templates)', () => {
  it('every rip / crosscut dimension is a cut piece’s, and counts add up per species', () => {
    for (const t of TEMPLATES) {
      const metrics = calculateMetrics(t.config);
      const pieces = designCutPieces(t.config, metrics.panelPlan);
      const steps = designBuildSteps(t.config, metrics);
      const rip = steps.find((s) => s.id === 'rip-strips')!;
      const crosscut = steps.find((s) => s.id === 'crosscut-strips')!;
      const speciesOf = (label: string) =>
        pieces.find((p) => label.includes(getSpecies(p.speciesId)!.name))!.speciesId;

      for (const q of rip.quantities) {
        const species = speciesOf(q.label);
        expect(
          pieces.some((p) => p.speciesId === species && p.ripWidthIn === q.widthIn),
          `${t.id} rip ${q.label}`,
        ).toBe(true);
      }
      for (const q of crosscut.quantities) {
        const species = speciesOf(q.label);
        expect(
          pieces.some(
            (p) =>
              p.speciesId === species && p.ripWidthIn === q.widthIn && p.lengthIn === q.lengthIn,
          ),
          `${t.id} crosscut ${q.label}`,
        ).toBe(true);
      }

      const sum = (entries: { species: string; count: number }[]) => {
        const totals = new Map<string, number>();
        for (const e of entries) totals.set(e.species, (totals.get(e.species) ?? 0) + e.count);
        return Object.fromEntries([...totals].sort());
      };
      expect(
        sum(crosscut.quantities.map((q) => ({ species: speciesOf(q.label), count: q.count }))),
        t.id,
      ).toEqual(sum(pieces.map((p) => ({ species: p.speciesId, count: p.count }))));
    }
  });
});

describe('formatBuildQuantity', () => {
  it('writes the three shapes', () => {
    expect(formatBuildQuantity({ label: 'Hard Maple strips', count: 6, widthIn: 1.675 })).toBe(
      '6× Hard Maple strips · 1 11/16" wide',
    );
    expect(
      formatBuildQuantity({
        label: 'Walnut stock',
        count: 1,
        thicknessIn: 0.75,
        countNoun: 'strip',
      }),
    ).toBe('Walnut stock · 3/4" thick — for 1 strip');
    expect(formatBuildQuantity({ label: 'X', count: 3 })).toBe('3× X');
  });
});

describe('dry fit keeps explicit labels', () => {
  it('still names an explicit label and a repeat', () => {
    const config = makeV2Config({
      grain: 'edge',
      sourceLengthIn: 18,
      panels: [
        makePanel('panel-1', 'Panel 1', 0.75, [
          { ...makeStrip('e1', 'hard-maple', 1.5), label: 'Accent rail' },
          makeStrip('e2', 'walnut', 1.5, 2),
        ]),
      ],
      rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
      rowCount: 1,
    });
    const text = detail(config, 'dry-fit');
    expect(text).toContain('Accent rail');
    expect(text).toContain('Strip 2 ×2');
  });
});
