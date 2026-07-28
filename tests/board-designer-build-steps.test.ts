import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  designBuildSteps,
  type BuildStep,
} from '@/lib/board-designer/build-steps';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { formatInches } from '@/lib/format';
import { planeBufferIn } from '@/lib/board-designer/lumber-allowance';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

const EDGE_IDS = [
  'mill-stock',
  'rip-strips',
  'crosscut-strips',
  'dry-fit',
  'glue-up-panel',
  'flatten',
  'trim-ends',
  'sand-finish',
] as const;

const END_IDS = [
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
] as const;

function edgeConfig(): BoardDesignConfig {
  return makeV2Config({
    name: 'Edge stripe',
    grain: 'edge',
    sourceLengthIn: 18,
    panels: [
      makePanel('panel-1', 'Panel 1', 0.75, [
        makeStrip('e1', 'hard-maple', 1.5),
        makeStrip('e2', 'walnut', 1.5, 3),
        makeStrip('e3', 'hard-maple', 1.5),
      ]),
    ],
    rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
    rowCount: 1,
  });
}

function endConfig(): BoardDesignConfig {
  return makeV2Config({
    name: 'End checker',
    grain: 'end',
    sourceLengthIn: 20,
    sliceThicknessIn: 1.5,
    panels: [
      makePanel('panel-1', 'Course', 1.5, [
        makeStrip('s1', 'walnut', 1.5),
        makeStrip('s2', 'hard-maple', 1.5, 3),
      ]),
    ],
    rowPattern: [
      { panelId: 'panel-1', transform: 'none' },
      { panelId: 'panel-1', transform: 'rot180' },
    ],
    rowCount: 8,
  });
}

function idsOf(steps: BuildStep[]): string[] {
  return steps.map((s) => s.id);
}

function detailsWithBuffer(steps: BuildStep[], config: BoardDesignConfig): string[] {
  const needle = formatInches(planeBufferIn(config));
  return steps.filter((s) => s.detail.includes(needle)).map((s) => s.id);
}

describe('designBuildSteps — shape', () => {
  it('every step has non-empty id/title/detail and an array quantities', () => {
    for (const config of [edgeConfig(), endConfig()]) {
      const steps = designBuildSteps(config, calculateMetrics(config));
      expect(steps.length).toBeGreaterThan(0);
      for (const s of steps) {
        expect(s.id.length).toBeGreaterThan(0);
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.detail.length).toBeGreaterThan(0);
        expect(Array.isArray(s.quantities)).toBe(true);
        expect(s.quantities).not.toBeUndefined();
      }
    }
  });

  it('two calls with the same inputs are deeply equal', () => {
    const config = endConfig();
    const metrics = calculateMetrics(config);
    expect(designBuildSteps(config, metrics)).toEqual(
      designBuildSteps(config, metrics),
    );
  });
});

describe('designBuildSteps — edge grain', () => {
  it('emits the exact id sequence', () => {
    const config = edgeConfig();
    expect(idsOf(designBuildSteps(config, calculateMetrics(config)))).toEqual([
      ...EDGE_IDS,
    ]);
  });

  it('emits no slicing step and no second glue-up', () => {
    const config = edgeConfig();
    const ids = idsOf(designBuildSteps(config, calculateMetrics(config)));
    expect(ids).not.toContain('crosscut-slices');
    expect(ids).not.toContain('glue-up-board');
    expect(ids).not.toContain('flatten-panel');
    expect(ids).not.toContain('flatten-board');
    expect(ids).not.toContain('arrange-rows');
  });

  it('plane buffer formatted string appears only on flatten', () => {
    const config = edgeConfig();
    const steps = designBuildSteps(config, calculateMetrics(config));
    expect(detailsWithBuffer(steps, config)).toEqual(['flatten']);
  });
});

describe('designBuildSteps — end grain', () => {
  it('emits the exact id sequence', () => {
    const config = endConfig();
    expect(idsOf(designBuildSteps(config, calculateMetrics(config)))).toEqual([
      ...END_IDS,
    ]);
  });

  it('plane buffer formatted string appears on flatten-panel and flatten-board', () => {
    const config = endConfig();
    const steps = designBuildSteps(config, calculateMetrics(config));
    expect(detailsWithBuffer(steps, config)).toEqual([
      'flatten-panel',
      'flatten-board',
    ]);
  });

  it('crosscut-slices uses metrics.sliceCount', () => {
    const config = endConfig();
    const metrics = calculateMetrics(config);
    const steps = designBuildSteps(config, metrics);
    const sliceStep = steps.find((s) => s.id === 'crosscut-slices')!;
    expect(sliceStep.detail).toContain(String(metrics.sliceCount));
    expect(metrics.sliceCount).toBe(8);
  });

  it('arrange-rows states pattern length and every distinct transform', () => {
    const config = endConfig();
    const detail = designBuildSteps(config, calculateMetrics(config)).find(
      (s) => s.id === 'arrange-rows',
    )!.detail;
    expect(detail).toContain('2-step');
    expect(detail).toContain('as designed');
    expect(detail).toContain('turned 180°');
    expect(detail).not.toMatch(/rot180|mirrorX|mirrorY/);
  });

  it('mill quantities key by species + thickness (F1) and count distinct widths (F2)', () => {
    const config = makeV2Config({
      grain: 'end',
      sourceLengthIn: 20,
      sliceThicknessIn: 1.5,
      panels: [
        makePanel('thin', 'Thin', 0.75, [
          makeStrip('t1', 'hard-maple', 1.5),
          makeStrip('t2', 'hard-maple', 2),
        ]),
        makePanel('thick', 'Thick', 1.5, [
          makeStrip('k1', 'hard-maple', 1.5),
        ]),
      ],
      rowPattern: [
        { panelId: 'thin', transform: 'none' },
        { panelId: 'thick', transform: 'none' },
      ],
      rowCount: 4,
    });
    const mill = designBuildSteps(config, calculateMetrics(config)).find(
      (s) => s.id === 'mill-stock',
    )!;
    const maple = mill.quantities.filter((q) => q.label.includes('Hard Maple'));
    expect(maple).toHaveLength(2);
    expect(maple.map((q) => q.thicknessIn).sort()).toEqual([0.75, 1.5]);
    // thin panel: two rip widths → count 2; thick panel: one width → count 1
    expect(maple.find((q) => q.thicknessIn === 0.75)!.count).toBe(2);
    expect(maple.find((q) => q.thicknessIn === 1.5)!.count).toBe(1);
  });

  it('mill-stock detail lists every distinct thickness on multi-panel end grain (F5)', () => {
    const mixed = makeV2Config({
      grain: 'end',
      sourceLengthIn: 20,
      sliceThicknessIn: 1.5,
      panels: [
        makePanel('thin', 'Thin', 0.75, [
          makeStrip('t1', 'hard-maple', 1.5),
          makeStrip('t2', 'hard-maple', 2),
        ]),
        makePanel('thick', 'Thick', 1.5, [
          makeStrip('k1', 'hard-maple', 1.5),
        ]),
      ],
      rowPattern: [
        { panelId: 'thin', transform: 'none' },
        { panelId: 'thick', transform: 'none' },
      ],
      rowCount: 4,
    });
    const mixedDetail = designBuildSteps(mixed, calculateMetrics(mixed)).find(
      (s) => s.id === 'mill-stock',
    )!.detail;
    expect(mixedDetail).toContain('its panel thickness');
    expect(mixedDetail).toContain(formatInches(0.75));
    expect(mixedDetail).toContain(formatInches(1.5));
    expect(mixedDetail).not.toMatch(/\d+\.\d+/);

    const single = endConfig();
    const singleDetail = designBuildSteps(
      single,
      calculateMetrics(single),
    ).find((s) => s.id === 'mill-stock')!.detail;
    expect(singleDetail).toBe(
      `Mill each species to ${formatInches(1.5)} thick.`,
    );
  });

  it('dry-fit uses stripDisplayName so explicit labels appear (F4)', () => {
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
    const detail = designBuildSteps(config, calculateMetrics(config)).find(
      (s) => s.id === 'dry-fit',
    )!.detail;
    expect(detail).toContain('Accent rail');
    expect(detail).toContain('Strip 2 ×2');
  });
});

describe('designBuildSteps — shared correctness', () => {
  it('strip counts respect repeat via expandStripPieces', () => {
    const config = edgeConfig();
    const steps = designBuildSteps(config, calculateMetrics(config));
    const rip = steps.find((s) => s.id === 'rip-strips')!;
    // maple 1 + maple 1 + walnut×3 = 2 maple, 3 walnut
    const maple = rip.quantities.find((q) => q.label.includes('Hard Maple'))!;
    const walnut = rip.quantities.find((q) => q.label.includes('Walnut'))!;
    expect(maple.count).toBe(2);
    expect(walnut.count).toBe(3);
  });

  it('no detail matches a raw decimal dimension', () => {
    for (const config of [edgeConfig(), endConfig()]) {
      const steps = designBuildSteps(config, calculateMetrics(config));
      for (const s of steps) {
        expect(s.detail, s.id).not.toMatch(/\d+\.\d+/);
      }
    }
  });

  it('unused end-grain panels contribute no stock (panelPlan, not config.panels)', () => {
    const config = makeV2Config({
      grain: 'end',
      sourceLengthIn: 20,
      sliceThicknessIn: 1.5,
      panels: [
        makePanel('used', 'Used', 1.5, [
          makeStrip('u1', 'cherry', 1.5),
          makeStrip('u2', 'cherry', 1.5),
        ]),
        makePanel('unused', 'Unused', 1.5, [
          makeStrip('x1', 'purpleheart', 2),
          makeStrip('x2', 'purpleheart', 2),
          makeStrip('x3', 'purpleheart', 2),
        ]),
      ],
      rowPattern: [{ panelId: 'used', transform: 'none' }],
      rowCount: 4,
    });
    const metrics = calculateMetrics(config);
    expect(metrics.panelPlan.some((p) => p.panelId === 'unused' && p.rows === 0)).toBe(
      true,
    );
    const rip = designBuildSteps(config, metrics).find((s) => s.id === 'rip-strips')!;
    expect(rip.quantities.every((q) => !q.label.includes('Purpleheart'))).toBe(true);
    expect(rip.quantities.some((q) => q.label.includes('Cherry'))).toBe(true);
  });
});

describe('designBuildSteps — source guards', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/lib/board-designer/build-steps.ts'),
    'utf8',
  );

  it('does not read wasteFactor', () => {
    expect(source).not.toMatch(/wasteFactor/);
  });

  it('uses metrics.sliceCount for slice count, not rowCount or panelPlan rows', () => {
    expect(source).toMatch(/metrics\.sliceCount/);
    expect(source).not.toMatch(/config\.rowCount/);
    // Must not take slice count from panelPlan[].rows
    expect(source).not.toMatch(/panelPlan.*\.rows|plan\.rows.*slice|slice.*plan\.rows/);
  });

  it('enumerates metrics.panelPlan for stock, not config.panels directly for iteration', () => {
    expect(source).toMatch(/metrics\.panelPlan/);
  });

  it('imports nothing from react/next/prisma/components/app', () => {
    expect(source).not.toMatch(
      /from ['"]react['"]|from ['"]next|@prisma\/client|@\/components\/|@\/app\//,
    );
  });

  it('ids are stable slugs written as literals', () => {
    for (const id of [...EDGE_IDS, ...END_IDS]) {
      expect(source).toContain(`'${id}'`);
    }
    expect(source).not.toMatch(/randomUUID|Math\.random|`step-\$\{/);
  });
});
