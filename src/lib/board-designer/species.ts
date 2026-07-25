import type { WoodSpecies } from './types';

/** Exactly eight species — ids are permanent (B14). Colors are pigment, not theme tokens. */
export const SPECIES: readonly WoodSpecies[] = [
  { id: 'hard-maple', name: 'Hard Maple', colorHex: '#E7D3A9' },
  { id: 'walnut', name: 'Walnut', colorHex: '#4A3524' },
  { id: 'cherry', name: 'Cherry', colorHex: '#9C5A3C' },
  { id: 'white-oak', name: 'White Oak', colorHex: '#C6A67C' },
  { id: 'red-oak', name: 'Red Oak', colorHex: '#B4784F' },
  { id: 'sapele', name: 'Sapele', colorHex: '#7A3B26' },
  { id: 'purpleheart', name: 'Purpleheart', colorHex: '#5C3A6E' },
  { id: 'padauk', name: 'Padauk', colorHex: '#A8422A' },
] as const;

const BY_ID = new Map(SPECIES.map((s) => [s.id, s]));

export function getSpecies(id: string): WoodSpecies | undefined {
  return BY_ID.get(id);
}

/** Fallback swatch when a species id is unknown (layout + SVG). */
export const UNKNOWN_SPECIES_COLOR = '#8A8A8A';
