import { describe, expect, it } from 'vitest';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { designBoardFeetBySpecies } from '@/lib/board-designer/design-board-feet';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

describe('designBoardFeetBySpecies — cheap path (Sprint 64)', () => {
  it('matches calculateMetrics board feet exactly (waste once)', () => {
    const config = makeV2Config({
      grain: 'edge',
      sourceLengthIn: 18,
      wasteFactor: 0.15,
      panels: [
        makePanel('p1', 'P', 1.5, [
          makeStrip('s1', 'hard-maple', 1.5, 2),
          makeStrip('s2', 'walnut', 1.5, 1),
        ]),
      ],
    });
    const full = calculateMetrics(config).boardFeetBySpecies;
    const cheap = designBoardFeetBySpecies(config);
    expect(cheap).toEqual(full);
  });

  it('does not import layout / lattice closure (source guard)', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/lib/board-designer/design-board-feet.ts', 'utf8');
    expect(src).not.toMatch(/from '\.\/layout'/);
    expect(src).not.toMatch(/\bmiterLatticeCloses\b|\bwedgeWebContinuous\b|\blayoutTopFace\b/);
    const geo = fs.readFileSync('src/lib/board-designer/panel-geometry.ts', 'utf8');
    expect(geo).not.toMatch(/from '\.\/layout'|from '\.\/miter-geometry'/);
  });
});
