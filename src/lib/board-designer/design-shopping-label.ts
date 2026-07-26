import { stripDisplayName } from './strip-display';
import type { BoardDesignConfig } from './types';

/**
 * Shopping-list by-plan line name for a design species row.
 * When any strip of that species has a custom label, append strip identities
 * (`Accent A`, `Strip 2`, …) so the buying sheet matches editor names.
 * Merged (cross-plan) lines keep bare species names — only by-plan uses this.
 */
export function designMaterialLineName(
  config: BoardDesignConfig,
  speciesId: string,
  speciesName: string,
): string {
  const identities: string[] = [];
  let hasCustomLabel = false;

  const panels =
    config.grain === 'edge' ? config.panels.slice(0, 1) : config.panels;

  for (const panel of panels) {
    panel.strips.forEach((strip, index) => {
      if (strip.speciesId !== speciesId) return;
      if (strip.label?.trim()) hasCustomLabel = true;
      identities.push(stripDisplayName(strip, index));
    });
  }

  if (!hasCustomLabel || identities.length === 0) return speciesName;
  return `${speciesName} (${identities.join(', ')})`;
}
