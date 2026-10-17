import type { Part } from '@/lib/cut-optimizer';
import { designCutPieces } from './cut-pieces';
import { panelGeometry } from './panel-geometry';
import { getSpecies } from './species';
import type { BoardDesignConfig } from './types';

/**
 * Cut-plan parts for the optimizer (U1 bridge; rendered via `designCutPlan` + `BoardBar`).
 *
 * Sprint 80: one Part per cut piece, so the cut plan packs exactly the sizes the build guide tells
 * you to cut — rip width (finished + planeBuffer) and the panel's cut length. Unused panels have no
 * cut pieces, so they no longer add 0″ parts and phantom boards. A mitered strip brings its
 * wedge-species partner strip.
 *
 * Labels use `strip.label` when set (else `Strip n`) so the cut-plan aria sheet matches the names
 * the editor taught; with more than one panel in use they carry the panel label.
 */
export function toParts(config: BoardDesignConfig): Part[] {
  const pieces = designCutPieces(config, panelGeometry(config).panelPlan);
  const multi = new Set(pieces.map((piece) => piece.panelId)).size > 1;

  return pieces.map((piece) => {
    const identity =
      piece.role === 'partner' ? `${piece.stripName} partner` : piece.stripName;
    return {
      id: piece.role === 'partner' ? `${piece.stripId}-partner` : piece.stripId,
      label: multi ? `${piece.panelLabel}: ${identity}` : identity,
      quantity: piece.count,
      thicknessIn: piece.thicknessIn,
      widthIn: piece.ripWidthIn,
      lengthIn: piece.lengthIn,
      material: getSpecies(piece.speciesId)?.name ?? piece.speciesId,
    };
  });
}
