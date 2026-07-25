import type { Part } from '@/lib/cut-optimizer';
import { getSpecies } from './species';
import type { BoardDesignConfig } from './types';

/**
 * Phase-2 bridge (B7): one Part per strip for the cut-list optimizer.
 * Built now, rendered never in Sprint 51/52.
 */
export function toParts(config: BoardDesignConfig): Part[] {
  return config.strips.map((strip, index) => {
    const species = getSpecies(strip.speciesId);
    const name = species?.name ?? strip.speciesId;
    return {
      id: strip.id,
      label: `${name} strip ${index + 1}`,
      quantity: strip.repeat,
      thicknessIn: config.stockThicknessIn,
      widthIn: strip.widthIn,
      lengthIn: config.sourceLengthIn,
      material: name,
    };
  });
}
