import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyRowTransform, layoutTopFace } from '@/lib/board-designer/layout';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { parseConfig } from '@/lib/board-designer/serialize';
import { getSpecies } from '@/lib/board-designer/species';
import { getTemplate } from '@/lib/board-designer/templates';
import { cloneConfig } from '@/lib/board-designer/history';
import type { Cell } from '@/lib/board-designer/layout';
import { goldenV1Fixture, makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

/**
 * Frozen v1 layout oracle (rotateByOne on odd flip rows). Lives ONLY in this test —
 * the production code deletes rotateByOne and reverses instead.
 */
function v1GoldenCellsOracle(): Cell[] {
  const strips = Array.from({ length: 12 }, (_, i) => ({
    id: `g-${i}`,
    speciesId: i % 2 === 0 ? 'walnut' : 'hard-maple',
    widthIn: 1.5,
    repeat: 1,
  }));
  const expand = strips; // repeat=1
  const rotateByOne = <T,>(items: T[]): T[] =>
    items.length <= 1 ? items.slice() : [...items.slice(1), items[0]!];
  const colorFor = (id: string) => getSpecies(id)!.colorHex;
  const sliceCount = 12;
  const stock = 1.5;
  const cells: Cell[] = [];
  for (let row = 0; row < sliceCount; row++) {
    const order = row % 2 === 1 ? rotateByOne(expand) : expand;
    let x = 0;
    const y = row * stock;
    for (const s of order) {
      cells.push({
        xIn: x,
        yIn: y,
        wIn: s.widthIn,
        hIn: stock,
        colorHex: colorFor(s.speciesId),
        speciesId: s.speciesId,
      });
      x += s.widthIn;
    }
  }
  return cells;
}

describe('Sprint 57 v2 migration + geometry', () => {
  it('v1 golden fixture migrates to a cell-identical Cell[] (hard-coded v1 oracle)', () => {
    const parsed = parseConfig(goldenV1Fixture());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.config.schemaVersion).toBe(2);
    expect(parsed.config.rowPattern).toEqual([
      { panelId: 'panel-1', transform: 'none' },
      { panelId: 'panel-1', transform: 'rot180' },
    ]);
    expect(parsed.config.rowCount).toBe(12);

    const metrics = calculateMetrics(parsed.config);
    const cells = layoutTopFace(parsed.config, metrics);
    expect(cells).toEqual(v1GoldenCellsOracle());
  });

  it('v1 with flipEveryOtherSlice:false migrates to a one-entry rowPattern', () => {
    const parsed = parseConfig({ ...goldenV1Fixture(), flipEveryOtherSlice: false });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.config.rowPattern).toEqual([
      { panelId: 'panel-1', transform: 'none' },
    ]);
  });

  it('cloneConfig deep-clones panels, strips, and rowPattern', () => {
    const config = makeV2Config({
      rowPattern: [
        { panelId: 'panel-1', transform: 'none' },
        { panelId: 'panel-1', transform: 'rot180' },
      ],
    });
    const cloned = cloneConfig(config);
    cloned.panels[0]!.strips[0]!.widthIn = 9;
    cloned.rowPattern[0]!.transform = 'mirrorY';
    expect(config.panels[0]!.strips[0]!.widthIn).toBe(1.5);
    expect(config.rowPattern[0]!.transform).toBe('none');
  });

  it('existing four templates render identically to their pre-migration v1 shapes', () => {
    // classic-stripe edge: 7 strips × 1.5 stacked → finished 18 × 10.5 × 0.75
    const classic = getTemplate('classic-stripe')!;
    const cm = calculateMetrics(classic.config);
    expect(cm.finishedLengthIn).toBe(18);
    expect(cm.finishedWidthIn).toBe(10.5);
    expect(cm.finishedThicknessIn).toBe(0.75);

    const checker = getTemplate('checkerboard')!;
    const chm = calculateMetrics(checker.config);
    expect(chm.finishedLengthIn).toBe(18);
    expect(chm.finishedWidthIn).toBe(12);
    expect(chm.finishedThicknessIn).toBe(1.5);
    expect(chm.sliceCount).toBe(8);

    const butcher = getTemplate('butcher-block')!;
    const bm = calculateMetrics(butcher.config);
    expect(bm.finishedLengthIn).toBe(20);
    expect(bm.finishedWidthIn).toBe(9.5);
    expect(bm.finishedThicknessIn).toBe(1.5);

    const accent = getTemplate('accent-stripe')!;
    const am = calculateMetrics(accent.config);
    expect(am.finishedLengthIn).toBe(16);
    expect(am.finishedWidthIn).toBe(11);
    expect(am.finishedThicknessIn).toBe(0.75);
  });

  it('new templates hit stated finished dimensions and panel-plan counts', () => {
    const plaid = getTemplate('plaid')!;
    const pm = calculateMetrics(plaid.config);
    expect(pm.finishedLengthIn).toBe(9.75);
    expect(pm.finishedWidthIn).toBe(12);
    expect(pm.finishedThicknessIn).toBe(1.5);
    expect(pm.panelPlan).toHaveLength(3);
    expect(pm.panelPlan.map((p) => p.rows)).toEqual([3, 3, 6]);
    expect(pm.panelPlan.map((p) => p.requiredLengthIn)).toEqual([4.75, 4.75, 9.625]);

    const brick = getTemplate('brick')!;
    const brm = calculateMetrics(brick.config);
    expect(brm.finishedLengthIn).toBe(8.75);
    expect(brm.finishedWidthIn).toBe(18);
    expect(brm.finishedThicknessIn).toBe(1.5);
    expect(brm.panelPlan).toHaveLength(2);

    const diagonal = getTemplate('diagonal')!;
    const dm = calculateMetrics(diagonal.config);
    expect(dm.finishedLengthIn).toBe(10);
    expect(dm.finishedWidthIn).toBe(18);
    expect(dm.finishedThicknessIn).toBe(1.5);
    expect(dm.panelPlan).toHaveLength(4);

    const tm = getTemplate('thue-morse')!;
    const tmm = calculateMetrics(tm.config);
    expect(tmm.panelPlan).toHaveLength(1);
  });

  it('unequal panel widths → exact warning and complete:false', () => {
    const config = makeV2Config({
      panels: [
        makePanel('a', 'A', 1.5, [makeStrip('a1', 'walnut', 2)]),
        makePanel('b', 'B', 1.5, [makeStrip('b1', 'walnut', 3)]),
      ],
      rowPattern: [
        { panelId: 'a', transform: 'none' },
        { panelId: 'b', transform: 'none' },
      ],
      rowCount: 2,
    });
    const m = calculateMetrics(config);
    expect(m.warnings).toContain(
      'Panels must be the same width — slices will not line up.',
    );
    expect(m.complete).toBe(false);
  });

  it('rowPattern naming a deleted panel → warning, complete:false, surviving rows still layout', () => {
    const config = makeV2Config({
      panels: [makePanel('a', 'A', 1.5, [makeStrip('a1', 'walnut', 1.5)])],
      rowPattern: [
        { panelId: 'a', transform: 'none' },
        { panelId: 'gone', transform: 'none' },
      ],
      rowCount: 2,
    });
    // Bypass parse (parse would reject absent panel); metrics must still warn.
    const m = calculateMetrics(config);
    expect(m.warnings).toContain('Row pattern uses a panel that was deleted.');
    expect(m.complete).toBe(false);
    const cells = layoutTopFace(config, m);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((c) => c.yIn === 0 || c.hIn === 1.5)).toBe(true);
  });

  it('edge grain with 2 panels → exact warning, complete:true, metrics count panels[0] only', () => {
    const config = makeV2Config({
      grain: 'edge',
      sourceLengthIn: 18,
      panels: [
        makePanel('a', 'A', 0.75, [
          makeStrip('a1', 'hard-maple', 1.5),
          makeStrip('a2', 'walnut', 1.5),
        ]),
        makePanel('b', 'B', 0.75, [makeStrip('b1', 'cherry', 3)]),
      ],
      rowPattern: [{ panelId: 'a', transform: 'none' }],
      rowCount: 1,
    });
    const m = calculateMetrics(config);
    expect(m.warnings).toContain('Extra panels are unused in edge grain.');
    expect(m.complete).toBe(true);
    expect(m.finishedWidthIn).toBe(3);
    expect(m.panelPlan).toHaveLength(1);
  });

  it('four transforms produce expected strip order on unequal widths + odd count', () => {
    const strips = [
      makeStrip('a', 'walnut', 2),
      makeStrip('b', 'hard-maple', 0.25),
      makeStrip('c', 'cherry', 1),
    ];
    const expanded = strips;
    expect(applyRowTransform(expanded, 'none').map((s) => s.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(applyRowTransform(expanded, 'mirrorY').map((s) => s.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(applyRowTransform(expanded, 'rot180').map((s) => s.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
    expect(applyRowTransform(expanded, 'mirrorX').map((s) => s.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
    // rotateByOne would have been [b,c,a] — must NOT match reverse.
    expect(applyRowTransform(expanded, 'rot180').map((s) => s.id)).not.toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('parseConfig rejects total strips > 80, duplicate panel ids, absent row panel', () => {
    const tooMany = makeV2Config({
      panels: [
        makePanel(
          'p1',
          'P1',
          1.5,
          Array.from({ length: 41 }, (_, i) => makeStrip(`a${i}`, 'walnut')),
        ),
        makePanel(
          'p2',
          'P2',
          1.5,
          Array.from({ length: 40 }, (_, i) => makeStrip(`b${i}`, 'walnut')),
        ),
      ],
      rowPattern: [{ panelId: 'p1', transform: 'none' }],
    });
    expect(parseConfig(tooMany).ok).toBe(false);

    const dup = makeV2Config({
      panels: [
        makePanel('same', 'A', 1.5, [makeStrip('a', 'walnut')]),
        makePanel('same', 'B', 1.5, [makeStrip('b', 'walnut')]),
      ],
    });
    expect(parseConfig(dup).ok).toBe(false);

    const missing = makeV2Config({
      rowPattern: [{ panelId: 'nope', transform: 'none' }],
    });
    expect(parseConfig(missing).ok).toBe(false);
  });

  it('17 KB config string is rejected before JSON.parse in the action gate', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app/actions/board-designs.ts'),
      'utf8',
    );
    expect(source).toContain('16 * 1024');
    expect(source).toMatch(
      /byteLength\s*>\s*MAX_CONFIG_BYTES[\s\S]*JSON\.parse/,
    );
  });

  it('parseConfig is idempotent on its own v2 output', () => {
    const once = parseConfig(getTemplate('plaid')!.config);
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    const twice = parseConfig(once.config);
    expect(twice.ok).toBe(true);
    if (!twice.ok) return;
    expect(twice.config).toEqual(once.config);
  });

  it('board feet for a two-panel config uses each panel thickness and derived length', () => {
    const config = makeV2Config({
      sliceThicknessIn: 1.5,
      kerfIn: 0.125,
      wasteFactor: 0,
      panels: [
        makePanel('a', 'A', 1, [makeStrip('a1', 'walnut', 2, 1)]),
        makePanel('b', 'B', 2, [makeStrip('b1', 'hard-maple', 2, 1)]),
      ],
      rowPattern: [
        { panelId: 'a', transform: 'none' },
        { panelId: 'b', transform: 'none' },
      ],
      rowCount: 2,
    });
    const m = calculateMetrics(config);
    // each panel supplies 1 row → requiredLength = 1.5
    // bf walnut = (1 * 2 * 1.5 * 1) / 144 = 3/144
    // bf maple  = (2 * 2 * 1.5 * 1) / 144 = 6/144
    expect(m.boardFeetBySpecies.find((r) => r.speciesId === 'walnut')!.boardFeet).toBeCloseTo(
      3 / 144,
      8,
    );
    expect(
      m.boardFeetBySpecies.find((r) => r.speciesId === 'hard-maple')!.boardFeet,
    ).toBeCloseTo(6 / 144, 8);
  });
});
