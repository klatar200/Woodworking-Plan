export type Grain = 'edge' | 'end';

export interface WoodSpecies {
  id: string;
  name: string;
  colorHex: string;
}

/** Which corner of the tile the miter wedge occupies. */
export type MiterCorner = 'tl' | 'tr' | 'bl' | 'br';

/**
 * Optional two-tone miter on a strip. Absent = solid strip (every pre-58 design).
 * angleDeg is from the HORIZONTAL (strip-width) axis — see miter-geometry.ts.
 */
export interface Miter {
  /** Wedge species — the piece glued to the cut face. */
  speciesId: string;
  /** 5–85; 30 = hexagon family. Not int — 22.5 is a real miter. */
  angleDeg: number;
  corner: MiterCorner;
}

export interface Strip {
  id: string;
  speciesId: string;
  widthIn: number;
  repeat: number;
  /** Absent = solid. Additive on schemaVersion 2 — no migration. */
  miter?: Miter;
}

/** Wedge payload on a laid-out cell (absolute inches). */
export interface CellWedge {
  speciesId: string;
  colorHex: string;
  /** 3–5 vertices, convex, clockwise. */
  polygon: ReadonlyArray<readonly [number, number]>;
  angleDeg: number;
  corner: MiterCorner;
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
