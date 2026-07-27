import { miterWedgeFraction } from './miter-geometry';
import {
  DEFAULT_PLANE_BUFFER_IN,
  panelStockBoardFeet,
  panelStockDims,
  planeBufferIn,
} from './lumber-allowance';
import { panelGeometry } from './panel-geometry';
import { getSpecies } from './species';
import type {
  BoardDesignConfig,
  PanelPlan,
  SpeciesBoardFeet,
} from './types';

export { DEFAULT_PLANE_BUFFER_IN, planeBufferIn };

/**
 * Designer → shopping-list lumber lines (Sprint 64; Sprint 73 stock dims).
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
 * Board feet by species — stock dims (kerf + planeBuffer) then defects `wasteFactor`.
 * Cheap path: panel geometry only — no top-face layout or closure sampling.
 */
export function designBoardFeetBySpecies(
  config: BoardDesignConfig,
): SpeciesBoardFeet[] {
  const { panelPlan } = panelGeometry(config);
  return boardFeetBySpeciesFor(config, panelPlan);
}

/** Exported for `calculateMetrics` — same formula; callers must not multiply waste again. */
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
    if (!plan || plan.rows <= 0) continue;

    const dims = panelStockDims(config, panel, plan);
    const stockBf = panelStockBoardFeet(dims);
    if (stockBf <= 0 || dims.pieces.length === 0) continue;

    const finishedWidth = dims.pieces.reduce((sum, s) => sum + s.widthIn, 0);
    if (finishedWidth <= 0) continue;

    // Equal share of inter-strip kerf; each piece owns its width + planeBuffer.
    const kerfShare =
      dims.pieces.length > 1
        ? ((dims.pieces.length - 1) * config.kerfIn) / dims.pieces.length
        : 0;
    const plane = planeBufferIn(config);

    for (const strip of dims.pieces) {
      const pieceStockW = strip.widthIn + plane + kerfShare;
      const pieceBf =
        (dims.stockThicknessIn * pieceStockW * dims.stockLengthIn) / 144;
      const wedgeFrac = strip.miter
        ? miterWedgeFraction(strip.widthIn, panel.thicknessIn, strip.miter)
        : 0;
      const baseFrac = 1 - wedgeFrac;

      addBf(order, totals, strip.speciesId, pieceBf * baseFrac);
      if (strip.miter && wedgeFrac > 0) {
        addBf(order, totals, strip.miter.speciesId, pieceBf * wedgeFrac);
      }
    }
  }

  return order.map((speciesId) => {
    const species = getSpecies(speciesId);
    const raw = totals.get(speciesId) ?? 0;
    return {
      speciesId,
      name: species?.name ?? speciesId,
      // wasteFactor = defects/snipe only (Sprint 73). Callers must not multiply again.
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
