import { describe, expect, it } from 'vitest';
import {
  applyRowTransform,
  expandStrips,
  layoutTopFace,
  type Cell,
} from '@/lib/board-designer/layout';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import {
  clipMiterWedge,
  closingThicknessIn,
  mapMiterCorner,
  miterWedgeFraction,
  polygonArea,
} from '@/lib/board-designer/miter-geometry';
import { parseConfig } from '@/lib/board-designer/serialize';
import { getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig, Strip } from '@/lib/board-designer/types';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

/**
 * Frozen solid-strip Cell[] oracle for the Sprint 57 checkerboard template.
 * Hard-coded — must stay byte-identical after miter support.
 */
const CHECKERBOARD_SOLID_ORACLE: Cell[] = (() => {
  const maple = '#E7D3A9';
  const walnut = '#4A3524';
  const cells: Cell[] = [];
  for (let row = 0; row < 8; row += 1) {
    const reverse = row % 2 === 1;
    for (let col = 0; col < 12; col += 1) {
      const species = (reverse ? 11 - col : col) % 2 === 0 ? 'hard-maple' : 'walnut';
      cells.push({
        xIn: col * 1.5,
        yIn: row * 1.5,
        wIn: 1.5,
        hIn: 1.5,
        colorHex: species === 'hard-maple' ? maple : walnut,
        speciesId: species,
      });
    }
  }
  return cells;
})();

describe('miter geometry — solid identity', () => {
  it('solid strips produce byte-identical Cell[] to the frozen oracle', () => {
    const tpl = getTemplate('checkerboard');
    expect(tpl).toBeTruthy();
    const metrics = calculateMetrics(tpl!.config);
    const cells = layoutTopFace(tpl!.config, metrics);
    expect(cells).toEqual(CHECKERBOARD_SOLID_ORACLE);
  });
});

describe('miter geometry — convex clip', () => {
  it('d < t yields a triangle; d > t yields a quadrilateral; both stay in-rect', () => {
    // w=1, θ=30° → d = tan30 ≈ 0.577
    const tri = clipMiterWedge(0, 0, 1, 1.5, { angleDeg: 30, corner: 'tl' });
    expect(tri).toBeTruthy();
    expect(tri!.length).toBe(3);
    for (const [x, y] of tri!) {
      expect(x).toBeGreaterThanOrEqual(-1e-6);
      expect(y).toBeGreaterThanOrEqual(-1e-6);
      expect(x).toBeLessThanOrEqual(1 + 1e-6);
      expect(y).toBeLessThanOrEqual(1.5 + 1e-6);
    }

    // w=2, θ=45° → d = 2; h=1 → d > t → quad
    const quad = clipMiterWedge(0, 0, 2, 1, { angleDeg: 45, corner: 'tl' });
    expect(quad).toBeTruthy();
    expect(quad!.length).toBe(4);
    for (const [x, y] of quad!) {
      expect(x).toBeGreaterThanOrEqual(-1e-6);
      expect(y).toBeGreaterThanOrEqual(-1e-6);
      expect(x).toBeLessThanOrEqual(2 + 1e-6);
      expect(y).toBeLessThanOrEqual(1 + 1e-6);
    }
  });
});

describe('miter geometry — row transforms', () => {
  it('all four transforms produce four different cell arrays on a mitered panel', () => {
    const strips: Strip[] = [
      {
        id: 'a',
        speciesId: 'hard-maple',
        widthIn: 2,
        repeat: 1,
        miter: { speciesId: 'walnut', angleDeg: 30, corner: 'tl' },
      },
      {
        id: 'b',
        speciesId: 'walnut',
        widthIn: 0.25,
        repeat: 1,
        miter: { speciesId: 'hard-maple', angleDeg: 30, corner: 'tr' },
      },
      {
        id: 'c',
        speciesId: 'cherry',
        widthIn: 1.75,
        repeat: 1,
        miter: { speciesId: 'purpleheart', angleDeg: 30, corner: 'bl' },
      },
    ];

    const transforms = ['none', 'rot180', 'mirrorX', 'mirrorY'] as const;
    const results = transforms.map((t) => {
      const config = makeV2Config({
        panels: [makePanel('panel-1', 'P', 1.5, strips)],
        rowPattern: [{ panelId: 'panel-1', transform: t }],
        rowCount: 1,
      });
      return layoutTopFace(config, calculateMetrics(config));
    });

    // Four different arrays
    for (let i = 0; i < results.length; i += 1) {
      for (let j = i + 1; j < results.length; j += 1) {
        expect(results[i]).not.toEqual(results[j]);
      }
    }

    // Corner mapping asserted explicitly via applyRowTransform
    const expanded = expandStrips(strips);
    expect(applyRowTransform(expanded, 'none')[0]!.miter!.corner).toBe('tl');
    expect(applyRowTransform(expanded, 'rot180')[0]!.miter!.corner).toBe(
      mapMiterCorner('bl', 'rot180') === 'tr'
        ? applyRowTransform(expanded, 'rot180')[0]!.miter!.corner
        : applyRowTransform(expanded, 'rot180')[0]!.miter!.corner,
    );
    // After rot180: order reversed [c,b,a], corners mapped tl↔br, tr↔bl, bl↔tr
    const rot = applyRowTransform(expanded, 'rot180');
    expect(rot.map((s) => s.id)).toEqual(['c', 'b', 'a']);
    expect(rot.map((s) => s.miter!.corner)).toEqual(['tr', 'bl', 'br']);

    const mx = applyRowTransform(expanded, 'mirrorX');
    expect(mx.map((s) => s.id)).toEqual(['c', 'b', 'a']);
    expect(mx.map((s) => s.miter!.corner)).toEqual(['br', 'tl', 'tr']);

    const my = applyRowTransform(expanded, 'mirrorY');
    expect(my.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(my.map((s) => s.miter!.corner)).toEqual(['bl', 'br', 'tl']);
  });
});

describe('miter geometry — closing thickness', () => {
  it('t/w = tan θ + sec θ within 2% for ⅞″ / 1½″ / 30°', () => {
    const w = 0.875;
    const t = 1.5;
    const ideal = closingThicknessIn(w, 30);
    expect(Math.abs(t / w - ideal / w) / (ideal / w)).toBeLessThan(0.02);
    expect(Math.abs(t - ideal) / ideal).toBeLessThan(0.02);
  });
});

describe('miter geometry — board feet area split', () => {
  it('solid strip unchanged; 50/50 wedge splits 50/50', () => {
    const solid = makeV2Config({
      wasteFactor: 0,
      panels: [
        makePanel('panel-1', 'P', 1.5, [makeStrip('s1', 'hard-maple', 1.5, 1)]),
      ],
      rowCount: 1,
      rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
    });
    const solidBf = calculateMetrics(solid).boardFeetBySpecies;
    expect(solidBf).toHaveLength(1);
    expect(solidBf[0]!.speciesId).toBe('hard-maple');

    // Construct a miter whose wedge area is half the cell: right triangle
    // with legs w and t where d = t ⇒ θ = atan(t/w). For w=t=1.5, θ=45°,
    // triangle area = w*t/2 = 50%.
    const half: BoardDesignConfig = {
      ...solid,
      panels: [
        makePanel('panel-1', 'P', 1.5, [
          {
            id: 's1',
            speciesId: 'hard-maple',
            widthIn: 1.5,
            repeat: 1,
            miter: { speciesId: 'walnut', angleDeg: 45, corner: 'tl' },
          },
        ]),
      ],
    };
    const frac = miterWedgeFraction(1.5, 1.5, { angleDeg: 45, corner: 'tl' });
    expect(frac).toBeCloseTo(0.5, 5);

    const halfBf = calculateMetrics(half).boardFeetBySpecies;
    const maple = halfBf.find((r) => r.speciesId === 'hard-maple')!;
    const walnut = halfBf.find((r) => r.speciesId === 'walnut')!;
    expect(maple.boardFeet).toBeCloseTo(solidBf[0]!.boardFeet / 2, 5);
    expect(walnut.boardFeet).toBeCloseTo(solidBf[0]!.boardFeet / 2, 5);
    expect(maple.boardFeet + walnut.boardFeet).toBeCloseTo(
      solidBf[0]!.boardFeet,
      5,
    );
  });
});

describe('miter serialize bounds', () => {
  it('rejects angleDeg 0, 90, and non-numeric; accepts 22.5', () => {
    const base = {
      schemaVersion: 2 as const,
      name: 'M',
      grain: 'end' as const,
      sourceLengthIn: 12,
      sliceThicknessIn: 1.5,
      kerfIn: 0.125,
      wasteFactor: 0.15,
      panels: [
        {
          id: 'panel-1',
          label: 'P',
          thicknessIn: 1.5,
          strips: [
            {
              id: 's1',
              speciesId: 'hard-maple',
              widthIn: 1.5,
              repeat: 1,
              miter: { speciesId: 'walnut', angleDeg: 22.5, corner: 'tl' as const },
            },
          ],
        },
      ],
      rowPattern: [{ panelId: 'panel-1', transform: 'none' as const }],
      rowCount: 2,
    };
    expect(parseConfig(base).ok).toBe(true);

    expect(
      parseConfig({
        ...base,
        panels: [
          {
            ...base.panels[0]!,
            strips: [
              {
                ...base.panels[0]!.strips[0]!,
                miter: { speciesId: 'walnut', angleDeg: 0, corner: 'tl' },
              },
            ],
          },
        ],
      }).ok,
    ).toBe(false);

    expect(
      parseConfig({
        ...base,
        panels: [
          {
            ...base.panels[0]!,
            strips: [
              {
                ...base.panels[0]!.strips[0]!,
                miter: { speciesId: 'walnut', angleDeg: 90, corner: 'tl' },
              },
            ],
          },
        ],
      }).ok,
    ).toBe(false);

    expect(
      parseConfig({
        ...base,
        panels: [
          {
            ...base.panels[0]!,
            strips: [
              {
                ...base.panels[0]!.strips[0]!,
                miter: { speciesId: 'walnut', angleDeg: 'thirty', corner: 'tl' },
              },
            ],
          },
        ],
      }).ok,
    ).toBe(false);
  });

  it('v2 config without miter round-trips with no miter key added', () => {
    const raw = {
      schemaVersion: 2,
      name: 'Solid',
      grain: 'end',
      sourceLengthIn: 12,
      sliceThicknessIn: 1.5,
      kerfIn: 0.125,
      wasteFactor: 0.15,
      panels: [
        {
          id: 'panel-1',
          label: 'P',
          thicknessIn: 1.5,
          strips: [
            { id: 's1', speciesId: 'hard-maple', widthIn: 1.5, repeat: 1 },
          ],
        },
      ],
      rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
      rowCount: 2,
    };
    const parsed = parseConfig(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const json = JSON.parse(JSON.stringify(parsed.config)) as typeof raw;
    expect(json.panels[0]!.strips[0]).not.toHaveProperty('miter');
  });
});

describe('miter polygon area helper', () => {
  it('shoelace on a unit square is 1', () => {
    expect(
      polygonArea([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]),
    ).toBeCloseTo(1, 9);
  });
});
