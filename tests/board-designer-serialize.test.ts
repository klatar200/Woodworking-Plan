import { describe, it, expect } from 'vitest';
import { parseConfig } from '@/lib/board-designer/serialize';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

function goldenRaw(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  const strips = Array.from({ length: 12 }, (_, i) => ({
    id: `g-${i + 1}`,
    speciesId: i % 2 === 0 ? 'walnut' : 'hard-maple',
    widthIn: 1.5,
    repeat: 1,
  }));
  return {
    schemaVersion: 1,
    name: 'Golden end-grain',
    grain: 'end',
    sourceLengthIn: 20,
    stockThicknessIn: 1.5,
    sliceThicknessIn: 1.5,
    kerfIn: 0.125,
    wasteFactor: 0.15,
    flipEveryOtherSlice: false,
    strips,
    ...over,
  };
}

describe('parseConfig round-trip', () => {
  it('round-trips the golden config', () => {
    const raw = goldenRaw();
    const result = parseConfig(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const config: BoardDesignConfig = result.config;
    expect(config.schemaVersion).toBe(1);
    expect(config.name).toBe('Golden end-grain');
    expect(config.grain).toBe('end');
    expect(config.sourceLengthIn).toBe(20);
    expect(config.strips).toHaveLength(12);
    // Round-trip through JSON
    const again = parseConfig(JSON.parse(JSON.stringify(config)));
    expect(again).toEqual(result);
  });
});

describe('parseConfig bound violations — ok:false, no throw', () => {
  it('rejects schemaVersion: 2', () => {
    expect(() => parseConfig(goldenRaw({ schemaVersion: 2 }))).not.toThrow();
    const r = parseConfig(goldenRaw({ schemaVersion: 2 }));
    expect(r.ok).toBe(false);
  });

  it('rejects name empty (min 1)', () => {
    const r = parseConfig(goldenRaw({ name: '' }));
    expect(r.ok).toBe(false);
  });

  it('rejects name over 80 chars', () => {
    const r = parseConfig(goldenRaw({ name: 'x'.repeat(81) }));
    expect(r.ok).toBe(false);
  });

  it('rejects strips empty (min 1)', () => {
    const r = parseConfig(goldenRaw({ strips: [] }));
    expect(r.ok).toBe(false);
  });

  it('rejects strips over 60', () => {
    const strips = Array.from({ length: 61 }, (_, i) => ({
      id: `s-${i}`,
      speciesId: 'hard-maple',
      widthIn: 1,
      repeat: 1,
    }));
    const r = parseConfig(goldenRaw({ strips }));
    expect(r.ok).toBe(false);
  });

  it('rejects widthIn below 0.0625', () => {
    const strips = [
      { id: 's1', speciesId: 'hard-maple', widthIn: 0.03125, repeat: 1 },
    ];
    const r = parseConfig(goldenRaw({ strips }));
    expect(r.ok).toBe(false);
  });

  it('rejects widthIn above 24', () => {
    const strips = [
      { id: 's1', speciesId: 'hard-maple', widthIn: 24.1, repeat: 1 },
    ];
    const r = parseConfig(goldenRaw({ strips }));
    expect(r.ok).toBe(false);
  });

  it('rejects repeat below 1', () => {
    const strips = [
      { id: 's1', speciesId: 'hard-maple', widthIn: 1.5, repeat: 0 },
    ];
    const r = parseConfig(goldenRaw({ strips }));
    expect(r.ok).toBe(false);
  });

  it('rejects repeat above 20', () => {
    const strips = [
      { id: 's1', speciesId: 'hard-maple', widthIn: 1.5, repeat: 21 },
    ];
    const r = parseConfig(goldenRaw({ strips }));
    expect(r.ok).toBe(false);
  });

  it('rejects sourceLengthIn below 1', () => {
    const r = parseConfig(goldenRaw({ sourceLengthIn: 0.5 }));
    expect(r.ok).toBe(false);
  });

  it('rejects sourceLengthIn above 96', () => {
    const r = parseConfig(goldenRaw({ sourceLengthIn: 97 }));
    expect(r.ok).toBe(false);
  });

  it('rejects stockThicknessIn below 0.25', () => {
    const r = parseConfig(goldenRaw({ stockThicknessIn: 0.125 }));
    expect(r.ok).toBe(false);
  });

  it('rejects stockThicknessIn above 4', () => {
    const r = parseConfig(goldenRaw({ stockThicknessIn: 4.1 }));
    expect(r.ok).toBe(false);
  });

  it('rejects sliceThicknessIn below 0.25', () => {
    const r = parseConfig(goldenRaw({ sliceThicknessIn: 0.1 }));
    expect(r.ok).toBe(false);
  });

  it('rejects sliceThicknessIn above 4', () => {
    const r = parseConfig(goldenRaw({ sliceThicknessIn: 5 }));
    expect(r.ok).toBe(false);
  });

  it('rejects kerfIn below 0', () => {
    const r = parseConfig(goldenRaw({ kerfIn: -0.01 }));
    expect(r.ok).toBe(false);
  });

  it('rejects kerfIn above 0.5', () => {
    const r = parseConfig(goldenRaw({ kerfIn: 0.6 }));
    expect(r.ok).toBe(false);
  });

  it('rejects wasteFactor below 0', () => {
    const r = parseConfig(goldenRaw({ wasteFactor: -0.1 }));
    expect(r.ok).toBe(false);
  });

  it('rejects wasteFactor above 1', () => {
    const r = parseConfig(goldenRaw({ wasteFactor: 1.1 }));
    expect(r.ok).toBe(false);
  });
});
