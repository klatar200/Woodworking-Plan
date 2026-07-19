import { describe, it, expect } from 'vitest';
import {
  layoutParts,
  describeDiagram,
  DEFAULT_LAYOUT,
  type DiagramPart,
} from '@/lib/part-diagram';

/**
 * QOL-G pilot — the part-diagram layout.
 *
 * A diagram is only worth anything if it is TO SCALE. If parts are scaled independently,
 * or a part silently disappears, the picture is not merely ugly — it is telling someone
 * a false thing about the size of a piece of wood. These tests hold exactly that: one
 * scale for everything, nothing dropped in silence, and no NaN geometry from hand-written
 * content.
 */

const part = (over: Partial<DiagramPart> = {}): DiagramPart => ({
  id: 'p1',
  label: 'Part',
  quantity: 1,
  thicknessIn: 0.75,
  widthIn: 6,
  lengthIn: 24,
  material: 'Pine',
  ...over,
});

describe('ONE SCALE for the whole diagram', () => {
  it('draws a part twice as long twice as wide, in pixels', () => {
    const { parts } = layoutParts([
      part({ id: 'short', lengthIn: 12 }),
      part({ id: 'long', lengthIn: 24 }),
    ]);

    const short = parts.find((p) => p.partId === 'short')!;
    const long = parts.find((p) => p.partId === 'long')!;

    // Scaling parts independently to "fit them nicely" would destroy the only thing this
    // drawing actually communicates.
    expect(long.w / short.w).toBeCloseTo(2, 5);
  });

  it('preserves each part’s own aspect ratio', () => {
    const { parts } = layoutParts([part({ widthIn: 6, lengthIn: 24 })]);
    const drawn = parts[0]!;

    expect(drawn.w / drawn.h).toBeCloseTo(24 / 6, 5);
  });

  it('fits the longest part inside the canvas', () => {
    const { parts, width } = layoutParts([
      part({ id: 'a', lengthIn: 96 }),
      part({ id: 'b', lengthIn: 12 }),
    ]);

    for (const p of parts) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w).toBeLessThanOrEqual(width);
    }
  });

  it('caps the scale so a plan of tiny parts is not blown up into beams', () => {
    // A single 3/4" runner must not be drawn 700px wide.
    const { scale } = layoutParts([part({ widthIn: 0.75, lengthIn: 3 })]);
    expect(scale).toBeLessThanOrEqual(24);
  });
});

describe('nothing disappears in silence', () => {
  it('REPORTS rows with unusable dimensions instead of drawing NaN', () => {
    const { parts, skipped } = layoutParts([
      part({ id: 'ok' }),
      part({ id: 'zero', label: 'Zero width', widthIn: 0 }),
      part({ id: 'nan', label: 'Bad length', lengthIn: Number.NaN }),
    ]);

    // SVG renders NaN geometry as nothing at all — a part that vanishes from a diagram
    // is worse than one reported missing. Content here is hand-authored, so this is a
    // real case rather than a defensive habit.
    expect(parts.map((p) => p.partId)).toEqual(['ok']);
    expect(skipped.map((s) => s.id).sort()).toEqual(['nan', 'zero']);
    expect(skipped[0]!.label).toBeTruthy();
  });

  it('returns an empty diagram, not a crash, for a plan with no cut list', () => {
    // 12 of the 85 catalog plans ship an empty cutList.
    const diagram = layoutParts([]);

    expect(diagram.parts).toEqual([]);
    expect(diagram.height).toBe(0);
    expect(describeDiagram(diagram)).toBe('No parts to draw.');
  });

  it('gives very thin parts a visible minimum height', () => {
    const { parts } = layoutParts([part({ widthIn: 0.375, lengthIn: 24 })]);

    // A 3/8" runner at true scale is a hairline. The vertical distortion is the honest
    // trade: an invisible part communicates nothing.
    expect(parts[0]!.h).toBeGreaterThanOrEqual(6);
  });
});

describe('quantity is collapsed, not ignored', () => {
  it('draws a few copies and labels the rest', () => {
    const { parts } = layoutParts([part({ quantity: 12 })], {
      ...DEFAULT_LAYOUT,
      maxCopies: 3,
    });

    // Twelve identical rectangles communicate nothing the label does not — but drawing a
    // FEW next to a different part is the comparison the diagram exists for.
    expect(parts).toHaveLength(3);
    expect(parts.at(-1)!.standsForMore).toBe(true);
    expect(parts.at(-1)!.quantity).toBe(12);
    expect(parts[0]!.standsForMore).toBe(false);
  });

  it('does not claim to stand for more when it drew them all', () => {
    const { parts } = layoutParts([part({ quantity: 2 })]);

    expect(parts).toHaveLength(2);
    expect(parts.every((p) => p.standsForMore === false)).toBe(true);
  });
});

describe('packing', () => {
  it('wraps to a new row rather than running off the canvas', () => {
    const { parts, height } = layoutParts(
      Array.from({ length: 6 }, (_, i) => part({ id: `p${i}`, lengthIn: 24 })),
    );

    const rows = new Set(parts.map((p) => p.y));
    expect(rows.size).toBeGreaterThan(1);
    // The reported height must actually contain what was drawn, or the SVG clips.
    for (const p of parts) expect(p.y + p.h).toBeLessThanOrEqual(height);
  });

  it('places the longest parts first, so scale reads left-to-right', () => {
    const { parts } = layoutParts([
      part({ id: 'small', lengthIn: 6 }),
      part({ id: 'big', lengthIn: 48 }),
    ]);

    expect(parts[0]!.partId).toBe('big');
  });

  it('gives every placement a unique key', () => {
    const { parts } = layoutParts([part({ quantity: 3 }), part({ id: 'p2', quantity: 2 })]);
    const keys = parts.map((p) => p.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('the diagram has a text alternative', () => {
  it('names every part and its real dimensions, once each', () => {
    const diagram = layoutParts([
      part({ id: 'a', label: 'Sides', quantity: 2, widthIn: 9.25, lengthIn: 60 }),
      part({ id: 'b', label: 'Toe kick', quantity: 1, widthIn: 3, lengthIn: 28.5 }),
    ]);

    const text = describeDiagram(diagram);

    // An SVG with no text alternative is a picture some readers do not receive at all.
    expect(text).toContain('2 × Sides');
    expect(text).toContain('1 × Toe kick');
    expect(text).toContain('60');
    // Copies of one row must not be enumerated twice in the description.
    expect(text.match(/Sides/g)).toHaveLength(1);
  });
});
