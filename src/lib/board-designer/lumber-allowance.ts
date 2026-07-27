import type { BoardDesignConfig, Panel, PanelPlan, Strip } from './types';

/** Default inches planed at each glue-up stage (Sprint 73 / D1). */
export const DEFAULT_PLANE_BUFFER_IN = 0.175;

export function planeBufferIn(config: Pick<BoardDesignConfig, 'planeBuffer'>): number {
  return config.planeBuffer ?? DEFAULT_PLANE_BUFFER_IN;
}

/** Physical strip pieces after expanding `repeat`. */
export function expandStripPieces(panel: Panel): Strip[] {
  const out: Strip[] = [];
  for (const strip of panel.strips) {
    for (let i = 0; i < strip.repeat; i += 1) {
      out.push(strip);
    }
  }
  return out;
}

/**
 * Kerf + plane allowance on the strip-stack axis, as a fraction of finished width.
 * D1 illustration: 12×1″ → ~29%; 5×2″ → ~14%. Derived from geometry — not a table.
 */
export function stripStackOverageRatio(
  finishedWidthIn: number,
  stripCount: number,
  kerfIn: number,
  planeBuffer: number,
): number {
  if (finishedWidthIn <= 0 || stripCount <= 0) return 0;
  const allowance =
    stripCount * planeBuffer + Math.max(0, stripCount - 1) * kerfIn;
  return allowance / finishedWidthIn;
}

export type PanelStockDims = {
  stockWidthIn: number;
  stockLengthIn: number;
  stockThicknessIn: number;
  pieces: Strip[];
};

/**
 * Stock dims to buy for one panel (COMPETITIVE_AUDIT A1–A4 / D1).
 * planeBuffer at every glue-up stage; (n−1)×kerf across strip widths.
 */
export function panelStockDims(
  config: BoardDesignConfig,
  panel: Panel,
  plan: PanelPlan,
): PanelStockDims {
  const plane = planeBufferIn(config);
  const pieces = expandStripPieces(panel);
  const n = pieces.length;
  const stockWidthIn =
    pieces.reduce((sum, s) => sum + s.widthIn + plane, 0) +
    Math.max(0, n - 1) * config.kerfIn;
  const stockLengthIn =
    config.grain === 'end'
      ? (config.sliceThicknessIn + plane) * plan.rows +
        Math.max(0, plan.rows - 1) * config.kerfIn
      : config.sourceLengthIn + plane;
  const stockThicknessIn = panel.thicknessIn + plane;
  return { stockWidthIn, stockLengthIn, stockThicknessIn, pieces };
}

export function panelStockBoardFeet(dims: PanelStockDims): number {
  if (dims.pieces.length === 0) return 0;
  return (
    (dims.stockThicknessIn * dims.stockWidthIn * dims.stockLengthIn) / 144
  );
}
