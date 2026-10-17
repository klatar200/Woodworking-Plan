import { panelCutLengthIn, planeBufferIn } from './lumber-allowance';
import { stripDisplayName } from './strip-display';
import type { BoardDesignConfig, Miter, PanelPlan } from './types';

/**
 * Every piece a builder cuts, with the dimensions they cut it to (Sprint 80).
 *
 * The build guide, the cut plan (`toParts`) and the print sheet all read these, so the three can
 * no longer state different numbers for the same strip. Allowances follow Sprint 73's maths
 * exactly: strips are ripped `planeBuffer` over finished width and crosscut to
 * `panelCutLengthIn`; thickness stays finished.
 *
 * A mitered strip is made by the composite method (`MITER_COMPOSITE_METHOD`): it is paired with a
 * partner strip of its wedge species, cut to the same size. Both pieces are listed.
 *
 * Cheap path: takes `panelPlan` rather than metrics, so it never touches the top-face layout.
 * Waste is a board-feet concern and is not applied here.
 */
export interface CutPiece {
  /** 'strip' = the strip itself. 'partner' = the wedge-species strip paired with a mitered strip. */
  role: 'strip' | 'partner';
  panelId: string;
  panelLabel: string;
  stripId: string;
  stripName: string;
  /** The strip's species, or the miter's wedge species for a partner. */
  speciesId: string;
  count: number;
  thicknessIn: number;
  /** Finished width + planeBuffer — what the saw is set to. */
  ripWidthIn: number;
  finishedWidthIn: number;
  lengthIn: number;
  /** Set on both roles of a mitered strip. */
  miter?: Miter;
}

export function designCutPieces(
  config: BoardDesignConfig,
  panelPlan: PanelPlan[],
): CutPiece[] {
  const byId = new Map(config.panels.map((panel) => [panel.id, panel]));
  const buffer = planeBufferIn(config);
  const pieces: CutPiece[] = [];

  for (const plan of panelPlan) {
    const panel = byId.get(plan.panelId);
    if (!panel) continue;
    // End grain lists unused panels with rows: 0 — they contribute no wood.
    if (config.grain === 'end' && plan.rows === 0) continue;

    const lengthIn = panelCutLengthIn(config, plan);
    panel.strips.forEach((strip, index) => {
      const shared = {
        panelId: panel.id,
        panelLabel: panel.label,
        stripId: strip.id,
        stripName: stripDisplayName(strip, index),
        count: strip.repeat,
        thicknessIn: panel.thicknessIn,
        ripWidthIn: strip.widthIn + buffer,
        finishedWidthIn: strip.widthIn,
        lengthIn,
      };
      if (!strip.miter) {
        pieces.push({ ...shared, role: 'strip', speciesId: strip.speciesId });
        return;
      }
      const miter = { ...strip.miter };
      pieces.push({ ...shared, role: 'strip', speciesId: strip.speciesId, miter });
      pieces.push({ ...shared, role: 'partner', speciesId: miter.speciesId, miter });
    });
  }

  return pieces;
}
