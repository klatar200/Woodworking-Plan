import type { Part } from '@/lib/cut-optimizer';
import { calculateMetrics } from './metrics';
import { getSpecies } from './species';
import { stripDisplayName } from './strip-display';
import type { BoardDesignConfig } from './types';

/**
 * One Part per strip per panel for the cut-list optimizer (U1 bridge; rendered in
 * U6 / Sprint 64 via `designCutPlan` + `BoardBar`). Lengths come from each panel's
 * derived `requiredLengthIn` — not board feet.
 *
 * Part labels use `strip.label` when set (else `Strip n`) so the cut-plan /
 * BoardBar aria sheet matches the names the editor taught.
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
      const identity = stripDisplayName(strip, index);
      parts.push({
        id: strip.id,
        label: multi ? `${panel.label}: ${identity}` : identity,
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
