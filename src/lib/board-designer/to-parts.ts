import type { Part } from '@/lib/cut-optimizer';
import { calculateMetrics } from './metrics';
import { getSpecies } from './species';
import type { BoardDesignConfig } from './types';

/**
 * Phase-2 bridge (B7): one Part per strip per panel for the cut-list optimizer.
 * Built now, rendered never.
 */
export function toParts(config: BoardDesignConfig): Part[] {
  const metrics = calculateMetrics(config);
  const planById = new Map(metrics.panelPlan.map((p) => [p.panelId, p]));
  const multi = config.panels.length > 1;
  const parts: Part[] = [];

  for (const panel of config.panels) {
    const plan = planById.get(panel.id);
    const lengthIn = plan?.requiredLengthIn ?? 0;
    panel.strips.forEach((strip, index) => {
      const species = getSpecies(strip.speciesId);
      const name = species?.name ?? strip.speciesId;
      const stripLabel = `${name} strip ${index + 1}`;
      parts.push({
        id: strip.id,
        label: multi ? `${panel.label}: ${stripLabel}` : stripLabel,
        quantity: strip.repeat,
        thicknessIn: panel.thicknessIn,
        widthIn: strip.widthIn,
        lengthIn,
        material: name,
      });
    });
  }

  return parts;
}
