export type Grain = 'edge' | 'end';

export interface WoodSpecies {
  id: string;
  name: string;
  colorHex: string;
}

export interface Strip {
  id: string;
  speciesId: string;
  widthIn: number;
  repeat: number;
}

export interface Panel {
  id: string;
  /** 1–24 chars — shown in the row-pattern picker */
  label: string;
  /** 0.125–4 — ROW HEIGHT on the finished end-grain face */
  thicknessIn: number;
  strips: Strip[];
}

/**
 * How a cut slice is laid down before the second glue-up. The only four
 * physically achievable placements. With solid strips, rot180 and mirrorX
 * render identically, as do none and mirrorY — expected, not a bug.
 */
export type RowTransform = 'none' | 'rot180' | 'mirrorX' | 'mirrorY';

export interface RowStep {
  panelId: string;
  transform: RowTransform;
}

export interface BoardDesignConfig {
  schemaVersion: 2;
  name: string;
  grain: Grain;
  /** EDGE ONLY — the board's length. Ignored in end grain (derived per panel). */
  sourceLengthIn: number;
  /** END ONLY — the finished board's thickness. */
  sliceThicknessIn: number;
  kerfIn: number;
  wasteFactor: number;
  panels: Panel[];
  rowPattern: RowStep[];
  rowCount: number;
}

export interface SpeciesBoardFeet {
  speciesId: string;
  name: string;
  boardFeet: number;
}

export interface PanelPlan {
  panelId: string;
  label: string;
  rows: number;
  requiredLengthIn: number;
  widthIn: number;
  thicknessIn: number;
}

export interface BoardMetrics {
  /** Common panel width — equal-width check needs it. */
  panelWidthIn: number;
  finishedLengthIn: number;
  finishedWidthIn: number;
  finishedThicknessIn: number;
  sliceCount: number;
  panelPlan: PanelPlan[];
  boardFeetBySpecies: SpeciesBoardFeet[];
  totalBoardFeet: number;
  warnings: string[];
  complete: boolean;
}
