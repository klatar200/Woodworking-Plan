import type { WoodSpecies } from './types';

/**
 * Fifteen species — ids are permanent (B14). ADDING is safe; never remove or
 * rename. Colors are pigment, not theme tokens. Bamboo is a grass; the
 * `WoodSpecies` type name is unchanged (Sprint 56 — out of scope to rename).
 */
export const SPECIES: readonly WoodSpecies[] = [
  { id: 'hard-maple', name: 'Hard Maple', colorHex: '#E7D3A9' },
  { id: 'walnut', name: 'Walnut', colorHex: '#4A3524' },
  { id: 'cherry', name: 'Cherry', colorHex: '#9C5A3C' },
  { id: 'white-oak', name: 'White Oak', colorHex: '#C6A67C' },
  { id: 'red-oak', name: 'Red Oak', colorHex: '#B4784F' },
  { id: 'sapele', name: 'Sapele', colorHex: '#7A3B26' },
  { id: 'purpleheart', name: 'Purpleheart', colorHex: '#5C3A6E' },
  { id: 'padauk', name: 'Padauk', colorHex: '#A8422A' },
  { id: 'yellowheart', name: 'Yellowheart', colorHex: '#C9A227' },
  { id: 'bloodwood', name: 'Bloodwood', colorHex: '#A01818' },
  { id: 'beech', name: 'Beech', colorHex: '#EBC889' },
  { id: 'ash', name: 'Ash', colorHex: '#CDBEA7' },
  { id: 'birch', name: 'Birch', colorHex: '#F1E3C4' },
  { id: 'hickory', name: 'Hickory / Pecan', colorHex: '#D2895D' },
  { id: 'bamboo', name: 'Bamboo', colorHex: '#EFAB76' },
] as const;

const BY_ID = new Map(SPECIES.map((s) => [s.id, s]));

export function getSpecies(id: string): WoodSpecies | undefined {
  return BY_ID.get(id);
}

/** Fallback swatch when a species id is unknown (layout + SVG). */
export const UNKNOWN_SPECIES_COLOR = '#8A8A8A';
