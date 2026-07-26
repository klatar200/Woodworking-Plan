import { describe, expect, it } from 'vitest';
import { SPECIES, getSpecies } from '@/lib/board-designer/species';
import { speciesColorLinear } from '@/components/designer/r3f-materials';

/**
 * Documented 2026-07-26 separation floor over the full palette (Keagan).
 * Closest pair is cherry/padauk. Raw float is ~0.12671; three-decimal
 * rounding matches the stated 0.127 floor. Do not weaken — a quieter collision
 * is how pale woods become indistinguishable in 3D.
 */
const SPECIES_MIN_PAIRWISE_DISTANCE = 0.127;

function pairwiseDistance(aHex: string, bHex: string): number {
  const a = speciesColorLinear(aHex);
  const b = speciesColorLinear(bHex);
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

describe('board designer species palette', () => {
  it('lists exactly fifteen species with the Sprint 56 append order', () => {
    expect(SPECIES).toHaveLength(15);
    expect(SPECIES.map((s) => s.id)).toEqual([
      'hard-maple',
      'walnut',
      'cherry',
      'white-oak',
      'red-oak',
      'sapele',
      'purpleheart',
      'padauk',
      'yellowheart',
      'bloodwood',
      'beech',
      'ash',
      'birch',
      'hickory',
      'bamboo',
    ]);
    expect(getSpecies('hickory')?.name).toBe('Hickory / Pecan');
    expect(getSpecies('bamboo')?.colorHex).toBe('#EFAB76');
  });

  it('keeps every species above the 3D albedo floor (r+g+b and max channel)', () => {
    for (const species of SPECIES) {
      const rgb = speciesColorLinear(species.colorHex);
      expect(rgb.r + rgb.g + rgb.b).toBeGreaterThan(0.2);
      expect(Math.max(rgb.r, rgb.g, rgb.b)).toBeGreaterThan(0.25);
    }
  });

  it('holds a 0.127 minimum pairwise euclidean distance across the full palette', () => {
    let min = Infinity;
    let closest = '';
    for (let i = 0; i < SPECIES.length; i += 1) {
      for (let j = i + 1; j < SPECIES.length; j += 1) {
        const a = SPECIES[i]!;
        const b = SPECIES[j]!;
        const d = pairwiseDistance(a.colorHex, b.colorHex);
        if (d < min) {
          min = d;
          closest = `${a.id}/${b.id}`;
        }
      }
    }

    expect(closest).toBe('cherry/padauk');
    expect(round3(min)).toBeGreaterThanOrEqual(SPECIES_MIN_PAIRWISE_DISTANCE);
    // Every pair — not just the closest — must clear the floor.
    for (let i = 0; i < SPECIES.length; i += 1) {
      for (let j = i + 1; j < SPECIES.length; j += 1) {
        expect(
          round3(pairwiseDistance(SPECIES[i]!.colorHex, SPECIES[j]!.colorHex)),
        ).toBeGreaterThanOrEqual(SPECIES_MIN_PAIRWISE_DISTANCE);
      }
    }
  });

  it('exposes only id, name, and colorHex (B13 — no extra metadata)', () => {
    for (const species of SPECIES) {
      expect(Object.keys(species).sort()).toEqual(['colorHex', 'id', 'name']);
    }
  });
});
