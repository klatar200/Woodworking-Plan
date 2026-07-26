import { miterWedgeFraction } from './miter-geometry';
import { panelGeometry } from './panel-geometry';
import { getSpecies } from './species';
import type {
  BoardDesignConfig,
  PanelPlan,
  SpeciesBoardFeet,
} from './types';

/**
 * Designer → shopping-list lumber lines (Sprint 64).
 *
 * Seeded Kreg catalog materials use unit `"board"` for piece counts, with species
 * baked into free-text names and `species: null` always. Volume purchases here use
 * unit `"board feet"` — the preferred spelling in `BOARD_FEET_UNITS` (`format.ts`) —
 * so they group as volume and do not collide with piece-count `"board"` rows. Name is
 * the species display name (e.g. "Hard Maple"); `species` stays null to match the
 * catalog column. Do not loosen the shopping-list matcher to paper over spelling drift.
 */
export const DESIGN_LUMBER_UNIT = 'board feet';

/**
 * Board feet by species — waste applied once inside `boardFeetBySpeciesFor`.
 * Cheap path: panel geometry only — no top-face layout or closure sampling.
 */
export function designBoardFeetBySpecies(
  config: BoardDesignConfig,
): SpeciesBoardFeet[] {
  const { panelPlan } = panelGeometry(config);
  return boardFeetBySpeciesFor(config, panelPlan);
}

/** Exported for `calculateMetrics` — same formula, waste already included. */
export function boardFeetBySpeciesFor(
  config: BoardDesignConfig,
  panelPlan: PanelPlan[],
): SpeciesBoardFeet[] {
  const planById = new Map(panelPlan.map((p) => [p.panelId, p]));
  const order: string[] = [];
  const totals = new Map<string, number>();

  const panels =
    config.grain === 'edge' ? config.panels.slice(0, 1) : config.panels;

  for (const panel of panels) {
    const plan = planById.get(panel.id);
    const lengthIn = plan?.requiredLengthIn ?? 0;
    for (const s of panel.strips) {
      const stripBf =
        (panel.thicknessIn * s.widthIn * lengthIn * s.repeat) / 144;
      const wedgeFrac = s.miter
        ? miterWedgeFraction(s.widthIn, panel.thicknessIn, s.miter)
        : 0;
      const baseFrac = 1 - wedgeFrac;

      addBf(order, totals, s.speciesId, stripBf * baseFrac);
      if (s.miter && wedgeFrac > 0) {
        addBf(order, totals, s.miter.speciesId, stripBf * wedgeFrac);
      }
    }
  }

  return order.map((speciesId) => {
    const species = getSpecies(speciesId);
    const raw = totals.get(speciesId) ?? 0;
    return {
      speciesId,
      name: species?.name ?? speciesId,
      // wasteFactor applied HERE — callers must not multiply again (Sprint 64).
      boardFeet: raw * (1 + config.wasteFactor),
    };
  });
}

function addBf(
  order: string[],
  totals: Map<string, number>,
  speciesId: string,
  amount: number,
): void {
  if (!totals.has(speciesId)) {
    order.push(speciesId);
    totals.set(speciesId, 0);
  }
  totals.set(speciesId, (totals.get(speciesId) ?? 0) + amount);
}
